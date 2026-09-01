// Shared WhatsApp Cloud API helper used by every Tooth Haven edge function.
// One place for phone normalisation, template vs free-text sending, error
// translation and logging into public.whatsapp_messages.

const GRAPH = "https://graph.facebook.com/v21.0";

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WA_WABA_ID = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
const COUNTRY_CODE = Deno.env.get("DEFAULT_COUNTRY_CODE") ?? "91";

export const TEMPLATES = {
  otp: Deno.env.get("WHATSAPP_TEMPLATE_OTP") ?? Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "th_otp",
  appointmentReminder: Deno.env.get("WHATSAPP_TEMPLATE_APPOINTMENT") ?? "th_appointment_reminder",
  paymentReceipt: Deno.env.get("WHATSAPP_TEMPLATE_PAYMENT") ?? "th_payment_receipt",
  recall: Deno.env.get("WHATSAPP_TEMPLATE_RECALL") ?? "th_recall_checkup",
};
export const DEFAULT_LANG = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en";

export const isConfigured = () => Boolean(WA_TOKEN && WA_PHONE_ID);

export type SendResult = {
  ok: boolean;
  id?: string;
  error?: string;
  code?: number;
  configurationRequired?: boolean;
};

export type WaTemplate = {
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: unknown[];
};

export function digitsOnly(phone: unknown): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Last 10 digits — the canonical form stored in `patients.phone`. */
export function last10(phone: unknown): string {
  return digitsOnly(phone).slice(-10);
}

/** Full international number WhatsApp expects (no plus sign). */
export function toE164(phone: unknown): string {
  const d = digitsOnly(phone);
  if (d.length === 10) return `${COUNTRY_CODE}${d}`;
  return d;
}

export function friendlyError(data: any, status: number): { message: string; code?: number } {
  const err = data?.error;
  const code = err?.code as number | undefined;
  if (code === 133010) {
    return {
      code,
      message:
        "The WhatsApp sender number is not registered with Cloud API. Register the number in Meta WhatsApp Manager, then retry.",
    };
  }
  if (code === 132001) {
    return { code, message: "The WhatsApp template does not exist or is not approved in this language." };
  }
  if (code === 131047) {
    return { code, message: "The 24-hour reply window is closed for this patient. Use an approved template instead." };
  }
  return { code, message: err?.message ?? `HTTP ${status}` };
}

async function post(payload: Record<string, unknown>): Promise<SendResult> {
  if (!isConfigured()) return { ok: false, error: "WhatsApp is not configured.", configurationRequired: true };
  try {
    const res = await fetch(`${GRAPH}/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const { message, code } = friendlyError(data, res.status);
      console.error("WhatsApp send failed:", res.status, JSON.stringify(data));
      return { ok: false, error: message, code, configurationRequired: code === 132001 || code === 133010 };
    }
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "WhatsApp send failed";
    console.error("WhatsApp send exception:", message);
    return { ok: false, error: message };
  }
}

export function sendText(to: string, body: string): Promise<SendResult> {
  return post({ messaging_product: "whatsapp", to: toE164(to), type: "text", text: { body } });
}

export function sendTemplate(opts: {
  to: string;
  name: string;
  language?: string;
  bodyParams?: string[];
  /** Copy-code / URL button parameter (authentication templates). */
  buttonParam?: string;
}): Promise<SendResult> {
  const components: Record<string, unknown>[] = [];
  if (opts.bodyParams?.length) {
    components.push({
      type: "body",
      parameters: opts.bodyParams.map((text) => ({ type: "text", text })),
    });
  }
  if (opts.buttonParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: opts.buttonParam }],
    });
  }
  return post({
    messaging_product: "whatsapp",
    to: toE164(opts.to),
    type: "template",
    template: {
      name: opts.name,
      language: { code: opts.language ?? DEFAULT_LANG },
      ...(components.length ? { components } : {}),
    },
  });
}

let templateCache: { expiresAt: number; templates: WaTemplate[] } | null = null;

export async function listApprovedTemplates(force = false): Promise<WaTemplate[]> {
  if (!WA_WABA_ID || !WA_TOKEN) return [];
  if (!force && templateCache && templateCache.expiresAt > Date.now()) return templateCache.templates;
  try {
    const url = new URL(`${GRAPH}/${WA_WABA_ID}/message_templates`);
    url.searchParams.set("fields", "name,status,language,category,components");
    url.searchParams.set("limit", "200");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Unable to list WhatsApp templates:", res.status, JSON.stringify(data));
      return [];
    }
    const templates: WaTemplate[] = Array.isArray(data?.data)
      ? data.data.filter((t: WaTemplate) => t.status === "APPROVED")
      : [];
    templateCache = { expiresAt: Date.now() + 5 * 60 * 1000, templates };
    return templates;
  } catch (e) {
    console.error("Unable to list WhatsApp templates:", e);
    return [];
  }
}

/**
 * Sends an authentication template carrying a one-time code. Falls back to any
 * other approved AUTHENTICATION template if the configured one is unavailable,
 * so a template rename in Meta never locks people out of sign-in.
 */
export async function sendOtpTemplate(phone: string, code: string): Promise<SendResult> {
  if (!isConfigured()) {
    console.log("WhatsApp not configured; OTP suppressed for", last10(phone));
    return { ok: false, error: "WhatsApp is not configured.", configurationRequired: true };
  }

  const approved = await listApprovedTemplates();
  const configured = approved.filter((t) => t.name === TEMPLATES.otp);
  const authFallback = approved.filter((t) => t.category === "AUTHENTICATION");
  const candidates = (configured.length ? configured : authFallback).map((t) => ({
    name: t.name,
    language: t.language,
  }));
  const attempts = candidates.length
    ? candidates
    : [{ name: TEMPLATES.otp, language: DEFAULT_LANG }];

  let last: SendResult = { ok: false, error: "WhatsApp send failed" };
  for (const attempt of attempts) {
    // Authentication templates in Meta carry a copy-code button; if the
    // template has none, the body-only variant is accepted.
    for (const withButton of [true, false]) {
      last = await sendTemplate({
        to: phone,
        name: attempt.name,
        language: attempt.language,
        bodyParams: [code],
        buttonParam: withButton ? code : undefined,
      });
      if (last.ok) return last;
      if (last.code === 132001) break; // wrong template/language — try the next one
    }
  }
  if (last.code === 132001) {
    return {
      ok: false,
      code: 132001,
      configurationRequired: true,
      error:
        "No approved WhatsApp authentication template was found. Please use Email OTP or contact the clinic.",
    };
  }
  return last;
}

/** True when the patient messaged us within the last 24 hours (free-text allowed). */
export async function isWindowOpen(admin: any, phone: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("direction", "inbound")
    .ilike("phone", `%${last10(phone)}`)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

export async function findPatientId(admin: any, phone: string): Promise<string | null> {
  const { data } = await admin
    .from("patients")
    .select("id")
    .ilike("phone", `%${last10(phone)}`)
    .maybeSingle();
  return data?.id ?? null;
}

export async function logMessage(
  admin: any,
  row: {
    wa_message_id?: string | null;
    direction: "inbound" | "outbound";
    phone: string;
    body?: string | null;
    message_type?: string;
    template_name?: string | null;
    campaign_id?: string | null;
    ai_replied?: boolean;
    handled_by_staff?: boolean;
    patient_id?: string | null;
    profile_name?: string | null;
    raw?: unknown;
  },
) {
  const { error } = await admin.from("whatsapp_messages").insert({
    message_type: "text",
    ...row,
    phone: toE164(row.phone),
  });
  if (error) console.error("whatsapp_messages insert failed:", error.message);
}
