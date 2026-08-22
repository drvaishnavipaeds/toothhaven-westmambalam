import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Printer, Pencil } from "lucide-react";

type Drug = { name: string; dose: string; frequency: string; duration: string; notes?: string };

const PrescriptionsManager = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ prescribed_date: new Date().toISOString().slice(0, 10), drugs: [] as Drug[] });

  const load = async () => {
    const { data } = await supabase.from("prescriptions").select("*, patients(name, phone)").order("prescribed_date", { ascending: false });
    setRows(data ?? []);
    const { data: p } = await supabase.from("patients").select("id,name,phone").order("name");
    setPatients(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ prescribed_date: new Date().toISOString().slice(0, 10), drugs: [], patient_id: "" });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r, drugs: Array.isArray(r.drugs) ? r.drugs : [] });
    setOpen(true);
  };

  const addDrug = () => setForm((f: any) => ({ ...f, drugs: [...(f.drugs ?? []), { name: "", dose: "", frequency: "", duration: "" }] }));
  const updateDrug = (i: number, k: keyof Drug, v: string) =>
    setForm((f: any) => ({ ...f, drugs: f.drugs.map((d: Drug, idx: number) => (idx === i ? { ...d, [k]: v } : d)) }));
  const removeDrug = (i: number) => setForm((f: any) => ({ ...f, drugs: f.drugs.filter((_: any, idx: number) => idx !== i) }));

  const aiDraft = async () => {
    if (!form.diagnosis && !form.chief_complaint) return toast.error("Enter a diagnosis or complaint first");
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("clinical-copilot", {
      body: {
        task: "prescription",
        patient_id: form.patient_id || undefined,
        diagnosis: form.diagnosis || undefined,
        chief_complaint: form.chief_complaint || undefined,
      },
    });
    setAiLoading(false);
    const err = (data as any)?.error ?? error?.message;
    if (err) return toast.error(typeof err === "string" ? err : "AI draft failed");
    const o = (data as any)?.output;
    if (!o) return toast.error("No draft returned");
    setForm((f: any) => ({
      ...f,
      diagnosis: f.diagnosis || o.diagnosis,
      drugs: [...(f.drugs ?? []), ...(o.drugs ?? [])],
      instructions_en: [o.instructions_en, o.red_flags].filter(Boolean).join("\n"),
      instructions_ta: o.instructions_ta ?? "",
    }));
    toast.success("Draft added — review before saving");
  };

  const save = async () => {
    if (!form.patient_id) return toast.error("Select a patient");
    const payload = {
      patient_id: form.patient_id,
      prescribed_date: form.prescribed_date,
      diagnosis: form.diagnosis,
      drugs: form.drugs,
      notes: form.notes,
      doctor_name: form.doctor_name,
      instructions_en: form.instructions_en,
      instructions_ta: form.instructions_ta,
    };
    const { error } = editing
      ? await supabase.from("prescriptions").update(payload).eq("id", editing.id)
      : await supabase.from("prescriptions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };


  const remove = async (r: any) => {
    if (!confirm("Delete prescription?")) return;
    await supabase.from("prescriptions").delete().eq("id", r.id);
    load();
  };

  const printRx = (r: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const drugs = (r.drugs ?? []).map((d: Drug, i: number) =>
      `<tr><td>${i + 1}</td><td>${d.name}</td><td>${d.dose}</td><td>${d.frequency}</td><td>${d.duration}</td></tr>`
    ).join("");
    w.document.write(`
      <html><head><title>Rx ${r.patients?.name ?? ""}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}.header{display:flex;justify-content:space-between;border-bottom:2px solid #0891b2;padding-bottom:8px;margin-bottom:16px}</style>
      </head><body>
      <div class="header"><div><h1>Tooth Haven Advanced Dental Care</h1><p>West Mambalam, Chennai · +91 89251 66149</p></div><div><strong>${r.doctor_name ?? "Dr. Karthik Srinivasan, BDS"}</strong></div></div>
      <p><strong>Patient:</strong> ${r.patients?.name ?? ""} · <strong>Phone:</strong> ${r.patients?.phone ?? ""}</p>
      <p><strong>Date:</strong> ${r.prescribed_date} · <strong>Diagnosis:</strong> ${r.diagnosis ?? ""}</p>
      <table><thead><tr><th>#</th><th>Drug</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${drugs}</tbody></table>
      <p style="margin-top:24px">${r.notes ?? ""}</p>
      <p style="margin-top:64px;text-align:right">Signature</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-bold">Prescriptions</h1><p className="text-sm text-muted-foreground">Digital Rx with print export</p></div>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New Rx</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Date</th><th className="p-3">Patient</th><th className="p-3">Diagnosis</th><th className="p-3">Drugs</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.prescribed_date}</td>
                <td className="p-3">{r.patients?.name ?? "—"}</td>
                <td className="p-3">{r.diagnosis ?? "—"}</td>
                <td className="p-3">{Array.isArray(r.drugs) ? r.drugs.length : 0}</td>
                <td className="p-3 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => printRx(r)}><Printer className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No prescriptions yet</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Prescription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patient *</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.patient_id ?? ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">-- Select --</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.prescribed_date ?? ""} onChange={(e) => setForm({ ...form, prescribed_date: e.target.value })} /></div>
            </div>
            <div><Label>Diagnosis</Label><Input value={form.diagnosis ?? ""} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div><Label>Doctor</Label><Input value={form.doctor_name ?? ""} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} placeholder="Dr. Karthik Srinivasan, BDS" /></div>
            <div>
              <div className="flex justify-between items-center mb-2"><Label>Drugs</Label><Button size="sm" variant="outline" onClick={addDrug}><Plus className="w-3 h-3 mr-1" />Add</Button></div>
              <div className="space-y-2">
                {form.drugs.map((d: Drug, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <Input className="col-span-4" placeholder="Drug" value={d.name} onChange={(e) => updateDrug(i, "name", e.target.value)} />
                    <Input className="col-span-2" placeholder="Dose" value={d.dose} onChange={(e) => updateDrug(i, "dose", e.target.value)} />
                    <Input className="col-span-2" placeholder="Freq" value={d.frequency} onChange={(e) => updateDrug(i, "frequency", e.target.value)} />
                    <Input className="col-span-3" placeholder="Duration" value={d.duration} onChange={(e) => updateDrug(i, "duration", e.target.value)} />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeDrug(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Patient instructions (English)</Label><Textarea rows={4} value={form.instructions_en ?? ""} onChange={(e) => setForm({ ...form, instructions_en: e.target.value })} /></div>
              <div><Label>நோயாளிக்கான அறிவுரைகள் (Tamil)</Label><Textarea rows={4} value={form.instructions_ta ?? ""} onChange={(e) => setForm({ ...form, instructions_ta: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="secondary" onClick={aiDraft} disabled={aiLoading}>
              <Sparkles className="w-4 h-4 mr-1" />{aiLoading ? "Drafting…" : "AI draft"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrescriptionsManager;
