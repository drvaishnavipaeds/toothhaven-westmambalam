export const CHAT_SERVICES = ["General Dentistry", "Dental Implants", "Root Canal", "Orthodontics", "Cosmetic Dentistry", "CBCT Imaging", "Pediatric Dentistry", "Oral Surgery", "Crowns & Bridges", "Digital Smile Design", "Home Visit"];
export const isBookingIntent = (text: string) => /\b(book|booking|appointment|schedule|reserve)\b|முன்பதிவு|நேரம்.*பதிவு/i.test(text);
export type BookingState = {
  step: "identity" | "name" | "consent" | "otp" | "service" | "date" | "time" | "confirm" | "done";
  token?: string; expiresAt?: number; name?: string; registration?: boolean;
  service?: string; date?: string; time?: string; slots?: string[]; appointmentId?: string;
};
type Result = Record<string, any>;
type Dependencies = {
  otp: (body: Result) => Promise<Result>;
  workflow: (body: Result) => Promise<Result>;
};
export async function advanceBooking(state: BookingState | null, text: string, phone: string, api: Dependencies): Promise<{ state: BookingState | null; reply: string }> {
  const value = text.trim();
  if (/^(exit|cancel booking|வெளியேறு)$/i.test(value)) return { state: null, reply: "Booking conversation closed. Existing appointments have not been cancelled." };
  if (!state || state.step === "done") return { state: { step: "identity" }, reply: "Book with Tooth Haven 🦷\nReply SIGN IN for an existing patient, or REGISTER for a new patient.\nYou can reply EXIT at any time." };
  try {
    if (state.step === "identity") {
      if (/^(register|new|பதிவு)$/i.test(value)) return { state: { step: "name", registration: true }, reply: "What is your full name?" };
      if (!/^(sign in|signin|login|existing)$/i.test(value)) return { state, reply: "Reply SIGN IN or REGISTER to continue." };
      await api.otp({ action: "send", phone });
      return { state: { step: "otp", registration: false }, reply: "A verification code was sent to this WhatsApp number. Reply with the six-digit code." };
    }
    if (state.step === "name") {
      if (value.length < 2 || value.length > 100) return { state, reply: "Please enter your full name (2–100 characters)." };
      return { state: { ...state, name: value, step: "consent" }, reply: "May Tooth Haven create your patient record and send appointment updates to this number? Reply AGREE to accept the Terms and Privacy Policy: https://www.toothhaven.in/privacy • https://www.toothhaven.in/terms" };
    }
    if (state.step === "consent") {
      if (!/^(agree|yes|ஒப்புக்கொள்கிறேன்)$/i.test(value)) return { state, reply: "Reply AGREE to continue, or EXIT to stop." };
      await api.otp({ action: "register_send", name: state.name, phone });
      return { state: { ...state, step: "otp" }, reply: "A verification code was sent. Reply with the six-digit code to finish registration." };
    }
    if (state.step === "otp") {
      if (!/^\d{6}$/.test(value)) return { state, reply: "Please reply with the six-digit verification code." };
      const verified = await api.otp({ action: state.registration ? "register_verify" : "verify", phone, code: value });
      if (!verified.token || !verified.expiresAt) throw new Error("Verification did not complete. Please start again.");
      return { state: { step: "service", token: verified.token, expiresAt: verified.expiresAt }, reply: `Verified. Choose a service by number:\n${CHAT_SERVICES.map((s, i) => `${i + 1}. ${s}`).join("\n")}` };
    }
    if (!state.token || !state.expiresAt || state.expiresAt <= Date.now()) return { state: null, reply: "Your verification has expired. Reply BOOK to verify again." };
    if (state.step === "service") {
      const service = CHAT_SERVICES[Number(value) - 1] ?? CHAT_SERVICES.find(s => s.toLowerCase() === value.toLowerCase());
      if (!service) return { state, reply: "Choose a service number from the list." };
      return { state: { ...state, service, step: "date" }, reply: "Which date? Reply YYYY-MM-DD. Clinic hours: Monday–Saturday, 11am–2pm and 6pm–9pm." };
    }
    if (state.step === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return { state, reply: "Please enter a valid date as YYYY-MM-DD." };
      const availability = await api.workflow({ action: "availability", portalToken: state.token, date: value, durationMinutes: 30 });
      const slots = availability.slots;
      if (!Array.isArray(slots)) throw new Error("Clinic availability could not be verified. Please try again later.");
      if (!slots.length) return { state, reply: "No available times on that date. Please choose another date (YYYY-MM-DD)." };
      return { state: { ...state, date: value, slots, step: "time" }, reply: `Available times on ${value}:\n${slots.join(" • ")}\nReply with a time, for example ${slots[0]} (24-hour format).` };
    }
    if (state.step === "time") {
      if (!state.slots?.includes(value)) return { state, reply: "Choose one of the available times shown above, or reply EXIT to restart." };
      return { state: { ...state, time: value, step: "confirm" }, reply: `${state.service}\n${state.date} at ${value}\nReply REQUEST to send this to Dr. Karthik for approval. This is not a confirmed appointment.` };
    }
    if (!/^request$/i.test(value)) return { state, reply: "Reply REQUEST to submit, or EXIT to stop without booking." };
    const booked = await api.workflow({ action: "book", portalToken: state.token, date: state.date, time: state.time, service: state.service, durationMinutes: 30, source: "whatsapp" });
    if (!booked.appointment?.id || booked.appointment.status !== "pending") throw new Error("The request could not be verified. Please contact the clinic before trying again.");
    return { state: { step: "done", appointmentId: booked.appointment.id }, reply: `Request saved for ${state.date} at ${state.time}. Awaiting clinic confirmation. ${booked.adminNotification?.ok ? "The doctor's WhatsApp alert was accepted for sending." : "The doctor's WhatsApp alert could not be sent; the request is still visible in the clinic app."}\nReference: ${booked.appointment.id.slice(0, 8)}. The clinic has 10 minutes to review; any later hold is tentative, not confirmation.` };
  } catch (error) {
    const detail = error as Error & { alternatives?: string[] };
    if (detail.alternatives) return { state: { ...state, step: "date", slots: [], time: undefined }, reply: "That time is no longer available. Please choose a date again so I can check current times." };
    return { state, reply: detail.message || "Booking could not continue. Please try again or call 8925166149." };
  }
}