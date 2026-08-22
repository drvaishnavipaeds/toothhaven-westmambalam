import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";

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

      <DentalChart patientId={patient.id} />

      <TreatmentPlans patientId={patient.id} patientName={patient.name} patientPhone={patient.phone} />

      <div className="flex items-center justify-between mb-3 mt-6">

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

      <InvestigationsAdmin patientId={patient.id} />
    </div>
  );
};

interface Investigation {
  id: string;
  investigation_type: string;
  procedure_category: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  media_type: string;
  tooth_number: string | null;
  taken_on: string | null;
  is_visible_to_patient: boolean;
}

const TYPES = ["clinical", "intraoral", "cbct", "xray", "opg"];
const CATEGORIES = ["general", "orthodontics", "implants", "rct", "cosmetic", "pediatric", "surgery"];

const InvestigationsAdmin = ({ patientId }: { patientId: string }) => {
  const [items, setItems] = useState<Investigation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    investigation_type: "clinical",
    procedure_category: "general",
    tooth_number: "",
    taken_on: "",
    is_visible_to_patient: true,
  });
  const { upload, uploading } = useMediaUpload("patient-media");

  const fetchAll = async () => {
    const { data } = await supabase
      .from("patient_investigations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchAll(); }, [patientId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a file to upload");
      return;
    }
    setSaving(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const path = `investigations/${patientId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("patient-media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); setSaving(false); return; }
    const isDicom = file.type === "application/dicom" || ext === "dcm" || ext === "dicom";
    const mediaType = isDicom ? "dicom" : file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "pdf";
    const { error } = await supabase.from("patient_investigations").insert({
      patient_id: patientId,
      title: form.title,
      description: form.description || null,
      investigation_type: form.investigation_type,
      procedure_category: form.procedure_category,
      tooth_number: form.tooth_number || null,
      taken_on: form.taken_on || null,
      is_visible_to_patient: form.is_visible_to_patient,
      url: path,
      media_type: mediaType,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Investigation added");
    setShowAdd(false);
    setFile(null);
    setForm({ title: "", description: "", investigation_type: "clinical", procedure_category: "general", tooth_number: "", taken_on: "", is_visible_to_patient: true });
    fetchAll();
  };

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const need = items.filter(i => !signed[i.id]);
      if (!need.length) return;
      const next: Record<string, string> = {};
      await Promise.all(need.map(async i => {
        const { data } = await supabase.storage.from("patient-media").createSignedUrl(i.url, 3600);
        if (data?.signedUrl) next[i.id] = data.signedUrl;
      }));
      setSigned(s => ({ ...s, ...next }));
    })();
  }, [items]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investigation?")) return;
    await supabase.from("patient_investigations").delete().eq("id", id);
    fetchAll();
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-primary" /> Investigations & Imaging
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Upload</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(it => (
          <div key={it.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="aspect-square bg-muted relative">
              {it.media_type === "image" && signed[it.id] ? (
                <img src={signed[it.id]} alt={it.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase">{it.media_type}</div>
              )}
              <button
                onClick={() => handleDelete(it.id)}
                className="absolute top-1 right-1 p-1 rounded-md bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate">{it.title}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{it.investigation_type}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted capitalize">{it.procedure_category}</span>
                {!it.is_visible_to_patient && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">hidden</span>}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-4">No investigations yet.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Investigation</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input type="file" accept="image/*,video/*,application/pdf,.dcm,.dicom,application/dicom" onChange={e => setFile(e.target.files?.[0] || null)} required />
            <Input placeholder="Title *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.investigation_type} onChange={e => setForm({ ...form, investigation_type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.procedure_category} onChange={e => setForm({ ...form, procedure_category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tooth #" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} />
              <Input type="date" value={form.taken_on} onChange={e => setForm({ ...form, taken_on: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_visible_to_patient} onChange={e => setForm({ ...form, is_visible_to_patient: e.target.checked })} />
              Visible to patient in portal
            </label>
            <Button type="submit" className="w-full" disabled={saving || uploading}>
              {saving || uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDetail;
