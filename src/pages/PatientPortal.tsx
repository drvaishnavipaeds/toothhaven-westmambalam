import { useState, useEffect } from "react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Calendar, User, Clock, FileText, ChevronRight, Shield, LogOut, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import SuccessStoriesSection from "@/components/portal/SuccessStoriesSection";
import PortalTestimonials from "@/components/portal/PortalTestimonials";
import AchievementsWall from "@/components/portal/AchievementsWall";
import ClinicFeed from "@/components/portal/ClinicFeed";
import InvestigationsViewer from "@/components/portal/InvestigationsViewer";

const SESSION_KEY = "portal_session_v1";

interface PortalSession { phone: string; token: string; expiresAt: number; }

const loadSession = (): PortalSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
};

const PatientPortalContent = () => {
  const { lang } = useLanguage();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [method, setMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "in">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  // Registration form fields
  const [regName, setRegName] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regConsent, setRegConsent] = useState(false);

  // Restore session
  useEffect(() => {
    const s = loadSession();
    if (s) {
      setSession(s);
      setStep("in");
      loadPatientData(s.phone);
    }
  }, []);


  const loadPatientData = async (p: string) => {
    const { data: patients } = await supabase.from("patients").select("*").eq("phone", p);
    if (patients && patients.length > 0) {
      const pat = patients[0];
      setPatient(pat);
      const [a, t] = await Promise.all([
        supabase.from("appointments").select("*").eq("patient_id", pat.id).order("appointment_date", { ascending: false }),
        supabase.from("treatments").select("*").eq("patient_id", pat.id).order("treatment_date", { ascending: false }),
      ]);
      setAppointments(a.data || []);
      setTreatments(t.data || []);
    }
  };

  const switchToSignIn = (prefill?: { phone?: string; email?: string }) => {
    setMode("signin");
    setStep("phone");
    setOtp("");
    if (prefill?.phone) { setPhone(prefill.phone); setMethod("whatsapp"); }
    if (prefill?.email) { setEmail(prefill.email); setMethod("email"); }
  };

  const sendRegisterOtp = async () => {
    const name = regName.trim();
    if (name.length < 2) {
      toast.error(lang === "en" ? "Please enter your full name" : "உங்கள் முழுப் பெயரை உள்ளிடவும்");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      toast.error(lang === "en" ? "Enter a valid 10-digit phone number" : "சரியான 10 இலக்க எண்ணை உள்ளிடவும்");
      return;
    }
    const e = email.trim().toLowerCase();
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error(lang === "en" ? "Enter a valid email address" : "சரியான மின்னஞ்சலை உள்ளிடவும்");
      return;
    }
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error(lang === "en" ? "Enter a valid email address" : "சரியான மின்னஞ்சலை உள்ளிடவும்");
      return;
    }
    if (!regConsent) {
      toast.error(lang === "en" ? "Please accept the consent to continue" : "தொடர ஒப்புதலை ஏற்கவும்");
      return;
    }

    setSending(true);
    if (method === "whatsapp") {
      const { data, error } = await supabase.functions.invoke("portal-otp", {
        body: {
          action: "register_send",
          name, phone: phone.trim(),
          email: e || null,
          dob: regDob || null,
          gender: regGender || null,
        },
      });
      setSending(false);
      if (error || data?.error) {
        if (data?.already_exists) {
          toast.error(data.error);
          switchToSignIn({ phone: phone.trim() });
          return;
        }
        toast.error(data?.error || error?.message || "Failed to send OTP");
        return;
      }
      toast.success(lang === "en" ? "OTP sent via WhatsApp" : "OTP அனுப்பப்பட்டது");
      setStep("otp");
    } else {
      const { data: existing } = await supabase.from("patients").select("id").or(`phone.eq.${phone.trim()},email.eq.${e}`).limit(1);
      if (existing && existing.length > 0) {
        setSending(false);
        toast.error(lang === "en" ? "An account already exists. Please sign in." : "கணக்கு ஏற்கனவே உள்ளது. உள்நுழையவும்.");
        switchToSignIn({ email: e });
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
      setSending(false);
      if (error) { toast.error(error.message); return; }
      toast.success(lang === "en" ? "6-digit code sent to your email" : "உங்கள் மின்னஞ்சலுக்கு குறியீடு அனுப்பப்பட்டது");
      setStep("otp");
    }
  };

  const sendOtp = async () => {
    if (mode === "register") return sendRegisterOtp();
    if (method === "whatsapp") {
      if (!/^\d{10}$/.test(phone.trim())) {
        toast.error(lang === "en" ? "Enter a valid 10-digit phone number" : "சரியான 10 இலக்க எண்ணை உள்ளிடவும்");
        return;
      }
      setSending(true);
      const { data, error } = await supabase.functions.invoke("portal-otp", {
        body: { action: "send", phone: phone.trim() },
      });
      setSending(false);
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Failed to send OTP");
        return;
      }
      toast.success(lang === "en" ? "OTP sent via WhatsApp" : "OTP WhatsApp மூலம் அனுப்பப்பட்டது");
      setStep("otp");
    } else {
      const e = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        toast.error(lang === "en" ? "Enter a valid email address" : "சரியான மின்னஞ்சலை உள்ளிடவும்");
        return;
      }
      setSending(true);
      // Verify a patient with this email exists before sending
      const { data: pats } = await supabase.from("patients").select("id,email").ilike("email", e).limit(1);
      if (!pats || pats.length === 0) {
        setSending(false);
        toast.error(lang === "en" ? "No patient found with this email. Please register or contact the clinic." : "இந்த மின்னஞ்சலுடன் நோயாளி இல்லை.");
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
      setSending(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(lang === "en" ? "6-digit code sent to your email" : "உங்கள் மின்னஞ்சலுக்கு 6 இலக்க குறியீடு அனுப்பப்பட்டது");
      setStep("otp");
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error(lang === "en" ? "Enter the 6-digit code" : "6 இலக்க குறியீட்டை உள்ளிடவும்");
      return;
    }
    setVerifying(true);

    if (mode === "register") {
      if (method === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("portal-otp", {
          body: { action: "register_verify", phone: phone.trim(), code: otp },
        });
        setVerifying(false);
        if (error || data?.error || !data?.token) {
          toast.error(data?.error || error?.message || "Invalid code");
          return;
        }
        const sess: PortalSession = { phone: data.phone, token: data.token, expiresAt: Date.now() + 30 * 60 * 1000 };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        setSession(sess);
        setStep("in");
        await loadPatientData(sess.phone);
        toast.success(lang === "en" ? "Welcome to Tooth Haven!" : "வரவேற்கிறோம்!");
      } else {
        const e = email.trim().toLowerCase();
        const { data: verifyData, error } = await supabase.auth.verifyOtp({ email: e, token: otp, type: "email" });
        if (error || !verifyData?.session) {
          setVerifying(false);
          toast.error(error?.message || "Invalid code");
          return;
        }
        const { data, error: fnErr } = await supabase.functions.invoke("portal-otp", {
          body: {
            action: "register_finalize",
            name: regName.trim(), phone: phone.trim(), email: e,
            dob: regDob || null, gender: regGender || null,
          },
        });
        setVerifying(false);
        if (fnErr || data?.error || !data?.token) {
          toast.error(data?.error || fnErr?.message || "Registration failed");
          return;
        }
        const sess: PortalSession = { phone: data.phone, token: data.token, expiresAt: Date.now() + 30 * 60 * 1000 };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        setSession(sess);
        setStep("in");
        await loadPatientData(sess.phone);
        toast.success(lang === "en" ? "Welcome to Tooth Haven!" : "வரவேற்கிறோம்!");
      }
      return;
    }

    // Sign-in verify
    if (method === "whatsapp") {
      const { data, error } = await supabase.functions.invoke("portal-otp", {
        body: { action: "verify", phone: phone.trim(), code: otp },
      });
      setVerifying(false);
      if (error || data?.error || !data?.token) {
        toast.error(data?.error || "Invalid code");
        return;
      }
      const sess: PortalSession = { phone: phone.trim(), token: data.token, expiresAt: Date.now() + 30 * 60 * 1000 };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      setSession(sess);
      setStep("in");
      await loadPatientData(sess.phone);
      toast.success(lang === "en" ? "Welcome back!" : "மீண்டும் வரவேற்கிறோம்!");
    } else {
      const e = email.trim().toLowerCase();
      const { data: verifyData, error } = await supabase.auth.verifyOtp({ email: e, token: otp, type: "email" });
      if (error || !verifyData?.session) {
        setVerifying(false);
        toast.error(error?.message || "Invalid code");
        return;
      }
      const { data: pats } = await supabase.from("patients").select("*").ilike("email", e).limit(1);
      setVerifying(false);
      if (!pats || pats.length === 0) {
        toast.error(lang === "en" ? "No patient record linked to this email" : "இந்த மின்னஞ்சலுடன் பதிவு இல்லை");
        return;
      }
      const pat = pats[0];
      const sess: PortalSession = { phone: pat.phone, token: verifyData.session.access_token, expiresAt: Date.now() + 30 * 60 * 1000 };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      setSession(sess);
      setStep("in");
      await loadPatientData(pat.phone);
      toast.success(lang === "en" ? "Welcome back!" : "மீண்டும் வரவேற்கிறோம்!");
    }
  };


  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPatient(null);
    setAppointments([]);
    setTreatments([]);
    setPhone("");
    setEmail("");
    setOtp("");
    setRegName(""); setRegDob(""); setRegGender(""); setRegConsent(false);
    setStep("phone");
    setMode("signin");
  };


  const nextAppt = appointments.find(a => a.status !== "completed" && a.status !== "cancelled" && new Date(a.appointment_date) >= new Date(new Date().toDateString()));

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === "en" ? "Back to Home" : "முகப்புக்குத் திரும்பு"}
          </Link>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">
              {lang === "en" ? "Patient Portal" : "நோயாளி போர்டல்"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {lang === "en" ? "Your treatment journey, success stories & clinic updates" : "உங்கள் சிகிச்சை பயணம், வெற்றிக் கதைகள் & மருத்துவமனை செய்திகள்"}
            </p>
          </div>

          {step !== "in" && (
            <div className="bg-card rounded-2xl p-6 shadow-elevated mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">
                  {mode === "signin"
                    ? (lang === "en" ? "Secure Login" : "பாதுகாப்பான உள்நுழைவு")
                    : (lang === "en" ? "Create Your Account" : "கணக்கை உருவாக்கவும்")}
                </h2>
              </div>

              {/* Mode tabs */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setStep("phone"); setOtp(""); }}
                  className={`py-2 rounded-md text-sm font-medium transition ${mode === "signin" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
                >
                  {lang === "en" ? "Sign In" : "உள்நுழை"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setStep("phone"); setOtp(""); }}
                  className={`py-2 rounded-md text-sm font-medium transition ${mode === "register" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
                >
                  {lang === "en" ? "Register" : "பதிவு"}
                </button>
              </div>

              {step === "phone" && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMethod("whatsapp")}
                      className={`py-2 rounded-md text-sm font-medium transition ${method === "whatsapp" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
                    >
                      {lang === "en" ? "WhatsApp" : "வாட்ஸ்அப்"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("email")}
                      className={`py-2 rounded-md text-sm font-medium transition ${method === "email" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
                    >
                      {lang === "en" ? "Email" : "மின்னஞ்சல்"}
                    </button>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {lang === "en" ? "Full name" : "முழுப் பெயர்"} <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          maxLength={100}
                          placeholder={lang === "en" ? "Your full name" : "உங்கள் முழுப் பெயர்"}
                          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {lang === "en" ? "Date of birth" : "பிறந்த தேதி"}
                          </label>
                          <input
                            type="date"
                            value={regDob}
                            onChange={(e) => setRegDob(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {lang === "en" ? "Gender" : "பாலினம்"}
                          </label>
                          <select
                            value={regGender}
                            onChange={(e) => setRegGender(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">--</option>
                            <option value="male">{lang === "en" ? "Male" : "ஆண்"}</option>
                            <option value="female">{lang === "en" ? "Female" : "பெண்"}</option>
                            <option value="other">{lang === "en" ? "Other" : "மற்றவை"}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="block text-sm font-medium text-foreground mb-2">
                    {mode === "register"
                      ? (method === "whatsapp"
                          ? (lang === "en" ? "Phone number (WhatsApp)" : "தொலைபேசி எண் (WhatsApp)")
                          : (lang === "en" ? "Email address" : "மின்னஞ்சல்"))
                      : (method === "whatsapp"
                          ? (lang === "en" ? "Registered phone number" : "பதிவு செய்யப்பட்ட தொலைபேசி எண்")
                          : (lang === "en" ? "Registered email address" : "பதிவு செய்யப்பட்ட மின்னஞ்சல்"))}
                    {mode === "register" && <span className="text-destructive"> *</span>}
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      {method === "whatsapp" ? (
                        <>
                          <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                          <input
                            type="tel"
                            placeholder="9841703037"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </>
                      ) : (
                        <>
                          <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </>
                      )}
                    </div>
                    <button
                      onClick={sendOtp}
                      disabled={sending}
                      className="bg-gradient-primary text-primary-foreground px-5 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? "..." : (lang === "en" ? "Send OTP" : "OTP அனுப்பு")}
                    </button>
                  </div>

                  {mode === "register" && method === "whatsapp" && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {lang === "en" ? "Email (optional)" : "மின்னஞ்சல் (விருப்பம்)"}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  {mode === "register" && method === "email" && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {lang === "en" ? "Phone number (WhatsApp)" : "தொலைபேசி எண் (WhatsApp)"} <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="9841703037"
                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {mode === "register" && (
                    <label className="flex items-start gap-2 mt-4 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regConsent}
                        onChange={(e) => setRegConsent(e.target.checked)}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        {lang === "en"
                          ? "I agree to be contacted about appointments, treatment updates, and clinic communication."
                          : "முன்பதிவுகள், சிகிச்சை புதுப்பிப்புகள் மற்றும் மருத்துவமனை தொடர்பு பற்றி என்னைத் தொடர்பு கொள்ள ஒப்புக்கொள்கிறேன்."}
                      </span>
                    </label>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    {method === "whatsapp"
                      ? (lang === "en" ? "We'll send a 6-digit code to your WhatsApp." : "உங்கள் WhatsApp க்கு 6 இலக்க குறியீடு அனுப்பப்படும்.")
                      : (lang === "en" ? "We'll email you a 6-digit code." : "உங்கள் மின்னஞ்சலுக்கு 6 இலக்க குறியீடு அனுப்பப்படும்.")}
                  </p>
                </>
              )}


              {step === "otp" && (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {lang === "en" ? "Code sent to" : "குறியீடு அனுப்பப்பட்டது"}{" "}
                    <span className="font-semibold text-foreground">{method === "whatsapp" ? phone : email}</span>
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                      className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={verifyOtp}
                      disabled={verifying}
                      className="bg-gradient-primary text-primary-foreground px-5 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {verifying ? "..." : (lang === "en" ? "Verify" : "சரிபார்")}
                    </button>
                  </div>
                  <button onClick={() => { setStep("phone"); setOtp(""); }} className="text-xs text-primary mt-3 hover:underline">
                    {lang === "en" ? "Change" : "மாற்று"}
                  </button>
                </>
              )}

            </div>
          )}

          {/* Public credibility content (always visible) */}
          {step !== "in" && (
            <div className="space-y-6">
              <ClinicFeed />
              <SuccessStoriesSection />
              <PortalTestimonials />
              <AchievementsWall />
            </div>
          )}

          {/* Logged in view */}
          {step === "in" && (
            <div className="space-y-6">
              {/* Hero greeting */}
              <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-6 shadow-elevated">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm opacity-90">{lang === "en" ? "Hi" : "வணக்கம்"} 👋</p>
                    <h2 className="text-2xl font-bold mt-1">{patient?.name}</h2>
                    {nextAppt ? (
                      <p className="text-sm mt-3 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4" />
                        {lang === "en" ? "Next visit:" : "அடுத்த பார்வை:"} {nextAppt.appointment_date} • {nextAppt.appointment_time}
                      </p>
                    ) : (
                      <a href="/#appointment" className="inline-flex items-center gap-2 mt-3 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-sm">
                        {lang === "en" ? "Book appointment" : "முன்பதிவு செய்"} <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button onClick={signOut} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live clinic feed */}
              <ClinicFeed />

              {/* Treatment journey */}
              <section className="bg-card rounded-2xl p-5 shadow-elevated">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {lang === "en" ? "Your Treatment Journey" : "உங்கள் சிகிச்சை பயணம்"}
                </h3>
                {treatments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {lang === "en" ? "No treatments recorded yet" : "சிகிச்சைகள் பதிவு செய்யப்படவில்லை"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {treatments.map((tr) => (
                      <div key={tr.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground text-sm">{tr.treatment_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tr.status === "completed" ? "bg-green-100 text-green-700" :
                            tr.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>{tr.status}</span>
                        </div>
                        {tr.tooth_number && <p className="text-xs text-muted-foreground">Tooth: {tr.tooth_number}</p>}
                        {tr.description && <p className="text-xs text-muted-foreground mt-1">{tr.description}</p>}
                        {tr.treatment_date && <p className="text-[10px] text-muted-foreground mt-1">{tr.treatment_date}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Appointments */}
              <section className="bg-card rounded-2xl p-5 shadow-elevated">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {lang === "en" ? "Appointments" : "முன்பதிவுகள்"}
                </h3>
                {appointments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {lang === "en" ? "No appointments yet" : "முன்பதிவுகள் இல்லை"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {appointments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{a.treatment_type || "General"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {a.appointment_date} • {a.appointment_time}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          a.status === "completed" ? "bg-green-100 text-green-700" :
                          a.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                          a.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {patient && <InvestigationsViewer patientId={patient.id} />}

              <SuccessStoriesSection />
              <PortalTestimonials />
              <AchievementsWall />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

const PatientPortal = () => (
  <LanguageProvider>
    <PatientPortalContent />
  </LanguageProvider>
);

export default PatientPortal;
