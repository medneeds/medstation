import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Search,
  ArrowRight,
  CheckCircle2,
  Circle,
  BookOpen,
  MessageCircleQuestion,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { currentCopilotFeatures, type CopilotFeature } from "@/lib/copilot";
import { cn } from "@/lib/utils";

type GuideGroup = "Assistentes" | "Modos" | "Organização" | "Conta";

type Guide = {
  id: string;
  name: string;
  group: GuideGroup;
  what: string;
  when: string;
  where: string;
  steps: string[];
  url: string;
  keywords: string[];
};

const GROUP_BY_KIND: Record<CopilotFeature["kind"], GuideGroup> = {
  assistente: "Assistentes",
  modo: "Modos",
  organizacao: "Organização",
  conta: "Conta",
};

/** O guia é o mesmo catálogo que a IA usa: um lugar só para manter. */
function buildGuides(): Guide[] {
  return currentCopilotFeatures()
    .filter((f): f is CopilotFeature & { route: string } => typeof f.route === "string")
    .map((f) => ({
      id: f.id,
      name: f.name,
      group: GROUP_BY_KIND[f.kind],
      what: f.what,
      when: f.when,
      where: f.where,
      steps: f.how,
      url: f.route,
      keywords: f.keywords,
    }));
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const GROUPS = ["Todos", "Assistentes", "Modos", "Organização", "Conta"] as const;

const FIRST_STEPS = [
  { id: "s1", label: "Abrir o Examinus e colar um exame", url: "/examinus" },
  { id: "s2", label: "Gerar uma anamnese no Clínicus", url: "/clinicus" },
  { id: "s3", label: "Fazer um atendimento no Modo Escuta", url: "/consultorio" },
  { id: "s4", label: "Montar seu mapa de leitos no Modo Rotineiro", url: "/rotina" },
];

const DONE_KEY = "concierge-first-steps";

export function ConciergeInternal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const setOpen = onOpenChange;
  // O Copiloto abre direto na conversa; o guia por escrito fica na outra aba.
  const [tab, setTab] = useState<"guia" | "perguntar">("perguntar");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ text: string; nonce: number }>({ text: "", nonce: 0 });
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
    } catch {
      setDone([]);
    }
  }, []);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(DONE_KEY, JSON.stringify(next));
      } catch {
        /* sem storage: o passo fica marcado só nesta aba */
      }
      return next;
    });
  };

  // Recalcula ao abrir: a Black, por exemplo, só aparece dentro da janela da oferta.
  const guides = useMemo(() => (open ? buildGuides() : []), [open]);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return guides.filter(
      (g) =>
        (group === "Todos" || g.group === group) &&
        (!q || [g.name, g.what, g.when, g.where, ...g.keywords].some((t) => fold(t).includes(q))),
    );
  }, [query, group, guides]);

  // Esc fecha o painel; fechado, ele sai da ordem de tabulação (inert).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open]);

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  const askAbout = (g: Guide) => {
    setTab("perguntar");
    setAsk({ text: `Como uso o ${g.name} no meu dia a dia? Dê um exemplo prático.`, nonce: Date.now() });
  };

  return (
    <>
      {/* Painel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[60] transition-all duration-300 ease-out origin-top-right",
          "top-14 sm:top-16 right-2 sm:right-5 w-[calc(100vw-1rem)] sm:w-[420px]",
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-2 scale-[0.98] pointer-events-none",
        )}
        role="dialog"
        aria-label="Copiloto MedStation"
        aria-hidden={!open}
      >
        <div className="relative flex h-[calc(100vh-5rem)] max-sm:supports-[height:100dvh]:h-[calc(100dvh-4.5rem)] max-h-[640px] sm:h-[600px] flex-col rounded-3xl border border-border/60 bg-card/90 backdrop-blur-xl overflow-hidden shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)]">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/50">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[15px] font-semibold truncate">Copiloto MedStation</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Tire o melhor proveito da plataforma
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-11 w-11 md:h-8 md:w-8 rounded-full"
              onClick={() => setOpen(false)}
              aria-label="Fechar Copiloto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Abas */}
          <div className="flex gap-1 px-4 pt-3">
            {(
              [
                { id: "perguntar", label: "Perguntar", icon: MessageCircleQuestion },
                { id: "guia", label: "Guia", icon: BookOpen },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  tab === t.id
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "guia" ? (
            <>
              <div className="px-4 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar recurso: gasometria, receita, leitos..."
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroup(g)}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                        group === g
                          ? "border-primary/40 text-primary bg-primary/5"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4 py-3">
                {!query && group === "Todos" && (
                  <div className="mb-4 rounded-2xl border border-border/60 bg-background/50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      Primeiros passos
                    </p>
                    <div className="space-y-1">
                      {FIRST_STEPS.map((s) => {
                        const isDone = done.includes(s.id);
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDone(s.id)}
                              aria-label={isDone ? "Desmarcar passo" : "Marcar passo como feito"}
                              className="shrink-0 text-primary"
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/60" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => go(s.url)}
                              className={cn(
                                "flex-1 text-left text-xs hover:text-primary transition-colors",
                                isDone && "line-through text-muted-foreground",
                              )}
                            >
                              {s.label}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {results.map((g) => {
                    const isOpen = expanded === g.id;
                    return (
                      <div
                        key={g.id}
                        className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : g.id)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{g.name}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                              {g.group}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.what}</p>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-border/40">
                            <p className="text-[11px] text-muted-foreground mb-1">
                              QUANDO USAR: {g.when}
                            </p>
                            <p className="text-[11px] text-muted-foreground mb-2">ONDE FICA: {g.where}</p>
                            <ol className="space-y-1 mb-3">
                              {g.steps.map((s, i) => (
                                <li key={s} className="flex gap-2 text-xs">
                                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <span className="text-foreground/90">{s}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 text-xs" onClick={() => go(g.url)}>
                                Abrir agora
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => askAbout(g)}
                              >
                                Tirar dúvida
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {results.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nada encontrado. Tente outra palavra ou pergunte na aba Perguntar.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 min-h-0 p-3">
              <CopilotChat variant="panel" ask={ask} onNavigate={() => setOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ConciergeInternal;
