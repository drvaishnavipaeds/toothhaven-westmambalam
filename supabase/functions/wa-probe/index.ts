const T = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const P = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const W = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID")!;
const S = Deno.env.get("META_APP_SECRET")!;
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(S), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const proof = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(T)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const g = async (path: string, init: RequestInit = {}) => {
  path += (path.includes("?") ? "&" : "?") + "appsecret_proof=" + proof;
  const r = await fetch(`https://graph.facebook.com/v21.0/${path}`, { ...init, headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
Deno.serve(async () => {
  const out: any = {};
  out.phoneIdTail = P.slice(-4); out.wabaTail = W.slice(-4);
  out.phone = await g(`${P}?fields=display_phone_number,verified_name,status,name_status,quality_rating,account_mode`);
  out.wabaPhones = await g(`${W}/phone_numbers?fields=id,display_phone_number`);
  out.waba = await g(`${W}?fields=name,account_review_status,business_verification_status`);
  out.helloWorld = await g(`${P}/messages`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", to: "919585996484", type: "template", template: { name: "hello_world", language: { code: "en_US" } } }) });
  out.welcome = await g(`${P}/messages`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", to: "919585996484", type: "template", template: { name: "th_patient_welcome_v1", language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: "Vaishnavi" }] }] } }) });
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
