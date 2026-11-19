import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, CaptionsOff, Volume2, VolumeX } from "lucide-react";

export interface ClinicVideo {
  id: string;
  kind: "service" | "tutorial" | "before_after";
  service_slug: string | null;
  title_en: string;
  title_ta: string | null;
  description_en: string | null;
  description_ta: string | null;
  video_url: string;
  source: "upload" | "youtube";
  captions_en: string | null;
  captions_ta: string | null;
  audio_ta_url?: string | null;
  audio_ta_source?: string | null;
  sort_order: number;
  is_published: boolean;
}

const toEmbedUrl = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
  } catch { /* fall through */ }
  return url;
};

interface Props {
  video: ClinicVideo;
  lang: "en" | "ta";
}

const ClinicVideoPlayer = ({ video, lang }: Props) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);

  const title = lang === "ta" && video.title_ta ? video.title_ta : video.title_en;
  const description = lang === "ta" && video.description_ta ? video.description_ta : video.description_en;
  const caption = lang === "ta" && video.captions_ta ? video.captions_ta : video.captions_en;
  const hasCaptions = Boolean(caption);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tamilAudio = lang === "ta" && video.audio_ta_url ? video.audio_ta_url : null;

  // Tamil voice-over: mute the original track and keep the voice in step with the video.
  useEffect(() => {
    const v = ref.current;
    const a = audioRef.current;
    if (!v || !a || !tamilAudio) return;
    v.muted = true;
    const sync = () => { if (Math.abs(a.currentTime - v.currentTime) > 0.4) a.currentTime = v.currentTime; };
    const play = () => { sync(); a.play().catch(() => {}); };
    const pause = () => a.pause();
    v.addEventListener("play", play);
    v.addEventListener("pause", pause);
    v.addEventListener("seeked", sync);
    v.addEventListener("ended", pause);
    return () => {
      v.removeEventListener("play", play);
      v.removeEventListener("pause", pause);
      v.removeEventListener("seeked", sync);
      v.removeEventListener("ended", pause);
      a.pause();
      v.muted = false;
    };
  }, [tamilAudio]);

  const embedUrl = useMemo(
    () => (video.source === "youtube" ? toEmbedUrl(video.video_url) : null),
    [video.source, video.video_url],
  );

  const toggleMute = () => {
    if (tamilAudio && audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setMuted(audioRef.current.muted);
      return;
    }
    if (ref.current) {
      ref.current.muted = !ref.current.muted;
      setMuted(ref.current.muted);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="relative bg-foreground/5">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <video ref={ref} src={video.video_url} controls playsInline className="w-full aspect-video" />
            {tamilAudio && <audio ref={audioRef} src={tamilAudio} preload="auto" />}
          </>
        )}
        {showCaptions && caption && !embedUrl && (
          <div className="absolute bottom-12 inset-x-4 pointer-events-none">
            <p className="mx-auto w-fit max-w-full bg-foreground/80 text-background text-xs sm:text-sm rounded-lg px-3 py-1.5 text-center">
              {caption}
            </p>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{title}</p>
            {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
            {tamilAudio && !embedUrl && <p className="text-[11px] text-primary mt-1">தமிழ் குரல் · Tamil voice</p>}
            {tamilAudio && embedUrl && (
              <div className="mt-2">
                <p className="text-[11px] text-muted-foreground mb-1">தமிழ் விளக்கம் கேளுங்கள் · Listen in Tamil</p>
                <audio src={tamilAudio} controls className="w-full h-9" />
              </div>
            )}
          </div>
          {!embedUrl && (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded hover:bg-muted"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
              </button>
              {hasCaptions && (
                <button
                  type="button"
                  onClick={() => setShowCaptions((s) => !s)}
                  className="p-1.5 rounded hover:bg-muted"
                  title={showCaptions ? "Hide captions" : "Show captions"}
                >
                  {showCaptions ? <Captions className="w-4 h-4 text-primary" /> : <CaptionsOff className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicVideoPlayer;
