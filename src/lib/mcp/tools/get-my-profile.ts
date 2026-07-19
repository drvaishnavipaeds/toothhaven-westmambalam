import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my patient profile",
  description: "Return the patient record for the currently signed-in Tooth Haven user (matched by phone number).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const claims = ctx.getClaims() as { phone?: string; email?: string };
    const phone = claims?.phone;
    const email = claims?.email ?? ctx.getUserEmail();
    const sb = supabaseForUser(ctx);
    let query = sb.from("patients").select("id,name,phone,email,date_of_birth,gender,address").limit(1);
    if (phone) query = query.eq("phone", phone);
    else if (email) query = query.eq("email", email);
    else return { content: [{ type: "text", text: "No phone or email on session" }], isError: true };
    const { data, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No patient record found for this account." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { patient: data },
    };
  },
});
