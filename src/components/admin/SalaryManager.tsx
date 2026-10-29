import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Printer, Settings2, ShieldCheck, Sparkles, Pencil } from "lucide-react";
import { calculateSalary, monthRange, PAY_TYPE_LABEL, summarizeWork, type DoctorWork, type PayType, type SalarySetting } from "@/lib/salary";

type Staff = { id: string; name: string; role: string };
type Slip = {
  id: string; staff_id: string; period_month: string; pay_type: string; fixed_pay: number; collected: number; commission_percent: number;
  commission: number; treatments: number; patients: number; bonus: number; deductions: number; net_pay: number; status: string; paid_on: string | null; notes: string | null;
};

const money = (v: number | string | null | undefined) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const escape = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const SalaryManager = () => {
  const [owner, setOwner] = useState<boolean | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<Record<string, SalarySetting>>({});
  const [slips, setSlips] = useState<Record<string, Slip>>({});
  const [work, setWork] = useState<Map<string, DoctorWork>>(new Map());
  const [configuring, setConfiguring] = useState<Staff | null>(null);
  const [configForm, setConfigForm] = useState<SalarySetting>({ pay_type: "fixed", fixed_monthly: 0, commission_percent: 0 });
  const [adjusting, setAdjusting] = useState<Staff | null>(null);
  const [adjustForm, setAdjustForm] = useState({ bonus: 0, deductions: 0, notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setOwner(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "owner").maybeSingle();
      setOwner(!!data);
    })();
  }, []);

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const [st, se, sl, inv, ap] = await Promise.all([
      supabase.from("staff").select("id,name,role").eq("status", "active").order("name"),
      supabase.from("staff_salary_settings").select("*"),
      supabase.from("salary_slips").select("*").eq("period_month", start),
      supabase.from("invoices").select("doctor_id, amount_paid").gte("invoice_date", start).lt("invoice_date", end).not("doctor_id", "is", null),
      supabase.from("appointments").select("doctor_id, patient_id").eq("status", "completed").gte("appointment_date", start).lt("appointment_date", end).not("doctor_id", "is", null),
    ]);
    const error = st.error ?? se.error ?? sl.error ?? inv.error ?? ap.error;
    if (error) toast.error(error.message);
    setStaff(st.data ?? []);
    setSettings(Object.fromEntries((se.data ?? []).map((r) => [r.staff_id, { pay_type: r.pay_type as PayType, fixed_monthly: Number(r.fixed_monthly), commission_percent: Number(r.commission_percent) }])));
    setSlips(Object.fromEntries((sl.data ?? []).map((r) => [r.staff_id, r as Slip])));
    setWork(summarizeWork(inv.data ?? [], ap.data ?? []));
  }, [month]);
  useEffect(() => { if (owner) void load(); }, [owner, load]);

  const rows = useMemo(() => staff.map((s) => {
    const setting = settings[s.id];
    const slip = slips[s.id];
    const live = setting ? calculateSalary(setting, work.get(s.id), { bonus: slip?.bonus, deductions: slip?.deductions }) : null;
    return { staff: s, setting, slip, figures: slip?.status === "paid" ? slip : live };
  }), [staff, settings, slips, work]);
  const configured = rows.filter((r) => r.setting);
  const unconfigured = rows.filter((r) => !r.setting);
  const payroll = configured.reduce((sum, r) => sum + Number(r.figures?.net_pay ?? 0), 0);

  const saveDraft = async (s: Staff, adjustments?: { bonus: number; deductions: number; notes: string }) => {
    const setting = settings[s.id]; const existing = slips[s.id];
    if (!setting || existing?.status === "paid") return;
    const bonus = adjustments?.bonus ?? existing?.bonus ?? 0;
    const deductions = adjustments?.deductions ?? existing?.deductions ?? 0;
    const calc = calculateSalary(setting, work.get(s.id), { bonus, deductions });
    const { error } = await supabase.from("salary_slips").upsert({
      staff_id: s.id, period_month: monthRange(month).start, pay_type: setting.pay_type, status: "draft",
      fixed_pay: calc.fixed_pay, collected: calc.collected, commission_percent: calc.commission_percent, commission: calc.commission,
      treatments: calc.treatments, patients: calc.patients, bonus: calc.bonus, deductions: calc.deductions, net_pay: calc.net_pay,
      notes: adjustments ? adjustments.notes || null : existing?.notes ?? null,
    }, { onConflict: "staff_id,period_month" });
    if (error) throw error;
  };

  const generateAll = async () => {
    setBusy(true);
    try {
      for (const r of configured) if (r.slip?.status !== "paid") await saveDraft(r.staff);
      toast.success(`Drafts ready for ${monthLabel(month)}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create drafts"); }
    setBusy(false); void load();
  };

  const saveConfig = async () => {
    if (!configuring) return;
    const { error } = await supabase.from("staff_salary_settings").upsert({
      staff_id: configuring.id, pay_type: configForm.pay_type,
      fixed_monthly: Number(configForm.fixed_monthly) || 0, commission_percent: Number(configForm.commission_percent) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success(`Pay set up for ${configuring.name}`);
    setConfiguring(null); void load();
  };

  const saveAdjustments = async () => {
    if (!adjusting) return;
    try { await saveDraft(adjusting, { bonus: Number(adjustForm.bonus) || 0, deductions: Number(adjustForm.deductions) || 0, notes: adjustForm.notes }); }
    catch (e) { return toast.error(e instanceof Error ? e.message : "Could not save"); }
    setAdjusting(null); void load();
  };

  const markPaid = async (s: Staff) => {
    const slip = slips[s.id];
    if (!slip || slip.status !== "draft") return toast.error("Create the draft first");
    if (!confirm(`Mark ${money(slip.net_pay)} as paid to ${s.name}? This also records it under Expenses → Salaries.`)) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data: expense, error } = await supabase.from("expenses").insert({
      expense_date: today, category: "salaries", vendor: s.name, amount: slip.net_pay, description: `Salary for ${monthLabel(month)}`,
    }).select("id").single();
    if (error) return toast.error(error.message);
    const { error: slipError } = await supabase.from("salary_slips").update({ status: "paid", paid_on: today, expense_id: expense.id }).eq("id", slip.id).eq("status", "draft");
    if (slipError) return toast.error(slipError.message);
    toast.success(`${s.name}'s salary marked paid`);
    void load();
  };

  const printSlip = (s: Staff, slip: Slip) => {
    const w = window.open("", "_blank"); if (!w) return;
    const line = (label: string, value: string) => `<tr><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
    w.document.write(`<html><head><title>Payslip ${escape(s.name)} ${escape(monthLabel(month))}</title>
      <style>body{font-family:sans-serif;padding:24px;max-width:640px}table{width:100%;border-collapse:collapse;margin-top:16px}td{border-bottom:1px solid #ddd;padding:8px;font-size:14px}.h{border-bottom:2px solid #0891b2;padding-bottom:8px}.muted{color:#666;font-size:12px}</style></head><body>
      <div class="h"><h1>Tooth Haven Advanced Dental Care</h1><h2>Payslip — ${escape(monthLabel(month))}</h2></div>
      <p><strong>${escape(s.name)}</strong> · ${escape(s.role)}</p>
      <p class="muted">Pay structure: ${escape(PAY_TYPE_LABEL[slip.pay_type as PayType] ?? slip.pay_type)}${slip.status === "paid" ? ` · Paid on ${escape(slip.paid_on)}` : " · Draft"}</p>
      <table>
        ${line("Fixed pay", money(slip.fixed_pay))}
        ${Number(slip.commission_percent) > 0 ? line(`Commission (${slip.commission_percent}% of ${money(slip.collected)} collected)`, money(slip.commission)) : ""}
        ${line("Bonus", money(slip.bonus))}
        ${line("Deductions", `-${money(slip.deductions)}`)}
        ${line("<strong>Net pay</strong>", `<strong>${money(slip.net_pay)}</strong>`)}
      </table>
      <p class="muted">Work this month: ${slip.treatments} completed appointments · ${slip.patients} patients</p>
      ${slip.notes ? `<p class="muted">Notes: ${escape(slip.notes)}</p>` : ""}
      </body></html>`);
    w.document.close(); w.print();
  };

  if (owner === null) return <p className="py-12 text-center text-muted-foreground">Loading…</p>;
  if (!owner) return <div className="py-12 text-center space-y-2"><ShieldCheck className="mx-auto h-8 w-8 text-primary" /><h1 className="text-xl font-semibold">Owner access required</h1><p className="text-sm text-muted-foreground">Only the clinic owner can see and manage staff pay.</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div><h1 className="text-2xl font-bold">Salary & commission</h1><p className="text-sm text-muted-foreground">Review what each staff member earned before you pay them. Commission is worked out from money collected on invoices where they are the treating doctor.</p></div>
        <div className="flex gap-2 items-center">
          <Input type="month" className="w-40" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <Button size="sm" onClick={generateAll} disabled={busy || configured.length === 0}><Sparkles className="w-4 h-4 mr-1" />Generate all drafts</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Estimated payroll</p><p className="text-xl font-bold">{money(payroll)}</p><p className="text-xs text-muted-foreground">{configured.length} staff</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Collected (attributed)</p><p className="text-xl font-bold">{money([...work.values()].reduce((s, w) => s + w.collected, 0))}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Completed appointments</p><p className="text-xl font-bold">{[...work.values()].reduce((s, w) => s + w.treatments, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paid this month</p><p className="text-xl font-bold">{configured.filter((r) => r.slip?.status === "paid").length} / {configured.length}</p></Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Staff</th><th className="p-3">Structure</th><th className="p-3">Fixed</th><th className="p-3">Commission</th><th className="p-3">Work</th><th className="p-3">Net pay</th><th className="p-3">Status</th><th /></tr></thead>
          <tbody>
            {configured.map(({ staff: s, setting, slip, figures }) => (
              <tr key={s.id} className="border-t">
                <td className="p-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground capitalize">{s.role}</p></td>
                <td className="p-3">{PAY_TYPE_LABEL[setting!.pay_type]}</td>
                <td className="p-3">{money(figures?.fixed_pay)}</td>
                <td className="p-3">{Number(figures?.commission_percent) > 0 ? <><p>{money(figures?.commission)}</p><p className="text-xs text-muted-foreground">{figures?.commission_percent}% of {money(figures?.collected)}</p></> : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{figures?.treatments ?? 0} appts · {figures?.patients ?? 0} patients</td>
                <td className="p-3 font-semibold">{money(figures?.net_pay)}{Number(figures?.bonus) || Number(figures?.deductions) ? <p className="text-xs font-normal text-muted-foreground">+{money(figures?.bonus)} / -{money(figures?.deductions)}</p> : null}</td>
                <td className="p-3"><Badge variant={slip?.status === "paid" ? "default" : slip ? "secondary" : "outline"}>{slip?.status === "paid" ? `Paid ${slip.paid_on}` : slip ? "Draft" : "Not generated"}</Badge></td>
                <td className="p-3 flex gap-1 justify-end">
                  {slip?.status !== "paid" && <Button variant="ghost" size="icon" title="Pay structure" onClick={() => { setConfiguring(s); setConfigForm(setting!); }}><Settings2 className="w-4 h-4" /></Button>}
                  {slip?.status !== "paid" && <Button variant="ghost" size="icon" title="Bonus / deductions" onClick={() => { setAdjusting(s); setAdjustForm({ bonus: Number(slip?.bonus ?? 0), deductions: Number(slip?.deductions ?? 0), notes: slip?.notes ?? "" }); }}><Pencil className="w-4 h-4" /></Button>}
                  {slip && <Button variant="ghost" size="icon" title="Print payslip" onClick={() => printSlip(s, slip)}><Printer className="w-4 h-4" /></Button>}
                  {slip?.status === "draft" && <Button variant="ghost" size="icon" title="Mark paid" onClick={() => markPaid(s)}><CheckCircle2 className="w-4 h-4 text-primary" /></Button>}
                </td>
              </tr>
            ))}
            {configured.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No pay set up yet. Configure a staff member below to start.</td></tr>}
          </tbody>
        </table>
      </Card>

      {unconfigured.length > 0 && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-medium">{unconfigured.length} staff member{unconfigured.length > 1 ? "s have" : " has"} no pay set up</p>
          <p className="text-xs text-muted-foreground">They are skipped by payroll until you set how they are paid.</p>
          <div className="flex flex-wrap gap-2">
            {unconfigured.map(({ staff: s }) => (
              <Button key={s.id} variant="outline" size="sm" onClick={() => { setConfiguring(s); setConfigForm({ pay_type: s.role === "dentist" ? "hybrid" : "fixed", fixed_monthly: 0, commission_percent: 0 }); }}>
                <Settings2 className="w-3 h-3 mr-1" />{s.name} <span className="ml-1 text-xs text-muted-foreground capitalize">({s.role})</span>
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!configuring} onOpenChange={(o) => !o && setConfiguring(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>How is {configuring?.name} paid?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pay structure</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={configForm.pay_type} onChange={(e) => setConfigForm({ ...configForm, pay_type: e.target.value as PayType })}>
                {(Object.keys(PAY_TYPE_LABEL) as PayType[]).map((k) => <option key={k} value={k}>{PAY_TYPE_LABEL[k]}</option>)}
              </select>
            </div>
            {configForm.pay_type !== "commission" && <div><Label>Fixed monthly pay (₹)</Label><Input type="number" min={0} value={configForm.fixed_monthly} onChange={(e) => setConfigForm({ ...configForm, fixed_monthly: Number(e.target.value) })} /></div>}
            {configForm.pay_type !== "fixed" && <div><Label>Commission (% of collected)</Label><Input type="number" min={0} max={100} step="0.5" value={configForm.commission_percent} onChange={(e) => setConfigForm({ ...configForm, commission_percent: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">Set this person as "Treating doctor" on invoices so their collections count.</p></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConfiguring(null)}>Cancel</Button><Button onClick={saveConfig}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust {adjusting?.name}'s {monthLabel(month)} pay</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bonus (₹)</Label><Input type="number" min={0} value={adjustForm.bonus} onChange={(e) => setAdjustForm({ ...adjustForm, bonus: Number(e.target.value) })} /></div>
              <div><Label>Deductions (₹)</Label><Input type="number" min={0} value={adjustForm.deductions} onChange={(e) => setAdjustForm({ ...adjustForm, deductions: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={adjustForm.notes} placeholder="e.g. 2 days leave, festival bonus" onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjusting(null)}>Cancel</Button><Button onClick={saveAdjustments}>Save draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryManager;
