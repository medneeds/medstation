/**
 * Núcleo de cálculo do Numerus.
 *
 * Todas as fórmulas são puras e determinísticas — nada aqui passa por IA.
 * As unidades das concentrações são sempre normalizadas para mcg/mL ou U/mL.
 */

export type DoseUnit =
  | "mcg/kg/min"
  | "mcg/min"
  | "mcg/kg/h"
  | "mg/kg/h"
  | "mg/h"
  | "U/min"
  | "U/h"
  | "U/kg/h";

export type ConcUnit = "mcg/mL" | "U/mL";

export interface Dilution {
  /** Rótulo curto exibido na pílula (ex.: "Simples") */
  label: string;
  /** Receita da diluição (ex.: "4 mL + 96 mL SG 5%") */
  recipe: string;
  /** Apresentação da ampola (ex.: "Noradrenalina 4 mg/4 mL") */
  presentation: string;
  /** Concentração final já normalizada */
  concentration: number;
  concUnit: ConcUnit;
}

export interface InfusionDrug {
  id: string;
  name: string;
  category: InfusionCategory;
  doseUnit: DoseUnit;
  /** Faixa navegável do slider */
  min: number;
  max: number;
  step: number;
  /** Faixa usual (fora dela o cartão alerta) */
  usualMin: number;
  usualMax: number;
  /** Dose inicial sugerida */
  start: number;
  dilutions: Dilution[];
  /** Observações clínicas curtas */
  notes?: string[];
  /** Dose de ataque/bolus opcional, em mg/kg ou U/kg */
  bolus?: { label: string; perKg: number; unit: "mg" | "mcg" | "U"; max?: number };
}

export type InfusionCategory = "vasoativas" | "sedacao" | "bloqueio" | "outras";

const isUnitBased = (u: DoseUnit) => u.startsWith("U/");

/** Converte a dose escolhida para quantidade por hora na unidade da concentração. */
export function amountPerHour(dose: number, unit: DoseUnit, weight: number): number {
  switch (unit) {
    case "mcg/kg/min":
      return dose * weight * 60;
    case "mcg/min":
      return dose * 60;
    case "mcg/kg/h":
      return dose * weight;
    case "mg/kg/h":
      return dose * weight * 1000;
    case "mg/h":
      return dose * 1000;
    case "U/min":
      return dose * 60;
    case "U/h":
      return dose;
    case "U/kg/h":
      return dose * weight;
    default:
      return 0;
  }
}

/** mL/h para uma dose, diluição e peso. */
export function infusionRate(
  dose: number,
  drug: Pick<InfusionDrug, "doseUnit">,
  dilution: Pick<Dilution, "concentration" | "concUnit">,
  weight: number,
): number {
  if (!dilution.concentration) return 0;
  const unitBasedDose = isUnitBased(drug.doseUnit);
  const unitBasedConc = dilution.concUnit === "U/mL";
  if (unitBasedDose !== unitBasedConc) return 0;
  return amountPerHour(dose, drug.doseUnit, weight) / dilution.concentration;
}

/** Arredondamento amigável para exibição. */
export function fmt(value: number, decimals = 1): string {
  if (!isFinite(value)) return "—";
  const rounded = Number(value.toFixed(decimals));
  return rounded.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/* ------------------------------------------------------------------ */
/* Medidas corporais                                                   */
/* ------------------------------------------------------------------ */

/** Peso predito (Devine/ARDSNet), em kg. */
export function predictedBodyWeight(heightCm: number, sex: "M" | "F"): number {
  const inchesOver5ft = heightCm / 2.54 - 60;
  const base = sex === "M" ? 50 : 45.5;
  return Math.max(0, base + 2.3 * inchesOver5ft);
}

/** Superfície corporal (Mosteller), m². */
export function bodySurfaceArea(weightKg: number, heightCm: number): number {
  return Math.sqrt((weightKg * heightCm) / 3600);
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return m > 0 ? weightKg / (m * m) : 0;
}

/** Clearance de creatinina (Cockcroft-Gault), mL/min. */
export function creatinineClearance(
  weightKg: number,
  ageYears: number,
  creatinine: number,
  sex: "M" | "F",
): number {
  if (creatinine <= 0) return 0;
  const base = ((140 - ageYears) * weightKg) / (72 * creatinine);
  return sex === "F" ? base * 0.85 : base;
}

/* ------------------------------------------------------------------ */
/* Sódio                                                               */
/* ------------------------------------------------------------------ */

/** Água corporal total (L). */
export function totalBodyWater(weightKg: number, sex: "M" | "F", elderly = false): number {
  const factor = sex === "M" ? (elderly ? 0.5 : 0.6) : elderly ? 0.45 : 0.5;
  return weightKg * factor;
}

/**
 * Fórmula de Adrogué-Madias: variação de Na sérico por litro de solução infundida.
 * `infusateNa` em mEq/L (NaCl 3% = 513; SF 0,9% = 154).
 */
export function adrogueMadias(
  serumNa: number,
  infusateNa: number,
  weightKg: number,
  sex: "M" | "F",
  elderly = false,
): number {
  const tbw = totalBodyWater(weightKg, sex, elderly);
  return (infusateNa - serumNa) / (tbw + 1);
}

/** Déficit de sódio (mEq) para atingir a meta. */
export function sodiumDeficit(
  serumNa: number,
  targetNa: number,
  weightKg: number,
  sex: "M" | "F",
  elderly = false,
): number {
  return (targetNa - serumNa) * totalBodyWater(weightKg, sex, elderly);
}

/** Déficit de água livre (L) na hipernatremia. */
export function freeWaterDeficit(
  serumNa: number,
  weightKg: number,
  sex: "M" | "F",
  elderly = false,
  targetNa = 140,
): number {
  const tbw = totalBodyWater(weightKg, sex, elderly);
  return tbw * (serumNa / targetNa - 1);
}

/* ------------------------------------------------------------------ */
/* Heparina                                                            */
/* ------------------------------------------------------------------ */

export interface HeparinResult {
  bolusUnits: number;
  maintenanceUnitsPerHour: number;
  rateMlPerHour: number;
  concentration: number;
}

/**
 * Heparina não fracionada EV — protocolo por peso.
 * Diluição padrão: 25.000 UI em 250 mL (100 UI/mL).
 */
export function heparinDosing(
  weightKg: number,
  bolusPerKg: number,
  maintenancePerKgHour: number,
  concentration = 100,
  bolusCap = 10000,
  ratePerHourCap = 2000,
): HeparinResult {
  const bolusUnits = Math.min(weightKg * bolusPerKg, bolusCap);
  const maintenanceUnitsPerHour = Math.min(weightKg * maintenancePerKgHour, ratePerHourCap);
  return {
    bolusUnits,
    maintenanceUnitsPerHour,
    rateMlPerHour: maintenanceUnitsPerHour / concentration,
    concentration,
  };
}

/* ------------------------------------------------------------------ */
/* Insulina / glicemia                                                 */
/* ------------------------------------------------------------------ */

/** Bomba de insulina regular: 1 UI/mL (50 UI em 50 mL SF). */
export function insulinRate(unitsPerHour: number, concentration = 1): number {
  return unitsPerHour / concentration;
}

/** Insulina EV inicial na CAD/EHH: 0,1 UI/kg/h (bolus opcional 0,1 UI/kg). */
export function dkaInsulin(weightKg: number, perKgHour = 0.1) {
  return {
    bolusUnits: weightKg * 0.1,
    unitsPerHour: weightKg * perKgHour,
  };
}

/* ------------------------------------------------------------------ */
/* Fenitoína                                                           */
/* ------------------------------------------------------------------ */

export function phenytoinLoading(weightKg: number, mgPerKg = 20, maxRateMgMin = 50) {
  const totalMg = weightKg * mgPerKg;
  const minutes = totalMg / Math.min(maxRateMgMin, 50);
  return {
    totalMg,
    ampoules: totalMg / 250, // ampola 250 mg/5 mL
    minutes,
    diluentMl: 250,
    rateMlPerHour: (250 / minutes) * 60,
  };
}
