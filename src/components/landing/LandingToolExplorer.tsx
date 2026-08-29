import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DISCOVERY_PATHS, type DiscoveryPathId } from "@/lib/discoveryPaths";
import { LANDING_TOOL_DETAILS } from "@/lib/landingDiscovery";
import { trackEvent } from "@/lib/analytics";

/**
 * Explorador interativo das ferramentas dentro da própria seção da landing.
 * Sem modal, sem rota nova: seletor de caminho + lista compacta + detalhe inline.
 */
export function LandingToolExplorer() {
  const [pathId, setPathId] = useState<DiscoveryPathId>("documentation");
  const [openSlug, setOpenSlug] = useState<string>("examinus");

  const path = useMemo(
    () => DISCOVERY_PATHS.find((p) => p.id === pathId) ?? DISCOVERY_PATHS[0],
    [pathId],
  );

  const selectPath = (id: DiscoveryPathId) => {
    if (id === pathId) return;
    setPathId(id);
    const next = DISCOVERY_PATHS.find((p) => p.id === id);
    setOpenSlug(next?.tools[0]?.slug ?? "");
    trackEvent("landing_discovery_path_selected", { feature: id, source: "lp3" });
  };

  const selectTool = (slug: string) => {
    setOpenSlug(slug);
    trackEvent("landing_tool_detail_opened", { feature: slug, source: "lp3" });
  };

  const detail = LANDING_TOOL_DETAILS[openSlug];
  const openTool = path.tools.find((t) => t.slug === openSlug);

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Caminhos da MedStation"
        className="flex flex-wrap justify-center gap-2"
      >
        {DISCOVERY_PATHS.map((p) => {
          const active = p.id === pathId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectPath(p.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
        {path.tagline}
      </p>

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
          {path.tools.map((tool) => {
            const Icon = tool.icon;
            const active = tool.slug === openSlug;
            return (
              <button
                key={tool.slug}
                type="button"
                aria-pressed={active}
                onClick={() => selectTool(tool.slug)}
                className={`min-h-[64px] text-left rounded-xl border px-3.5 py-3 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/60 bg-card hover:border-primary/45"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold">{tool.title}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
                  {tool.description}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className="rounded-2xl border border-border/60 bg-muted/25 p-5 md:p-6"
        >
          {detail && openTool ? (
            <>
              <h3 className="text-base md:text-lg font-semibold tracking-tight">{openTool.title}</h3>
              <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                {[
                  ["O que faz", detail.what],
                  ["Você fornece", detail.input],
                  ["Você recebe", detail.output],
                  ["Uso comum", detail.example],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                      {term}
                    </dt>
                    <dd className="mt-0.5 text-foreground/90">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" aria-hidden="true" />
              Selecione uma ferramenta para ver como ela funciona.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
