import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Minimal typed wrapper — the `auth.oauth` namespace is beta in supabase-js.
type OauthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OauthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [session, setSession] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Inline phone-OTP sign-in
  const [phone, setPhone] = useState("+91");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorizationId) return setError("Missing authorization_id in the URL.");
    if (!session) return;
    (async () => {
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
  }, [authorizationId, session]);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) return setError(error.message);
    setOtpSent(true);
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setBusy(false);
    if (error) return setError(error.message);
  }

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("Authorization server did not return a redirect URL.");
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Connect to Tooth Haven
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {!session ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in with your registered phone number to continue.
              </p>
              {!otpSent ? (
                <>
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Button className="w-full" onClick={sendOtp} disabled={busy || phone.length < 10}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <Button className="w-full" onClick={verifyOtp} disabled={busy || otp.length < 4}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
                  </Button>
                  <button className="text-xs underline text-muted-foreground" onClick={() => setOtpSent(false)}>
                    Change phone number
                  </button>
                </>
              )}
            </div>
          ) : !details ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading authorization request…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{details.client?.name ?? "An application"}</span> is
                  requesting access to your Tooth Haven account.
                </p>
                <p className="text-xs text-muted-foreground">
                  Signed in as {session.user?.phone ?? session.user?.email}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                This lets {details.client?.name ?? "the client"} use Tooth Haven tools as you.
                It does not bypass this clinic's data policies.
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
                  Approve
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => decide(false)} disabled={busy}>
                  Deny
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
