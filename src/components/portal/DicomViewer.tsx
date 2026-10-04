import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sun, RotateCcw, ZoomIn, ZoomOut, Hand, UploadCloud, FileImage, FileVideo2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as dicomParser from "dicom-parser";
import { canDecodeCompressed, decodeDicomFrame } from "./decodeDicomFrame";

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
  compressed: boolean;
  dataset?: ReturnType<typeof dicomParser.parseDicom>;
  pixelElement?: ReturnType<typeof dicomParser.parseDicom>["elements"]["x7fe00010"];
  syntax: string;
}

const PRESETS = {
  bone: { ww: 2000, wc: 500 },
  soft: { ww: 400, wc: 40 },
  lung: { ww: 1500, wc: -500 },
};

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
  const [rendering, setRendering] = useState(false);
  const [ww, setWw] = useState<number | null>(null);
  const [wc, setWc] = useState<number | null>(null);
  const baseRef = useRef<{ ww: number; wc: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [preset, setPreset] = useState<keyof typeof PRESETS | "custom">("custom");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const renderSequence = useRef(0);

  const renderFrame = useCallback(async (frameIndex: number, windowWidth: number, windowCenter: number) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    const sequence = ++renderSequence.current;
    if (image.compressed) setRendering(true);
    try {
      const pixels = image.compressed && image.dataset && image.pixelElement
        ? await decodeDicomFrame(image.dataset, image.pixelElement, frameIndex, image.frames, image.syntax, image.rows, image.columns, image.bitsAllocated, image.samplesPerPixel)
        : image.bytes;
      if (sequence !== renderSequence.current) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = image.columns;
      canvas.height = image.rows;
      const output = context.createImageData(image.columns, image.rows);
      const view = new DataView(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      const bytesPerSample = image.bitsAllocated / 8;
      const pixelCount = image.rows * image.columns;
      const frameOffset = image.compressed ? 0 : image.offset + frameIndex * pixelCount * image.samplesPerPixel * bytesPerSample;
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
    } catch (caught) {
      if (sequence === renderSequence.current) setError(caught instanceof Error ? caught.message : "Unable to decode this scan");
    } finally {
      if (sequence === renderSequence.current) setRendering(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    imageRef.current = null;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch DICOM file (${res.status})`);
        const buf = await res.arrayBuffer();
        const byteArray = new Uint8Array(buf);
        const dataset = dicomParser.parseDicom(byteArray);
        const pixelData = dataset.elements.x7fe00010;
        if (!pixelData) throw new Error("This DICOM file does not contain image pixels");

        const rows = dataset.uint16("x00280010") || 0;
        const columns = dataset.uint16("x00280011") || 0;
        const bitsAllocated = dataset.uint16("x00280100") || 0;
        const samplesPerPixel = dataset.uint16("x00280002") || 1;
        if (!rows || !columns || ![8, 16].includes(bitsAllocated)) {
          throw new Error("This DICOM pixel format is not supported in the web viewer");
        }

        const frames = Math.max(1, Math.floor(numberValue(dataset.string("x00280008"), 1)));
        const transferSyntax = dataset.string("x00020010") || "1.2.840.10008.1.2.1";
        if (pixelData.encapsulatedPixelData && !canDecodeCompressed(transferSyntax)) {
          throw new Error(`Unsupported compressed DICOM transfer syntax (${transferSyntax}). Export as uncompressed DICOM to view it here.`);
        }
        if (samplesPerPixel !== 1 && !(samplesPerPixel === 3 && bitsAllocated === 8)) {
          throw new Error("This DICOM sample format is not supported in the viewer");
        }
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
          compressed: Boolean(pixelData.encapsulatedPixelData),
          dataset: pixelData.encapsulatedPixelData ? dataset : undefined,
          pixelElement: pixelData.encapsulatedPixelData ? pixelData : undefined,
          syntax: transferSyntax,
        };

        if (!image.windowWidth && image.compressed) {
          image.windowWidth = bitsAllocated === 8 ? 255 : 4095;
          image.windowCenter = image.windowWidth / 2;
        } else if (!image.windowWidth) {
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
      renderSequence.current += 1;
      imageRef.current = null;
    };
  }, [renderFrame, url]);

  useEffect(() => {
    if (ww == null || wc == null) return;
    void renderFrame(frame, ww, wc);
  }, [frame, renderFrame, ww, wc]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setFrame((f) => Math.min(numFrames - 1, f + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setFrame((f) => Math.max(0, f - 1));
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((v) => Math.min(5, v + 0.25));
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom((v) => Math.max(0.5, v - 0.25));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [numFrames]);

  const applyPreset = (key: keyof typeof PRESETS) => {
    setPreset(key);
    setWw(PRESETS[key].ww);
    setWc(PRESETS[key].wc);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (numFrames <= 1) return;
    e.preventDefault();
    setFrame((f) => Math.max(0, Math.min(numFrames - 1, f + (e.deltaY > 0 ? 1 : -1))));
  };

  const reset = () => {
    setPreset("custom");
    if (baseRef.current) {
      setWw(baseRef.current.ww);
      setWc(baseRef.current.wc);
    }
    setFrame(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="w-full bg-foreground flex flex-col" data-testid="dicom-viewer">
      <div
        tabIndex={0}
        onWheel={onWheel}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }}
        onPointerMove={(e) => { if (drag.current) setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        className="relative flex h-[60vh] w-full select-none items-center justify-center overflow-hidden outline-none"
        style={{ touchAction: "none", cursor: drag.current ? "grabbing" : "grab" }}
      >
        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} aria-label="DICOM image" />
        {(loading || rendering) && (
          <div className="absolute inset-0 flex items-center justify-center text-background">
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground min-w-[52px] text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom((v) => Math.min(5, v + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Reset view" title="Reset view" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Pan tool" title="Pan" onClick={() => setOffset({ x: offset.x, y: offset.y })}><Hand className="h-4 w-4" /></Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(PRESETS).map(([key, values]) => (
              <Button
                key={key}
                variant={preset === key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Button>
            ))}
          </div>

          {numFrames > 1 && (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" aria-label="Previous slice" title="Previous slice" onClick={() => setFrame((f) => Math.max(0, f - 1))} disabled={frame === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                aria-label="Slice navigator"
                type="range"
                min={0}
                max={numFrames - 1}
                value={frame}
                onChange={(e) => setFrame(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <Button size="icon" variant="outline" aria-label="Next slice" title="Next slice" onClick={() => setFrame((f) => Math.min(numFrames - 1, f + 1))} disabled={frame === numFrames - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
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
                  aria-label="Window width"
                  type="range"
                  min={1}
                  max={Math.max(4000, (baseRef.current?.ww || 400) * 4)}
                  value={ww}
                  onChange={(e) => { setWw(Number(e.target.value)); setPreset("custom"); }}
                  className="flex-1 accent-primary"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground w-10">C:</span>
                <input
                  aria-label="Window center"
                  type="range"
                  min={-1000}
                  max={3000}
                  value={wc}
                  onChange={(e) => { setWc(Number(e.target.value)); setPreset("custom"); }}
                  className="flex-1 accent-primary"
                />
                <Button size="icon" variant="ghost" onClick={reset} title="Reset values">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </label>
            </div>
          )}

          {numFrames > 1 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Scroll, drag the slider, or use arrow keys to navigate slices.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DicomViewer;
