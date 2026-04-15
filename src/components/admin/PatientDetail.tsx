import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  medical_history: string | null;
  notes: string | null;
}

interface Treatment {
  id: string;
  treatment_name: string;
  description: string | null;
  tooth_number: string | null;
  status: string;
  cost: number | null;
  treatment_date: string | null;
  notes: string | null;
}

const PatientDetail = ({ patient, onBack }: { patient: Patient; onBack: () => void }) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ treatment_name: "", description: "", tooth_number: "", cost: "", treatment_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchTreatments = async () => {
    const { data } = await supabase.from("treatments").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false });
    if (data) setTreatments(data);
  };

  useEffect(() => { fetchTreatments(); }, [patient.id]);

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("treatments").insert({
      patient_id: patient.id,
      treatment_name: form.treatment_name,
      description: form.description || null,
      tooth_number: form.tooth_number || null,
      cost: form.cost ? Number(form.cost) : null,
      treatment_date: form.treatment_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ treatment_name: "", description: "", tooth_number: "", cost: "", treatment_date: "", notes: "" });
    fetchTreatments();
  };

  const statusColor = (s: string) => {
    if (s === "completed") return "bg-green-100 text-green-700";
    if (s === "in_progress") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to patients
      </button>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
          <p><span className="text-muted-foreground">Email:</span> {patient.email || "N/A"}</p>
          <p><span className="text-muted-foreground">Gender:</span> {patient.gender || "N/A"}</p>
          <p><span className="text-muted-foreground">DOB:</span> {patient.date_of_birth || "N/A"}</p>
          <p className="col-span-2"><span className="text-muted-foreground">Address:</span> {patient.address || "N/A"}</p>
          <p className="col-span-2"><span className="text-muted-foreground">Medical History:</span> {patient.medical_history || "N/A"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground">Treatments</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Treatment</Button>
      </div>

      <div className="space-y-2">
        {treatments.map(t => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm text-foreground">{t.treatment_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {t.tooth_number && <p>Tooth: {t.tooth_number}</p>}
              {t.description && <p>{t.description}</p>}
              {t.treatment_date && <p>Date: {t.treatment_date}</p>}
              {t.cost && <p>Cost: ₹{Number(t.cost).toLocaleString("en-IN")}</p>}
            </div>
          </div>
        ))}
        {treatments.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No treatments recorded.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Treatment</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTreatment} className="space-y-3">
            <Input placeholder="Treatment Name *" required value={form.treatment_name} onChange={e => setForm({ ...form, treatment_name: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Tooth Number" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} />
            <Input placeholder="Cost (₹)" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
            <Input placeholder="Date" type="date" value={form.treatment_date} onChange={e => setForm({ ...form, treatment_date: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add Treatment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDetail;
