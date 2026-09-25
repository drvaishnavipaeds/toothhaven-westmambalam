import { useEffect, useState } from "react";
import { CalendarPlus, Phone, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Tab } from "./AdminSidebar";

interface PatientHit { id: string; name: string; phone: string; }

const AdminCommandBar = ({ onNavigate, onOpenPatient, onRegisterPatient, onAddAppointment }: {
  onNavigate: (tab: Tab) => void;
  onOpenPatient: (id: string) => void;
  onRegisterPatient: () => void;
  onAddAppointment: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<PatientHit[]>([]);

  useEffect(() => {
    supabase.from("patients").select("id,name,phone").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setPatients((data ?? []) as PatientHit[]));
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const selectPatient = (id: string) => { setOpen(false); onOpenPatient(id); };
  return <>
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Search patients"><Search className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Search patients</span></Button>
      <Button variant="outline" size="icon" onClick={onRegisterPatient} aria-label="Register patient"><UserPlus className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" onClick={onAddAppointment} aria-label="Add appointment"><CalendarPlus className="h-4 w-4" /></Button>
    </div>
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search patient name or phone…" />
      <CommandList><CommandEmpty>No patient found.</CommandEmpty><CommandGroup heading="Patients">
        {patients.map((patient) => <CommandItem key={patient.id} value={`${patient.name} ${patient.phone}`} onSelect={() => selectPatient(patient.id)}>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{patient.name}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{patient.phone}</span></span>
        </CommandItem>)}
      </CommandGroup></CommandList>
    </CommandDialog>
  </>;
};

export default AdminCommandBar;