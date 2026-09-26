import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const IDLE_MS = 15 * 60 * 1000;

const AdminAppLock = () => {
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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

  return <>
    <Dialog open={locked} onOpenChange={() => undefined}>
      <DialogContent className="max-w-sm" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" />Admin app locked</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Your clinical workspace locked after 15 minutes of inactivity.</p>
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" onKeyDown={(event) => event.key === "Enter" && void unlockWithPassword()} />
        <Button className="w-full" disabled={!password || busy} onClick={unlockWithPassword}>{busy ? "Checking…" : "Unlock with password"}</Button>
      </DialogContent>
    </Dialog>
  </>;
};

export default AdminAppLock;