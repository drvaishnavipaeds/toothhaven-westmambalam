import { useEffect, useRef, useState } from "react";
import { Crosshair, Maximize2, MessageSquarePlus, RotateCcw, Ruler, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToothSelect } from "./ClinicalSelectors";
import { toast } from "sonner";

interface Annotation { id: string; annotation_type: string; points: Array<{ x: number; y: number }>; value_mm: number | null; label: string | null; tooth_number: string | null; }

const InvestigationWorkbench = ({ investigationId, url, title }: { investigationId: string; url: string; title: string }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<"pan" | "measurement" | "marker">("pan");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");
  const [tooth, setTooth] = useState("");
  const [pixelsPerMm, setPixelsPerMm] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase.from("investigation_annotations").select("*").eq("investigation_id", investigationId).order("created_at");
    setAnnotations((data ?? []) as unknown as Annotation[]);
  };
  useEffect(() => { void load(); }, [investigationId]);

  const point = (event: React.PointerEvent) => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };

  const saveAnnotation = async (type: "measurement" | "marker", points: Array<{ x: number; y: number }>) => {
    const dx = (points[1]?.x ?? points[0].x) - points[0].x;
    const dy = (points[1]?.y ?? points[0].y) - points[0].y;
    const rect = stage.current?.getBoundingClientRect();
    const pixels = Math.hypot(dx * (rect?.width ?? 0), dy * (rect?.height ?? 0));
    const { error } = await supabase.from("investigation_annotations").insert({ investigation_id: investigationId, frame_index: 0, annotation_type: type, points, value_mm: type === "measurement" ? pixels / Math.max(pixelsPerMm, 0.01) : null, label: label || null, tooth_number: tooth || null });
    if (error) return toast.error(error.message);
    setLabel(""); setStart(null); void load();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (mode === "pan") { drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }; return; }
    const next = point(event); if (!next) return;
    if (mode === "marker") void saveAnnotation("marker", [next]);
    else if (!start) setStart(next); else void saveAnnotation("measurement", [start, next]);
  };
  const onPointerMove = (event: React.PointerEvent) => { if (mode === "pan" && drag.current) setPosition({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }); };
  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); setStart(null); };

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background p-2">
      <Button size="icon" variant="outline" onClick={() => setScale((v) => Math.min(5, v + .25))} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
      <Button size="icon" variant="outline" onClick={() => setScale((v) => Math.max(.5, v - .25))} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
      <Button size="icon" variant={mode === "pan" ? "default" : "outline"} onClick={() => setMode("pan")} title="Pan"><Maximize2 className="h-4 w-4" /></Button>
      <Button size="icon" variant={mode === "measurement" ? "default" : "outline"} onClick={() => setMode("measurement")} title="Measure"><Ruler className="h-4 w-4" /></Button>
      <Button size="icon" variant={mode === "marker" ? "default" : "outline"} onClick={() => setMode("marker")} title="Add marker"><Crosshair className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={reset} title="Reset"><RotateCcw className="h-4 w-4" /></Button>
      <Input className="h-9 w-28" type="number" min="0.01" step="0.01" value={pixelsPerMm} onChange={(event) => setPixelsPerMm(Number(event.target.value) || 1)} aria-label="Pixels per millimetre" title="Calibration: pixels per millimetre" />
      <Input className="h-9 min-w-36 flex-1" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Annotation note" />
      <ToothSelect className="h-9 w-44" value={tooth} onValueChange={setTooth} />
    </div>
    <div ref={stage} className="relative h-[55vh] touch-none overflow-hidden bg-foreground" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <img src={url} alt={title} draggable={false} className="h-full w-full select-none object-contain transition-transform" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {annotations.map((annotation) => annotation.annotation_type === "measurement" && annotation.points.length > 1 ? <g key={annotation.id}><line x1={`${annotation.points[0].x * 100}%`} y1={`${annotation.points[0].y * 100}%`} x2={`${annotation.points[1].x * 100}%`} y2={`${annotation.points[1].y * 100}%`} className="stroke-primary" strokeWidth="2" /><text x={`${annotation.points[1].x * 100}%`} y={`${annotation.points[1].y * 100}%`} className="fill-primary text-xs">{Number(annotation.value_mm).toFixed(1)} mm</text></g> : <g key={annotation.id}><circle cx={`${annotation.points[0].x * 100}%`} cy={`${annotation.points[0].y * 100}%`} r="7" className="fill-primary stroke-background" strokeWidth="2" /><text x={`${annotation.points[0].x * 100}%`} y={`${annotation.points[0].y * 100}%`} dx="10" className="fill-primary text-xs">{annotation.label || annotation.tooth_number || "Marker"}</text></g>)}
        {start && <circle cx={`${start.x * 100}%`} cy={`${start.y * 100}%`} r="6" className="fill-primary" />}
      </svg>
    </div>
    {annotations.length > 0 && <div className="max-h-32 space-y-1 overflow-y-auto px-2">{annotations.map((annotation) => <div key={annotation.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs"><span><MessageSquarePlus className="mr-1 inline h-3 w-3" />{annotation.label || annotation.annotation_type}{annotation.value_mm != null ? ` · ${Number(annotation.value_mm).toFixed(1)} mm` : ""}{annotation.tooth_number ? ` · Tooth ${annotation.tooth_number}` : ""}</span><Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await supabase.from("investigation_annotations").delete().eq("id", annotation.id); void load(); }}><Trash2 className="h-3 w-3 text-destructive" /></Button></div>)}</div>}
  </div>;
};

export default InvestigationWorkbench;