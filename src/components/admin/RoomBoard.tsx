import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Armchair, CheckCircle2, LogIn, Monitor, RefreshCw, Undo2, X } from "lucide-react";
import { buildBoard, displayName, minutesSince, type QueueAppointment } from "@/lib/room-board";

type Chair = { id: string; name: string };
const REFRESH_MS = 15000;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const time12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

const RoomBoard = () => {
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [appointments, setAppointments] = useState<QueueAppointment[]>([]);
  const [now, setNow] = useState(new Date());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tv, setTv] = useState(false);
  const tvRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      supabase.from("chairs").select("id,name").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("appointments").select("id, patient_name, appointment_time, status, chair_id, checked_in_at, seated_at, treatment_type")
        .eq("appointment_date", todayIso()).in("status", ["confirmed", "completed"]).order("appointment_time"),
    ]);
    if (c.error ?? a.error) toast.error((c.error ?? a.error)!.message);
    setChairs(c.data ?? []); setAppointments((a.data ?? []) as QueueAppointment[]); setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); setNow(new Date()); }, REFRESH_MS);
    const channel = supabase.channel("room-board").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load()).subscribe();
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [load]);

  const board = useMemo(() => buildBoard(appointments), [appointments]);
  const freeChairs = chairs.filter((c) => !board.inChair.has(c.id));

  const update = async (a: QueueAppointment, patch: Partial<Pick<QueueAppointment, "checked_in_at" | "seated_at" | "chair_id" | "status">>, message: string) => {
    const { error } = await supabase.from("appointments").update(patch).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(message); void load();
  };
  const seat = (a: QueueAppointment, chair: Chair) => update(a, { chair_id: chair.id, seated_at: new Date().toISOString(), checked_in_at: a.checked_in_at ?? new Date().toISOString() }, `${a.patient_name} seated in ${chair.name}`);
  const complete = (a: QueueAppointment) => update(a, { status: "completed" }, `${a.patient_name} done. A Google review request goes out on WhatsApp in about 2 hours.`);

  const openTv = async () => { setTv(true); try { await tvRef.current?.requestFullscreen?.(); } catch { /* overlay still covers the screen */ } };
  const closeTv = async () => { setTv(false); if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined); };
  useEffect(() => { const onFs = () => { if (!document.fullscreenElement) setTv(false); }; document.addEventListener("fullscreenchange", onFs); return () => document.removeEventListener("fullscreenchange", onFs); }, []);

  const SeatButtons = ({ a }: { a: QueueAppointment }) => (
    <div className="flex flex-wrap gap-1">
      {freeChairs.map((c) => <Button key={c.id} size="sm" variant="outline" onClick={() => seat(a, c)}><Armchair className="w-3 h-3 mr-1" />{c.name}</Button>)}
      {freeChairs.length === 0 && <span className="text-xs text-muted-foreground">All chairs busy</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div><h1 className="text-2xl font-bold">Room board</h1><p className="text-sm text-muted-foreground">Today's live chair status · refreshes every 15 s{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}</p></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={openTv}><Monitor className="w-4 h-4 mr-1" />TV display</Button>
        </div>
      </div>

      {chairs.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No chairs set up. Add chairs under Schedule to use the room board.</Card>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chairs.map((c) => {
          const a = board.inChair.get(c.id);
          return (
            <Card key={c.id} className={`p-4 space-y-2 ${a ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between"><p className="font-semibold flex items-center gap-2"><Armchair className="w-4 h-4" />{c.name}</p><Badge variant={a ? "default" : "outline"}>{a ? "Occupied" : "Free"}</Badge></div>
              {a ? (
                <>
                  <div><p className="font-medium">{a.patient_name}</p><p className="text-xs text-muted-foreground">{a.treatment_type ?? "Appointment"} · booked {time12(a.appointment_time)} · in chair {minutesSince(a.seated_at, now)} min</p></div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => complete(a)}><CheckCircle2 className="w-4 h-4 mr-1" />Done</Button>
                    <Button size="sm" variant="ghost" title="Back to waiting" onClick={() => update(a, { seated_at: null }, `${a.patient_name} moved back to waiting`)}><Undo2 className="w-4 h-4" /></Button>
                  </div>
                </>
              ) : <p className="text-sm text-muted-foreground">Ready for the next patient</p>}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-2">
          <p className="font-semibold">Waiting ({board.waiting.length})</p>
          {board.waiting.map((a) => (
            <div key={a.id} className="border-t pt-2 space-y-1">
              <div className="flex justify-between gap-2"><p className="font-medium">{a.patient_name}</p><p className="text-xs text-muted-foreground">booked {time12(a.appointment_time)} · waiting {minutesSince(a.checked_in_at, now)} min</p></div>
              <div className="flex items-center justify-between gap-2"><SeatButtons a={a} /><Button size="sm" variant="ghost" title="Undo check-in" onClick={() => update(a, { checked_in_at: null }, "Check-in undone")}><Undo2 className="w-4 h-4" /></Button></div>
            </div>
          ))}
          {board.waiting.length === 0 && <p className="text-sm text-muted-foreground">Nobody waiting</p>}
        </Card>
        <Card className="p-4 space-y-2">
          <p className="font-semibold">Still to arrive ({board.expected.length}) · done today {board.done}</p>
          {board.expected.map((a) => (
            <div key={a.id} className="border-t pt-2 flex items-center justify-between gap-2">
              <div><p className="font-medium">{a.patient_name}</p><p className="text-xs text-muted-foreground">{time12(a.appointment_time)} · {a.treatment_type ?? "Appointment"}</p></div>
              <Button size="sm" variant="outline" onClick={() => update(a, { checked_in_at: new Date().toISOString() }, `${a.patient_name} checked in`)}><LogIn className="w-4 h-4 mr-1" />Arrived</Button>
            </div>
          ))}
          {board.expected.length === 0 && <p className="text-sm text-muted-foreground">No more confirmed appointments today</p>}
        </Card>
      </div>

      <div ref={tvRef} className={tv ? "fixed inset-0 z-[100] bg-slate-950 text-white p-8 overflow-hidden" : "hidden"}>
        <button onClick={closeTv} className="absolute top-4 right-4 opacity-40 hover:opacity-100" aria-label="Close TV display"><X className="w-6 h-6" /></button>
        <div className="flex items-baseline justify-between mb-8"><h2 className="text-4xl font-bold">Tooth Haven</h2><p className="text-3xl tabular-nums">{now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-2xl uppercase tracking-wide text-cyan-300">Now in chair</p>
            {chairs.map((c) => { const a = board.inChair.get(c.id); return (
              <div key={c.id} className="rounded-2xl bg-white/10 p-6 flex justify-between items-center"><span className="text-3xl">{c.name}</span><span className="text-4xl font-semibold">{a ? displayName(a.patient_name) : "—"}</span></div>
            ); })}
          </div>
          <div className="space-y-4">
            <p className="text-2xl uppercase tracking-wide text-cyan-300">Up next</p>
            {board.waiting.slice(0, 6).map((a, i) => <div key={a.id} className={`rounded-2xl p-6 text-4xl ${i === 0 ? "bg-cyan-500/30 font-semibold" : "bg-white/5"}`}>{i + 1}. {displayName(a.patient_name)}</div>)}
            {board.waiting.length === 0 && <p className="text-3xl text-white/60">Please take a seat. We'll call you shortly.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomBoard;
