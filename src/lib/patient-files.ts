import Papa from "papaparse";
import { normalizedPatientName, patientPhoneKey } from "./patient-directory";

export const patientColumns = ["Patient ID", "Name", "Phone", "Email", "Date of Birth", "Gender", "Registration Date", "Address"];
export interface ImportPatient {
  name: string; phone: string; email: string | null; date_of_birth: string | null;
  gender: string | null; registered_on?: string; address: string | null;
}
export interface ReviewedPatient { row: number; patient: ImportPatient; issue: string | null; duplicate: boolean }
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function dateValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
  const result = iso ? text : local ? `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}` : "";
  if (!result || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new Error("Invalid date; use YYYY-MM-DD or DD/MM/YYYY");
  if (result > new Date().toISOString().slice(0, 10)) throw new Error("Dates cannot be in the future");
  return result;
}
export function reviewPatientRows(rows: Record<string, unknown>[], existing: { name: string; phone: string }[]): ReviewedPatient[] {
  const identity = (p: { name: string; phone: string }) => `${normalizedPatientName(p.name)}|${patientPhoneKey(p.phone)}`;
  const seen = new Set(existing.map(identity));
  return rows.filter(r => Object.values(r).some(v => v != null && String(v).trim())).map((row, index) => {
    const values = Object.fromEntries(Object.entries(row).map(([k, v]) => [key(k), v]));
    const read = (...names: string[]) => String(names.map(n => values[key(n)]).find(v => v != null && v !== "") ?? "").trim();
    const patient: ImportPatient = {
      name: read("name", "full name", "patient name") || [read("first name"), read("last name")].filter(Boolean).join(" "),
      phone: read("phone", "mobile", "phone number", "mobile number"), email: read("email") || null,
      gender: read("gender") || null, address: read("address") || null, date_of_birth: null,
    };
    let issue: string | null = null;
    try {
      patient.date_of_birth = dateValue(values.dateofbirth ?? values.dob);
      const registration = dateValue(values.registrationdate ?? values.registeredon);
      if (registration) patient.registered_on = registration;
      if (patient.name.length < 2 || patient.name.length > 100) throw new Error("Name must contain 2–100 characters");
      if (!/^\+?\d[\d\s-]{8,14}$/.test(patient.phone)) throw new Error("Invalid phone number");
      if (patient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email)) throw new Error("Invalid email");
      if ((patient.address?.length ?? 0) > 500 || (patient.gender?.length ?? 0) > 20 || (patient.email?.length ?? 0) > 255) throw new Error("Field too long");
    } catch (e) { issue = e instanceof Error ? e.message : "Invalid row"; }
    const duplicate = !issue && seen.has(identity(patient));
    if (!issue) seen.add(identity(patient));
    return { row: index + 2, patient, issue, duplicate };
  });
}
export function parsePatientCsv(text: string) {
  const result = Papa.parse<Record<string, unknown>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  if (result.errors.length) throw new Error(`CSV row ${result.errors[0].row ?? 0}: ${result.errors[0].message}`);
  return result.data;
}
export function safeSpreadsheetText(value: unknown) {
  const text = String(value ?? "");
  return /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
}
export async function readPatientFile(file: File): Promise<Record<string, unknown>[]> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parsePatientCsv(await file.text());
  if (extension === "xlsx") {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("Excel file has no worksheet");
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => { headers[col] = cell.text; });
    const rows: Record<string, unknown>[] = [];
    sheet.eachRow((row, number) => {
      if (number === 1) return;
      const record: Record<string, unknown> = {};
      headers.forEach((header, col) => { if (header) { const cell = row.getCell(col); record[header] = cell.value instanceof Date ? cell.value : cell.text; } });
      rows.push(record);
    });
    return rows;
  }
  if (extension === "pdf") {
    const pdf = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdf.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const rows: Record<string, unknown>[] = [];
    try {
      if (doc.numPages > 50) throw new Error("PDF imports are limited to 50 pages");
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const items = content.items.filter((i): i is import("pdfjs-dist/types/src/display/api").TextItem => "str" in i);
        const nameHeader = items.find(i => i.str.trim() === "Name");
        const phoneHeader = items.find(i => i.str.trim() === "Phone");
        if (!nameHeader || !phoneHeader) throw new Error("PDF must contain a text table with Name and Phone columns. Scanned PDFs need conversion to Excel or CSV.");
        const headerY = nameHeader.transform[5];
        const headers = items.filter(i => Math.abs(i.transform[5] - headerY) < 3).sort((a, b) => a.transform[4] - b.transform[4]);
        const lines = new Map<number, Record<string, unknown>>();
        for (const item of items.filter(i => i.transform[5] < headerY - 5)) {
          if (!item.str.trim()) continue;
          const y = Math.round(item.transform[5] / 3) * 3;
          const col = headers.findLastIndex(h => item.transform[4] >= h.transform[4] - 3);
          const header = headers[col];
          if (!header) continue;
          const row = lines.get(y) ?? {};
          row[header.str] = `${row[header.str] ?? ""}${item.str}`;
          lines.set(y, row);
        }
        rows.push(...[...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r).filter(r => r.Name && r.Phone));
      }
    } finally { await doc.destroy(); }
    if (!rows.length) throw new Error("No patient rows found in PDF");
    return rows;
  }
  throw new Error("Choose an .xlsx, .csv or text-table .pdf file");
}