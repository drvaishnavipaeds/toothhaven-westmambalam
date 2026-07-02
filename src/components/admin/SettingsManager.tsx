import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const SettingsManager = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clinic_settings").select("*").limit(1).single();
      setSettings(data ?? {});
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!settings?.id) {
      const { data, error } = await supabase.from("clinic_settings").insert(settings).select().single();
      if (error) return toast.error(error.message);
      setSettings(data);
    } else {
      const { id, created_at, updated_at, ...patch } = settings;
      const { error } = await supabase.from("clinic_settings").update(patch).eq("id", id);
      if (error) return toast.error(error.message);
    }
    toast.success("Settings saved");
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  const set = (k: string, v: any) => setSettings({ ...settings, [k]: v });

  return (
    <div className="space-y-4 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Clinic profile & invoice preferences</p></div>
      <Card className="p-4 space-y-3">
        <div><Label>Clinic Name</Label><Input value={settings.clinic_name ?? ""} onChange={(e) => set("clinic_name", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Primary Phone</Label><Input value={settings.primary_phone ?? ""} onChange={(e) => set("primary_phone", e.target.value)} /></div>
          <div><Label>Primary Email</Label><Input value={settings.primary_email ?? ""} onChange={(e) => set("primary_email", e.target.value)} /></div>
        </div>
        <div><Label>Address</Label><Textarea value={settings.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div><Label>Working Hours</Label><Input value={settings.working_hours ?? ""} onChange={(e) => set("working_hours", e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Tax %</Label><Input type="number" value={settings.tax_percent ?? 0} onChange={(e) => set("tax_percent", Number(e.target.value))} /></div>
          <div><Label>Invoice Prefix</Label><Input value={settings.invoice_prefix ?? "TH-"} onChange={(e) => set("invoice_prefix", e.target.value)} /></div>
          <div><Label>Invoice Counter</Label><Input type="number" value={settings.invoice_counter ?? 1} onChange={(e) => set("invoice_counter", Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Notification Phone</Label><Input value={settings.notification_phone ?? ""} onChange={(e) => set("notification_phone", e.target.value)} /></div>
          <div><Label>Notification Email</Label><Input value={settings.notification_email ?? ""} onChange={(e) => set("notification_email", e.target.value)} /></div>
        </div>
        <Button onClick={save}>Save Settings</Button>
      </Card>
    </div>
  );
};

export default SettingsManager;
