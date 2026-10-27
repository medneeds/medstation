import { supabase } from "@/integrations/supabase/client";

export const VAULT_BUCKET = "vault";
export const VAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const ASSISTANT_FOLDER_NAME = "Salvos dos assistentes";

/** Title for a note saved from an assistant reply: first meaningful line, max 80 chars. */
export function vaultTitleFrom(content: string, assistantLabel?: string): string {
  const line = content
    .split("\n")
    .map((l) => l.replace(/^[\s#*\-•>]+/, "").replace(/[*_`]/g, "").trim())
    .find((l) => l.length > 0);
  const base = line ? (line.length > 80 ? line.slice(0, 77) + "..." : line) : "Resposta salva";
  return assistantLabel ? `${assistantLabel} · ${base}`.slice(0, 120) : base;
}

/** Storage path always starts with the user id so storage rules keep files private. */
export function vaultStoragePath(userId: string, fileName: string, now = Date.now()): string {
  const safe = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
  return `${userId}/${now}-${safe || "arquivo"}`;
}

export async function saveAssistantReplyToVault(content: string, assistantLabel?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta para salvar no Cofre.");

  let { data: folder } = await supabase
    .from("vault_folders")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", ASSISTANT_FOLDER_NAME)
    .maybeSingle();
  if (!folder) {
    const created = await supabase
      .from("vault_folders")
      .insert({ user_id: user.id, name: ASSISTANT_FOLDER_NAME, color: "green" })
      .select("id")
      .single();
    if (created.error) throw created.error;
    folder = created.data;
  }

  const { error } = await supabase.from("notes").insert({
    user_id: user.id,
    title: vaultTitleFrom(content, assistantLabel),
    content: content.slice(0, 50000),
    folder_id: folder.id,
  });
  if (error) throw error;
}
