// Gera a narração do anúncio (/ad-video) via ElevenLabs e devolve mp3 base64.
// Acesso restrito a administradores autenticados — endpoint usa API paga.
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_LENGTH = 4000;

async function requireAdmin(req: Request): Promise<boolean> {
  try {
    const h = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!h) return false;
    const token = h.replace(/^Bearer\s+/i, "");
    if (!token) return false;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data } = await supabase.auth.getUser(token);
    const userId = data?.user?.id;
    if (!userId) return false;
    const { data: role } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return !!role;
  } catch {
    return false;
  }
}

const DEFAULT_SCRIPT = `Médico: seu plantão acabou às sete.
Você saiu às oito e quarenta. Escrevendo evolução.
Não foi a medicina que te atrasou.
A decisão clínica você toma em segundos. O que consome o seu tempo é transformar raciocínio em registro de prontuário.
Admissão de UTI. Emergência. Parecer. Registro de exames complementares. Resumo de alta. Todo dia, do zero.
MedStation é uma plataforma de assistentes clínicos, feita por médico, para médico.
Você entrega os dados do caso. Ela devolve o documento estruturado: raciocínio organizado, hipóteses hierarquizadas por gravidade, conduta em formato executável.
Admissão, evolução, parecer, alta. Tudo em um só lugar.
E ela não preenche lacuna. O que não foi informado aparece sinalizado, não inventado.
Você só tem o trabalho de revisar e aprovar.
Comece hoje. E veja quanto tempo volta para o seu dia.
MedStation.`;

// George — voz masculina grave, boa em pt-BR.
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text: string = body?.text || DEFAULT_SCRIPT;
    const voiceId: string = body?.voiceId || DEFAULT_VOICE;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true,
            speed: 0.95,
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs TTS failed", response.status, err);
      return new Response(JSON.stringify({ error: err, status: response.status }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audio = await response.arrayBuffer();
    return new Response(JSON.stringify({ audioContent: base64Encode(audio) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-ad-narration error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
