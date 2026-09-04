import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractTextFromImage, OcrHttpError } from "../_shared/ocr.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Permite OCR sem auth para a demo pública. Limite alto por janela de 10min
// para suportar PDFs multi-página (até ~30 páginas) sem travar a UX.
const RATE_LIMIT = 60;
const WINDOW_MIN = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI gateway não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file, fileName, mimeType, fingerprint } = await req.json();
    if (!file || !mimeType) {
      return new Response(JSON.stringify({ error: "Arquivo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      return new Response(
        JSON.stringify({ error: "Apenas imagens e PDFs são suportados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit por IP + fingerprint (janela curta para OCR de páginas)
    // Fingerprint sanitizado (formato rígido) para impedir injeção em filtros PostgREST.
    const safeFingerprint = typeof fingerprint === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(fingerprint)
      ? fingerprint
      : null;
    const rawIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const clientIp = (rawIp.split(",")[0].trim().replace(/[^0-9A-Za-z.:_-]/g, "").slice(0, 64)) || "unknown";
    const identifier = safeFingerprint ? `${clientIp}_${safeFingerprint}` : clientIp;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const windowStart = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
    const { data: records } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("function_name", "public-extract-text")
      .or(`user_id.eq.public_${identifier},fingerprint.eq.${safeFingerprint || "none"}`)
      .gte("updated_at", windowStart);

    let total = 0;
    let existing: any = null;
    if (records && records.length > 0) {
      total = records.reduce((s: number, r: any) => s + (r.request_count || 0), 0);
      existing =
        records.find(
          (r: any) =>
            r.user_id === `public_${identifier}` ||
            (safeFingerprint && r.fingerprint === safeFingerprint),
        ) || null;
    }

    if (total >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Muitas extrações em pouco tempo. Aguarde alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date().toISOString();
    if (existing) {
      await supabase
        .from("rate_limits")
        .update({
          request_count: existing.request_count + 1,
          updated_at: now,
          fingerprint: safeFingerprint || existing.fingerprint,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("rate_limits").insert({
        user_id: `public_${identifier}`,
        function_name: "public-extract-text",
        window_start: now,
        request_count: 1,
        updated_at: now,
        fingerprint: safeFingerprint || null,
      });
    }

    let ocr;
    try {
      ocr = await extractTextFromImage(lovableApiKey, file, mimeType);
    } catch (err) {
      const status = err instanceof OcrHttpError ? err.status : 500;
      console.error("[public-extract-text] AI error:", status, err instanceof Error ? err.message : err);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao extrair texto" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = ocr.text;

    if (!text) {
      return new Response(
        JSON.stringify({
          error:
            "Não consegui ler este arquivo. Envie uma foto mais nítida, com o documento inteiro enquadrado e boa iluminação.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[public-extract-text] error:", error?.message);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
