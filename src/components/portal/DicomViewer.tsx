import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sun, RotateCcw } from "lucide-react";
// @ts-ignore
import * as dicomParser from "dicom-parser";

interface Props {
  url: string;
}

interface DicomImage {
  bytes: Uint8Array;
  offset: number;
  rows: number;
  columns: number;
  frames: number;
  bitsAllocated: number;
  bitsStored: number;
  signed: boolean;
  samplesPerPixel: number;
  planarConfiguration: number;
  photometricInterpretation: string;
  littleEndian: boolean;
  slope: number;
  intercept: number;
  windowWidth: number;
  windowCenter: number;
}

const numberValue = (value: string | undefined, fallback: number) => {
  const parsed = Number(value?.split("\\")[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStoredValue = (view: DataView, offset: number, image: DicomImage) => {
  if (image.bitsAllocated === 8) {
    const value = image.signed ? view.getInt8(offset) : view.getUint8(offset);
    return value * image.slope + image.intercept;
  }

  const raw = view.getUint16(offset, image.littleEndian);
  if (!image.signed) return raw * image.slope + image.intercept;
  const signBit = 1 << (image.bitsStored - 1);
  const mask = (1 << image.bitsStored) - 1;
  const stored = raw & mask;
  const value = stored & signBit ? stored - (1 << image.bitsStored) : stored;
  return value * image.slope + image.intercept;
};

const DicomViewer = ({ url }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<DicomImage | null>(null);
  const [frame, setFrame] = useState(0);
  const [numFrames, setNumFrames] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ww, setWw] = useState<number | null>(null);
  const [wc, setWc] = useState<number | null>(null);
  const baseRef = useRef<{ ww: number; wc: number } | null>(null);

  const renderFrame = useCallback((frameIndex: number, windowWidth: number, windowCenter: number) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = image.columns;
    canvas.height = image.rows;
    const output = context.createImageData(image.columns, image.rows);
    const view = new DataView(image.bytes.buffer, image.bytes.byteOffset, image.bytes.byteLength);
    const bytesPerSample = image.bitsAllocated / 8;
    const pixelCount = image.rows * image.columns;
    const frameOffset = image.offset + frameIndex * pixelCount * image.samplesPerPixel * bytesPerSample;
    const lower = windowCenter - windowWidth / 2;
    const scale = 255 / Math.max(windowWidth, 1);
    const invert = image.photometricInterpretation === "MONOCHROME1";

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const outputOffset = pixel * 4;
      if (image.samplesPerPixel === 1) {
        const sourceOffset = frameOffset + pixel * bytesPerSample;
        let gray = Math.round((getStoredValue(view, sourceOffset, image) - lower) * scale);
        gray = Math.max(0, Math.min(255, gray));
        if (invert) gray = 255 - gray;
        output.data[outputOffset] = gray;
        output.data[outputOffset + 1] = gray;
        output.data[outputOffset + 2] = gray;
      } else if (image.bitsAllocated === 8 && image.samplesPerPixel >= 3) {
        const sampleOffset = image.planarConfiguration === 0 ? pixel * image.samplesPerPixel : pixel;
        const planeSize = pixelCount;
        output.data[outputOffset] = view.getUint8(frameOffset + sampleOffset);
        output.data[outputOffset + 1] = view.getUint8(frameOffset + (image.planarConfiguration === 0 ? sampleOffset + 1 : planeSize + sampleOffset));
        output.data[outputOffset + 2] = view.getUint8(frameOffset + (image.planarConfiguration === 0 ? sampleOffset + 2 : planeSize * 2 + sampleOffset));
      }
      output.data[outputOffset + 3] = 255;
    }
    context.putImageData(output, 0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch DICOM file (${res.status})`);
        const buf = await res.arrayBuffer();
        const byteArray = new Uint8Array(buf);
        const dataset = dicomParser.parseDicom(byteArray);
        const pixelData = dataset.elements.x7fe00010;
        if (!pixelData) throw new Error("This DICOM file does not contain image pixels");
        if (pixelData.encapsulatedPixelData) {
          throw new Error("This compressed DICOM format is not supported in the secure web viewer. Please upload an uncompressed DICOM file.");
        }

        const rows = dataset.uint16("x00280010") || 0;
        const columns = dataset.uint16("x00280011") || 0;
        const bitsAllocated = dataset.uint16("x00280100") || 0;
        const samplesPerPixel = dataset.uint16("x00280002") || 1;
        if (!rows || !columns || ![8, 16].includes(bitsAllocated)) {
          throw new Error("This DICOM pixel format is not supported in the web viewer");
        }

        const frames = Math.max(1, Math.floor(numberValue(dataset.string("x00280008"), 1)));
        const transferSyntax = dataset.string("x00020010") || "1.2.840.10008.1.2.1";
        const littleEndian = transferSyntax !== "1.2.840.10008.1.2.2";
        const image: DicomImage = {
          bytes: byteArray,
          offset: pixelData.dataOffset,
          rows,
          columns,
          frames,
          bitsAllocated,
          bitsStored: dataset.uint16("x00280101") || bitsAllocated,
          signed: (dataset.uint16("x00280103") || 0) === 1,
          samplesPerPixel,
          planarConfiguration: dataset.uint16("x00280006") || 0,
          photometricInterpretation: (dataset.string("x00280004") || "MONOCHROME2").trim(),
          littleEndian,
          slope: numberValue(dataset.string("x00281053"), 1),
          intercept: numberValue(dataset.string("x00281052"), 0),
          windowWidth: numberValue(dataset.string("x00281051"), 0),
          windowCenter: numberValue(dataset.string("x00281050"), 0),
        };

        if (!image.windowWidth) {
          const view = new DataView(byteArray.buffer, byteArray.byteOffset, byteArray.byteLength);
          const bytesPerSample = bitsAllocated / 8;
          let minimum = Number.POSITIVE_INFINITY;
          let maximum = Number.NEGATIVE_INFINITY;
          for (let pixel = 0; pixel < rows * columns; pixel += 1) {
            const value = getStoredValue(view, pixelData.dataOffset + pixel * samplesPerPixel * bytesPerSample, image);
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
          }
          image.windowWidth = Math.max(1, maximum - minimum);
          image.windowCenter = (maximum + minimum) / 2;
        }

        if (cancelled) return;
        imageRef.current = image;
        setNumFrames(frames);
        setFrame(0);
        baseRef.current = { ww: image.windowWidth, wc: image.windowCenter };
        setWw(image.windowWidth);
        setWc(image.windowCenter);
        renderFrame(0, image.windowWidth, image.windowCenter);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        console.error(caught);
        setError(caught instanceof Error ? caught.message : "Failed to load DICOM file");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [renderFrame, url]);

  useEffect(() => {
    if (ww == null || wc == null) return;
    renderFrame(frame, ww, wc);
  }, [frame, renderFrame, ww, wc]);

  // Scroll wheel to navigate slices
  const onWheel = (e: React.WheelEvent) => {
    if (numFrames <= 1) return;
    e.preventDefault();
    setFrame(f => Math.max(0, Math.min(numFrames - 1, f + (e.deltaY > 0 ? 1 : -1))));
  };

  const reset = () => {
    if (baseRef.current) {
      setWw(baseRef.current.ww);
      setWc(baseRef.current.wc);
    }
    setFrame(0);
  };

  return (
    <div className="w-full bg-black flex flex-col">
      <div
        onWheel={onWheel}
        className="relative flex h-[60vh] w-full select-none items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" aria-label="DICOM image" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm p-4 text-center">
            {error}
          </div>
        )}
      </div>

      {!error && (
        <div className="bg-background/95 backdrop-blur p-3 space-y-2 border-t border-border">
          {numFrames > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFrame(f => Math.max(0, f - 1))}
                disabled={frame === 0}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={0}
                max={numFrames - 1}
                value={frame}
                onChange={(e) => setFrame(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <button
                onClick={() => setFrame(f => Math.min(numFrames - 1, f + 1))}
                disabled={frame === numFrames - 1}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono w-16 text-right text-muted-foreground">
                {frame + 1} / {numFrames}
              </span>
            </div>
          )}
          {ww != null && wc != null && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground w-10">W:</span>
                <input
                  type="range"
                  min={1}
                  max={Math.max(4000, (baseRef.current?.ww || 400) * 4)}
                  value={ww}
                  onChange={(e) => setWw(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground w-10">C:</span>
                <input
                  type="range"
                  min={-1000}
                  max={3000}
                  value={wc}
                  onChange={(e) => setWc(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <button onClick={reset} className="p-1 rounded-md bg-muted hover:bg-muted/80" title="Reset">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </label>
            </div>
          )}
          {numFrames > 1 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Scroll or drag the slider to navigate slices
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DicomViewer;
