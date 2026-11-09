import { useEffect, useState } from "react";
import { Bot, Copy, EyeOff, Eye, FileText, Pencil, Play, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEFAULT_STUDIO_MODEL, STUDIO_MODELS, isStudioModel, type StudioAssistant } from "@/lib/studio";
import {
  PROMPTECA_CATEGORIES, PROMPTECA_LIMITS, categoryLabel, formatRating, validatePromptecaDraft,
  type PromptecaDraft, type PromptecaKind,
} from "@/lib/prompteca";
import type { Tables } from "@/integrations/supabase/types";

export type PromptecaItem = Tables<"prompt_library_items">;

export function Stars({ value, size = "sm", onChange }: { value: number; size?: "sm" | "lg"; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const cls = size === "lg" ? "h-7 w-7" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n - 0.25;
        const icon = <Star className={cn(cls, fill ? "fill-warning text-warning" : "text-muted-foreground/40")} />;
        return onChange ? (
          <button key={n} type="button" aria-label={`${n} estrela${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
            className="rounded p-0.5 transition-transform hover:scale-110">{icon}</button>
        ) : <span key={n}>{icon}</span>;
      })}
    </div>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return kind === "assistant" ? (
    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary hover:bg-primary/10"><Bot className="h-3 w-3" /> Assistente</Badge>
  ) : (
    <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> Prompt</Badge>
  );
}

export function RatingLine({ item }: { item: PromptecaItem }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Stars value={Number(item.rating_avg)} />
      {item.rating_count > 0 ? (
        <span><span className="font-semibold text-foreground">{formatRating(Number(item.rating_avg), item.rating_count)}</span> ({item.rating_count})</span>
      ) : <span>Sem avaliações</span>}
      <span aria-hidden>·</span>
      <span>{item.use_count} {item.use_count === 1 ? "uso" : "usos"}</span>
    </div>
  );
}

export function DetailDialog({
  item, myStars, isMine, isStaff, onClose, onCopy, onUse, onRate, onEdit, onDelete, onToggleHidden,
}: {
  item: PromptecaItem | null;
  myStars: number;
  isMine: boolean;
  isStaff: boolean;
  onClose: () => void;
  onCopy: (i: PromptecaItem) => void;
  onUse: (i: PromptecaItem) => void;
  onRate: (i: PromptecaItem, stars: number) => void;
  onEdit: (i: PromptecaItem) => void;
  onDelete: (i: PromptecaItem) => void;
  onToggleHidden: (i: PromptecaItem) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {item && (
          <>
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <KindBadge kind={item.kind} />
                <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                {item.kind === "assistant" && item.model && isStudioModel(item.model) && (
                  <Badge variant="outline">{STUDIO_MODELS.find((m) => m.id === item.model)?.label}</Badge>
                )}
                {item.hidden && <Badge variant="destructive">Retirado da Prompteca</Badge>}
              </div>
              <DialogTitle className="text-xl">{item.title}</DialogTitle>
              <DialogDescription>
                {item.author_name} · {item.author_specialty}
              </DialogDescription>
              {item.description && <p className="text-sm text-foreground/80">{item.description}</p>}
              <RatingLine item={item} />
            </DialogHeader>

            <pre className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 font-sans text-sm leading-relaxed text-foreground">
              {item.content}
            </pre>

            {!isMine && !item.hidden && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{myStars ? "Sua avaliação" : "Avalie este prompt"}</span>
                <Stars value={myStars} size="lg" onChange={(n) => onRate(item, n)} />
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {isMine && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => onDelete(item)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
                  </>
                )}
                {isStaff && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onToggleHidden(item)}>
                    {item.hidden ? <><Eye className="h-3.5 w-3.5" /> Devolver à Prompteca</> : <><EyeOff className="h-3.5 w-3.5" /> Retirar da Prompteca</>}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => onCopy(item)}><Copy className="h-4 w-4" /> Copiar</Button>
                <Button className="gap-1.5" onClick={() => onUse(item)}>
                  <Play className="h-4 w-4" /> {item.kind === "assistant" ? "Usar este assistente" : "Usar no Studio"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type PublishValue = PromptecaDraft & { id?: string; model: string };

export const EMPTY_PUBLISH: PublishValue = {
  kind: "prompt", title: "", description: "", content: "", category: "documentacao", model: DEFAULT_STUDIO_MODEL,
};

export function PublishDialog({
  value, assistants, saving, onClose, onSubmit,
}: {
  value: PublishValue | null;
  assistants: StudioAssistant[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (v: PublishValue) => void;
}) {
  const [draft, setDraft] = useState<PublishValue | null>(value);
  const [confirmed, setConfirmed] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { setDraft(value); setConfirmed(!!value?.id); setTried(false); }, [value]);

  const errors = draft ? validatePromptecaDraft(draft) : [];
  const set = (patch: Partial<PublishValue>) => setDraft((d) => d && { ...d, ...patch });
  const setKind = (kind: PromptecaKind) => set({ kind });

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft?.id ? "Editar na Prompteca" : "Publicar na Prompteca"}</DialogTitle>
          <DialogDescription>Fica visível na hora para todos os médicos da MedStation, com seu nome e especialidade.</DialogDescription>
        </DialogHeader>
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {([["prompt", "Prompt", "Texto para copiar e colar", FileText], ["assistant", "Assistente", "Instruções para o Studio", Bot]] as const).map(([k, label, hint, Icon]) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={cn("flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                    draft.kind === k ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                  <Icon className={cn("mt-0.5 h-4 w-4", draft.kind === k ? "text-primary" : "text-muted-foreground")} />
                  <span><span className="block text-sm font-medium">{label}</span><span className="block text-2xs text-muted-foreground">{hint}</span></span>
                </button>
              ))}
            </div>

            {draft.kind === "assistant" && assistants.length > 0 && !draft.id && (
              <Select onValueChange={(id) => {
                const a = assistants.find((x) => x.id === id);
                if (a) set({ title: a.name, content: a.instructions, model: a.model });
              }}>
                <SelectTrigger aria-label="Trazer de Meus assistentes"><SelectValue placeholder="Trazer de Meus assistentes..." /></SelectTrigger>
                <SelectContent>{assistants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            )}

            <Input placeholder="Título (ex.: Evolução de UTI por sistemas)" value={draft.title} maxLength={PROMPTECA_LIMITS.title}
              onChange={(e) => set({ title: e.target.value })} />
            <Input placeholder="Para que serve, em uma frase (opcional)" value={draft.description} maxLength={PROMPTECA_LIMITS.description}
              onChange={(e) => set({ description: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={draft.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
                <SelectContent>{PROMPTECA_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              {draft.kind === "assistant" && (
                <Select value={isStudioModel(draft.model) ? draft.model : DEFAULT_STUDIO_MODEL} onValueChange={(v) => set({ model: v })}>
                  <SelectTrigger aria-label="IA preferida"><SelectValue /></SelectTrigger>
                  <SelectContent>{STUDIO_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Textarea rows={10} maxLength={PROMPTECA_LIMITS.content} value={draft.content}
                placeholder={draft.kind === "assistant" ? "Instruções do assistente: papel, formato da resposta, regras e o que nunca fazer..." : "O prompt, do jeito que deve ser colado. Use [DADOS DO PACIENTE] onde o médico vai completar."}
                onChange={(e) => set({ content: e.target.value })} />
              <div className="mt-1 text-right text-2xs text-muted-foreground">{draft.content.length.toLocaleString("pt-BR")} / 8.000</div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="mt-0.5" />
              <span>Confirmo que não há nome, CPF, telefone ou outro dado de paciente neste texto.</span>
            </label>

            {tried && errors.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button disabled={saving || !confirmed}
            onClick={() => { setTried(true); if (draft && !errors.length) onSubmit(draft); }}>
            {saving ? "Publicando..." : draft?.id ? "Salvar" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
