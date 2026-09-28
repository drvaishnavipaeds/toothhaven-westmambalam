import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export const SignaturePad = ({ onChange }: { onChange: (blob: Blob | null) => void }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height };
  };
  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = position(event);
    ctx.strokeStyle = "#173438";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    drawing.current = true;
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = position(event);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    setHasInk(true);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    canvas.current?.toBlob(blob => onChange(blob), "image/png");
  };
  const clear = () => {
    const el = canvas.current;
    el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
    setHasInk(false); onChange(null);
  };
  return <div className="space-y-1">
    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Patient signature</span><Button type="button" size="sm" variant="ghost" onClick={clear} disabled={!hasInk} title="Clear signature"><RotateCcw className="h-4 w-4" /></Button></div>
    <canvas ref={canvas} width={700} height={180} aria-label="Patient signature area" className="w-full h-36 touch-none rounded border border-input bg-background" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
  </div>;
};