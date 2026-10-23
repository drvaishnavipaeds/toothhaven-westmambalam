import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, FileText } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { patientColumns, readPatientFile, reviewPatientRows, safeSpreadsheetText, type ReviewedPatient } from "@/lib/patient-files";
import { toast } from "sonner";

async function allPatients() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("patients").select("id,patient_code,name,phone,email,date_of_birth,gender,registered_on,address").order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

export default function PatientFileTools({ onImported }: { onImported: () => void | Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewedPatient[] | null>(null);
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState("");
  const eligible = review?.filter(r => !r.issue && !r.duplicate) ?? [];

  async function chooseFile(file?: File) {
    if (!file) return;
    setBusy(true); setResult("");
    try {
      const rows = await readPatientFile(file);
      if (!rows.length) throw new Error("File contains no patient rows");
      if (rows.length > 5000) throw new Error("Import up to 5,000 patients per file");
      setReview(reviewPatientRows(rows, await allPatients())); setFilename(file.name);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not read patient file"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function saveImport() {
    setBusy(true);
    let added = 0;
    try {
      // Recheck against current records before writing; never overwrite existing patients.
      const fresh = reviewPatientRows(eligible.map(r => ({ ...r.patient })), await allPatients());
      const pending = fresh.filter(r => !r.issue && !r.duplicate);
      for (let offset = 0; offset < pending.length; offset += 100) {
        const { error } = await supabase.from("patients").insert(pending.slice(offset, offset + 100).map(r => r.patient));
        if (error) throw error;
        added += pending.slice(offset, offset + 100).length;
        // Remove successful rows so retry cannot reinsert them after a later batch failure.
        setReview(current => current?.map(r => pending.slice(offset, offset + 100).some(p => p.patient.name === r.patient.name && p.patient.phone === r.patient.phone) ? { ...r, duplicate: true } : r) ?? null);
      }
      setResult(`${added} patients registered. ${eligible.length - pending.length} newly detected duplicates skipped.`);
      toast.success(`${added} patients imported`);
    } catch (e) { setResult(`${added} patients registered before import stopped. ${e instanceof Error ? e.message : "Import failed"}. Remaining rows can be retried.`); }
    finally { setBusy(false); await onImported(); }
  }
  async function exportFile(format: "csv" | "xlsx" | "pdf", template = false) {
    const printWindow = format === "pdf" ? window.open("", "_blank") : null;
    if (format === "pdf" && !printWindow) { toast.error("Allow pop-ups to export PDF"); return; }
    setBusy(true);
    try {
      const patients = template ? [] : await allPatients();
      const values = patients.map(p => [p.patient_code || p.id, p.name, p.phone, p.email, p.date_of_birth, p.gender, p.registered_on, p.address]);
      const stem = template ? "tooth-haven-patient-template" : `tooth-haven-patients-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv") download(new Blob(["\uFEFF", Papa.unparse([patientColumns, ...values.map(row => row.map(safeSpreadsheetText))])], { type: "text/csv;charset=utf-8" }), `${stem}.csv`);
      if (format === "xlsx") {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        const sheet = workbook.addWorksheet("Patients");
        sheet.addRow(patientColumns); values.forEach(row => sheet.addRow(row.map(v => String(v ?? ""))));
        sheet.getRow(1).font = { bold: true, name: "Arial" };
        sheet.columns.forEach((column, i) => { column.width = [20, 30, 20, 32, 18, 14, 20, 45][i]; column.numFmt = "@"; });
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.autoFilter = { from: "A1", to: "H1" };
        const buffer = await workbook.xlsx.writeBuffer();
        download(new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${stem}.xlsx`);
      }
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${stem}</title><style>@page{size:A4 landscape;margin:12mm}body{font:10px Arial,sans-serif}h1{font-size:18px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}th:nth-child(1){width:10%}th:nth-child(2){width:16%}th:nth-child(3){width:12%}th:nth-child(4){width:18%}</style></head><body><h1>Tooth Haven — Patient directory</h1><p>${patients.length} patients · ${new Date().toLocaleDateString("en-IN")} · Confidential</p><table><thead><tr>${patientColumns.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${values.map(row => `<tr>${row.map(v => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
        printWindow.document.close(); printWindow.focus(); printWindow.print();
      }
    } catch (e) { printWindow?.close(); toast.error(e instanceof Error ? e.message : "Export failed"); }
    finally { setBusy(false); }
  }
  return <>
    <input ref={input} type="file" accept=".csv,.xlsx,.pdf" className="hidden" aria-label="Import patient file" onChange={e => void chooseFile(e.target.files?.[0])} />
    <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload className="mr-1 h-4 w-4" />Import</Button>
    <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={busy}><Download className="mr-1 h-4 w-4" />Export</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => void exportFile("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel (.xlsx)</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void exportFile("csv")}><FileText className="mr-2 h-4 w-4" />CSV (.csv)</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void exportFile("pdf")}><FileText className="mr-2 h-4 w-4" />PDF / Print</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void exportFile("xlsx", true)}>Blank import template</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>
    <Dialog open={review !== null} onOpenChange={open => { if (!open && !busy) { setReview(null); setResult(""); } }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Review patient import</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground break-all">{filename}</p>
      <p className="text-sm">{eligible.length} ready · {review?.filter(r => r.duplicate).length ?? 0} duplicates · {review?.filter(r => r.issue).length ?? 0} invalid</p>
      <p className="text-sm text-muted-foreground">Existing records remain unchanged. Family members may share a phone number. Patient IDs are assigned automatically.</p>
      <div className="overflow-x-auto max-h-80"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Row</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Registration</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{review?.map(r => <tr key={r.row} className="border-b"><td className="p-2">{r.row}</td><td className="p-2">{r.patient.name}</td><td className="p-2 whitespace-nowrap">{r.patient.phone}</td><td className="p-2 whitespace-nowrap">{r.patient.registered_on ?? "Today"}</td><td className={`p-2 ${r.issue ? "text-destructive" : "text-muted-foreground"}`}>{r.issue ?? (r.duplicate ? "Skip duplicate" : "Ready")}</td></tr>)}</tbody></table></div>
      {result && <p role="status" className="text-sm">{result}</p>}
      <Button disabled={busy || !eligible.length} onClick={() => void saveImport()}>{busy ? "Importing…" : `Import ${eligible.length} patients`}</Button>
    </DialogContent></Dialog>
  </>;
}