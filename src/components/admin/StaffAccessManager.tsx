import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Activity, RefreshCw, ShieldCheck, UserRound, Search } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Tables } from "@/integrations/supabase/types";

type Staff = Tables<"staff">;
type Event = Tables<"audit_logs">;
type Branch = { id: string; name: string };
const roles = ["owner", "dentist", "receptionist", "assistant"];
const roleNames: Record<string, [string, string]> = { owner: ["Owner", "உரிமையாளர்"], dentist: ["Dentist", "பல் மருத்துவர்"], receptionist: ["Receptionist", "வரவேற்பாளர்"], assistant: ["Assistant", "உதவியாளர்"] };
const statuses: Record<string, [string, string]> = { active: ["Active", "செயலில்"], on_leave: ["On leave", "விடுப்பில்"], inactive: ["Inactive", "செயலற்றது"] };
const blank = { name: "", email: "", phone: "", role: "receptionist", status: "active", branch_id: "none", reason: "" };

async function request(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("staff-management", { body });
  if (error) {
    const details = await error.context?.json?.().catch(() => null);
    throw new Error(details?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function StaffAccessManager() {
  const { lang } = useLanguage();
  const text = (en: string, ta: string) => lang === "ta" ? ta : en;
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assigned, setAssigned] = useState<{ user_id: string; role: string }[]>([]);
  const [owner, setOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Staff | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [activityStaff, setActivityStaff] = useState<Staff | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [changes, setChanges] = useState<Event[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setFailure("");
    try {
      const access = await request({ action: "access" });
      setOwner(access.owner);
      if (access.owner) {
        const result = await request({ action: "list" });
        setStaff(result.staff ?? []); setBranches(result.branches ?? []); setAssigned(result.roles ?? []);
      }
    } catch (error) { setFailure(error instanceof Error ? error.message : "Unable to load staff"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const edit = (member: Staff | null) => {
    setEditing(member);
    const currentRole = assigned.find(item => item.user_id === member?.user_id)?.role;
    setForm(member ? { name: member.name, email: member.email ?? "", phone: member.phone ?? "", role: currentRole ?? (roles.includes(member.role) ? member.role : "receptionist"), status: member.status, branch_id: member.branch_id ?? "none", reason: "" } : blank);
    setOpen(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      const result = await request({ action: "save", ...form, id: editing?.id ?? null, branch_id: form.branch_id === "none" ? null : form.branch_id });
      toast.success(result.message); setOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save staff"); }
    finally { setSaving(false); }
  };
  const showActivity = async (member: Staff) => {
    setActivityStaff(member); setEvents([]); setChanges([]); setActivitySearch(""); setActivityError(""); setActivityLoading(true);
    try {
      const result = await request({ action: "activity", staff_id: member.id });
      setEvents(result.events ?? []); setChanges(result.changes ?? []);
    } catch (error) { setActivityError(error instanceof Error ? error.message : "Unable to load activity"); }
    finally { setActivityLoading(false); }
  };
  const eventList = (items: Event[]) => {
    const filtered = items.filter(event => [event.action, event.entity, event.entity_id].join(" ").toLowerCase().includes(activitySearch.toLowerCase()));
    return <div className="divide-y divide-border">
      {filtered.map(event => {
        const details = event.details && typeof event.details === "object" && !Array.isArray(event.details) ? event.details : null;
        return <div key={event.id} className="py-4 space-y-1">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-medium capitalize">{event.action.replaceAll("_", " ")} · {event.entity.replaceAll("_", " ")}</span><time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")}</time></div>
          <p className="text-xs text-muted-foreground break-all">{event.actor_email ?? event.actor_id ?? "—"}</p>
          {typeof details?.reason === "string" && <p className="text-sm">{details.reason}</p>}
          {Array.isArray(details?.changed_fields) && <p className="text-xs text-muted-foreground">{details.changed_fields.join(", ")}</p>}
          <p className="font-mono text-xs text-muted-foreground break-all">{event.entity_id}</p>
        </div>;
      })}
      {!filtered.length && <p className="py-8 text-center text-muted-foreground">{text("No recorded activity", "பதிவு செய்யப்பட்ட செயல்பாடு இல்லை")}</p>}
    </div>;
  };

  if (loading) return <p role="status" className="p-6 text-muted-foreground">{text("Loading staff…", "பணியாளர்கள் ஏற்றப்படுகிறது…")}</p>;
  if (failure) return <div role="alert" className="space-y-3"><p>{failure}</p><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{text("Retry", "மீண்டும் முயற்சி")}</Button></div>;
  if (!owner) return <div className="py-12 text-center space-y-3"><ShieldCheck className="mx-auto h-8 w-8 text-primary" /><h1 className="text-xl font-semibold">{text("Owner access required", "உரிமையாளர் அணுகல் தேவை")}</h1></div>;

  const filtered = staff.filter(member => [member.name, member.email, member.phone, member.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-medium text-primary">{text("TEAM & ACCESS", "குழு & அணுகல்")}</p><h1 className="text-2xl font-bold">{text("Staff", "பணியாளர்கள்")}</h1></div>
      <div className="flex gap-2"><Button variant="outline" size="icon" onClick={load} aria-label="Refresh staff" title="Refresh staff"><RefreshCw className="h-4 w-4" /></Button><Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" />{text("Add staff", "பணியாளர் சேர்")}</Button></div>
    </header>
    <div className="flex flex-wrap gap-6 border-y border-border py-4">
      <div><p className="text-2xl font-semibold">{staff.length}</p><p className="text-xs text-muted-foreground">{text("Team members", "குழு உறுப்பினர்கள்")}</p></div>
      <div><p className="text-2xl font-semibold">{staff.filter(member => member.status === "active").length}</p><p className="text-xs text-muted-foreground">{text("Active", "செயலில்")}</p></div>
      <div><p className="text-2xl font-semibold">{staff.filter(member => member.user_id).length}</p><p className="text-xs text-muted-foreground">{text("Linked logins", "இணைக்கப்பட்ட உள்நுழைவுகள்")}</p></div>
    </div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search staff" placeholder={text("Search name, email or phone", "பெயர், மின்னஞ்சல் அல்லது தொலைபேசி")} value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="grid gap-3 lg:grid-cols-2">
      {filtered.map(member => {
        const role = assigned.find(item => item.user_id === member.user_id)?.role ?? member.role;
        return <article key={member.id} className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="font-semibold break-words">{member.name}</h2><p className="text-xs text-muted-foreground break-all">{member.email ?? member.phone ?? "—"}</p></div><Badge variant={member.status === "active" ? "secondary" : "outline"}>{statuses[member.status]?.[lang === "ta" ? 1 : 0] ?? member.status}</Badge></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="font-medium">{roleNames[role]?.[lang === "ta" ? 1 : 0] ?? role}</span><span className="text-muted-foreground">{branches.find(branch => branch.id === member.branch_id)?.name ?? text("No branch assigned", "கிளை ஒதுக்கப்படவில்லை")}</span></div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="text-xs text-muted-foreground">{member.user_id ? text("Login linked", "உள்நுழைவு இணைக்கப்பட்டது") : text("Login not linked", "உள்நுழைவு இணைக்கப்படவில்லை")}</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => showActivity(member)}><Activity className="mr-1.5 h-4 w-4" />{text("Activity", "செயல்பாடு")}</Button><Button variant="outline" size="sm" onClick={() => edit(member)}><Pencil className="mr-1.5 h-4 w-4" />{text("Edit access", "அணுகலை மாற்று")}</Button></div></div>
        </article>;
      })}
      {!filtered.length && <p className="py-8 text-muted-foreground">{text("No staff found", "பணியாளர்கள் இல்லை")}</p>}
    </div>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? text("Edit staff access", "பணியாளர் அணுகலை மாற்று") : text("Add staff", "பணியாளர் சேர்")}</DialogTitle></DialogHeader>
      <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="grid gap-4 sm:grid-cols-2">{([['name', 'Name', 'பெயர்'], ['email', 'Login email', 'உள்நுழைவு மின்னஞ்சல்'], ['phone', 'Phone', 'தொலைபேசி']] as const).map(([key, en, ta]) => <div key={key} className={key === "email" ? "space-y-2 sm:col-span-2" : "space-y-2"}><Label htmlFor={`staff-${key}`}>{text(en, ta)}</Label><Input id={`staff-${key}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} required={key !== "phone"} disabled={key === "email" && !!editing?.user_id} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></div>)}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="staff-role">{text("Role", "பதவி")}</Label><Select value={form.role} onValueChange={role => setForm({ ...form, role })}><SelectTrigger id="staff-role"><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{roleNames[role][lang === "ta" ? 1 : 0]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="staff-status">{text("Status", "நிலை")}</Label><Select value={form.status} onValueChange={status => setForm({ ...form, status })}><SelectTrigger id="staff-status"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statuses).map(([key, names]) => <SelectItem key={key} value={key}>{names[lang === "ta" ? 1 : 0]}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="space-y-2"><Label htmlFor="staff-branch">{text("Assigned branch", "ஒதுக்கப்பட்ட கிளை")}</Label><Select value={form.branch_id} onValueChange={branch_id => setForm({ ...form, branch_id })}><SelectTrigger id="staff-branch"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{text("No branch assigned", "கிளை ஒதுக்கப்படவில்லை")}</SelectItem>{branches.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent></Select></div>
        <section className="space-y-3 border-y border-border py-4"><h3 className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" />{text("Role access", "பதவி அணுகல்")}</h3><div className="space-y-2 text-sm text-muted-foreground"><p>{text("Active staff can access shared clinic operations. Receptionists cannot access protected clinical records.", "செயலில் உள்ள பணியாளர்கள் பொதுவான மருத்துவமனை செயல்பாடுகளை அணுகலாம். வரவேற்பாளர்கள் பாதுகாக்கப்பட்ட மருத்துவ பதிவுகளை அணுக முடியாது.")}</p><p>{text("Only owners can assign staff roles. Inactive or on-leave linked accounts lose staff access.", "உரிமையாளர்கள் மட்டுமே பதவிகளை ஒதுக்கலாம். செயலற்ற அல்லது விடுப்பில் உள்ள இணைக்கப்பட்ட கணக்குகள் அணுகலை இழக்கும்.")}</p><p>{text("Branch is a staff assignment, not a restriction on record access.", "கிளை என்பது பணியாளர் ஒதுக்கீடு; பதிவுகளுக்கான அணுகல் கட்டுப்பாடு அல்ல.")}</p></div></section>
        <div className="space-y-2"><Label htmlFor="staff-reason">{text("Reason for change", "மாற்றத்திற்கான காரணம்")}</Label><Textarea id="staff-reason" required minLength={3} maxLength={500} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>{text("Cancel", "ரத்து")}</Button><Button type="submit" disabled={saving}>{saving ? text("Saving…", "சேமிக்கிறது…") : text("Save staff", "பணியாளரை சேமி")}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!activityStaff} onOpenChange={value => { if (!value) setActivityStaff(null); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{activityStaff?.name} · {text("Activity", "செயல்பாடு")}</DialogTitle></DialogHeader>
      {activityLoading ? <p role="status">{text("Loading activity…", "செயல்பாடு ஏற்றப்படுகிறது…")}</p> : activityError ? <p role="alert">{activityError}</p> : <><Input aria-label="Search activity" placeholder={text("Filter activity", "செயல்பாடுகளை வடிகட்டு")} value={activitySearch} onChange={event => setActivitySearch(event.target.value)} /><Tabs defaultValue="records"><TabsList><TabsTrigger value="records">{text("Record activity", "பதிவு செயல்பாடு")}</TabsTrigger><TabsTrigger value="access">{text("Access changes", "அணுகல் மாற்றங்கள்")}</TabsTrigger></TabsList><TabsContent value="records">{eventList(events)}</TabsContent><TabsContent value="access">{eventList(changes)}</TabsContent></Tabs></>}
    </DialogContent></Dialog>
  </div>;
}