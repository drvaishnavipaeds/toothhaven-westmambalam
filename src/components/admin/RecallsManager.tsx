import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Send, CheckCircle2, RotateCw } from "lucide-react";

const RECALL_TYPES = ["checkup", "scaling", "ortho adjustment", "implant review", "denture review", "follow-up"];

const RecallsManager = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [filter, setFilter] = useState<"due" | "all">("due");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ recall_type: "checkup", interval_months: 6 });

  const load = async () => {
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from("patient_recalls").select("*, patients(name, phone)").order("due_date"),
      supabase.from("patients").select("id,name,phone").order("name"),
    ]);
    setRows(data ?? []);
    setPatients(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(
    () => (filter === "due" ? rows.filter((r) => r.status === "pending" && r.due_date <= today) : rows),
    [rows, filter, today],
  );

  const save = async () => {
    if (!form.patient_id || !form.due_date) return toast.error("Patient and due date are required");
    const { error } = await supabase.from("patient_recalls").insert({
      patient_id: form.patient_id,
      recall_type: form.recall_type,
      due_date: form.due_date,
      interval_months: Number(form.interval_months) || 6,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Recall scheduled");
    setOpen(false); setForm({ recall_type: "checkup", interval_months: 6 }); load();
  };

  const notify = async (r: any) => {
    const phone = String(r.patients?.phone ?? "").replace(/\D/g, "").slice(-10);
    const text = `Hello ${r.patients?.name ?? ""}, your ${r.recall_type} at Tooth Haven Advanced Dental Care is due on ${r.due_date}. Reply to book a convenient slot.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    await supabase.from("patient_recalls").update({ status: "contacted", last_contacted_at: new Date().toISOString() }).eq("id", r.id);
    load();
  };

  const complete = async (r: any) => {
    const next = new Date(r.due_date);
    next.setMonth(next.getMonth() + (Number(r.interval_months) || 6));
    await supabase.from("patient_recalls").update({ status: "completed" }).eq("id", r.id);
    await supabase.from("patient_recalls").insert({
      patient_id: r.patient_id,
      recall_type: r.recall_type,
      due_date: next.toISOString().slice(0, 10),
      interval_months: r.interval_months,
      notes: r.notes,
    });
    toast.success(`Completed — next recall auto-scheduled for ${next.toISOString().slice(0, 10)}`);
    load();
  };

  const remove = async (r: any) => { await supabase.from("patient_recalls").delete().eq("id", r.id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-bold">Recalls</h1><p className="text-sm text-muted-foreground">Automatic follow-up reminders</p></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setFilter(filter === "due" ? "all" : "due")}>
            <RotateCw className="w-4 h-4 mr-1" />{filter === "due" ? "Show all" : "Show due only"}
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />New</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Patient</th><th className="p-3">Type</th><th className="p-3">Due</th><th className="p-3">Status</th><th /></tr></thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3"><p className="font-medium">{r.patients?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.patients?.phone ?? ""}</p></td>
                <td className="p-3 capitalize">{r.recall_type}</td>
                <td className={`p-3 ${r.due_date <= today && r.status === "pending" ? "text-destructive font-medium" : ""}`}>{r.due_date}</td>
                <td className="p-3"><Badge variant={r.status === "completed" ? "default" : r.status === "contacted" ? "secondary" : "outline"}>{r.status}</Badge></td>
                <td className="p-3 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" title="Remind on WhatsApp" onClick={() => notify(r)}><Send className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" title="Mark done & reschedule" onClick={() => complete(r)}><CheckCircle2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nothing due</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule recall</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient *</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.patient_id ?? ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">-- Select --</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.recall_type} onChange={(e) => setForm({ ...form, recall_type: e.target.value })}>
                  {RECALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Repeat every (months)</Label><Input type="number" value={form.interval_months} onChange={(e) => setForm({ ...form, interval_months: e.target.value })} /></div>
            </div>
            <div><Label>Due date *</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <Input placeholder="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecallsManager;
