import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Upload, Eye, EyeOff, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { services } from "@/data/services";
import type { ClinicVideo } from "@/components/ClinicVideoPlayer";

// clinic_videos is created by migration; cast keeps typecheck green before types regenerate.
const videosTable = () => (supabase.from as any)("clinic_videos");

const KINDS = [
  { id: "service", label: "Service video (shows on that service's page)" },
  { id: "tutorial", label: "Tutorial (patient education)" },
  { id: "before_after", label: "Before & After" },
] as const;

const empty = {
  kind: "tutorial" as ClinicVideo["kind"],
  service_slug: "",
  title_en: "",
  title_ta: "",
  description_en: "",
  description_ta: "",
  video_url: "",
  source: "upload" as ClinicVideo["source"],
  captions_en: "",
  captions_ta: "",
};

const VideosManager = () => {
  const [items, setItems] = useState<ClinicVideo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClinicVideo | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload("clinic-media");

  const fetchAll = async () => {
    const { data } = await videosTable().select("*").order("sort_order").order("created_at", { ascending: false });
    if (data) setItems(data as ClinicVideo[]);
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (it: ClinicVideo) => {
    setEditing(it);
    setForm({
      kind: it.kind,
      service_slug: it.service_slug || "",
      title_en: it.title_en,
      title_ta: it.title_ta || "",
      description_en: it.description_en || "",
      description_ta: it.description_ta || "",
      video_url: it.video_url,
      source: it.source,
      captions_en: it.captions_en || "",
      captions_ta: it.captions_ta || "",
    });
    setShowForm(true);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, "clinic-videos");
    if (url) setForm((f) => ({ ...f, video_url: url, source: "upload" }));
    e.target.value = "";
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.video_url) {
      toast({ title: "Add a video", description: "Upload a video file or paste a YouTube link.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      kind: form.kind,
      service_slug: form.kind === "service" && form.service_slug ? form.service_slug : null,
      title_en: form.title_en,
      title_ta: form.title_ta || null,
      description_en: form.description_en || null,
      description_ta: form.description_ta || null,
      video_url: form.video_url,
      source: form.source,
      captions_en: form.captions_en || null,
      captions_ta: form.captions_ta || null,
    };
    const { error } = editing
      ? await videosTable().update(payload).eq("id", editing.id)
      : await videosTable().insert({ ...payload, sort_order: items.length });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    fetchAll();
    toast({ title: editing ? "Video updated" : "Video added" });
  };

  const togglePublished = async (it: ClinicVideo) => {
    await videosTable().update({ is_published: !it.is_published }).eq("id", it.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await videosTable().delete().eq("id", id);
    fetchAll();
    toast({ title: "Deleted" });
  };

  const kindLabel = (k: ClinicVideo["kind"]) => KINDS.find((x) => x.id === k)?.label.split(" (")[0] ?? k;
  const serviceLabel = (slug: string | null) => services.find((s) => s.slug === slug)?.en ?? slug ?? "";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Patient Education Videos</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Video
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-foreground">{it.title_en}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{kindLabel(it.kind)}</span>
                  {it.service_slug && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{serviceLabel(it.service_slug)}</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {it.source === "youtube" ? "YouTube" : "Uploaded"}
                  </span>
                  {!it.is_published && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Hidden</span>
                  )}
                </div>
                {it.description_en && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description_en}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => togglePublished(it)} className="p-1.5 rounded hover:bg-muted" title={it.is_published ? "Hide from patients" : "Show to patients"}>
                  {it.is_published ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => remove(it.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            No videos yet. Add your first patient education video.
          </p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Video" : "Add Video"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Where should this video appear?</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as ClinicVideo["kind"] })}
              >
                {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            {form.kind === "service" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Service</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  value={form.service_slug}
                  onChange={(e) => setForm({ ...form, service_slug: e.target.value })}
                  required
                >
                  <option value="">Choose a service…</option>
                  {services.map((s) => <option key={s.slug} value={s.slug}>{s.en}</option>)}
                </select>
              </div>
            )}
            <Input placeholder="Title (English) *" required value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            <Input placeholder="Title (Tamil)" value={form.title_ta} onChange={(e) => setForm({ ...form, title_ta: e.target.value })} />
            <Textarea placeholder="Description (English)" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
            <Textarea placeholder="Description (Tamil)" value={form.description_ta} onChange={(e) => setForm({ ...form, description_ta: e.target.value })} />

            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><Film className="w-3.5 h-3.5" /> Video</p>
              <div className="flex gap-2">
                <label className="cursor-pointer flex-1">
                  <input type="file" accept="video/*" className="hidden" onChange={onFile} disabled={uploading} />
                  <span className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                    <Upload className="w-3 h-3" /> {uploading ? "Uploading…" : "Upload video"}
                  </span>
                </label>
              </div>
              <Input
                placeholder="…or paste a YouTube link"
                value={form.source === "youtube" ? form.video_url : ""}
                onChange={(e) => setForm({ ...form, video_url: e.target.value, source: "youtube" })}
              />
              {form.video_url && (
                <p className="text-xs text-muted-foreground break-all">
                  {form.source === "youtube" ? "YouTube: " : "Uploaded: "}{form.video_url}
                </p>
              )}
            </div>

            <Textarea placeholder="Captions (English) — shown when the viewer taps CC" value={form.captions_en} onChange={(e) => setForm({ ...form, captions_en: e.target.value })} />
            <Textarea placeholder="Captions (Tamil)" value={form.captions_ta} onChange={(e) => setForm({ ...form, captions_ta: e.target.value })} />

            <Button type="submit" className="w-full" disabled={saving || uploading}>
              {saving ? "Saving…" : editing ? "Update" : "Add video"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosManager;
