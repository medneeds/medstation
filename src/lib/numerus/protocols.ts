import {
  adrogueMadias,
  bmi,
  bodySurfaceArea,
  creatinineClearance,
  dkaInsulin,
  fmt,
  freeWaterDeficit,
  heparinDosing,
  phenytoinLoading,
  predictedBodyWeight,
  sodiumDeficit,
  totalBodyWater,
} from "./calc";

export type FieldType = "number" | "select" | "switch";

export interface ProtocolField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface ProtocolRow {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "warn" | "good";
}

export interface ProtocolSection {
  title: string;
  rows: ProtocolRow[];
}

export interface ProtocolResult {
  sections: ProtocolSection[];
  alerts?: string[];
}

export type ProtocolCategory = "protocolos" | "eletrolitos" | "medidas" | "antibioticos";

export interface ProtocolCalc {
  id: string;
  name: string;
  category: ProtocolCategory;
  summary: string;
  fields: ProtocolField[];
  compute: (weight: number, values: Record<string, number | string | boolean>) => ProtocolResult;
}

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : fallback;
};
const sexOf = (v: unknown): "M" | "F" => (v === "F" ? "F" : "M");

/** Texto plano para o botão copiar. */
export function protocolToText(name: string, weight: number, result: ProtocolResult): string {
  const lines: string[] = [`${name.toUpperCase()} — peso ${fmt(weight, 1)} kg`, ""];
  for (const section of result.sections) {
    lines.push(section.title.toUpperCase());
    for (const row of section.rows) {
      lines.push(`- ${row.label}: ${row.value}${row.detail ? ` (${row.detail})` : ""}`);
    }
    lines.push("");
  }
  if (result.alerts?.length) {
    lines.push("ATENÇÃO");
    for (const a of result.alerts) lines.push(`- ${a}`);
    lines.push("");
  }
  lines.push("Valores de apoio ao cálculo. A decisão final é do médico assistente.");
  return lines.join("\n");
}

const mgToMl = (mg: number, concMgMl: number) => `${fmt(mg / concMgMl, 1)} mL`;

/* ------------------------------------------------------------------ */

export const protocolCalcs: ProtocolCalc[] = [
  {
    id: "iot",
    name: "Intubação orotraqueal (sequência rápida)",
    category: "protocolos",
    summary: "Pré-medicação, indução, bloqueio, resgate e checklist — em mg e mL pelo peso.",
    fields: [
      {
        key: "inducao",
        label: "Indutor",
        type: "select",
        default: "etomidato",
        options: [
          { value: "etomidato", label: "Etomidato" },
          { value: "cetamina", label: "Cetamina" },
          { value: "propofol", label: "Propofol" },
          { value: "midazolam", label: "Midazolam" },
        ],
      },
      {
        key: "bloqueio",
        label: "Bloqueador",
        type: "select",
        default: "rocuronio",
        options: [
          { value: "rocuronio", label: "Rocurônio 1,2 mg/kg" },
          { value: "succinilcolina", label: "Succinilcolina 1,5 mg/kg" },
        ],
      },
      { key: "sexo", label: "Sexo", type: "select", default: "M", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Feminino" },
      ] },
    ],
    compute: (w, v) => {
      const inducao = String(v.inducao ?? "etomidato");
      const bloqueio = String(v.bloqueio ?? "rocuronio");
      const sexo = sexOf(v.sexo);

      const indutores: Record<string, { label: string; perKg: number; conc: number }> = {
        etomidato: { label: "Etomidato 2 mg/mL", perKg: 0.3, conc: 2 },
        cetamina: { label: "Cetamina 50 mg/mL", perKg: 1.5, conc: 50 },
        propofol: { label: "Propofol 10 mg/mL", perKg: 1.5, conc: 10 },
        midazolam: { label: "Midazolam 5 mg/mL", perKg: 0.2, conc: 5 },
      };
      const bloqueadores: Record<string, { label: string; perKg: number; conc: number; onset: string }> = {
        rocuronio: { label: "Rocurônio 10 mg/mL", perKg: 1.2, conc: 10, onset: "início 45–60 s / duração 45–70 min" },
        succinilcolina: { label: "Succinilcolina 20 mg/mL (após reconstituir)", perKg: 1.5, conc: 20, onset: "início 45 s / duração 6–10 min" },
      };

      const ind = indutores[inducao];
      const blq = bloqueadores[bloqueio];
      const indMg = ind.perKg * w;
      const blqMg = blq.perKg * w;
      const fentanilMcg = 3 * w;
      const pbw = predictedBodyWeight(sexo === "M" ? 170 : 160, sexo);

      const alerts = [
        "Pré-oxigenar 3 min com O₂ a 100% e considerar VNI/cateter nasal de apneia.",
        "Checar acesso venoso pérvio, aspirador testado e material de via aérea difícil à mão.",
      ];
      if (bloqueio === "succinilcolina") {
        alerts.push("Succinilcolina contraindicada em hipercalemia, queimadura > 48 h, rabdomiólise e doença neuromuscular.");
      }

      return {
        sections: [
          {
            title: "Pré-medicação (3 min antes)",
            rows: [
              {
                label: "Fentanil 50 mcg/mL",
                value: `${fmt(fentanilMcg, 0)} mcg`,
                detail: `${fmt(fentanilMcg / 50, 1)} mL — 3 mcg/kg lento`,
              },
              {
                label: "Lidocaína 2% (opcional)",
                value: `${fmt(1.5 * w, 0)} mg`,
                detail: `${fmt((1.5 * w) / 20, 1)} mL — hipertensão intracraniana/broncoespasmo`,
              },
            ],
          },
          {
            title: "Indução",
            rows: [
              {
                label: ind.label,
                value: `${fmt(indMg, 1)} mg`,
                detail: `${mgToMl(indMg, ind.conc)} — ${ind.perKg} mg/kg`,
                tone: "good",
              },
            ],
          },
          {
            title: "Bloqueio neuromuscular",
            rows: [
              {
                label: blq.label,
                value: `${fmt(blqMg, 1)} mg`,
                detail: `${mgToMl(blqMg, blq.conc)} — ${blq.onset}`,
                tone: "good",
              },
            ],
          },
          {
            title: "Resgate imediato",
            rows: [
              {
                label: "Noradrenalina push-dose",
                value: "5–10 mcg a cada 2–5 min",
                detail: "1 mL da solução 40 mcg/mL diluído — hipotensão pós-indução",
              },
              {
                label: "Adrenalina push-dose",
                value: "10–20 mcg a cada 2–5 min",
                detail: "1 mg em 100 mL SF = 10 mcg/mL",
              },
              { label: "Atropina", value: `${fmt(Math.min(0.02 * w, 1), 2)} mg`, detail: "bradicardia periparada" },
            ],
          },
          {
            title: "Via aérea e ventilação inicial",
            rows: [
              { label: "Tubo orotraqueal", value: sexo === "M" ? "8,0–8,5" : "7,0–7,5", detail: "fixar em 21–23 cm (M) / 20–22 cm (F)" },
              { label: "Lâmina", value: sexo === "M" ? "Macintosh 4" : "Macintosh 3" },
              {
                label: "Volume corrente inicial",
                value: `${fmt(6 * pbw, 0)} mL`,
                detail: "6 mL/kg de peso predito",
              },
              { label: "PEEP inicial", value: "5 cmH₂O", detail: "titular pela oxigenação" },
            ],
          },
          {
            title: "Pós-intubação",
            rows: [
              { label: "Sedação contínua", value: "Fentanil + midazolam ou propofol", detail: "iniciar imediatamente após confirmação" },
              { label: "Confirmação", value: "Capnografia + ausculta + RX de tórax" },
            ],
          },
        ],
        alerts,
      };
    },
  },

  {
    id: "hidantalizacao",
    name: "Hidantalização (fenitoína)",
    category: "protocolos",
    summary: "Ataque, tempo mínimo de infusão, reforço e manutenção.",
    fields: [
      { key: "mgkg", label: "Dose de ataque", type: "number", unit: "mg/kg", default: 20, min: 10, max: 20, step: 1 },
    ],
    compute: (w, v) => {
      const mgkg = num(v.mgkg, 20);
      const load = phenytoinLoading(w, mgkg);
      const manutencao = 5 * w;
      return {
        sections: [
          {
            title: "Ataque",
            rows: [
              {
                label: "Fenitoína (250 mg/5 mL)",
                value: `${fmt(load.totalMg, 0)} mg`,
                detail: `${fmt(load.ampoules, 1)} ampolas — ${mgkg} mg/kg`,
                tone: "good",
              },
              {
                label: "Diluição",
                value: `em ${load.diluentMl} mL de SF 0,9%`,
                detail: "NUNCA diluir em soro glicosado (precipita)",
              },
              {
                label: "Tempo mínimo de infusão",
                value: `${fmt(load.minutes, 0)} min`,
                detail: "velocidade máxima 50 mg/min (25 mg/min em idoso/cardiopata)",
                tone: "warn",
              },
              { label: "Vazão na bomba", value: `${fmt(load.rateMlPerHour, 0)} mL/h` },
            ],
          },
          {
            title: "Reforço e manutenção",
            rows: [
              {
                label: "Dose de reforço (se crise persistir)",
                value: `${fmt(5 * w, 0)} mg`,
                detail: "5–10 mg/kg, respeitando o mesmo limite de velocidade",
              },
              {
                label: "Manutenção",
                value: `${fmt(manutencao / 3, 0)} mg EV 8/8 h`,
                detail: "5 mg/kg/dia dividido em 3 doses, iniciar 12 h após o ataque",
              },
            ],
          },
        ],
        alerts: [
          "Monitorização cardíaca contínua e PA: risco de hipotensão e bradiarritmia.",
          "Acesso calibroso e exclusivo — extravasamento causa síndrome da luva roxa.",
          "Se disponível, fosfenitoína permite infusão mais rápida (150 mg EF/min).",
        ],
      };
    },
  },

  {
    id: "hiponatremia",
    name: "Hiponatremia",
    category: "eletrolitos",
    summary: "Déficit de sódio, limite seguro de correção e vazão de NaCl 3%.",
    fields: [
      { key: "na", label: "Na atual", type: "number", unit: "mEq/L", default: 118, min: 90, max: 135, step: 1 },
      { key: "meta", label: "Correção em 24 h", type: "number", unit: "mEq/L", default: 8, min: 4, max: 10, step: 1 },
      { key: "sexo", label: "Sexo", type: "select", default: "M", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Feminino" },
      ] },
      { key: "idoso", label: "Idoso (> 65 anos)", type: "switch", default: false },
      { key: "sintomas", label: "Sintomas graves (convulsão/coma)", type: "switch", default: false },
    ],
    compute: (w, v) => {
      const na = num(v.na, 118);
      const meta = num(v.meta, 8);
      const sexo = sexOf(v.sexo);
      const idoso = Boolean(v.idoso);
      const sintomas = Boolean(v.sintomas);
      const tbw = totalBodyWater(w, sexo, idoso);
      const deficit = sodiumDeficit(na, na + meta, w, sexo, idoso);
      const deltaPorLitro = adrogueMadias(na, 513, w, sexo, idoso);
      const litros24h = deltaPorLitro > 0 ? meta / deltaPorLitro : 0;
      const mlH = (litros24h * 1000) / 24;
      const bolus = 2 * w; // 2 mL/kg de NaCl 3%

      const sections: ProtocolSection[] = [];

      if (sintomas) {
        sections.push({
          title: "Emergência sintomática — bolus",
          rows: [
            {
              label: "NaCl 3% em bolus",
              value: `${fmt(Math.min(bolus, 150), 0)} mL EV em 10–20 min`,
              detail: "repetir até 3 vezes ou até cessar a convulsão",
              tone: "warn",
            },
            { label: "Alvo do bolus", value: "elevar Na em 4–6 mEq/L rapidamente" },
          ],
        });
      }

      sections.push(
        {
          title: "Cálculo",
          rows: [
            { label: "Água corporal total", value: `${fmt(tbw, 1)} L` },
            { label: "Déficit de sódio para a meta", value: `${fmt(deficit, 0)} mEq` },
            {
              label: "Δ Na por litro de NaCl 3%",
              value: `${fmt(deltaPorLitro, 2)} mEq/L`,
              detail: "Adrogué-Madias (NaCl 3% = 513 mEq/L)",
            },
          ],
        },
        {
          title: "Infusão contínua de NaCl 3%",
          rows: [
            {
              label: "Volume em 24 h",
              value: `${fmt(litros24h * 1000, 0)} mL`,
              detail: `para elevar ${meta} mEq/L`,
            },
            { label: "Vazão", value: `${fmt(mlH, 1)} mL/h`, tone: "good" },
            { label: "Na alvo em 24 h", value: `${fmt(na + meta, 0)} mEq/L` },
          ],
        },
        {
          title: "Monitorização",
          rows: [
            { label: "Na sérico", value: "a cada 4–6 h nas primeiras 24 h" },
            { label: "Débito urinário", value: "vigiar diurese aquosa — risco de correção acelerada" },
          ],
        },
      );

      return {
        sections,
        alerts: [
          "Limite absoluto: 8–10 mEq/L em 24 h (6 mEq/L em alto risco) — acima disso, mielinólise pontina.",
          "Se a correção ultrapassar a meta, considerar desmopressina e soro glicosado 5%.",
        ],
      };
    },
  },

  {
    id: "hipernatremia",
    name: "Hipernatremia",
    category: "eletrolitos",
    summary: "Déficit de água livre, velocidade segura e volume por hora.",
    fields: [
      { key: "na", label: "Na atual", type: "number", unit: "mEq/L", default: 160, min: 145, max: 200, step: 1 },
      { key: "queda", label: "Queda em 24 h", type: "number", unit: "mEq/L", default: 10, min: 6, max: 12, step: 1 },
      { key: "sexo", label: "Sexo", type: "select", default: "M", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Feminino" },
      ] },
      { key: "idoso", label: "Idoso (> 65 anos)", type: "switch", default: false },
    ],
    compute: (w, v) => {
      const na = num(v.na, 160);
      const queda = num(v.queda, 10);
      const sexo = sexOf(v.sexo);
      const idoso = Boolean(v.idoso);
      const deficit = freeWaterDeficit(na, w, sexo, idoso);
      const perdasInsensiveis = 1; // L/dia
      const total = deficit + perdasInsensiveis;
      const deltaSG5 = adrogueMadias(na, 0, w, sexo, idoso); // negativo
      const litros24h = deltaSG5 < 0 ? queda / Math.abs(deltaSG5) : 0;

      return {
        sections: [
          {
            title: "Cálculo",
            rows: [
              { label: "Déficit de água livre", value: `${fmt(deficit, 2)} L` },
              { label: "Perdas insensíveis estimadas", value: `${fmt(perdasInsensiveis, 1)} L/dia` },
              { label: "Necessidade total em 24 h", value: `${fmt(total, 2)} L`, tone: "good" },
              {
                label: "Δ Na por litro de SG 5%",
                value: `${fmt(deltaSG5, 2)} mEq/L`,
                detail: "Adrogué-Madias",
              },
            ],
          },
          {
            title: "Reposição",
            rows: [
              {
                label: "Volume de SG 5% em 24 h",
                value: `${fmt(litros24h * 1000, 0)} mL`,
                detail: `para reduzir ${queda} mEq/L`,
              },
              { label: "Vazão", value: `${fmt((litros24h * 1000) / 24, 0)} mL/h`, tone: "good" },
              {
                label: "Via enteral (preferencial se possível)",
                value: `${fmt(total * 1000, 0)} mL de água livre por sonda em 24 h`,
              },
            ],
          },
          {
            title: "Monitorização",
            rows: [
              { label: "Na sérico", value: "a cada 4–6 h" },
              { label: "Causa de base", value: "diabetes insipidus, perdas GI, restrição de acesso à água" },
            ],
          },
        ],
        alerts: [
          "Não reduzir mais de 10–12 mEq/L em 24 h — risco de edema cerebral.",
          "Corrigir instabilidade hemodinâmica com cristaloide isotônico antes da água livre.",
        ],
      };
    },
  },

  {
    id: "glicemia-intensiva",
    name: "Controle glicêmico intensivo",
    category: "protocolos",
    summary: "Bomba de insulina EV com tabela de ajuste por glicemia capilar.",
    fields: [
      { key: "glicemia", label: "Glicemia atual", type: "number", unit: "mg/dL", default: 260, min: 40, max: 800, step: 10 },
      { key: "alvoMin", label: "Alvo mínimo", type: "number", unit: "mg/dL", default: 140, min: 80, max: 180, step: 10 },
      { key: "alvoMax", label: "Alvo máximo", type: "number", unit: "mg/dL", default: 180, min: 140, max: 220, step: 10 },
    ],
    compute: (w, v) => {
      const g = num(v.glicemia, 260);
      const alvoMin = num(v.alvoMin, 140);
      const alvoMax = num(v.alvoMax, 180);

      let sugerida = 0;
      let conduta = "";
      if (g < 70) {
        sugerida = 0;
        conduta = "Suspender insulina. Glicose 50% 40–60 mL EV e reavaliar em 15 min.";
      } else if (g < alvoMin) {
        sugerida = 0.5;
        conduta = "Reduzir 50% da vazão ou suspender conforme tendência.";
      } else if (g <= alvoMax) {
        sugerida = Math.max(1, w * 0.02);
        conduta = "Manter vazão atual. Glicemia dentro do alvo.";
      } else if (g <= 250) {
        sugerida = Math.max(2, w * 0.03);
        conduta = "Aumentar 1–2 UI/h e reavaliar em 1 h.";
      } else {
        sugerida = Math.max(3, w * 0.05);
        conduta = "Aumentar 2–3 UI/h; considerar bolus de 0,1 UI/kg se persistir.";
      }

      return {
        sections: [
          {
            title: "Preparo",
            rows: [
              { label: "Solução", value: "Insulina regular 50 UI + 50 mL SF 0,9% (1 UI/mL)" },
              { label: "Desprezar", value: "10 mL iniciais do equipo (saturação do plástico)" },
            ],
          },
          {
            title: "Dose sugerida agora",
            rows: [
              { label: "Infusão", value: `${fmt(sugerida, 1)} UI/h`, detail: `${fmt(sugerida, 1)} mL/h na bomba`, tone: g < 70 ? "warn" : "good" },
              { label: "Conduta", value: conduta },
              { label: "Bolus inicial (se CAD/EHH)", value: `${fmt(dkaInsulin(w).bolusUnits, 1)} UI` , detail: "0,1 UI/kg — opcional" },
            ],
          },
          {
            title: "Tabela de ajuste (glicemia capilar horária)",
            rows: [
              { label: "< 70 mg/dL", value: "Suspender + glicose hipertônica", tone: "warn" },
              { label: "70–139 mg/dL", value: "Reduzir 50% da vazão" },
              { label: `${alvoMin}–${alvoMax} mg/dL`, value: "Manter", tone: "good" },
              { label: `${alvoMax + 1}–250 mg/dL`, value: "Aumentar 1–2 UI/h" },
              { label: "> 250 mg/dL", value: "Aumentar 2–3 UI/h" },
            ],
          },
          {
            title: "Segurança",
            rows: [
              { label: "Glicemia capilar", value: "1/1 h até 3 medidas no alvo, depois 2/2 h" },
              { label: "Potássio", value: "controle a cada 4 h — insulina reduz K sérico" },
              { label: "Transição", value: "insulina SC basal 2 h antes de desligar a bomba" },
            ],
          },
        ],
        alerts: ["Controle muito estrito (< 110 mg/dL) aumenta hipoglicemia grave e mortalidade em UTI."],
      };
    },
  },

  {
    id: "heparinizacao",
    name: "Heparinização venosa plena",
    category: "protocolos",
    summary: "Bolus, manutenção por peso e ajuste pelo TTPa.",
    fields: [
      {
        key: "indicacao",
        label: "Indicação",
        type: "select",
        default: "tev",
        options: [
          { value: "tev", label: "TEV / TEP — 80 UI/kg + 18 UI/kg/h" },
          { value: "sca", label: "Síndrome coronariana — 60 UI/kg + 12 UI/kg/h" },
        ],
      },
      { key: "ttpa", label: "Relação TTPa atual", type: "number", unit: "x controle", default: 1.5, min: 0.8, max: 5, step: 0.1 },
    ],
    compute: (w, v) => {
      const sca = v.indicacao === "sca";
      const r = heparinDosing(w, sca ? 60 : 80, sca ? 12 : 18, 100, sca ? 4000 : 10000, sca ? 1000 : 2000);
      const ttpa = num(v.ttpa, 1.5);

      let ajuste = "";
      let tone: ProtocolRow["tone"] = "good";
      if (ttpa < 1.2) {
        ajuste = `Bolus ${fmt(w * 80, 0)} UI e aumentar 4 UI/kg/h (+${fmt(w * 4, 0)} UI/h)`;
        tone = "warn";
      } else if (ttpa < 1.5) {
        ajuste = `Aumentar 2 UI/kg/h (+${fmt(w * 2, 0)} UI/h)`;
      } else if (ttpa <= 2.5) {
        ajuste = "Manter vazão — faixa terapêutica";
      } else if (ttpa <= 3) {
        ajuste = `Reduzir 2 UI/kg/h (−${fmt(w * 2, 0)} UI/h)`;
      } else {
        ajuste = `Suspender 1 h e reduzir 3 UI/kg/h (−${fmt(w * 3, 0)} UI/h)`;
        tone = "warn";
      }

      return {
        sections: [
          {
            title: "Preparo",
            rows: [
              { label: "Solução", value: "Heparina 25.000 UI + 245 mL SF 0,9% (100 UI/mL)" },
            ],
          },
          {
            title: "Dose inicial",
            rows: [
              {
                label: "Bolus EV",
                value: `${fmt(r.bolusUnits, 0)} UI`,
                detail: `${fmt(r.bolusUnits / 5000, 2)} mL da apresentação 5.000 UI/mL`,
                tone: "good",
              },
              {
                label: "Manutenção",
                value: `${fmt(r.maintenanceUnitsPerHour, 0)} UI/h`,
                detail: `${fmt(r.rateMlPerHour, 1)} mL/h na bomba`,
                tone: "good",
              },
            ],
          },
          {
            title: "Ajuste pelo TTPa atual",
            rows: [
              { label: `TTPa ${fmt(ttpa, 1)}x`, value: ajuste, tone },
              { label: "Próximo controle", value: "TTPa 6 h após o início e 6 h após cada ajuste" },
            ],
          },
          {
            title: "Segurança",
            rows: [
              { label: "Hemograma", value: "plaquetas a cada 48 h — vigiar HIT" },
              { label: "Antídoto", value: "Protamina 1 mg neutraliza 100 UI de heparina (máx 50 mg)" },
            ],
          },
        ],
        alerts: ["Avaliar sangramento ativo, plaquetopenia e procedimentos previstos antes de anticoagular."],
      };
    },
  },

  {
    id: "cad",
    name: "Cetoacidose diabética / EHH",
    category: "protocolos",
    summary: "Hidratação, insulina EV, potássio por faixa e critérios de virada.",
    fields: [
      { key: "k", label: "Potássio sérico", type: "number", unit: "mEq/L", default: 4.2, min: 1.5, max: 8, step: 0.1 },
      { key: "glicemia", label: "Glicemia", type: "number", unit: "mg/dL", default: 480, min: 150, max: 1200, step: 10 },
    ],
    compute: (w, v) => {
      const k = num(v.k, 4.2);
      const glicemia = num(v.glicemia, 480);
      const ins = dkaInsulin(w);

      let kRow: ProtocolRow;
      if (k < 3.3) {
        kRow = {
          label: "K < 3,3 mEq/L",
          value: "NÃO iniciar insulina",
          detail: "repor 20–30 mEq/h de KCl até K ≥ 3,3",
          tone: "warn",
        };
      } else if (k < 5.2) {
        kRow = {
          label: "K 3,3–5,2 mEq/L",
          value: "20–30 mEq de KCl por litro de soro",
          detail: "manter K entre 4 e 5 mEq/L",
          tone: "good",
        };
      } else {
        kRow = { label: "K ≥ 5,2 mEq/L", value: "Não repor agora", detail: "reavaliar em 2 h" };
      }

      return {
        sections: [
          {
            title: "Hidratação",
            rows: [
              {
                label: "1ª hora",
                value: `${fmt(15 * w, 0)}–${fmt(20 * w, 0)} mL de SF 0,9%`,
                detail: "15–20 mL/kg",
                tone: "good",
              },
              {
                label: "Manutenção",
                value: `${fmt(4 * w, 0)}–${fmt(14 * w, 0)} mL/h`,
                detail: "conforme sódio corrigido e estado volêmico",
              },
            ],
          },
          {
            title: "Insulina",
            rows: [
              { label: "Bolus (opcional)", value: `${fmt(ins.bolusUnits, 1)} UI EV`, detail: "0,1 UI/kg" },
              {
                label: "Infusão contínua",
                value: `${fmt(ins.unitsPerHour, 1)} UI/h`,
                detail: "0,1 UI/kg/h — solução 1 UI/mL",
                tone: "good",
              },
              { label: "Meta de queda", value: "50–75 mg/dL por hora" },
            ],
          },
          { title: "Potássio", rows: [kRow] },
          {
            title: "Virada para soro glicosado",
            rows: [
              {
                label: glicemia <= 250 ? "Glicemia já ≤ 250 mg/dL" : "Quando glicemia ≤ 250 mg/dL (CAD)",
                value: "Associar SG 5% e reduzir insulina para 0,05 UI/kg/h",
                detail: `${fmt(w * 0.05, 1)} UI/h`,
                tone: glicemia <= 250 ? "warn" : "default",
              },
              { label: "EHH", value: "Virada com glicemia ≤ 300 mg/dL" },
            ],
          },
          {
            title: "Critérios de resolução",
            rows: [
              { label: "CAD", value: "pH > 7,3, HCO₃ ≥ 15 e ânion gap ≤ 12" },
              { label: "Transição", value: "insulina SC 1–2 h antes de suspender a EV" },
            ],
          },
        ],
        alerts: [
          "Bicarbonato apenas se pH < 6,9.",
          "Investigar sempre o fator precipitante (infecção, IAM, má adesão).",
        ],
      };
    },
  },

  {
    id: "eletrolitos",
    name: "Correção de eletrólitos",
    category: "eletrolitos",
    summary: "Potássio, magnésio, cálcio e bicarbonato com vazão segura.",
    fields: [
      { key: "k", label: "Potássio", type: "number", unit: "mEq/L", default: 2.8, min: 1.5, max: 6, step: 0.1 },
      { key: "mg", label: "Magnésio", type: "number", unit: "mg/dL", default: 1.4, min: 0.5, max: 4, step: 0.1 },
      { key: "ca", label: "Cálcio iônico", type: "number", unit: "mmol/L", default: 0.95, min: 0.5, max: 1.6, step: 0.01 },
      { key: "hco3", label: "Bicarbonato", type: "number", unit: "mEq/L", default: 12, min: 4, max: 30, step: 1 },
      { key: "be", label: "Base excess", type: "number", unit: "mEq/L", default: -12, min: -30, max: 5, step: 1 },
    ],
    compute: (w, v) => {
      const k = num(v.k, 2.8);
      const mg = num(v.mg, 1.4);
      const ca = num(v.ca, 0.95);
      const be = num(v.be, -12);

      const deficitK = k < 3.5 ? (3.5 - k) * 100 : 0; // ~100 mEq por 0,3? conservador: mostrar faixa
      const bicNecessario = be < -4 ? (0.3 * w * Math.abs(be)) / 2 : 0;

      return {
        sections: [
          {
            title: "Potássio",
            rows: [
              {
                label: `K ${fmt(k, 1)} mEq/L`,
                value:
                  k >= 3.5
                    ? "Sem reposição"
                    : k >= 3
                      ? "Reposição oral/enteral preferencial: KCl xarope 6% 15 mL 8/8 h"
                      : "Reposição EV",
                tone: k < 3 ? "warn" : "good",
              },
              {
                label: "Via periférica",
                value: "até 20 mEq/h e 40 mEq/L de concentração",
                detail: "KCl 19,1% — 1 mL = 2,5 mEq",
              },
              {
                label: "Via central",
                value: "até 40 mEq/h com monitorização contínua",
              },
              {
                label: "Déficit estimado",
                value: k < 3.5 ? `${fmt(deficitK, 0)} mEq (aproximado)` : "—",
                detail: "cada 0,3 mEq/L abaixo do normal ≈ 100 mEq de déficit corporal",
              },
              { label: "Sempre", value: "corrigir magnésio junto — hipoK é refratária sem Mg" },
            ],
          },
          {
            title: "Magnésio",
            rows: [
              {
                label: `Mg ${fmt(mg, 1)} mg/dL`,
                value: mg >= 1.8 ? "Sem reposição" : "Sulfato de magnésio 50% 2–4 g EV",
                detail: "2 g = 4 mL diluídos em 100 mL, correr em 1–2 h",
                tone: mg < 1.2 ? "warn" : "good",
              },
              { label: "Torsades / eclâmpsia", value: "2 g EV em 5–10 min" },
            ],
          },
          {
            title: "Cálcio",
            rows: [
              {
                label: `Ca iônico ${fmt(ca, 2)} mmol/L`,
                value: ca >= 1.1 ? "Sem reposição" : "Gluconato de cálcio 10% 10–20 mL EV em 10 min",
                detail: "diluir em 100 mL SG 5%; via central preferir cloreto de cálcio",
                tone: ca < 0.9 ? "warn" : "good",
              },
              { label: "Hipercalemia com alteração no ECG", value: "Gluconato de cálcio 10% 10 mL EV imediato" },
            ],
          },
          {
            title: "Bicarbonato",
            rows: [
              {
                label: `BE ${fmt(be, 0)} mEq/L`,
                value: bicNecessario > 0 ? `${fmt(bicNecessario, 0)} mEq (metade da correção)` : "Sem indicação",
                detail: "0,3 × peso × BE — repor metade e reavaliar gasometria",
                tone: "default",
              },
              {
                label: "NaHCO₃ 8,4%",
                value: bicNecessario > 0 ? `${fmt(bicNecessario, 0)} mL` : "—",
                detail: "1 mL = 1 mEq",
              },
              { label: "Indicações", value: "pH < 7,1, hipercalemia grave, intoxicação por tricíclicos" },
            ],
          },
        ],
        alerts: ["Reposição de potássio EV exige monitorização cardíaca e bomba de infusão."],
      };
    },
  },

  {
    id: "medidas",
    name: "Ventilação e medidas corporais",
    category: "medidas",
    summary: "Peso predito, volume corrente, IMC, superfície corporal e clearance.",
    fields: [
      { key: "altura", label: "Altura", type: "number", unit: "cm", default: 170, min: 130, max: 210, step: 1 },
      { key: "idade", label: "Idade", type: "number", unit: "anos", default: 60, min: 12, max: 110, step: 1 },
      { key: "creatinina", label: "Creatinina", type: "number", unit: "mg/dL", default: 1, min: 0.2, max: 12, step: 0.1 },
      { key: "sexo", label: "Sexo", type: "select", default: "M", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Feminino" },
      ] },
    ],
    compute: (w, v) => {
      const altura = num(v.altura, 170);
      const idade = num(v.idade, 60);
      const cr = num(v.creatinina, 1);
      const sexo = sexOf(v.sexo);
      const pbw = predictedBodyWeight(altura, sexo);
      const clcr = creatinineClearance(w, idade, cr, sexo);
      const imc = bmi(w, altura);

      return {
        sections: [
          {
            title: "Ventilação protetora",
            rows: [
              { label: "Peso predito (PBW)", value: `${fmt(pbw, 1)} kg`, tone: "good" },
              { label: "Volume corrente 6 mL/kg", value: `${fmt(6 * pbw, 0)} mL`, tone: "good" },
              { label: "Volume corrente 8 mL/kg", value: `${fmt(8 * pbw, 0)} mL` },
              { label: "Pressão de platô alvo", value: "≤ 30 cmH₂O" },
              { label: "Driving pressure alvo", value: "≤ 15 cmH₂O" },
            ],
          },
          {
            title: "Medidas corporais",
            rows: [
              { label: "IMC", value: `${fmt(imc, 1)} kg/m²` },
              { label: "Superfície corporal", value: `${fmt(bodySurfaceArea(w, altura), 2)} m²` },
              { label: "Água corporal total", value: `${fmt(totalBodyWater(w, sexo, idade > 65), 1)} L` },
            ],
          },
          {
            title: "Função renal",
            rows: [
              {
                label: "Clearance (Cockcroft-Gault)",
                value: `${fmt(clcr, 0)} mL/min`,
                detail: clcr < 30 ? "disfunção grave — ajustar doses" : clcr < 60 ? "disfunção moderada" : "preservada",
                tone: clcr < 30 ? "warn" : "good",
              },
              { label: "Diurese mínima", value: `${fmt(0.5 * w, 0)} mL/h`, detail: "0,5 mL/kg/h" },
            ],
          },
        ],
      };
    },
  },

  {
    id: "antibioticos",
    name: "Antibióticos com ajuste renal",
    category: "antibioticos",
    summary: "Doses por peso e por clearance para os principais antimicrobianos.",
    fields: [
      { key: "clcr", label: "Clearance de creatinina", type: "number", unit: "mL/min", default: 80, min: 5, max: 160, step: 5 },
      { key: "hd", label: "Em hemodiálise", type: "switch", default: false },
    ],
    compute: (w, v) => {
      const clcr = num(v.clcr, 80);
      const hd = Boolean(v.hd);
      const faixa = clcr >= 50 ? "normal" : clcr >= 30 ? "moderada" : clcr >= 10 ? "grave" : "terminal";

      const row = (
        label: string,
        normal: string,
        moderada: string,
        grave: string,
        terminal: string,
        detail?: string,
      ): ProtocolRow => ({
        label,
        value: hd ? terminal : { normal, moderada, grave, terminal }[faixa],
        detail,
        tone: faixa === "normal" ? "good" : "warn",
      });

      return {
        sections: [
          {
            title: `Ajuste para ClCr ${fmt(clcr, 0)} mL/min${hd ? " — hemodiálise" : ""}`,
            rows: [
              row(
                "Vancomicina",
                `Ataque ${fmt(25 * w, 0)} mg; manutenção ${fmt(15 * w, 0)} mg 12/12 h`,
                `Ataque ${fmt(25 * w, 0)} mg; manutenção ${fmt(15 * w, 0)} mg 24/24 h`,
                `Ataque ${fmt(25 * w, 0)} mg; manutenção guiada por nível sérico`,
                `Ataque ${fmt(20 * w, 0)} mg; ${fmt(7.5 * w, 0)} mg pós-diálise`,
                "ataque 25–30 mg/kg; alvo AUC/CIM 400–600",
              ),
              row(
                "Meropenem",
                "1 g 8/8 h (infusão estendida 3 h)",
                "1 g 12/12 h",
                "500 mg 12/12 h",
                "500 mg 24/24 h",
                "2 g 8/8 h em SNC/pseudomonas",
              ),
              row(
                "Piperacilina-tazobactam",
                "4,5 g 6/6 h ou 8/8 h estendida",
                "4,5 g 8/8 h",
                "2,25 g 8/8 h",
                "2,25 g 12/12 h",
              ),
              row("Cefepime", "2 g 8/8 h", "2 g 12/12 h", "1 g 24/24 h", "1 g pós-diálise"),
              row("Ceftriaxona", "2 g 24/24 h", "2 g 24/24 h", "2 g 24/24 h", "2 g 24/24 h", "sem ajuste renal"),
              row(
                "Polimixina B",
                `${fmt(1.25 * w, 0)}–${fmt(1.5 * w, 0)} mg 12/12 h`,
                `${fmt(1.25 * w, 0)} mg 12/12 h`,
                `${fmt(1.25 * w, 0)} mg 12/12 h`,
                `${fmt(1.25 * w, 0)} mg 12/12 h`,
                "não ajustar pela função renal (dose por peso corporal total)",
              ),
              row(
                "Amicacina",
                `${fmt(15 * w, 0)} mg 24/24 h`,
                `${fmt(15 * w, 0)} mg 36/36 h`,
                `${fmt(15 * w, 0)} mg 48/48 h`,
                `${fmt(7.5 * w, 0)} mg pós-diálise`,
                "15–20 mg/kg/dia; monitorar vale",
              ),
              row("Ciprofloxacino", "400 mg 8/8 h", "400 mg 12/12 h", "400 mg 24/24 h", "400 mg 24/24 h"),
              row("Fluconazol", "800 mg ataque, 400 mg/dia", "400 mg ataque, 200 mg/dia", "200 mg/dia", "400 mg pós-diálise"),
              row("Oseltamivir", "75 mg 12/12 h", "30 mg 12/12 h", "30 mg 24/24 h", "30 mg pós-diálise"),
            ],
          },
        ],
        alerts: [
          "Coletar culturas antes da primeira dose sempre que não atrasar o antibiótico.",
          "Sepse: primeira dose plena, sem redução por função renal.",
          "Reavaliar espectro em 48–72 h com o resultado das culturas.",
        ],
      };
    },
  },
];
