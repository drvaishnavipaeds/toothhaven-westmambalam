import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, ScanLine, Camera, X, Calendar, Hash, Download } from "lucide-react";
import DicomViewer from "./DicomViewer";

interface Investigation {
  id: string;
  patient_id: string;
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
  created_at: string;
}

const TYPE_META: Record<string, { en: string; ta: string; icon: any }> = {
  cbct: { en: "CBCT", ta: "CBCT", icon: ScanLine },
  intraoral: { en: "Intraoral", ta: "வாய்க்குள்", icon: Camera },
  clinical: { en: "Clinical", ta: "மருத்துவ", icon: FileImage },
  xray: { en: "X-Ray", ta: "எக்ஸ்-ரே", icon: ScanLine },
  opg: { en: "OPG", ta: "OPG", icon: ScanLine },
};

const PROCEDURES = ["all", "orthodontics", "implants", "rct", "cosmetic", "pediatric", "surgery", "general"] as const;

const InvestigationsViewer = ({ patientId }: { patientId: string }) => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<Investigation | null>(null);

  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_investigations")
        .select("*")
        .eq("patient_id", patientId)
        .eq("is_visible_to_patient", true)
        .order("taken_on", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      const list = data || [];
      setItems(list);
      const urls: Record<string, string> = {};
      await Promise.all(list.map(async (i) => {
        if (i.url.startsWith("http")) { urls[i.id] = i.url; return; }
        const { data: s } = await supabase.storage.from("patient-media").createSignedUrl(i.url, 3600);
        if (s?.signedUrl) urls[i.id] = s.signedUrl;
      }));
      setSigned(urls);
      setLoading(false);
    })();
  }, [patientId]);

  const types = useMemo(() => {
    const set = new Set(items.map(i => i.investigation_type));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = items.filter(i =>
    (activeType === "all" || i.investigation_type === activeType) &&
    (activeCategory === "all" || i.procedure_category === activeCategory)
  );

  const groupedByCategory = useMemo(() => {
    const map: Record<string, Investigation[]> = {};
    filtered.forEach(i => {
      (map[i.procedure_category] ||= []).push(i);
    });
    return map;
  }, [filtered]);

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <ScanLine className="w-5 h-5 text-primary" />
        {lang === "en" ? "Investigations & Imaging" : "ஆய்வுகள் & படங்கள்"}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {lang === "en"
          ? "CBCT, intraoral & clinical photos shared by your dentist"
          : "உங்கள் பல் மருத்துவர் பகிர்ந்த CBCT, வாய்க்குள் & மருத்துவ படங்கள்"}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <FileImage className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {lang === "en" ? "No investigations shared yet" : "இதுவரை எந்த ஆய்வுகளும் பகிரப்படவில்லை"}
          </p>
        </div>
      ) : (
        <>
          {/* Type tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
            {types.map(t => {
              const meta = TYPE_META[t];
              const label = t === "all" ? (lang === "en" ? "All" : "அனைத்தும்") : (lang === "en" ? meta?.en ?? t : meta?.ta ?? t);
              const Icon = meta?.icon;
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {PROCEDURES.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] capitalize border transition-colors ${
                  activeCategory === c
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {c === "all" ? (lang === "en" ? "All procedures" : "அனைத்து சிகிச்சைகள்") : c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {lang === "en" ? "No images for this filter" : "இந்த வடிகட்டிக்கு படங்கள் இல்லை"}
            </p>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedByCategory).map(([cat, list]) => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
                    {cat} <span className="text-muted-foreground/60">({list.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {list.map(item => {
                      const Icon = TYPE_META[item.investigation_type]?.icon ?? FileImage;
                      const isImage = item.media_type === "image";
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelected(item)}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary transition-all text-left"
                        >
                          {isImage ? (
                            <img
                              src={signed[item.id] || item.thumbnail_url || ""}
                              alt={item.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Icon className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/85 backdrop-blur text-[10px] font-medium">
                            <Icon className="w-3 h-3" />
                            {lang === "en" ? TYPE_META[item.investigation_type]?.en ?? item.investigation_type : TYPE_META[item.investigation_type]?.ta ?? item.investigation_type}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white">
                            <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                            {item.taken_on && <p className="text-[10px] opacity-80">{item.taken_on}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="flex items-center gap-2 text-base pr-6">
                  {selected.title}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                    {TYPE_META[selected.investigation_type]?.en ?? selected.investigation_type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{selected.procedure_category}</span>
                  {selected.tooth_number && (
                    <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />Tooth {selected.tooth_number}</span>
                  )}
                  {selected.taken_on && (
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{selected.taken_on}</span>
                  )}
                </div>
              </DialogHeader>
              {(() => {
                const url = signed[selected.id];
                const isDicom = selected.media_type === "dicom" || /\.dcm($|\?)/i.test(selected.url) || selected.investigation_type === "cbct";
                if (isDicom && url) return <DicomViewer url={url} />;
                return (
                  <div className="bg-black flex items-center justify-center max-h-[70vh] overflow-auto">
                    {selected.media_type === "image" ? (
                      <img src={url} alt={selected.title} className="max-w-full max-h-[70vh] object-contain" />
                    ) : selected.media_type === "video" ? (
                      <video src={url} controls className="max-w-full max-h-[70vh]" />
                    ) : (
                      <iframe src={url} className="w-full h-[70vh] bg-white" title={selected.title} />
                    )}
                  </div>
                );
              })()}
              {(selected.description || signed[selected.id]) && (
                <div className="p-4 space-y-3">
                  {selected.description && (
                    <p className="text-sm text-muted-foreground">{selected.description}</p>
                  )}
                  <a
                    href={signed[selected.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    {lang === "en" ? "Open / Download" : "திற / பதிவிறக்கு"}
                  </a>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default InvestigationsViewer;
