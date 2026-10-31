import { supabase } from "@/integrations/supabase/client";

/** Origem gravada no contato: lista VIP antes da abertura ou checkout iniciado. */
export type BlackLeadSource = "black_vip" | "black_checkout";

function collectUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

/**
 * Guarda o e-mail na lista de contatos antes de abrir o pagamento, para que
 * quem desistir no meio do caminho ainda possa ser recuperado pelo painel.
 * Nunca bloqueia a compra: falhas são só registradas no console.
 */
export async function saveBlackLead(email: string, source: BlackLeadSource, phone = ""): Promise<boolean> {
  try {
    const { error } = await supabase.from("leads").insert({
      full_name: "",
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      source,
      utm: collectUtm(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[black] lead não salvo", err);
    return false;
  }
}
