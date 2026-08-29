import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOnboarding } from "@/contexts/OnboardingContext";

import {
  DISCOVERY_BLOCKS,
  DISCOVERY_PATHS,
  readStoredDiscoveryPath,
  storeDiscoveryPath,
  type DiscoveryPathId,
} from "@/lib/discoveryPaths";

/**
 * Home interna orientada a 3 caminhos de trabalho:
 * Documentação, Copiloto e Fluxo.
 * "Descubra a MedStation" é apenas a camada de explicação — não é um pilar.
 */
export function MedStationDiscovery() {
  const storedRef = useRef<DiscoveryPathId | null>(null);
  const [selected, setSelected] = useState<DiscoveryPathId>(() => {
    const stored = readStoredDiscoveryPath();
    storedRef.current = stored;
    return stored ?? "documentation";
  });
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const { isTrial } = useSubscription();
  const { primaryPath: recommendedPath, recommendedTools } = useOnboarding();
  const manualChoice = useRef(false);

  // A recomendação do onboarding prevalece sobre a preferência local antiga,
  // até que o usuário escolha manualmente outro caminho.
  useEffect(() => {
    if (!recommendedPath || manualChoice.current) return;
    setSelected(recommendedPath);
  }, [recommendedPath]);

  const path = DISCOVERY_PATHS.find((p) => p.id === selected)!;
  const hasPreviousChoice = storedRef.current !== null;

  const orderedTools = useMemo(() => {
    if (!recommendedTools.length) return path.tools;
    const rank = new Map(recommendedTools.map((slug, i) => [slug, i]));
    return [...path.tools].sort(
      (a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99),
    );
  }, [path, recommendedTools]);

  const highlighted = useMemo(
    () => new Set(recommendedTools.filter((s) => path.tools.some((t) => t.slug === s)).slice(0, 3)),
    [path, recommendedTools],
  );

  useEffect(() => {
    storeDiscoveryPath(selected);
  }, [selected]);

  const selectPath = (id: DiscoveryPathId) => {
    manualChoice.current = true;
    setSelected(id);
    trackEvent("discovery_path_selected", {
      feature: id,
      source: hasPreviousChoice ? "returning_choice" : "first_access",
    });
  };



  

  return (
    <section aria-labelledby="discovery-title" className="space-y-6 md:space-y-8">
      <header className="max-w-2xl">
        <h2
          id="discovery-title"
          className="font-display text-2xl md:text-3xl font-semibold tracking-tight"
        >
          O que você quer resolver agora?
        </h2>
        <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
          Escolha um caminho e veja as ferramentas mais adequadas para cada etapa do seu trabalho.
        </p>
      </header>


      {/* 3 caminhos */}
      <div
        role="tablist"
        aria-label="Caminhos de trabalho"
        className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3"
      >
        {DISCOVERY_PATHS.map((p) => {
          const active = p.id === selected;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`path-tab-${p.id}`}
              aria-selected={active}
              aria-controls="path-panel"
              onClick={() => selectPath(p.id)}
              className={cn(
                "group relative overflow-hidden text-left rounded-xl border bg-card/80 backdrop-blur-sm",
                "p-4 md:p-6 min-h-[132px] md:min-h-[172px] flex flex-col justify-between",
                "transition-all duration-300 ease-out motion-reduce:transition-none",
                "active:scale-[0.99] motion-reduce:active:scale-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-primary/60 shadow-elevated ring-1 ring-primary/20 translate-y-0"
                  : "border-border/60 md:hover:border-primary/40 md:hover:-translate-y-0.5 md:hover:shadow-elevated motion-reduce:md:hover:translate-y-0",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
                  "bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.10),transparent_65%)]",
                  active ? "opacity-100" : "opacity-0 md:group-hover:opacity-100",
                )}
              />
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-primary/70"
                />
              )}
              <div className="relative flex items-start justify-between">
                <span
                  className={cn(
                    "rounded-xl p-2.5 md:p-3 border transition-colors duration-300",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/10 text-primary border-primary/20",
                  )}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
                </span>
                <ArrowRight
                  className={cn(
                    "h-4 w-4 transition-all duration-300 motion-reduce:transition-none",
                    active
                      ? "text-primary translate-x-0.5"
                      : "text-muted-foreground/50 md:group-hover:translate-x-1 md:group-hover:text-foreground",
                  )}
                />
              </div>
              <div className="relative mt-4">
                {recommendedPath === p.id && (
                  <span className="mb-1.5 inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.18em] text-primary">
                    Recomendado para você
                  </span>
                )}
                <h3 className="font-display text-base md:text-lg font-semibold tracking-tight">
                  {p.label}
                </h3>

                <p
                  className={cn(
                    "mt-1.5 text-sm md:text-base leading-snug",
                    active ? "text-foreground/90" : "text-foreground/75",
                  )}
                >
                  {p.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Descoberta progressiva discreta durante o trial */}
      {isTrial && (
        <p className="text-xs md:text-sm text-muted-foreground/80">
          Seu teste inclui os três caminhos.
        </p>
      )}


      {/* Descubra a MedStation — ação secundária, separada dos pilares */}
      <div className="flex justify-center sm:justify-start">
        <button
          type="button"
          onClick={() => setDiscoverOpen((o) => !o)}
          aria-expanded={discoverOpen}
          aria-controls="discovery-explainer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-sm px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Descubra a MedStation
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {discoverOpen && (
        <div
          id="discovery-explainer"
          className="relative rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 md:p-6 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setDiscoverOpen(false)}
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {DISCOVERY_BLOCKS.map((b) => (
              <div key={b.title} className="pr-6 md:pr-0">
                <h4 className="font-display text-base font-semibold tracking-tight">{b.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{b.line}</p>
                <ul className="mt-2 space-y-1">
                  {b.examples.map((e) => (
                    <li key={e} className="text-sm text-muted-foreground/90 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" aria-hidden />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado selecionado */}
      <div
        key={path.id}
        id="path-panel"
        role="tabpanel"
        aria-labelledby={`path-tab-${path.id}`}
        className="space-y-4 animate-fade-in motion-reduce:animate-none"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg md:text-xl font-semibold tracking-tight">
            Comece por aqui
          </h3>
          <span className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground/70">
            {path.label}
          </span>
        </div>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {path.confirmation}
        </p>

        <ul className="flex flex-wrap gap-2">
          {path.examples.map((e) => (
            <li
              key={e}
              className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs md:text-sm text-muted-foreground"
            >
              {e}
            </li>
          ))}
        </ul>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {orderedTools.map((tool) => {
            const Icon = tool.icon;
            const isRecommended = highlighted.has(tool.slug);
            return (
              <Link
                key={`${path.id}-${tool.slug}`}
                to={tool.url}
                onClick={() => trackEvent("discovery_tool_clicked", { feature: tool.slug })}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm",
                  "p-4 min-h-[76px] transition-all duration-300 ease-out motion-reduce:transition-none",
                  "md:hover:border-primary/40 md:hover:-translate-y-0.5 md:hover:shadow-elevated motion-reduce:md:hover:translate-y-0 active:scale-[0.99] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isRecommended && "border-primary/40",
                )}
              >
                <span className="rounded-lg p-2 bg-primary/10 text-primary border border-primary/20 shrink-0 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold tracking-tight">
                      {tool.title}
                    </span>
                    {isRecommended && (
                      <span className="rounded-full border border-primary/30 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[0.16em] text-primary">
                        Recomendado
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground leading-snug">
                    {tool.description}
                  </span>
                </span>
              </Link>
            );
          })}

        </div>

        <p className="text-sm text-muted-foreground">
          Tudo isso faz parte da mesma MedStation.
        </p>
      </div>
    </section>
  );
}

/** Grade completa dos assistentes, colapsada por padrão. */
export function AllToolsSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-display text-base md:text-lg font-semibold tracking-tight">
          Ver todas as ferramentas
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="animate-fade-in">{children}</div>}
    </section>
  );
}
