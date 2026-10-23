import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { mayEditTemplate, templateVariables, validateTemplate, type TemplateInput } from "../../../supabase/functions/_shared/template-validation";

interface Component { type: string; text?: string; example?: { body_text?: string[][] }; buttons?: { type: string; text: string; url?: string; phone_number?: string }[] }
interface Template { id: string; name: string; language: string; category: string; status: string; components: Component[] }
const bodyText = (t: Template) => t.components.find(c => c.type === "BODY")?.text ?? "";
const empty: TemplateInput = { name: "", language: "en", category: "UTILITY", body: "", examples: [] };
async function request(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("messaging-templates", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) { const detail = await error.context.json().catch(() => ({})); throw new Error(detail.error ?? error.message); }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export default function MessagingTemplates({ onChanged }: { onChanged: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<Template | null>(null);
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplateInput>(empty);
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try { const data = await request({ action: "list" }); setTemplates(data.templates ?? []); setCanManage(data.canManage === true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load templates"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function openEditor(template?: Template) {
    setEditing(template ?? null);
    setForm(template ? { name: template.name, language: template.language, category: template.category, body: bodyText(template), examples: template.components.find(c => c.type === "BODY")?.example?.body_text?.[0] ?? templateVariables(bodyText(template)).map(() => "") } : empty);
    setEditor(true);
  }
  async function save() {
    const problem = validateTemplate(form);
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      const data = await request({ ...form, action: editing ? "edit" : "create", ...(editing ? { id: editing.id } : {}) });
      toast.success(data.message); setEditor(false); await load(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Template submission failed"); }
    finally { setSaving(false); }
  }
  const filtered = templates.filter(t => `${t.name} ${bodyText(t)}`.toLowerCase().includes(search.toLowerCase()) && (status === "all" || t.status === status));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Messaging templates</h2><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>{canManage && <Button size="sm" onClick={() => openEditor()}><Plus className="h-4 w-4 mr-1" />New template</Button>}</div></div>
    <div className="flex flex-wrap gap-2"><div className="relative flex-1 min-w-40"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search templates" aria-label="Search templates" value={search} onChange={e => setSearch(e.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"].map(s => <SelectItem key={s} value={s}>{s.toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading templates…</p> : !error && filtered.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No matching templates.</p> : <div className="grid gap-3 lg:grid-cols-2">{filtered.map(t => <article key={t.id} className="border border-border bg-card rounded-lg p-4 space-y-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-medium break-all">{t.name}</h3><p className="text-xs text-muted-foreground">{t.language} · {t.category.toLowerCase()}</p></div><Badge variant={t.status === "REJECTED" ? "destructive" : t.status === "APPROVED" ? "secondary" : "outline"}>{t.status.toLowerCase()}</Badge></div><p className="text-sm whitespace-pre-wrap break-words line-clamp-4">{bodyText(t)}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setView(t)}><Eye className="mr-1 h-4 w-4" />View</Button>{canManage && <Button variant="outline" size="sm" disabled={!mayEditTemplate(t)} title={!mayEditTemplate(t) ? "This template is read-only in its current status or format" : "Edit and resubmit for Meta review"} onClick={() => openEditor(t)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>}</div></article>)}</div>}
    <Dialog open={view !== null} onOpenChange={open => !open && setView(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="break-all">{view?.name}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{view?.language} · {view?.category} · {view?.status}</p>{view?.components.map((c, i) => <div key={i} className="space-y-1"><h4 className="text-xs font-semibold text-muted-foreground">{c.type}</h4>{c.text && <p className="text-sm whitespace-pre-wrap break-words">{c.text}</p>}{c.example?.body_text?.[0] && <p className="text-xs text-muted-foreground">Samples: {c.example.body_text[0].join(" · ")}</p>}{c.buttons?.map((b, j) => <p key={j} className="text-sm break-all">{b.text} · {b.type}{b.url ? ` · ${b.url}` : ""}{b.phone_number ? ` · ${b.phone_number}` : ""}</p>)}</div>)}{canManage && view && <Button variant="outline" onClick={() => { const selected = view; setView(null); openEditor(); setForm({ name: `${selected.name}_v2`.slice(0, 512), language: selected.language, category: selected.category === "MARKETING" ? "MARKETING" : "UTILITY", body: bodyText(selected), examples: templateVariables(bodyText(selected)).map(() => "") }); }}>Create new version</Button>}</DialogContent></Dialog>
    <Dialog open={editor} onOpenChange={open => { if (!saving) setEditor(open); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit messaging template" : "New messaging template"}</DialogTitle></DialogHeader>
      <div className="space-y-1"><Label htmlFor="template-name">Template name</Label><Input id="template-name" disabled={!!editing || saving} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="th_checkup_followup" /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Language</Label><Select disabled={!!editing || saving} value={form.language} onValueChange={language => setForm({ ...form, language })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="en_US">English (US)</SelectItem><SelectItem value="en_GB">English (UK)</SelectItem><SelectItem value="ta">Tamil</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Category</Label><Select disabled={!!editing || saving} value={form.category} onValueChange={category => setForm({ ...form, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTILITY">Utility</SelectItem><SelectItem value="MARKETING">Marketing</SelectItem></SelectContent></Select></div></div>
      <div className="space-y-1"><Label htmlFor="template-body">Message</Label><Textarea id="template-body" rows={6} maxLength={1024} disabled={saving} value={form.body} onChange={e => { const body = e.target.value; setForm({ ...form, body, examples: templateVariables(body).map((_, i) => form.examples[i] ?? "") }); }} /><p className="text-xs text-muted-foreground">{form.body.length}/1,024</p></div>
      {templateVariables(form.body).map((n, i) => <div key={n} className="space-y-1"><Label htmlFor={`template-example-${n}`}>{`Sample for {{${n}}}`}</Label><Input id={`template-example-${n}`} maxLength={200} disabled={saving} value={form.examples[i] ?? ""} onChange={e => setForm({ ...form, examples: templateVariables(form.body).map((_, j) => j === i ? e.target.value : form.examples[j] ?? "") })} /></div>)}
      {editing && <p className="text-sm text-muted-foreground">Existing headers and buttons are preserved. Keep the same numbered variables. Editing may pause sending while Meta reviews the change.</p>}
      <p className="text-sm text-muted-foreground">Meta approval is required before this template can be sent.</p>
      <Button disabled={saving} onClick={() => void save()}>{saving ? "Submitting…" : "Submit for Meta review"}</Button>
    </DialogContent></Dialog>
  </section>;
}