import { useEffect, useState } from "react";
import { Fingerprint, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const IDLE_MS = 15 * 60 * 1000;
const DEVICE_KEY = "th_admin_device_credential";

const AdminAppLock = () => {
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);

  useEffect(() => {
    setDeviceReady(Boolean(window.PublicKeyCredential && localStorage.getItem(DEVICE_KEY)));
    let timer = window.setTimeout(() => setLocked(true), IDLE_MS);
    const reset = () => {
      if (locked) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLocked(true), IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [locked]);

  const unlockWithPassword = async () => {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setBusy(false);
      return toast.error("Sign in again to unlock");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Password did not match");
    setPassword("");
    setLocked(false);
  };

  const enableDeviceUnlock = async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) return toast.error("Device authentication is unavailable");
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    try {
      const credential = await navigator.credentials.create({ publicKey: {
        challenge,
        rp: { name: "Tooth Haven Admin" },
        user: { id: userId, name: "Tooth Haven staff", displayName: "Tooth Haven staff" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      } }) as PublicKeyCredential | null;
      if (!credential) return;
      localStorage.setItem(DEVICE_KEY, btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
      setDeviceReady(true);
      toast.success("Device unlock enabled");
    } catch {
      toast.error("Device authentication was not enabled");
    }
  };

  const unlockWithDevice = async () => {
    const encoded = localStorage.getItem(DEVICE_KEY);
    if (!encoded || !navigator.credentials) return;
    const id = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    try {
      const result = await navigator.credentials.get({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id }],
        userVerification: "required",
        timeout: 60000,
      } });
      if (result) setLocked(false);
    } catch {
      toast.error("Device authentication was cancelled");
    }
  };

  return <>
    {!deviceReady && <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={enableDeviceUnlock}><Fingerprint className="mr-1 h-4 w-4" />Enable device unlock</Button>}
    <Dialog open={locked} onOpenChange={() => undefined}>
      <DialogContent className="max-w-sm" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" />Admin app locked</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Your clinical workspace locked after 15 minutes of inactivity.</p>
        {deviceReady && <Button className="w-full" onClick={unlockWithDevice}><Fingerprint className="mr-2 h-4 w-4" />Unlock with this device</Button>}
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" onKeyDown={(event) => event.key === "Enter" && void unlockWithPassword()} />
        <Button variant={deviceReady ? "outline" : "default"} className="w-full" disabled={!password || busy} onClick={unlockWithPassword}>{busy ? "Checking…" : "Unlock with password"}</Button>
      </DialogContent>
    </Dialog>
  </>;
};

export default AdminAppLock;