import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  created_at: string;
}

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchAppointments = async () => {
    let query = supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    if (data) setAppointments(data);
  };

  useEffect(() => { fetchAppointments(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    toast({ title: `Appointment ${status}` });
    fetchAppointments();
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    if (s === "completed") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const filters = ["all", "pending", "confirmed", "completed", "cancelled"];

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">Appointments</h2>

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
                <p className="font-medium text-sm text-foreground">{a.patient_name}</p>
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
    </div>
  );
};

export default AppointmentsList;
