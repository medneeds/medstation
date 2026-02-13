import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limite total de extrações gratuitas
const RATE_LIMIT = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Parse request body first to get fingerprint
    const { messages, fileContent, usePipeSeparator, includeTime = true, fingerprint } = await req.json();

    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Criar identificador composto: IP + fingerprint (mais difícil de burlar)
    const identifier = fingerprint 
      ? `${clientIp}_${fingerprint}` 
      : clientIp;

    console.log(`Public Examinus request - IP: ${clientIp}, Fingerprint: ${fingerprint ? 'provided' : 'none'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar TODOS os registros que correspondem ao IP OU fingerprint
    // Isso previne bypass por troca de IP ou limpeza de dados
    const { data: rateLimitRecords } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("function_name", "public-examinus")
      .or(`user_id.eq.public_${clientIp},fingerprint.eq.${fingerprint || 'none'}`);

    // Calcular total de requisições considerando TODOS os registros relacionados
    let totalCount = 0;
    let existingRecord = null;

    if (rateLimitRecords && rateLimitRecords.length > 0) {
      // Somar todas as requisições de registros relacionados
      totalCount = rateLimitRecords.reduce((sum, record) => sum + (record.request_count || 0), 0);
      
      // Encontrar o registro que corresponde exatamente ao identificador atual
      existingRecord = rateLimitRecords.find(
        r => r.user_id === `public_${identifier}` || 
             (fingerprint && r.fingerprint === fingerprint)
      );
    }

    console.log(`Rate limit check - Total count: ${totalCount}, Limit: ${RATE_LIMIT}`);

    if (totalCount >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: "Você usou suas extrações gratuitas! Crie sua conta grátis para continuar usando o Examinus sem limites.",
          limitReached: true,
          usedCount: totalCount,
          limit: RATE_LIMIT
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validar mensagens
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Formato de mensagens inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update or create rate limit record
    const now = new Date();
    if (existingRecord) {
      await supabase
        .from("rate_limits")
        .update({ 
          request_count: existingRecord.request_count + 1,
          updated_at: now.toISOString(),
          fingerprint: fingerprint || existingRecord.fingerprint
        })
        .eq("id", existingRecord.id);
    } else {
      await supabase
        .from("rate_limits")
        .insert({
          user_id: `public_${identifier}`,
          function_name: "public-examinus",
          window_start: now.toISOString(),
          request_count: 1,
          updated_at: now.toISOString(),
          fingerprint: fingerprint || null
        });
    }

    // System prompt for public Examinus demo
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

⚠️ REGRA CRÍTICA DE HORÁRIO:
${includeTime 
  ? 'SEMPRE incluir horário no formato HH:MM após a data'
  : '⛔ NUNCA incluir horário (HH:MM). Use APENAS a data DD/MM seguida de dois pontos. Exemplo: 27/11: (e NÃO 27/11 08:36:)'}

💡 OPÇÃO DE ORGANIZAÇÃO:
${usePipeSeparator ? 'Use barra vertical " | " (com espaços) para separar cada parâmetro do exame.' : 'Separe parâmetros apenas com espaço.'}
Exemplo: ${usePipeSeparator 
  ? (includeTime ? '20/11 14:30: Hb 12,5 | Ht 37,2' : '20/11: Hb 12,5 | Ht 37,2')
  : (includeTime ? '20/11 14:30: Hb 12,5 Ht 37,2' : '20/11: Hb 12,5 Ht 37,2')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 LSL - LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRA FUNDAMENTAL: Extraia TODOS os exames laboratoriais presentes no texto, sem exceção. Se o exame existe no texto, ele DEVE aparecer na saída formatada.

ESTRUTURA (linha única, incluir APENAS exames presentes):
${includeTime ? 'DD/MM HH:MM' : 'DD/MM'}: [exames na ordem abaixo, separados por ${usePipeSeparator ? '" | "' : 'espaço'}]

ORDEM DE APRESENTAÇÃO (incluir somente os presentes no texto):
1. Data${includeTime ? ' e hora' : ''}
2. Hemograma: Hb, Ht, Leuco (com diferencial se disponível: Seg, Bast, Linf, Mon, Eos, Baso), Pqt
3. Função renal: Cr, Ur, TFG
4. Eletrólitos: Na, K, Ca, Cai (cálcio iônico), Mg, P, Cl
5. Função hepática: TGO, TGP, GGT, FA, BT (BD, BI), Albumina, Proteínas totais
6. Perfil lipídico: CT, HDL, LDL, TG
7. Glicemia e metabolismo: Glicemia, HbA1c, Insulina, Lactato, Ácido úrico
8. Inflamatórios/infecciosos: PCR, VHS, PCT (procalcitonina), Ferritina, DHL
9. Coagulação: TP (RNI), TTPa, Fibrinogênio, D-dímero
10. Função tireoidiana: TSH, T4L, T3
11. Cardíacos: Troponina, BNP, NT-proBNP, CK, CK-MB
12. Função pancreática: Amilase, Lipase
13. Gasometria: pH, PCO2, PO2, HCO3, BE, SatO2, Lactato
14. Outros: Ferro sérico, Transferrina, Sat. transferrina, Vitamina B12, Ácido fólico, 25-OH-vitamina D, PTH, Cortisol, LDH, Haptoglobina, Reticulócitos, Coombs, Beta-HCG, PSA, CEA, CA-125, AFP, e QUALQUER outro exame laboratorial presente

FORMATAÇÃO NUMÉRICA:
• Vírgula decimal (NUNCA ponto)
• Hemograma: 1 casa → Hb 12,5
• Outros: 2 casas → Cr 1,23
• Milhares: ponto → Leuco 14.320
• SEM UNIDADES (sem mg/dL, g/dL)
${usePipeSeparator ? '• SEPARADOR: Use " | " (espaço barra espaço) entre cada parâmetro' : ''}

EXAMES ESPECIAIS (nova linha):
(EAS): SÓ ANORMAIS - Leucócitos 50-100/campo, Hemácias 10-20/campo
(Urocultura): Agente isolado e antibiograma resumido
(Hemocultura): Agente isolado e antibiograma resumido
(Líquor): Cel, Prot, Glic, Cultura
(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8

REGRA CRÍTICA: Se um exame está no texto mas NÃO aparece na lista acima, inclua-o mesmo assim ao final da linha, usando a abreviatura mais comum. NUNCA omita um resultado presente no texto original.

EXEMPLO COMPLETO:
${usePipeSeparator 
  ? `${includeTime ? '20/11 14:30' : '20/11'}: Hb 12,5 | Ht 37,2 | Leuco 14.320 | Pqt 180.000 | Cr 1,23 | Ur 45 | Na 138 | K 4,2 | Ca 9,1 | Mg 1,8 | P 3,5 | TGO 28 | TGP 32 | Albumina 3,2 | PCR 58,3 | TP 14,2 (RNI 1,15) | TTPa 28,5\n(Gaso): pH 7,35 | PCO₂ 38 | PO₂ 92 | HCO₃ 22 | BE -2,1 | SatO₂ 96% | Lactato 1,8`
  : `${includeTime ? '20/11 14:30' : '20/11'}: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 Ca 9,1 Mg 1,8 P 3,5 TGO 28 TGP 32 Albumina 3,2 PCR 58,3 TP 14,2 (RNI 1,15) TTPa 28,5\n(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8`}

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

SE NÃO FOR EXAME: "Envie um laudo de exame."

VERSÃO DEMO: Esta é versão gratuita limitada. Crie conta para acesso completo aos 10 assistentes médicos.`;

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

    // Call Lovable AI API
    console.log("Calling Lovable AI with messages:", messages.length);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "RESPONDA SEM INTRODUÇÃO. Comece DIRETO com a data ou tipo de exame."
          },
          ...userMessages
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const newUsedCount = totalCount + 1;
    const remaining = RATE_LIMIT - newUsedCount;

    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content,
        remainingMessages: remaining,
        usedCount: newUsedCount,
        limit: RATE_LIMIT
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in public-examinus function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
