import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, Clock, X, Share2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [loading, setLoading] = useState(true);

  const fetchStories = async () => {
    const { data: cs } = await supabase
      .from("case_studies")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (!cs) { setLoading(false); return; }
    setStories(cs);
    const ids = cs.map(c => c.id);
    if (ids.length === 0) { setLoading(false); return; }
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
    setLoading(false);
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
  const featured = stories.find(s => s.is_featured);
  const gridStories = filtered.filter(s => !featured || s.id !== featured.id || filter !== "all");

  const cover = (id: string) => {
    const m = mediaMap[id] || [];
    return m.find(x => x.stage === "after") || m[0];
  };

  const open = (story: CaseStudy) => {
    setSelected({ story, media: mediaMap[story.id] || [] });
  };

  const shareWhatsApp = (story: CaseStudy) => {
    const title = lang === "en" ? story.title : (story.title_ta || story.title);
    const text = lang === "en"
      ? `Check out this smile transformation at Tooth Haven: ${title}\n${window.location.origin}/portal`
      : `டூத் ஹேவனில் இந்த புன்னகை மாற்றத்தைப் பாருங்கள்: ${title}\n${window.location.origin}/portal`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">{lang === "en" ? "Success Stories" : "வெற்றிக் கதைகள்"}</h3>
      </div>

      {/* Featured hero */}
      {!loading && featured && filter === "all" && (() => {
        const c = cover(featured.id);
        return (
          <button
            onClick={() => open(featured)}
            className="w-full text-left rounded-xl overflow-hidden border border-border bg-background mb-4 hover:shadow-elevated transition-shadow group"
          >
            <div className="relative aspect-[16/10] bg-muted">
              {c && (c.media_type === "video"
                ? <video src={c.url} className="w-full h-full object-cover" />
                : <img src={c.url} alt={featured.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <span className="absolute top-3 left-3 text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {lang === "en" ? "FEATURED STORY" : "சிறப்புக் கதை"}
              </span>
              <div className="absolute bottom-3 left-3 right-3 text-background">
                <p className="font-bold text-base leading-tight line-clamp-2">{lang === "en" ? featured.title : (featured.title_ta || featured.title)}</p>
                {featured.treatment_duration && (
                  <p className="text-xs opacity-90 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {featured.treatment_duration}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })()}

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

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              <Skeleton className="w-full aspect-square" />
              <div className="p-2 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : gridStories.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          {lang === "en" ? "No stories yet in this category." : "இந்த வகையில் கதைகள் இல்லை."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {gridStories.map(story => {
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
            <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border z-10">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate">{lang === "en" ? selected.story.title : (selected.story.title_ta || selected.story.title)}</h4>
                {selected.story.treatment_duration && (
                  <p className="text-xs text-muted-foreground">{selected.story.treatment_duration}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => shareWhatsApp(selected.story)}
                  className="p-1.5 rounded hover:bg-muted text-primary"
                  title={lang === "en" ? "Share on WhatsApp" : "WhatsApp இல் பகிர்"}
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-muted">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
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
              <button
                onClick={() => shareWhatsApp(selected.story)}
                className="mt-4 w-full bg-[#25D366] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90"
              >
                <Share2 className="w-4 h-4" />
                {lang === "en" ? "Share on WhatsApp" : "WhatsApp இல் பகிர்"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SuccessStoriesSection;
