import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";

const TYPES = ["award", "certification", "milestone", "conference", "media", "partnership"];

interface Achievement {
  id: string;
  badge_type: string;
  title: string;
  title_ta: string | null;
  description: string | null;
  description_ta: string | null;
  achieved_on: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const empty = { badge_type: "milestone", title: "", title_ta: "", description: "", description_ta: "", achieved_on: "", image_url: "", sort_order: 0 };

const AchievementsManager = () => {
  const [items, setItems] = useState<Achievement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload("clinic-media");

  const fetchAll = async () => {
    const { data } = await supabase.from("achievements").select("*").order("sort_order").order("achieved_on", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (it: Achievement) => {
    setEditing(it);
    setForm({
      badge_type: it.badge_type,
      title: it.title,
      title_ta: it.title_ta || "",
      description: it.description || "",
      description_ta: it.description_ta || "",
      achieved_on: it.achieved_on || "",
      image_url: it.image_url || "",
      sort_order: it.sort_order,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      badge_type: form.badge_type,
      title: form.title,
      title_ta: form.title_ta || null,
      description: form.description || null,
      description_ta: form.description_ta || null,
      achieved_on: form.achieved_on || null,
      image_url: form.image_url || null,
      sort_order: Number(form.sort_order) || 0,
    };
    if (editing) {
      await supabase.from("achievements").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("achievements").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    fetchAll();
    toast({ title: editing ? "Achievement updated" : "Achievement created" });
  };

  const toggleActive = async (it: Achievement) => {
    await supabase.from("achievements").update({ is_active: !it.is_active }).eq("id", it.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this achievement?")) return;
    await supabase.from("achievements").delete().eq("id", id);
    fetchAll();
    toast({ title: "Deleted" });
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, "achievements");
    if (url) setForm({ ...form, image_url: url });
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Achievements & Awards</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Achievement
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Award className="w-6 h-6 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-foreground">{it.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{it.badge_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${it.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {it.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  {it.achieved_on && <p className="text-xs text-muted-foreground">{new Date(it.achieved_on).toLocaleDateString()}</p>}
                  {it.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{it.description}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive(it)} className="p-1.5 rounded hover:bg-muted">
                  {it.is_active ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => remove(it.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No achievements yet.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Achievement" : "New Achievement"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.badge_type} onChange={e => setForm({ ...form, badge_type: e.target.value })}>
              {TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <Input placeholder="Title (English) *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Title (Tamil)" value={form.title_ta} onChange={e => setForm({ ...form, title_ta: e.target.value })} />
            <Textarea placeholder="Description (English)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Textarea placeholder="Description (Tamil)" value={form.description_ta} onChange={e => setForm({ ...form, description_ta: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date achieved</label>
              <Input type="date" value={form.achieved_on} onChange={e => setForm({ ...form, achieved_on: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Badge image</label>
              {form.image_url ? (
                <div className="flex items-center gap-2">
                  <img src={form.image_url} alt="badge" className="w-16 h-16 object-cover rounded" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-input hover:bg-muted">
                  <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={uploading} />
                  <Upload className="w-3 h-3" /> {uploading ? "Uploading..." : "Upload image"}
                </label>
              )}
            </div>
            <Input type="number" placeholder="Sort order (lower = first)" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : (editing ? "Update" : "Create")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AchievementsManager;
