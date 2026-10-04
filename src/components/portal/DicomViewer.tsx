import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sun,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Ruler,
  Crosshair,
  Bone,
  ScanLine,
} from "lucide-react";
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

type PresetKey = "bone" | "soft" | "dental" | "auto";

interface MeasurePoint {
  x: number;
  y: number;
}

const PRESETS: Record<
  PresetKey,
  { label: string; ww: number; wc: number; icon: typeof Bone }
> = {
  bone: { label: "Bone", ww: 2000, wc: 500, icon: Bone },
  soft: { label: "Soft", ww: 400, wc: 40, icon: ScanLine },
  dental: { label: "Dental", ww: 1600, wc: 200, icon: Crosshair },
  auto: { label: "Auto", ww: 0, wc: 0, icon: Sun },
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const drag = useRef<{ x: number; y: number } | null>(null);
  const renderSequence = useRef(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"pan" | "measure">("pan");
  const [measureStart, setMeasureStart] = useState<MeasurePoint | null>(null);
  const [measureEnd, setMeasureEnd] = useState<MeasurePoint | null>(null);
  const [pixelsPerMm, setPixelsPerMm] = useState<number>(0);
  const [preset, setPreset] = useState<PresetKey>("bone");

  const renderFrame = useCallback(async (frameIndex: number, windowWidth: number, windowCenter: number) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const sequence = ++renderSequence.current;

    try {
      setRendering(image.compressed);

      const pixels =
        image.compressed && image.dataset && image.pixelElement
          ? await decodeDicomFrame(
              image.dataset,
              image.pixelElement,
              frameIndex,
              image.frames,
              image.syntax,
              image.rows,
              image.columns,
              image.bitsAllocated,
              image.samplesPerPixel
            )
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
      const frameOffset = image.compressed
        ? 0
        : image.offset + frameIndex * pixelCount * image.samplesPerPixel * bytesPerSample;

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
          output.data[outputOffset + 1] = view.getUint8(
            frameOffset + (image.planarConfiguration === 0 ? sampleOffset + 1 : planeSize + sampleOffset)
          );
          output.data[outputOffset + 2] = view.getUint8(
            frameOffset + (image.planarConfiguration === 0 ? sampleOffset + 2 : planeSize * 2 + sampleOffset)
          );
        }

        output.data[outputOffset + 3] = 255;
      }

      context.putImageData(output, 0, 0);
    } catch (caught) {
      if (sequence !== renderSequence.current) return;

      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to decode this DICOM frame. Please try a different slice or an uncompressed file.";

      setError(message);
    } finally {
      if (sequence === renderSequence.current) {
        setRendering(false);
      }
    }
  }, []);

  const measureDistance = (a: MeasurePoint, b: MeasurePoint) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  };

  const getCanvasPoint = (event: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    return {
      x: clamp(x, 0, canvas.width),
      y: clamp(y, 0, canvas.height),
    };
  };

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

        if (!pixelData) {
          throw new Error("This DICOM file does not contain image pixels");
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

        if (pixelData.encapsulatedPixelData && !canDecodeCompressed(transferSyntax)) {
          throw new Error(
            `Unsupported compressed DICOM transfer syntax (${transferSyntax}). Export as uncompressed DICOM to view it here.`
          );
        }

        if (samplesPerPixel !== 1 && !(samplesPerPixel === 3 && bitsAllocated === 8)) {
          throw new Error("This DICOM sample format is not supported by the viewer");
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
        setError(
          caught instanceof Error
            ? caught.message
            : "Failed to load DICOM file. Please confirm the file is valid and supported."
        );
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
    const handler = (event: KeyboardEvent) => {
      if (!document.activeElement || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        setFrame((f) => Math.max(0, Math.min(numFrames - 1, f + 1)));
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setFrame((f) => Math.max(0, Math.min(numFrames - 1, f - 1)));
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((v) => Math.min(5, v + 0.25));
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom((v) => Math.max(0.5, v - 0.25));
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        reset();
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setMode((current) => (current === "pan" ? "measure" : "pan"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [numFrames]);

  const onWheel = (e: React.WheelEvent) => {
    if (numFrames <= 1) return;
    e.preventDefault();
    setFrame((f) => Math.max(0, Math.min(numFrames - 1, f + (e.deltaY > 0 ? 1 : -1))));
  };

  const reset = () => {
    if (baseRef.current) {
      setWw(baseRef.current.ww);
      setWc(baseRef.current.wc);
    }
    setFrame(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMeasureStart(null);
    setMeasureEnd(null);
    setPreset("bone");
  };

  const handlePreset = (key: PresetKey) => {
    setPreset(key);

    if (key === "auto") {
      if (baseRef.current) {
        setWw(baseRef.current.ww);
        setWc(baseRef.current.wc);
      }
      return;
    }

    const preset = PRESETS[key];
    setWw(preset.ww);
    setWc(preset.wc);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (mode === "pan") {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) return;

    setMeasureStart(point);
    setMeasureEnd(point);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (mode === "pan" && drag.current) {
      setOffset({
        x: event.clientX - drag.current.x,
        y: event.clientY - drag.current.y,
      });
      return;
    }

    if (mode === "measure" && measureStart) {
      const point = getCanvasPoint(event);
      if (point) setMeasureEnd(point);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const measurePx = measureStart && measureEnd ? measureDistance(measureStart, measureEnd) : 0;
  const measureMm =
    measurePx && pixelsPerMm > 0 ? (measurePx / pixelsPerMm).toFixed(2) : measurePx ? "pixels" : "0";

  return (
    <div className="w-full bg-black flex flex-col">
      <div
        ref={viewerRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex h-[60vh] w-full select-none items-center justify-center overflow-hidden"
        style={{ touchAction: "none", cursor: mode === "pan" ? "grab" : "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          aria-label="DICOM image"
        />

        {measureStart && measureEnd && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <line
              x1={(measureStart.x / canvasRef.current?.width || 1) * 100 + "%"}
              y1={(measureStart.y / canvasRef.current?.height || 1) * 100 + "%"}
              x2={(measureEnd.x / canvasRef.current?.width || 1) * 100 + "%"}
              y2={(measureEnd.y / canvasRef.current?.height || 1) * 100 + "%"}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <circle cx={`${(measureStart.x / (canvasRef.current?.width || 1)) * 100}%`} cy={`${(measureStart.y / (canvasRef.current?.height || 1)) * 100}%`} r="4" fill="#fff" />
            <circle cx={`${(measureEnd.x / (canvasRef.current?.width || 1)) * 100}%`} cy={`${(measureEnd.y / (canvasRef.current?.height || 1)) * 100}%`} r="4" fill="#fff" />
          </svg>
        )}

        {(loading || rendering) && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          {mode === "pan" ? "Pan mode" : "Measure mode"} • {numFrames > 1 ? `Slice ${frame + 1}/${numFrames}` : "Single frame"}
        </div>

        <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          {measurePx ? `${measurePx.toFixed(1)} px` : "No measurement"}
        </div>
      </div>

      {!error && (
        <div className="bg-background/95 backdrop-blur p-3 space-y-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              variant={mode === "pan" ? "default" : "outline"}
              title="Pan"
              onClick={() => setMode("pan")}
            >
              <ScanLine className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant={mode === "measure" ? "default" : "outline"}
              title="Measure"
              onClick={() => setMode("measure")}
            >
              <Ruler className="h-4 w-4" />
            </Button>

            <Button size="icon" variant="outline" title="Zoom out" onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" title="Zoom in" onClick={() => setZoom((v) => Math.min(5, v + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button size="icon" variant="ghost" title="Reset view" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={preset === key ? "default" : "outline"}
                onClick={() => handlePreset(key)}
              >
                {PRESETS[key].label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sun className="w-3.5 h-3.5" />
              <span className="w-10">W:</span>
              <input
                type="range"
                min={1}
                max={Math.max(4000, (baseRef.current?.ww || 400) * 4)}
                value={ww ?? 0}
                onChange={(e) => setWw(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-10">C:</span>
              <input
                type="range"
                min={-1000}
                max={3000}
                value={wc ?? 0}
                onChange={(e) => setWc(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={pixelsPerMm || ""}
                placeholder="px/mm"
                onChange={(e) => setPixelsPerMm(Number(e.target.value) || 0)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Measure:</span>
              <span className="font-mono text-foreground">
                {measureMm}
              </span>
            </div>
          </div>

          {numFrames > 1 && (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" aria-label="Previous slice" onClick={() => setFrame((f) => Math.max(0, f - 1))} disabled={frame === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                type="range"
                min={0}
                max={numFrames - 1}
                value={frame}
                onChange={(e) => setFrame(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <Button size="icon" variant="outline" aria-label="Next slice" onClick={() => setFrame((f) => Math.min(numFrames - 1, f + 1))} disabled={frame === numFrames - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono w-16 text-right text-muted-foreground">
                {frame + 1} / {numFrames}
              </span>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Scroll, drag, or use arrow keys to navigate slices • + / - to zoom • M to toggle measure mode • R to reset
          </p>
        </div>
      )}
    </div>
  );
};

export default DicomViewer;
