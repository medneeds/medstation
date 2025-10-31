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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    console.log(`Public Examinus request from IP: ${clientIp}`);

    // Rate limiting check (10 messages per hour per IP)
    const RATE_LIMIT = 10;
    const WINDOW_MINUTES = 60;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit for this IP
    const { data: rateLimitData } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", `public_${clientIp}`)
      .eq("function_name", "public-examinus")
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateLimitData && rateLimitData.request_count >= RATE_LIMIT) {
      const resetTime = new Date(new Date(rateLimitData.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      return new Response(
        JSON.stringify({ 
          error: "Limite de mensagens gratuitas atingido. Crie uma conta para continuar!",
          resetAt: resetTime.toISOString()
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
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
          user_id: `public_${clientIp}`,
          function_name: "public-examinus",
          window_start: now.toISOString(),
          request_count: 1,
          updated_at: now.toISOString()
        });
    }

    // Parse request body
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Formato de mensagens inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System prompt for public Examinus demo
    const systemPrompt = `Você é o Examinus, um agente especializado em interpretação de exames médicos.

IMPORTANTE: Esta é uma versão de demonstração gratuita. Após responder, sempre incentive o usuário a criar uma conta para:
- Salvar conversas e histórico
- Fazer upload de documentos médicos
- Vincular exames a casos clínicos
- Acessar todos os 6 agentes especializados

Suas especialidades incluem:
- Interpretação de exames laboratoriais (hemograma, bioquímica, hormônios, etc.)
- Análise de exames de imagem (raio-X, tomografia, ressonância, ultrassom)
- Explicação de valores de referência
- Identificação de alterações significativas
- Sugestão de exames complementares quando apropriado

Mantenha um tom profissional, didático e acessível. Sempre contextualize os achados e explique a relevância clínica dos resultados.`;

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
          ...messages
        ],
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

    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content,
        remainingMessages: RATE_LIMIT - ((rateLimitData?.request_count || 0) + 1)
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
