import * as dicomParser from "dicom-parser";
import { canDecodeCompressed, decodeDicomFrame } from "./decodeDicomFrame";

export interface DicomVolume {
  data: Uint8Array;
  dimensions: [number, number, number];
  sourceDimensions: [number, number, number];
  spacing: [number, number, number];
  windowCenter: number;
  windowWidth: number;
}

interface ParsedSlice {
  values: Float32Array;
  rows: number;
  columns: number;
  frames: number;
  position: number;
  spacing: [number, number];
  sliceThickness: number;
  windowCenter: number;
  windowWidth: number;
}

const numberValue = (value: string | undefined, fallback: number) => {
  const parsed = Number(value?.split("\\")[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const numberList = (value: string | undefined) => (value ?? "").split("\\").map(Number).filter(Number.isFinite);

const storedValue = (view: DataView, offset: number, bits: number, bitsStored: number, signed: boolean, littleEndian: boolean) => {
  if (bits === 8) return signed ? view.getInt8(offset) : view.getUint8(offset);
  const raw = view.getUint16(offset, littleEndian);
  if (!signed) return raw;
  const signBit = 1 << (bitsStored - 1);
  const mask = (1 << bitsStored) - 1;
  const stored = raw & mask;
  return stored & signBit ? stored - (1 << bitsStored) : stored;
};

async function parseSlice(url: string): Promise<ParsedSlice> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch DICOM slice (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const dataset = dicomParser.parseDicom(bytes);
  const element = dataset.elements.x7fe00010;
  if (!element) throw new Error("A DICOM slice does not contain image pixels");
  const rows = dataset.uint16("x00280010") || 0;
  const columns = dataset.uint16("x00280011") || 0;
  const bits = dataset.uint16("x00280100") || 0;
  const samples = dataset.uint16("x00280002") || 1;
  if (!rows || !columns || ![8, 16].includes(bits) || samples !== 1) throw new Error("3D view supports 8-bit or 16-bit monochrome DICOM slices");
  const frames = Math.max(1, Math.floor(numberValue(dataset.string("x00280008"), 1)));
  const syntax = dataset.string("x00020010") || "1.2.840.10008.1.2.1";
  const compressed = Boolean(element.encapsulatedPixelData);
  if (compressed && !canDecodeCompressed(syntax)) throw new Error(`Unsupported compressed DICOM transfer syntax (${syntax})`);
  const littleEndian = syntax !== "1.2.840.10008.1.2.2";
  const bitsStored = dataset.uint16("x00280101") || bits;
  const signed = (dataset.uint16("x00280103") || 0) === 1;
  const slope = numberValue(dataset.string("x00281053"), 1);
  const intercept = numberValue(dataset.string("x00281052"), 0);
  const values = new Float32Array(rows * columns * frames);
  const bytesPerSample = bits / 8;
  for (let frame = 0; frame < frames; frame += 1) {
    const pixels = compressed ? await decodeDicomFrame(dataset, element, frame, frames, syntax, rows, columns, bits, samples) : bytes;
    const view = new DataView(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    const frameOffset = compressed ? 0 : element.dataOffset + frame * rows * columns * bytesPerSample;
    for (let pixel = 0; pixel < rows * columns; pixel += 1) {
      values[frame * rows * columns + pixel] = storedValue(view, frameOffset + pixel * bytesPerSample, bits, bitsStored, signed, littleEndian) * slope + intercept;
    }
  }
  const position = numberList(dataset.string("x00200032"));
  const pixelSpacing = numberList(dataset.string("x00280030"));
  return {
    values,
    rows,
    columns,
    frames,
    position: position[2] ?? 0,
    spacing: [pixelSpacing[1] ?? 1, pixelSpacing[0] ?? 1],
    sliceThickness: numberValue(dataset.string("x00180050"), 1),
    windowCenter: numberValue(dataset.string("x00281050"), 0),
    windowWidth: numberValue(dataset.string("x00281051"), 0),
  };
}

export async function loadDicomVolume(urls: string[]): Promise<DicomVolume> {
  if (!urls.length) throw new Error("No DICOM files were supplied");
  const parsed = await Promise.all(urls.map(parseSlice));
  const first = parsed[0];
  if (parsed.some(slice => slice.rows !== first.rows || slice.columns !== first.columns)) throw new Error("All CBCT slices must have matching dimensions");
  parsed.sort((a, b) => a.position - b.position);
  const sourceDepth = parsed.reduce((total, slice) => total + slice.frames, 0);
  const maxAxis = 160;
  const stepX = Math.max(1, Math.ceil(first.columns / maxAxis));
  const stepY = Math.max(1, Math.ceil(first.rows / maxAxis));
  const stepZ = Math.max(1, Math.ceil(sourceDepth / maxAxis));
  const width = Math.ceil(first.columns / stepX);
  const height = Math.ceil(first.rows / stepY);
  const depth = Math.ceil(sourceDepth / stepZ);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  parsed.forEach(slice => slice.values.forEach(value => { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }));
  const range = Math.max(1, maximum - minimum);
  const data = new Uint8Array(width * height * depth);
  let sourceZ = 0;
  let targetZ = 0;
  for (const slice of parsed) {
    for (let localZ = 0; localZ < slice.frames; localZ += 1, sourceZ += 1) {
      if (sourceZ % stepZ !== 0 || targetZ >= depth) continue;
      for (let y = 0; y < first.rows; y += stepY) {
        for (let x = 0; x < first.columns; x += stepX) {
          const source = localZ * first.rows * first.columns + y * first.columns + x;
          const target = targetZ * width * height + Math.floor(y / stepY) * width + Math.floor(x / stepX);
          data[target] = Math.round(((slice.values[source] - minimum) / range) * 255);
        }
      }
      targetZ += 1;
    }
  }
  const positions = parsed.map(slice => slice.position).filter((value, index, all) => index === 0 || value !== all[index - 1]);
  const sliceSpacing = positions.length > 1 ? Math.abs(positions[positions.length - 1] - positions[0]) / (positions.length - 1) : first.sliceThickness;
  return {
    data,
    dimensions: [width, height, depth],
    sourceDimensions: [first.columns, first.rows, sourceDepth],
    spacing: [first.spacing[0] * stepX, first.spacing[1] * stepY, Math.max(sliceSpacing, 0.01) * stepZ],
    windowCenter: first.windowCenter,
    windowWidth: first.windowWidth,
  };
}