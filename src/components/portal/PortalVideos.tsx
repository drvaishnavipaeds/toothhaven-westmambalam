import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ClinicVideoPlayer, { type ClinicVideo } from "@/components/ClinicVideoPlayer";

const videosTable = () => (supabase.from as any)("clinic_videos");

export const useClinicVideos = (kind: ClinicVideo["kind"], serviceSlug?: string) => {
  const [videos, setVideos] = useState<ClinicVideo[]>([]);
  useEffect(() => {
    let q = videosTable().select("*").eq("is_published", true).eq("kind", kind).order("sort_order");
    if (serviceSlug) q = q.eq("service_slug", serviceSlug);
    q.then(({ data }: { data: ClinicVideo[] | null }) => {
      if (data) setVideos(data);
    });
  }, [kind, serviceSlug]);
  return videos;
};

const VideoGrid = ({ videos, lang }: { videos: ClinicVideo[]; lang: "en" | "ta" }) => (
  <div className="grid sm:grid-cols-2 gap-4">
    {videos.map((v) => <ClinicVideoPlayer key={v.id} video={v} lang={lang} />)}
  </div>
);

const PortalVideos = () => {
  const { lang } = useLanguage();
  const tutorials = useClinicVideos("tutorial");
  const beforeAfter = useClinicVideos("before_after");

  if (tutorials.length === 0 && beforeAfter.length === 0) return null;

  return (
    <div className="space-y-8">
      {tutorials.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {lang === "en" ? "Tutorials" : "கற்றல் வீடியோக்கள்"}
          </h2>
          <VideoGrid videos={tutorials} lang={lang} />
        </section>
      )}
      {beforeAfter.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {lang === "en" ? "Before & After" : "முன் & பின்"}
          </h2>
          <VideoGrid videos={beforeAfter} lang={lang} />
        </section>
      )}
    </div>
  );
};

export default PortalVideos;
