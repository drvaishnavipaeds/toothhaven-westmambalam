import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientDetail from "./PatientDetail";

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
  created_at: string;
}

const PatientsList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", gender: "", address: "", medical_history: "" });
  const [saving, setSaving] = useState(false);

  const fetchPatients = async () => {
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (data) setPatients(data);
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("patients").insert({ name: form.name, phone: form.phone, email: form.email || null, gender: form.gender || null, address: form.address || null, medical_history: form.medical_history || null });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", phone: "", email: "", gender: "", address: "", medical_history: "" });
    fetchPatients();
  };

  if (selectedPatient) {
    return <PatientDetail patient={selectedPatient} onBack={() => { setSelectedPatient(null); fetchPatients(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Patients</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Patient</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.phone} {p.email && `• ${p.email}`}</p>
            </div>
            <button onClick={() => setSelectedPatient(p)} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No patients found.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Full Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone *" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Medical History" value={form.medical_history} onChange={e => setForm({ ...form, medical_history: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add Patient"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsList;
