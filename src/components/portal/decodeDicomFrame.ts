import * as dicomParser from "dicom-parser";

type DataSet = ReturnType<typeof dicomParser.parseDicom>;
type PixelElement = NonNullable<DataSet["elements"]["x7fe00010"];

const jpeg2000 = new Set(["1.2.840.10008.1.2.4.90", "1.2.840.10008.1.2.4.91"]);
const jpegLossless = new Set(["1.2.840.10008.1.2.4.57", "1.2.840.10008.1.2.4.70"]);
const jpegBrowser = new Set(["1.2.840.10008.1.2.4.50", "1.2.840.10008.1.2.4.51"]);

export const canDecodeCompressed = (syntax: string) => jpeg2000.has(syntax) || jpegLossless.has(syntax) || jpegBrowser.has(syntax);

export async function decodeDicomFrame(
  dataset: DataSet,
  element: PixelElement,
  index: number,
  frames: number,
  syntax: string,
  rows: number,
  columns: number,
  bits: number,
  samples: number,
): Promise<Uint8Array> {
  if (!canDecodeCompressed(syntax)) throw new Error(`Unsupported compressed DICOM transfer syntax (${syntax}). Export as uncompressed DICOM to view it here.`);
  const fragments = element.fragments ?? [];
  if (!fragments.length) throw new Error("The compressed scan has no image frames");
  let encoded: Uint8Array;
  if (element.basicOffsetTable?.length) {
    encoded = dicomParser.readEncapsulatedImageFrame(dataset, element, index);
  } else if (frames === 1) {
    encoded = dicomParser.readEncapsulatedPixelDataFromFragments(dataset, element, 0, fragments.length);
  } else if (fragments.length === frames) {
    encoded = dicomParser.readEncapsulatedPixelDataFromFragments(dataset, element, index, 1);
  } else {
    throw new Error("This multi-frame scan has no frame offsets. Export it with a basic offset table to view individual slices safely.");
  }

  const expected = rows * columns * samples * (bits / 8);
  if (jpeg2000.has(syntax)) {
    const { default: createDecoder } = await import("@cornerstonejs/codec-openjpeg");
    const codec = await createDecoder();
    const decoder = new codec.J2KDecoder();
    try {
      decoder.getEncodedBuffer(encoded.byteLength).set(encoded);
      decoder.decode();
      const info = decoder.getFrameInfo();
      if (info.width !== columns || info.height !== rows) throw new Error("Decoded scan dimensions do not match DICOM metadata");
      const pixels = new Uint8Array(decoder.getDecodedBuffer());
      if (pixels.byteLength !== expected) throw new Error("Decoded scan sample size does not match DICOM metadata");
      return pixels.slice(); // WASM-owned memory is freed with the decoder.
    } finally {
      decoder.delete();
    }
  }
  if (jpegLossless.has(syntax)) {
    const { Decoder } = await import("jpeg-lossless-decoder-js");
    const pixels = new Uint8Array(new Decoder().decompress(encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)));
    if (pixels.byteLength !== expected) throw new Error("Decoded scan sample size does not match DICOM metadata");
    return pixels;
  }
  if (bits !== 8) throw new Error("This JPEG scan must use 8-bit pixels");
  const bitmap = await createImageBitmap(new Blob([encoded as BlobPart], { type: "image/jpeg" }));
  try {
    if (bitmap.width !== columns || bitmap.height !== rows) throw new Error("Decoded scan dimensions do not match DICOM metadata");
    const canvas = document.createElement("canvas");
    canvas.width = columns;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to render JPEG scan");
    ctx.drawImage(bitmap, 0, 0);
    const rgba = ctx.getImageData(0, 0, columns, rows).data;
    const pixels = new Uint8Array(expected);
    for (let i = 0; i < rows * columns; i++) {
      for (let channel = 0; channel < samples; channel++) pixels[i * samples + channel] = rgba[i * 4 + channel];
    }
    return pixels;
  } finally {
    bitmap.close();
  }
}