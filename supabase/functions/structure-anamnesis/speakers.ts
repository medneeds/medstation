// Reconhecimento automático de falantes (Médico / Paciente / Acompanhante) na transcrição revisada.
// Import-free para ser testável no vitest. A IA só pode rotular: o guard rejeita qualquer mudança nas palavras.

export const SPEAKER_LABELS = ["Médico", "Paciente", "Acompanhante"] as const;

export const SPEAKERS_PROMPT = `Você recebe a transcrição revisada de uma consulta médica em português, sem identificação de quem fala. Sua única tarefa é separar as falas e rotular cada uma com quem falou.

RÓTULOS PERMITIDOS: Médico, Paciente, Acompanhante.

COMO RECONHECER
- Médico: faz perguntas clínicas, examina ("vou auscultar", "respira fundo"), explica diagnóstico, prescreve, orienta, solicita exames, marca retorno.
- Paciente: relata sintomas em primeira pessoa ("eu sinto", "comecei a ter"), responde às perguntas sobre si.
- Acompanhante: fala do paciente em terceira pessoa ("ele começou", "minha mãe toma"), complementa a história.
- Uma troca de pergunta e resposta quase sempre muda o falante. Use também a referência ao vivo, quando enviada, como pista.
- Na dúvida entre Paciente e Acompanhante, use Paciente.

REGRAS ABSOLUTAS
- Não altere, corrija, resuma, acrescente nem remova nenhuma palavra. Copie o texto exatamente, apenas quebrando em falas.
- Uma fala por linha, no formato "Rótulo: texto". Sem linhas em branco extras, sem comentários, sem markdown.`;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const LABEL_RE = /^\s*(M[ée]dico|Paciente|Acompanhante)\s*:\s*/i;

/** Remove os rótulos e devolve só o texto falado. */
export function stripSpeakerLabels(labeled: string): string {
  return labeled
    .split("\n")
    .map((l) => l.replace(LABEL_RE, ""))
    .join(" ");
}

/**
 * Aceita o texto rotulado só se: toda linha não vazia tem rótulo válido e as palavras
 * são as mesmas do original, na mesma ordem (tolerância mínima para pontuação).
 * Retorna o texto rotulado limpo, ou null para manter o original.
 */
export function acceptLabeledTranscript(original: string, labeled: string): string | null {
  const lines = labeled
    .replace(/\*\*/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  if (!lines.every((l) => LABEL_RE.test(l))) return null;

  const a = words(original);
  const b = words(stripSpeakerLabels(lines.join("\n")));
  if (a.length === 0) return null;
  // permite diferença de no máximo 1% (ex.: número escrito por extenso), nunca mais que 3 palavras
  const allowed = Math.min(3, Math.floor(a.length * 0.01));
  if (Math.abs(a.length - b.length) > allowed) return null;
  let mismatches = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    // números (doses, valores, datas) nunca podem mudar
    if (/\d/.test(a[i]) || /\d/.test(b[i])) return null;
    mismatches++;
  }
  if (mismatches > allowed) return null;

  return lines
    .map((l) => {
      const m = l.match(LABEL_RE)!;
      const raw = m[1].toLowerCase();
      const label = raw.startsWith("m") ? "Médico" : raw === "paciente" ? "Paciente" : "Acompanhante";
      return `${label}: ${l.replace(LABEL_RE, "").trim()}`;
    })
    .join("\n");
}
