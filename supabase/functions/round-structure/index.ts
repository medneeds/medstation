import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";
import {
  ROUND_MAX_TRANSCRIPT_CHARS,
  ROUND_SYSTEM_PROMPT,
  buildRoundUserPrompt,
  extractJsonObject,
  formatRoundTopics,
  validateRoundStructure,
  type RoundPatientRef,
} from "./topics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Mesma IA forte usada no documento final do Modo Escuta.
const MODEL = "openai/gpt-6-astra";

function dayOfStay(admittedOn: string, ref: string) {
  const a = new Date(`${admittedOn}T00:00:00Z`).getTime();
  const b = new Date(`${ref}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

// Organiza a transcrição integral do round por paciente da unidade e grava
// um registro por paciente (ward_round_items). Pode ser chamada de novo para
// reorganizar: os registros anteriores daquele round são substituídos.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await requirePlatformAccess(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!UUID.test(sessionId)) return json({ error: "Round inválido" }, 400);
    const incoming = typeof body?.transcript === "string" ? body.transcript.slice(0, ROUND_MAX_TRANSCRIPT_CHARS).trim() : "";
    const durationSeconds = Number.isFinite(body?.durationSeconds) ? Math.max(0, Math.min(6 * 3600, Math.round(body.durationSeconds))) : null;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: session } = await admin
      .from("ward_round_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) return json({ error: "Round não encontrado" }, 404);

    const transcript = incoming || String(session.transcript || "").trim();
    if (transcript.length < 20) {
      await admin.from("ward_round_sessions").update({
        status: "error", error_message: "Gravação sem fala reconhecida", ended_at: session.ended_at ?? new Date().toISOString(),
        ...(durationSeconds !== null ? { duration_seconds: durationSeconds } : {}),
      }).eq("id", sessionId);
      return json({ error: "Não reconheci fala suficiente na gravação." }, 400);
    }

    await admin.from("ward_round_sessions").update({
      status: "structuring", transcript,
      ended_at: session.ended_at ?? new Date().toISOString(),
      ...(durationSeconds !== null ? { duration_seconds: durationSeconds } : {}),
    }).eq("id", sessionId);

    // Pacientes ativos da unidade, na ordem do mapa de leitos (só do próprio médico).
    const roundDate: string = session.round_date;
    let patients: RoundPatientRef[] = [];
    if (session.unit_id) {
      const [{ data: beds }, { data: adms }] = await Promise.all([
        admin.from("ward_beds").select("id,label,sort_order").eq("user_id", user.id).eq("unit_id", session.unit_id).order("sort_order"),
        admin.from("ward_admissions").select("id,bed_id,patient_name,main_diagnosis,admitted_on").eq("user_id", user.id).eq("unit_id", session.unit_id).eq("status", "active"),
      ]);
      const admByBed = new Map((adms ?? []).filter((a: any) => a.bed_id).map((a: any) => [a.bed_id, a]));
      let i = 0;
      for (const b of beds ?? []) {
        const a: any = admByBed.get((b as any).id);
        if (!a) continue;
        i++;
        patients.push({
          ref: `P${i}`, admissionId: a.id, bed: (b as any).label, name: a.patient_name,
          diagnosis: a.main_diagnosis, dayOfStay: dayOfStay(a.admitted_on, roundDate),
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    const t0 = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: ROUND_SYSTEM_PROMPT },
          { role: "user", content: buildRoundUserPrompt({ unitName: session.unit_name ?? "", roundDate, patients, transcript }) },
        ],
        stream: false,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[ROUND-STRUCTURE] AI error:", res.status, t.slice(0, 300));
      void logAIUsage({ userId: user.id, assistant: "carpe-diem", functionName: "round-structure", model: MODEL, latencyMs: Date.now() - t0, status: "error", metadata: { http_status: res.status } });
      await admin.from("ward_round_sessions").update({ status: "error", error_message: `IA ${res.status}` }).eq("id", sessionId);
      if (res.status === 429) return json({ error: "Muitas solicitações em sequência. Tente organizar de novo em instantes." }, 429);
      if (res.status === 402) return json({ error: "Créditos de IA esgotados. A transcrição ficou guardada." }, 402);
      return json({ error: "Não foi possível organizar o round agora. A transcrição ficou guardada." }, 502);
    }
    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "");
    void logAIUsage({
      userId: user.id, assistant: "carpe-diem", functionName: "round-structure", model: MODEL,
      inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens, totalTokens: data?.usage?.total_tokens,
      latencyMs: Date.now() - t0, status: "ok", metadata: { patients: patients.length },
    });

    const items = validateRoundStructure(extractJsonObject(raw), patients);
    await admin.from("ward_round_items").delete().eq("session_id", sessionId).eq("user_id", user.id);
    let saved: unknown[] = [];
    if (items.length) {
      const { data: rows, error } = await admin.from("ward_round_items").insert(items.map((it) => ({
        user_id: user.id,
        session_id: sessionId,
        admission_id: it.admissionId,
        bed_label: it.bedLabel,
        patient_label: it.patientLabel,
        round_date: roundDate,
        topics: it.topics,
        content: formatRoundTopics(it.topics),
      }))).select("*");
      if (error) throw error;
      saved = rows ?? [];
    }
    await admin.from("ward_round_sessions").update({ status: "ready", error_message: null }).eq("id", sessionId);
    return json({ items: saved, patients: patients.length });
  } catch (error: any) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return json({ error: "Não autorizado" }, 401);
    console.error("[ROUND-STRUCTURE] Error:", error?.message);
    return json({ error: "Erro ao organizar o round" }, 500);
  }
});
