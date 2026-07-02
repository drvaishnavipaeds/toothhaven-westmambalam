import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const AuditLogsManager = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(data ?? []);
    })();
  }, []);

  const filtered = rows.filter((r) => !q || [r.actor_email, r.action, r.entity, r.entity_id].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-muted-foreground">Last 500 events</p></div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">ID</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.actor_email ?? r.actor_id ?? "—"}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.entity}</td>
                <td className="p-3 font-mono text-xs">{r.entity_id ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No audit records</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default AuditLogsManager;
