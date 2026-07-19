import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getPhone(ctx: ToolContext) {
  const claims = ctx.getClaims() as { phone?: string };
  return claims?.phone ?? null;
}

export default defineTool({
  name: "list_my_appointments",
  title: "List my appointments",
  description: "List the signed-in patient's appointments at Tooth Haven Dental Care, most recent first.",
  inputSchema: {
    status: z
      .enum(["pending", "confirmed", "completed", "cancelled", "all"])
      .optional()
      .describe("Filter by appointment status. Defaults to all."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const phone = await getPhone(ctx);
    if (!phone) return { content: [{ type: "text", text: "Sign in with a phone number to view appointments." }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("appointments")
      .select("id,name,phone,service,preferred_date,preferred_time,status,notes,created_at")
      .eq("phone", phone)
      .order("preferred_date", { ascending: false })
      .limit(limit ?? 10);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
