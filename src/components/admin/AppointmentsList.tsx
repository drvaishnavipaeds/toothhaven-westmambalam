import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock, Plus, Globe, MessageCircle, Phone as PhoneIcon, User, RefreshCw, ContactRound } from "lucide-react";
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
  calendar_sync_status?: string;
  calendar_sync_error?: string | null;
  proposed_alternatives?: string[];
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
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ appointment_date: "", appointment_time: "" });
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [viewing, setViewing] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    let query = supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    if (data) setAppointments(data as Appointment[]);
  };

  useEffect(() => { fetchAppointments(); }, [filter]);

  const runWorkflow = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("appointment-workflow", { body });
    if (error || data?.error) {
      toast({ title: "Appointment not changed", description: data?.error ?? error?.message ?? "Please retry.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const updateStatus = async (id: string, status: string) => {
    if (status === "completed") {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) { toast({ title: "Could not update appointment", description: error.message, variant: "destructive" }); return; }
    } else {
      const ok = await runWorkflow({ action: "confirm", appointmentId: id });
      if (!ok) return;
    }
    toast({ title: `Appointment ${status}` });
    fetchAppointments();
  };

  const openCancellation = (appointment: Appointment) => {
    setCancelling(appointment);
    setCancellationReason("");
  };

  const saveCancellation = async () => {
    if (!cancelling || cancellationReason.trim().length < 2) return;
    const ok = await runWorkflow({ action: "cancel", appointmentId: cancelling.id, reason: cancellationReason.trim() });
    if (!ok) return;
    toast({ title: "Appointment cancelled", description: "The patient has been notified with the reason and rescheduling option." });
    setCancelling(null);
    setCancellationReason("");
    fetchAppointments();
  };

  const openReschedule = (appointment: Appointment) => {
    setRescheduling(appointment);
    setRescheduleForm({ appointment_date: appointment.appointment_date, appointment_time: appointment.appointment_time });
  };

  const saveReschedule = async () => {
    if (!rescheduling || !rescheduleForm.appointment_date || !rescheduleForm.appointment_time) return;
    const ok = await runWorkflow({ action: "reschedule", appointmentId: rescheduling.id, date: rescheduleForm.appointment_date, time: rescheduleForm.appointment_time });
    if (!ok) return;
    toast({ title: "Appointment rescheduled" });
    setRescheduling(null);
    fetchAppointments();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: inserted, error } = await supabase.from("appointments").insert({
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      treatment_type: form.treatment_type || null,
      notes: form.notes || null,
      source: form.source,
      status: "pending",
      confirmation_deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      calendar_sync_status: "not_synced",
    }).select("id").single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Send notification for manually added appointments too
      try {
        if (inserted?.id) {
          const confirmed = await runWorkflow({ action: "confirm", appointmentId: inserted.id });
          if (!confirmed) {
            toast({ title: "Appointment saved as pending", description: "Calendar confirmation is still required.", variant: "destructive" });
            setSaving(false);
            fetchAppointments();
            return;
          }
        }
      } catch (notificationError) {
        console.error("Appointment notification failed:", notificationError);
      }
      toast({ title: "Appointment added" });
      setShowAdd(false);
      setForm({ patient_name: "", patient_phone: "", appointment_date: "", appointment_time: "11:00", treatment_type: "", notes: "", source: "manual" });
    }
    setSaving(false);
    fetchAppointments();
  };

  const statusColor = (s: string) => {
    if (["confirmed", "rescheduled"].includes(s)) return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    if (s === "completed") return "bg-blue-100 text-blue-700";
    if (["conflict", "expired"].includes(s)) return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const filters = ["all", "pending", "tentative", "confirmed", "rescheduled", "conflict", "expired", "completed", "cancelled"];

  const services = [
    "General Dentistry", "Dental Implants", "Root Canal", "Orthodontics",
    "Cosmetic Dentistry", "CBCT Imaging", "Pediatric Dentistry", "Oral Surgery",
    "Crowns & Bridges", "Digital Smile Design", "Home Visit"
  ];

  return (
    <div className="mx-auto max-w-5xl">
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
          <div key={a.id} className="bg-card rounded-md border border-border p-3 shadow-sm sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
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
                 {a.calendar_sync_status && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3" /> Calendar: <span className="font-medium capitalize">{a.calendar_sync_status.replace(/_/g, " ")}</span>{a.calendar_sync_error ? ` — ${a.calendar_sync_error}` : ""}</p>}
                {Array.isArray(a.proposed_alternatives) && a.proposed_alternatives.length > 0 && <p className="text-xs text-muted-foreground mt-1">Alternatives: {a.proposed_alternatives.join(", ")}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
            </div>
            {["pending", "tentative", "conflict", "expired"].includes(a.status) && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button size="sm" className="h-10 text-xs sm:h-9" onClick={() => updateStatus(a.id, "confirmed")}>
                  <Check className="w-3 h-3 mr-1" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="h-10 text-xs sm:h-9" onClick={() => openReschedule(a)}>
                  <Clock className="w-3 h-3 mr-1" /> Reschedule
                </Button>
                <Button size="sm" variant="outline" className="h-10 text-xs text-destructive sm:h-9" onClick={() => openCancellation(a)}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" variant="ghost" className="h-10 text-xs sm:h-9" onClick={() => setViewing(a)}><ContactRound /> Patient details</Button>
              </div>
            )}
            {["confirmed", "rescheduled"].includes(a.status) && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button size="sm" variant="outline" className="h-10 text-xs sm:h-9" onClick={() => openReschedule(a)}>
                  <Clock className="w-3 h-3 mr-1" /> Reschedule
                </Button>
                <Button size="sm" variant="outline" className="h-10 text-xs text-destructive sm:h-9" onClick={() => openCancellation(a)}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" variant="outline" className="h-10 text-xs sm:h-9" onClick={() => updateStatus(a.id, "completed")}>
                  <Check className="w-3 h-3 mr-1" /> Mark Complete
                </Button>
                <Button size="sm" variant="ghost" className="h-10 text-xs sm:h-9" onClick={() => setViewing(a)}><ContactRound /> Patient details</Button>
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

      <Dialog open={Boolean(rescheduling)} onOpenChange={(open) => !open && setRescheduling(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-md">
          <DialogHeader><DialogTitle>Reschedule appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="date" value={rescheduleForm.appointment_date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, appointment_date: e.target.value })} />
            <Input type="time" value={rescheduleForm.appointment_time} onChange={(e) => setRescheduleForm({ ...rescheduleForm, appointment_time: e.target.value })} />
            <Button className="w-full" onClick={saveReschedule}>Save and notify patient</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelling)} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-md">
          <DialogHeader><DialogTitle>Cancel appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">The patient will receive this reason and an option to reschedule.</p>
            <label className="block text-sm font-medium text-foreground" htmlFor="cancellation-reason">Cancellation reason</label>
            <textarea id="cancellation-reason" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Enter a clear reason" maxLength={300} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} />
            <Button variant="destructive" className="h-11 w-full" disabled={cancellationReason.trim().length < 2} onClick={saveCancellation}>Cancel and notify patient</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-md">
          <DialogHeader><DialogTitle>Patient details</DialogTitle></DialogHeader>
          {viewing && <div className="space-y-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-semibold text-foreground">{viewing.patient_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Phone</p><a className="font-medium text-primary" href={`tel:${viewing.patient_phone}`}>{viewing.patient_phone}</a></div>
            <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Date</p><p>{viewing.appointment_date}</p></div><div><p className="text-xs text-muted-foreground">Time</p><p>{viewing.appointment_time}</p></div></div>
            <div><p className="text-xs text-muted-foreground">Service</p><p>{viewing.treatment_type || "General consultation"}</p></div>
            {viewing.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p>{viewing.notes}</p></div>}
            <div><p className="text-xs text-muted-foreground">Calendar</p><p className="capitalize">{viewing.calendar_sync_status?.replace(/_/g, " ") || "Not synced"}</p></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsList;
