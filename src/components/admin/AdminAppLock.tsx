import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { hasPin, isValidPin, passkeyId, passkeySupported, registerPasskey, setPin, unlockWithPasskey, verifyPin } from "@/lib/app-lock";

const IDLE_MS = 15 * 60 * 1000;

const AdminAppLock = () => {
  const { user } = useAdminAuth();
  const uid = user?.id ?? "";
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [pin, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [, force] = useState(0);
  const pinOn = uid && hasPin(uid);
  const keyOn = uid && !!passkeyId(uid);

  useEffect(() => {
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

  const done = () => { setPassword(""); setPinInput(""); setLocked(false); };

  const unlockWithPassword = async () => {
    setBusy(true);
    const email = user?.email;
    if (!email) { setBusy(false); return toast.error("Sign in again to unlock"); }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Password did not match");
    done();
  };

  const unlockPin = async () => {
    setBusy(true);
    const r = await verifyPin(uid, pin);
    setBusy(false);
    if (r === "ok") return done();
    setPinInput("");
    if (r === "locked_out") { force((n) => n + 1); toast.error("Too many wrong PINs. Use your password."); }
    else toast.error("Wrong PIN");
  };

  const unlockKey = async () => {
    try { if (await unlockWithPasskey(uid)) done(); } catch { toast.error("Fingerprint / face unlock was cancelled"); }
  };

  const savePin = async () => {
    try { await setPin(uid, newPin); setNewPin(""); setSetupOpen(false); force((n) => n + 1); toast.success("PIN saved on this device"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save PIN"); }
  };

  const addKey = async () => {
    try { await registerPasskey(uid, user?.email ?? "admin"); force((n) => n + 1); toast.success("Fingerprint / face unlock turned on"); }
    catch { toast.error("This device could not set up fingerprint / face unlock"); }
  };

  if (!uid) return null;

  return <>
    <div className="mb-3 flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}><KeyRound className="mr-1 h-4 w-4" />{pinOn ? "Change PIN" : "Set quick-unlock PIN"}</Button>
      {passkeySupported() && !keyOn && <Button size="sm" variant="outline" onClick={addKey}><Fingerprint className="mr-1 h-4 w-4" />Use fingerprint / face</Button>}
    </div>
    <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Quick-unlock PIN</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">4–8 digits, stored only on this device. 5 wrong tries removes it.</p>
        <Input inputMode="numeric" type="password" aria-label="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} />
        <Button disabled={!isValidPin(newPin)} onClick={savePin}>Save PIN</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={locked} onOpenChange={() => undefined}>
      <DialogContent className="max-w-sm" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" />Admin app locked</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Your clinical workspace locked after 15 minutes of inactivity.</p>
        {keyOn && <Button className="w-full" variant="secondary" onClick={unlockKey}><Fingerprint className="mr-1 h-4 w-4" />Unlock with fingerprint / face</Button>}
        {pinOn && <div className="flex gap-2">
          <Input inputMode="numeric" type="password" aria-label="PIN" placeholder="PIN" value={pin} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && void unlockPin()} />
          <Button disabled={!isValidPin(pin) || busy} onClick={unlockPin}>Unlock</Button>
        </div>}
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" onKeyDown={(event) => event.key === "Enter" && void unlockWithPassword()} />
        <Button className="w-full" disabled={!password || busy} onClick={unlockWithPassword}>{busy ? "Checking…" : "Unlock with password"}</Button>
      </DialogContent>
    </Dialog>
  </>;
};

export default AdminAppLock;
