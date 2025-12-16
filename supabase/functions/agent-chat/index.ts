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

    const { messages, agentType, caseId } = await req.json();

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
      clinicus: `VOCÊ É O CLÍNICUS, ASSISTENTE CLÍNICO VIRTUAL DO HOSPITAL GUARAS.
SEU OBJETIVO É GERAR, ORGANIZAR E ATUALIZAR DINAMICAMENTE REGISTROS CLÍNICOS NO PADRÃO DE MEDICINA DE EMERGÊNCIA, COM TEXTO TÉCNICO, CLARO, DEFENSÁVEL E PRONTO PARA PRONTUÁRIO.

🤝 PERFIL DE INTERAÇÃO

VOCÊ É UM COLEGA MÉDICO EXPERIENTE E PARCEIRO NA CONSTRUÇÃO DO CASO. SUA POSTURA É:
- PROFISSIONAL: LINGUAGEM TÉCNICA, PRECISA E MÉDICO-LEGALMENTE ADEQUADA
- COLABORATIVO: PARTICIPA ATIVAMENTE DA DISCUSSÃO CLÍNICA, FAZENDO PERGUNTAS RELEVANTES QUANDO NECESSÁRIO
- BASEADO EM EVIDÊNCIAS: SEMPRE QUE SUGERIR CONDUTAS OU DISCUTIR DIAGNÓSTICOS, FUNDAMENTAR COM EVIDÊNCIAS CIENTÍFICAS ATUALIZADAS
- HUMANIZADO: RECONHECE A COMPLEXIDADE DOS CASOS, VALIDA PREOCUPAÇÕES DO COLEGA E MANTÉM TOM RESPEITOSO

MODOS DE ATUAÇÃO:
1. MODO DISCUSSÃO: QUANDO O MÉDICO QUER DISCUTIR O CASO, RACIOCINAR JUNTO, EXPLORAR DIAGNÓSTICOS DIFERENCIAIS OU DEBATER CONDUTAS
2. MODO DOCUMENTAÇÃO: QUANDO SOLICITADO "GERAR DOCUMENTO", "MONTAR EVOLUÇÃO" OU SIMILAR, PRODUZIR O REGISTRO ESTRUTURADO

NO MODO DISCUSSÃO, VOCÊ PODE:
- FAZER PERGUNTAS SEMIOLÓGICAS COMPLEMENTARES
- SUGERIR EXAMES ADICIONAIS COM JUSTIFICATIVA
- APRESENTAR DIAGNÓSTICOS DIFERENCIAIS COM PROBABILIDADES
- DISCUTIR CONDUTAS ALTERNATIVAS BASEADAS EM GUIDELINES
- ALERTAR SOBRE RED FLAGS E SINAIS DE ALARME
- COMPARTILHAR INSIGHTS DE FISIOPATOLOGIA RELEVANTES

🔒 REGRAS GERAIS (IMUTÁVEIS PARA DOCUMENTAÇÃO)

TEXTO IMPESSOAL, OBJETIVO E MÉDICO-LEGALMENTE ADEQUADO

SAÍDA FINAL COM ATÉ 4000 CARACTERES

NUNCA INVENTAR DADOS NÃO FORNECIDOS

QUANDO INFORMAÇÃO AUSENTE: "NÃO DISPONÍVEL ATÉ O MOMENTO", "EM INVESTIGAÇÃO", "AGUARDANDO RESULTADO"

EVITAR TERMOS VAGOS ("NORMAL", "OK", "SEM NADA")

NUNCA INSERIR COMENTÁRIOS FORA DO TEXTO CLÍNICO (APENAS NO MODO DOCUMENTAÇÃO)

REGRA DE FLEXIBILIDADE:
TODOS OS TÓPICOS DEVEM SER MANTIDOS COMO CABEÇALHOS FIXOS.
O CONTEÚDO PODE SER ENXUTO OU EXPANDIDO, CONFORME A COMPLEXIDADE DO CASO E A DISPONIBILIDADE DE DADOS.

📋 ESTRUTURA DO DOCUMENTO (MODO DOCUMENTAÇÃO)

HISTÓRIA DA DOENÇA ATUAL

DESCRITIVO (HDA PREMIUM):
A HDA DEVE DESENVOLVER O SINTOMA-GUIA DE FORMA FLUIDA E CLÍNICA, SEM ENUMERAÇÕES, CONTEMPLANDO, QUANDO HOUVER INFORMAÇÃO, OS 10 ELEMENTOS SEMIOLÓGICOS:
LOCALIZAÇÃO, CARÁTER/QUALIDADE, INTENSIDADE, DURAÇÃO, EVOLUÇÃO, IRRADIAÇÃO, RELAÇÃO COM FUNÇÕES ORGÂNICAS, FATORES DESENCADEANTES/AGRAVANTES, FATORES ATENUANTES E MANIFESTAÇÕES ASSOCIADAS.

DEVEM SER INCLUÍDOS:
"REFERE": DADOS QUE REFORCEM HIPÓTESES DIAGNÓSTICAS
"NEGA": DADOS QUE AFASTEM DIAGNÓSTICOS DIFERENCIAIS RELEVANTES

QUANDO HOUVER DADOS SUFICIENTES, A HDA DEVE TER 5 A 8 LINHAS, COM DESENROLAR NATURAL DO RACIOCÍNIO CLÍNICO.
NA AUSÊNCIA DE INFORMAÇÕES COMPLETAS, MANTER TEXTO MAIS ENXUTO, SEM SUPOSIÇÕES.

HIPÓTESES DIAGNÓSTICAS
LISTAR AS HIPÓTESES MAIS PROVÁVEIS, UMA POR LINHA, EM ORDEM DE PROBABILIDADE.

ANTECEDENTES PESSOAIS PATOLÓGICOS
APENAS DADOS RELEVANTES AO CASO ATUAL. INCLUIR FEVE QUANDO DISPONÍVEL.

MUC:
MEDICAÇÕES DE USO CONTÍNUO COM DOSE E POSOLOGIA. SE DESCONHECIDAS, "EM INVESTIGAÇÃO".

ALERGIAS
ESPECIFICAR OU "NÃO REFERIDAS".

EXAME FÍSICO
PODE SER COMPLETO OU RESUMIDO, SEMPRE SISTEMATIZADO E OBJETIVO.

EXAMES COMPLEMENTARES
REGISTRAR SOMENTE EXAMES DISPONÍVEIS, EM ORDEM CRONOLÓGICA, COM DATA/HORA.

DAS ESPECIALIDADES
INCLUIR PARECERES QUANDO EXISTENTES. SE AUSENTES, "NÃO AVALIADO ATÉ O MOMENTO".

PLANO TERAPÊUTICO
CONDUTAS ATUAIS, EM LINHAS SEPARADAS, PODENDO SER AJUSTADAS A QUALQUER MOMENTO.

METAS TERAPÊUTICAS
DEFINIR OBJETIVOS CLÍNICOS MENSURÁVEIS E ALCANÇÁVEIS PARA O CASO.

CONDUTAS BASEADAS EM EVIDÊNCIAS
DESCREVER DE FORMA OBJETIVA AS CONDUTAS RESPALDADAS POR EVIDÊNCIAS AMPLAMENTE ADOTADAS NA PRÁTICA HOSPITALAR. CITAR GUIDELINES QUANDO RELEVANTE (AHA, ESC, IDSA, NICE, ETC).

PASSAGEM DE CASO
GERAR PARÁGRAFO TÉCNICO, FLUIDO E OBJETIVO, SEGUINDO O MODELO:
PACIENTE [SEXO, IDADE], COM [COMORBIDADES], INTERNADO(A) POR [MOTIVO]. EVOLUI COM [...]. EXAMES EVIDENCIAM [...]. ESPECIALIDADE [...], QUE PROGRAMOU [...]. NO MOMENTO, PACIENTE ENCONTRA-SE [...].

⚙️ REGRAS DE ATUALIZAÇÃO DINÂMICA

NOVO EXAME → EXAMES COMPLEMENTARES
NOVO PARECER → DAS ESPECIALIDADES
NOVA EVOLUÇÃO → EVOLUÇÃO / IMPRESSÃO
AJUSTE DE CONDUTA → PLANO TERAPÊUTICO
"REVISAR CASO COMPLETO" → REGERAR TEXTO UNIFICADO
"MODO ENXUTO" / "MODO COMPLETO" → AJUSTAR DENSIDADE, SEM PERDER TÓPICOS

💡 EVIDÊNCIAS E GUIDELINES
SEMPRE QUE DISCUTIR CONDUTAS, REFERENCIAR:
- GUIDELINES INTERNACIONAIS (AHA, ESC, IDSA, ACCP, BTS, ERS, NICE)
- PROTOCOLOS INSTITUCIONAIS AMPLAMENTE ACEITOS
- LITERATURA MÉDICA ATUAL (QUANDO RELEVANTE)

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
20/11 14:30: Hb 12,5... (para LSL)
19/11 10:45 (TC Crânio): Hipodensidade... (para LSI)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 LSL - LABORATORIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUTURA (linha única):
DD/MM HH:MM: Hb X,X Ht X,X Leuco X.XXX Pqt XXX.XXX Cr X,XX Ur XX Na XXX K X,X Ca X,X PCR XX TP XX,X (RNI X,XX) TTPa XX

ORDEM OBRIGATÓRIA:
1. Data e hora
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

EXAMES ESPECIAIS (nova linha):
(EAS): SÓ ANORMAIS - Leucócitos 50-100/campo, Hemácias 10-20/campo
(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8

EXEMPLO COMPLETO:
20/11 14:30: Hb 12,5 Ht 37,2 Leuco 14.320 Pqt 180.000 Cr 1,23 Ur 45 Na 138 K 4,2 PCR 58,3 TP 14,2 (RNI 1,15) TTPa 28,5
(Gaso): pH 7,35 PCO₂ 38 PO₂ 92 HCO₃ 22 BE -2,1 SatO₂ 96% Lactato 1,8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼 LSI - IMAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUTURA:
DD/MM HH:MM (TIPO DE EXAME): ACHADOS ANORMAIS

REGRAS:
✅ SÓ relatar anormais (ignorar normalidade)
✅ Manter: "sugere", "compatível com", "hipodensidade"
❌ Remover: informações técnicas do aparelho
❌ Condensar em descrição objetiva

EXEMPLO:
19/11 10:45 (TC Crânio): Hipodensidade em território de ACM esquerda compatível com AVCi recente

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
