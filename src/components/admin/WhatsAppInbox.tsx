import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Bot, RefreshCw, User, Check, CheckCheck, AlertTriangle, FileText } from "lucide-react";

type Msg = {
  id: string;
  phone: string;
  profile_name: string | null;
  direction: "inbound" | "outbound";
  body: string | null;
  ai_replied: boolean;
  handled_by_staff: boolean;
  status: string | null;
  template_name: string | null;
  created_at: string;
};

type Template = { name: string; language: string; category?: string; components?: any[] };

const bodyText = (t?: Template) =>
  (t?.components?.find((c: any) => c.type === "BODY")?.text as string) ?? "";

const variableCount = (t?: Template) => {
  const matches = bodyText(t).match(/\{\{\s*\d+\s*\}\}/g);
  return matches ? new Set(matches).size : 0;
};

const StatusTick = ({ status }: { status: string | null }) => {
  if (status === "read") return <CheckCheck className="w-3 h-3" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 opacity-60" />;
  if (status === "sent") return <Check className="w-3 h-3" />;
  if (status === "failed") return <AlertTriangle className="w-3 h-3 text-destructive" />;
  return null;
};

const WhatsAppInbox = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateKey, setTemplateKey] = useState("");
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [templateMode, setTemplateMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = templates.find((t) => `${t.name}::${t.language}` === templateKey);
  const varCount = variableCount(selectedTemplate);

  const load = async () => {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, phone, profile_name, direction, body, ai_replied, handled_by_staff, status, template_name, created_at")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) toast.error(error.message);
    setMessages((data ?? []) as Msg[]);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase.functions.invoke("whatsapp-send", { body: { action: "templates" } });
    if (error || (data as any)?.error) return;
    setTemplates(((data as any)?.templates ?? []) as Template[]);
  };

  useEffect(() => {
    load();
    loadTemplates();
    const channel = supabase
      .channel("whatsapp-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        setMessages((m) => [...m, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    setTemplateVars((v) => Array.from({ length: varCount }, (_, i) => v[i] ?? ""));
  }, [varCount]);

  const threads = useMemo(() => {
    const map = new Map<string, Msg[]>();
    for (const m of messages) {
      if (!map.has(m.phone)) map.set(m.phone, []);
      map.get(m.phone)!.push(m);
    }
    return [...map.entries()].sort(
      (a, b) => new Date(b[1].at(-1)!.created_at).getTime() - new Date(a[1].at(-1)!.created_at).getTime()
    );
  }, [messages]);

  const activePhone = active ?? threads[0]?.[0] ?? null;
  const thread = threads.find(([p]) => p === activePhone)?.[1] ?? [];

  // WhatsApp only allows free text within 24 hours of the patient's last message.
  const windowOpen = useMemo(() => {
    const last = [...thread].reverse().find((m) => m.direction === "inbound");
    return last ? Date.now() - new Date(last.created_at).getTime() < 24 * 60 * 60 * 1000 : false;
  }, [thread]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length, activePhone]);

  const useTemplate = templateMode || !windowOpen;

  const send = async () => {
    if (!activePhone) return;
    if (useTemplate && !selectedTemplate) return toast.error("Pick an approved template");
    if (!useTemplate && !reply.trim()) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: useTemplate
        ? {
            phone: activePhone,
            templateName: selectedTemplate!.name,
            templateLanguage: selectedTemplate!.language,
            variables: templateVars,
          }
        : { phone: activePhone, message: reply.trim() },
    });
    setSending(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Could not send");
      return;
    }
    setReply("");
    setTemplateVars(Array.from({ length: varCount }, () => ""));
    toast.success("Sent — Haven AI auto-replies are paused for 2 hours on this chat");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Two-way patient chat. Haven AI answers automatically; replying here pauses it for 2 hours.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); loadTemplates(); }}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-2 md:col-span-1 max-h-[70vh] overflow-y-auto">
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!loading && threads.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No WhatsApp conversations yet.</p>
          )}
          {threads.map(([phone, msgs]) => {
            const last = msgs.at(-1)!;
            return (
              <button
                key={phone}
                onClick={() => setActive(phone)}
                className={`w-full text-left p-3 rounded-md hover:bg-muted/60 transition ${phone === activePhone ? "bg-muted" : ""}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium text-sm truncate">{last.profile_name ?? phone}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(last.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{last.body ?? "(media)"}</p>
              </button>
            );
          })}
        </Card>

        <Card className="md:col-span-2 flex flex-col max-h-[70vh]">
          <div className="border-b p-3 flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{activePhone ? `+${activePhone.replace(/\D/g, "")}` : "Select a chat"}</span>
            <div className="flex items-center gap-2">
              {thread.some((m) => m.status === "needs_staff") && <Badge variant="destructive">Needs staff</Badge>}
              {thread.some((m) => m.handled_by_staff) && <Badge variant="secondary">Staff handled</Badge>}
              {activePhone && (
                <Badge variant={windowOpen ? "secondary" : "outline"}>
                  {windowOpen ? "24h window open" : "Template only"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {thread.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "inbound" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                  <p className="whitespace-pre-wrap">{m.body ?? "(media message)"}</p>
                  <div className="flex items-center gap-1 mt-1 opacity-70 text-[10px]">
                    {m.direction === "outbound" && (m.ai_replied ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />)}
                    {m.template_name && <FileText className="w-3 h-3" />}
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {m.direction === "outbound" && <StatusTick status={m.status} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t p-3 space-y-2">
            {!windowOpen && activePhone && (
              <p className="text-xs text-muted-foreground">
                This patient hasn't messaged in 24 hours — WhatsApp only allows an approved template.
              </p>
            )}

            {useTemplate ? (
              <div className="space-y-2">
                <Select value={templateKey} onValueChange={setTemplateKey}>
                  <SelectTrigger><SelectValue placeholder={templates.length ? "Choose a template" : "No approved templates found"} /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={`${t.name}::${t.language}`} value={`${t.name}::${t.language}`}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-2">
                    {bodyText(selectedTemplate)}
                  </p>
                )}
                {Array.from({ length: varCount }).map((_, i) => (
                  <Input
                    key={i}
                    placeholder={`Variable {{${i + 1}}}`}
                    value={templateVars[i] ?? ""}
                    onChange={(e) => setTemplateVars((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                ))}
                <div className="flex gap-2">
                  {windowOpen && (
                    <Button variant="outline" onClick={() => setTemplateMode(false)}>Free text</Button>
                  )}
                  <Button onClick={send} disabled={!activePhone || sending || !selectedTemplate} className="flex-1">
                    <Send className="w-4 h-4 mr-1" />Send template
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Type a reply…"
                  value={reply}
                  disabled={!activePhone}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <Button variant="outline" onClick={() => setTemplateMode(true)} title="Send an approved template">
                  <FileText className="w-4 h-4" />
                </Button>
                <Button onClick={send} disabled={!activePhone || sending || !reply.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppInbox;
