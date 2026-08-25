import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ScanLine, Loader2, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Hash, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const DicomViewer = lazy(() => import("@/components/portal/DicomViewer"));

export interface Investigation {
  id: string;
  investigation_type: string;
  procedure_category: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  media_type: string;
  tooth_number: string | null;
  taken_on: string | null;
  is_visible_to_patient: boolean;
}

const TYPES = ["clinical", "intraoral", "cbct", "xray", "opg"];
const CATEGORIES = ["general", "orthodontics", "implants", "rct", "cosmetic", "pediatric", "surgery"];

const AdminInvestigations = ({ patientId }: { patientId: string }) => {
  const [items, setItems] = useState<Investigation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    investigation_type: "clinical",
    procedure_category: "general",
    tooth_number: "",
    taken_on: "",
    is_visible_to_patient: true,
  });

  const fetchAll = async () => {
    const { data } = await supabase
      .from("patient_investigations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (data) setItems(data as Investigation[]);
  };

  useEffect(() => { fetchAll(); }, [patientId]);

  useEffect(() => {
    (async () => {
      const need = items.filter(i => !signed[i.id]);
      if (!need.length) return;
      const next: Record<string, string> = {};
      await Promise.all(need.map(async i => {
        if (i.url.startsWith("http")) { next[i.id] = i.url; return; }
        const { data } = await supabase.storage.from("patient-media").createSignedUrl(i.url, 3600);
        if (data?.signedUrl) next[i.id] = data.signedUrl;
      }));
      setSigned(s => ({ ...s, ...next }));
    })();
  }, [items]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose a file to upload"); return; }
    setSaving(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const path = `investigations/${patientId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("patient-media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); setSaving(false); return; }
    const isDicom = file.type === "application/dicom" || ext === "dcm" || ext === "dicom";
    const mediaType = isDicom ? "dicom" : file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "pdf";
    const { error } = await supabase.from("patient_investigations").insert({
      patient_id: patientId,
      title: form.title,
      description: form.description || null,
      investigation_type: form.investigation_type,
      procedure_category: form.procedure_category,
      tooth_number: form.tooth_number || null,
      taken_on: form.taken_on || null,
      is_visible_to_patient: form.is_visible_to_patient,
      url: path,
      media_type: mediaType,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Investigation added");
    setShowAdd(false);
    setFile(null);
    setForm({ title: "", description: "", investigation_type: "clinical", procedure_category: "general", tooth_number: "", taken_on: "", is_visible_to_patient: true });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investigation?")) return;
    const { error } = await supabase.from("patient_investigations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setOpenIndex(null);
    fetchAll();
  };

  const toggleVisibility = async (it: Investigation) => {
    const { error } = await supabase
      .from("patient_investigations")
      .update({ is_visible_to_patient: !it.is_visible_to_patient })
      .eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    setItems(list => list.map(i => (i.id === it.id ? { ...i, is_visible_to_patient: !i.is_visible_to_patient } : i)));
  };

  const selected = openIndex != null ? items[openIndex] : null;
  const url = selected ? signed[selected.id] : undefined;
  const isDicom = selected
    ? selected.media_type === "dicom" || /\.dcm($|\?)/i.test(selected.url) || selected.investigation_type === "cbct"
    : false;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-primary" /> Investigations & Imaging
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Upload</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it, idx) => (
          <div key={it.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(idx)}
              className="aspect-square bg-muted relative w-full group"
              title="Open viewer"
            >
              {it.media_type === "image" && signed[it.id] ? (
                <img src={signed[it.id]} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase">
                  {it.media_type}
                </div>
              )}
            </button>
            <div className="p-2">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-medium truncate">{it.title}</p>
                <button
                  onClick={() => handleDelete(it.id)}
                  className="p-1 rounded-md text-destructive hover:bg-destructive/10 shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{it.investigation_type}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted capitalize">{it.procedure_category}</span>
                {!it.is_visible_to_patient && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">hidden</span>}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-4">No investigations yet.</p>}
      </div>

      {/* Viewer */}
      <Dialog open={openIndex != null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="text-base pr-6">{selected.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">{selected.investigation_type}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{selected.procedure_category}</span>
                  {selected.tooth_number && <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />Tooth {selected.tooth_number}</span>}
                  {selected.taken_on && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{selected.taken_on}</span>}
                  <span className={`px-2 py-0.5 rounded-full ${selected.is_visible_to_patient ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                    {selected.is_visible_to_patient ? "Shared with patient" : "Not shared"}
                  </span>
                </div>
              </DialogHeader>

              {isDicom && url ? (
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                  <DicomViewer url={url} />
                </Suspense>
              ) : (
                <div className="bg-black flex items-center justify-center max-h-[70vh] overflow-auto">
                  {!url ? (
                    <div className="py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : selected.media_type === "image" ? (
                    <img src={url} alt={selected.title} className="max-w-full max-h-[70vh] object-contain" />
                  ) : selected.media_type === "video" ? (
                    <video src={url} controls className="max-w-full max-h-[70vh]" />
                  ) : (
                    <iframe src={url} className="w-full h-[70vh] bg-white" title={selected.title} />
                  )}
                </div>
              )}

              <div className="p-4 space-y-3">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={openIndex === 0} onClick={() => setOpenIndex(i => (i ?? 0) - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={openIndex === items.length - 1} onClick={() => setOpenIndex(i => (i ?? 0) + 1)}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleVisibility(selected)}>
                    {selected.is_visible_to_patient ? <><EyeOff className="w-4 h-4 mr-1" /> Hide from patient</> : <><Eye className="w-4 h-4 mr-1" /> Share with patient</>}
                  </Button>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ml-1">
                      <Download className="w-4 h-4" /> Open / Download
                    </a>
                  )}
                  <Button size="sm" variant="destructive" className="ml-auto" onClick={() => handleDelete(selected.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Investigation</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input type="file" accept="image/*,video/*,application/pdf,.dcm,.dicom,application/dicom" onChange={e => setFile(e.target.files?.[0] || null)} required />
            <Input placeholder="Title *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.investigation_type} onChange={e => setForm({ ...form, investigation_type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.procedure_category} onChange={e => setForm({ ...form, procedure_category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tooth #" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} />
              <Input type="date" value={form.taken_on} onChange={e => setForm({ ...form, taken_on: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_visible_to_patient} onChange={e => setForm({ ...form, is_visible_to_patient: e.target.checked })} />
              Visible to patient in portal
            </label>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Uploading..." : "Upload"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvestigations;
