import { supabase } from "@/integrations/supabase/client";
import type { StudioModelId } from "@/lib/studio";

export type StudioMsg = { role: "user" | "assistant"; content: string };

/** Uma chamada à IA do Studio com um roteiro próprio; devolve o texto ou lança erro em português. */
export async function askStudio(model: StudioModelId, instructions: string, messages: StudioMsg[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("studio-chat", { body: { model, instructions, messages } });
  if (error || !data?.text) throw new Error(data?.error || "Não foi possível responder agora. Tente de novo.");
  return String(data.text);
}
