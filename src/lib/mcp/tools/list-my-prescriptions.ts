import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findPatientId(sb: ReturnType<typeof supabaseForUser>, phone: string) {
  const { data } = await sb.from("patients").select("id").eq("phone", phone).maybeSingle();
  return data?.id ?? null;
}

export default defineTool({
  name: "list_my_prescriptions",
  title: "List my prescriptions",
  description: "List prescriptions issued to the signed-in patient at Tooth Haven Dental Care.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const claims = ctx.getClaims() as { phone?: string };
    if (!claims?.phone) return { content: [{ type: "text", text: "Sign in with a phone number." }], isError: true };
    const sb = supabaseForUser(ctx);
    const patientId = await findPatientId(sb, claims.phone);
    if (!patientId) return { content: [{ type: "text", text: "No patient record on file." }] };
    const { data, error } = await sb
      .from("prescriptions")
      .select("id,rx_date,diagnosis,medications,notes,created_at")
      .eq("patient_id", patientId)
      .order("rx_date", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { prescriptions: data ?? [] },
    };
  },
});
