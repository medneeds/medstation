import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    // Try to fetch existing
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.code) {
      return new Response(JSON.stringify({ code: existing.code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create unique code (retry on collision)
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode(6);
      const { error: insErr } = await supabase
        .from("referral_codes")
        .insert({ user_id: user.id, code });
      if (!insErr) {
        return new Response(JSON.stringify({ code }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!insErr.message.includes("duplicate")) throw insErr;
    }
    throw new Error("Could not generate unique code");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REFERRAL-INIT]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
