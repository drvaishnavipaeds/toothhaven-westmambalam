// Branded Tooth Haven letterhead PDFs for invoices and prescriptions.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";

const TEAL = rgb(0.06, 0.46, 0.43);
const GREY = rgb(0.4, 0.4, 0.4);

/** Standard PDF fonts only cover Latin text; drop anything else (e.g. Tamil) safely. */
export function pdfSafe(value: unknown): string {
  return String(value ?? "").replace(/₹/g, "Rs.").replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\n]/g, "").trim();
}
export const rupees = (n: unknown) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Clinic = { name: string; address: string; phone: string; gstin?: string | null };

class Writer {
  page!: PDFPage; y = 0;
  constructor(public doc: PDFDocument, public font: PDFFont, public bold: PDFFont, public clinic: Clinic, public title: string) {}
  newPage() {
    this.page = this.doc.addPage([595, 842]);
    const p = this.page;
    p.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: TEAL });
    p.drawText(pdfSafe(this.clinic.name), { x: 40, y: 812, size: 16, font: this.bold, color: rgb(1, 1, 1) });
    p.drawText("One stop for all dental solutions", { x: 40, y: 798, size: 9, font: this.font, color: rgb(1, 1, 1) });
    p.drawText(pdfSafe(this.title), { x: 555 - this.bold.widthOfTextAtSize(pdfSafe(this.title), 13), y: 806, size: 13, font: this.bold, color: rgb(1, 1, 1) });
    p.drawText(pdfSafe(`${this.clinic.address} | ${this.clinic.phone}${this.clinic.gstin ? ` | GSTIN ${this.clinic.gstin}` : ""}`), { x: 40, y: 776, size: 8, font: this.font, color: GREY });
    p.drawLine({ start: { x: 40, y: 768 }, end: { x: 555, y: 768 }, thickness: 1, color: TEAL });
    p.drawText("www.toothhaven.in", { x: 40, y: 30, size: 8, font: this.font, color: GREY });
    this.y = 748;
  }
  ensure(h: number) { if (this.y - h < 60) this.newPage(); }
  text(t: string, opts: { size?: number; bold?: boolean; x?: number; color?: any } = {}) {
    const size = opts.size ?? 10, f = opts.bold ? this.bold : this.font, x = opts.x ?? 40;
    for (const para of pdfSafe(t).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > 555 - x && line) { this.ensure(size + 4); this.page.drawText(line, { x, y: this.y, size, font: f, color: opts.color }); this.y -= size + 4; line = word; }
        else line = next;
      }
      this.ensure(size + 4); this.page.drawText(line, { x, y: this.y, size, font: f, color: opts.color }); this.y -= size + 4;
    }
  }
  row(cells: string[], xs: number[], bold = false) {
    this.ensure(16);
    cells.forEach((c, i) => {
      const max = (xs[i + 1] ?? 555) - xs[i] - 4, f = bold ? this.bold : this.font;
      let s = pdfSafe(c); while (s && f.widthOfTextAtSize(s, 9) > max) s = s.slice(0, -1);
      this.page.drawText(s, { x: xs[i], y: this.y, size: 9, font: f });
    });
    this.y -= 6; this.page.drawLine({ start: { x: 40, y: this.y }, end: { x: 555, y: this.y }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) }); this.y -= 12;
  }
}

async function start(clinic: Clinic, title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${clinic.name} - ${title}`); doc.setProducer("Tooth Haven");
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), clinic, title);
  w.newPage();
  return w;
}

export async function invoicePdf(clinic: Clinic, inv: any, patient: any, items: any[]): Promise<Uint8Array> {
  const w = await start(clinic, Number(inv.tax ?? 0) > 0 ? "TAX INVOICE" : "INVOICE");
  w.text(`Invoice: ${inv.invoice_number}    Date: ${inv.invoice_date}`, { bold: true });
  w.text(`Bill to: ${patient.name}  |  ${patient.phone}${patient.patient_code ? `  |  ID ${patient.patient_code}` : ""}`);
  if (inv.patient_gstin) w.text(`Patient GSTIN: ${inv.patient_gstin}`, { size: 9, color: GREY });
  w.y -= 8;
  const xs = [40, 62, 290, 350, 385, 460, 495];
  w.row(["#", "Description", "HSN/SAC", "Qty", "Rate", "GST", "Amount"], xs, true);
  items.forEach((i, n) => w.row([String(n + 1), `${i.description}${i.tooth_number ? ` (Tooth ${i.tooth_number})` : ""}`, i.hsn_sac ?? "-", String(i.quantity), rupees(i.unit_price), `${Number(i.gst_rate ?? 0)}%`, rupees(i.total)], xs));
  w.y -= 6;
  const lines: [string, unknown, boolean?][] = [["Subtotal", inv.subtotal], ["Discount", -Number(inv.discount ?? 0)]];
  if (Number(inv.igst ?? 0) > 0) lines.push(["IGST", inv.igst]); else if (Number(inv.tax ?? 0) > 0) lines.push(["CGST", inv.cgst], ["SGST", inv.sgst]);
  lines.push(["Total", inv.total, true], ["Paid", inv.amount_paid], ["Balance", Number(inv.total) - Number(inv.amount_paid), true]);
  for (const [label, v, b] of lines) w.row(["", "", "", "", "", label, rupees(v)], xs, b);
  if (inv.notes) { w.y -= 6; w.text(`Notes: ${inv.notes}`, { size: 9 }); }
  w.y -= 20; w.text("Thank you for choosing Tooth Haven.", { size: 9, color: GREY });
  return await w.doc.save();
}

export async function prescriptionPdf(clinic: Clinic, rx: any, patient: any): Promise<Uint8Array> {
  const w = await start(clinic, "PRESCRIPTION");
  w.text(rx.doctor_name || "Dr. Karthik Srinivasan, BDS", { bold: true, size: 11 });
  w.text(`Patient: ${patient.name}  |  ${patient.phone}${patient.patient_code ? `  |  ID ${patient.patient_code}` : ""}`);
  w.text(`Date: ${rx.prescribed_date}${rx.diagnosis ? `  |  Diagnosis: ${rx.diagnosis}` : ""}${rx.treatment_name ? `  |  Treatment: ${rx.treatment_name}` : ""}${rx.tooth_number ? `  |  Tooth: ${rx.tooth_number}` : ""}`);
  w.y -= 8;
  w.text("Rx", { bold: true, size: 16, color: TEAL });
  const xs = [40, 62, 260, 360, 460];
  w.row(["#", "Medicine", "Dose", "Frequency", "Duration"], xs, true);
  (Array.isArray(rx.drugs) ? rx.drugs : []).forEach((d: any, i: number) => w.row([String(i + 1), d.name, d.dose, d.frequency, d.duration], xs));
  if (rx.instructions_en) { w.y -= 6; w.text("Instructions", { bold: true }); w.text(rx.instructions_en); }
  if (rx.instructions_ta) { w.y -= 4; w.text("Tamil instructions are included in the printed copy from the clinic.", { size: 8, color: GREY }); }
  if (rx.notes) { w.y -= 4; w.text(rx.notes, { size: 9 }); }
  w.y -= 40; w.text("Doctor's signature", { x: 430, size: 9, color: GREY });
  return await w.doc.save();
}
