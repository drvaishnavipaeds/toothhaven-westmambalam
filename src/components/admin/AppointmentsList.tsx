import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock, Plus, Globe, MessageCircle, Phone as PhoneIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  treatment_type: string | null;
  status: string;
  notes: string | null;
  source: string;
  created_at: string;
}

const sourceIcon = (source: string) => {
  switch (source) {
    case "whatsapp": return <MessageCircle className="w-3 h-3 text-green-500" />;
    case "manual": return <User className="w-3 h-3 text-blue-500" />;
    case "phone": return <PhoneIcon className="w-3 h-3 text-orange-500" />;
    default: return <Globe className="w-3 h-3 text-primary" />;
  }
};

const sourceLabel = (source: string) => {
  switch (source) {
    case "whatsapp": return "WhatsApp";
    case "manual": return "Manual";
    case "phone": return "Phone";
    default: return "Website";
  }
};

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_name: "", patient_phone: "", appointment_date: "", appointment_time: "11:00", treatment_type: "", notes: "", source: "manual" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    let query = supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    if (data) setAppointments(data as Appointment[]);
  };

  useEffect(() => { fetchAppointments(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    toast({ title: `Appointment ${status}` });
    fetchAppointments();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      treatment_type: form.treatment_type || null,
      notes: form.notes || null,
      source: form.source,
      status: "confirmed",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Send notification for manually added appointments too
      try {
        await supabase.functions.invoke("appointment-notification", {
          body: {
            patientName: form.patient_name,
            patientPhone: form.patient_phone,
            appointmentDate: form.appointment_date,
            service: form.treatment_type,
            source: form.source,
          },
        });
      } catch {}
      toast({ title: "Appointment added" });
      setShowAdd(false);
      setForm({ patient_name: "", patient_phone: "", appointment_date: "", appointment_time: "11:00", treatment_type: "", notes: "", source: "manual" });
    }
    setSaving(false);
    fetchAppointments();
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    if (s === "completed") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const filters = ["all", "pending", "confirmed", "completed", "cancelled"];

  const services = [
    "General Dentistry", "Dental Implants", "Root Canal", "Orthodontics",
    "Cosmetic Dentistry", "CBCT Imaging", "Pediatric Dentistry", "Oral Surgery",
    "Crowns & Bridges", "Digital Smile Design", "Home Visit"
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Appointments</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Appointment</Button>
      </div>

      {/* Phone redirect notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        📌 Appointment queries to <strong>9884166149</strong> are automatically redirected to <strong>8925166149</strong>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {appointments.map(a => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground">{a.patient_name}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {sourceIcon(a.source)} {sourceLabel(a.source)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{a.patient_phone}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" /> {a.appointment_date}
                  <Clock className="w-3 h-3 ml-1" /> {a.appointment_time}
                </div>
                {a.treatment_type && <p className="text-xs text-muted-foreground mt-0.5">{a.treatment_type}</p>}
                {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{a.notes}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
            </div>
            {a.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(a.id, "confirmed")}>
                  <Check className="w-3 h-3 mr-1" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => updateStatus(a.id, "cancelled")}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
            {a.status === "confirmed" && (
              <div className="mt-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(a.id, "completed")}>
                  <Check className="w-3 h-3 mr-1" /> Mark Complete
                </Button>
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No appointments found.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Appointment</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Patient Name *" required value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />
            <Input placeholder="Phone *" required value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} />
            <Input type="date" required value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
            <Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} />
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.treatment_type} onChange={e => setForm({ ...form, treatment_type: e.target.value })}>
              <option value="">Select Service</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
              <option value="manual">Manual Entry</option>
              <option value="phone">Phone Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
            </select>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add Appointment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsList;
