import { useEffect, useState, lazy, Suspense, type ChangeEvent, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Trash2,
  ScanLine,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Hash,
  Calendar,
  UploadCloud,
  FileImage,
  FileVideo2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ToothSelect } from "./ClinicalSelectors";
import InvestigationWorkbench from "./InvestigationWorkbench";
import CbctVolumeViewer from "@/components/portal/CbctVolumeViewer";

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
  series_paths: string[] | null;
}

const TYPES = ["clinical", "intraoral", "cbct", "xray", "opg"];
const CATEGORIES = ["general", "orthodontics", "implants", "rct", "cosmetic", "pediatric", "surgery"];
const ACCEPTED_FILE_TYPES = "image/*,video/*,application/pdf,.dcm,.dicom,application/dicom";
const MAX_FILE_SIZE_MB = 200;

const formatUploadState = (fileName: string | null, totalCount: number) => {
  if (!fileName && !totalCount) return "Drop files here or click to browse";
  if (totalCount > 1) return `${totalCount} files selected for series upload`;
  return fileName ?? "File selected";
};

const validateFiles = (files: File[]) => {
  if (!files.length) return "Please choose files to upload";

  for (const file of files) {
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return `${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB upload limit.`;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed =
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type === "application/pdf" ||
      ext === "dcm" ||
      ext === "dicom";

    if (!allowed) {
      return `${file.name} is not supported. Use DICOM, image, video, or PDF files.`;
    }
  }

  return null;
};

const AdminInvestigations = ({ patientId }: { patientId: string }) => {
  const [items, setItems] = useState<Investigation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [seriesFiles, setSeriesFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [comparisonId, setComparisonId] = useState("");
  const [comparisonUrl, setComparisonUrl] = useState("");
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [seriesUrl, setSeriesUrl] = useState("");
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

  useEffect(() => {
    void fetchAll();
  }, [patientId]);

  useEffect(() => {
    (async () => {
      const need = items.filter((i) => !signed[i.id]);
      if (!need.length) return;

      const next: Record<string, string> = {};

      await Promise.all(
        need.map(async (i) => {
          if (i.url.startsWith("http")) {
            next[i.id] = i.url;
            return;
          }

          const { data } = await supabase.storage.from("patient-media").createSignedUrl(i.url, 3600);
          if (data?.signedUrl) next[i.id] = data.signedUrl;
        })
      );

      setSigned((s) => ({ ...s, ...next }));
    })();
  }, [items]);

  const handleFileSelection = (incomingFiles: File[]) => {
    const error = validateFiles(incomingFiles);

    if (error) {
      toast.error(error);
      return;
    }

    setSeriesFiles(incomingFiles.length > 1 ? incomingFiles : []);
    setFile(incomingFiles[0] ?? null);
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    handleFileSelection(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFileSelection(Array.from(event.dataTransfer.files ?? []));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file && !seriesFiles.length) {
      toast.error("Please choose files to upload");
      return;
    }

    setSaving(true);
    const files = seriesFiles.length ? seriesFiles : file ? [file] : [];
    const paths: string[] = [];

    for (const current of files) {
      const ext = current.name.split(".").pop()?.toLowerCase();
      const path = `investigations/${patientId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("patient-media").upload(path, current, {
        cacheControl: "3600",
        upsert: false,
      });

      if (upErr) {
        if (paths.length) {
          await supabase.storage.from("patient-media").remove(paths);
        }
        toast.error(upErr.message);
        setSaving(false);
        return;
      }

      paths.push(path);
    }

    const primary = files[0];
    const ext = primary.name.split(".").pop()?.toLowerCase();
    const isDicom = primary.type === "application/dicom" || ext === "dcm" || ext === "dicom";
    const mediaType = isDicom
      ? "dicom"
      : primary.type.startsWith("video")
        ? "video"
        : primary.type.startsWith("image")
          ? "image"
          : "pdf";

    const { error } = await supabase.from("patient_investigations").insert({
      patient_id: patientId,
      title: form.title,
      description: form.description || null,
      investigation_type: form.investigation_type,
      procedure_category: form.procedure_category,
      tooth_number: form.tooth_number || null,
      taken_on: form.taken_on || null,
      is_visible_to_patient: form.is_visible_to_patient,
      url: paths[0],
      media_type: mediaType,
      series_paths: paths.length > 1 ? paths : null,
      is_series: paths.length > 1,
    });

    setSaving(false);

    if (error) {
      await supabase.storage.from("patient-media").remove(paths);
      toast.error(error.message);
      return;
    }

    toast.success("Investigation added");
    setShowAdd(false);
    setFile(null);
    setSeriesFiles([]);
    setForm({
      title: "",
      description: "",
      investigation_type: "clinical",
      procedure_category: "general",
      tooth_number: "",
      taken_on: "",
      is_visible_to_patient: true,
    });
    void fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investigation?")) return;

    const { error } = await supabase.from("patient_investigations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    setOpenIndex(null);
    void fetchAll();
  };

  const toggleVisibility = async (it: Investigation) => {
    const { error } = await supabase
      .from("patient_investigations")
      .update({ is_visible_to_patient: !it.is_visible_to_patient })
      .eq("id", it.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setItems((list) =>
      list.map((i) => (i.id === it.id ? { ...i, is_visible_to_patient: !i.is_visible_to_patient } : i))
    );
  };

  const selected = openIndex != null ? items[openIndex] : null;
  const url = selected && seriesIndex > 0 ? seriesUrl : selected ? signed[selected.id] : undefined;

  const isDicom =
    selected
      ? selected.media_type === "dicom" || /\.dcm($|\?)/i.test(selected.url) || selected.investigation_type === "cbct"
      : false;

  useEffect(() => {
    let cancelled = false;
    const path = items.find((i) => i.id === comparisonId)?.url;

    if (!path) {
      setComparisonUrl("");
      return;
    }

    if (path.startsWith("http")) {
      setComparisonUrl(path);
      return;
    }

    void supabase.storage
      .from("patient-media")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setComparisonUrl(data?.signedUrl ?? "");
      });

    return () => {
      cancelled = true;
    };
  }, [comparisonId, items]);

  useEffect(() => {
    setSeriesIndex(0);
    setSeriesUrl("");
    setComparisonId("");
  }, [selected?.id]);

  useEffect(() => {
    let active = true;
    setSeriesUrl("");

    const path = selected?.series_paths?.[seriesIndex];

    if (!path || seriesIndex === 0) return;
    if (path.startsWith("http")) {
      setSeriesUrl(path);
      return;
    }

    void supabase.storage.from("patient-media").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!active) return;

      if (error) {
        toast.error("Could not open this image in the series");
      }

      setSeriesUrl(data?.signedUrl ?? "");
    });

    return () => {
      active = false;
    };
  }, [selected?.id, seriesIndex]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-primary" /> Investigations & Imaging
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Upload
        </Button>
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                  {it.investigation_type}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted capitalize">
                  {it.procedure_category}
                </span>
                {!it.is_visible_to_patient && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">hidden</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-full text-center py-4">No investigations yet.</p>
        )}
      </div>

      <Dialog open={openIndex != null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="text-base pr-6">{selected.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                    {selected.investigation_type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-muted capitalize">
                    {selected.procedure_category}
                  </span>
                  {selected.tooth_number && (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Tooth {selected.tooth_number}
                    </span>
                  )}
                  {selected.taken_on && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selected.taken_on}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      selected.is_visible_to_patient ? "bg-primary/10 text-primary" : "bg-muted"
                    }`}
                  >
                    {selected.is_visible_to_patient ? "Shared with patient" : "Not shared"}
                  </span>
                </div>
              </DialogHeader>

              {isDicom && url ? (
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                  <DicomViewer key={url} url={url} />
                </Suspense>
              ) : selected.media_type === "image" && url ? (
                <div className={comparisonUrl ? "grid grid-cols-1 md:grid-cols-2 gap-2" : ""}>
                  <InvestigationWorkbench
                    key={`${selected.id}:${seriesIndex}`}
                    investigationId={selected.id}
                    frameIndex={seriesIndex}
                    url={url}
                    title={selected.title}
                  />
                  {comparisonUrl && (
                    <div>
                      <p className="p-2 text-sm">Comparison</p>
                      <img
                        src={comparisonUrl}
                        alt="Comparison investigation"
                        className="w-full h-[55vh] object-contain bg-foreground"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-foreground flex items-center justify-center max-h-[70vh] overflow-auto">
                  {!url ? (
                    <div className="py-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : selected.media_type === "image" ? (
                    <img src={url} alt={selected.title} className="max-w-full max-h-[70vh] object-contain" />
                  ) : selected.media_type === "video" ? (
                    <video src={url} controls className="max-w-full max-h-[70vh]" />
                  ) : (
                    <iframe src={url} className="w-full h-[70vh] bg-background" title={selected.title} />
                  )}
                </div>
              )}

              <div className="p-4 space-y-3">
                {(selected.series_paths?.length ?? 0) > 1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Previous image in series"
                      disabled={seriesIndex === 0}
                      onClick={() => setSeriesIndex((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <span className="text-xs text-muted-foreground flex-1 text-center">
                      Slice {seriesIndex + 1} of {selected.series_paths?.length ?? 1}
                    </span>

                    <Button
                      size="icon"
                      variant="outline"
                      title="Next image in series"
                      disabled={seriesIndex >= (selected.series_paths?.length ?? 1) - 1}
                      onClick={() => setSeriesIndex((i) => Math.min((selected.series_paths?.length ?? 1) - 1, i + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {selected.media_type === "image" && (
                  <select
                    aria-label="Compare with investigation"
                    className="w-full border border-input bg-background rounded-md p-2 text-sm"
                    value={comparisonId}
                    onChange={(e) => setComparisonId(e.target.value)}
                  >
                    <option value="">Compare with another investigation</option>
                    {items.filter((item) => item.id !== selected.id).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                )}

                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={openIndex === 0} onClick={() => setOpenIndex((i) => (i ?? 0) - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={openIndex === items.length - 1} onClick={() => setOpenIndex((i) => (i ?? 0) + 1)}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleVisibility(selected)}>
                    {selected.is_visible_to_patient ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" /> Hide from patient
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" /> Share with patient
                      </>
                    )}
                  </Button>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ml-1"
                    >
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Investigation</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-3">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <input
                id="investigation-upload"
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={handleUploadChange}
              />
              <label htmlFor="investigation-upload" className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <UploadCloud className="h-7 w-7 text-primary" />
                <span className="font-medium text-foreground">{formatUploadState(file?.name ?? null, seriesFiles.length)}</span>
                <span className="text-xs">Supports DICOM, image, video, and PDF files up to {MAX_FILE_SIZE_MB}MB</span>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1">
                    <FileImage className="h-3 w-3" /> Images
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1">
                    <FileVideo2 className="h-3 w-3" /> Video
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1">
                    <FileText className="h-3 w-3" /> PDF
                  </span>
                </div>
              </label>
            </div>

            <Input placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.investigation_type} onChange={(e) => setForm({ ...form, investigation_type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
              <select className="border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.procedure_category} onChange={(e) => setForm({ ...form, procedure_category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ToothSelect value={form.tooth_number} onValueChange={(tooth_number) => setForm({ ...form, tooth_number })} />
              <Input type="date" value={form.taken_on} onChange={(e) => setForm({ ...form, taken_on: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_visible_to_patient}
                onChange={(e) => setForm({ ...form, is_visible_to_patient: e.target.checked })}
              />
              Visible to patient in portal
            </label>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Uploading..." : "Upload"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvestigations;
