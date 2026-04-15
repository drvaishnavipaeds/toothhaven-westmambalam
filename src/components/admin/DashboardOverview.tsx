import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, IndianRupee, Clock } from "lucide-react";

const DashboardOverview = () => {
  const [stats, setStats] = useState({ patients: 0, todayAppts: 0, pendingAppts: 0, totalRevenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [patientsRes, todayRes, pendingRes, paymentsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("payment_status", "completed"),
      ]);

      setStats({
        patients: patientsRes.count || 0,
        todayAppts: todayRes.count || 0,
        pendingAppts: pendingRes.count || 0,
        totalRevenue: paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Patients", value: stats.patients, icon: Users, color: "text-blue-500" },
    { label: "Today's Appointments", value: stats.todayAppts, icon: Calendar, color: "text-green-500" },
    { label: "Pending Appointments", value: stats.pendingAppts, icon: Clock, color: "text-yellow-500" },
    { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-500" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
