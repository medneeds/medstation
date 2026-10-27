/**
 * Modo Operador — ações da barra de pílulas, rota inicial por subitem do menu e
 * leitura das linhas "ASSISTENTE INDICADO" para virar atalho. Os ids precisam
 * bater com supabase/functions/agent-chat/operador.ts (há teste conferindo).
 */

export type OperadorActionGroup = "geral" | "documentos" | "exames" | "burocracia";

export interface OperadorActionOption {
  value: string;
  label: string;
  group: OperadorActionGroup;
  hint: string;
}

export const OPERADOR_ACTIONS: OperadorActionOption[] = [
  { value: "livre", label: "Livre", group: "geral", hint: "Peça qualquer tarefa: converter, revisar, redigir, organizar." },
  { value: "qual_assistente", label: "Qual assistente usar?", group: "geral", hint: "Descreva a tarefa e eu indico a melhor ferramenta." },
  { value: "converter", label: "Converter documento", group: "documentos", hint: "Cole o texto e diga o formato que você quer." },
  { value: "soap", label: "Converter para SOAP", group: "documentos", hint: "Cole a anotação solta e receba no formato SOAP." },
  { value: "transferencia", label: "Relatório de transferência", group: "documentos", hint: "Cole o prontuário e receba o relatório de transferência." },
  { value: "resumo", label: "Resumo executivo", group: "documentos", hint: "Cole o texto longo e receba só o que muda conduta." },
  { value: "interconsulta", label: "Carta de interconsulta", group: "documentos", hint: "Cole o caso e diga a especialidade." },
  { value: "familia", label: "Explicar para a família", group: "documentos", hint: "Cole o caso e receba em linguagem simples." },
  { value: "anonimizar", label: "Anonimizar caso", group: "documentos", hint: "Cole o caso e receba sem dados que identifiquem o paciente." },
  { value: "exames", label: "Organizar exames", group: "exames", hint: "Cole ou anexe os exames, mesmo misturados." },
  { value: "vaga", label: "Solicitação de vaga", group: "burocracia", hint: "Cole o caso e receba o pedido para regulação, NIR ou UTI." },
  { value: "alto_custo", label: "Alto custo / LME", group: "burocracia", hint: "Cole o histórico e receba a justificativa do medicamento." },
  { value: "auditoria", label: "Resposta à auditoria", group: "burocracia", hint: "Cole o questionamento e os dados do prontuário." },
];

export const DEFAULT_OPERADOR_ACTION = "livre";

/** Subitens do menu abrem o Modo Operador já na ação certa. */
export const OPERADOR_SUBROUTES = [
  { path: "/operador", action: "livre" },
  { path: "/operador/converter", action: "converter" },
  { path: "/operador/exames", action: "exames" },
] as const;

export function operadorActionForPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return OPERADOR_SUBROUTES.find((r) => r.path === clean)?.action ?? DEFAULT_OPERADOR_ACTION;
}

export function operadorActionLabel(value: string): string {
  return OPERADOR_ACTIONS.find((a) => a.value === value)?.label ?? "Livre";
}

/** Destinos que podem aparecer como atalho, com a página de cada um. */
export const OPERADOR_REFERRAL_URLS: Record<string, string> = {
  "Clínicus": "/clinicus",
  "Examinus": "/examinus",
  "Gasometrus": "/gasometrus",
  "Scorius": "/scorius",
  "Numerus": "/numerus",
  "Prescriptus": "/prescriptus",
  "Atestus": "/atestus",
  "Protocolus": "/protocolus",
  "Orientus": "/orientus",
  "CODexus": "/codexus",
  "Mediscuss": "/mediscuss",
  "Legalis": "/legalis",
  "Modo Escuta": "/consultorio",
  "Modo Rotineiro": "/rotina",
};

export interface OperadorReferral {
  name: string;
  url: string;
  reason: string;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const REFERRAL_LINE = /^\s*[-•]?\s*ASSISTENTE INDICADO\s*:\s*(.+)$/i;

function matchTarget(raw: string): { name: string; rest: string } | null {
  const text = normalize(raw);
  // Nomes mais longos primeiro ("Modo Rotineiro" antes de qualquer prefixo).
  const names = Object.keys(OPERADOR_REFERRAL_URLS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const n = normalize(name);
    if (text.startsWith(n)) {
      return { name, rest: raw.slice(name.length) };
    }
  }
  return null;
}

/**
 * Separa as linhas de indicação do corpo da resposta: o corpo é o que o médico
 * copia para o prontuário; as indicações viram botões.
 */
export function splitOperadorReferrals(content: string): { body: string; referrals: OperadorReferral[] } {
  const lines = content.split("\n");
  const referrals: OperadorReferral[] = [];
  const kept: string[] = [];
  for (const line of lines) {
    const m = line.match(REFERRAL_LINE);
    const target = m ? matchTarget(m[1].trim()) : null;
    if (m && target) {
      if (!referrals.some((r) => r.name === target.name)) {
        referrals.push({
          name: target.name,
          url: OPERADOR_REFERRAL_URLS[target.name],
          reason: target.rest.replace(/^\s*[—–:-]\s*/, "").trim(),
        });
      }
      continue;
    }
    kept.push(line);
  }
  return { body: kept.join("\n").replace(/\s+$/, ""), referrals: referrals.slice(0, 2) };
}
