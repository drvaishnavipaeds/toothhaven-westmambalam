import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sun, RotateCcw } from "lucide-react";
// @ts-ignore - no types
import * as cornerstone from "cornerstone-core";
// @ts-ignore
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
// @ts-ignore
import * as dicomParser from "dicom-parser";

let initialized = false;
const initCornerstone = () => {
  if (initialized) return;
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
  cornerstoneWADOImageLoader.configure({ useWebWorkers: false });
  initialized = true;
};

interface Props {
  url: string;
}

const DicomViewer = ({ url }: Props) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [numFrames, setNumFrames] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ww, setWw] = useState<number | null>(null);
  const [wc, setWc] = useState<number | null>(null);
  const baseRef = useRef<{ ww: number; wc: number } | null>(null);

  // Load DICOM and detect frames
  useEffect(() => {
    initCornerstone();
    const el = elRef.current;
    if (!el) return;
    setLoading(true);
    setError(null);
    cornerstone.enable(el);

    (async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const byteArray = new Uint8Array(buf);
        const dataset = dicomParser.parseDicom(byteArray);
        const frames = parseInt(dataset.string("x00280008") || "1", 10) || 1;
        // Register the file so wado loader can read it
        const fileObj = new Blob([buf], { type: "application/dicom" });
        const fileUrl = URL.createObjectURL(fileObj);
        // Store the url with the loader using its file scheme
        const baseImageId = `wadouri:${fileUrl}`;
        // Cache file mapping
        (cornerstoneWADOImageLoader as any).wadouri.fileManager.add &&
          undefined;
        setNumFrames(frames);
        setFrame(0);
        // Load first frame
        const imageId = frames > 1 ? `${baseImageId}?frame=0` : baseImageId;
        const image = await cornerstone.loadAndCacheImage(imageId);
        cornerstone.displayImage(el, image);
        baseRef.current = { ww: image.windowWidth, wc: image.windowCenter };
        setWw(image.windowWidth);
        setWc(image.windowCenter);
        // Stash baseImageId on element
        (el as any).__baseImageId = baseImageId;
        (el as any).__numFrames = frames;
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load DICOM file");
        setLoading(false);
      }
    })();

    return () => {
      try { cornerstone.disable(el); } catch {}
    };
  }, [url]);

  // Frame change
  useEffect(() => {
    const el = elRef.current as any;
    if (!el || !el.__baseImageId) return;
    const imageId = el.__numFrames > 1 ? `${el.__baseImageId}?frame=${frame}` : el.__baseImageId;
    cornerstone.loadAndCacheImage(imageId).then((img: any) => {
      const viewport = cornerstone.getViewport(el);
      if (viewport && ww != null && wc != null) {
        viewport.voi.windowWidth = ww;
        viewport.voi.windowCenter = wc;
      }
      cornerstone.displayImage(el, img, viewport);
    }).catch((e: any) => console.error(e));
  }, [frame, ww, wc]);

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
        ref={elRef}
        onWheel={onWheel}
        className="relative w-full h-[60vh] select-none"
        style={{ touchAction: "none" }}
      >
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
