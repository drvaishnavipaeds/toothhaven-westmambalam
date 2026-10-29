import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { addMonths, buildInsights, INSIGHT_LABEL, insightMessage, type InsightAppointment, type InsightKind, type InsightPatient } from "@/lib/patient-insights";

const PAGE = 1000;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const waTarget = (phone: string | null) => { const d = String(phone ?? "").replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d.length >= 11 ? d : null; };

async function loadAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const PatientInsights = () => {
  const [kind, setKind] = useState<InsightKind>("likely_to_miss");
  const [patients, setPatients] = useState<InsightPatient[]>([]);
  const [appointments, setAppointments] = useState<InsightAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = addMonths(today, -36);
      const [p, a] = await Promise.all([
        loadAll<InsightPatient>((f, t) => supabase.from("patients").select("id,name,phone,whatsapp_opt_out,created_at").order("id").range(f, t)),
        loadAll<InsightAppointment>((f, t) => supabase.from("appointments").select("id,patient_id,appointment_date,appointment_time,status,treatment_type").gte("appointment_date", since).not("patient_id", "is", null).order("id").range(f, t)),
      ]);
      setPatients(p); setAppointments(a);
    } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [today]);
  useEffect(() => { void load(); }, [load]);

  const insights = useMemo(() => buildInsights(patients, appointments, today), [patients, appointments, today]);
  const counts: Record<InsightKind, number> = { likely_to_miss: insights.likelyToMiss.length, due_checkup: insights.dueCheckup.length, inactive: insights.inactive.length };

  const Contact = ({ patient, message }: { patient: InsightPatient; message: string }) => {
    const target = waTarget(patient.phone);
    return (
      <div className="flex gap-1 justify-end">
        {patient.phone && <Button asChild variant="ghost" size="icon" title="Call"><a href={`tel:${patient.phone}`}><Phone className="w-4 h-4" /></a></Button>}
        {patient.whatsapp_opt_out ? <Badge variant="outline">WhatsApp opted out</Badge>
          : target && <Button asChild variant="ghost" size="icon" title="Send on WhatsApp"><a href={`https://wa.me/${target}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 text-primary" /></a></Button>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div><h1 className="text-2xl font-bold">Patient insights</h1><p className="text-sm text-muted-foreground">Who to remind, recall or win back, worked out from appointment history.</p></div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}Refresh</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(INSIGHT_LABEL) as InsightKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-lg border p-3 text-left ${kind === k ? "border-primary bg-primary/5" : ""}`}>
            <p className="text-xs text-muted-foreground">{INSIGHT_LABEL[k]}</p><p className="text-2xl font-bold">{loading ? "…" : counts[k]}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {kind === "likely_to_miss" && "Booked in the next 7 days, and in the past year missed, cancelled or rescheduled at least once. Send a confirmation reminder."}
        {kind === "due_checkup" && "Last visit 6–12 months ago and nothing booked."}
        {kind === "inactive" && "No visit in over a year (or registered over a year ago and never seen), and nothing booked."}
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Patient</th>{kind === "likely_to_miss" ? <><th className="p-3">Appointment</th><th className="p-3">History (12 months)</th><th className="p-3">Risk</th></> : <><th className="p-3">Last visit</th><th className="p-3">Months ago</th></>}<th /></tr>
          </thead>
          <tbody>
            {kind === "likely_to_miss" && insights.likelyToMiss.map((r) => (
              <tr key={r.appointment.id} className="border-t">
                <td className="p-3"><p className="font-medium">{r.patient.name}</p><p className="text-xs text-muted-foreground">{r.patient.phone}</p></td>
                <td className="p-3">{r.appointment.appointment_date} · {r.appointment.appointment_time.slice(0, 5)}<p className="text-xs text-muted-foreground">{r.appointment.treatment_type}</p></td>
                <td className="p-3 text-xs">{[r.missed && `${r.missed} missed`, r.cancelled && `${r.cancelled} cancelled`, r.rescheduled && `${r.rescheduled} rescheduled`].filter(Boolean).join(" · ")}</td>
                <td className="p-3"><Badge variant={r.level === "high" ? "destructive" : "secondary"}>{r.level === "high" ? "High" : "Medium"}</Badge></td>
                <td className="p-3"><Contact patient={r.patient} message={insightMessage("likely_to_miss", r.patient.name, { date: r.appointment.appointment_date, time: r.appointment.appointment_time })} /></td>
              </tr>
            ))}
            {kind !== "likely_to_miss" && (kind === "due_checkup" ? insights.dueCheckup : insights.inactive).map((r) => (
              <tr key={r.patient.id} className="border-t">
                <td className="p-3"><p className="font-medium">{r.patient.name}</p><p className="text-xs text-muted-foreground">{r.patient.phone}</p></td>
                <td className="p-3">{r.lastVisit ?? "Never visited"}</td>
                <td className="p-3">{r.months ?? "—"}</td>
                <td className="p-3"><Contact patient={r.patient} message={insightMessage(kind, r.patient.name)} /></td>
              </tr>
            ))}
            {!loading && counts[kind] === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nobody here right now</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default PatientInsights;
