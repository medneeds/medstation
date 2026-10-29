export type PrescriptionKind = "simples" | "controle_especial";

export interface PrintMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface PrintDoctor {
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
  logoUrl?: string | null;
}

export interface PrintPrescription {
  number: string;
  createdAt: string;
  patientName: string;
  patientCpf?: string | null;
  patientAddress?: string | null;
  medications: PrintMedication[];
  observations?: string | null;
}

export const COPY_LABELS: Record<PrescriptionKind, string[]> = {
  simples: [""],
  controle_especial: ["1ª via · Retenção da farmácia", "2ª via · Orientação ao paciente"],
};

export const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeUrl = (u?: string | null) => (u && /^https:\/\//i.test(u) ? u : "");

function doctorTitle(g?: string | null) {
  return g === "F" ? "Dra." : g === "M" ? "Dr." : "Dr(a).";
}

function header(d: PrintDoctor) {
  const reg = [d.crm && `CRM ${d.crm}${d.crmState ? `/${d.crmState}` : ""}`, d.rqe && `RQE ${d.rqe}`].filter(Boolean).join(" · ");
  const logo = safeUrl(d.logoUrl);
  return `<div class="hd">${logo ? `<img src="${esc(logo)}" alt="" class="logo"/>` : ""}<div class="who"><div class="nm">${esc(doctorTitle(d.gender))} ${esc(d.fullName)}</div><div class="sub">${esc([d.specialty, reg].filter(Boolean).join(" · "))}</div></div>${d.clinicName ? `<div class="cl">${esc(d.clinicName)}</div>` : ""}</div>`;
}

function footer(d: PrintDoctor) {
  const place = [d.address, [d.city, d.state].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  return `<div class="ft">${esc([place, d.clinicPhone || d.phone].filter(Boolean).join(" · "))}</div>`;
}

function meds(list: PrintMedication[]) {
  return list
    .filter((m) => m.name?.trim())
    .map((m, i) => {
      const line2 = [m.dosage, m.frequency, m.duration].filter((x) => x?.trim()).join(" · ");
      return `<li><div class="mn">${i + 1}. ${esc(m.name)}</div>${line2 ? `<div class="md">${esc(line2)}</div>` : ""}${m.instructions?.trim() ? `<div class="md">${esc(m.instructions)}</div>` : ""}</li>`;
    })
    .join("");
}

function via(kind: PrescriptionKind, label: string, d: PrintDoctor, p: PrintPrescription) {
  const date = new Date(p.createdAt).toLocaleDateString("pt-BR");
  const special = kind === "controle_especial";
  const title = special ? "RECEITUÁRIO DE CONTROLE ESPECIAL" : "RECEITUÁRIO";
  const buyer = special
    ? `<div class="box2"><div class="box"><div class="bt">IDENTIFICAÇÃO DO COMPRADOR</div><p>Nome: ____________________________</p><p>RG: ____________ Órgão emissor: ______</p><p>Endereço: _________________________</p><p>Cidade: ______________ UF: ____</p><p>Telefone: _________________________</p></div><div class="box"><div class="bt">IDENTIFICAÇÃO DO FORNECEDOR</div><p>&nbsp;</p><p>&nbsp;</p><p>__________________________________</p><p>Assinatura do farmacêutico</p><p>Data: ____/____/______</p></div></div>`
    : "";
  return `<section class="via">${header(d)}<div class="tt">${title}${label ? `<span class="vl">${esc(label)}</span>` : ""}</div><div class="pt"><div><b>Paciente:</b> ${esc(p.patientName)}</div>${p.patientCpf ? `<div><b>CPF:</b> ${esc(p.patientCpf)}</div>` : ""}${special ? `<div><b>Endereço:</b> ${esc(p.patientAddress || "________________________________")}</div>` : ""}</div><ol class="rx">${meds(p.medications)}</ol>${p.observations?.trim() ? `<div class="ob"><b>Observações:</b> ${esc(p.observations)}</div>` : ""}<div class="sg"><div class="ln"></div><div>${esc(doctorTitle(d.gender))} ${esc(d.fullName)}${d.crm ? ` · CRM ${esc(d.crm)}${d.crmState ? `/${esc(d.crmState)}` : ""}` : ""}</div><div class="dt">${esc(date)} · Nº ${esc(p.number)}</div></div>${buyer}${footer(d)}</section>`;
}

export function buildPrescriptionHtml(kind: PrescriptionKind, d: PrintDoctor, p: PrintPrescription): string {
  const vias = COPY_LABELS[kind].map((l) => via(kind, l, d, p)).join("");
  const landscape = kind === "controle_especial";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Receita ${esc(p.number)}</title><style>
@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:10mm}
*{box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;color:#1d2420;margin:0}
.wrap{display:flex;gap:10mm}.via{flex:1;display:flex;flex-direction:column;min-height:${landscape ? "188mm" : "275mm"};${landscape ? "border-right:1px dashed #b9c2bc;padding-right:5mm" : ""}}
.via:last-child{border-right:0;padding-right:0}
.hd{display:flex;align-items:center;gap:12px;border-bottom:1.5px solid #4f7d63;padding-bottom:8px}.logo{height:44px;max-width:110px;object-fit:contain}
.who{flex:1}.nm{font-size:16px;font-weight:700}.sub{font-size:11px;color:#55605a}.cl{font-size:11px;text-align:right;font-weight:600}
.tt{margin:12px 0 8px;font:700 12px/1.2 Arial,sans-serif;letter-spacing:.08em;display:flex;justify-content:space-between}.vl{font-weight:400;color:#55605a;letter-spacing:0}
.pt{font-size:12px;line-height:1.6;margin-bottom:8px}.rx{list-style:none;padding:0;margin:6px 0;flex:1}.rx li{margin-bottom:10px}
.mn{font-size:13px;font-weight:700}.md{font-size:12px;padding-left:14px;color:#333}.ob{font-size:11px;margin:6px 0}
.sg{text-align:center;font-size:11px;margin:16px 0 8px}.ln{border-top:1px solid #1d2420;width:60%;margin:0 auto 4px}.dt{color:#55605a}
.box2{display:flex;gap:6px;margin-bottom:6px}.box{flex:1;border:1px solid #9aa59f;padding:4px 6px;font-size:9.5px}.box p{margin:2px 0}.bt{font:700 9px Arial,sans-serif;margin-bottom:3px}
.ft{font-size:10px;color:#55605a;border-top:1px solid #d5ddd8;padding-top:4px;text-align:center}
</style></head><body><div class="wrap">${vias}</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}
