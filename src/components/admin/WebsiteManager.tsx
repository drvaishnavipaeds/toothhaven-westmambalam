import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Edit, Eye, EyeOff, FilePlus2, Globe2, Plus, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { ServiceFaq } from "@/data/services";
import {
  cleanWebsiteItems,
  defaultHomepage,
  emptyWebsiteItem,
  isValidHttpsUrl,
  normalizeSectionOrder,
  serviceFromRow,
  slugify,
  type HomepageContent,
  type WebsiteItem,
  type WebsitePage,
  type WebsiteSection,
} from "@/lib/website-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VideosManager from "@/components/admin/VideosManager";

type WebsiteTable = "website_services" | "website_homepage" | "website_sections" | "website_pages";
const table = (name: WebsiteTable) => (supabase.from as any)(name);

type EditorTab = "services" | "homepage" | "sections" | "pages" | "videos";

interface ServiceForm {
  id?: string;
  slug: string;
  icon: string;
  name_en: string;
  name_ta: string;
  short_description_en: string;
  short_description_ta: string;
  about_en: string;
  about_ta: string;
  highlights_en: string;
  highlights_ta: string;
  faqs: ServiceFaq[];
  image_url: string;
  price_label_en: string;
  price_label_ta: string;
  sort_order: number;
  is_published: boolean;
}

interface SectionForm {
  id?: string;
  section_key: string;
  title_en: string;
  title_ta: string;
  body_en: string;
  body_ta: string;
  image_url: string;
  video_url: string;
  items: WebsiteItem[];
  sort_order: number;
  show_in_menu: boolean;
  is_published: boolean;
}

interface PageForm {
  id?: string;
  slug: string;
  title_en: string;
  title_ta: string;
  content_en: string;
  content_ta: string;
  image_url: string;
  video_url: string;
  sort_order: number;
  show_in_menu: boolean;
  is_published: boolean;
}

const blankService = (): ServiceForm => ({
  slug: "", icon: "Smile", name_en: "", name_ta: "", short_description_en: "", short_description_ta: "",
  about_en: "", about_ta: "", highlights_en: "", highlights_ta: "", faqs: [], image_url: "",
  price_label_en: "", price_label_ta: "", sort_order: 100, is_published: true,
});

const blankSection = (): SectionForm => ({
  section_key: "", title_en: "", title_ta: "", body_en: "", body_ta: "", image_url: "", video_url: "",
  items: [], sort_order: 100, show_in_menu: true, is_published: true,
});

const blankPage = (): PageForm => ({
  slug: "", title_en: "", title_ta: "", content_en: "", content_ta: "", image_url: "", video_url: "",
  sort_order: 100, show_in_menu: true, is_published: true,
});

const builtInLabels: Record<string, string> = {
  home: "Welcome / Hero", services: "Services", about: "About Dr. Karthik", "home-visit": "Home Visit",
  testimonials: "Testimonials", appointment: "Appointment", contact: "Contact",
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);

const VisibilityCheck = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) => (
  <label className="flex items-center gap-2 text-sm text-foreground">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />
    {label}
  </label>
);

const MediaInput = ({ label, value, onChange, folder, kind }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  folder: string;
  kind: "image" | "video";
}) => {
  const { upload, uploading } = useMediaUpload("clinic-media");
  const { toast } = useToast();
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith(`${kind}/`)) {
      toast({ title: `Choose an ${kind} file`, variant: "destructive" });
      return;
    }
    const max = kind === "video" ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > max) {
      toast({ title: `${kind === "video" ? "Videos" : "Images"} must be smaller than ${kind === "video" ? "200 MB" : "15 MB"}`, variant: "destructive" });
      return;
    }
    const url = await upload(file, folder);
    if (url) onChange(url);
  };
  return (
    <Field label={label}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={kind === "video" ? "Upload a video or paste a YouTube https link" : "Upload an image or paste an https image link"} />
        <label className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          <Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Upload"}
          <input type="file" className="sr-only" accept={kind === "image" ? "image/*" : "video/*"} onChange={onFile} disabled={uploading} aria-label={`Upload ${label}`} />
        </label>
      </div>
    </Field>
  );
};

const WebsiteManager = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<EditorTab>("services");
  const [services, setServices] = useState<Record<string, any>[]>([]);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [homepage, setHomepage] = useState<HomepageContent>(defaultHomepage);
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm | null>(null);
  const [pageForm, setPageForm] = useState<PageForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [serviceResult, sectionResult, pageResult, homepageResult] = await Promise.all([
      table("website_services").select("*").order("sort_order").order("slug"),
      table("website_sections").select("*").order("sort_order").order("section_key"),
      table("website_pages").select("*").order("sort_order").order("slug"),
      table("website_homepage").select("*").eq("id", "main").maybeSingle(),
    ]);
    const error = serviceResult.error || sectionResult.error || pageResult.error || homepageResult.error;
    if (error) toast({ title: "Website content could not be loaded", description: error.message, variant: "destructive" });
    setServices(serviceResult.data || []);
    setSections((sectionResult.data || []) as WebsiteSection[]);
    setPages((pageResult.data || []) as WebsitePage[]);
    if (homepageResult.data) {
      setHomepage({
        ...defaultHomepage,
        ...homepageResult.data,
        section_order: Array.isArray(homepageResult.data.section_order) ? homepageResult.data.section_order : defaultHomepage.section_order,
        hidden_sections: Array.isArray(homepageResult.data.hidden_sections) ? homepageResult.data.hidden_sections : [],
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const showError = (error: any) => toast({ title: "Could not save", description: error?.message || "Please check the fields and try again.", variant: "destructive" });

  const openService = (row?: Record<string, any>) => {
    if (!row) return setServiceForm(blankService());
    const service = serviceFromRow(row);
    setServiceForm({
      id: row.id, slug: row.slug, icon: row.icon, name_en: row.name_en, name_ta: row.name_ta || "",
      short_description_en: row.short_description_en || "", short_description_ta: row.short_description_ta || "",
      about_en: row.about_en || "", about_ta: row.about_ta || "", highlights_en: service.highlightsEn.join("\n"),
      highlights_ta: service.highlightsTa.join("\n"), faqs: service.faqs, image_url: row.image_url || "",
      price_label_en: row.price_label_en || "", price_label_ta: row.price_label_ta || "", sort_order: row.sort_order,
      is_published: row.is_published,
    });
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceForm) return;
    const slug = slugify(serviceForm.slug || serviceForm.name_en);
    if (!slug || !serviceForm.name_en.trim()) return toast({ title: "Add an English service name and a valid web address", variant: "destructive" });
    if (!isValidHttpsUrl(serviceForm.image_url)) return toast({ title: "Image links must start with https://", variant: "destructive" });
    setSaving(true);
    const payload = {
      slug, icon: serviceForm.icon || "Smile", name_en: serviceForm.name_en.trim(), name_ta: serviceForm.name_ta.trim() || null,
      short_description_en: serviceForm.short_description_en.trim(), short_description_ta: serviceForm.short_description_ta.trim() || null,
      about_en: serviceForm.about_en.trim(), about_ta: serviceForm.about_ta.trim() || null,
      highlights_en: serviceForm.highlights_en.split("\n").map((item) => item.trim()).filter(Boolean),
      highlights_ta: serviceForm.highlights_ta.split("\n").map((item) => item.trim()).filter(Boolean),
      faqs: serviceForm.faqs.filter((faq) => faq.qEn.trim() && faq.aEn.trim()),
      image_url: serviceForm.image_url.trim() || null, price_label_en: serviceForm.price_label_en.trim() || null,
      price_label_ta: serviceForm.price_label_ta.trim() || null, sort_order: serviceForm.sort_order, is_published: serviceForm.is_published,
    };
    const { error } = serviceForm.id
      ? await table("website_services").update(payload).eq("id", serviceForm.id)
      : await table("website_services").insert(payload);
    setSaving(false);
    if (error) return showError(error);
    setServiceForm(null);
    await load();
    toast({ title: "Service saved", description: "The public website now uses this version." });
  };

  const openSection = (section?: WebsiteSection) => setSectionForm(section ? {
    id: section.id, section_key: section.section_key, title_en: section.title_en, title_ta: section.title_ta || "",
    body_en: section.body_en || "", body_ta: section.body_ta || "", image_url: section.image_url || "", video_url: section.video_url || "",
    items: section.items?.length ? section.items : [], sort_order: section.sort_order, show_in_menu: section.show_in_menu, is_published: section.is_published,
  } : blankSection());

  const saveSection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sectionForm) return;
    const key = slugify(sectionForm.section_key || sectionForm.title_en);
    if (!key || !sectionForm.title_en.trim()) return toast({ title: "Add an English title and a valid section address", variant: "destructive" });
    if (builtInLabels[key]) return toast({ title: "That section address is reserved", description: "Use a different address, such as visiting-consultants.", variant: "destructive" });
    if (![sectionForm.image_url, sectionForm.video_url].every(isValidHttpsUrl) || sectionForm.items.some((item) => !isValidHttpsUrl(item.image_url))) {
      return toast({ title: "Media links must start with https://", variant: "destructive" });
    }
    setSaving(true);
    const payload = {
      section_key: key, title_en: sectionForm.title_en.trim(), title_ta: sectionForm.title_ta.trim() || null,
      body_en: sectionForm.body_en.trim(), body_ta: sectionForm.body_ta.trim() || null, image_url: sectionForm.image_url.trim() || null,
      video_url: sectionForm.video_url.trim() || null, items: cleanWebsiteItems(sectionForm.items), sort_order: sectionForm.sort_order,
      show_in_menu: sectionForm.show_in_menu, is_published: sectionForm.is_published,
    };
    const { error } = sectionForm.id
      ? await table("website_sections").update(payload).eq("id", sectionForm.id)
      : await table("website_sections").insert(payload);
    if (!error && !homepage.section_order.includes(key)) {
      await table("website_homepage").upsert({ ...homepage, section_order: normalizeSectionOrder(homepage.section_order, [...sections.map((section) => section.section_key), key]) });
    }
    setSaving(false);
    if (error) return showError(error);
    setSectionForm(null);
    await load();
    toast({ title: "Section saved", description: "Use Homepage order to choose exactly where it appears." });
  };

  const openPage = (page?: WebsitePage) => setPageForm(page ? {
    id: page.id, slug: page.slug, title_en: page.title_en, title_ta: page.title_ta || "", content_en: page.content_en || "",
    content_ta: page.content_ta || "", image_url: page.image_url || "", video_url: page.video_url || "", sort_order: page.sort_order,
    show_in_menu: page.show_in_menu, is_published: page.is_published,
  } : blankPage());

  const savePage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pageForm) return;
    const slug = slugify(pageForm.slug || pageForm.title_en);
    if (!slug || !pageForm.title_en.trim()) return toast({ title: "Add an English page title and a valid web address", variant: "destructive" });
    if (![pageForm.image_url, pageForm.video_url].every(isValidHttpsUrl)) return toast({ title: "Media links must start with https://", variant: "destructive" });
    setSaving(true);
    const payload = {
      slug, title_en: pageForm.title_en.trim(), title_ta: pageForm.title_ta.trim() || null, content_en: pageForm.content_en.trim(),
      content_ta: pageForm.content_ta.trim() || null, image_url: pageForm.image_url.trim() || null, video_url: pageForm.video_url.trim() || null,
      sort_order: pageForm.sort_order, show_in_menu: pageForm.show_in_menu, is_published: pageForm.is_published,
    };
    const { error } = pageForm.id ? await table("website_pages").update(payload).eq("id", pageForm.id) : await table("website_pages").insert(payload);
    setSaving(false);
    if (error) return showError(error);
    setPageForm(null);
    await load();
    toast({ title: "Page saved", description: `Public address: /pages/${slug}` });
  };

  const saveHomepage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!homepage.hero_title_en.trim() || !homepage.about_title_en.trim()) return toast({ title: "English hero and About titles are required", variant: "destructive" });
    if (![homepage.hero_image_url || "", homepage.about_image_url || ""].every(isValidHttpsUrl)) return toast({ title: "Image links must start with https://", variant: "destructive" });
    setSaving(true);
    const { error } = await table("website_homepage").upsert({
      ...homepage,
      section_order: normalizeSectionOrder(homepage.section_order, sections.map((section) => section.section_key)),
    });
    setSaving(false);
    if (error) return showError(error);
    await load();
    toast({ title: "Homepage updated", description: "Your text, photos and section order are live." });
  };

  const togglePublished = async (tableName: "website_services" | "website_sections" | "website_pages", id: string, current: boolean) => {
    const { error } = await table(tableName).update({ is_published: !current }).eq("id", id);
    if (error) return showError(error);
    await load();
  };

  const remove = async (tableName: "website_services" | "website_sections" | "website_pages", id: string, label: string) => {
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    const { error } = await table(tableName).delete().eq("id", id);
    if (error) return showError(error);
    await load();
    toast({ title: `${label} deleted` });
  };

  const orderedSections = useMemo(
    () => normalizeSectionOrder(homepage.section_order, sections.map((section) => section.section_key)),
    [homepage.section_order, sections],
  );

  const moveSection = (key: string, direction: -1 | 1) => {
    const index = orderedSections.indexOf(key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedSections.length) return;
    const next = [...orderedSections];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setHomepage((current) => ({ ...current, section_order: next }));
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "services", label: "Services" }, { id: "homepage", label: "Homepage & order" },
    { id: "sections", label: "Custom sections" }, { id: "pages", label: "Pages" }, { id: "videos", label: "Videos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground"><Globe2 className="h-5 w-5 text-primary" />Website editor</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add or edit public content in English and Tamil. Saved changes appear without republishing.</p>
        </div>
        <Button variant="outline" size="sm" asChild><a href="/" target="_blank" rel="noreferrer">View website</a></Button>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1">
        {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{item.label}</button>)}
      </div>
      {loading && tab !== "videos" ? <p className="py-8 text-center text-sm text-muted-foreground">Loading website content…</p> : null}

      {!loading && tab === "services" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{services.length} services</p><Button size="sm" onClick={() => openService()}><Plus className="mr-1 h-4 w-4" />Add service</Button></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {services.map((service) => <article key={service.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{service.name_en}</h3>{!service.is_published && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.short_description_en}</p><a href={`/services/${service.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">/services/{service.slug}</a></div>
              <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`${service.is_published ? "Hide" : "Publish"} ${service.name_en}`} onClick={() => togglePublished("website_services", service.id, service.is_published)}>{service.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" aria-label={`Edit ${service.name_en}`} onClick={() => openService(service)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${service.name_en}`} onClick={() => remove("website_services", service.id, service.name_en)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </article>)}
          </div>
        </section>
      )}

      {!loading && tab === "homepage" && (
        <form onSubmit={saveHomepage} className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div><h3 className="font-semibold text-foreground">Homepage text and photos</h3><p className="text-sm text-muted-foreground">Leave a photo blank to keep the current design.</p></div>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Hero title (English)"><Input required maxLength={240} value={homepage.hero_title_en} onChange={(e) => setHomepage({ ...homepage, hero_title_en: e.target.value })} /></Field><Field label="Hero title (Tamil)"><Input maxLength={240} value={homepage.hero_title_ta || ""} onChange={(e) => setHomepage({ ...homepage, hero_title_ta: e.target.value })} /></Field></div>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Hero subtitle (English)"><Textarea value={homepage.hero_subtitle_en} onChange={(e) => setHomepage({ ...homepage, hero_subtitle_en: e.target.value })} /></Field><Field label="Hero subtitle (Tamil)"><Textarea value={homepage.hero_subtitle_ta || ""} onChange={(e) => setHomepage({ ...homepage, hero_subtitle_ta: e.target.value })} /></Field></div>
          <MediaInput label="Hero background photo" value={homepage.hero_image_url || ""} onChange={(value) => setHomepage({ ...homepage, hero_image_url: value })} folder="website/homepage" kind="image" />
          <div className="grid gap-4 md:grid-cols-2"><Field label="About title (English)"><Input required value={homepage.about_title_en} onChange={(e) => setHomepage({ ...homepage, about_title_en: e.target.value })} /></Field><Field label="About title (Tamil)"><Input value={homepage.about_title_ta || ""} onChange={(e) => setHomepage({ ...homepage, about_title_ta: e.target.value })} /></Field></div>
          <div className="grid gap-4 md:grid-cols-2"><Field label="About text (English)"><Textarea rows={7} value={homepage.about_body_en} onChange={(e) => setHomepage({ ...homepage, about_body_en: e.target.value })} /></Field><Field label="About text (Tamil)"><Textarea rows={7} value={homepage.about_body_ta || ""} onChange={(e) => setHomepage({ ...homepage, about_body_ta: e.target.value })} /></Field></div>
          <MediaInput label="About photo" value={homepage.about_image_url || ""} onChange={(value) => setHomepage({ ...homepage, about_image_url: value })} folder="website/homepage" kind="image" />
          <div className="space-y-2"><div><h3 className="font-semibold text-foreground">Homepage section order</h3><p className="text-sm text-muted-foreground">Move sections up or down. Hide built-in sections with the checkbox; custom sections use their own Published setting.</p></div>
            {orderedSections.map((key, index) => <div key={key} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"><span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{builtInLabels[key] || sections.find((section) => section.section_key === key)?.title_en || key}</span>{builtInLabels[key] && key !== "home" && <VisibilityCheck label="Show" checked={!homepage.hidden_sections.includes(key)} onChange={(show) => setHomepage({ ...homepage, hidden_sections: show ? homepage.hidden_sections.filter((item) => item !== key) : [...homepage.hidden_sections, key] })} />}<Button type="button" variant="ghost" size="icon" disabled={index === 0} aria-label={`Move ${key} up`} onClick={() => moveSection(key, -1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === orderedSections.length - 1} aria-label={`Move ${key} down`} onClick={() => moveSection(key, 1)}><ArrowDown className="h-4 w-4" /></Button></div>)}
          </div>
          <Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save homepage"}</Button>
        </form>
      )}

      {!loading && tab === "sections" && (
        <section className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Add Visiting Consultants, technology, facilities, offers or any other homepage section.</p><Button size="sm" onClick={() => openSection()}><Plus className="mr-1 h-4 w-4" />Add section</Button></div>
          {sections.map((section) => <article key={section.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{section.title_en}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{section.items.length} cards</span>{!section.is_published && <span className="text-xs text-muted-foreground">Hidden</span>}</div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{section.body_en}</p><p className="mt-1 text-xs text-muted-foreground">#{section.section_key}{section.show_in_menu ? " · In menu" : ""}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`${section.is_published ? "Hide" : "Publish"} ${section.title_en}`} onClick={() => togglePublished("website_sections", section.id, section.is_published)}>{section.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" aria-label={`Edit ${section.title_en}`} onClick={() => openSection(section)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${section.title_en}`} onClick={() => remove("website_sections", section.id, section.title_en)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></article>)}
          {!sections.length && <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No custom sections yet. Add Visiting Consultants to get started.</p>}
        </section>
      )}

      {!loading && tab === "pages" && (
        <section className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Create standalone pages with text, a photo and a video.</p><Button size="sm" onClick={() => openPage()}><FilePlus2 className="mr-1 h-4 w-4" />Add page</Button></div>
          {pages.map((page) => <article key={page.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{page.title_en}</h3>{!page.is_published && <span className="text-xs text-muted-foreground">Draft</span>}</div><a href={`/pages/${page.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">/pages/{page.slug}</a><p className="mt-1 text-xs text-muted-foreground">{page.show_in_menu ? "Shown in menu" : "Not in menu"}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`${page.is_published ? "Unpublish" : "Publish"} ${page.title_en}`} onClick={() => togglePublished("website_pages", page.id, page.is_published)}>{page.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" aria-label={`Edit ${page.title_en}`} onClick={() => openPage(page)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${page.title_en}`} onClick={() => remove("website_pages", page.id, page.title_en)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></article>)}
          {!pages.length && <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No custom pages yet.</p>}
        </section>
      )}

      {tab === "videos" && <VideosManager />}

      <Dialog open={Boolean(serviceForm)} onOpenChange={(open) => { if (!open) setServiceForm(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{serviceForm?.id ? "Edit service" : "Add service"}</DialogTitle><DialogDescription>Service names, details, highlights and FAQs appear on the public service page.</DialogDescription></DialogHeader>
          {serviceForm && <form onSubmit={saveService} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2"><Field label="Service name (English) *"><Input required maxLength={160} value={serviceForm.name_en} onChange={(e) => setServiceForm({ ...serviceForm, name_en: e.target.value, slug: serviceForm.id ? serviceForm.slug : slugify(e.target.value) })} /></Field><Field label="Service name (Tamil)"><Input maxLength={160} value={serviceForm.name_ta} onChange={(e) => setServiceForm({ ...serviceForm, name_ta: e.target.value })} /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Web address"><Input required disabled={Boolean(serviceForm.id)} value={serviceForm.slug} onChange={(e) => setServiceForm({ ...serviceForm, slug: slugify(e.target.value) })} /></Field><Field label="Icon"><select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={serviceForm.icon} onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}>{["Smile", "ShieldCheck", "HeartPulse", "Wrench", "Sparkles", "Crown", "Zap", "Scan", "Scissors", "Baby", "CircleDot", "Gem", "Search", "Syringe", "Eye", "Stethoscope"].map((icon) => <option key={icon}>{icon}</option>)}</select></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Short description (English)"><Textarea value={serviceForm.short_description_en} onChange={(e) => setServiceForm({ ...serviceForm, short_description_en: e.target.value })} /></Field><Field label="Short description (Tamil)"><Textarea value={serviceForm.short_description_ta} onChange={(e) => setServiceForm({ ...serviceForm, short_description_ta: e.target.value })} /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="About this treatment (English)"><Textarea rows={6} value={serviceForm.about_en} onChange={(e) => setServiceForm({ ...serviceForm, about_en: e.target.value })} /></Field><Field label="About this treatment (Tamil)"><Textarea rows={6} value={serviceForm.about_ta} onChange={(e) => setServiceForm({ ...serviceForm, about_ta: e.target.value })} /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Highlights (English, one per line)"><Textarea rows={5} value={serviceForm.highlights_en} onChange={(e) => setServiceForm({ ...serviceForm, highlights_en: e.target.value })} /></Field><Field label="Highlights (Tamil, one per line)"><Textarea rows={5} value={serviceForm.highlights_ta} onChange={(e) => setServiceForm({ ...serviceForm, highlights_ta: e.target.value })} /></Field></div>
            <MediaInput label="Service photo" value={serviceForm.image_url} onChange={(value) => setServiceForm({ ...serviceForm, image_url: value })} folder="website/services" kind="image" />
            <div className="grid gap-4 md:grid-cols-2"><Field label="Price label (English, optional)"><Input placeholder="e.g. From ₹2,000" value={serviceForm.price_label_en} onChange={(e) => setServiceForm({ ...serviceForm, price_label_en: e.target.value })} /></Field><Field label="Price label (Tamil, optional)"><Input value={serviceForm.price_label_ta} onChange={(e) => setServiceForm({ ...serviceForm, price_label_ta: e.target.value })} /></Field></div>
            <div className="space-y-3"><div className="flex items-center justify-between"><Label>Frequently asked questions</Label><Button type="button" variant="outline" size="sm" onClick={() => setServiceForm({ ...serviceForm, faqs: [...serviceForm.faqs, { qEn: "", qTa: "", aEn: "", aTa: "" }] })}><Plus className="mr-1 h-4 w-4" />Add FAQ</Button></div>
              {serviceForm.faqs.map((faq, index) => <div key={index} className="space-y-2 rounded-lg border border-border p-3"><div className="flex justify-between"><span className="text-sm font-medium">FAQ {index + 1}</span><Button type="button" variant="ghost" size="icon" aria-label={`Remove FAQ ${index + 1}`} onClick={() => setServiceForm({ ...serviceForm, faqs: serviceForm.faqs.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Question (English)" value={faq.qEn} onChange={(e) => setServiceForm({ ...serviceForm, faqs: serviceForm.faqs.map((item, i) => i === index ? { ...item, qEn: e.target.value } : item) })} /><Input placeholder="Question (Tamil)" value={faq.qTa} onChange={(e) => setServiceForm({ ...serviceForm, faqs: serviceForm.faqs.map((item, i) => i === index ? { ...item, qTa: e.target.value } : item) })} /><Textarea placeholder="Answer (English)" value={faq.aEn} onChange={(e) => setServiceForm({ ...serviceForm, faqs: serviceForm.faqs.map((item, i) => i === index ? { ...item, aEn: e.target.value } : item) })} /><Textarea placeholder="Answer (Tamil)" value={faq.aTa} onChange={(e) => setServiceForm({ ...serviceForm, faqs: serviceForm.faqs.map((item, i) => i === index ? { ...item, aTa: e.target.value } : item) })} /></div></div>)}
            </div>
            <div className="flex flex-wrap items-center gap-5"><Field label="Order"><Input type="number" min={0} max={10000} value={serviceForm.sort_order} onChange={(e) => setServiceForm({ ...serviceForm, sort_order: Number(e.target.value) })} /></Field><VisibilityCheck label="Published on website" checked={serviceForm.is_published} onChange={(checked) => setServiceForm({ ...serviceForm, is_published: checked })} /></div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save service"}</Button>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sectionForm)} onOpenChange={(open) => { if (!open) setSectionForm(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{sectionForm?.id ? "Edit custom section" : "Add custom section"}</DialogTitle><DialogDescription>For Visiting Consultants, add one card per consultant with their photo, role and biography.</DialogDescription></DialogHeader>
          {sectionForm && <form onSubmit={saveSection} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Section title (English) *"><Input required value={sectionForm.title_en} onChange={(e) => setSectionForm({ ...sectionForm, title_en: e.target.value, section_key: sectionForm.id ? sectionForm.section_key : slugify(e.target.value) })} /></Field><Field label="Section title (Tamil)"><Input value={sectionForm.title_ta} onChange={(e) => setSectionForm({ ...sectionForm, title_ta: e.target.value })} /></Field></div>
            <Field label="Section address / menu anchor"><Input disabled={Boolean(sectionForm.id)} value={sectionForm.section_key} onChange={(e) => setSectionForm({ ...sectionForm, section_key: slugify(e.target.value) })} /></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Introduction (English)"><Textarea rows={5} value={sectionForm.body_en} onChange={(e) => setSectionForm({ ...sectionForm, body_en: e.target.value })} /></Field><Field label="Introduction (Tamil)"><Textarea rows={5} value={sectionForm.body_ta} onChange={(e) => setSectionForm({ ...sectionForm, body_ta: e.target.value })} /></Field></div>
            <MediaInput label="Section photo" value={sectionForm.image_url} onChange={(value) => setSectionForm({ ...sectionForm, image_url: value })} folder="website/sections" kind="image" /><MediaInput label="Section video" value={sectionForm.video_url} onChange={(value) => setSectionForm({ ...sectionForm, video_url: value })} folder="website/sections" kind="video" />
            <div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Cards / consultants</Label><p className="text-xs text-muted-foreground">Add names, roles, descriptions and photos.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSectionForm({ ...sectionForm, items: [...sectionForm.items, emptyWebsiteItem()] })}><Plus className="mr-1 h-4 w-4" />Add card</Button></div>
              {sectionForm.items.map((item, index) => <div key={index} className="space-y-3 rounded-lg border border-border p-3"><div className="flex justify-between"><span className="text-sm font-medium">Card {index + 1}</span><Button type="button" variant="ghost" size="icon" aria-label={`Remove card ${index + 1}`} onClick={() => setSectionForm({ ...sectionForm, items: sectionForm.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div><div className="grid gap-2 md:grid-cols-2">{(["name_en", "name_ta", "role_en", "role_ta"] as const).map((key) => <Input key={key} placeholder={{ name_en: "Name (English)", name_ta: "Name (Tamil)", role_en: "Role / qualifications (English)", role_ta: "Role / qualifications (Tamil)" }[key]} value={item[key]} onChange={(e) => setSectionForm({ ...sectionForm, items: sectionForm.items.map((current, i) => i === index ? { ...current, [key]: e.target.value } : current) })} />)}</div><div className="grid gap-2 md:grid-cols-2"><Textarea placeholder="Description (English)" value={item.description_en} onChange={(e) => setSectionForm({ ...sectionForm, items: sectionForm.items.map((current, i) => i === index ? { ...current, description_en: e.target.value } : current) })} /><Textarea placeholder="Description (Tamil)" value={item.description_ta} onChange={(e) => setSectionForm({ ...sectionForm, items: sectionForm.items.map((current, i) => i === index ? { ...current, description_ta: e.target.value } : current) })} /></div><MediaInput label={`Card ${index + 1} photo`} value={item.image_url} onChange={(value) => setSectionForm({ ...sectionForm, items: sectionForm.items.map((current, i) => i === index ? { ...current, image_url: value } : current) })} folder="website/sections/cards" kind="image" /></div>)}
            </div><div className="flex flex-wrap items-center gap-5"><Field label="Order"><Input type="number" min={0} max={10000} value={sectionForm.sort_order} onChange={(e) => setSectionForm({ ...sectionForm, sort_order: Number(e.target.value) })} /></Field><VisibilityCheck label="Published" checked={sectionForm.is_published} onChange={(checked) => setSectionForm({ ...sectionForm, is_published: checked })} /><VisibilityCheck label="Show in menu" checked={sectionForm.show_in_menu} onChange={(checked) => setSectionForm({ ...sectionForm, show_in_menu: checked })} /></div><Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save section"}</Button>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pageForm)} onOpenChange={(open) => { if (!open) setPageForm(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{pageForm?.id ? "Edit page" : "Add page"}</DialogTitle><DialogDescription>Publish a new standalone page and optionally add it to the website menu.</DialogDescription></DialogHeader>
          {pageForm && <form onSubmit={savePage} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Page title (English) *"><Input required value={pageForm.title_en} onChange={(e) => setPageForm({ ...pageForm, title_en: e.target.value, slug: pageForm.id ? pageForm.slug : slugify(e.target.value) })} /></Field><Field label="Page title (Tamil)"><Input value={pageForm.title_ta} onChange={(e) => setPageForm({ ...pageForm, title_ta: e.target.value })} /></Field></div><Field label="Page web address"><Input disabled={Boolean(pageForm.id)} value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: slugify(e.target.value) })} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Page content (English)"><Textarea rows={10} value={pageForm.content_en} onChange={(e) => setPageForm({ ...pageForm, content_en: e.target.value })} /></Field><Field label="Page content (Tamil)"><Textarea rows={10} value={pageForm.content_ta} onChange={(e) => setPageForm({ ...pageForm, content_ta: e.target.value })} /></Field></div><MediaInput label="Page photo" value={pageForm.image_url} onChange={(value) => setPageForm({ ...pageForm, image_url: value })} folder="website/pages" kind="image" /><MediaInput label="Page video" value={pageForm.video_url} onChange={(value) => setPageForm({ ...pageForm, video_url: value })} folder="website/pages" kind="video" /><div className="flex flex-wrap items-center gap-5"><Field label="Menu order"><Input type="number" min={0} max={10000} value={pageForm.sort_order} onChange={(e) => setPageForm({ ...pageForm, sort_order: Number(e.target.value) })} /></Field><VisibilityCheck label="Published" checked={pageForm.is_published} onChange={(checked) => setPageForm({ ...pageForm, is_published: checked })} /><VisibilityCheck label="Show in menu" checked={pageForm.show_in_menu} onChange={(checked) => setPageForm({ ...pageForm, show_in_menu: checked })} /></div><Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save page"}</Button></form>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteManager;
