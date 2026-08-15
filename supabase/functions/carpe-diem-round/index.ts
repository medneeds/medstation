import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `Você é o Carpe Diem, assistente de evolução diária de enfermaria e UTI da MedStation.

Sua função: escrever a evolução médica do dia de HOJE para um paciente internado, aproveitando a estrutura, as seções e o estilo da evolução anterior.

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- NUNCA use markdown: nada de #, ##, **, *, _ ou tabelas
- Use APENAS cabeçalhos em CAIXA ALTA, linhas em branco e marcadores com "-"

REGRAS CLÍNICAS:
- Mantenha exatamente as mesmas seções e a mesma ordem da evolução anterior
- Atualize o dia de internação e a data conforme informado
- Incorpore APENAS as mudanças informadas pelo médico; nunca invente exames, sinais vitais, doses ou desfechos
- O que não mudou permanece como estava, ajustando o tempo verbal quando necessário
- Antibióticos e drogas em uso: avance a contagem de dias quando a evolução anterior a registrar
- Se o médico informar algo ambíguo, escreva o que foi dito sem completar com suposições
- Se não houver evolução anterior, escreva uma evolução inicial com as seções padrão: IDENTIFICAÇÃO, DIA DE INTERNAÇÃO, SUBJETIVO, EXAME FÍSICO, EXAMES, DISPOSITIVOS E DROGAS EM USO, AVALIAÇÃO, CONDUTA

Responda somente com o texto da evolução, pronto para copiar no prontuário.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado");

    const body = await req.json();
    const patient = body?.patient ?? {};
    const previous = typeof body?.previousRound === "string" ? body.previousRound.slice(0, 20000) : "";
    const changes = typeof body?.changes === "string" ? body.changes.slice(0, 10000).trim() : "";
    const roundDate = typeof body?.roundDate === "string" ? body.roundDate.slice(0, 20) : "";

    if (!changes && !previous) {
      throw new Error("Informe as mudanças do dia ou uma evolução anterior");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const patientBlock = [
      patient.name ? `Paciente: ${patient.name}` : "",
      patient.age ? `Idade: ${patient.age}` : "",
      patient.bed ? `Leito: ${patient.bed}` : "",
      patient.unit ? `Unidade: ${patient.unit}` : "",
      patient.admittedOn ? `Data de admissão: ${patient.admittedOn}` : "",
      patient.dayOfStay ? `Dia de internação hoje: D${patient.dayOfStay}` : "",
      patient.diagnosis ? `Diagnóstico principal: ${patient.diagnosis}` : "",
      patient.comorbidities ? `Comorbidades: ${patient.comorbidities}` : "",
    ].filter(Boolean).join("\n");

    const userPrompt = `DADOS DO PACIENTE
${patientBlock || "Não informados"}

DATA DA EVOLUÇÃO DE HOJE: ${roundDate || "hoje"}

EVOLUÇÃO ANTERIOR
${previous || "Nenhuma evolução anterior registrada."}

MUDANÇAS E INFORMAÇÕES DE HOJE (relatadas pelo médico)
${changes || "Sem mudanças relatadas; mantenha o quadro estável descrito acima."}

Escreva a evolução de hoje.`;

    const started = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações em sequência. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Verifique seu plano." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Falha na geração: ${t.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();

    void logAIUsage({
      userId: user.id,
      assistant: "carpe-diem",
      functionName: "carpe-diem-round",
      model: MODEL,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      latencyMs: Date.now() - started,
      status: "ok",
    });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Erro inesperado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
