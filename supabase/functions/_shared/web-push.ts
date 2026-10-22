// Standard Web Push (VAPID) to every subscribed staff device. Never throws.
import webpush from "npm:web-push@3.6.7";

type Admin = { from: (t: string) => any };

export async function sendAdminPush(admin: Admin, payload: { title: string; body: string; tab?: string; url?: string; tag?: string }) {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY"); const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return { sent: 0, error: "push not configured" };
  try {
    webpush.setVapidDetails("mailto:karthiktoothhaven25@gmail.com", pub, priv);
    const { data: subs } = await admin.from("admin_push_subscriptions").select("id, endpoint, p256dh, auth");
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
        sent++;
        await admin.from("admin_push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("admin_push_subscriptions").delete().eq("id", s.id);
      }
    }));
    return { sent };
  } catch (e) { return { sent: 0, error: (e as Error).message }; }
}
