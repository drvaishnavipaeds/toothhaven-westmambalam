import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, IndianRupee, Clock, MessageSquare, Settings, BarChart3, CircleDollarSign, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tab } from "@/components/admin/AdminSidebar";

interface Props { onNavigate: (tab: Tab) => void; }

interface TodayAppointment { id: string; patient_name: string; appointment_time: string; treatment_type: string | null; status: string; }

const DashboardOverview = ({ onNavigate }: Props) => {
  const [stats, setStats] = useState({ newPatients: 0, todayAppts: 0, pendingAppts: 0, todayPayments: 0 });
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const dayStart = `${today}T00:00:00`;
      const [patientsRes, todayRes, pendingRes, paymentsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
        supabase.from("appointments").select("id,patient_name,appointment_time,treatment_type,status").eq("appointment_date", today).order("appointment_time"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("payment_status", "completed").eq("payment_date", today),
      ]);

      setStats({
        newPatients: patientsRes.count || 0,
        todayAppts: todayRes.data?.length || 0,
        pendingAppts: pendingRes.count || 0,
        todayPayments: paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      });
      setTodayAppointments((todayRes.data ?? []) as TodayAppointment[]);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Today’s appointments", value: stats.todayAppts, icon: Calendar, tab: "appointments" as Tab },
    { label: "Pending requests", value: stats.pendingAppts, icon: Clock, tab: "appointments" as Tab },
    { label: "New patients", value: stats.newPatients, icon: Users, tab: "patients" as Tab },
    { label: "Today’s payments", value: `₹${stats.todayPayments.toLocaleString("en-IN")}`, icon: IndianRupee, tab: "financials" as Tab },
  ];

  const shortcuts = [
    { label: "Appointments", icon: Calendar, tab: "appointments" as Tab },
    { label: "Patients", icon: Users, tab: "patients" as Tab },
    { label: "Dental Charts", icon: Activity, tab: "patients" as Tab },
    { label: "Messages", icon: MessageSquare, tab: "whatsapp_inbox" as Tab },
    { label: "Payments", icon: CircleDollarSign, tab: "financials" as Tab },
    { label: "Reports", icon: BarChart3, tab: "reports" as Tab },
    { label: "Settings", icon: Settings, tab: "settings" as Tab },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Clinic overview</p>
        <h1 className="text-2xl font-bold text-foreground">Today at Tooth Haven</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tab }) => (
          <Button key={label} variant="outline" onClick={() => onNavigate(tab)} className="h-auto min-h-24 justify-start whitespace-normal bg-card p-3 text-left shadow-sm sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="break-words text-lg font-bold text-foreground">{value}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Quick access</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {shortcuts.map(({ label, icon: Icon, tab }) => (
            <Button key={label} variant="outline" onClick={() => onNavigate(tab)} className="h-20 flex-col gap-2 whitespace-normal bg-card px-2 text-xs">
              <Icon className="h-5 w-5 text-primary" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Today’s schedule</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("appointments")} className="text-primary">View all <ChevronRight /></Button>
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {todayAppointments.map((appointment) => (
            <Button key={appointment.id} variant="ghost" onClick={() => onNavigate("appointments")} className="h-auto w-full justify-start rounded-none border-b border-border p-3 text-left last:border-b-0">
              <span className="w-16 shrink-0 text-sm font-semibold text-primary">{appointment.appointment_time}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{appointment.patient_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{appointment.treatment_type || "General consultation"}</span>
              </span>
              <span className="ml-2 text-xs capitalize text-muted-foreground">{appointment.status}</span>
            </Button>
          ))}
          {todayAppointments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No appointments scheduled today.</p>}
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
