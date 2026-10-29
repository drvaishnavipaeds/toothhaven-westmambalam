import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Phone, MessageCircle, CheckCircle2, CalendarPlus, Trash2 } from "lucide-react";
import AppointmentPatientSelect from "./AppointmentPatientSelect";
import type { DirectoryPatient } from "@/lib/patient-directory";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { addDays, BUCKET_LABEL, CALL_STATUS_LABEL, followupBucket, followupMessage, FOLLOWUP_TYPES, logCall, whatsappTarget, type CallStatus, type FollowupBucket } from "@/lib/followups";

type Followup = {
  id: string; patient_id: string; doctor_id: string | null; followup_type: string; due_date: string; status: string; call_status: CallStatus;
  call_attempts: number; last_called_at: string | null; notes: string | null; patients: { name: string; phone: string } | null;
};
const BUCKETS: FollowupBucket[] = ["overdue", "today", "tomorrow", "week", "later"];
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const FollowupsManager = () => {
  const [rows, setRows] = useState<Followup[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [bucket, setBucket] = useState<FollowupBucket>("overdue");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ patient: DirectoryPatient | null; followup_type: string; due_date: string; doctor_id: string; notes: string }>({ patient: null, followup_type: "review", due_date: "", doctor_id: "", notes: "" });
  const today = todayIso();

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([
      supabase.from("patient_followups").select("*, patients(name, phone)").eq("status", "pending").order("due_date"),
      supabase.from("staff").select("id,name").eq("role", "dentist").eq("status", "active").order("name"),
    ]);
    if (f.error) toast.error(f.error.message);
    setRows((f.data ?? []) as Followup[]); setDoctors(d.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const g = Object.fromEntries(BUCKETS.map((b) => [b, [] as Followup[]])) as Record<FollowupBucket, Followup[]>;
    for (const r of rows) g[followupBucket(r.due_date, today)].push(r);
    return g;
  }, [rows, today]);
  useEffect(() => { if (grouped[bucket].length === 0) { const first = BUCKETS.find((b) => grouped[b].length > 0); if (first) setBucket(first); } }, [grouped]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (r: Followup, patch: TablesUpdate<"patient_followups">, message: string) => {
    const { error } = await supabase.from("patient_followups").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(message); void load();
  };

  const save = async () => {
    if (!form.patient || !form.due_date) return toast.error("Patient and due date are required");
    const { error } = await supabase.from("patient_followups").insert({
      patient_id: form.patient.id, followup_type: form.followup_type, due_date: form.due_date, doctor_id: form.doctor_id || null, notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Follow-up added"); setOpen(false); void load();
  };

  const whatsapp = (r: Followup) => {
    const target = whatsappTarget(r.patients?.phone);
    if (!target) return toast.error("No valid mobile number on this patient");
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(followupMessage({ patientName: r.patients?.name ?? "", type: r.followup_type, due: r.due_date }))}`, "_blank", "noopener,noreferrer");
  };

  const visible = grouped[bucket];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div><h1 className="text-2xl font-bold">Follow-ups</h1><p className="text-sm text-muted-foreground">Next sittings, reviews and post-op checks to call about. Log every call so nobody is missed or called twice.</p></div>
        <Button size="sm" onClick={() => { setForm({ patient: null, followup_type: "review", due_date: addDays(today, 7), doctor_id: "", notes: "" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add follow-up</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {BUCKETS.map((b) => (
          <button key={b} onClick={() => setBucket(b)} className={`rounded-lg border p-3 text-left ${bucket === b ? "border-primary bg-primary/5" : ""}`}>
            <p className="text-xs text-muted-foreground">{BUCKET_LABEL[b]}</p>
            <p className={`text-2xl font-bold ${b === "overdue" && grouped[b].length ? "text-destructive" : ""}`}>{grouped[b].length}</p>
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Patient</th><th className="p-3">For</th><th className="p-3">Due</th><th className="p-3">Call</th><th className="p-3">Log call</th><th /></tr></thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3"><p className="font-medium">{r.patients?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.patients?.phone}</p>{r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}</td>
                <td className="p-3">{FOLLOWUP_TYPES[r.followup_type] ?? r.followup_type}{r.doctor_id && <p className="text-xs text-muted-foreground">{doctors.find((d) => d.id === r.doctor_id)?.name}</p>}</td>
                <td className={`p-3 ${r.due_date < today ? "text-destructive font-medium" : ""}`}>{r.due_date}</td>
                <td className="p-3"><Badge variant={r.call_status === "not_called" ? "outline" : "secondary"}>{CALL_STATUS_LABEL[r.call_status]}</Badge>{r.call_attempts > 0 && <p className="text-xs text-muted-foreground mt-1">{r.call_attempts} call{r.call_attempts > 1 ? "s" : ""}{r.last_called_at ? ` · last ${new Date(r.last_called_at).toLocaleDateString("en-IN")}` : ""}</p>}</td>
                <td className="p-3">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value="" aria-label="Log call outcome"
                    onChange={(e) => e.target.value && update(r, logCall(e.target.value as CallStatus, r.call_attempts, new Date().toISOString()), `Call logged: ${CALL_STATUS_LABEL[e.target.value as CallStatus]}`)}>
                    <option value="">Outcome…</option>
                    {(Object.keys(CALL_STATUS_LABEL) as CallStatus[]).filter((s) => s !== "not_called").map((s) => <option key={s} value={s}>{CALL_STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="p-3"><div className="flex gap-1 justify-end">
                  {r.patients?.phone && <Button asChild variant="ghost" size="icon" title="Call"><a href={`tel:${r.patients.phone}`}><Phone className="w-4 h-4" /></a></Button>}
                  <Button variant="ghost" size="icon" title="WhatsApp reminder" onClick={() => whatsapp(r)}><MessageCircle className="w-4 h-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" title="Move to next week" onClick={() => update(r, { due_date: addDays(r.due_date < today ? today : r.due_date, 7) }, "Moved by a week")}><CalendarPlus className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" title="Done (patient came in)" onClick={() => update(r, { status: "done" }, "Follow-up done")}><CheckCircle2 className="w-4 h-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={async () => { if (!confirm("Delete this follow-up?")) return; const { error } = await supabase.from("patient_followups").delete().eq("id", r.id); if (error) toast.error(error.message); void load(); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div></td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No follow-ups {BUCKET_LABEL[bucket].toLowerCase()}</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <AppointmentPatientSelect value={form.patient} onSelect={(p) => setForm({ ...form, patient: p })} />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>For</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.followup_type} onChange={(e) => setForm({ ...form, followup_type: e.target.value })}>
                  {Object.entries(FOLLOWUP_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><Label>Due on</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="col-span-2 flex flex-wrap gap-1">
                {[3, 7, 14, 30, 90].map((d) => <Button key={d} type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, due_date: addDays(today, d) })}>{d < 30 ? `${d} days` : `${d / 30} month${d > 30 ? "s" : ""}`}</Button>)}
              </div>
              <div className="col-span-2"><Label>Doctor</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                  <option value="">-- Any --</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. second sitting of RCT on 46" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowupsManager;
