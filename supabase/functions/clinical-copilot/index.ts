import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@5";
import { z } from "npm:zod@3";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const MODEL = "google/gemini-2.5-flash";

const SYSTEM = `You are the clinical documentation copilot for Tooth Haven Advanced Dental Care, West Mambalam, Chennai.
You assist a licensed dentist (Dr. Karthik Srinivasan, BDS). You never make autonomous clinical decisions:
everything you produce is a DRAFT SUGGESTION that the dentist must review, edit and approve.

Rules:
- Follow standard Indian dental practice and commonly available Indian brand/generic drug names.
- Prefer conservative, evidence-based dosing for adults unless a paediatric age is given.
- Never suggest controlled/narcotic drugs.
- Always include patient-friendly aftercare instructions in BOTH English and Tamil.
- Tamil must be natural, spoken-style Tamil script (not transliteration), simple enough for a patient to follow.
- Keep every field short and practical. No disclaimers inside the fields.`;

const drugSchema = z.object({
  name: z.string().describe("Drug name with strength, e.g. Amoxicillin 500mg"),
  dose: z.string().describe("Dose per intake, e.g. 1 tablet"),
  frequency: z.string().describe("e.g. TDS (three times a day) after food"),
  duration: z.string().describe("e.g. 5 days"),
  notes: z.string().describe("Short caution or instruction, empty string if none"),
});

const schemas = {
  prescription: z.object({
    diagnosis: z.string(),
    drugs: z.array(drugSchema),
    instructions_en: z.string().describe("Aftercare instructions in English, 3-5 short lines"),
    instructions_ta: z.string().describe("Same aftercare instructions in Tamil script"),
    red_flags: z.string().describe("When the patient must call the clinic urgently, one or two lines"),
  }),
  soap_note: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  treatment_plan: z.object({
    summary: z.string(),
    phases: z.array(z.object({
      phase: z.number(),
      title: z.string(),
      procedures: z.string(),
      sittings: z.number(),
    })),
    patient_explainer_en: z.string(),
    patient_explainer_ta: z.string(),
  }),
} as const;

type Task = keyof typeof schemas;

const bodySchema = z.object({
  task: z.enum(["prescription", "soap_note", "treatment_plan"]),
  patient_id: z.string().uuid().optional(),
  chief_complaint: z.string().max(4000).optional(),
  diagnosis: z.string().max(2000).optional(),
  findings: z.string().max(4000).optional(),
  age: z.number().int().min(0).max(120).optional(),
  allergies: z.string().max(1000).optional(),
  medical_history: z.string().max(4000).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- auth: staff only ---
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    const email = userRes?.user?.email?.toLowerCase();
    if (!email) return json({ error: "Not authenticated" }, 401);
    const { data: staffRow } = await admin
      .from("admin_phones").select("id").ilike("email", email).maybeSingle();
    if (!staffRow) return json({ error: "Not authorized" }, 403);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;
    const task = input.task as Task;

    const context = [
      input.age ? `Patient age: ${input.age}` : null,
      input.allergies ? `Known allergies: ${input.allergies}` : null,
      input.medical_history ? `Medical history: ${input.medical_history}` : null,
      input.chief_complaint ? `Chief complaint: ${input.chief_complaint}` : null,
      input.findings ? `Clinical findings: ${input.findings}` : null,
      input.diagnosis ? `Working diagnosis: ${input.diagnosis}` : null,
    ].filter(Boolean).join("\n");

    const asks: Record<Task, string> = {
      prescription: "Draft a dental prescription with aftercare instructions in English and Tamil.",
      soap_note: "Write a concise SOAP clinical note for this dental visit.",
      treatment_plan: "Draft a phased dental treatment plan with a bilingual patient explainer.",
    };

    const shapes: Record<Task, string> = {
      prescription: `{"diagnosis":string,"drugs":[{"name":string,"dose":string,"frequency":string,"duration":string,"notes":string}],"instructions_en":string,"instructions_ta":string,"red_flags":string}`,
      soap_note: `{"subjective":string,"objective":string,"assessment":string,"plan":string}`,
      treatment_plan: `{"summary":string,"phases":[{"phase":number,"title":string,"procedures":string,"sittings":number}],"patient_explainer_en":string,"patient_explainer_ta":string}`,
    };

    const gateway = createLovableAiGatewayProvider(apiKey);

    let output: unknown;
    try {
      const result = await generateText({
        model: gateway(MODEL),
        system: SYSTEM,
        prompt: `${asks[task]}\n\n${context || "No details supplied — produce a generic safe draft."}\n\n` +
          `Respond with ONLY raw JSON (no markdown fence, no commentary) matching exactly this shape, using these exact keys:\n${shapes[task]}\n` +
          `Multi-line text fields use "\\n" between lines. Never omit a key; use an empty string when not applicable.`,
      });
      const raw = result.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsedOut = schemas[task].safeParse(JSON.parse(raw));
      if (!parsedOut.success) {
        console.error("copilot schema mismatch:", parsedOut.error.message, raw.slice(0, 500));
        return json({ error: "The AI draft came back malformed. Please try again." }, 502);
      }
      output = parsedOut.data;
    } catch (err) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) return json({ error: "AI is busy right now. Try again in a moment." }, 429);
      if (status === 402) return json({ error: "AI credits are exhausted. Add credits to continue." }, 402);
      if (status === 403) return json({ error: "AI access is blocked for this workspace." }, 403);
      console.error("copilot generation failed:", err);
      return json({ error: "Could not generate a draft. Please try again." }, 500);
    }


    await admin.from("clinical_ai_logs").insert({
      patient_id: input.patient_id ?? null,
      actor_email: email,
      task,
      input: input as unknown as Record<string, unknown>,
      output: output as Record<string, unknown>,
    });

    return json({ task, output });
  } catch (e) {
    console.error("clinical-copilot error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
