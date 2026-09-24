import { useEffect, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToothSelect } from "./ClinicalSelectors";
import { toast } from "sonner";

interface TimelineItem { id: string; stage: string; tooth_number: string | null; storage_path: string; caption: string | null; taken_on: string; }

const PatientTimeline = ({ patientId }: { patientId: string }) => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ stage: "before", tooth_number: "", caption: "", taken_on: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const { data, error } = await supabase.from("treatment_timeline_media").select("*").eq("patient_id", patientId).order("taken_on", { ascending: false });
    if (error) return toast.error(error.message);
    setItems((data ?? []) as TimelineItem[]);
    const signed: Record<string, string> = {};
    await Promise.all((data ?? []).map(async (item) => {
      const { data: result } = await supabase.storage.from("patient-media").createSignedUrl(item.storage_path, 3600);
      if (result?.signedUrl) signed[item.id] = result.signedUrl;
    }));
    setUrls(signed);
  };
  useEffect(() => { void load(); }, [patientId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return toast.error("Choose a clinical image");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `timelines/${patientId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("patient-media").upload(path, file);
    if (uploadError) return toast.error(uploadError.message);
    const { error } = await supabase.from("treatment_timeline_media").insert({ patient_id: patientId, storage_path: path, ...form, tooth_number: form.tooth_number || null, caption: form.caption || null });
    if (error) return toast.error(error.message);
    setOpen(false); setFile(null); void load();
  };

  const remove = async (item: TimelineItem) => {
    if (!confirm("Delete this timeline photo?")) return;
    await supabase.storage.from("patient-media").remove([item.storage_path]);
    await supabase.from("treatment_timeline_media").delete().eq("id", item.id);
    void load();
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h3 className="font-bold text-foreground">Before & after timeline</h3><p className="text-xs text-muted-foreground">Private clinical progress by date and tooth.</p></div><Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Add photo</Button></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item) => <div key={item.id} className="overflow-hidden rounded-md border border-border bg-card">
      <div className="aspect-square bg-muted">{urls[item.id] ? <img src={urls[item.id]} alt={item.caption || item.stage} className="h-full w-full object-cover" /> : <Camera className="m-auto h-full w-8 text-muted-foreground" />}</div>
      <div className="p-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold capitalize text-primary">{item.stage}</span><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div><p className="text-xs text-foreground">{item.caption || "Clinical photo"}</p><p className="text-[11px] text-muted-foreground">{item.taken_on}{item.tooth_number ? ` · Tooth ${item.tooth_number}` : ""}</p></div>
    </div>)}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add timeline photo</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3">
      <Input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}><option value="before">Before</option><option value="progress">Progress</option><option value="after">After</option></select>
      <ToothSelect value={form.tooth_number} onValueChange={(tooth_number) => setForm({ ...form, tooth_number })} />
      <Input type="date" value={form.taken_on} onChange={(event) => setForm({ ...form, taken_on: event.target.value })} />
      <Input placeholder="Caption" value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} />
      <Button type="submit" className="w-full">Save photo</Button>
    </form></DialogContent></Dialog>
  </div>;
};

export default PatientTimeline;