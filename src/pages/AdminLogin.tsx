import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Phone, ShieldCheck, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Step = "choose" | "email" | "phone" | "otp";

const AdminLogin = () => {
  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithPhone, verifyOtp, signInWithEmail, isAdmin, user } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user && isAdmin) {
    navigate("/admin/dashboard", { replace: true });
    return null;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signInWithPhone(phone);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setStep("otp");
      toast({ title: "OTP Sent", description: "Check your phone for the verification code." });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await verifyOtp(phone, otp);
    setLoading(false);
    if (error) {
      toast({ title: "Verification Failed", description: error, variant: "destructive" });
    } else {
      navigate("/admin/dashboard", { replace: true });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login Failed", description: error, variant: "destructive" });
    } else {
      navigate("/admin/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to website
        </button>

        <div className="bg-card rounded-2xl p-6 shadow-elevated border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Tooth Haven Dental Care</p>
            </div>
          </div>

          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Sign in with your authorized admin email</p>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setStep("email")}>
                <Mail className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Email & Password</p>
                </div>
              </Button>
              <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone OTP temporarily unavailable
                </p>
                <p>SMS OTP is being upgraded. Please use email login for now — your phone number remains authorized.</p>
              </div>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <button type="button" onClick={() => setStep("choose")} className="text-xs text-primary hover:underline">← Back</button>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@toothhaven.com" className="pl-10" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <button type="button" onClick={() => setStep("choose")} className="text-xs text-primary hover:underline">← Back</button>
              <div>
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98417 03037" className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the OTP sent to <strong>{phone}</strong></p>
              <Input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} className="text-center text-lg tracking-widest" />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>
              <button type="button" onClick={() => setStep("phone")} className="text-sm text-primary hover:underline w-full text-center">
                Change phone number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
