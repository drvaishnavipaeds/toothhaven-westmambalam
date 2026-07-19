import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Image as ImageIcon, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { WorkflowBadge, WorkflowActions, WorkflowStatus } from "./WorkflowControls";

const CATEGORIES = ["orthodontics", "implants", "cosmetic", "rct", "pediatric", "smile_design", "general"];

interface CaseStudy {
  id: string;
  category: string;
  title: string;
  title_ta: string | null;
  summary: string | null;
  summary_ta: string | null;
  treatment_duration: string | null;
  anonymization_level: string;
  is_featured: boolean;
  is_published: boolean;
  workflow_status: WorkflowStatus;
}

interface Media {
  id: string;
  case_study_id: string;
  media_type: string;
  stage: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

const empty = { category: "general", title: "", title_ta: "", summary: "", summary_ta: "", treatment_duration: "", anonymization_level: "anonymized" };

const CaseStudiesManager = () => {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CaseStudy | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mediaDialog, setMediaDialog] = useState<CaseStudy | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload("clinic-media");

  const fetchAll = async () => {
    const { data } = await supabase.from("case_studies").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchMedia = async (id: string) => {
    const { data } = await supabase.from("case_study_media").select("*").eq("case_study_id", id).order("sort_order");
    if (data) setMedia(data);
  };

  const openEdit = (it: CaseStudy) => {
    setEditing(it);
    setForm({
      category: it.category,
      title: it.title,
      title_ta: it.title_ta || "",
      summary: it.summary || "",
      summary_ta: it.summary_ta || "",
      treatment_duration: it.treatment_duration || "",
      anonymization_level: it.anonymization_level,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      category: form.category,
      title: form.title,
      title_ta: form.title_ta || null,
      summary: form.summary || null,
      summary_ta: form.summary_ta || null,
      treatment_duration: form.treatment_duration || null,
      anonymization_level: form.anonymization_level,
    };
    if (editing) {
      await supabase.from("case_studies").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("case_studies").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    fetchAll();
    toast({ title: editing ? "Case study updated" : "Case study created" });
  };




  const toggleFeatured = async (it: CaseStudy) => {
    await supabase.from("case_studies").update({ is_featured: !it.is_featured }).eq("id", it.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this case study and all its media?")) return;
    await supabase.from("case_studies").delete().eq("id", id);
    fetchAll();
    toast({ title: "Deleted" });
  };

  const openMedia = async (it: CaseStudy) => {
    setMediaDialog(it);
    fetchMedia(it.id);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>, stage: "before" | "during" | "after") => {
    const file = e.target.files?.[0];
    if (!file || !mediaDialog) return;
    const url = await upload(file, `case-studies/${mediaDialog.id}`);
    if (!url) return;
    const isVideo = file.type.startsWith("video");
    await supabase.from("case_study_media").insert({
      case_study_id: mediaDialog.id,
      media_type: isVideo ? "video" : "image",
      stage,
      url,
      sort_order: media.length,
    });
    fetchMedia(mediaDialog.id);
    e.target.value = "";
  };

  const removeMedia = async (id: string) => {
    await supabase.from("case_study_media").delete().eq("id", id);
    if (mediaDialog) fetchMedia(mediaDialog.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Success Stories (Before/After)</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Case Study
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-foreground">{it.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{it.category.replace("_", " ")}</span>
                  {it.is_featured && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Featured</span>}
                  <WorkflowBadge status={it.workflow_status} />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{it.anonymization_level === "full_face" ? "Full Face" : "Anonymized"}</span>
                </div>
                {it.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.summary}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <WorkflowActions table="case_studies" id={it.id} status={it.workflow_status} onChanged={fetchAll} />
                <button onClick={() => openMedia(it)} className="p-1.5 rounded hover:bg-muted" title="Manage media"><ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => toggleFeatured(it)} className="p-1.5 rounded hover:bg-muted" title="Toggle featured"><Star className={`w-3.5 h-3.5 ${it.is_featured ? "fill-secondary text-secondary" : "text-muted-foreground"}`} /></button>
                <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => remove(it.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No case studies yet.</p>}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Case Study" : "New Case Study"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <Input placeholder="Title (English) *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Title (Tamil)" value={form.title_ta} onChange={e => setForm({ ...form, title_ta: e.target.value })} />
            <Textarea placeholder="Summary (English)" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
            <Textarea placeholder="Summary (Tamil)" value={form.summary_ta} onChange={e => setForm({ ...form, summary_ta: e.target.value })} />
            <Input placeholder="Treatment duration (e.g. 6 months, 3 visits)" value={form.treatment_duration} onChange={e => setForm({ ...form, treatment_duration: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Anonymization (DPDP/HIPAA)</label>
              <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.anonymization_level} onChange={e => setForm({ ...form, anonymization_level: e.target.value })}>
                <option value="anonymized">Anonymized (faces blurred/cropped)</option>
                <option value="full_face">Full face (signed consent on file)</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : (editing ? "Update" : "Create")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Media manager dialog */}
      <Dialog open={!!mediaDialog} onOpenChange={(o) => { if (!o) setMediaDialog(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader><DialogTitle>Media: {mediaDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(["before", "during", "after"] as const).map(stage => (
              <div key={stage}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold capitalize text-foreground">{stage}</h4>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={e => onFile(e, stage)} disabled={uploading} />
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                      <Upload className="w-3 h-3" /> {uploading ? "Uploading..." : "Add"}
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {media.filter(m => m.stage === stage).map(m => (
                    <div key={m.id} className="relative group rounded-lg overflow-hidden border border-border">
                      {m.media_type === "image" ? (
                        <img src={m.url} alt={stage} className="w-full h-24 object-cover" />
                      ) : (
                        <video src={m.url} className="w-full h-24 object-cover" />
                      )}
                      <button onClick={() => removeMedia(m.id)} className="absolute top-1 right-1 p-1 rounded bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                  {media.filter(m => m.stage === stage).length === 0 && (
                    <p className="col-span-3 text-xs text-muted-foreground text-center py-3">No {stage} media yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseStudiesManager;
