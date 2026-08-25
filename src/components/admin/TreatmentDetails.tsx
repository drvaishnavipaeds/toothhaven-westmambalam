import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Printer, Trash2, ChevronDown, ChevronRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Treatment {
  id: string;
  treatment_name: string;
  description: string | null;
  tooth_number: string | null;
  status: string;
  cost: number | null;
  treatment_date: string | null;
  notes: string | null;
}

const STATUSES = ["planned", "in_progress", "completed", "cancelled"];

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const statusClass = (s: string) => {
  if (s === "completed") return "bg-primary/10 text-primary";
  if (s === "in_progress") return "bg-secondary text-secondary-foreground";
  if (s === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

const TreatmentDetails = ({ patientId, patientName }: { patientId: string; patientName: string }) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ treatment_name: "", description: "", tooth_number: "", cost: "", treatment_date: "", notes: "", status: "planned" });

  const fetchAll = async () => {
    const [t, p, rx, inv] = await Promise.all([
      supabase.from("treatments").select("*").eq("patient_id", patientId).order("treatment_date", { ascending: false, nullsFirst: false }),
      supabase.from("treatment_plans").select("id,title,status,discount,created_at").eq("patient_id", patientId).order("created_at", { ascending: false }),
      supabase.from("prescriptions").select("id,prescribed_date,diagnosis,doctor_name").eq("patient_id", patientId).order("prescribed_date", { ascending: false }),
      supabase.from("invoices").select("id,invoice_number,invoice_date,total,amount_paid,status").eq("patient_id", patientId).order("invoice_date", { ascending: false }),
    ]);
    setTreatments((t.data as Treatment[]) || []);
    setPlans(p.data || []);
    setPrescriptions(rx.data || []);
    setInvoices(inv.data || []);
  };

  useEffect(() => { fetchAll(); }, [patientId]);

  const stats = useMemo(() => {
    const by = (s: string) => treatments.filter(t => t.status === s).length;
    return {
      completed: by("completed"),
      inProgress: by("in_progress"),
      planned: by("planned"),
      value: treatments.reduce((sum, t) => sum + Number(t.cost || 0), 0),
    };
  }, [treatments]);

  const filtered = treatments.filter(t => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      t.treatment_name.toLowerCase().includes(q) ||
      (t.tooth_number || "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("treatments").insert({
      patient_id: patientId,
      treatment_name: form.treatment_name,
      description: form.description || null,
      tooth_number: form.tooth_number || null,
      status: form.status,
      cost: form.cost ? Number(form.cost) : null,
      treatment_date: form.treatment_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setShowAdd(false);
    setForm({ treatment_name: "", description: "", tooth_number: "", cost: "", treatment_date: "", notes: "", status: "planned" });
    fetchAll();
  };

  const updateTreatment = async (id: string, patch: Partial<Treatment>) => {
    setTreatments(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("treatments").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeTreatment = async (id: string) => {
    if (!confirm("Delete this treatment?")) return;
    const { error } = await supabase.from("treatments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };

  const printSummary = () => {
    const rows = filtered.map(t => `
      <tr>
        <td>${t.treatment_name}</td>
        <td>${t.tooth_number || "-"}</td>
        <td>${t.status}</td>
        <td>${t.treatment_date || "-"}</td>
        <td style="text-align:right">${t.cost ? money(Number(t.cost)) : "-"}</td>
      </tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Treatment summary - ${patientName}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 4px}p{margin:0 0 16px;color:#475569;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
      th{background:#f1f5f9}</style></head><body>
      <h1>Treatment summary</h1><p>${patientName}</p>
      <table><thead><tr><th>Treatment</th><th>Tooth</th><th>Status</th><th>Date</th><th style="text-align:right">Cost</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" /> Treatment Details
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={printSummary}><Printer className="w-4 h-4 mr-1" /> Print</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Treatment</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { label: "Completed", value: stats.completed },
          { label: "In progress", value: stats.inProgress },
          { label: "Planned", value: stats.planned },
          { label: "Total value", value: money(stats.value) },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search treatment or tooth..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select
          className="border border-input bg-background rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(t => {
          const open = expanded === t.id;
          return (
            <div key={t.id} className="bg-card rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : t.id)}
                className="w-full flex items-center justify-between gap-2 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{t.treatment_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.tooth_number ? `Tooth ${t.tooth_number} • ` : ""}{t.treatment_date || "No date"}{t.cost ? ` • ${money(Number(t.cost))}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                  {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {open && (
                <div className="border-t border-border p-3 space-y-3">
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="text-xs text-muted-foreground">
                      Status
                      <select
                        className="mt-1 w-full border border-input bg-background rounded-md px-3 py-2 text-sm text-foreground"
                        value={t.status}
                        onChange={e => updateTreatment(t.id, { status: e.target.value })}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Cost (₹)
                      <Input
                        type="number"
                        className="mt-1"
                        defaultValue={t.cost ?? ""}
                        onBlur={e => updateTreatment(t.id, { cost: e.target.value ? Number(e.target.value) : null })}
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Date
                      <Input
                        type="date"
                        className="mt-1"
                        defaultValue={t.treatment_date ?? ""}
                        onBlur={e => updateTreatment(t.id, { treatment_date: e.target.value || null })}
                      />
                    </label>
                  </div>
                  <label className="text-xs text-muted-foreground block">
                    Notes
                    <Input
                      className="mt-1"
                      defaultValue={t.notes ?? ""}
                      onBlur={e => updateTreatment(t.id, { notes: e.target.value || null })}
                    />
                  </label>
                  <Button size="sm" variant="destructive" onClick={() => removeTreatment(t.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No treatments match this filter.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Treatment plans</p>
          {plans.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : plans.map(p => (
            <div key={p.id} className="text-xs py-1 border-b border-border last:border-0">
              <span className="text-foreground">{p.title}</span>
              <span className="text-muted-foreground"> • {p.status}</span>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Prescriptions</p>
          {prescriptions.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : prescriptions.map(p => (
            <div key={p.id} className="text-xs py-1 border-b border-border last:border-0">
              <span className="text-foreground">{p.prescribed_date}</span>
              <span className="text-muted-foreground"> • {p.diagnosis || "—"}</span>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Invoices</p>
          {invoices.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : invoices.map(i => (
            <div key={i.id} className="text-xs py-1 border-b border-border last:border-0 flex justify-between gap-2">
              <span className="text-foreground truncate">{i.invoice_number}</span>
              <span className="text-muted-foreground">{money(Number(i.total))} • {i.status}</span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Treatment</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Treatment Name *" required value={form.treatment_name} onChange={e => setForm({ ...form, treatment_name: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tooth Number" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} />
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Cost (₹)" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
              <Input type="date" value={form.treatment_date} onChange={e => setForm({ ...form, treatment_date: e.target.value })} />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add Treatment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentDetails;
