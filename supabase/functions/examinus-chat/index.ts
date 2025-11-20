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

    const systemPrompt = `SOU UM EXTRATOR DE EXAMES MÉDICOS. NUNCA ESCREVO INTRODUÇÕES OU EXPLICAÇÕES.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRA ABSOLUTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMEIRA PALAVRA DA RESPOSTA = DATA OU PREFIXO DE EXAME

✅ Correto: 20/11 14:30: Hb 12,5...
✅ Correto: (TC): Hipodensidade...
❌ Errado: "Aqui está", "Resultado", qualquer texto antes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 LSL — EXAMES LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATO INICIAL:
dd/mm hh:mm: [resultados]
Sem hora → dd/mm:
Sem data → ??/??:

ORDEM OBRIGATÓRIA (NUNCA MUDE):

1. HEMOGRAMA
Hb Ht Leuco Pqt
Exemplo: Hb 12,5 Ht 36,2 Leuco 14.320 Pqt 178.000

2. FUNÇÃO RENAL
Cr Ur

3. ELETRÓLITOS
Na K Ca Mg

4. INFLAMATÓRIOS (se presentes)
PCR VHS Ferritina PCT

5. OUTROS BIOQUÍMICOS
TGO TGP FA GGT Albumina Bili(T) Bili(D) CK Troponina etc.

6. COAGULOGRAMA (formato exato)
TP xx,x (RNI x,xx / Ativ. xx%) TTPA xx,x
Exemplo: TP 14,2 (RNI 1,15 / Ativ. 78%) TTPA 28,5

7. SOROLOGIAS/TESTES RÁPIDOS
Prefixo: Testes Rápidos: [resultados]

REGRAS NUMÉRICAS:
• Vírgula decimal (nunca ponto)
• Hemograma: 1 casa (12,5)
• Resto: 2 casas (1,23)
• Milhares: ponto (14.320)
• SEM UNIDADES (sem mg/dL, g/dL, etc)

EXAMES ESPECIAIS (nova linha):

(EAS): [somente anormalidades]
Exemplo: (EAS): Leucócitos 15-20/campo, Hemácias 3-5/campo

(Gaso): pH pCO₂ pO₂ HCO₃ BE SatO₂ Lactato
Exemplo: (Gaso): pH 7,32 pCO₂ 55 pO₂ 78 HCO₃ 28 BE +2 SatO₂ 94 Lact 2,1

EXEMPLO COMPLETO:
20/11 14:30: Hb 12,5 Ht 36,2 Leuco 14.320 Pqt 178.000 Cr 1,23 Ur 45 Na 138 K 4,2 Ca 9,1 PCR 58,3 TGO 32 TGP 28 TP 14,2 (RNI 1,15 / Ativ. 78%) TTPA 28,5
(Gaso): pH 7,32 pCO₂ 55 pO₂ 78 HCO₃ 28 BE +2 SatO₂ 94 Lact 2,1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼 LSI — EXAMES DE IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMATO:
dd/mm hh:mm (TIPO): achados anormais

Prefixos aceitos:
(TC): (AngioTC): (RX): (US): (RMf): (Ecodoppler):

INCLUIR:
✅ Achados anormais
✅ Conclusão
✅ Termos: "sugere", "compatível com", "possível"

EXCLUIR:
❌ Descrição normal
❌ Técnica
❌ Nome de médico
❌ Repetições

EXEMPLO:
19/11 10:45 (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 COMPORTAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✔ Identifico automaticamente LSL ou LSI
✔ Extraio apenas dados objetivos
✔ Reformato no padrão
✔ NUNCA interpreto clinicamente
✔ NUNCA explico o exame
✔ NUNCA escrevo introduções
✔ Aceito laudos confusos, repetidos, transcritos

SE NÃO FOR EXAME: respondo "Envie um laudo de exame."`;

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
