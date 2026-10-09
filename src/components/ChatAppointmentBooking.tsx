import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_SERVICES } from "../../supabase/functions/_shared/chat-booking-flow";
import { Calendar, Check, ShieldCheck } from "lucide-react";

type Session = { token: string; expiresAt: number; phone: string };
function existingSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem("portal_session_v1") ?? "null");
    return session?.token && session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}
async function call(name: string, body: Record<string, unknown>, bearer?: string) {
  const { data, error } = await supabase.functions.invoke(name, { body, ...(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {}) });
  if (error) {
    let detail;
    if (error instanceof FunctionsHttpError) try { detail = await error.context.json(); } catch { /* fallback */ }
    throw Object.assign(new Error(typeof detail?.error === "string" ? detail.error : error.message), { alternatives: detail?.alternatives });
  }
  if (data?.error) throw Object.assign(new Error(data.error), { alternatives: data.alternatives });
  return data;
}

export default function ChatAppointmentBooking({ lang, onClose }: { lang: "en" | "ta"; onClose: () => void }) {
  const t = (en: string, ta: string) => lang === "ta" ? ta : en;
  const [session, setSession] = useState<Session | null>(existingSession);
  const [method, setMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [service, setService] = useState(CHAT_SERVICES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<any>(null);
  const request = useRef(0);
  const submitting = useRef(false);
  const task = async (work: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { submitting.current = false; setBusy(false); }
  };
  const sendCode = () => task(async () => {
    if (register && (name.trim().length < 2 || !consent || !/^\d{10}$/.test(phone))) throw new Error(t("Enter your name, phone and accept the consent.", "பெயர், எண் மற்றும் ஒப்புதலை உள்ளிடவும்."));
    if (method === "whatsapp") await call("portal-otp", { action: register ? "register_send" : "send", phone, ...(register ? { name: name.trim(), email: email || null } : {}) });
    else {
      const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (authError) throw authError;
    }
    setOtpSent(true);
  });
  const verify = () => task(async () => {
    let data;
    if (method === "whatsapp") data = await call("portal-otp", { action: register ? "register_verify" : "verify", phone, code });
    else {
      const { data: auth, error: authError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
      if (authError || !auth.session) throw authError ?? new Error("Email verification failed");
      data = await call("portal-otp", { action: register ? "register_finalize" : "email_session", ...(register ? { name: name.trim(), phone, email: email.trim().toLowerCase() } : {}) }, auth.session.access_token);
    }
    if (!data?.token || !data.expiresAt) throw new Error("Patient verification did not complete");
    const verified = { phone: data.phone, token: data.token, expiresAt: data.expiresAt };
    localStorage.setItem("portal_session_v1", JSON.stringify(verified)); setSession(verified);
  });
  const checkTimes = async (value: string) => {
    const id = ++request.current;
    setDate(value); setTime(""); setSlots([]); setChecked(false); setReview(false); setError("");
    if (!value || !session) return;
    setBusy(true);
    try {
      const data = await call("appointment-workflow", { action: "availability", portalToken: session.token, date: value, durationMinutes: 30 });
      if (id !== request.current) return;
      if (!Array.isArray(data.slots)) throw new Error("Clinic availability could not be verified");
      setSlots(data.slots); setChecked(true);
    } catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : "Times unavailable"); }
    finally { if (id === request.current) setBusy(false); }
  };
  const submit = () => task(async () => {
    if (!session || session.expiresAt <= Date.now()) { setSession(null); throw new Error(t("Please verify your account again.", "மீண்டும் கணக்கை சரிபார்க்கவும்.")); }
    try {
      const data = await call("appointment-workflow", { action: "book", portalToken: session.token, date, time, service, durationMinutes: 30, source: "website_chat" });
      if (!data.appointment?.id || data.appointment.status !== "pending") throw new Error("Request result could not be verified. Contact the clinic before retrying.");
      setResult(data);
    } catch (e) {
      if ((e as { alternatives?: string[] }).alternatives) { setSlots((e as { alternatives: string[] }).alternatives); setTime(""); setReview(false); }
      throw e;
    }
  });
  return <section className="space-y-3 text-sm" aria-label={t("Book an appointment", "முன்பதிவு")}>
    <div className="flex items-center justify-between gap-2"><h4 className="flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4 text-primary" />{t("Book an appointment", "முன்பதிவு")}</h4><Button variant="ghost" size="sm" onClick={onClose}>{t("Back to chat", "உரையாடல்")}</Button></div>
    {error && <p role="alert" className="text-destructive break-words">{error}</p>}
    {result ? <div className="space-y-3">
      <Check className="h-6 w-6 text-primary" /><p className="font-semibold">{t("Request saved · awaiting confirmation", "கோரிக்கை பதிவு · உறுதி நிலுவையில்")}</p>
      <p>{service}<br />{date} · {time}</p>
      <p className="text-xs text-muted-foreground">{t("The clinic has 10 minutes to review. Any later calendar hold is tentative, not confirmation.", "மருத்துவமனை 10 நிமிடங்களில் பரிசீலிக்கும். பின்னர் நேரம் தற்காலிகமாக வைக்கப்படும்; உறுதி அல்ல.")}</p>
      {!result.adminNotification?.ok && <p className="text-xs text-destructive">{t("Doctor’s WhatsApp alert could not be sent. Your request is saved in the clinic app.", "மருத்துவருக்கு WhatsApp அனுப்ப முடியவில்லை. கோரிக்கை பதிவாகியுள்ளது.")}</p>}
      <Button asChild variant="outline" className="w-full"><a href="/patient-portal">{t("View my appointments", "எனது முன்பதிவுகள்")}</a></Button>
    </div> : !session ? <div className="space-y-3">
      {!otpSent ? <>
        <div className="grid grid-cols-2 gap-2"><Button size="sm" variant={!register ? "default" : "outline"} onClick={() => setRegister(false)}>{t("Sign in", "உள்நுழைவு")}</Button><Button size="sm" variant={register ? "default" : "outline"} onClick={() => setRegister(true)}>{t("New patient", "புதிய நோயாளி")}</Button></div>
        <label className="block space-y-1"><span>{t("Verification method", "சரிபார்ப்பு முறை")}</span><select className="h-10 w-full rounded-md border border-input bg-background px-2" value={method} onChange={e => setMethod(e.target.value as "email" | "whatsapp")}><option value="whatsapp">WhatsApp OTP</option><option value="email">Email OTP</option></select></label>
        {register && <Input aria-label="Full name" placeholder={t("Full name", "முழு பெயர்")} maxLength={100} value={name} onChange={e => setName(e.target.value)} />}
        {(method === "whatsapp" || register) && <Input aria-label="Phone number" placeholder={t("10-digit phone number", "10 இலக்க தொலைபேசி எண்")} type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} />}
        {method === "email" && <Input aria-label="Email address" placeholder={t("Email address", "மின்னஞ்சல்")} type="email" value={email} onChange={e => setEmail(e.target.value)} />}
        {register && <label className="flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t("I agree to patient registration and appointment updates under the", "நோயாளி பதிவு மற்றும் அறிவிப்புகளுக்கு ஒப்புக்கொள்கிறேன்:")} <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary">Terms</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary">Privacy Policy</a>.</span></label>}
        <Button className="w-full" disabled={busy} onClick={sendCode}>{busy ? t("Sending…", "அனுப்புகிறது…") : t("Send verification code", "குறியீடு அனுப்பு")}</Button>
      </> : <>
        <p className="text-xs text-muted-foreground">{t("Enter the six-digit code sent to your", "6 இலக்க குறியீடு:")} {method === "whatsapp" ? phone : email}.</p>
        <Input aria-label="Verification code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
        <Button className="w-full" disabled={busy || code.length !== 6} onClick={verify}>{t("Verify and continue", "சரிபார்த்து தொடரவும்")}</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setOtpSent(false); setCode(""); }}>{t("Change details", "விவரங்களை மாற்று")}</Button>
      </>}
    </div> : <div className="space-y-3">
      <p className="flex items-center gap-1 text-xs text-primary"><ShieldCheck className="h-4 w-4" />{t("Patient verified", "நோயாளி சரிபார்க்கப்பட்டது")}</p>
      {review ? <>
        <p className="font-medium">{service}<br />{date} · {time}</p><p className="text-xs text-muted-foreground">{t("Send this request to Dr. Karthik for approval? This does not confirm the appointment.", "மருத்துவரின் ஒப்புதலுக்கு அனுப்பவா? இது உறுதியான முன்பதிவு அல்ல.")}</p>
        <Button className="w-full" disabled={busy} onClick={submit}>{busy ? t("Submitting…", "பதிவாகிறது…") : t("Send appointment request", "கோரிக்கை அனுப்பு")}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => setReview(false)}>{t("Change time", "நேரத்தை மாற்று")}</Button>
      </> : <>
        <label className="block space-y-1"><span>{t("Service", "சிகிச்சை")}</span><select aria-label="Service" className="h-10 w-full rounded-md border border-input bg-background px-2" value={service} onChange={e => setService(e.target.value)}>{CHAT_SERVICES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="block space-y-1"><span>{t("Appointment date", "முன்பதிவு தேதி")}</span><Input aria-label="Appointment date" type="date" value={date} onChange={e => void checkTimes(e.target.value)} /></label>
        {busy && <p role="status" className="text-xs text-muted-foreground">{t("Checking clinic calendar…", "காலெண்டரை சரிபார்க்கிறது…")}</p>}
        {checked && !slots.length && <p className="text-xs text-muted-foreground">{t("No available times. Choose another date.", "நேரங்கள் இல்லை. வேறு தேதியை தேர்ந்தெடுக்கவும்.")}</p>}
        <div className="grid grid-cols-3 gap-2">{slots.map(slot => <Button size="sm" variant={time === slot ? "default" : "outline"} key={slot} disabled={busy} onClick={() => setTime(slot)}>{slot}</Button>)}</div>
        <Button className="w-full" disabled={!time || busy} onClick={() => setReview(true)}>{t("Review request", "கோரிக்கையை பரிசீலி")}</Button>
      </>}
    </div>}
  </section>;
}