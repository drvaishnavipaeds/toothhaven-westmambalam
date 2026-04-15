import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  payment_date: string;
  transaction_id: string | null;
  notes: string | null;
  patient_id: string | null;
  patients?: { name: string; phone: string } | null;
}

const FinancialDashboard = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: "", payment_method: "cash", notes: "", payment_date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    const { data } = await supabase.from("payments").select("*, patients(name, phone)").order("payment_date", { ascending: false }).limit(100);
    if (data) setPayments(data as any);
  };

  useEffect(() => { fetchPayments(); }, []);

  const totalRevenue = payments.filter(p => p.payment_status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const todayRevenue = payments.filter(p => p.payment_status === "completed" && p.payment_date === new Date().toISOString().split("T")[0]).reduce((s, p) => s + Number(p.amount), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("payments").insert({
      amount: Number(form.amount),
      payment_method: form.payment_method,
      notes: form.notes || null,
      payment_date: form.payment_date,
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ amount: "", payment_method: "cash", notes: "", payment_date: new Date().toISOString().split("T")[0] });
    fetchPayments();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Financials</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Record Payment</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Today's Revenue</p>
          <p className="text-xl font-bold text-foreground flex items-center"><IndianRupee className="w-4 h-4" />{todayRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-foreground flex items-center"><IndianRupee className="w-4 h-4" />{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="space-y-2">
        {payments.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">₹{Number(p.amount).toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">{p.payment_method} • {p.payment_date}</p>
              {p.patients && <p className="text-xs text-muted-foreground">{p.patients.name}</p>}
              {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.payment_status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {p.payment_status}
            </span>
          </div>
        ))}
        {payments.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No payments recorded.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Amount (₹) *" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="netbanking">Net Banking</option>
            </select>
            <Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Record Payment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialDashboard;
