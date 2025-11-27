import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, fileContent, usePipeSeparator, includeTime = true } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `EXAMINUS AI - EXTRATOR DE EXAMES MÉDICOS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRA ABSOLUTA DE COMPORTAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NUNCA ESCREVER INTRODUÇÕES

❌ PROIBIDO começar com:
"Aqui está o resultado..."
"Segue a formatação..."
"O exame mostra..."
Qualquer texto explicativo

✅ SEMPRE começar DIRETO com:
${includeTime ? '20/11 14:30: Hb 12,5...' : '20/11: Hb 12,5...'} (para LSL)
${includeTime ? '19/11 10:45 (TC Crânio): Hipodensidade...' : '19/11 (TC Crânio): Hipodensidade...'} (para LSI)

💡 OPÇÃO DE ORGANIZAÇÃO:
${usePipeSeparator ? 'Use barra vertical "|" para separar cada parâmetro do exame.' : ''}
${!includeTime ? 'NÃO inclua horário (HH:MM), apenas a data (DD/MM).' : ''}
Exemplo: ${usePipeSeparator 
  ? (includeTime ? '20/11 14:30: Hb 12,5 | Ht 37,2' : '20/11: Hb 12,5 | Ht 37,2')
  : (includeTime ? '20/11 14:30: Hb 12,5 Ht 37,2' : '20/11: Hb 12,5 Ht 37,2')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 LSL - LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUTURA (linha única):
${usePipeSeparator 
  ? `${includeTime ? 'DD/MM HH:MM' : 'DD/MM'}: Hb X,X | Ht X,X | Leuco X.XXX | Pqt XXX.XXX | Cr X,XX | Ur XX | Na XXX | K X,X | Ca X,X | PCR XX | TP XX,X (RNI X,XX) | TTPa XX` 
  : `${includeTime ? 'DD/MM HH:MM' : 'DD/MM'}: Hb X,X Ht X,X Leuco X.XXX Pqt XXX.XXX Cr X,XX Ur XX Na XXX K X,X Ca X,X PCR XX TP XX,X (RNI X,XX) TTPa XX`}

ORDEM OBRIGATÓRIA:
1. Data${includeTime ? ' e hora' : ''}
2. Hemograma (Hb, Ht, Leuco, Pqt)
3. Função renal (Cr, Ur)
4. Eletrólitos (Na, K, Ca)
5. Inflamatórios (PCR)
6. Coagulação (TP com RNI, TTPa)

FORMATAÇÃO NUMÉRICA:
• Vírgula decimal (NUNCA ponto)
• Hemograma: 1 casa → Hb 12,5
• Outros: 2 casas → Cr 1,23
• Milhares: ponto → Leuco 14.320
• SEM UNIDADES (sem mg/dL, g/dL)
${usePipeSeparator ? '• SEPARADOR: Use " | " (espaço barra espaço) entre cada parâmetro' : ''}

EXAMES ESPECIAIS (nova linha):
(EAS): SÓ ANORMAIS - Leucócitos 50-100/campo, Hemácias 10-20/campo
(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8

EXEMPLO COMPLETO:
${usePipeSeparator 
  ? `${includeTime ? '20/11 14:30' : '20/11'}: Hb 12,5 | Ht 37,2 | Leuco 14.320 | Pqt 180.000 | Cr 1,23 | Ur 45 | Na 138 | K 4,2 | PCR 58,3 | TP 14,2 (RNI 1,15) | TTPa 28,5\n(Gaso): pH 7,35 | PCO₂ 38 | PO₂ 92 | HCO₃ 22 | BE -2,1 | SatO₂ 96% | Lactato 1,8`
  : `${includeTime ? '20/11 14:30' : '20/11'}: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 PCR 58,3 TP 14,2 (RNI 1,15) TTPa 28,5\n(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼 LSI - IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUTURA:
${includeTime ? 'DD/MM HH:MM' : 'DD/MM'} (TIPO DE EXAME): ACHADOS ANORMAIS

REGRAS:
✅ SÓ relatar anormais (ignorar normalidade)
✅ Manter: "sugere", "compatível com", "hipodensidade"
❌ Remover: informações técnicas do aparelho
❌ Condensar em descrição objetiva

EXEMPLO:
${includeTime ? '19/11 10:45' : '19/11'} (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPORTAMENTO:
• Identifico automaticamente LSL ou LSI
• Extraio apenas dados objetivos
• NÃO interpreto clinicamente
• NÃO explico o exame
• Aceito textos confusos, PDFs, imagens

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
          {
            role: "user",
            content: "RESPONDA SEM INTRODUÇÃO. Comece DIRETO com a data ou tipo de exame."
          },
          ...userMessages,
        ],
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

    const data = await response.json();
    console.log("Resposta da IA recebida");

    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e) {
    console.error("Erro no chat:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
