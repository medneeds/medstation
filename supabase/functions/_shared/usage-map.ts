// Mapa de uso (admin): regras puras para localizar cada conta em um estado e
// somar por estado e por cidade. Sem imports, para rodar igual no Deno e nos testes.
//
// Privacidade: a saída traz apenas contagens. Nome, e-mail, telefone e CRM nunca
// saem daqui; o telefone só é usado para ler o DDD quando falta o estado.

export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

export const UF_CODES = Object.keys(UF_NAMES);

/** DDD → UF (plano de numeração da Anatel). */
const DDD_UF: Record<string, string> = {
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  "21": "RJ", "22": "RJ", "24": "RJ", "27": "ES", "28": "ES",
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  "47": "SC", "48": "SC", "49": "SC",
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  "61": "DF", "62": "GO", "64": "GO", "63": "TO", "65": "MT", "66": "MT", "67": "MS", "68": "AC", "69": "RO",
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA", "79": "SE",
  "81": "PE", "87": "PE", "82": "AL", "83": "PB", "84": "RN", "85": "CE", "88": "CE", "86": "PI", "89": "PI",
  "91": "PA", "93": "PA", "94": "PA", "92": "AM", "97": "AM", "95": "RR", "96": "AP", "98": "MA", "99": "MA",
};

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(UF_NAMES).map(([uf, name]) => [plain(name), uf]),
);

/** Aceita "MA", "ma ", "Maranhão", "maranhao". Devolve a sigla ou null. */
export function normalizeUf(value: string | null | undefined): string | null {
  if (!value) return null;
  const p = plain(value);
  if (!p) return null;
  if (p.length === 2) return UF_NAMES[p] ? p : null;
  return NAME_TO_UF[p] ?? null;
}

/** Lê o DDD de um telefone brasileiro (com ou sem +55) e devolve a UF. */
export function ufFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  return DDD_UF[digits.slice(0, 2)] ?? null;
}

export type UfSource = "profile" | "crm" | "phone";

export interface UsageMapProfile {
  id: string;
  city?: string | null;
  state?: string | null;
  crm_state?: string | null;
  phone?: string | null;
}

/**
 * Ordem de confiança: estado informado no perfil, depois UF do CRM, depois DDD.
 * CRM e DDD são aproximações (o médico pode atuar em outro estado).
 */
export function resolveUf(p: UsageMapProfile): { uf: string; source: UfSource } | null {
  const fromProfile = normalizeUf(p.state);
  if (fromProfile) return { uf: fromProfile, source: "profile" };
  const fromCrm = normalizeUf(p.crm_state);
  if (fromCrm) return { uf: fromCrm, source: "crm" };
  const fromPhone = ufFromPhone(p.phone);
  if (fromPhone) return { uf: fromPhone, source: "phone" };
  return null;
}

const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

/** Chave sem acento/caixa para juntar "Sao Luis ", "São Luís" e "SÃO LUÍS". */
export function cityKey(city: string | null | undefined): string | null {
  if (!city) return null;
  const key = city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return key.length >= 2 ? key : null;
}

export function cityLabel(city: string): string {
  return city
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export interface UsageCounts {
  /** Contas cadastradas. */
  users: number;
  /** Contas que já usaram algum assistente de IA. */
  used: number;
  /** Contas que usaram nos últimos 30 dias. */
  active30: number;
}

export interface UsageMapState extends UsageCounts { uf: string; name: string }
export interface UsageMapCity extends UsageCounts { city: string; uf: string | null }

export interface UsageMapResult {
  totals: UsageCounts & { located: number; unlocated: number; states: number; cities: number };
  sources: Record<UfSource, number>;
  states: UsageMapState[];
  cities: UsageMapCity[];
}

export const ACTIVE_WINDOW_DAYS = 30;

/**
 * lastUseByUser: user_id → data ISO do último uso de IA (ausente = nunca usou).
 */
export function buildUsageMap(
  profiles: UsageMapProfile[],
  lastUseByUser: Map<string, string> | Record<string, string>,
  nowMs: number,
  maxCities = 60,
): UsageMapResult {
  const lastUse = lastUseByUser instanceof Map
    ? lastUseByUser
    : new Map(Object.entries(lastUseByUser));
  const activeSince = nowMs - ACTIVE_WINDOW_DAYS * 86_400_000;

  const totals = { users: 0, used: 0, active30: 0, located: 0, unlocated: 0, states: 0, cities: 0 };
  const sources: Record<UfSource, number> = { profile: 0, crm: 0, phone: 0 };
  const byUf = new Map<string, UsageCounts>();
  const byCity = new Map<string, UsageCounts & { uf: string | null; labels: Map<string, number> }>();

  const add = (c: UsageCounts, used: boolean, active: boolean) => {
    c.users += 1;
    if (used) c.used += 1;
    if (active) c.active30 += 1;
  };

  for (const p of profiles) {
    const last = lastUse.get(p.id);
    const used = Boolean(last);
    const active = used && Date.parse(last as string) >= activeSince;
    add(totals, used, active);

    const resolved = resolveUf(p);
    if (resolved) {
      totals.located += 1;
      sources[resolved.source] += 1;
      let c = byUf.get(resolved.uf);
      if (!c) byUf.set(resolved.uf, (c = { users: 0, used: 0, active30: 0 }));
      add(c, used, active);
    } else {
      totals.unlocated += 1;
    }

    // A cidade só é agrupada com a UF que o próprio usuário informou no perfil;
    // UF vinda de CRM/DDD não é confiável o bastante para dizer de qual cidade se trata.
    const key = cityKey(p.city);
    if (key && p.city) {
      const uf = normalizeUf(p.state);
      const id = `${key}|${uf ?? ""}`;
      let c = byCity.get(id);
      if (!c) byCity.set(id, (c = { users: 0, used: 0, active30: 0, uf, labels: new Map() }));
      add(c, used, active);
      const label = cityLabel(p.city);
      c.labels.set(label, (c.labels.get(label) ?? 0) + 1);
    }
  }

  const states: UsageMapState[] = [...byUf.entries()]
    .map(([uf, c]) => ({ uf, name: UF_NAMES[uf], ...c }))
    .sort((a, b) => b.users - a.users || a.uf.localeCompare(b.uf));

  const cities: UsageMapCity[] = [...byCity.values()]
    .map(({ labels, uf, ...c }) => ({
      // Grafia mais usada; no empate, a que tem acento (mais completa) vence.
      city: [...labels.entries()].sort(
        (a, b) => b[1] - a[1] || Number(/[\u0080-\uffff]/.test(b[0])) - Number(/[\u0080-\uffff]/.test(a[0])) || a[0].localeCompare(b[0]),
      )[0][0],
      uf,
      ...c,
    }))
    .sort((a, b) => b.users - a.users || a.city.localeCompare(b.city));

  totals.states = states.length;
  totals.cities = cities.length;

  return { totals, sources, states, cities: cities.slice(0, maxCities) };
}
