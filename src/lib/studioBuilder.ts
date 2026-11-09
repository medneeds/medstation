// Criador de assistentes do Studio: a IA escreve (ou ajusta) as instruções de um
// assistente a partir do pedido do médico. Reusa a função studio-chat, passando
// este roteiro como "instruções" e o pedido como mensagem.
import { MAX_STUDIO_CHARS } from "../../supabase/functions/studio-chat/models";

export const MAX_ASSISTANT_NAME = 60;
export const MAX_ASSISTANT_INSTRUCTIONS = 8000;
export const MAX_BUILDER_REQUEST = 1500;

export const ASSISTANT_BUILDER_PROMPT = `NESTA TAREFA VOCÊ É O CRIADOR DE ASSISTENTES DO STUDIO.
O médico descreve um assistente que quer usar no dia a dia. Você escreve as instruções que esse assistente vai seguir em todas as conversas.

COMO ESCREVER AS INSTRUÇÕES
- Escreva para o assistente, na segunda pessoa ("Você é...", "Responda...").
- Comece pelo papel e pelo objetivo em uma ou duas linhas.
- Diga o que o médico costuma enviar (texto, transcrição, exame, foto lida em texto) e o que fazer quando faltar informação.
- Descreva o formato da resposta: seções em MAIÚSCULAS na ordem exata, o que entra em cada uma, tamanho e tom.
- Inclua sempre estas regras de segurança, adaptadas ao tema:
  - Não inventar dados, exames, sinais, doses ou referências.
  - O que não foi informado aparece como "Não informado" ou fica fora, conforme o formato.
  - Suspeita não é diagnóstico confirmado; deixe isso claro no texto.
  - A decisão final é sempre do médico.
- Termine com uma lista curta "NUNCA" com o que o assistente não deve fazer.
- Use só títulos em MAIÚSCULAS, linhas em branco e marcadores. Não use # nem asteriscos.
- Seja específico ao pedido. Não acrescente funções que o médico não pediu.
- Máximo de 6.000 caracteres.

SE O MÉDICO ENVIAR INSTRUÇÕES ATUAIS
Mantenha o que ele já escreveu e mude só o que o pedido indica. Devolva as instruções completas, já ajustadas.

RESPONDA EXATAMENTE NESTE FORMATO, SEM NADA ANTES OU DEPOIS
NOME: nome curto do assistente, até 40 caracteres
INSTRUÇÕES:
texto completo das instruções`;

/** Mensagem enviada ao criador: o pedido e, ao ajustar, as instruções atuais. */
export function buildAssistantRequest(request: string, current?: { name?: string; instructions?: string }): string {
  const ask = request.trim().slice(0, MAX_BUILDER_REQUEST);
  const instructions = current?.instructions?.trim() ?? "";
  if (!instructions) return `PEDIDO DO MÉDICO:\n${ask}`;
  const head = `PEDIDO DO MÉDICO (AJUSTE):\n${ask || "Melhore a clareza e a segurança destas instruções."}\n\nNOME ATUAL: ${current?.name?.trim() || "Não informado"}\n\nINSTRUÇÕES ATUAIS:\n`;
  return head + instructions.slice(0, MAX_STUDIO_CHARS - head.length);
}

const cleanMarks = (s: string) =>
  s.replace(/\*\*|__/g, "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^```[a-z]*\s*$/gim, "").trim();

/** Lê a resposta do criador. Sem os marcadores, o texto inteiro vira instruções. */
export function parseAssistantDraft(text: string): { name: string; instructions: string } {
  const clean = cleanMarks(text);
  const name = clean.match(/^\s*NOME\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const idx = clean.search(/^\s*INSTRU[ÇC](?:Õ|O)ES\s*:/im);
  let instructions = idx >= 0 ? clean.slice(idx).replace(/^\s*INSTRU[ÇC](?:Õ|O)ES\s*:[ \t]*\n?/i, "") : clean.replace(/^\s*NOME\s*:.*$/im, "");
  instructions = instructions.trim().slice(0, MAX_ASSISTANT_INSTRUCTIONS);
  return { name: name.replace(/^["'“]|["'”]$/g, "").slice(0, MAX_ASSISTANT_NAME).trim(), instructions };
}
