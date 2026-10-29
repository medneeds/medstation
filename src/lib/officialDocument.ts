/**
 * Rules for the official PDF of prescriptions and exam requests.
 * Based on Lei 5.991/73 (art. 35), Portaria SVS/MS 344/98, RDC Anvisa 471/2021,
 * Lei 14.063/2020 and CFM resolutions 2.299/2021, 1.819/2007 and 2.336/2023.
 * Pure functions only, so the rules stay testable.
 */

export type RxCategory = "simples" | "antimicrobiano" | "controle_especial" | "talonario";
export type TalonarioKind = "A" | "B" | "especial";
export type SignatureMethod = "manual" | "govbr" | "icp";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const NOTIFICACAO_A = [
  "morfina", "metadona", "oxicodona", "fentanil", "petidina", "meperidina", "hidromorfona",
  "metilfenidato", "lisdexanfetamina", "dexanfetamina", "anfetamina", "modafinila", "tapentadol",
  "dimorf", "ritalina", "concerta", "venvanse", "stavigile", "oxycontin", "durogesic",
];
const NOTIFICACAO_B = [
  "clonazepam", "diazepam", "alprazolam", "lorazepam", "bromazepam", "midazolam", "flunitrazepam",
  "clobazam", "cloxazolam", "nitrazepam", "flurazepam", "estazolam", "zolpidem", "zopiclona",
  "eszopiclona", "fenobarbital", "sibutramina", "anfepramona", "femproporex", "mazindol",
  "rivotril", "valium", "frontal", "lexotan", "dormonid", "rohypnol", "stilnox", "patz", "gardenal", "urbanil",
];
const NOTIFICACAO_ESPECIAL = ["isotretinoina", "acitretina", "talidomida", "roacutan", "neotigason"];
const CONTROLE_ESPECIAL = [
  "fluoxetina", "sertralina", "paroxetina", "citalopram", "escitalopram", "fluvoxamina", "venlafaxina",
  "desvenlafaxina", "duloxetina", "bupropiona", "mirtazapina", "trazodona", "amitriptilina",
  "nortriptilina", "imipramina", "clomipramina", "vortioxetina", "agomelatina", "quetiapina",
  "risperidona", "olanzapina", "aripiprazol", "haloperidol", "clorpromazina", "levomepromazina",
  "ziprasidona", "clozapina", "paliperidona", "lurasidona", "carbamazepina", "oxcarbazepina",
  "valproato", "valproico", "divalproato", "lamotrigina", "topiramato", "gabapentina", "pregabalina",
  "levetiracetam", "lacosamida", "fenitoina", "litio", "tramadol", "codeina", "biperideno",
  "dissulfiram", "naltrexona", "testosterona", "oxandrolona", "nandrolona",
  "zoloft", "lexapro", "prozac", "pristiq", "cymbalta", "wellbutrin", "seroquel", "risperdal", "zyprexa",
  "tegretol", "depakote", "depakene", "lamictal", "lyrica", "tramal", "tylex",
];
const ANTIMICROBIANOS = [
  "amoxicilina", "ampicilina", "penicilina", "benzilpenicilina", "azitromicina", "claritromicina",
  "eritromicina", "cefalexina", "cefadroxila", "cefuroxima", "ceftriaxona", "cefaclor", "ciprofloxacino",
  "levofloxacino", "moxifloxacino", "norfloxacino", "ofloxacino", "nitrofurantoina", "sulfametoxazol",
  "trimetoprima", "metronidazol", "secnidazol", "tinidazol", "clindamicina", "doxiciclina", "tetraciclina",
  "minociclina", "linezolida", "fosfomicina", "amoxil", "clavulin", "zitromax", "bactrim", "keflex", "flagyl",
];

const hasWord = (name: string, list: string[]) => {
  const n = fold(name);
  return list.some((w) => new RegExp(`(^|[^a-z])${w}`).test(n));
};

export interface MedicationClass {
  category: RxCategory;
  talonario?: TalonarioKind;
}

export function classifyMedication(name: string): MedicationClass {
  if (!name?.trim()) return { category: "simples" };
  if (hasWord(name, NOTIFICACAO_A)) return { category: "talonario", talonario: "A" };
  if (hasWord(name, NOTIFICACAO_B)) return { category: "talonario", talonario: "B" };
  if (hasWord(name, NOTIFICACAO_ESPECIAL)) return { category: "talonario", talonario: "especial" };
  if (hasWord(name, CONTROLE_ESPECIAL)) return { category: "controle_especial" };
  if (hasWord(name, ANTIMICROBIANOS)) return { category: "antimicrobiano" };
  return { category: "simples" };
}

const RANK: Record<RxCategory, number> = { simples: 0, antimicrobiano: 1, controle_especial: 2, talonario: 3 };

/** The strictest category among the medications decides the document type. */
export function classifyPrescription(names: string[]): MedicationClass {
  let best: MedicationClass = { category: "simples" };
  for (const n of names) {
    const c = classifyMedication(n);
    if (RANK[c.category] > RANK[best.category]) best = c;
  }
  return best;
}

export const CATEGORY_LABEL: Record<RxCategory, string> = {
  simples: "Receita simples",
  antimicrobiano: "Receita de antimicrobiano",
  controle_especial: "Receita de controle especial",
  talonario: "Exige talão oficial",
};

export const TALONARIO_LABEL: Record<TalonarioKind, string> = {
  A: "Notificação de Receita A (amarela)",
  B: "Notificação de Receita B (azul)",
  especial: "Notificação de Receita Especial (retinoides/talidomida)",
};

/** Number of copies (vias) printed for each category. */
export function copiesFor(category: RxCategory): string[] {
  if (category === "antimicrobiano" || category === "controle_especial") {
    return ["1ª via - Retenção da farmácia", "2ª via - Paciente"];
  }
  return [""];
}

/** Legal validity in days; null when the doctor's own choice applies. */
export function legalValidityDays(category: RxCategory): number | null {
  if (category === "antimicrobiano") return 10;
  if (category === "controle_especial") return 30;
  return null;
}

export function effectiveValidityDays(category: RxCategory, chosen: number | null | undefined, medicationNames: string[] = []): number | null {
  const legal = [category, ...medicationNames.map((n) => classifyMedication(n).category)]
    .map(legalValidityDays)
    .filter((d): d is number => d !== null);
  if (legal.length) return Math.min(...legal);
  return chosen && chosen > 0 ? chosen : null;
}

/** True when any medication is an antimicrobial (RDC 471/2021 needs age and sex). */
export function hasAntimicrobial(names: string[]): boolean {
  return names.some((n) => classifyMedication(n).category === "antimicrobiano");
}

/** gov.br (advanced) signature is accepted only where Lei 14.063 does not require ICP-Brasil. */
export function allowedSignatureMethods(doc: "prescription" | "exam", category: RxCategory = "simples"): SignatureMethod[] {
  if (doc === "exam" || category === "simples") return ["manual", "govbr", "icp"];
  return ["manual", "icp"];
}

export interface DoctorData {
  fullName?: string | null;
  crm?: string | null;
  crmState?: string | null;
  rqe?: string | null;
  specialty?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface PatientData {
  name?: string | null;
  cpf?: string | null;
  dateOfBirth?: string | null;
  sex?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface Issue {
  field: string;
  message: string;
  blocking: boolean;
}

const empty = (v?: string | null) => !v || !v.trim();

export function doctorIssues(d: DoctorData): Issue[] {
  const out: Issue[] = [];
  if (empty(d.fullName)) out.push({ field: "fullName", message: "Nome completo do médico", blocking: true });
  if (empty(d.crm)) out.push({ field: "crm", message: "Número do CRM", blocking: true });
  if (empty(d.crmState)) out.push({ field: "crmState", message: "UF do CRM", blocking: true });
  if (empty(d.address)) out.push({ field: "address", message: "Endereço do consultório", blocking: true });
  if (empty(d.city) || empty(d.state)) out.push({ field: "city", message: "Cidade e UF do consultório", blocking: true });
  if (!empty(d.specialty) && empty(d.rqe)) {
    out.push({ field: "rqe", message: "Sem RQE a especialidade não aparece no documento", blocking: false });
  }
  return out;
}

/** Specialty may only be shown together with an RQE (CFM 2.336/2023). */
export function showSpecialty(d: DoctorData): boolean {
  return !empty(d.specialty) && !empty(d.rqe);
}

export function patientIssues(p: PatientData, doc: "prescription" | "exam", category: RxCategory = "simples", withAntimicrobial = false): Issue[] {
  const out: Issue[] = [];
  if (empty(p.name)) out.push({ field: "name", message: "Nome completo do paciente", blocking: true });
  if (doc === "prescription" && (category === "antimicrobiano" || withAntimicrobial)) {
    if (empty(p.dateOfBirth)) out.push({ field: "dateOfBirth", message: "Data de nascimento (idade obrigatória para antimicrobiano)", blocking: true });
    if (empty(p.sex)) out.push({ field: "sex", message: "Sexo (obrigatório para antimicrobiano)", blocking: true });
  }
  const needsAddress = doc === "prescription" && category === "controle_especial";
  if (empty(p.address)) {
    out.push({ field: "address", message: needsAddress ? "Endereço do paciente (obrigatório no controle especial)" : "Endereço do paciente (recomendado pela Lei 5.991/73)", blocking: needsAddress });
  }
  if (needsAddress && (empty(p.city) || empty(p.state))) {
    out.push({ field: "city", message: "Cidade e UF do paciente", blocking: true });
  }
  return out;
}

export interface RxItem {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export function medicationIssues(items: RxItem[]): Issue[] {
  const out: Issue[] = [];
  const valid = items.filter((m) => !empty(m.name));
  if (valid.length === 0) out.push({ field: "medications", message: "Inclua ao menos um medicamento", blocking: true });
  valid.forEach((m, i) => {
    if (empty(m.dosage) && empty(m.frequency)) {
      out.push({ field: `med${i}`, message: `${m.name}: informe o modo de usar`, blocking: true });
    }
  });
  return out;
}

export function ageFrom(dateOfBirth?: string | null, ref = new Date()): number | null {
  if (!dateOfBirth) return null;
  const d = new Date(`${dateOfBirth.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/** Short document code shown in the footer, derived from the record id. */
export function documentCode(id: string): string {
  const hex = id.replace(/[^a-f0-9]/gi, "").toUpperCase().slice(0, 12).padEnd(12, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** CID goes on the exam request only with the patient's consent (CFM 1.819/2007). */
export function printableCid(cid: string | null | undefined, patientConsented: boolean): string | null {
  if (!cid?.trim() || !patientConsented) return null;
  return cid.trim();
}
