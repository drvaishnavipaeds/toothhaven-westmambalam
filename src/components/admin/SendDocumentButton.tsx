import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** One-tap: builds the branded PDF on the server and sends it to the patient's WhatsApp. */
const SendDocumentButton = ({ kind, id }: { kind: "invoice" | "prescription"; id: string }) => {
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("patient-document-send", { body: { kind, id } });
    setBusy(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = (await error.context.json())?.error ?? msg; } catch { /* keep default */ }
      }
      toast.error(msg);
      return;
    }
    if (data?.ok) toast.success(`PDF sent to the patient on WhatsApp`);
  };
  return (
    <Button variant="ghost" size="icon" onClick={send} disabled={busy} title="Send to patient on WhatsApp" aria-label="Send to patient on WhatsApp">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 text-primary" />}
    </Button>
  );
};

export default SendDocumentButton;
