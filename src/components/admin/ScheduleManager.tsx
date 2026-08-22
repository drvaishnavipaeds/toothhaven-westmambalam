import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Armchair } from "lucide-react";

const SLOT_MINUTES = 30;
const DAY_START = 9;
const DAY_END = 21;

const slots = (() => {
  const out: string[] = [];
  for (let h = DAY_START; h < DAY_END; h++) for (let m = 0; m < 60; m += SLOT_MINUTES) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return out;
})();

const norm = (t: string) => {
  if (!t) return "";
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return t.slice(0, 5);
  let h = Number(m[1]);
  const suffix = m[3]?.toLowerCase();
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-primary text-primary-foreground",
  pending: "bg-secondary text-secondary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive line-through",
};

const ScheduleManager = () => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"chair" | "doctor">("chair");
  const [appts, setAppts] = useState<any[]>([]);
  const [chairs, setChairs] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [chairDialog, setChairDialog] = useState(false);
  const [chairName, setChairName] = useState("");
  const [form, setForm] = useState<any>({});

  const load = async () => {
    const [{ data: a }, { data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("appointments").select("*").eq("appointment_date", date).order("appointment_time"),
      supabase.from("chairs").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("staff").select("id,name,role").eq("status", "active").order("name"),
      supabase.from("patients").select("id,name,phone").order("name"),
    ]);
    setAppts(a ?? []);
    setChairs(c ?? []);
    setDoctors((s ?? []).filter((x: any) => /doctor|dentist/i.test(x.role ?? "")).length ? (s ?? []).filter((x: any) => /doctor|dentist/i.test(x.role ?? "")) : (s ?? []));
    setPatients(p ?? []);
  };
  useEffect(() => { load(); }, [date]);

  const columns = useMemo(() => {
    const base = mode === "chair"
      ? chairs.map((c) => ({ id: c.id, label: c.name }))
      : doctors.map((d) => ({ id: d.id, label: d.name }));
    return [...base, { id: "__unassigned", label: "Unassigned" }];
  }, [mode, chairs, doctors]);

  const cellAppts = (colId: string, slot: string) =>
    appts.filter((a) => {
      const key = mode === "chair" ? a.chair_id : a.doctor_id;
      const match = colId === "__unassigned" ? !key : key === colId;
      return match && norm(a.appointment_time) === slot;
    });

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const openNew = (colId?: string, slot?: string) => {
    setForm({
      appointment_date: date,
      appointment_time: slot ?? "10:00",
      duration_minutes: 30,
      status: "confirmed",
      chair_id: mode === "chair" && colId && colId !== "__unassigned" ? colId : null,
      doctor_id: mode === "doctor" && colId && colId !== "__unassigned" ? colId : null,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.patient_name || !form.patient_phone) return toast.error("Patient name and phone are required");
    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id || null,
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      duration_minutes: Number(form.duration_minutes) || 30,
      treatment_type: form.treatment_type || null,
      status: form.status,
      chair_id: form.chair_id || null,
      doctor_id: form.doctor_id || null,
      notes: form.notes || null,
      source: "admin",
    });
    if (error) return toast.error(error.message);
    toast.success("Appointment booked");
    setOpen(false);
    load();
  };

  const reassign = async (apptId: string, colId: string) => {
    const value = colId === "__unassigned" ? null : colId;
    const patch = mode === "chair" ? { chair_id: value } : { doctor_id: value };
    const { error } = await supabase.from("appointments").update(patch).eq("id", apptId);
    if (error) return toast.error(error.message);
    load();
  };

  const addChair = async () => {
    if (!chairName.trim()) return;
    const { error } = await supabase.from("chairs").insert({ name: chairName.trim(), sort_order: chairs.length });
    if (error) return toast.error(error.message);
    setChairName(""); setChairDialog(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">Chair-wise and doctor-wise day view</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setChairDialog(true)}><Armchair className="w-4 h-4 mr-1" />Add Chair</Button>
          <Button size="sm" onClick={() => openNew()}><Plus className="w-4 h-4 mr-1" />Book</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</Button>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs ml-auto">
          {(["chair", "doctor"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 capitalize ${mode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
              {m}-wise
            </button>
          ))}
        </div>
      </div>

      {mode === "chair" && chairs.length === 0 && (
        <p className="text-sm text-muted-foreground">No chairs configured yet — add one to see the chair-wise grid.</p>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 w-16 text-left sticky left-0 bg-muted/50">Time</th>
              {columns.map((c) => <th key={c.id} className="p-2 text-left min-w-[150px]">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot} className="border-t border-border">
                <td className="p-2 text-muted-foreground font-mono sticky left-0 bg-card">{slot}</td>
                {columns.map((c) => {
                  const list = cellAppts(c.id, slot);
                  return (
                    <td
                      key={c.id}
                      className="p-1 align-top border-l border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => list.length === 0 && openNew(c.id, slot)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) reassign(id, c.id); }}
                    >
                      {list.map((a) => (
                        <div
                          key={a.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                          className={`rounded-md px-2 py-1 mb-1 ${STATUS_COLOR[a.status] ?? STATUS_COLOR.pending}`}
                        >
                          <p className="font-semibold truncate">{a.patient_name}</p>
                          <p className="opacity-80 truncate">{a.treatment_type ?? "Consultation"} · {a.duration_minutes ?? 30}m</p>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Existing patient</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.patient_id ?? ""} onChange={(e) => {
                const p = patients.find((x) => x.id === e.target.value);
                setForm({ ...form, patient_id: e.target.value || null, patient_name: p?.name ?? form.patient_name, patient_phone: p?.phone ?? form.patient_phone });
              }}>
                <option value="">-- New / walk-in --</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.patient_name ?? ""} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
              <div><Label>Phone *</Label><Input value={form.patient_phone ?? ""} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.appointment_date ?? ""} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={form.appointment_time ?? ""} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" step={15} value={form.duration_minutes ?? 30} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              <div><Label>Treatment</Label><Input value={form.treatment_type ?? ""} onChange={(e) => setForm({ ...form, treatment_type: e.target.value })} /></div>
              <div><Label>Chair</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.chair_id ?? ""} onChange={(e) => setForm({ ...form, chair_id: e.target.value || null })}>
                  <option value="">-- None --</option>
                  {chairs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Doctor</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.doctor_id ?? ""} onChange={(e) => setForm({ ...form, doctor_id: e.target.value || null })}>
                  <option value="">-- None --</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <Input placeholder="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Book</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chairDialog} onOpenChange={setChairDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add chair / operatory</DialogTitle></DialogHeader>
          <Input placeholder="Chair name (e.g. Operatory 1)" value={chairName} onChange={(e) => setChairName(e.target.value)} />
          <DialogFooter><Button onClick={addChair}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleManager;
