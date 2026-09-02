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
import { Megaphone, RefreshCw, Send, Users } from "lucide-react";

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

  return (
    <div className="space-y-4">
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
                Create and get templates approved in WhatsApp Manager, then hit Refresh.
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
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CampaignsManager;
