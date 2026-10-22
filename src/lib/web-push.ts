import { supabase } from "@/integrations/supabase/client";

// Public VAPID key (safe to ship); private half lives only on the server.
export const VAPID_PUBLIC_KEY = "BHuBcW0QFfodame3aG0gdIR6LVdteC3-2X1gNxiqTseZeWwfAmBOrtu4zJSL1wyluY3ZfLasZ7UAmV_E0Ex3gKw";

export function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Subscribes this device for closed-app alerts. Needs the installed/published app (no service worker in preview). */
export async function subscribeAdminPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "This browser does not support app alerts. On iPhone, add the app to your Home Screen first." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Alerts were not allowed." };
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), 5000)),
  ]);
  if (!reg) return { ok: false, reason: "Closed-app alerts work only in the published or installed app." };
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("admin_push_subscriptions" as never).upsert({
    user_id: user?.id, endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, user_agent: navigator.userAgent.slice(0, 200),
  } as never, { onConflict: "endpoint" });
  if (error) return { ok: false, reason: "Could not save this device for alerts." };
  return { ok: true };
}

export async function isAdminPushSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}
