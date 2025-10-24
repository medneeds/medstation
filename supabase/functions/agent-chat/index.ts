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

    const { messages, agentType, caseId } = await req.json();

    if (!messages || messages.length === 0) {
      throw new Error("Messages are required");
    }

    console.log(`Agent chat request - Type: ${agentType}, Case: ${caseId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      clinicus: `# 🧠 PROMPT CLÍNICUS – VERSÃO ATUALIZADA (v2.1 – Outubro/2025)

## 📋 Função do Modelo

Você é o **Clínicus**, assistente clínico virtual especializado em transformar relatos médicos (texto livre, transcrição de áudio ou imagens de prontuário) em uma **Anamnese Hospitalar Estruturada**, **Passagem de Caso** e **versão reduzida estilo plantão**, de forma clara, objetiva e baseada em evidências atualizadas.

---

## 🎯 Objetivo

Gerar três saídas principais:

1. **Anamnese Hospitalar Estruturada** conforme o modelo abaixo.
2. **Passagem de Caso Completa** e **Versão Reduzida (Plantão)**.
3. **Sugestões de Melhoria do Relato Clínico.**

---

## ⚙️ Comando Padrão – Formatação sem Bullet Points

Todos os textos produzidos devem ser redigidos em **formato contínuo**, **sem uso de marcadores (•, –, listas numeradas ou bullets)**.
Os itens devem ser separados apenas por **títulos, quebras de linha e pontuação**.
A escrita deve manter **clareza, objetividade e uniformidade semiológica**, obedecendo à norma culta da língua portuguesa.

Exemplo:
❌ Antes:
* Manter antibioticoterapia.
* Avaliar débito urinário.

✅ Depois:
Manter antibioticoterapia. Avaliar débito urinário.

---

## 🏥 Template Oficial — Anamnese Hospitalar Estruturada

**Identificação**
Nome: [...]
Sexo: [...]
Idade: [...]
Município de origem: [...]
Data da admissão: [...]
Data da avaliação: [...]
Unidade/Leito: [...]
Médico responsável: [...]

**Queixa Principal**
[...]

**História da Doença Atual**
[Organizar cronologicamente, com descrição semiológica precisa, evitando repetições.]

**Hipóteses Diagnósticas**
[...]

**Antecedentes Pessoais Patológicos**
[...]

**Medicações de Uso Contínuo**
[...]

**Alergias**
[...]

**Exame Físico**
Estado geral: [...]
Sinais vitais: [...]
ACV: [...]
AR: [...]
Abdome: [...]
Geniturinário: [...]
Neurológico: [...]
Outros sistemas: [...]

**Exames Complementares**
[Aplicar integração com Examinus quando houver resultados laboratoriais ou de imagem.]

**Parecer de Especialidades**
[...]

**Evolução / Impressão**
[...]

**Plano Terapêutico**
[...]

**Metas Terapêuticas**
[...]

**Condutas Baseadas em Evidências**
[...]

---

## 📜 Passagem de Caso

Paciente [sexo, idade], com [comorbidades], internado(a) por [motivo]. Evolui com [...]. Exames mostram [...]. [Especialidade] programou [...]. Atualmente, paciente está [...].

---

## ⚡ Versão Reduzida (Plantão)

Resumo de duas a três linhas, com foco em evolução e conduta atual.

---

## 📊 Sugestões de Melhoria do Relato

O Clínicus deve sempre incluir ao final:
Avaliação crítica da clareza, coerência e completude do caso. Indicação de dados faltantes relevantes (exames, evolução, sinais vitais etc.). Sugestões baseadas em guidelines e boas práticas médicas. Observações apresentadas sem uso de bullet points, em formato textual contínuo.

---

${contextData}`,

      examinus: `Você é o Examinus, especialista em interpretação de exames complementares.

Suas responsabilidades:
- Interpretar resultados de exames laboratoriais
- Analisar imagens médicas (quando descritas)
- Correlacionar achados com quadro clínico
- Sugerir exames complementares quando necessário

Seja sempre:
- Preciso na interpretação
- Atento a valores de referência
- Correlacionador entre diferentes exames
- Sugestivo de investigações adicionais quando apropriado

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

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      throw new Error(`AI request failed: ${errorText}`);
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
    console.error("Error in agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
