import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ToothIllustration from "./ToothIllustration";
import { ADULT_TEETH, PRIMARY_TEETH } from "./ClinicalSelectors";

export interface ChartEntry {
  id: string;
  patient_id: string;
  dentition: string;
  tooth_number: number;
  surfaces: string[];
  condition: string;
  complaint: string | null;
  notes: string | null;
  recorded_on: string;
}

const PERMANENT = {
  upperRight: ADULT_TEETH["Upper right"], upperLeft: ADULT_TEETH["Upper left"],
  lowerRight: ADULT_TEETH["Lower right"], lowerLeft: ADULT_TEETH["Lower left"],
};
const PRIMARY = {
  upperRight: PRIMARY_TEETH["Primary upper right"], upperLeft: PRIMARY_TEETH["Primary upper left"],
  lowerRight: PRIMARY_TEETH["Primary lower right"], lowerLeft: PRIMARY_TEETH["Primary lower left"],
};

export const CONDITIONS: {
  value: string;
  label: string;
  className: string;
  dot: string;
  /** fill / stroke used by the odontogram tooth shapes */
  fill: string;
  stroke: string;
}[] = [
  { value: "healthy", label: "Healthy", className: "bg-background border-border text-foreground", dot: "bg-muted", fill: "hsl(var(--card))", stroke: "hsl(var(--border))" },
  { value: "caries", label: "Caries", className: "bg-destructive/15 border-destructive text-destructive", dot: "bg-destructive", fill: "hsl(var(--destructive) / 0.25)", stroke: "hsl(var(--destructive))" },
  { value: "filled", label: "Filled / Restored", className: "bg-primary/15 border-primary text-primary", dot: "bg-primary", fill: "hsl(var(--primary) / 0.25)", stroke: "hsl(var(--primary))" },
  { value: "rct", label: "Root Canal", className: "bg-accent/30 border-accent-foreground/40 text-accent-foreground", dot: "bg-accent-foreground/60", fill: "hsl(var(--accent))", stroke: "hsl(var(--accent-foreground) / 0.6)" },
  { value: "crown", label: "Crown", className: "bg-secondary border-secondary-foreground/30 text-secondary-foreground", dot: "bg-secondary-foreground/60", fill: "hsl(var(--secondary))", stroke: "hsl(var(--secondary-foreground) / 0.5)" },
  { value: "bridge", label: "Bridge", className: "bg-secondary/70 border-secondary-foreground/30 text-secondary-foreground", dot: "bg-secondary-foreground/40", fill: "hsl(var(--secondary) / 0.7)", stroke: "hsl(var(--secondary-foreground) / 0.4)" },
  { value: "implant", label: "Implant", className: "bg-primary/30 border-primary text-primary", dot: "bg-primary/70", fill: "hsl(var(--primary) / 0.5)", stroke: "hsl(var(--primary))" },
  { value: "missing", label: "Missing / Extracted", className: "bg-muted border-muted-foreground/40 text-muted-foreground line-through", dot: "bg-muted-foreground", fill: "hsl(var(--muted))", stroke: "hsl(var(--muted-foreground) / 0.5)" },
  { value: "planned", label: "Planned Treatment", className: "bg-ring/20 border-ring text-foreground", dot: "bg-ring", fill: "hsl(var(--ring) / 0.25)", stroke: "hsl(var(--ring))" },
];

const SURFACES = [
  { value: "M", label: "Mesial" },
  { value: "O", label: "Occlusal / Incisal" },
  { value: "D", label: "Distal" },
  { value: "B", label: "Buccal / Labial" },
  { value: "L", label: "Lingual / Palatal" },
];

const conditionMeta = (c: string) => CONDITIONS.find((x) => x.value === c) ?? CONDITIONS[0];

const DentalChart = ({ patientId }: { patientId: string }) => {
  const [entries, setEntries] = useState<ChartEntry[]>([]);
  const [dentition, setDentition] = useState<"permanent" | "primary">("permanent");
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ condition: "caries", surfaces: [] as string[], complaint: "", notes: "", recorded_on: "" });

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("dental_chart_entries")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_on", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setEntries((data ?? []) as ChartEntry[]);
  };

  useEffect(() => { fetchEntries(); }, [patientId]);

  // Latest entry per tooth drives the odontogram colour.
  const latestByTooth = useMemo(() => {
    const map = new Map<number, ChartEntry>();
    for (const e of entries) if (!map.has(e.tooth_number)) map.set(e.tooth_number, e);
    return map;
  }, [entries]);

  const arch = dentition === "permanent" ? PERMANENT : PRIMARY;

  const openTooth = (tooth: number) => {
    const existing = latestByTooth.get(tooth);
    setForm({
      condition: existing?.condition ?? "caries",
      surfaces: existing?.surfaces ?? [],
      complaint: existing?.complaint ?? "",
      notes: "",
      recorded_on: new Date().toISOString().slice(0, 10),
    });
    setSelected(tooth);
  };

  const toggleSurface = (s: string) =>
    setForm((f) => ({ ...f, surfaces: f.surfaces.includes(s) ? f.surfaces.filter((x) => x !== s) : [...f.surfaces, s] }));

  const save = async () => {
    if (selected == null) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("dental_chart_entries").insert({
      patient_id: patientId,
      dentition,
      tooth_number: selected,
      surfaces: form.surfaces,
      condition: form.condition,
      complaint: form.complaint || null,
      notes: form.notes || null,
      recorded_on: form.recorded_on || new Date().toISOString().slice(0, 10),
      recorded_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Tooth ${selected} updated`);
    setSelected(null);
    fetchEntries();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dental_chart_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchEntries();
  };

  const Tooth = ({ n, lower }: { n: number; lower?: boolean }) => {
    const entry = latestByTooth.get(n);
    const meta = conditionMeta(entry?.condition ?? "healthy");
    const molar = [6, 7, 8].includes(Number(String(n)[1])) || [4, 5].includes(Number(String(n)[1]));
    return (
      <button
        type="button"
        onClick={() => openTooth(n)}
        title={entry ? `${n} — ${meta.label}${entry.surfaces.length ? ` (${entry.surfaces.join("")})` : ""}` : `Tooth ${n}`}
        className="group shrink-0 flex flex-col items-center gap-0.5 focus:outline-none"
      >
        {lower && (
          <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary">{n}</span>
        )}
        <span className={`transition-transform group-hover:scale-105 ${entry?.condition === "missing" ? "opacity-45" : ""}`}>
          <ToothIllustration tooth={n} fill={meta.fill} stroke={meta.stroke} lower={lower} missing={entry?.condition === "missing"} />
        </span>
        {!lower && (
          <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary">{n}</span>
        )}
        {entry?.surfaces?.length ? (
          <span className="text-[8px] leading-none text-muted-foreground">{entry.surfaces.join("")}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-bold text-foreground">Dental Chart</h3>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          {(["permanent", "primary"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDentition(d)}
              className={`px-3 py-1.5 capitalize ${dentition === d ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              {d === "permanent" ? "Adult (FDI)" : "Pediatric"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 md:p-5 overflow-x-auto">
        <div className="min-w-max">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">
            <span>Upper right</span>
            <span>Upper left</span>
          </div>
          <div className="flex items-end gap-5 justify-center">
            <div className="flex gap-1.5">{arch.upperRight.map((n) => <Tooth key={n} n={n} />)}</div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex gap-1.5">{arch.upperLeft.map((n) => <Tooth key={n} n={n} />)}</div>
          </div>

          <div className="my-3 border-t border-dashed border-border" />

          <div className="flex items-start gap-5 justify-center">
            <div className="flex gap-1.5">{arch.lowerRight.map((n) => <Tooth key={n} n={n} lower />)}</div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex gap-1.5">{arch.lowerLeft.map((n) => <Tooth key={n} n={n} lower />)}</div>
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mt-1 px-1">
            <span>Lower right</span>
            <span>Lower left</span>
          </div>
        </div>
      </div>

      <div className="mt-3 bg-card border border-border rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Findings &amp; treatments key</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CONDITIONS.map((c) => (
            <div key={c.value} className="flex items-center gap-1.5 text-[11px] text-foreground">
              <span
                className="w-3 h-3 rounded-sm border"
                style={{ backgroundColor: c.fill, borderColor: c.stroke }}
              />
              {c.label}
            </div>
          ))}
        </div>
      </div>


      <div className="mt-4">
        <h4 className="font-semibold text-sm text-foreground mb-2">Chart history</h4>
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-card rounded-lg border border-border p-2.5 flex items-start justify-between gap-3">
              <div className="text-xs">
                <p className="font-medium text-foreground">
                  Tooth {e.tooth_number} · {conditionMeta(e.condition).label}
                  {e.surfaces.length ? ` · ${e.surfaces.join("")}` : ""}
                </p>
                {e.complaint && <p className="text-destructive">Complaint: {e.complaint}</p>}
                <p className="text-muted-foreground">{e.recorded_on}{e.notes ? ` — ${e.notes}` : ""}</p>
              </div>
              <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {entries.length === 0 && <p className="text-muted-foreground text-sm py-3">No chart entries yet — tap any tooth to record a finding.</p>}
        </div>
      </div>

      <Dialog open={selected != null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tooth {selected} — record finding</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Condition</p>
              <div className="grid grid-cols-3 gap-1.5">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, condition: c.value })}
                    className={`text-[11px] px-2 py-1.5 rounded-md border ${form.condition === c.value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Surfaces</p>
              <div className="flex flex-wrap gap-1.5">
                {SURFACES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSurface(s.value)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-md border ${form.surfaces.includes(s.value) ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"}`}
                  >
                    {s.value} · {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Input type="date" value={form.recorded_on} onChange={(e) => setForm({ ...form, recorded_on: e.target.value })} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chief complaint (tooth-specific)</p>
              <Input placeholder="e.g. Pain on biting since 3 days" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
            </div>
            <Input placeholder="Clinical notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save finding"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DentalChart;
