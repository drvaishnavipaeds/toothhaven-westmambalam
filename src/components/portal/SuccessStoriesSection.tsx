import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

const CATEGORIES = [
  { id: "all", en: "All", ta: "அனைத்தும்" },
  { id: "orthodontics", en: "Orthodontics", ta: "பல் சீரமைப்பு" },
  { id: "implants", en: "Implants", ta: "பல் பொருத்துதல்" },
  { id: "cosmetic", en: "Cosmetic", ta: "அழகியல்" },
  { id: "rct", en: "Root Canal", ta: "வேர் கால்வாய்" },
  { id: "smile_design", en: "Smile Design", ta: "புன்னகை வடிவமைப்பு" },
  { id: "pediatric", en: "Pediatric", ta: "குழந்தை" },
];

interface CaseStudy {
  id: string;
  category: string;
  title: string;
  title_ta: string | null;
  summary: string | null;
  summary_ta: string | null;
  treatment_duration: string | null;
  is_featured: boolean;
}
interface Media { id: string; case_study_id: string; stage: string; url: string; media_type: string; }

const SuccessStoriesSection = () => {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [stories, setStories] = useState<CaseStudy[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, Media[]>>({});
  const [selected, setSelected] = useState<{ story: CaseStudy; media: Media[] } | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  const fetchStories = async () => {
    const { data: cs } = await supabase
      .from("case_studies")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (!cs) return;
    setStories(cs);
    const ids = cs.map(c => c.id);
    if (ids.length === 0) return;
    const { data: m } = await supabase
      .from("case_study_media")
      .select("*")
      .in("case_study_id", ids)
      .order("sort_order");
    if (m) {
      const map: Record<string, Media[]> = {};
      m.forEach(item => {
        if (!map[item.case_study_id]) map[item.case_study_id] = [];
        map[item.case_study_id].push(item);
      });
      setMediaMap(map);
    }
  };

  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel("case-studies-portal")
      .on("postgres_changes", { event: "*", schema: "public", table: "case_studies" }, fetchStories)
      .on("postgres_changes", { event: "*", schema: "public", table: "case_study_media" }, fetchStories)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === "all" ? stories : stories.filter(s => s.category === filter);

  const cover = (id: string) => {
    const m = mediaMap[id] || [];
    return m.find(x => x.stage === "after") || m[0];
  };

  const open = (story: CaseStudy) => {
    setSelected({ story, media: mediaMap[story.id] || [] });
    setStageIndex(0);
  };

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">{lang === "en" ? "Success Stories" : "வெற்றிக் கதைகள்"}</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full transition-colors ${
              filter === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {lang === "en" ? c.en : c.ta}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          {lang === "en" ? "No stories yet in this category." : "இந்த வகையில் கதைகள் இல்லை."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(story => {
            const c = cover(story.id);
            return (
              <button
                key={story.id}
                onClick={() => open(story)}
                className="text-left rounded-xl overflow-hidden border border-border bg-background hover:shadow-card transition-shadow"
              >
                <div className="aspect-square bg-muted relative">
                  {c ? (
                    c.media_type === "video" ? (
                      <video src={c.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={c.url} alt={story.title} loading="lazy" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                  {story.is_featured && (
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                      ★ {lang === "en" ? "Featured" : "சிறப்பு"}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{lang === "en" ? story.title : (story.title_ta || story.title)}</p>
                  {story.treatment_duration && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" /> {story.treatment_duration}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Story detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate">{lang === "en" ? selected.story.title : (selected.story.title_ta || selected.story.title)}</h4>
                {selected.story.treatment_duration && (
                  <p className="text-xs text-muted-foreground">{selected.story.treatment_duration}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-muted shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              {selected.media.length > 0 ? (
                <div className="space-y-3">
                  {(["before", "during", "after"] as const).map(stage => {
                    const items = selected.media.filter(m => m.stage === stage);
                    if (items.length === 0) return null;
                    return (
                      <div key={stage}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {lang === "en"
                            ? (stage === "before" ? "Before" : stage === "during" ? "During Treatment" : "After")
                            : (stage === "before" ? "முன்" : stage === "during" ? "சிகிச்சையின் போது" : "பின்")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map(m => (
                            m.media_type === "video"
                              ? <video key={m.id} src={m.url} controls className="w-full rounded-lg" />
                              : <img key={m.id} src={m.url} alt={stage} loading="lazy" className="w-full rounded-lg object-cover" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">No media yet</p>
              )}
              {selected.story.summary && (
                <p className="text-sm text-foreground/80 mt-4 leading-relaxed">
                  {lang === "en" ? selected.story.summary : (selected.story.summary_ta || selected.story.summary)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SuccessStoriesSection;
