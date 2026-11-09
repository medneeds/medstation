import { useEffect, useState } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_STUDIO_MODEL, STUDIO_MODELS, deleteAssistant, saveAssistant, type StudioAssistant, type StudioModelId,
} from "@/lib/studio";
import { ASSISTANT_BUILDER_PROMPT, MAX_BUILDER_REQUEST, buildAssistantRequest, parseAssistantDraft } from "@/lib/studioBuilder";

export const NEW_STUDIO_ASSISTANT: Partial<StudioAssistant> = { name: "", instructions: "", model: DEFAULT_STUDIO_MODEL };

/** Janela de criar/editar assistente do Studio, com "Criar com a IA". */
export function StudioAssistantDialog({
  value, onClose, onSaved,
}: {
  value: Partial<StudioAssistant> | null;
  onClose: () => void;
  onSaved?: (a: StudioAssistant) => void;
}) {
  const [editing, setEditing] = useState<Partial<StudioAssistant> | null>(value);
  const [request, setRequest] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [beforeDraft, setBeforeDraft] = useState<{ name: string; instructions: string } | null>(null);

  useEffect(() => {
    setEditing(value);
    setRequest("");
    setBeforeDraft(null);
  }, [value]);

  const hasInstructions = !!editing?.instructions?.trim();

  const draftWithAi = async () => {
    if (!editing || drafting) return;
    if (!request.trim() && !hasInstructions) return;
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("studio-chat", {
        body: {
          model: editing.model ?? DEFAULT_STUDIO_MODEL,
          instructions: ASSISTANT_BUILDER_PROMPT,
          messages: [{ role: "user", content: buildAssistantRequest(request, editing) }],
        },
      });
      if (error || !data?.text) throw new Error(data?.error || "Não foi possível criar agora. Tente de novo.");
      const draft = parseAssistantDraft(data.text);
      if (!draft.instructions) throw new Error("A IA não devolveu instruções. Tente de novo.");
      setBeforeDraft({ name: editing.name ?? "", instructions: editing.instructions ?? "" });
      setEditing((cur) => cur && { ...cur, name: cur.name?.trim() ? cur.name : draft.name, instructions: draft.instructions });
      toast.success("Instruções prontas. Revise e salve.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar agora.");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && !drafting && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing?.id ? "Editar assistente" : "Criar assistente"}</DialogTitle></DialogHeader>
        {editing && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> {hasInstructions ? "Ajustar com a IA" : "Criar com a IA"}
              </div>
              <Textarea rows={3} maxLength={MAX_BUILDER_REQUEST} value={request} disabled={drafting}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void draftWithAi(); } }}
                placeholder={hasInstructions
                  ? "O que mudar? Ex.: deixe a resposta mais curta e inclua uma seção de pendências."
                  : "Descreva o assistente: para que serve, o que você vai enviar e como quer a resposta. Ex.: parecer de risco cirúrgico a partir dos exames, com ASA, RCRI e conduta."} />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" className="gap-1.5" onClick={draftWithAi}
                  disabled={drafting || (!request.trim() && !hasInstructions)}>
                  {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {drafting ? "Escrevendo..." : hasInstructions ? "Ajustar instruções" : "Gerar instruções"}
                </Button>
                {beforeDraft && !drafting && (
                  <Button type="button" size="sm" variant="ghost" className="gap-1.5"
                    onClick={() => { setEditing((cur) => cur && { ...cur, ...beforeDraft }); setBeforeDraft(null); }}>
                    <Undo2 className="h-3.5 w-3.5" /> Desfazer
                  </Button>
                )}
                <span className="text-2xs text-muted-foreground">Usa a IA escolhida abaixo. Você revisa antes de salvar.</span>
              </div>
            </div>
            <Input placeholder="Nome (ex.: Parecer de risco cirúrgico)" value={editing.name ?? ""} maxLength={60}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Textarea placeholder="Como ele deve responder: formato, seções, tom, o que nunca fazer..." rows={8} maxLength={8000} disabled={drafting}
              value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
            <Select value={editing.model ?? DEFAULT_STUDIO_MODEL} onValueChange={(v) => setEditing({ ...editing, model: v as StudioModelId })}>
              <SelectTrigger aria-label="IA preferida"><SelectValue /></SelectTrigger>
              <SelectContent>{STUDIO_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter className="gap-2">
          {editing?.id && (
            <Button variant="outline" className="text-destructive" onClick={() => { deleteAssistant(editing.id!); onClose(); }}>Excluir</Button>
          )}
          <Button disabled={drafting || !editing?.name?.trim() || !editing?.instructions?.trim()}
            onClick={() => {
              const saved = saveAssistant({
                id: editing!.id, name: editing!.name!.trim(), instructions: editing!.instructions!.trim(),
                model: (editing!.model ?? DEFAULT_STUDIO_MODEL) as StudioModelId,
              });
              onSaved?.(saved);
              onClose();
            }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
