import { advanceBooking, isBookingIntent, type BookingState } from "./chat-booking-flow.ts";

export async function handleChatBooking(admin: any, phone: string, text: string) {
  const { data, error } = await admin.from("whatsapp_booking_sessions").select("state,expires_at").eq("phone", phone).maybeSingle();
  if (error) throw new Error("Booking progress could not be loaded.");
  const active = data && new Date(data.expires_at).getTime() > Date.now() ? data.state as BookingState : null;
  if ((!active || active.step === "done") && !isBookingIntent(text)) return null;
  const call = async (name: string, body: Record<string, unknown>) => {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.error) throw Object.assign(new Error(typeof result.error === "string" ? result.error : "Booking is temporarily unavailable."), { alternatives: result.alternatives });
    return result;
  };
  const result = await advanceBooking(active, text, phone, { otp: body => call("portal-otp", body), workflow: body => call("appointment-workflow", body) });
  if (result.state) {
    const expires = result.state.expiresAt ?? Date.now() + 30 * 60000;
    const { error: saveError } = await admin.from("whatsapp_booking_sessions").upsert({ phone, state: result.state, expires_at: new Date(expires).toISOString(), updated_at: new Date().toISOString() });
    if (saveError) throw new Error("Booking progress could not be saved. Please contact the clinic before resubmitting.");
  } else {
    const { error: deleteError } = await admin.from("whatsapp_booking_sessions").delete().eq("phone", phone);
    if (deleteError) throw new Error("Booking conversation could not be closed.");
  }
  return result.reply;
}