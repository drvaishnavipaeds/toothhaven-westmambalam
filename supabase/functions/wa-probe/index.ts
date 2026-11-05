import { listApprovedTemplates, sendTemplate } from "../_shared/whatsapp.ts";

Deno.serve(async () => {
  const all = await listApprovedTemplates(true, true);
  const t = all.filter((x: any) => x.name === "th_patient_welcome_v1");
  const results: any[] = [];
  for (const lang of [...new Set(t.map((x: any) => x.language))]) {
    results.push({ lang, r: await sendTemplate({ to: "919585996484", name: "th_patient_welcome_v1", language: lang as string, bodyParams: ["Vaishnavi"] } as any) });
  }
  return new Response(JSON.stringify({ templates: t, results }, null, 2), { headers: { "Content-Type": "application/json" } });
});
