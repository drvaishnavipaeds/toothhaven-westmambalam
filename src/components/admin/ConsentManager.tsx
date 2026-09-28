import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ShieldCheck, ShieldOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "./SignaturePad";

const SCOPES = [
  { value: "internal_records", label: "Internal records use" },
  { value: "public_marketing", label: "Public marketing (anonymized)" },
  { value: "full_face_publish", label: "Full-face publish (most sensitive)" },
];

interface Patient { id: string; name: string; phone: string; }
interface Consent {
  id: string;
  patient_id: string;
  scope: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
  signature_url: string | null;
  signature_path: string | null;
  signed_by_name: string | null;
  consent_text: string | null;
  notes: string | null;
}

const ConsentManager = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", scope: "internal_records", notes: "", signed_by_name: "", consent_text: "" });
  const [signature, setSignature] = useState<Blob | null>(null);
  const [signedLinks, setSignedLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchAll = async () => {
    const [p, c] = await Promise.all([
      supabase.from("patients").select("id,name,phone").order("name"),
      supabase.from("patient_consents").select("*").order("created_at", { ascending: false }),
    ]);
    if (p.data) setPatients(p.data);
    if (c.data) setConsents(c.data);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    void Promise.all(consents.filter(c => c.signature_path).map(async c => {
      const { data } = await supabase.storage.from("patient-media").createSignedUrl(c.signature_path as string, 3600);
      return [c.id, data?.signedUrl] as const;
    })).then(links => setSignedLinks(Object.fromEntries(links.filter(([, url]) => url))));
  }, [consents]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (!signature || !form.signed_by_name.trim() || !form.consent_text.trim()) { toast({ title: "Signature, signer and consent text are required", variant: "destructive" }); setSaving(false); return; }
    const path = `consents/${form.patient_id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from("patient-media").upload(path, signature, { contentType: "image/png", upsert: false });
    if (uploadError) { toast({ title: uploadError.message, variant: "destructive" }); setSaving(false); return; }
    const { error } = await supabase.from("patient_consents").insert({
      patient_id: form.patient_id,
      scope: form.scope,
      granted: true,
      signature_path: path,
      signed_by_name: form.signed_by_name.trim(),
      consent_text: form.consent_text.trim(),
      notes: form.notes || null,
    });
    if (error) { await supabase.storage.from("patient-media").remove([path]); toast({ title: error.message, variant: "destructive" }); setSaving(false); return; }
    setSaving(false);
    setShowForm(false);
    setForm({ patient_id: "", scope: "internal_records", notes: "", signed_by_name: "", consent_text: "" });
    setSignature(null);
    fetchAll();
    toast({ title: "Consent recorded" });
  };

  const revoke = async (c: Consent) => {
    if (!confirm("Revoke this consent? Any published media using it should be hidden.")) return;
    await supabase.from("patient_consents").update({ granted: false, revoked_at: new Date().toISOString() }).eq("id", c.id);
    fetchAll();
    toast({ title: "Consent revoked" });
  };

  const remove = async (id: string) => {
    if (!confirm("Permanently delete this consent record?")) return;
    await supabase.from("patient_consents").delete().eq("id", id);
    fetchAll();
  };

  const patientName = (id: string) => patients.find(p => p.id === id)?.name || "Unknown";
  const filtered = consents.filter(c => {
    if (!search) return true;
    const name = patientName(c.patient_id).toLowerCase();
    return name.includes(search.toLowerCase()) || c.scope.includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Patient Consents</h2>
          <p className="text-xs text-muted-foreground">Signed consent records</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Record Consent
        </Button>
      </div>

      <Input placeholder="Search by patient name or scope..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />

      <div className="space-y-2">
        {filtered.map(c => {
          const scope = SCOPES.find(s => s.value === c.scope);
          return (
            <div key={c.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {c.granted ? (
                    <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
                  ) : (
                    <ShieldOff className="w-8 h-8 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground">{patientName(c.patient_id)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{scope?.label || c.scope}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.granted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {c.granted ? "Active" : "Revoked"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Granted: {new Date(c.granted_at).toLocaleDateString()}
                      {c.revoked_at && ` · Revoked: ${new Date(c.revoked_at).toLocaleDateString()}`}
                    </p>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                    {c.signed_by_name && <p className="text-xs text-muted-foreground">Signed by {c.signed_by_name}</p>}
                    {c.consent_text && <p className="text-xs text-muted-foreground mt-1">{c.consent_text}</p>}
                    {(signedLinks[c.id] || c.signature_url) && <a href={signedLinks[c.id] || c.signature_url || ""} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View signature</a>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.granted && <Button size="sm" variant="ghost" onClick={() => revoke(c)} className="text-destructive">Revoke</Button>}
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)} title="Delete consent"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No consent records yet.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Patient Consent</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Patient *</label>
              <select required className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Consent scope *</label>
              <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
                {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <Input required placeholder="Signer’s full name" value={form.signed_by_name} onChange={e => setForm({ ...form, signed_by_name: e.target.value })} />
            <Textarea required placeholder="Consent statement shown to the patient" value={form.consent_text} onChange={e => setForm({ ...form, consent_text: e.target.value })} />
            <SignaturePad onChange={setSignature} />
            <Textarea placeholder="Notes (witness, conditions, etc.)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Record Consent"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentManager;
