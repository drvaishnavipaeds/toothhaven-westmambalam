import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Send, FileText } from "lucide-react";

interface Plan {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  discount: number;
  accepted_at: string | null;
  created_at: string;
}

interface PlanItem {
  id: string;
  plan_id: string;
  phase: number;
  treatment_name: string;
  tooth_number: string | null;
  sittings: number;
  quantity: number;
  unit_cost: number;
  status: string;
  notes: string | null;
}

interface CatalogItem { id: string; name: string; default_price: number }

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-primary/15 text-primary",
  accepted: "bg-primary text-primary-foreground",
  declined: "bg-destructive/15 text-destructive",
  completed: "bg-secondary text-secondary-foreground",
};

const money = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const TreatmentPlans = ({ patientId, patientName, patientPhone }: { patientId: string; patientName: string; patientPhone: string }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ title: "", notes: "", discount: "0" });
  const [itemTarget, setItemTarget] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ treatment_name: "", tooth_number: "", phase: "1", sittings: "1", quantity: "1", unit_cost: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("treatment_plans").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
      supabase.from("treatment_catalog").select("id,name,default_price").eq("is_active", true).order("name"),
    ]);
    setPlans((p ?? []) as Plan[]);
    setCatalog((c ?? []) as CatalogItem[]);
    const ids = (p ?? []).map((x: any) => x.id);
    if (ids.length) {
      const { data: it } = await supabase.from("treatment_plan_items").select("*").in("plan_id", ids).order("phase").order("sort_order");
      setItems((it ?? []) as PlanItem[]);
    } else setItems([]);
  };

  useEffect(() => { fetchAll(); }, [patientId]);

  const itemsFor = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    for (const i of items) map.set(i.plan_id, [...(map.get(i.plan_id) ?? []), i]);
    return map;
  }, [items]);

  const planTotal = (plan: Plan) => {
    const sub = (itemsFor.get(plan.id) ?? []).reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
    return Math.max(0, sub - Number(plan.discount || 0));
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("treatment_plans").insert({
      patient_id: patientId,
      title: planForm.title,
      notes: planForm.notes || null,
      discount: Number(planForm.discount) || 0,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setShowPlan(false);
    setPlanForm({ title: "", notes: "", discount: "0" });
    fetchAll();
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTarget) return;
    setSaving(true);
    const { error } = await supabase.from("treatment_plan_items").insert({
      plan_id: itemTarget,
      treatment_name: itemForm.treatment_name,
      tooth_number: itemForm.tooth_number || null,
      phase: Number(itemForm.phase) || 1,
      sittings: Number(itemForm.sittings) || 1,
      quantity: Number(itemForm.quantity) || 1,
      unit_cost: Number(itemForm.unit_cost) || 0,
      sort_order: (itemsFor.get(itemTarget) ?? []).length,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setItemTarget(null);
    setItemForm({ treatment_name: "", tooth_number: "", phase: "1", sittings: "1", quantity: "1", unit_cost: "" });
    fetchAll();
  };

  const setStatus = async (plan: Plan, status: string) => {
    const { error } = await supabase
      .from("treatment_plans")
      .update({ status, accepted_at: status === "accepted" ? new Date().toISOString() : null })
      .eq("id", plan.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Plan marked ${status}`);
    fetchAll();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("treatment_plan_items").delete().eq("id", id);
    fetchAll();
  };

  const deletePlan = async (id: string) => {
    await supabase.from("treatment_plans").delete().eq("id", id);
    fetchAll();
  };

  const quoteText = (plan: Plan) => {
    const rows = (itemsFor.get(plan.id) ?? [])
      .map((i) => `• Phase ${i.phase} — ${i.treatment_name}${i.tooth_number ? ` (#${i.tooth_number})` : ""} × ${i.quantity} = ${money(Number(i.unit_cost) * Number(i.quantity))}`)
      .join("\n");
    return `Tooth Haven Advanced Dental Care\nTreatment plan for ${patientName}\n\n${plan.title}\n\n${rows}\n\n${Number(plan.discount) > 0 ? `Discount: -${money(Number(plan.discount))}\n` : ""}Total: ${money(planTotal(plan))}`;
  };

  const shareOnWhatsApp = (plan: Plan) => {
    const phone = patientPhone.replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(quoteText(plan))}`, "_blank", "noopener,noreferrer");
  };

  const printQuote = (plan: Plan) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font-family:system-ui;padding:24px;white-space:pre-wrap">${quoteText(plan)}</pre>`);
    w.document.close();
    w.print();
  };

  const convertToTreatments = async (plan: Plan) => {
    const rows = (itemsFor.get(plan.id) ?? []).map((i) => ({
      patient_id: patientId,
      treatment_name: i.treatment_name,
      tooth_number: i.tooth_number,
      cost: Number(i.unit_cost) * Number(i.quantity),
      status: "planned",
      notes: `From plan: ${plan.title} (phase ${i.phase})`,
    }));
    if (!rows.length) { toast.error("Plan has no items"); return; }
    const { error } = await supabase.from("treatments").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} treatments added to the patient record`);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground">Treatment Plans</h3>
        <Button size="sm" onClick={() => setShowPlan(true)}><Plus className="w-4 h-4 mr-1" /> New Plan</Button>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const planItems = itemsFor.get(plan.id) ?? [];
          const phases = [...new Set(planItems.map((i) => i.phase))].sort((a, b) => a - b);
          return (
            <div key={plan.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">{planItems.length} procedures · {money(planTotal(plan))}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[plan.status] ?? STATUS_STYLES.draft}`}>{plan.status}</span>
              </div>

              {phases.map((ph) => (
                <div key={ph} className="mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">Phase {ph}</p>
                  <div className="space-y-1">
                    {planItems.filter((i) => i.phase === ph).map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-xs bg-muted/40 rounded-md px-2 py-1.5">
                        <span className="text-foreground">
                          {i.treatment_name}{i.tooth_number ? ` · #${i.tooth_number}` : ""}
                          <span className="text-muted-foreground"> · {i.sittings} sitting{i.sittings > 1 ? "s" : ""}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{money(Number(i.unit_cost) * Number(i.quantity))}</span>
                          <button onClick={() => deleteItem(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {planItems.length === 0 && <p className="text-xs text-muted-foreground mb-2">No procedures yet.</p>}

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => { setItemTarget(plan.id); }}><Plus className="w-3 h-3 mr-1" /> Procedure</Button>
                <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(plan)}><Send className="w-3 h-3 mr-1" /> WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={() => printQuote(plan)}><FileText className="w-3 h-3 mr-1" /> Print quote</Button>
                {plan.status !== "accepted" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(plan, plan.status === "draft" ? "proposed" : "accepted")}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {plan.status === "draft" ? "Mark proposed" : "Mark accepted"}
                  </Button>
                )}
                {plan.status === "accepted" && (
                  <Button size="sm" variant="outline" onClick={() => convertToTreatments(plan)}>Add to treatments</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => deletePlan(plan.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
        {plans.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No treatment plans yet.</p>}
      </div>

      <Dialog open={showPlan} onOpenChange={setShowPlan}>
        <DialogContent>
          <DialogHeader><DialogTitle>New treatment plan</DialogTitle></DialogHeader>
          <form onSubmit={createPlan} className="space-y-3">
            <Input placeholder="Plan title * (e.g. Full mouth rehabilitation)" required value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} />
            <Input placeholder="Notes" value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} />
            <Input placeholder="Discount (₹)" type="number" value={planForm.discount} onChange={(e) => setPlanForm({ ...planForm, discount: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Create plan"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={itemTarget != null} onOpenChange={(o) => !o && setItemTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add procedure</DialogTitle></DialogHeader>
          <form onSubmit={addItem} className="space-y-3">
            <select
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              value=""
              onChange={(e) => {
                const c = catalog.find((x) => x.id === e.target.value);
                if (c) setItemForm({ ...itemForm, treatment_name: c.name, unit_cost: String(c.default_price ?? "") });
              }}
            >
              <option value="">Pick from treatment catalog…</option>
              {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} — {money(c.default_price)}</option>)}
            </select>
            <Input placeholder="Procedure name *" required value={itemForm.treatment_name} onChange={(e) => setItemForm({ ...itemForm, treatment_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tooth (FDI)" value={itemForm.tooth_number} onChange={(e) => setItemForm({ ...itemForm, tooth_number: e.target.value })} />
              <Input placeholder="Phase" type="number" min={1} value={itemForm.phase} onChange={(e) => setItemForm({ ...itemForm, phase: e.target.value })} />
              <Input placeholder="Sittings" type="number" min={1} value={itemForm.sittings} onChange={(e) => setItemForm({ ...itemForm, sittings: e.target.value })} />
              <Input placeholder="Quantity" type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
            </div>
            <Input placeholder="Unit cost (₹) *" type="number" required value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Add procedure"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentPlans;
