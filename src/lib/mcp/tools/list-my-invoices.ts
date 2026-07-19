import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_invoices",
  title: "List my invoices",
  description: "List invoices billed to the signed-in patient at Tooth Haven Dental Care.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    status: z.enum(["draft", "sent", "paid", "cancelled", "all"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const claims = ctx.getClaims() as { phone?: string };
    if (!claims?.phone) return { content: [{ type: "text", text: "Sign in with a phone number." }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data: patient } = await sb.from("patients").select("id").eq("phone", claims.phone).maybeSingle();
    if (!patient) return { content: [{ type: "text", text: "No patient record on file." }] };
    let q = sb
      .from("invoices")
      .select("id,invoice_number,invoice_date,total,tax,discount,status,notes")
      .eq("patient_id", patient.id)
      .order("invoice_date", { ascending: false })
      .limit(limit ?? 10);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { invoices: data ?? [] },
    };
  },
});
