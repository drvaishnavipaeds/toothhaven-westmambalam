import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Star, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { WorkflowBadge, WorkflowActions, WorkflowStatus } from "./WorkflowControls";

const CATEGORIES = ["orthodontics", "implants", "cosmetic", "rct", "pediatric", "smile_design", "home_visit", "general"];

interface Testimonial {
  id: string;
  patient_name: string;
  patient_name_ta: string | null;
  category: string;
  quote: string;
  quote_ta: string | null;
  video_url: string | null;
  rating: number;
  is_featured: boolean;
  is_published: boolean;
  workflow_status: WorkflowStatus;
}

const empty = { patient_name: "", patient_name_ta: "", category: "general", quote: "", quote_ta: "", video_url: "", rating: 5 };

const TestimonialsManager = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload("clinic-media");

  const fetchAll = async () => {
    const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (it: Testimonial) => {
    setEditing(it);
    setForm({
      patient_name: it.patient_name,
      patient_name_ta: it.patient_name_ta || "",
      category: it.category,
      quote: it.quote,
      quote_ta: it.quote_ta || "",
      video_url: it.video_url || "",
      rating: it.rating,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patient_name: form.patient_name,
      patient_name_ta: form.patient_name_ta || null,
      category: form.category,
      quote: form.quote,
      quote_ta: form.quote_ta || null,
      video_url: form.video_url || null,
      rating: form.rating,
    };
    if (editing) {
      await supabase.from("testimonials").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("testimonials").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    fetchAll();
    toast({ title: editing ? "Testimonial updated" : "Testimonial created" });
  };

  const togglePublish = async (it: Testimonial) => {
    await supabase.from("testimonials").update({ is_published: !it.is_published }).eq("id", it.id);
    fetchAll();
  };

  const toggleFeatured = async (it: Testimonial) => {
    await supabase.from("testimonials").update({ is_featured: !it.is_featured }).eq("id", it.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    fetchAll();
    toast({ title: "Deleted" });
  };

  const onVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, "testimonials");
    if (url) setForm({ ...form, video_url: url });
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Patient Testimonials</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Testimonial
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-foreground">{it.patient_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{it.category.replace("_", " ")}</span>
                  <div className="flex">{Array.from({ length: it.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-secondary text-secondary" />)}</div>
                  {it.video_url && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>}
                  {it.is_featured && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground">Featured</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${it.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {it.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{it.quote}"</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleFeatured(it)} className="p-1.5 rounded hover:bg-muted"><Star className={`w-3.5 h-3.5 ${it.is_featured ? "fill-secondary text-secondary" : "text-muted-foreground"}`} /></button>
                <button onClick={() => togglePublish(it)} className="p-1.5 rounded hover:bg-muted">
                  {it.is_published ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => remove(it.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No testimonials yet.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Testimonial" : "New Testimonial"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <Input placeholder="Patient name (English) *" required value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />
            <Input placeholder="Patient name (Tamil)" value={form.patient_name_ta} onChange={e => setForm({ ...form, patient_name_ta: e.target.value })} />
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <Textarea placeholder="Quote (English) *" required value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} />
            <Textarea placeholder="Quote (Tamil)" value={form.quote_ta} onChange={e => setForm({ ...form, quote_ta: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
              <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} stars</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Video testimonial (optional)</label>
              {form.video_url ? (
                <div className="flex items-center gap-2">
                  <video src={form.video_url} className="w-24 h-16 object-cover rounded" controls />
                  <button type="button" onClick={() => setForm({ ...form, video_url: "" })} className="text-xs text-destructive">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-input hover:bg-muted">
                  <input type="file" accept="video/*" className="hidden" onChange={onVideoUpload} disabled={uploading} />
                  <Upload className="w-3 h-3" /> {uploading ? "Uploading..." : "Upload video"}
                </label>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : (editing ? "Update" : "Create")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestimonialsManager;
