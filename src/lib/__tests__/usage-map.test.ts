import { describe, expect, it } from "vitest";
import {
  buildUsageMap,
  cityKey,
  cityLabel,
  normalizeUf,
  resolveUf,
  ufFromPhone,
  UF_CODES,
} from "../../../supabase/functions/_shared/usage-map";
import { BRAZIL_STATES } from "@/data/brazilStatesMap";

const NOW = Date.parse("2026-11-13T12:00:00.000Z");
const DAY = 86_400_000;

describe("normalizeUf", () => {
  it("aceita sigla em qualquer caixa e com espaços", () => {
    expect(normalizeUf("MA")).toBe("MA");
    expect(normalizeUf(" ma ")).toBe("MA");
    expect(normalizeUf("Ma")).toBe("MA");
  });

  it("aceita o nome por extenso, com ou sem acento", () => {
    expect(normalizeUf("Maranhão")).toBe("MA");
    expect(normalizeUf("maranhao ")).toBe("MA");
    expect(normalizeUf("SÃO PAULO")).toBe("SP");
    expect(normalizeUf("Rio Grande do Norte")).toBe("RN");
    expect(normalizeUf("Distrito Federal")).toBe("DF");
  });

  it("devolve null para o que não é estado brasileiro", () => {
    expect(normalizeUf("XX")).toBeNull();
    expect(normalizeUf("Brasil")).toBeNull();
    expect(normalizeUf("")).toBeNull();
    expect(normalizeUf(null)).toBeNull();
  });
});

describe("ufFromPhone", () => {
  it("lê o DDD com e sem +55 e com máscara", () => {
    expect(ufFromPhone("(98) 98888-7777")).toBe("MA");
    expect(ufFromPhone("+55 85 98888-7777")).toBe("CE");
    expect(ufFromPhone("5511988887777")).toBe("SP");
    expect(ufFromPhone("086 3222-1111")).toBe("PI");
  });

  it("não confunde o DDD 55 (RS) com o código do país", () => {
    expect(ufFromPhone("55 99999-1234")).toBe("RS");
    expect(ufFromPhone("5555999991234")).toBe("RS");
  });

  it("devolve null para telefone incompleto ou DDD inexistente", () => {
    expect(ufFromPhone("98888-7777")).toBeNull();
    expect(ufFromPhone("(20) 98888-7777")).toBeNull();
    expect(ufFromPhone(null)).toBeNull();
  });
});

describe("resolveUf", () => {
  it("prefere o estado do perfil, depois o CRM, depois o DDD", () => {
    expect(resolveUf({ id: "1", state: "Ceará", crm_state: "MA", phone: "(11) 98888-7777" })).toEqual({ uf: "CE", source: "profile" });
    expect(resolveUf({ id: "1", state: "??", crm_state: "MA", phone: "(11) 98888-7777" })).toEqual({ uf: "MA", source: "crm" });
    expect(resolveUf({ id: "1", phone: "(11) 98888-7777" })).toEqual({ uf: "SP", source: "phone" });
    expect(resolveUf({ id: "1" })).toBeNull();
  });
});

describe("cidades", () => {
  it("junta grafias diferentes da mesma cidade", () => {
    expect(cityKey("São Luís")).toBe(cityKey(" SAO  LUIS "));
    expect(cityKey("x")).toBeNull();
    expect(cityLabel("são josé DE ribamar")).toBe("São José de Ribamar");
  });
});

describe("buildUsageMap", () => {
  const profiles = [
    { id: "a", city: "São Luís", state: "MA" },
    { id: "b", city: "Sao Luis ", state: "Maranhão" },
    { id: "c", city: "São Luís", state: "maranhao" },
    { id: "d", city: "Imperatriz", state: "MA" },
    { id: "e", crm_state: "PI" },
    { id: "f", phone: "(85) 98888-7777", city: "Fortaleza" },
    { id: "g" },
  ];
  const lastUse = {
    a: new Date(NOW - 2 * DAY).toISOString(),
    b: new Date(NOW - 90 * DAY).toISOString(),
    e: new Date(NOW - 29 * DAY).toISOString(),
    zzz: new Date(NOW).toISOString(), // uso de conta sem perfil não entra
  };
  const r = buildUsageMap(profiles, lastUse, NOW);

  it("soma totais e separa quem não tem localização", () => {
    expect(r.totals).toMatchObject({ users: 7, used: 3, active30: 2, located: 6, unlocated: 1, states: 3, cities: 3 });
    expect(r.sources).toEqual({ profile: 4, crm: 1, phone: 1 });
  });

  it("ordena os estados pelo número de contas", () => {
    expect(r.states.map((s) => s.uf)).toEqual(["MA", "CE", "PI"]);
    expect(r.states[0]).toEqual({ uf: "MA", name: "Maranhão", users: 4, used: 2, active30: 1 });
    expect(r.states.find((s) => s.uf === "PI")).toMatchObject({ users: 1, used: 1, active30: 1 });
  });

  it("agrupa cidades pela grafia mais usada e só liga à UF do perfil", () => {
    expect(r.cities[0]).toEqual({ city: "São Luís", uf: "MA", users: 3, used: 2, active30: 1 });
    expect(r.cities.find((c) => c.city === "Fortaleza")).toMatchObject({ uf: null, users: 1 });
  });

  it("a saída não carrega dados pessoais", () => {
    const text = JSON.stringify(buildUsageMap(
      [{ id: "user-123", city: "Caxias", state: "MA", phone: "(99) 98888-7777", crm_state: "MA" }],
      {}, NOW,
    ));
    expect(text).not.toContain("user-123");
    expect(text).not.toContain("98888");
  });

  it("respeita o limite de cidades", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `u${i}`, city: `Cidade ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`, state: "BA" }));
    const out = buildUsageMap(many, {}, NOW, 10);
    expect(out.cities).toHaveLength(10);
    expect(out.totals.cities).toBe(80);
  });
});

describe("desenho do mapa", () => {
  it("tem exatamente os 27 estados da lista de UFs", () => {
    expect(BRAZIL_STATES.map((s) => s.uf).sort()).toEqual([...UF_CODES].sort());
  });
});
