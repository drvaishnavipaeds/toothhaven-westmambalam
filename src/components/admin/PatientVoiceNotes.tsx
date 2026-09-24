import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface VoiceNote { id: string; audio_path: string; transcript: string | null; clinical_summary: string | null; recorded_at: string; }

const PatientVoiceNotes = ({ patientId }: { patientId: string }) => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState("");
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("patient_voice_notes").select("*").eq("patient_id", patientId).order("recorded_at", { ascending: false });
    if (error) return toast.error(error.message);
    setNotes((data ?? []) as VoiceNote[]);
    const urls: Record<string, string> = {};
    await Promise.all((data ?? []).map(async (note) => {
      const { data: signed } = await supabase.storage.from("patient-media").createSignedUrl(note.audio_path, 3600);
      if (signed?.signedUrl) urls[note.id] = signed.signedUrl;
    }));
    setAudioUrls(urls);
  };

  useEffect(() => { void load(); }, [patientId]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast.error("Audio recording is unavailable on this device");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const next = new MediaRecorder(stream);
    next.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
    next.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: next.mimeType || "audio/webm" });
      const path = `voice-notes/${patientId}/${crypto.randomUUID()}.webm`;
      const { error: uploadError } = await supabase.storage.from("patient-media").upload(path, blob, { contentType: blob.type });
      if (uploadError) return toast.error(uploadError.message);
      const { error } = await supabase.from("patient_voice_notes").insert({ patient_id: patientId, audio_path: path, transcript: draft || null });
      if (error) return toast.error(error.message);
      setDraft("");
      toast.success("Voice note saved privately");
      void load();
    };
    recorder.current = next;
    next.start();
    setRecording(true);
  };

  const stop = () => { recorder.current?.stop(); setRecording(false); };
  const remove = async (note: VoiceNote) => {
    if (!confirm("Delete this voice note?")) return;
    await supabase.storage.from("patient-media").remove([note.audio_path]);
    await supabase.from("patient_voice_notes").delete().eq("id", note.id);
    void load();
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="font-bold text-foreground">Clinical voice notes</h3><p className="text-xs text-muted-foreground">Private recordings attached to this patient.</p></div>
      <Button size="sm" variant={recording ? "destructive" : "default"} onClick={recording ? stop : start}>
        {recording ? <Square className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}{recording ? "Stop" : "Record"}
      </Button>
    </div>
    <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Optional live notes or transcript…" />
    <div className="space-y-2">{notes.map((note) => <div key={note.id} className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2"><audio className="h-9 min-w-0 flex-1" controls src={audioUrls[note.id]} /><Button size="icon" variant="ghost" onClick={() => remove(note)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
      {note.transcript && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.transcript}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{new Date(note.recorded_at).toLocaleString()}</p>
    </div>)}{notes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No voice notes yet.</p>}</div>
  </div>;
};

export default PatientVoiceNotes;