import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, fileContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `VOCÊ É UM EXTRATOR AUTOMÁTICO. NÃO ESCREVA TEXTOS INTRODUTÓRIOS.

🎯 OBJETIVO: Extrair apenas resultados objetivos de exames e convertê-los para formato padronizado, enxuto e contínuo, sem interpretação clínica.

REGRA ABSOLUTA: Sua primeira palavra SEMPRE será uma data (dd/mm) ou um prefixo de exame (TC:, RX:, US:).

JAMAIS comece com:
❌ "Aqui está..."
❌ "O resultado é..."
❌ "Formatação:"
❌ Qualquer explicação

SEMPRE comece com:
✅ 20/11 14:30: Hb 12,5...
✅ 19/11 (TC): Hipodensidade...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 LSL — EXAMES LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATAÇÃO: Sempre uma única linha contínua por tipo de exame.

ESTRUTURA (ordem fixa):
dd/mm hh:mm: [Hemograma] [Renal] [Eletrólitos] [Inflamatórios] [Outros] [Coagulograma] [Sorologias]

GRUPOS E ORDEM OBRIGATÓRIA:

1. HEMOGRAMA:
Hb Ht Leuco Pqt

2. FUNÇÃO RENAL:
Cr Ur

3. ELETRÓLITOS:
Na K Ca Mg

4. INFLAMATÓRIOS (se presentes):
PCR VHS Ferritina PCT

5. OUTROS BIOQUÍMICOS:
TGO TGP FA GGT Albumina Bili(T) Bili(D) CK Troponina etc.

6. COAGULOGRAMA:
TP xx,x (RNI x,xx / Ativ. xx%) TTPA xx,x

7. SOROLOGIAS/TESTES RÁPIDOS:
Sempre ao final com prefixo
Testes Rápidos: [resultados]

NUMERAÇÃO:
• Vírgula decimal
• Hemograma → 1 casa
• Bioquímica → até 2 casas
• Milhares → ponto (14.320)

EXAMES ESPECIAIS (nova linha):
(EAS): SÓ ANORMAIS
(Gaso): pH pCO₂ pO₂ HCO₃ BE SatO₂ Lactato

EXEMPLO COMPLETO:
20/11 14:30: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 Ca 9,1 PCR 58,3 TGO 32 TGP 28 TP 14,2 (RNI 1,15 / Ativ. 78%) TTPA 28,5
(Gaso): pH 7,35 pCO₂ 38 pO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8
(EAS): Leucócitos 15-20/campo, Hemácias 3-5/campo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼 LSI — EXAMES DE IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATO:
dd/mm hh:mm (TIPO): ACHADOS ANORMAIS

Se não houver hora → dd/mm
Se não houver data → ??/??

CONTEÚDO:
✅ SÓ achados anormais/conclusões
✅ MANTER: "sugere", "compatível com", "possível", "provável"
❌ REMOVER: normal, técnica, dados administrativos

PREFIXOS ACEITOS:
(TC): (AngioTC): (RX): (US): (RMf): (Ecodoppler):

EXEMPLO:
19/11 10:45 (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente
20/11 (Ecodoppler): Trombose em veia femoral comum direita

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 RESPONSIVIDADE:
Aceito textos confusos, laudos extensos, trechos repetidos, transcrições de áudio, blocos mistos, páginas com cabeçalhos - reconstrúo tudo como LSL/LSI.

INSTRUÇÕES CRÍTICAS:
1. NUNCA escreva introduções
2. COMECE IMEDIATAMENTE com dd/mm ou (Tipo):
3. Se não for exame: "Envie um laudo de exame."
4. ZERO explicações adicionais
5. Sem interpretação clínica
6. Formato contínuo para labs (exceto EAS/Gaso)`;

    // Se houver arquivo PDF/imagem, processa com visão
    let userMessages = messages;
    if (fileContent) {
      const lastMessage = messages[messages.length - 1];
      userMessages = [
        ...messages.slice(0, -1),
        {
          role: "user",
          content: [
            {
              type: "text",
              text: lastMessage.content || "Extraia e formate este exame:"
            },
            {
              type: "image_url",
              image_url: {
                url: fileContent
              }
            }
          ]
        }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          {
            role: "user",
            content: "RESPONDA SEM INTRODUÇÃO. Comece DIRETO com a data ou tipo de exame."
          },
          ...userMessages,
        ],
        stream: true,
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Erro do gateway de IA:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro do gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Erro no chat:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
