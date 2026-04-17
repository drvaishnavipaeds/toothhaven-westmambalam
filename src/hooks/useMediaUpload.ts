import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useMediaUpload = (bucket: "clinic-media" | "patient-media") => {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, folder = ""): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${folder ? folder + "/" : ""}${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
};
