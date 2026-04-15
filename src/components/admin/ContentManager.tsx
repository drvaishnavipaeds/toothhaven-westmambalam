import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  title_ta: string | null;
  content: string | null;
  content_ta: string | null;
  content_type: string;
  is_active: boolean;
  image_url: string | null;
}

const ContentManager = () => {
  const [items, setItems] = useState<Content[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState({ title: "", title_ta: "", content: "", content_ta: "", content_type: "announcement", image_url: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchContent = async () => {
    const { data } = await supabase.from("clinic_content").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchContent(); }, []);

  const openEdit = (item: Content) => {
    setEditing(item);
    setForm({ title: item.title, title_ta: item.title_ta || "", content: item.content || "", content_ta: item.content_ta || "", content_type: item.content_type, image_url: item.image_url || "" });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { title: form.title, title_ta: form.title_ta || null, content: form.content || null, content_ta: form.content_ta || null, content_type: form.content_type, image_url: form.image_url || null };
    if (editing) {
      await supabase.from("clinic_content").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("clinic_content").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ title: "", title_ta: "", content: "", content_ta: "", content_type: "announcement", image_url: "" });
    fetchContent();
    toast({ title: editing ? "Content updated" : "Content added" });
  };

  const toggleActive = async (item: Content) => {
    await supabase.from("clinic_content").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchContent();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("clinic_content").delete().eq("id", id);
    fetchContent();
    toast({ title: "Content deleted" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">Content Management</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", title_ta: "", content: "", content_ta: "", content_type: "announcement", image_url: "" }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Content
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.content_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {item.title_ta && <p className="text-xs text-muted-foreground">{item.title_ta}</p>}
                {item.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive(item)} className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground">
                  {item.is_active ? "Hide" : "Show"}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No content yet.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Content" : "Add Content"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
              <option value="announcement">Announcement</option>
              <option value="service">Service</option>
              <option value="testimonial">Testimonial</option>
              <option value="consultant">Visiting Consultant</option>
            </select>
            <Input placeholder="Title (English) *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Title (Tamil)" value={form.title_ta} onChange={e => setForm({ ...form, title_ta: e.target.value })} />
            <Textarea placeholder="Content (English)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            <Textarea placeholder="Content (Tamil)" value={form.content_ta} onChange={e => setForm({ ...form, content_ta: e.target.value })} />
            <Input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : (editing ? "Update" : "Add")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManager;
