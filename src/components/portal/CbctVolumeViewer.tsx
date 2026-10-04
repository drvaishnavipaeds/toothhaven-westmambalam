import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  urls?: string[];
  title?: string;
};

const CbctVolumeViewer = ({ urls = [], title = "CBCT volume" }: Props) => {
  const ready = urls.length > 0;

  if (!ready) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing CBCT volume…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
        <h3 className="text-base font-semibold text-foreground">3D CBCT viewer is not available yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The system detected {urls.length} slice(s) for <span className="font-medium text-foreground">{title}</span>,
          but the interactive 3D rendering is still under development.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          The 2D slice review remains available while 3D planning work continues.
        </p>
      </div>
    </div>
  );
};

export default CbctVolumeViewer;
