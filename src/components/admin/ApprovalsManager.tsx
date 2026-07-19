import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Inbox, Sparkles, MessageSquareQuote, Award, FileText } from "lucide-react";
import { WorkflowBadge, WorkflowActions, WorkflowStatus, WorkflowTable } from "./WorkflowControls";

type FilterStatus = "pending_review" | "all";

interface Row {
  id: string;
  table: WorkflowTable;
  title: string;
  subtitle?: string | null;
  workflow_status: WorkflowStatus;
  submitted_at?: string | null;
  review_notes?: string | null;
}

const TABLE_META: Record<WorkflowTable, { label: string; icon: any; titleCol: string; subCol?: string }> = {
  case_studies:   { label: "Success Story", icon: Sparkles,          titleCol: "title",         subCol: "category" },
  testimonials:   { label: "Testimonial",   icon: MessageSquareQuote, titleCol: "patient_name",  subCol: "quote" },
  achievements:   { label: "Achievement",   icon: Award,              titleCol: "title",         subCol: "badge_type" },
  clinic_content: { label: "Content",       icon: FileText,           titleCol: "title",         subCol: "content_type" },
};

const ApprovalsManager = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending_review");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results: Row[] = [];
    for (const table of Object.keys(TABLE_META) as WorkflowTable[]) {
      const meta = TABLE_META[table];
      const cols = ["id", "workflow_status", "submitted_at", "review_notes", meta.titleCol, ...(meta.subCol ? [meta.subCol] : [])].join(",");
      let q = (supabase.from(table) as any).select(cols).order("submitted_at", { ascending: false, nullsFirst: false });
      if (filter === "pending_review") q = q.eq("workflow_status", "pending_review");
      const { data } = await q;
      (data || []).forEach((r: any) => results.push({
        id: r.id,
        table,
        title: r[meta.titleCol] ?? "(untitled)",
        subtitle: meta.subCol ? r[meta.subCol] : null,
        workflow_status: r.workflow_status,
        submitted_at: r.submitted_at,
        review_notes: r.review_notes,
      }));
    }
    results.sort((a, b) => (b.submitted_at || "").localeCompare(a.submitted_at || ""));
    setRows(results);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Approvals</h2>
          <span className="text-xs text-muted-foreground">Review content before it goes live</span>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["pending_review", "all"] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-md ${filter === f ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {f === "pending_review" ? "Pending" : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
          <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {filter === "pending_review" ? "Nothing awaiting review." : "No content yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const Icon = TABLE_META[r.table].icon;
            return (
              <div key={`${r.table}-${r.id}`} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground">{TABLE_META[r.table].label}</span>
                      <WorkflowBadge status={r.workflow_status} />
                      {r.submitted_at && (
                        <span className="text-[10px] text-muted-foreground">
                          submitted {new Date(r.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{r.subtitle}</p>}
                    {r.review_notes && (
                      <p className="text-xs text-red-600 mt-1 italic">Note: {r.review_notes}</p>
                    )}
                  </div>
                  <WorkflowActions table={r.table} id={r.id} status={r.workflow_status} onChanged={fetchAll} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsManager;
