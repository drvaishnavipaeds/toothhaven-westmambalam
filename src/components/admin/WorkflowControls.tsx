import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Send, RotateCcw } from "lucide-react";

export type WorkflowStatus = "draft" | "pending_review" | "approved" | "rejected";
export type WorkflowTable = "case_studies" | "testimonials" | "achievements" | "clinic_content";

export const statusColor: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export const statusLabel: Record<WorkflowStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const WorkflowBadge = ({ status }: { status: WorkflowStatus }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[status]}`}>{statusLabel[status]}</span>
);

interface ActionProps {
  table: WorkflowTable;
  id: string;
  status: WorkflowStatus;
  onChanged?: () => void;
}

export const WorkflowActions = ({ table, id, status, onChanged }: ActionProps) => {
  const { toast } = useToast();

  const update = async (next: WorkflowStatus, promptNote = false) => {
    let review_notes: string | null = null;
    if (promptNote) {
      const note = prompt(next === "rejected" ? "Reason for rejection (optional):" : "Review note (optional):");
      if (note === null && next === "rejected") return;
      review_notes = note || null;
    }
    const patch: Record<string, unknown> = { workflow_status: next };
    const { data: { user } } = await supabase.auth.getUser();
    const nowIso = new Date().toISOString();
    if (next === "pending_review") {
      patch.submitted_at = nowIso;
      patch.submitted_by = user?.id ?? null;
    } else if (next === "approved" || next === "rejected") {
      patch.reviewed_at = nowIso;
      patch.reviewed_by = user?.id ?? null;
      if (review_notes !== null) patch.review_notes = review_notes;
    }
    const { error } = await (supabase.from(table) as any).update(patch).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Marked ${statusLabel[next]}` });
    onChanged?.();
  };

  return (
    <div className="flex gap-1">
      {(status === "draft" || status === "rejected") && (
        <button onClick={() => update("pending_review")} title="Submit for review" className="p-1.5 rounded hover:bg-muted">
          <Send className="w-3.5 h-3.5 text-primary" />
        </button>
      )}
      {status === "pending_review" && (
        <>
          <button onClick={() => update("approved", true)} title="Approve & publish" className="p-1.5 rounded hover:bg-green-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </button>
          <button onClick={() => update("rejected", true)} title="Reject" className="p-1.5 rounded hover:bg-red-100">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </button>
        </>
      )}
      {status === "approved" && (
        <button onClick={() => update("draft")} title="Unpublish → draft" className="p-1.5 rounded hover:bg-muted">
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};
