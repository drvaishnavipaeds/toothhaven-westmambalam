import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Printer, Pencil } from "lucide-react";

type Item = { description: string; quantity: number; unit_price: number; total: number; hsn_sac?: string | null; gst_rate?: number };

const money = (v: any) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;


const InvoicesManager = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => {
    const [{ data: inv }, { data: p }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("invoices").select("*, patients(name, phone)").order("invoice_date", { ascending: false }),
      supabase.from("patients").select("id,name,phone").order("name"),
      supabase.from("treatment_catalog").select("*").eq("is_active", true).order("name"),
      supabase.from("clinic_settings").select("*").limit(1).maybeSingle(),
    ]);
    setRows(inv ?? []); setPatients(p ?? []); setCatalog(c ?? []); setSettings(s ?? {});
  };
  useEffect(() => { load(); }, []);

  const nextInvoiceNumber = async () => {
    const { data } = await supabase.from("clinic_settings").select("*").limit(1).single();
    const prefix = data?.invoice_prefix ?? "TH-";
    const counter = (data?.invoice_counter ?? 1) as number;
    const num = `${prefix}${String(counter).padStart(5, "0")}`;
    await supabase.from("clinic_settings").update({ invoice_counter: counter + 1 }).eq("id", data!.id);
    return num;
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      invoice_date: new Date().toISOString().slice(0, 10), status: "unpaid", discount: 0, amount_paid: 0,
      place_of_supply: settings.state_code ?? "", interstate: false,
    });
    setItems([]);
    setOpen(true);
  };


  const openEdit = async (r: any) => {
    setEditing(r);
    setForm({ ...r, interstate: Number(r.igst ?? 0) > 0 });
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", r.id);
    setItems((data ?? []).map((d: any) => ({
      description: d.description, quantity: Number(d.quantity), unit_price: Number(d.unit_price), total: Number(d.total),
      hsn_sac: d.hsn_sac ?? "", gst_rate: Number(d.gst_rate ?? 0),
    })));
    setOpen(true);
  };

  const addItem = () => setItems((it) => [...it, { description: "", quantity: 1, unit_price: 0, total: 0, hsn_sac: "", gst_rate: Number(settings.default_gst_rate ?? 0) }]);
  const updateItem = (i: number, patch: Partial<Item>) => setItems((it) => it.map((r, idx) => {
    if (idx !== i) return r;
    const merged = { ...r, ...patch };
    merged.total = Number(merged.quantity) * Number(merged.unit_price);
    return merged;
  }));
  const removeItem = (i: number) => setItems((it) => it.filter((_, idx) => idx !== i));

  // GST is computed per line on the discount-adjusted taxable value (proportional discount).
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, r) => s + r.total, 0);
    const discount = Number(form.discount ?? 0);
    const ratio = subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 0;
    const gst = items.reduce((s, r) => s + r.total * ratio * (Number(r.gst_rate ?? 0) / 100), 0);
    const interstate = !!form.interstate;
    const cgst = interstate ? 0 : gst / 2;
    const sgst = interstate ? 0 : gst / 2;
    const igst = interstate ? gst : 0;
    const taxable = Math.max(0, subtotal - discount);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      subtotal: round2(subtotal), taxable: round2(taxable), gst: round2(gst),
      cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst), total: round2(taxable + gst),
    };
  }, [items, form.discount, form.interstate]);

  const save = async () => {
    if (!form.patient_id) return toast.error("Select patient");
    if (items.length === 0) return toast.error("Add at least one item");
    let invoice_number = form.invoice_number;
    if (!editing) invoice_number = await nextInvoiceNumber();
    const payload = {
      invoice_number, patient_id: form.patient_id, invoice_date: form.invoice_date,
      subtotal: totals.subtotal, discount: Number(form.discount ?? 0), tax: totals.gst,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
      place_of_supply: form.place_of_supply || null, patient_gstin: form.patient_gstin || null,
      total: totals.total, amount_paid: Number(form.amount_paid ?? 0),
      status: Number(form.amount_paid ?? 0) >= totals.total ? "paid" : Number(form.amount_paid ?? 0) > 0 ? "partial" : "unpaid",
      notes: form.notes,
    };
    const { data: saved, error } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("invoices").insert(payload).select().single();
    if (error) return toast.error(error.message);
    if (editing) await supabase.from("invoice_items").delete().eq("invoice_id", editing.id);
    await supabase.from("invoice_items").insert(items.map((it) => ({
      invoice_id: saved!.id, description: it.description, quantity: it.quantity,
      unit_price: it.unit_price, total: it.total, hsn_sac: it.hsn_sac || null, gst_rate: Number(it.gst_rate ?? 0),
    })));

    toast.success("Saved");
    setOpen(false); load();
  };

  const remove = async (r: any) => {
    if (!confirm("Delete invoice?")) return;
    await supabase.from("invoices").delete().eq("id", r.id);
    load();
  };

  const printInv = async (r: any) => {
    const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", r.id);
    const rowsHtml = (its ?? []).map((i, idx) =>
      `<tr><td>${idx + 1}</td><td>${i.description}</td><td>${i.quantity}</td><td>${money(i.unit_price)}</td><td>${money(i.total)}</td></tr>`
    ).join("");
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${r.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px}.h{display:flex;justify-content:space-between;border-bottom:2px solid #0891b2;padding-bottom:8px}.tot{text-align:right;margin-top:12px}</style>
      </head><body>
      <div class="h"><div><h1>Tooth Haven Advanced Dental Care</h1><p>West Mambalam, Chennai</p></div><div><h2>INVOICE</h2><p>${r.invoice_number}</p><p>${r.invoice_date}</p></div></div>
      <p><strong>Bill To:</strong> ${r.patients?.name ?? ""} · ${r.patients?.phone ?? ""}</p>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class="tot">
        <p>Subtotal: ${money(r.subtotal)}</p>
        <p>Discount: -${money(r.discount)}</p>
        <p>Tax: ${money(r.tax)}</p>
        <p><strong>Total: ${money(r.total)}</strong></p>
        <p>Paid: ${money(r.amount_paid)}</p>
        <p><strong>Balance: ${money(Number(r.total) - Number(r.amount_paid))}</strong></p>
      </div>
      </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-muted-foreground">Billing with line items and print</p></div>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New Invoice</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">#</th><th className="p-3">Date</th><th className="p-3">Patient</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.invoice_number}</td>
                <td className="p-3">{r.invoice_date}</td>
                <td className="p-3">{r.patients?.name ?? "—"}</td>
                <td className="p-3">{money(r.total)}</td>
                <td className="p-3">{money(r.amount_paid)}</td>
                <td className="p-3"><Badge variant={r.status === "paid" ? "default" : r.status === "partial" ? "secondary" : "destructive"}>{r.status}</Badge></td>
                <td className="p-3 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => printInv(r)}><Printer className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No invoices yet</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Invoice ${editing.invoice_number}` : "New Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patient *</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.patient_id ?? ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">-- Select --</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.invoice_date ?? ""} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Line Items</Label>
                <div className="flex gap-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" onChange={(e) => {
                    const t = catalog.find((x) => x.id === e.target.value); if (!t) return;
                    setItems((it) => [...it, { description: t.name, quantity: 1, unit_price: Number(t.default_price), total: Number(t.default_price) }]);
                    e.target.value = "";
                  }}>
                    <option value="">+ From catalog</option>
                    {catalog.map((t) => <option key={t.id} value={t.id}>{t.name} ({money(t.default_price)})</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Custom</Button>
                </div>
              </div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                    <Input className="col-span-1" type="number" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                    <div className="col-span-2 text-sm text-right pr-2">{money(it.total)}</div>
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Discount ₹</Label><Input type="number" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
              <div><Label>Tax ₹</Label><Input type="number" value={form.tax ?? 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
              <div><Label>Paid ₹</Label><Input type="number" value={form.amount_paid ?? 0} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
            </div>

            <div className="text-right text-sm space-y-1 border-t pt-2">
              <div>Subtotal: <strong>{money(totals.subtotal)}</strong></div>
              <div className="text-lg">Total: <strong className="text-primary">{money(totals.total)}</strong></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesManager;
