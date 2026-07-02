import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export type FieldType = "text" | "number" | "textarea" | "date" | "select" | "boolean";
export interface Field {
  name: string;
  label: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  hideInTable?: boolean;
  formatter?: (v: any, row?: any) => string;
}

interface Props {
  title: string;
  description?: string;
  table: string;
  fields: Field[];
  orderBy?: { column: string; ascending?: boolean };
  defaultValues?: Record<string, any>;
}

const SimpleCrud = ({ title, description, table, fields, orderBy, defaultValues = {} }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from(table as any).select("*");
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultValues });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  const save = async () => {
    const payload: Record<string, any> = {};
    fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === "number") v = v === "" || v == null ? null : Number(v);
      if (f.type === "boolean") v = !!v;
      payload[f.name] = v;
    });
    const { error } = editing
      ? await supabase.from(table as any).update(payload).eq("id", editing.id)
      : await supabase.from(table as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Created");
    setOpen(false);
    load();
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete this ${title.slice(0, -1).toLowerCase()}?`)) return;
    const { error } = await supabase.from(table as any).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const visibleFields = fields.filter((f) => !f.hideInTable);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {visibleFields.map((f) => (
                <th key={f.name} className="p-3 font-medium">{f.label}</th>
              ))}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleFields.length + 1} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={visibleFields.length + 1} className="p-6 text-center text-muted-foreground">No records yet</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30">
                {visibleFields.map((f) => (
                  <td key={f.name} className="p-3">
                    {f.formatter ? f.formatter(row[f.name], row) : String(row[f.name] ?? "—")}
                  </td>
                ))}
                <td className="p-3 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={f.name}>{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea id={f.name} value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <select id={f.name} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">-- Select --</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "boolean" ? (
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />
                ) : (
                  <Input id={f.name} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleCrud;
