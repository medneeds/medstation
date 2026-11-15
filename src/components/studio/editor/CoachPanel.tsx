import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, Check, ClipboardPaste, FlaskConical, Loader2, MessageCircleQuestion, PenLine, RefreshCw, SendHorizonal,
  Sparkles, ThumbsUp, TrendingUp, Undo2, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STUDIO_MODELS, type StudioModelId } from "@/lib/studio";
import { MAX_BUILDER_REQUEST, buildAssistantRequest, buildAssistantSystem, parseAssistantDraft } from "@/lib/studioBuilder";
import {
  COACH_AI_DECIDES, buildCoachRequest, buildCoachSystem, buildRefineRequest, diffStats, lineDiff, parseCoachReply,
  type CoachAnswer, type CoachReview,
} from "@/lib/studioCoach";
import { askStudio } from "./askStudio";
import { VersionDiff } from "./VersionDiff";

type Turn =
  | { id: string; kind: "review"; review: CoachReview; done?: boolean }
  | { id: string; kind: "you"; lines: string[] }
  | { id: string; kind: "version"; before: string; after: string; suggestedName: string; changes: string[]; status: "pending" | "applied" | "discarded"; created: boolean }
  | { id: string; kind: "ready" }
  | { id: string; kind: "error"; message: string; retry: () => void };

const tid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Bloco com o "avatar" da IA consultora. */
function AiBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Sparkles className="h-3.5 w-3.5" /></div>
      <div className={cn("min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card p-3.5 text-sm", className)}>{children}</div>
    </div>
  );
}

function ReviewCard({ turn, busy, onAnswer, onReady, onTest }: {
  turn: Extract<Turn, { kind: "review" }>; busy: boolean;
  onAnswer: (a: CoachAnswer[]) => void; onReady: () => void; onTest: () => void;
}) {
  const { review, done } = turn;
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [other, setOther] = useState<Record<number, string>>({});
  const answers = review.questions.map((q, i) => ({ question: q.question, answer: (other[i]?.trim() || picked[i] || "").trim() }));
  const answered = answers.filter((a) => a.answer).length;

  return (
    <AiBubble>
      {review.summary && <p className="text-foreground">{review.summary}</p>}
      {(review.strengths.length > 0 || review.improvements.length > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {review.strengths.length > 0 && (
            <div className="rounded-lg bg-primary/5 p-2.5">
              <div className="mb-1 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-primary"><ThumbsUp className="h-3 w-3" /> Já está bom</div>
              <ul className="space-y-1 text-xs text-foreground/90">{review.strengths.map((s, i) => <li key={i}>· {s}</li>)}</ul>
            </div>
          )}
          {review.improvements.length > 0 && (
            <div className="rounded-lg bg-muted p-2.5">
              <div className="mb-1 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground"><TrendingUp className="h-3 w-3" /> Pode melhorar</div>
              <ul className="space-y-1 text-xs text-foreground/90">{review.improvements.map((s, i) => <li key={i}>· {s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {review.questions.length > 0 ? (
        <div className={cn("mt-4 space-y-4", done && "pointer-events-none opacity-60")}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MessageCircleQuestion className="h-3.5 w-3.5 text-primary" />
            {review.questions.length === 1 ? "Uma pergunta para deixar o prompt melhor:" : `${review.questions.length} perguntas para deixar o prompt melhor:`}
          </p>
          {review.questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm text-foreground"><span className="mr-1 text-muted-foreground">{i + 1}.</span>{q.question}</p>
              <div className="flex flex-wrap gap-1.5">
                {[...q.options, COACH_AI_DECIDES].map((o) => {
                  const on = !other[i]?.trim() && picked[i] === o;
                  return (
                    <button key={o} type="button" disabled={done}
                      onClick={() => { setPicked((p) => ({ ...p, [i]: on ? "" : o })); setOther((p) => ({ ...p, [i]: "" })); }}
                      className={cn("rounded-full border px-3 py-1 text-xs transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                        o === COACH_AI_DECIDES && !on && "border-dashed text-muted-foreground")}>
                      {on && <Check className="mr-1 inline h-3 w-3" />}{o}
                    </button>
                  );
                })}
              </div>
              <Input value={other[i] ?? ""} disabled={done} maxLength={300} placeholder="Ou escreva sua resposta..."
                onChange={(e) => setOther((p) => ({ ...p, [i]: e.target.value }))} className="h-8 text-xs" />
            </div>
          ))}
          {!done && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button size="sm" className="gap-1.5" disabled={busy || answered === 0} onClick={() => onAnswer(answers)}>
                <Wand2 className="h-3.5 w-3.5" /> Gerar nova versão{answered > 0 ? ` (${answered}/${review.questions.length})` : ""}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={onReady}>Está bom assim</Button>
              <span className="text-2xs text-muted-foreground">Pode pular as que não quiser responder.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="mr-1 flex items-center gap-1 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" /> Seu prompt já está completo.</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onTest}><FlaskConical className="h-3.5 w-3.5" /> Testar</Button>
        </div>
      )}
    </AiBubble>
  );
}

function VersionCard({ turn, onApply, onDiscard, onUndo }: {
  turn: Extract<Turn, { kind: "version" }>; onApply: () => void; onDiscard: () => void; onUndo: () => void;
}) {
  const [show, setShow] = useState(turn.created ? false : true);
  const stats = diffStats(lineDiff(turn.before, turn.after));
  return (
    <AiBubble className={cn(turn.status === "discarded" && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{turn.created ? "Primeira versão pronta" : "Nova versão do prompt"}</span>
        {!turn.created && (
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-2xs text-muted-foreground">
            <span className="text-primary">+{stats.added}</span> <span className="text-destructive">−{stats.removed}</span> linhas
          </span>
        )}
        <span className="text-2xs text-muted-foreground">{turn.after.length.toLocaleString("pt-BR")} caracteres</span>
        {turn.status === "applied" && <span className="ml-auto flex items-center gap-1 text-2xs font-medium text-primary"><Check className="h-3 w-3" /> Aplicada no editor</span>}
        {turn.status === "discarded" && <span className="ml-auto text-2xs text-muted-foreground">Descartada</span>}
      </div>
      {turn.changes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-foreground/90">{turn.changes.map((c, i) => <li key={i} className="flex gap-1.5"><ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{c}</li>)}</ul>
      )}
      <button type="button" onClick={() => setShow((v) => !v)} className="mt-2 text-xs font-medium text-primary hover:underline">
        {show ? "Esconder" : turn.created ? "Ver o texto" : "Ver antes e depois"}
      </button>
      {show && <div className="mt-2"><VersionDiff before={turn.before} after={turn.after} /></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {turn.status === "pending" && (
          <>
            <Button size="sm" className="gap-1.5" onClick={onApply}><Check className="h-3.5 w-3.5" /> Aplicar versão</Button>
            <Button size="sm" variant="ghost" onClick={onDiscard}>Descartar</Button>
          </>
        )}
        {turn.status === "applied" && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onUndo}><Undo2 className="h-3.5 w-3.5" /> Desfazer</Button>
        )}
        {turn.status === "discarded" && <Button size="sm" variant="ghost" onClick={onApply}>Aplicar mesmo assim</Button>}
      </div>
    </AiBubble>
  );
}

function Working({ kind, model }: { kind: "review" | "rewrite" | "create"; model: StudioModelId }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => { const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  const label = STUDIO_MODELS.find((m) => m.id === model)?.label ?? "A IA";
  const text = kind === "review" ? "Lendo seu prompt e pensando no que perguntar" : kind === "create" ? "Escrevendo a primeira versão" : "Escrevendo a nova versão";
  return (
    <AiBubble>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{text}...</span>
        <span className="ml-auto font-mono text-2xs">{secs}s</span>
      </div>
      <p className="mt-1 text-2xs text-muted-foreground">
        {label}{kind !== "review" && secs > 15 ? " · prompts longos podem levar até 2 minutos" : ""}
      </p>
    </AiBubble>
  );
}

export function CoachPanel({ name, model, instructions, onApply, onFocusEditor, onSaveAndUse, onOpenTest }: {
  name: string; model: StudioModelId; instructions: string;
  onApply: (text: string, suggestedName?: string) => void;
  onFocusEditor: () => void; onSaveAndUse: () => void; onOpenTest: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState<null | "review" | "rewrite" | "create">(null);
  const [composer, setComposer] = useState("");
  const [describe, setDescribe] = useState("");
  const history = useRef<CoachAnswer[]>([]);
  const textRef = useRef(instructions);
  const nameRef = useRef(name);
  textRef.current = instructions;
  nameRef.current = name;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns.length, busy]);

  const push = (t: Turn) => setTurns((prev) => [...prev, t]);
  const patch = (id: string, p: Partial<Turn>) => setTurns((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...p } as Turn) : t)));
  const fail = (e: unknown, retry: () => void) =>
    push({ id: tid(), kind: "error", message: e instanceof Error ? e.message : "Não foi possível agora.", retry });

  const review = async (text = textRef.current) => {
    if (!text.trim()) return;
    setStarted(true);
    setBusy("review");
    try {
      const reply = await askStudio(model, buildCoachSystem(text), [{ role: "user", content: buildCoachRequest(nameRef.current, history.current) }]);
      const parsed = parseCoachReply(reply);
      if (!parsed) throw new Error("A IA não devolveu a análise no formato certo. Tente de novo.");
      push({ id: tid(), kind: "review", review: parsed });
    } catch (e) {
      fail(e, () => void review(text));
    } finally {
      setBusy(null);
    }
  };

  const rewrite = async (answers: CoachAnswer[], extra = "", reviewId?: string) => {
    const base = textRef.current;
    if (!base.trim()) return;
    const used = answers.filter((a) => a.answer);
    if (reviewId) patch(reviewId, { done: true });
    push({ id: tid(), kind: "you", lines: [...used.map((a) => `${a.question} → ${a.answer}`), ...(extra.trim() ? [extra.trim()] : [])] });
    setBusy("rewrite");
    try {
      const reply = await askStudio(model, buildAssistantSystem({ instructions: base }),
        [{ role: "user", content: buildRefineRequest(nameRef.current, used, extra) }]);
      const draft = parseAssistantDraft(reply);
      if (!draft.instructions) throw new Error("A IA não devolveu a nova versão. Tente de novo.");
      history.current = [...history.current, ...used];
      push({ id: tid(), kind: "version", before: base, after: draft.instructions, suggestedName: draft.name, changes: draft.changes, status: "pending", created: false });
    } catch (e) {
      if (reviewId) patch(reviewId, { done: false });
      fail(e, () => void rewrite(answers, extra));
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    const ask = describe.trim();
    if (!ask) return;
    setStarted(true);
    push({ id: tid(), kind: "you", lines: [ask] });
    setDescribe("");
    setBusy("create");
    try {
      const reply = await askStudio(model, buildAssistantSystem(), [{ role: "user", content: buildAssistantRequest(ask) }]);
      const draft = parseAssistantDraft(reply);
      if (!draft.instructions) throw new Error("A IA não devolveu as instruções. Tente de novo.");
      push({ id: tid(), kind: "version", before: "", after: draft.instructions, suggestedName: draft.name, changes: draft.changes, status: "pending", created: true });
    } catch (e) {
      setDescribe(ask);
      fail(e, () => void create());
    } finally {
      setBusy(null);
    }
  };

  const apply = (t: Extract<Turn, { kind: "version" }>) => {
    onApply(t.after, t.suggestedName);
    patch(t.id, { status: "applied" });
    // Conversa contínua: depois de cada versão a IA olha de novo e só pergunta se ainda fizer diferença.
    void review(t.after);
  };

  const sendComposer = () => {
    const text = composer.trim();
    if (!text || busy) return;
    setComposer("");
    void rewrite([], text);
  };

  const hasText = !!instructions.trim();
  const modelLabel = STUDIO_MODELS.find((m) => m.id === model)?.label ?? "IA";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!started && hasText && (
          <div className="mx-auto max-w-md pt-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
            <h3 className="mt-3 text-base font-semibold text-foreground">Gostaria de interagir para aprimorar o prompt ou seguir com a estrutura já definida?</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              A IA lê seu prompt, diz o que está bom, faz algumas perguntas e mostra o antes e depois. Nada muda sem você aprovar.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void review()}
                className="group rounded-xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:border-primary hover:bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
                <div className="mt-2 text-sm font-semibold text-foreground">Aprimorar com a IA</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">Perguntas rápidas, com respostas para clicar</div>
              </button>
              <button type="button" onClick={onSaveAndUse}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/30">
                <ArrowRight className="h-5 w-5 text-foreground/70" />
                <div className="mt-2 text-sm font-semibold text-foreground">Seguir com esta estrutura</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">Salva como está e abre a conversa</div>
              </button>
            </div>
            <button type="button" onClick={onOpenTest} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <FlaskConical className="h-3.5 w-3.5" /> Ou teste primeiro com um caso
            </button>
          </div>
        )}

        {!started && !hasText && (
          <div className="mx-auto max-w-md pt-4">
            <h3 className="text-center text-base font-semibold text-foreground">Como você quer começar?</h3>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={onFocusEditor}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50">
                <ClipboardPaste className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Já tenho um prompt</span>
                  <span className="block text-2xs text-muted-foreground">Cole no editor (pode ser um feito no ChatGPT, até 40.000 caracteres). Depois eu ajudo a aprimorar.</span>
                </span>
              </button>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Descrever e a IA escreve</span>
                    <span className="block text-2xs text-muted-foreground">Para que serve, o que você vai enviar e como quer a resposta.</span>
                  </span>
                </div>
                <Textarea rows={3} value={describe} maxLength={MAX_BUILDER_REQUEST} className="mt-3 bg-background text-sm"
                  onChange={(e) => setDescribe(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void create(); } }}
                  placeholder="Ex.: parecer de risco cirúrgico a partir dos exames, com ASA, RCRI e conduta." />
                <Button size="sm" className="mt-2 gap-1.5" disabled={!describe.trim() || !!busy} onClick={() => void create()}>
                  <Sparkles className="h-3.5 w-3.5" /> Criar primeira versão
                </Button>
              </div>
            </div>
          </div>
        )}

        {turns.map((t) => {
          if (t.kind === "you") return (
            <div key={t.id} className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
              {t.lines.length ? t.lines.map((l, i) => <div key={i}>{l}</div>) : "Gerar nova versão"}
            </div>
          );
          if (t.kind === "review") return (
            <ReviewCard key={t.id} turn={t} busy={!!busy}
              onAnswer={(a) => void rewrite(a, "", t.id)}
              onReady={() => { patch(t.id, { done: true }); push({ id: tid(), kind: "ready" }); }}
              onTest={onOpenTest} />
          );
          if (t.kind === "version") return (
            <VersionCard key={t.id} turn={t}
              onApply={() => apply(t)}
              onDiscard={() => patch(t.id, { status: "discarded" })}
              onUndo={() => { onApply(t.before); patch(t.id, { status: "pending" }); }} />
          );
          if (t.kind === "ready") return (
            <AiBubble key={t.id}>
              <p className="font-medium text-foreground">Combinado. Seu assistente está pronto para usar.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Se quiser mudar algo depois, é só escrever abaixo.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5" onClick={onSaveAndUse}><ArrowRight className="h-3.5 w-3.5" /> Salvar e usar</Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenTest}><FlaskConical className="h-3.5 w-3.5" /> Testar antes</Button>
              </div>
            </AiBubble>
          );
          return (
            <AiBubble key={t.id} className="border-destructive/30">
              <p className="text-destructive">{t.message}</p>
              <Button size="sm" variant="outline" className="mt-2 gap-1.5" disabled={!!busy}
                onClick={() => { setTurns((prev) => prev.filter((x) => x.id !== t.id)); t.retry(); }}>
                <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
              </Button>
            </AiBubble>
          );
        })}
        {busy && <Working kind={busy} model={model} />}
        <div ref={endRef} />
      </div>

      {started && (
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-1.5 focus-within:ring-1 focus-within:ring-ring">
            <Textarea value={composer} rows={2} maxLength={MAX_BUILDER_REQUEST} disabled={!hasText}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComposer(); } }}
              placeholder="Peça uma mudança. Ex.: deixe a resposta mais curta e inclua uma seção de pendências."
              className="min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
            <Button size="icon" onClick={sendComposer} disabled={!!busy || !composer.trim() || !hasText} aria-label="Pedir mudança">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
            <span>Usando {modelLabel}</span>
            <button type="button" className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50" disabled={!!busy || !hasText} onClick={() => void review()}>
              <RefreshCw className="h-3 w-3" /> Analisar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
