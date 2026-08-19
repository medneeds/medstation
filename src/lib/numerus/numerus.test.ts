import { describe, expect, it } from "vitest";
import {
  adrogueMadias,
  creatinineClearance,
  freeWaterDeficit,
  heparinDosing,
  infusionRate,
  insulinRate,
  phenytoinLoading,
  predictedBodyWeight,
  sodiumDeficit,
} from "./calc";
import { infusionDrugs } from "./infusions";
import { protocolCalcs } from "./protocols";

const drug = (id: string) => {
  const d = infusionDrugs.find((x) => x.id === id);
  if (!d) throw new Error(`droga ${id} não encontrada`);
  return d;
};

describe("infusões", () => {
  it("noradrenalina simples: 0,1 mcg/kg/min em 60 kg = 9 mL/h", () => {
    const nora = drug("noradrenalina");
    expect(infusionRate(0.1, nora, nora.dilutions[0], 60)).toBeCloseTo(9, 3);
  });

  it("noradrenalina concentrada rende 1/5 da vazão da simples", () => {
    const nora = drug("noradrenalina");
    const c = (v: number) => nora.dilutions.find((d) => d.concentration === v)!;
    const simples = infusionRate(0.37, nora, c(40), 60);
    const conc = infusionRate(0.37, nora, c(200), 60);
    expect(simples / conc).toBeCloseTo(5, 5);
    expect(Math.round(simples)).toBe(33);
  });

  it("adrenalina 1,22 mcg/kg/min em 60 kg ≈ 44 mL/h", () => {
    const adr = drug("adrenalina");
    expect(
      Math.round(infusionRate(1.22, adr, adr.dilutions.find((d) => d.concentration === 100)!, 60)),
    ).toBe(44);
  });

  it("vasopressina 0,025 U/min na solução 0,4 U/mL ≈ 3,75 mL/h", () => {
    const vaso = drug("vasopressina");
    expect(
      infusionRate(0.025, vaso, vaso.dilutions.find((d) => d.concentration === 0.4)!, 70),
    ).toBeCloseTo(3.75, 5);
  });


  it("propofol 2 mg/kg/h em 80 kg (10 mg/mL) = 16 mL/h", () => {
    const prop = drug("propofol");
    expect(infusionRate(2, prop, prop.dilutions[0], 80)).toBeCloseTo(16, 3);
  });

  it("fentanil 2 mcg/kg/h em 70 kg (25 mcg/mL) = 5,6 mL/h", () => {
    const fent = drug("fentanil");
    expect(infusionRate(2, fent, fent.dilutions[0], 70)).toBeCloseTo(5.6, 5);
  });


  it("não mistura unidades incompatíveis", () => {
    const nora = drug("noradrenalina");
    const vaso = drug("vasopressina");
    expect(infusionRate(0.1, nora, vaso.dilutions[0], 70)).toBe(0);
  });

  it("todas as diluições têm concentração positiva", () => {
    for (const d of infusionDrugs) {
      expect(d.dilutions.length).toBeGreaterThan(0);
      for (const dil of d.dilutions) expect(dil.concentration).toBeGreaterThan(0);
      expect(d.usualMin).toBeGreaterThanOrEqual(d.min);
      expect(d.usualMax).toBeLessThanOrEqual(d.max);
    }
  });
});

describe("heparina", () => {
  it("TEV: 80 UI/kg e 18 UI/kg/h com teto", () => {
    const r = heparinDosing(80, 80, 18);
    expect(r.bolusUnits).toBe(6400);
    expect(r.maintenanceUnitsPerHour).toBe(1440);
    expect(r.rateMlPerHour).toBeCloseTo(14.4, 3);
  });

  it("respeita o teto de bolus", () => {
    expect(heparinDosing(150, 80, 18).bolusUnits).toBe(10000);
  });
});

describe("sódio", () => {
  it("déficit de sódio usa a água corporal total", () => {
    expect(sodiumDeficit(118, 126, 70, "M")).toBeCloseTo(336, 3);
  });

  it("Adrogué-Madias com NaCl 3%", () => {
    // (513 - 118) / (42 + 1) ≈ 9,19
    expect(adrogueMadias(118, 513, 70, "M")).toBeCloseTo(9.186, 2);
  });

  it("déficit de água livre na hipernatremia", () => {
    expect(freeWaterDeficit(160, 70, "M")).toBeCloseTo(6, 2);
  });
});

describe("insulina e fenitoína", () => {
  it("bomba de insulina 1 UI/mL", () => {
    expect(insulinRate(3)).toBe(3);
  });

  it("hidantalização 20 mg/kg respeita 50 mg/min", () => {
    const r = phenytoinLoading(70);
    expect(r.totalMg).toBe(1400);
    expect(r.minutes).toBeCloseTo(28, 5);
  });
});

describe("medidas", () => {
  it("peso predito masculino 170 cm ≈ 65,9 kg", () => {
    expect(predictedBodyWeight(170, "M")).toBeCloseTo(65.9, 1);
  });

  it("clearance feminino aplica fator 0,85", () => {
    const m = creatinineClearance(70, 60, 1, "M");
    const f = creatinineClearance(70, 60, 1, "F");
    expect(f / m).toBeCloseTo(0.85, 5);
  });
});

describe("protocolos", () => {
  it("todos computam sem erro com valores padrão", () => {
    for (const p of protocolCalcs) {
      const values = Object.fromEntries(p.fields.map((f) => [f.key, f.default]));
      const result = p.compute(70, values);
      expect(result.sections.length).toBeGreaterThan(0);
      for (const s of result.sections) expect(s.rows.length).toBeGreaterThan(0);
    }
  });

  it("CAD bloqueia insulina com K < 3,3", () => {
    const cad = protocolCalcs.find((p) => p.id === "cad")!;
    const r = cad.compute(70, { k: 3, glicemia: 480 });
    const kSection = r.sections.find((s) => s.title === "Potássio")!;
    expect(kSection.rows[0].value).toContain("NÃO iniciar insulina");
  });
});
