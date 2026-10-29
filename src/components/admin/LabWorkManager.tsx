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
import { Plus, Pencil, Send, PackageCheck, Smile, RotateCcw, Trash2 } from "lucide-react";
import AppointmentPatientSelect from "./AppointmentPatientSelect";
import SimpleCrud from "./SimpleCrud";
import type { DirectoryPatient } from "@/lib/patient-directory";
import { isOverdue, LAB_STATUS_LABEL, LAB_WORK_TYPES, matchesFilter, monthlyLabBills, whatsappTarget, workOrderText, type LabFilter, type LabStatus } from "@/lib/lab-cases";

type Lab = { id: string; name: string; phone: string | null; is_active: boolean };
type Doctor = { id: string; name: string };
type LabCase = {
  id: string; patient_id: string; lab_id: string | null; doctor_id: string | null; work_type: string; tooth_numbers: string | null; shade: string | null;
  material: string | null; instructions: string | null; status: LabStatus; sent_on: string | null; due_date: string | null; received_on: string | null;
  delivered_on: string | null; cost: number; rework_count: number; notes: string | null; patients: { name: string; phone: string } | null;
};
type Form = Partial<Omit<LabCase, "patients">> & { patient?: DirectoryPatient | null };

const money = (v: number | string | null | undefined) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const FILTERS: { id: LabFilter; label: string }[] = [
  { id: "open", label: "Open" }, { id: "overdue", label: "Overdue" }, { id: "at_lab", label: "At lab" },
  { id: "received", label: "Received" }, { id: "delivered", label: "Delivered" }, { id: "all", label: "All" },
];
const statusVariant = (s: LabStatus) => (s === "delivered" ? "default" : s === "received" ? "secondary" : s === "cancelled" ? "outline" : "destructive");

const LabWorkManager = () => {
  const [view, setView] = useState<"cases" | "labs" | "bills">("cases");
  const [cases, setCases] = useState<LabCase[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filter, setFilter] = useState<LabFilter>("open");
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({});
  const today = todayIso();

  const load = useCallback(async () => {
    const [c, l, d] = await Promise.all([
      supabase.from("lab_cases").select("*, patients(name, phone)").order("created_at", { ascending: false }),
      supabase.from("lab_vendors").select("id,name,phone,is_active").order("name"),
      supabase.from("staff").select("id,name").eq("role", "dentist").eq("status", "active").order("name"),
    ]);
    const error = c.error ?? l.error ?? d.error;
    if (error) toast.error(error.message);
    setCases((c.data ?? []) as LabCase[]); setLabs(l.data ?? []); setDoctors(d.data ?? []);
  }, []);
  useEffect(() => { if (view !== "labs") void load(); }, [view, load]);

  const labName = (id: string | null) => labs.find((l) => l.id === id)?.name ?? "—";
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, cases.filter((c) => matchesFilter(c, f.id, today)).length])), [cases, today]);
  const visible = useMemo(() => cases.filter((c) => matchesFilter(c, filter, today)).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")), [cases, filter, today]);
  const bills = useMemo(() => monthlyLabBills(cases, month), [cases, month]);

  const openNew = () => { setForm({ status: "impression", cost: 0, patient: null }); setOpen(true); };
  const openEdit = (c: LabCase) => { const { patients, ...rest } = c; setForm({ ...rest, patient: patients ? { id: c.patient_id, name: patients.name, phone: patients.phone } as DirectoryPatient : null }); setOpen(true); };

  const save = async () => {
    const patientId = form.patient?.id ?? form.patient_id;
    if (!patientId || !form.work_type) return toast.error("Patient and work type are required");
    const payload = {
      patient_id: patientId, lab_id: form.lab_id || null, doctor_id: form.doctor_id || null, work_type: form.work_type,
      tooth_numbers: form.tooth_numbers || null, shade: form.shade || null, material: form.material || null, instructions: form.instructions || null,
      status: form.status ?? "impression", sent_on: form.sent_on || null, due_date: form.due_date || null, received_on: form.received_on || null,
      delivered_on: form.delivered_on || null, cost: Number(form.cost) || 0, notes: form.notes || null,
    };
    const { error } = form.id ? await supabase.from("lab_cases").update(payload).eq("id", form.id) : await supabase.from("lab_cases").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Lab case saved"); setOpen(false); void load();
  };

  const update = async (c: LabCase, patch: Partial<Omit<LabCase, "patients">>, message: string) => {
    const { error } = await supabase.from("lab_cases").update(patch).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(message); void load();
  };

  const sendToLab = async (c: LabCase, rework = false) => {
    const lab = labs.find((l) => l.id === c.lab_id);
    if (!lab) return toast.error("Choose a lab for this case first");
    const target = whatsappTarget(lab.phone);
    if (!target) return toast.error(`Add a WhatsApp number for ${lab.name} under Labs`);
    const text = workOrderText({
      labName: lab.name, patientName: c.patients?.name ?? "", workType: c.work_type, teeth: c.tooth_numbers, shade: c.shade, material: c.material,
      instructions: c.instructions, dueDate: c.due_date, doctorName: doctors.find((d) => d.id === c.doctor_id)?.name, rework,
    });
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    await update(c, rework ? { status: "rework", rework_count: c.rework_count + 1, received_on: null } : { status: "sent", sent_on: c.sent_on ?? today }, rework ? "Sent back for rework" : "Marked as sent to lab");
  };

  const remove = async (c: LabCase) => {
    if (!confirm("Delete this lab case?")) return;
    const { error } = await supabase.from("lab_cases").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div><h1 className="text-2xl font-bold">Lab Work</h1><p className="text-sm text-muted-foreground">Crowns, dentures and appliances at your external labs, from impression to fit.</p></div>
        <div className="flex gap-2">
          {(["cases", "labs", "bills"] as const).map((v) => <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>{v === "cases" ? "Cases" : v === "labs" ? "Labs" : "Lab bills"}</Button>)}
          {view === "cases" && <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />New case</Button>}
        </div>
      </div>

      {view === "labs" && (
        <SimpleCrud title="Labs" description="External dental labs. Add a WhatsApp number to send work orders." table="lab_vendors" orderBy={{ column: "name", ascending: true }} defaultValues={{ is_active: true }} fields={[
          { name: "name", label: "Lab name", required: true },
          { name: "contact_person", label: "Contact person" },
          { name: "phone", label: "WhatsApp number", placeholder: "10-digit mobile" },
          { name: "address", label: "Address", type: "textarea", hideInTable: true },
          { name: "is_active", label: "Active", type: "boolean" },
        ]} />
      )}

      {view === "bills" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Cases sent to each lab in the month and what they cost.</p><Input type="month" className="w-40" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="p-3">Lab</th><th className="p-3">Cases</th><th className="p-3">Amount due</th></tr></thead>
            <tbody>
              {[...bills].map(([id, b]) => <tr key={id} className="border-t"><td className="p-3 font-medium">{labName(id)}</td><td className="p-3">{b.cases}</td><td className="p-3">{money(b.total)}</td></tr>)}
              {bills.size === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No cases sent to a lab this month</td></tr>}
              {bills.size > 0 && <tr className="border-t font-semibold"><td className="p-3">Total</td><td className="p-3">{[...bills.values()].reduce((s, b) => s + b.cases, 0)}</td><td className="p-3">{money([...bills.values()].reduce((s, b) => s + b.total, 0))}</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {view === "cases" && (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>{f.label} ({counts[f.id] ?? 0})</Button>)}
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="p-3">Patient</th><th className="p-3">Work</th><th className="p-3">Lab</th><th className="p-3">Due</th><th className="p-3">Cost</th><th className="p-3">Status</th><th /></tr></thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3"><p className="font-medium">{c.patients?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{c.patients?.phone ?? ""}</p></td>
                    <td className="p-3"><p>{c.work_type}</p><p className="text-xs text-muted-foreground">{[c.tooth_numbers && `Tooth ${c.tooth_numbers}`, c.shade && `Shade ${c.shade}`].filter(Boolean).join(" · ")}</p></td>
                    <td className="p-3">{labName(c.lab_id)}{c.rework_count > 0 && <p className="text-xs text-muted-foreground">Rework ×{c.rework_count}</p>}</td>
                    <td className={`p-3 ${isOverdue(c, today) ? "text-destructive font-medium" : ""}`}>{c.due_date ?? "—"}{isOverdue(c, today) && <p className="text-xs">Overdue</p>}</td>
                    <td className="p-3">{money(c.cost)}</td>
                    <td className="p-3"><Badge variant={statusVariant(c.status)}>{LAB_STATUS_LABEL[c.status] ?? c.status}</Badge></td>
                    <td className="p-3 flex gap-1 justify-end">
                      {c.status === "impression" && <Button variant="ghost" size="icon" title="Send work order to lab on WhatsApp" onClick={() => sendToLab(c)}><Send className="w-4 h-4 text-primary" /></Button>}
                      {(c.status === "sent" || c.status === "rework") && <Button variant="ghost" size="icon" title="Received from lab" onClick={() => update(c, { status: "received", received_on: today }, "Marked received")}><PackageCheck className="w-4 h-4" /></Button>}
                      {c.status === "received" && <Button variant="ghost" size="icon" title="Fitted / delivered to patient" onClick={() => update(c, { status: "delivered", delivered_on: today }, "Marked delivered")}><Smile className="w-4 h-4 text-primary" /></Button>}
                      {c.status === "received" && <Button variant="ghost" size="icon" title="Send back for rework" onClick={() => sendToLab(c, true)}><RotateCcw className="w-4 h-4" /></Button>}
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => remove(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{cases.length === 0 ? "No lab cases yet. Raise one when you send a crown, denture or appliance to a lab." : "Nothing here"}</td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit lab case" : "New lab case"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {form.id ? <p className="text-sm"><span className="text-muted-foreground">Patient:</span> {form.patient?.name}</p> : <AppointmentPatientSelect value={form.patient ?? null} onSelect={(p) => set("patient", p)} />}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Work type *</Label>
                <Input list="lab-work-types" value={form.work_type ?? ""} onChange={(e) => set("work_type", e.target.value)} placeholder="e.g. Zirconia crown" />
                <datalist id="lab-work-types">{LAB_WORK_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div><Label>Tooth (FDI)</Label><Input value={form.tooth_numbers ?? ""} onChange={(e) => set("tooth_numbers", e.target.value)} placeholder="e.g. 36 or 11, 21" /></div>
              <div><Label>Shade</Label><Input value={form.shade ?? ""} onChange={(e) => set("shade", e.target.value)} placeholder="e.g. A2" /></div>
              <div><Label>Material</Label><Input value={form.material ?? ""} onChange={(e) => set("material", e.target.value)} /></div>
              <div><Label>Lab</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.lab_id ?? ""} onChange={(e) => set("lab_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {labs.filter((l) => l.is_active || l.id === form.lab_id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {labs.length === 0 && <p className="text-xs text-muted-foreground mt-1">Add your labs under the Labs tab.</p>}
              </div>
              <div><Label>Doctor</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.doctor_id ?? ""} onChange={(e) => set("doctor_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><Label>Sent to lab on</Label><Input type="date" value={form.sent_on ?? ""} onChange={(e) => set("sent_on", e.target.value)} /></div>
              <div><Label>Due back</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} /></div>
              <div><Label>Lab cost (₹)</Label><Input type="number" min={0} value={form.cost ?? 0} onChange={(e) => set("cost", Number(e.target.value))} /></div>
              <div><Label>Status</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.status ?? "impression"} onChange={(e) => set("status", e.target.value as LabStatus)}>
                  {(Object.keys(LAB_STATUS_LABEL) as LabStatus[]).map((s) => <option key={s} value={s}>{LAB_STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Instructions for the lab</Label><Textarea value={form.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} /></div>
            <div><Label>Internal notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabWorkManager;
