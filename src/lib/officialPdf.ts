import jsPDF from "jspdf";
import {
  ageFrom,
  copiesFor,
  documentCode,
  effectiveValidityDays,
  showSpecialty,
  type RxCategory,
  type SignatureMethod,
  type TalonarioKind,
} from "@/lib/officialDocument";

export interface PdfDoctor {
  fullName: string;
  gender?: string | null;
  crm?: string | null;
  crmState?: string | null;
  rqe?: string | null;
  specialty?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  clinicName?: string | null;
  clinicPhone?: string | null;
  logoDataUrl?: string | null;
}

export interface PdfPatient {
  name: string;
  cpf?: string | null;
  dateOfBirth?: string | null;
  sex?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface PdfMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface PdfPrescriptionInput {
  id: string;
  number: string;
  issuedAt: Date;
  category: Exclude<RxCategory, "talonario">;
  validityDays?: number | null;
  doctor: PdfDoctor;
  patient: PdfPatient;
  medications: PdfMedication[];
  observations?: string | null;
  signature: SignatureMethod;
}

export interface PdfExamInput {
  id: string;
  number: string;
  issuedAt: Date;
  doctor: PdfDoctor;
  patient: PdfPatient;
  exams: { name: string; instructions?: string }[];
  clinicalIndication?: string | null;
  cid?: string | null;
  priority?: string | null;
  observations?: string | null;
  signature: SignatureMethod;
}

export type { TalonarioKind };

const M = 18; // page margin (mm)
const W = 210;
const H = 297;
const INK: [number, number, number] = [29, 36, 32];
const MUTED: [number, number, number] = [85, 96, 90];
const ACCENT: [number, number, number] = [79, 125, 99];

const title = (g?: string | null) => (g === "F" ? "Dra." : g === "M" ? "Dr." : "Dr(a).");
const crmLine = (d: PdfDoctor) => (d.crm ? `CRM ${d.crm}${d.crmState ? `/${d.crmState}` : ""}` : "");
const longDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const shortDateTime = (d: Date) =>
  `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

function imageFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (/^data:image\/png/i.test(dataUrl)) return "PNG";
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  return null;
}

function header(doc: jsPDF, d: PdfDoctor): number {
  let x = M;
  if (d.logoDataUrl) {
    const fmt = imageFormat(d.logoDataUrl);
    if (fmt) {
      try {
        doc.addImage(d.logoDataUrl, fmt, M, 12, 22, 16, undefined, "FAST");
        x = M + 26;
      } catch {
        /* logo is optional */
      }
    }
  }
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${title(d.gender)} ${d.fullName}`, x, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const reg = [crmLine(d), d.rqe ? `RQE ${d.rqe}` : "", showSpecialty(d) ? d.specialty : ""].filter(Boolean).join("  ·  ");
  doc.text(reg, x, 23.5);
  if (d.clinicName) {
    doc.setFont("helvetica", "bold");
    doc.text(d.clinicName, W - M, 18, { align: "right" });
  }
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(M, 31, W - M, 31);
  return 39;
}

function docTitle(doc: jsPDF, y: number, text: string, label?: string) {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(text, M, y);
  if (label) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, W - M, y, { align: "right" });
  }
  return y + 8;
}

function field(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text(`${label}:`, M, y);
  const lw = doc.getTextWidth(`${label}: `);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value, W - 2 * M - lw);
  doc.text(lines, M + lw, y);
  return y + 5.5 * lines.length;
}

function patientBlock(doc: jsPDF, y: number, p: PdfPatient, opts: { ageSex: boolean; address: boolean }): number {
  y = field(doc, y, "Paciente", p.name);
  const idParts: string[] = [];
  if (p.cpf) idParts.push(`CPF ${p.cpf}`);
  if (opts.ageSex) {
    const age = ageFrom(p.dateOfBirth);
    if (age !== null) idParts.push(`${age} ${age === 1 ? "ano" : "anos"}`);
    if (p.sex) idParts.push(p.sex === "F" ? "Feminino" : "Masculino");
  }
  if (idParts.length) y = field(doc, y, "Identificação", idParts.join("  ·  "));
  if (opts.address && p.address) {
    const place = [p.address, [p.city, p.state].filter(Boolean).join("/")].filter(Boolean).join(", ");
    y = field(doc, y, "Endereço", place);
  }
  doc.setDrawColor(213, 221, 216);
  doc.setLineWidth(0.2);
  doc.line(M, y, W - M, y);
  return y + 7;
}

/** Writes a block of wrapped text; returns the new y, adding a page when needed. */
function para(doc: jsPDF, y: number, text: string, opts: { bold?: boolean; size?: number; indent?: number; color?: [number, number, number]; limit: number }): number {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? 10.5);
  doc.setTextColor(...(opts.color ?? INK));
  const indent = opts.indent ?? 0;
  const lines: string[] = doc.splitTextToSize(text, W - 2 * M - indent);
  for (const line of lines) {
    if (y > opts.limit) {
      doc.addPage();
      y = M + 6;
    }
    doc.text(line, M + indent, y);
    y += (opts.size ?? 10.5) * 0.5;
  }
  return y;
}

function signatureBlock(doc: jsPDF, top: number, d: PdfDoctor, issuedAt: Date, method: SignatureMethod) {
  const place = d.city ? `${d.city}${d.state ? `/${d.state}` : ""}, ` : "";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`${place}${longDate(issuedAt)}`, W / 2, top, { align: "center" });
  const ly = top + 16;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 45, ly, W / 2 + 45, ly);
  doc.setFont("helvetica", "bold");
  doc.text(`${title(d.gender)} ${d.fullName}`, W / 2, ly + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(crmLine(d), W / 2, ly + 9.5, { align: "center" });
  const hint = method === "manual" ? "Assinatura e carimbo do médico" : method === "govbr" ? "Assinatura eletrônica gov.br" : "Assinatura digital ICP-Brasil";
  doc.text(hint, W / 2, ly + 13.5, { align: "center" });
}

function buyerSupplierBoxes(doc: jsPDF, top: number) {
  const bw = (W - 2 * M - 6) / 2;
  const bh = 34;
  doc.setDrawColor(154, 165, 159);
  doc.setLineWidth(0.3);
  doc.rect(M, top, bw, bh);
  doc.rect(M + bw + 6, top, bw, bh);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("IDENTIFICAÇÃO DO COMPRADOR", M + 3, top + 5);
  doc.text("IDENTIFICAÇÃO DO FORNECEDOR", M + bw + 9, top + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const left = ["Nome: ______________________________", "RG: _____________ Órgão emissor: _____", "Endereço: ___________________________", "Cidade: _______________ UF: ____", "Telefone: ___________________________"];
  left.forEach((t, i) => doc.text(t, M + 3, top + 11 + i * 4.8));
  const rx = M + bw + 9;
  doc.text("______________________________", rx, top + 24);
  doc.text("Assinatura do farmacêutico", rx, top + 28);
  doc.text("Data: ____/____/______", rx, top + 32);
}

function footer(doc: jsPDF, d: PdfDoctor, id: string, number: string, issuedAt: Date) {
  const place = [d.address, [d.city, d.state].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  const contact = [place, d.clinicPhone || d.phone].filter(Boolean).join(" · ");
  doc.setDrawColor(213, 221, 216);
  doc.setLineWidth(0.2);
  doc.line(M, H - 20, W - M, H - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  if (contact) doc.text(doc.splitTextToSize(contact, W - 2 * M)[0], W / 2, H - 15, { align: "center" });
  doc.text(`Documento nº ${number}  ·  Código ${documentCode(id)}  ·  Emitido em ${shortDateTime(issuedAt)}`, W / 2, H - 10.5, { align: "center" });
}

const RX_TITLE: Record<Exclude<RxCategory, "talonario">, string> = {
  simples: "RECEITUÁRIO",
  antimicrobiano: "RECEITUÁRIO - ANTIMICROBIANO",
  controle_especial: "RECEITUÁRIO DE CONTROLE ESPECIAL",
};

export function buildPrescriptionPdf(input: PdfPrescriptionInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { category, doctor: d, patient: p } = input;
  const special = category === "controle_especial";
  const sigTop = special ? H - 98 : H - 58;
  const vias = copiesFor(category);
  const validity = effectiveValidityDays(category, input.validityDays);
  vias.forEach((label, idx) => {
    if (idx > 0) doc.addPage();
    let y = header(doc, d);
    y = docTitle(doc, y, RX_TITLE[category], label || undefined);
    y = patientBlock(doc, y, p, { ageSex: category === "antimicrobiano" || !!p.dateOfBirth, address: true });
    const limit = sigTop - 8;
    input.medications
      .filter((m) => m.name?.trim())
      .forEach((m, i) => {
        y = para(doc, y, `${i + 1}. ${m.name}`, { bold: true, size: 11, limit });
        const use = [m.dosage, m.frequency, m.duration].filter((x) => x?.trim()).join(" · ");
        if (use) y = para(doc, y + 0.5, use, { indent: 5, limit });
        if (m.instructions?.trim()) y = para(doc, y + 0.5, m.instructions, { indent: 5, color: MUTED, limit });
        y += 4;
      });
    if (input.observations?.trim()) y = para(doc, y + 2, `Observações: ${input.observations}`, { size: 9.5, limit });
    if (validity) para(doc, y + 3, `Validade: ${validity} dias a partir da data de emissão.`, { size: 9.5, color: MUTED, limit: limit + 6 });
    signatureBlock(doc, sigTop, d, input.issuedAt, input.signature);
    if (special) buyerSupplierBoxes(doc, H - 58);
    footer(doc, d, input.id, input.number, input.issuedAt);
  });
  return doc;
}

const PRIORITY: Record<string, string> = { urgent: "URGENTE", urgente: "URGENTE", emergency: "EMERGÊNCIA" };

export function buildExamRequestPdf(input: PdfExamInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { doctor: d, patient: p } = input;
  const sigTop = H - 58;
  const limit = sigTop - 8;
  let y = header(doc, d);
  y = docTitle(doc, y, "SOLICITAÇÃO DE EXAMES", input.priority ? PRIORITY[input.priority.toLowerCase()] : undefined);
  y = patientBlock(doc, y, p, { ageSex: !!p.dateOfBirth, address: true });
  if (input.clinicalIndication?.trim()) y = field(doc, y, "Indicação clínica", input.clinicalIndication) + 1;
  if (input.cid) y = field(doc, y, "CID", input.cid) + 1;
  y += 3;
  input.exams
    .filter((e) => e.name?.trim())
    .forEach((e, i) => {
      y = para(doc, y, `${i + 1}. ${e.name}`, { bold: true, size: 11, limit });
      if (e.instructions?.trim()) y = para(doc, y + 0.5, e.instructions, { indent: 5, color: MUTED, limit });
      y += 3;
    });
  if (input.observations?.trim()) para(doc, y + 2, `Observações: ${input.observations}`, { size: 9.5, limit });
  signatureBlock(doc, sigTop, d, input.issuedAt, input.signature);
  footer(doc, d, input.id, input.number, input.issuedAt);
  return doc;
}

/** Loads an https image as a data URL for jsPDF; returns null when it cannot be read. */
export async function loadImageDataUrl(url?: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
