import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Pencil, RefreshCw, Send, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MessagingTemplates from "./MessagingTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Campaign = {
  id: string;
  name: string;
  audience: string;
  template_name: string;
  template_language: string;
  variables: unknown;
  scheduled_at: string | null;
  status: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

type Template = { name: string; language: string; category?: string; components?: any[] };

const AUDIENCES = [
  { value: "all", label: "All patients (not opted out)" },
  { value: "inactive_6m", label: "Not seen in 6 months" },
  { value: "plan_accepted", label: "Accepted treatment plan" },
  { value: "manual", label: "Manual phone list" },
];

const statusTone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "default",
  completed: "secondary",
};

/** Number of {{n}} placeholders in a template's BODY component. */
function bodyVariableCount(template?: Template): number {
  const body = template?.components?.find((c: any) => c.type === "BODY");
  const text: string = body?.text ?? "";
  const matches = text.match(/\{\{\s*\d+\s*\}\}/g);
  return matches ? new Set(matches).size : 0;
}

function bodyText(template?: Template): string {
  const body = template?.components?.find((c: any) => c.type === "BODY");
  return body?.text ?? "";
}

const CampaignsManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [audience, setAudience] = useState("all");
  const [manualPhones, setManualPhones] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState("");
  const [editWhen, setEditWhen] = useState("");
  const [editVars, setEditVars] = useState<string[]>([]);

  const marketingTemplates = useMemo(
    () => templates.filter((t) => t.category !== "AUTHENTICATION"),
    [templates],
  );
  const selected = marketingTemplates.find((t) => `${t.name}::${t.language}` === templateKey);
  const varCount = bodyVariableCount(selected);

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  };

  const loadTemplates = async (refresh = false) => {
    const { data, error } = await supabase.functions.invoke("campaign-send", {
      body: { action: "templates", refresh },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Could not load templates");
      return;
    }
    setTemplates(((data as any)?.templates ?? []) as Template[]);
  };

  useEffect(() => {
    loadCampaigns();
    loadTemplates();
    const timer = setInterval(loadCampaigns, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setVariables((v) => Array.from({ length: varCount }, (_, i) => v[i] ?? ""));
  }, [varCount]);

  const previewAudience = async () => {
    const { data, error } = await supabase.functions.invoke("campaign-send", {
      body: {
        action: "audience_count",
        audience,
        manualPhones: audience === "manual" ? parseManual() : undefined,
      },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Could not count recipients");
      return;
    }
    setAudienceCount((data as any).count as number);
  };

  const parseManual = () =>
    manualPhones.split(/[\s,;]+/).map((p) => p.trim()).filter((p) => p.replace(/\D/g, "").length >= 10);

  const launch = async () => {
    if (!name.trim()) return toast.error("Give the campaign a name");
    if (!selected) return toast.error("Pick an approved template");
    if (variables.some((v) => !v.trim())) return toast.error("Fill every template variable");

    setBusy(true);
    const { data: created, error } = await supabase
      .from("campaigns")
      .insert({
        name: name.trim(),
        audience,
        template_name: selected.name,
        template_language: selected.language,
        variables,
        preview_text: bodyText(selected),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      })
      .select("id")
      .maybeSingle();

    if (error || !created) {
      setBusy(false);
      toast.error(error?.message ?? "Could not create campaign");
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke("campaign-send", {
      body: {
        action: "launch",
        campaignId: created.id,
        manualPhones: audience === "manual" ? parseManual() : undefined,
      },
    });
    setBusy(false);

    if (fnError || (data as any)?.error) {
      toast.error((data as any)?.error ?? fnError?.message ?? "Could not launch campaign");
      await supabase.from("campaigns").delete().eq("id", created.id);
      return;
    }

    toast.success(`Campaign queued for ${(data as any).queued} patients`);
    setName("");
    setVariables(Array.from({ length: varCount }, () => ""));
    setScheduledAt("");
    setAudienceCount(null);
    loadCampaigns();
  };

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setEditName(c.name);
    setEditWhen(c.scheduled_at ? toLocalInput(c.scheduled_at) : "");
    setEditVars(Array.isArray(c.variables) ? (c.variables as unknown[]).map(String) : []);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editName.trim()) return toast.error("Give the campaign a name");
    const when = new Date(editWhen);
    if (!editWhen || isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return toast.error("Pick a future date and time");
    }
    if (editVars.some((v) => !v.trim())) return toast.error("Fill every template variable");
    setBusy(true);
    const { data, error } = await supabase
      .from("campaigns")
      .update({ name: editName.trim(), scheduled_at: when.toISOString(), variables: editVars })
      .eq("id", editing.id)
      .eq("status", "scheduled")
      .select("id");
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("This campaign has already started sending and can't be changed");
    toast.success("Campaign updated");
    setEditing(null);
    loadCampaigns();
  };

  const deleteCampaign = async (c: Campaign) => {
    if (!window.confirm(`Delete scheduled campaign "${c.name}"? No messages will be sent.`)) return;
    const { data, error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", c.id)
      .eq("status", "scheduled")
      .select("id");
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("This campaign has already started sending and can't be deleted");
    toast.success("Campaign deleted");
    loadCampaigns();
  };

  return (
    <Tabs defaultValue="campaigns" className="space-y-4">
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit scheduled campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-when">Send at</Label>
              <Input id="edit-when" type="datetime-local" value={editWhen} onChange={(e) => setEditWhen(e.target.value)} />
            </div>
            {editVars.map((v, i) => (
              <div key={i}>
                <Label>Variable {`{{${i + 1}}}`}</Label>
                <Input value={v} onChange={(e) => setEditVars((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Template and audience can't be changed — delete and create a new campaign for that.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TabsList><TabsTrigger value="campaigns">Campaigns</TabsTrigger><TabsTrigger value="templates">Messaging templates</TabsTrigger></TabsList>
      <TabsContent value="templates"><MessagingTemplates onChanged={() => void loadTemplates(true)} /></TabsContent>
      <TabsContent value="campaigns" className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Send approved WhatsApp templates to patient groups. Anyone who replies STOP is excluded automatically.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadCampaigns(); loadTemplates(true); }}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 font-medium"><Megaphone className="w-4 h-4" />New campaign</div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Six-month check-up recall" />
          </div>

          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => { setAudience(v); setAudienceCount(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {audience === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="manual-phones">Phone numbers</Label>
              <Textarea
                id="manual-phones"
                rows={3}
                value={manualPhones}
                onChange={(e) => setManualPhones(e.target.value)}
                placeholder="9884166149, 8925166149"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={previewAudience}>
              <Users className="w-4 h-4 mr-1" />Count recipients
            </Button>
            {audienceCount !== null && (
              <span className="text-sm text-muted-foreground">{audienceCount} patients will receive this</span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Approved template</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger><SelectValue placeholder={marketingTemplates.length ? "Select a template" : "No approved templates found"} /></SelectTrigger>
              <SelectContent>
                {marketingTemplates.map((t) => (
                  <SelectItem key={`${t.name}::${t.language}`} value={`${t.name}::${t.language}`}>
                    {t.name} ({t.language}){t.category ? ` · ${t.category.toLowerCase()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!marketingTemplates.length && (
              <p className="text-xs text-muted-foreground">
                No approved templates are available.
              </p>
            )}
          </div>

          {selected && (
            <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{bodyText(selected)}</div>
          )}

          {Array.from({ length: varCount }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Label htmlFor={`var-${i}`}>{`Variable {{${i + 1}}}`}</Label>
              <Input
                id={`var-${i}`}
                value={variables[i] ?? ""}
                onChange={(e) => setVariables((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={i === 0 ? "{{name}} inserts the patient's name" : ""}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="schedule">Schedule (optional)</Label>
            <Input id="schedule" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>

          <Button onClick={launch} disabled={busy} className="w-full">
            <Send className="w-4 h-4 mr-2" />{scheduledAt ? "Schedule campaign" : "Send now"}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="font-medium mb-3">Recent campaigns</div>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && campaigns.length === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          )}
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <Badge variant={statusTone[c.status] ?? "outline"}>{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.template_name} ({c.template_language}) · {AUDIENCES.find((a) => a.value === c.audience)?.label ?? c.audience}
                </p>
                <p className="text-xs mt-1">
                  Sent {c.sent_count}/{c.total_count}
                  {c.failed_count > 0 && <span className="text-destructive"> · {c.failed_count} failed</span>}
                  {c.scheduled_at && ` · scheduled ${new Date(c.scheduled_at).toLocaleString("en-IN")}`}
                </p>
                {c.status === "scheduled" && c.scheduled_at && new Date(c.scheduled_at).getTime() > Date.now() && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteCampaign(c)}>
                      <Trash2 className="w-3 h-3 mr-1" />Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      </TabsContent>
    </Tabs>
  );
};

export default CampaignsManager;
