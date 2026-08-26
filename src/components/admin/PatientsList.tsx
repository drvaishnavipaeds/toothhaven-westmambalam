import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Eye, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
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
  branch_id?: string | null;
  created_at: string;
}

const patientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().regex(/^\+?\d[\d\s-]{8,14}$/, "Enter a valid phone number (10 digits)"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  medical_history: z.string().max(2000).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  branch_id: z.string().optional().or(z.literal("")),
});

const emptyForm = {
  name: "", phone: "", email: "", date_of_birth: "", gender: "",
  address: "", medical_history: "", notes: "", branch_id: "",
};

const digits = (s: string) => s.replace(/\D/g, "");

const PatientsList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPatients = async () => {
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (data) setPatients(data as Patient[]);
  };

  useEffect(() => {
    fetchPatients();
    supabase.from("branches").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => data && setBranches(data));
  }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const findDuplicate = (phone: string, email: string) => {
    const p10 = digits(phone).slice(-10);
    const e = email.trim().toLowerCase();
    return patients.find(pt =>
      (p10.length === 10 && digits(pt.phone).slice(-10) === p10) ||
      (!!e && (pt.email || "").toLowerCase() === e)
    ) || null;
  };

  const openRegister = () => {
    setForm(emptyForm);
    setErrors({});
    setDuplicate(null);
    setSelectedPatient(null);
    setShowAdd(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicate(null);
    const parsed = patientSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach(i => { fieldErrors[String(i.path[0])] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const dup = findDuplicate(form.phone, form.email);
    if (dup) { setDuplicate(dup); return; }

    setSaving(true);
    const { data, error } = await supabase.from("patients").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      address: form.address.trim() || null,
      medical_history: form.medical_history.trim() || null,
      notes: form.notes.trim() || null,
      branch_id: form.branch_id || null,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Patient registered");
    setShowAdd(false);
    setForm(emptyForm);
    await fetchPatients();
    if (data) setSelectedPatient(data as Patient);
  };

  if (selectedPatient) {
    return (
      <PatientDetail
        patient={selectedPatient}
        onBack={() => { setSelectedPatient(null); fetchPatients(); }}
        onRegisterNew={openRegister}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Patients</h2>
        <Button size="sm" onClick={openRegister}><Plus className="w-4 h-4 mr-1" /> Register Patient</Button>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                Date of birth
                <Input type="date" className="mt-1" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">
                Gender
                <select
                  className="mt-1 w-full border border-input bg-background rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            {branches.length > 0 && (
              <label className="text-xs text-muted-foreground block">
                Branch
                <select
                  className="mt-1 w-full border border-input bg-background rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.branch_id}
                  onChange={e => setForm({ ...form, branch_id: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Medical History" value={form.medical_history} onChange={e => setForm({ ...form, medical_history: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

            {duplicate && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangle className="w-4 h-4" /> Possible duplicate
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {duplicate.name} ({duplicate.phone}) already exists.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowAdd(false); setSelectedPatient(duplicate); }}>
                    Open existing record
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicate(null)}>
                    Register anyway
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Register Patient"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsList;
