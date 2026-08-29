import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, Printer } from "lucide-react";

const money = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

interface PlanItemRow {
  id: string;
  plan_id: string;
  plan_title: string;
  treatment_name: string;
  tooth_number: string | null;
  quantity: number;
  unit_cost: number;
  status: string;
}

const PlanBilling = ({ patientId, patientName }: { patientId: string; patientName: string }) => {
  const [items, setItems] = useState<PlanItemRow[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [settings, setSettings] = useState<any>({});

  const load = async () => {
    const [{ data: plans }, { data: inv }, { data: s }] = await Promise.all([
      supabase.from("treatment_plans").select("id,title,status").eq("patient_id", patientId).in("status", ["accepted", "completed"]),
      supabase.from("invoices").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
      supabase.from("clinic_settings").select("*").limit(1).maybeSingle(),
    ]);
    setSettings(s ?? {});
    setInvoices(inv ?? []);
    const planMap = new Map((plans ?? []).map((p: any) => [p.id, p.title]));
    if (plans?.length) {
      const { data: it } = await supabase
        .from("treatment_plan_items")
        .select("id,plan_id,treatment_name,tooth_number,quantity,unit_cost,status")
        .in("plan_id", plans.map((p: any) => p.id))
        .neq("status", "billed")
        .order("phase")
        .order("sort_order");
      setItems(((it ?? []) as any[]).map((i) => ({ ...i, plan_title: planMap.get(i.plan_id) ?? "Plan" })));
    } else setItems([]);
  };
  useEffect(() => { load(); }, [patientId]);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectedItems = items.filter((i) => selected.has(i.id));

  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
    const discount = Number(form.discount ?? 0);
    const gstRate = Number(settings.default_gst_rate ?? 0);
    const taxable = Math.max(0, subtotal - discount);
    const gst = taxable * (gstRate / 100);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const cgst = form.interstate ? 0 : gst / 2;
    const sgst = form.interstate ? 0 : gst / 2;
    const igst = form.interstate ? gst : 0;
    return { subtotal: round2(subtotal), taxable: round2(taxable), gst: round2(gst), cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst), total: round2(taxable + gst) };
  }, [selectedItems, form.discount, form.interstate, settings.default_gst_rate]);

  const openBill = () => {
    if (selected.size === 0) return toast.error("Select at least one treatment item");
    setForm({
      invoice_date: new Date().toISOString().slice(0, 10),
      discount: 0, amount_paid: 0, interstate: false,
      place_of_supply: settings.state_code ?? "",
    });
    setOpen(true);
  };

  const generate = async () => {
    setSaving(true);
    // Next invoice number
    const { data: s } = await supabase.from("clinic_settings").select("*").limit(1).single();
    const prefix = s?.invoice_prefix ?? "TH-";
    const counter = (s?.invoice_counter ?? 1) as number;
    const invoice_number = `${prefix}${String(counter).padStart(5, "0")}`;

    const payload = {
      invoice_number,
      patient_id: patientId,
      invoice_date: form.invoice_date,
      subtotal: totals.subtotal,
      discount: Number(form.discount ?? 0),
      tax: totals.gst,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
      place_of_supply: form.place_of_supply || null,
      total: totals.total,
      amount_paid: Number(form.amount_paid ?? 0),
      status: Number(form.amount_paid ?? 0) >= totals.total ? "paid" : Number(form.amount_paid ?? 0) > 0 ? "partial" : "unpaid",
      notes: form.notes || null,
    };
    const { data: saved, error } = await supabase.from("invoices").insert(payload).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }

    await supabase.from("clinic_settings").update({ invoice_counter: counter + 1 }).eq("id", s!.id);
    await supabase.from("invoice_items").insert(selectedItems.map((i) => ({
      invoice_id: saved.id,
      description: `${i.treatment_name}${i.tooth_number ? ` (Tooth ${i.tooth_number})` : ""}`,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_cost),
      total: Number(i.unit_cost) * Number(i.quantity),
      gst_rate: Number(settings.default_gst_rate ?? 0),
    })));
    // Mark plan items billed
    await supabase.from("treatment_plan_items").update({ status: "billed" }).in("id", [...selected]);

    setSaving(false);
    toast.success(`Invoice ${invoice_number} generated`);
    setOpen(false);
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-foreground">Bill generation</h3>
        <Button size="sm" onClick={openBill} disabled={selected.size === 0}>
          <Receipt className="w-4 h-4 mr-1" />Generate bill ({selected.size})
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((i) => (
          <label key={i.id} className="bg-card rounded-lg border border-border p-3 flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="accent-primary" />
            <div className="flex-1 text-sm min-w-0">
              <p className="font-medium text-foreground">{i.treatment_name}{i.tooth_number ? ` · Tooth ${i.tooth_number}` : ""}</p>
              <p className="text-xs text-muted-foreground">{i.plan_title} · {i.status}</p>
            </div>
            <span className="text-sm font-semibold text-foreground">{money(Number(i.unit_cost) * Number(i.quantity))}</span>
          </label>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm py-3">No unbilled items on accepted plans.</p>}
      </div>

      <div className="mt-5">
        <h4 className="font-semibold text-sm text-foreground mb-2">Invoices</h4>
        <div className="space-y-2">
          {invoices.map((r) => (
            <div key={r.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground font-mono">{r.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{r.invoice_date} · {r.status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{money(r.total)}</p>
                <p className="text-xs text-muted-foreground">Paid: {money(r.amount_paid)}</p>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="text-muted-foreground text-sm py-2">No invoices yet for {patientName}.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate bill — {patientName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              {selectedItems.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>{i.treatment_name}{i.tooth_number ? ` (T${i.tooth_number})` : ""} × {i.quantity}</span>
                  <span>{money(Number(i.unit_cost) * Number(i.quantity))}</span>
                </div>
              ))}
              <div className="border-t border-border pt-1 flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.invoice_date ?? ""} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
              <div><Label>Discount (₹)</Label><Input type="number" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></div>
              <div><Label>Amount paid (₹)</Label><Input type="number" value={form.amount_paid ?? 0} onChange={(e) => setForm({ ...form, amount_paid: Number(e.target.value) })} /></div>
              <div><Label>Place of supply</Label><Input value={form.place_of_supply ?? ""} onChange={(e) => setForm({ ...form, place_of_supply: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.interstate} onChange={(e) => setForm({ ...form, interstate: e.target.checked })} className="accent-primary" />
              Interstate supply (IGST)
            </label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Taxable</span><span>{money(totals.taxable)}</span></div>
              {form.interstate
                ? <div className="flex justify-between"><span>IGST</span><span>{money(totals.igst)}</span></div>
                : <>
                    <div className="flex justify-between"><span>CGST</span><span>{money(totals.cgst)}</span></div>
                    <div className="flex justify-between"><span>SGST</span><span>{money(totals.sgst)}</span></div>
                  </>}
              <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={saving}>
              <Printer className="w-4 h-4 mr-1" />{saving ? "Generating…" : "Generate invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanBilling;
