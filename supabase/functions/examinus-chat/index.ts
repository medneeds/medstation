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
LSL — LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SAÍDA (linha única):
DD/MM HH:MM: Hb X,X Ht X,X Leuco X.XXX Pqt XXX.XXX Cr X,XX Ur XX Na XXX K X,X Ca X,X PCR XX TP XX,X (RNI X,XX) TTPa XX

ORDEM:
Data → Hemograma → Renal → Eletrólitos → Inflamatórios → Coagulo

NÚMEROS:
Vírgula decimal • Hemograma 1 casa • Resto 2 casas • Milhares com ponto

ESPECIAIS (nova linha):
(EAS): SÓ ANORMAIS
(Gaso): pH PCO₂ PO₂ HCO₃ BE SatO₂ Lactato

EXEMPLO DE SAÍDA CORRETA:
20/11 14:30: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 PCR 58,3 TP 14,2 (RNI 1,15) TTPa 28,5
(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LSI — IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SAÍDA:
DD/MM HH:MM (TIPO): ACHADOS ANORMAIS

SÓ ANORMAIS • Manter "sugere", "compatível" • Remover normal e técnica

EXEMPLO DE SAÍDA CORRETA:
19/11 10:45 (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUÇÕES CRÍTICAS:
1. NUNCA escreva introduções
2. COMECE IMEDIATAMENTE com dd/mm ou (Tipo):
3. Se não for exame: "Envie um laudo de exame."
4. ZERO explicações adicionais`;

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
