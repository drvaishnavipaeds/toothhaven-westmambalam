import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { loadDicomVolume, type DicomVolume } from "./loadDicomVolume";

type Axis = "xy" | "xz" | "yz";

function Plane({ volume, axis }: { volume: DicomVolume; axis: Axis }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [w, h, d] = volume.dimensions;
  const max = axis === "xy" ? d - 1 : axis === "xz" ? h - 1 : w - 1;
  const [index, setIndex] = useState(Math.floor(max / 2));
  useEffect(() => {
    const width = axis === "yz" ? h : w;
    const height = axis === "xy" ? h : d;
    const target = canvas.current;
    const context = target?.getContext("2d");
    if (!target || !context) return;
    target.width = width; target.height = height;
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const source = axis === "xy" ? index * w * h + y * w + x : axis === "xz" ? (d - 1 - y) * w * h + index * w + x : (d - 1 - y) * w * h + x * w + index;
      const out = (y * width + x) * 4; const value = volume.data[source];
      image.data[out] = image.data[out + 1] = image.data[out + 2] = value; image.data[out + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [axis, d, h, index, volume.data, w]);
  const [sx, sy, sz] = volume.spacing;
  const ratio = axis === "xy" ? (w * sx) / (h * sy) : axis === "xz" ? (w * sx) / (d * sz) : (h * sy) / (d * sz);
  return <section className="min-w-0 space-y-2 rounded-md border border-border bg-card p-2" aria-label={`${volume.planes[axis]} CBCT plane`}>
    <div className="flex justify-between text-xs font-medium"><span>{volume.planes[axis]}</span><span className="text-muted-foreground">{index + 1}/{max + 1}</span></div>
    <div className="bg-foreground"><canvas ref={canvas} className="mx-auto max-h-72 w-full object-contain" style={{ aspectRatio: String(ratio) }} /></div>
    <Slider aria-label={`${volume.planes[axis]} slice`} min={0} max={max} step={1} value={[index]} onValueChange={v => setIndex(v[0])} />
  </section>;
}

export default function MultiplanarCbctViewer({ urls }: { urls: string[] }) {
  const [volume, setVolume] = useState<DicomVolume | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true; setVolume(null); setError(null);
    loadDicomVolume(urls).then(v => active && setVolume(v)).catch(e => active && setError(e instanceof Error ? e.message : "Unable to load CBCT planes"));
    return () => { active = false; };
  }, [urls]);
  if (error) return <p role="alert" className="p-6 text-center text-sm text-destructive">{error}</p>;
  if (!volume) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <div className="space-y-2 p-3">
    <p className="text-xs text-muted-foreground">Patient orientation: columns toward {volume.labels.right}, rows toward {volume.labels.down}, slices toward {volume.labels.next}. Review only; not calibrated for surgical planning.</p>
    <div className="grid gap-3 md:grid-cols-3"><Plane volume={volume} axis="xy" /><Plane volume={volume} axis="xz" /><Plane volume={volume} axis="yz" /></div>
  </div>;
}