import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { DirectoryPatient, loadPatientDirectory, samePatient, patientAge, patientRegistrationDate } from "@/lib/patient-directory";

export default function AppointmentPatientSelect({ value, onSelect }: { value: DirectoryPatient | null; onSelect: (patient: DirectoryPatient | null) => void }) {
  const [patients, setPatients] = useState<DirectoryPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", date_of_birth: "", gender: "" });
  const load = async () => {
    setLoading(true);
    try { setPatients(await loadPatientDirectory()); setError(""); }
    catch { setError("Could not load patients. Please retry."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const select = (patient: DirectoryPatient) => { onSelect(patient); setAdding(false); setOpen(false); setError(""); };
  const startNew = () => { onSelect(null); setDraft({ name: query, phone: "", date_of_birth: "", gender: "" }); setAdding(true); setOpen(false); setError(""); };
  const register = async () => {
    if (draft.name.trim().length < 2 || !/^\+?\d[\d\s-]{8,14}$/.test(draft.phone.trim())) { setError("Enter a patient name and valid phone number."); return; }
    if (draft.date_of_birth && patientAge(draft.date_of_birth) === null) { setError("Enter a valid date of birth, not a future date."); return; }
    setSaving(true); setError("");
    try {
      const current = await loadPatientDirectory();
      const existing = current.find(patient => samePatient(patient, draft));
      if (existing) { setPatients(current); select(existing); return; }
      const { data, error: saveError } = await supabase.from("patients").insert({ name: draft.name.trim(), phone: draft.phone.trim(), date_of_birth: draft.date_of_birth || null, gender: draft.gender || null }).select("id,name,phone,date_of_birth,gender,patient_code,registered_on,created_at").single();
      if (saveError) throw saveError;
      setPatients([...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      select(data);
    } catch { setError("Patient could not be registered. Please retry."); }
    finally { setSaving(false); }
  };
  const age = value ? patientAge(value.date_of_birth) : null;
  return <div className="space-y-3">
    <Label>Patient *</Label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Select patient" className="h-auto min-h-10 w-full justify-between gap-2 text-left"><span className="min-w-0 truncate">{value ? `${value.name} · ${value.patient_code || value.id}` : loading ? "Loading patients…" : "Search patient name, phone or ID"}</span><ChevronsUpDown className="h-4 w-4 shrink-0" /></Button></PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command><CommandInput placeholder="Name, phone or patient ID…" value={query} onValueChange={setQuery} /><CommandList><CommandEmpty>No matching patient.</CommandEmpty><CommandGroup>
          {patients.map(patient => <CommandItem key={patient.id} value={`${patient.id} ${patient.name} ${patient.phone} ${patient.patient_code || ""}`} onSelect={() => select(patient)}><div className="min-w-0 flex-1"><p className="truncate font-medium">{patient.name}</p><p className="text-xs text-muted-foreground">{patient.patient_code} · {patient.phone}{patientAge(patient.date_of_birth) !== null ? ` · Age ${patientAge(patient.date_of_birth)}` : ""}</p></div>{value?.id === patient.id && <Check className="h-4 w-4 shrink-0" />}</CommandItem>)}
        </CommandGroup></CommandList></Command>
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={startNew}><UserPlus className="mr-2 h-4 w-4" />Add new patient{query ? `: ${query}` : ""}</Button>
      </PopoverContent>
    </Popover>
    {!adding && <Button type="button" variant="ghost" size="sm" onClick={startNew}><UserPlus className="mr-1 h-4 w-4" />Add new patient</Button>}
    {value && <dl className="grid grid-cols-2 gap-2 border-l-2 border-primary pl-3 text-sm"><div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{value.phone}</dd></div><div><dt className="text-xs text-muted-foreground">Age</dt><dd>{age === null ? "Not recorded" : `${age} years`}</dd></div><div><dt className="text-xs text-muted-foreground">Registered</dt><dd>{patientRegistrationDate(value)}</dd></div><div><dt className="text-xs text-muted-foreground">Patient ID</dt><dd className="break-all">{value.patient_code || value.id}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Visit history</dt><dd>{value.is_returning ? "Returning patient" : "New patient · no completed visit recorded"}</dd></div></dl>}
    {adding && <div className="space-y-3 border-l-2 border-primary pl-3"><div><Label htmlFor="appt-new-name">New patient name *</Label><Input id="appt-new-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div><div><Label htmlFor="appt-new-phone">Phone *</Label><Input id="appt-new-phone" type="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div><div><Label htmlFor="appt-new-dob">Date of birth</Label><Input id="appt-new-dob" type="date" value={draft.date_of_birth} onChange={e => setDraft({ ...draft, date_of_birth: e.target.value })} /></div><div><Label htmlFor="appt-new-gender">Gender</Label><select id="appt-new-gender" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.gender} onChange={e => setDraft({ ...draft, gender: e.target.value })}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div><Button type="button" onClick={register} disabled={saving || loading}>{saving ? "Registering…" : "Register and select patient"}</Button></div>}
    {error && <div className="text-sm text-destructive" role="alert">{error}{!adding && <Button type="button" variant="link" onClick={load}>Retry</Button>}</div>}
  </div>;
}