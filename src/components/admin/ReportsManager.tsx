import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { IndianRupee, TrendingUp, TrendingDown, Users, Calendar, Package } from "lucide-react";

const money = (v: number) => `₹${Number(v).toLocaleString("en-IN")}`;

const ReportsManager = () => {
  const [stats, setStats] = useState({
    revenue: 0, expenses: 0, patients: 0, appointments: 0, invoicesUnpaid: 0, lowStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [pay, exp, pat, appt, inv, inventory] = await Promise.all([
        supabase.from("payments").select("amount").gte("payment_date", monthStart.toISOString().slice(0, 10)),
        supabase.from("expenses").select("amount").gte("expense_date", monthStart.toISOString().slice(0, 10)),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", monthStart.toISOString().slice(0, 10)),
        supabase.from("invoices").select("total, amount_paid").neq("status", "paid"),
        supabase.from("inventory").select("quantity, reorder_level"),
      ]);
      setStats({
        revenue: (pay.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0),
        expenses: (exp.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0),
        patients: pat.count ?? 0,
        appointments: appt.count ?? 0,
        invoicesUnpaid: (inv.data ?? []).reduce((s: number, r: any) => s + (Number(r.total) - Number(r.amount_paid)), 0),
        lowStock: (inventory.data ?? []).filter((r: any) => Number(r.quantity) <= Number(r.reorder_level ?? 0)).length,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Revenue (MTD)", value: money(stats.revenue), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Expenses (MTD)", value: money(stats.expenses), icon: TrendingDown, color: "text-rose-600" },
    { label: "Net (MTD)", value: money(stats.revenue - stats.expenses), icon: IndianRupee, color: "text-primary" },
    { label: "Total Patients", value: String(stats.patients), icon: Users, color: "text-blue-600" },
    { label: "Appointments (MTD)", value: String(stats.appointments), icon: Calendar, color: "text-indigo-600" },
    { label: "Outstanding Invoices", value: money(stats.invoicesUnpaid), icon: IndianRupee, color: "text-amber-600" },
    { label: "Low-stock Items", value: String(stats.lowStock), icon: Package, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-muted-foreground">Month-to-date snapshot</p></div>
      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-4">
                <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{c.label}</span><Icon className={`w-4 h-4 ${c.color}`} /></div>
                <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsManager;
