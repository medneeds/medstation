import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Rate limiting check (50 messages per hour)
    const RATE_LIMIT = 50;
    const WINDOW_MINUTES = 60;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("function_name", "agent-chat")
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimitData && rateLimitData.request_count >= RATE_LIMIT) {
      const resetTime = new Date(new Date(rateLimitData.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      return new Response(
        JSON.stringify({ 
          error: "Limite de requisições excedido. Tente novamente mais tarde.",
          resetAt: resetTime.toISOString()
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toISOString()
          } 
        }
      );
    }

    // Update or create rate limit record
    if (rateLimitData) {
      await supabase
        .from("rate_limits")
        .update({ 
          request_count: rateLimitData.request_count + 1,
          updated_at: now.toISOString()
        })
        .eq("id", rateLimitData.id);
    } else {
      await supabase
        .from("rate_limits")
        .insert({
          user_id: user.id,
          function_name: "agent-chat",
          request_count: 1,
          window_start: now.toISOString()
        });
    }

    console.log(`Rate limit check passed for user ${user.id}`);

    const { messages, agentType, caseId, usePipeSeparator = false, includeTime = true } = await req.json();
    
    console.log("Agent chat formatting options:", { usePipeSeparator, includeTime });

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Número máximo de mensagens excedido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validAgentTypes = ["clinicus", "examinus", "scorius", "numerus", "prescriptus", "codexus"];
    if (agentType && !validAgentTypes.includes(agentType)) {
      return new Response(
        JSON.stringify({ error: "Tipo de agente inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for caseId if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (caseId && !uuidRegex.test(caseId)) {
      return new Response(
        JSON.stringify({ error: "ID de caso inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Agent chat request - Type: ${agentType}, Case: ${caseId}`);

    // Get case data and evidences if caseId is provided
    let contextData = "";
    if (caseId) {
      // Verify user owns the case
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select(`
          *,
          patients (name, date_of_birth, cpf)
        `)
        .eq("id", caseId)
        .eq("user_id", user.id)
        .single();

      if (caseError || !caseData) {
        console.error("Case access denied or not found:", caseError);
        return new Response(
          JSON.stringify({ error: "Caso não encontrado ou acesso negado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: evidences } = await supabase
        .from("evidences")
        .select("*")
        .eq("case_id", caseId)
        .eq("is_active", true);

      contextData = `
DADOS DO CASO:
- Título: ${caseData.title}
- Paciente: ${caseData.patients?.name}
- Queixa principal: ${caseData.chief_complaint || "Não informada"}
- Notas: ${caseData.notes || "Nenhuma nota"}

EVIDÊNCIAS DISPONÍVEIS:
${evidences?.map((e, i) => `
${i + 1}. ${e.title} (${e.type})
${e.content ? `Conteúdo: ${e.content.substring(0, 500)}...` : ""}
`).join("\n") || "Nenhuma evidência disponível"}
`;
    }

    // Define agent personalities and system prompts
    const agentPrompts: Record<string, string> = {
      clinicus: `📘 PROMPT-CLÍNICUS

Você é o Clínicus, assistente clínico virtual especializado em transformar relatos médicos, anotações de prontuário, evoluções, transcrições e registros hospitalares em documentos clínicos estruturados de alto nível, utilizando linguagem médica técnica, precisa, fluida, sem invenções e compatível com prática hospitalar contemporânea. Sua função é produzir, em toda solicitação, quatro entregas obrigatórias e padronizadas.

ANAMNESE HOSPITALAR ESTRUTURADA
Sempre seguir exatamente este formato e ordem:

História da Doença Atual
Organizar de forma cronológica, clara e objetiva. Não inventar ou acrescentar sintomas inexistentes. Remover redundâncias e inconsistências. Linguagem técnica.

Antecedentes Pessoais Patológicos
Listar apenas o que foi informado.

Medicações de Uso Contínuo

Alergias

Exame Físico
Estado geral
Sinais vitais
ACV
AR
Abdome
Neurológico
Extremidades
Outros sistemas
(Apenas mencionar os sistemas realmente descritos no relato.)

Exames Complementares
Interpretar com precisão técnica somente o que foi informado.

Parecer de Especialidades

Evolução / Impressão
Raciocínio clínico objetivo, baseado exclusivamente nos dados presentes no relato.

Hipóteses Diagnósticas
Compatíveis com a história e dados fornecidos. Não adicionar diagnósticos não sustentados pelo texto.

Plano Terapêutico
Organizar por linhas. Condutas imediatas, monitorização, exames, encaminhamentos e seguimento. Não adicionar condutas inventadas; usar apenas o que for citado ou aquilo universalmente aceito e óbvio, como drenagem em pneumotórax volumoso.

Metas Terapêuticas

Condutas Baseadas em Evidências
Descrever de forma objetiva as condutas respaldadas por evidências amplamente adotadas na prática hospitalar.

Evidências
Listar apenas as fontes, sem explicações:
American College of Chest Physicians Consensus Statement (ACCP).
British Thoracic Society Pleural Disease Guidelines (BTS).
European Respiratory Society Statements (ERS).
Protocolos institucionais amplamente utilizados.

PASSAGEM DE CASO
Gerar sempre um parágrafo técnico, fluido e objetivo, seguindo o modelo:
Paciente [sexo, idade], com [comorbidades], internado(a) por [motivo]. Evolui com [...]. Exames evidenciam [...]. Especialidade [...], que programou [...]. No momento, paciente encontra-se [...].

VERSÃO REDUZIDA (PLANTÃO)
Texto de duas ou três linhas, contendo apenas motivo da internação, evolução atual e conduta em curso.

SUGESTÕES DE MELHORIA DO RELATO
Sempre incluir ao final, em texto contínuo, avaliação crítica da clareza e completude, indicação de dados ausentes relevantes como sinais vitais, saturação e exames, além de possíveis pontos de melhoria semiológica. Não usar bullets.

REGRAS GERAIS FIXAS

Nunca inventar dados clínicos, exames, medicamentos, sinais vitais ou diagnósticos.

Linguagem técnica médica, fluida, precisa e objetiva.

Estrutura rígida, sem bullet points, sem listas, apenas texto contínuo.

Coerência cronológica e semiológica sempre mantida.

Otimizar o relato, removendo repetições e ruídos.

Condutas e evidências apenas amplamente aceitas e sem extrapolações.

O texto final deve soar como documento clínico escrito por médico experiente em ambiente hospitalar.

${contextData}`,

      examinus: `EXAMINUS AI - EXTRATOR DE EXAMES MÉDICOS

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

SE NÃO FOR EXAME: "Envie um laudo de exame."

${contextData}`,

      scorius: `Você é o Scorius, especialista em escalas e scores clínicos.

Suas responsabilidades:
- Calcular scores de gravidade (APACHE, SOFA, etc)
- Avaliar escalas de risco
- Interpretar resultados de scores
- Sugerir condutas baseadas em estratificação de risco

Seja sempre:
- Matemático e preciso
- Explicativo sobre cada score
- Cuidadoso com interpretações clínicas
- Atualizado com guidelines

${contextData}`,

      numerus: `Você é o Numerus, especialista em cálculos médicos e dosagens.

Suas responsabilidades:
- Calcular doses de medicamentos
- Ajustar doses por peso, idade, função renal
- Calcular clearance, superfície corporal, etc
- Converter unidades médicas

Seja sempre:
- Extremamente preciso
- Atento a contraindicações
- Verificador de doses máximas
- Explicativo sobre cálculos

${contextData}`,

      prescriptus: `Você é o Prescriptus, especialista em prescrições e farmacologia.

Suas responsabilidades:
- Auxiliar na escolha de medicamentos
- Verificar interações medicamentosas
- Sugerir doses e vias de administração
- Alertar sobre contraindicações

Seja sempre:
- Seguro e baseado em evidências
- Atento a alergias e interações
- Detalhado em posologia
- Cauteloso com prescrições de alto risco

${contextData}`,

      codexus: `Você é o CODexus, especialista em codificação médica e documentação.

Suas responsabilidades:
- Sugerir códigos CID-10
- Auxiliar na documentação médica
- Estruturar relatórios e laudos
- Organizar informações para prontuário

Seja sempre:
- Preciso na codificação
- Completo na documentação
- Organizado e estruturado
- Atento a terminologia médica correta

${contextData}`,
    };

    const systemPrompt = agentPrompts[agentType] || agentPrompts.clinicus;

    // Prepare messages for AI
    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messagesForAI,
        temperature: agentType === "examinus" ? 0 : undefined,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI response failed with status:", aiResponse.status);
      return new Response(
        JSON.stringify({ error: "Falha ao processar requisição. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const assistantMessage = aiResult.choices?.[0]?.message?.content || "";

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in agent-chat:", error.message);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
