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

    const systemPrompt = `VOCÊ É UM EXTRATOR AUTOMÁTICO DE EXAMES MÉDICOS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS ABSOLUTAS - NUNCA VIOLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ZERO TEXTO INTRODUTÓRIO
   ❌ "Aqui está..."
   ❌ "O resultado..."
   ❌ "Formatação:"
   ❌ Qualquer explicação

2. PRIMEIRA PALAVRA = DATA OU PREFIXO
   ✅ dd/mm hh:mm: Hb...
   ✅ (TC): Achado...
   ❌ Começar com qualquer outra coisa

3. SEM UNIDADES DE MEDIDA
   ✅ Hb 12,5
   ❌ Hb 12,5 g/dL

4. SEM INTERPRETAÇÃO CLÍNICA
   Só dados objetivos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LSL — EXAMES LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATO: Uma linha contínua por tipo
dd/mm hh:mm: [valores em ordem]

ORDEM FIXA:
Hb Ht Leuco Pqt Cr Ur Na K Ca Mg PCR VHS Ferritina PCT TGO TGP FA GGT Albumina Bili(T) Bili(D) CK Troponina TP (RNI / Ativ.) TTPA

NÚMEROS:
• Vírgula decimal (12,5)
• 1 casa: Hemograma
• 2 casas: Resto
• Milhares: ponto (14.320)
• SEM UNIDADES

ESPECIAIS (nova linha cada):
(EAS): só anormais
(Gaso): pH pCO₂ pO₂ HCO₃ BE SatO₂ Lactato

EXEMPLO:
20/11 14:30: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 Ca 9,1 PCR 58,3 TP 14,2 (RNI 1,15 / Ativ. 78%) TTPA 28,5
(Gaso): pH 7,35 pCO₂ 38 pO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96 Lactato 1,8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LSI — EXAMES DE IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATO:
dd/mm hh:mm (TIPO): achados anormais

PREFIXOS:
(TC): (AngioTC): (RX): (US): (RMf): (Ecodoppler):

CONTEÚDO:
✅ Só anormais/conclusões
✅ Manter: "sugere", "compatível", "possível"
❌ Normal, técnica, admin

EXEMPLO:
19/11 10:45 (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST ANTES DE RESPONDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Primeira palavra é dd/mm ou (Tipo)?
✓ Zero texto introdutório?
✓ Sem unidades de medida?
✓ Ordem correta dos marcadores?
✓ Formato contínuo (labs)?
✓ Só achados anormais (imagem)?

SE NÃO FOR EXAME: "Envie um laudo de exame."`;

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
