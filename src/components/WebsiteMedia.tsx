import ClinicVideoPlayer from "@/components/ClinicVideoPlayer";

interface Props {
  id: string;
  url: string;
  titleEn: string;
  titleTa?: string | null;
  lang: "en" | "ta";
}

const WebsiteMedia = ({ id, url, titleEn, titleTa, lang }: Props) => (
  <ClinicVideoPlayer
    lang={lang}
    video={{
      id,
      kind: "tutorial",
      service_slug: null,
      title_en: titleEn,
      title_ta: titleTa || null,
      description_en: null,
      description_ta: null,
      video_url: url,
      source: /(^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/)/i.test(url) ? "youtube" : "upload",
      captions_en: null,
      captions_ta: null,
      sort_order: 0,
      is_published: true,
    }}
  />
);

export default WebsiteMedia;
