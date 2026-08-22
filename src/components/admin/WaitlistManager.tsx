import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CalendarPlus, Send } from "lucide-react";

const PRIORITY: Record<string, "default" | "secondary" | "destructive"> = {
  urgent: "destructive",
  high: "default",
  normal: "secondary",
};

const WaitlistManager = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ priority: "normal" });

  const load = async () => {
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from("appointment_waitlist").select("*").order("created_at", { ascending: false }),
      supabase.from("patients").select("id,name,phone").order("name"),
    ]);
    setRows(data ?? []);
    setPatients(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.patient_name || !form.patient_phone) return toast.error("Name and phone are required");
    const { error } = await supabase.from("appointment_waitlist").insert({
      patient_id: form.patient_id || null,
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      treatment_type: form.treatment_type || null,
      preferred_date: form.preferred_date || null,
      preferred_time_slot: form.preferred_time_slot || null,
      priority: form.priority ?? "normal",
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added to waitlist");
    setOpen(false); setForm({ priority: "normal" }); load();
  };

  const schedule = async (r: any) => {
    const date = r.preferred_date ?? new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("appointments").insert({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      patient_phone: r.patient_phone,
      appointment_date: date,
      appointment_time: r.preferred_time_slot ?? "10:00",
      treatment_type: r.treatment_type,
      status: "pending",
      source: "waitlist",
      notes: r.notes,
    });
    if (error) return toast.error(error.message);
    await supabase.from("appointment_waitlist").update({ status: "scheduled" }).eq("id", r.id);
    toast.success("Appointment created — confirm the slot in Schedule");
    load();
  };

  const notify = (r: any) => {
    const phone = String(r.patient_phone).replace(/\D/g, "").slice(-10);
    const text = `Hello ${r.patient_name}, a slot has opened up at Tooth Haven Advanced Dental Care for your ${r.treatment_type ?? "appointment"}. Reply to confirm.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    supabase.from("appointment_waitlist").update({ status: "contacted" }).eq("id", r.id).then(() => load());
  };

  const remove = async (r: any) => {
    await supabase.from("appointment_waitlist").delete().eq("id", r.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-bold">Waitlist</h1><p className="text-sm text-muted-foreground">Patients waiting for a slot</p></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Patient</th><th className="p-3">Treatment</th><th className="p-3">Preferred</th><th className="p-3">Priority</th><th className="p-3">Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3"><p className="font-medium">{r.patient_name}</p><p className="text-xs text-muted-foreground">{r.patient_phone}</p></td>
                <td className="p-3">{r.treatment_type ?? "—"}</td>
                <td className="p-3">{r.preferred_date ?? "Any"} {r.preferred_time_slot ?? ""}</td>
                <td className="p-3"><Badge variant={PRIORITY[r.priority] ?? "secondary"}>{r.priority}</Badge></td>
                <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                <td className="p-3 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" title="Notify on WhatsApp" onClick={() => notify(r)}><Send className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" title="Schedule" onClick={() => schedule(r)}><CalendarPlus className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Waitlist is empty</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add to waitlist</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Existing patient</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.patient_id ?? ""} onChange={(e) => {
                const p = patients.find((x) => x.id === e.target.value);
                setForm({ ...form, patient_id: e.target.value || null, patient_name: p?.name ?? form.patient_name, patient_phone: p?.phone ?? form.patient_phone });
              }}>
                <option value="">-- New enquiry --</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.patient_name ?? ""} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
              <div><Label>Phone *</Label><Input value={form.patient_phone ?? ""} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} /></div>
              <div><Label>Treatment</Label><Input value={form.treatment_type ?? ""} onChange={(e) => setForm({ ...form, treatment_type: e.target.value })} /></div>
              <div><Label>Priority</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div><Label>Preferred date</Label><Input type="date" value={form.preferred_date ?? ""} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} /></div>
              <div><Label>Preferred time</Label><Input type="time" value={form.preferred_time_slot ?? ""} onChange={(e) => setForm({ ...form, preferred_time_slot: e.target.value })} /></div>
            </div>
            <Input placeholder="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitlistManager;
