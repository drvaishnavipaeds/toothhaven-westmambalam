import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Megaphone } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  title_ta: string | null;
  content: string | null;
  content_ta: string | null;
  content_type: string;
  image_url: string | null;
  created_at: string;
}

const ClinicFeed = () => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<ContentItem[]>([]);

  const fetch = async () => {
    const { data } = await supabase
      .from("clinic_content")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setItems(data);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel("clinic-content-portal")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_content" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-card rounded-2xl p-5 shadow-elevated">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">{lang === "en" ? "What's New" : "புதிய செய்திகள்"}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2 snap-x snap-mandatory">
        {items.map(it => (
          <div key={it.id} className="snap-start shrink-0 w-64 bg-background rounded-xl border border-border overflow-hidden">
            {it.image_url && (
              <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-32 object-cover" />
            )}
            <div className="p-3">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">{it.content_type}</span>
              <p className="text-sm font-semibold text-foreground mt-1 line-clamp-2">
                {lang === "en" ? it.title : (it.title_ta || it.title)}
              </p>
              {it.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                  {lang === "en" ? it.content : (it.content_ta || it.content)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ClinicFeed;
