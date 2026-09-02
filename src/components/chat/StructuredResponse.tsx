import { useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  clinicalSectionTitles,
  isStructuredClinicalText,
  parseClinicalResponse,
  stripMarkdown,
} from "@/lib/clinicalResponse";

type Size = "chat" | "focus" | "reading";

const SIZE_TEXT: Record<Size, string> = {
  chat: "text-[15px] leading-[1.75]",
  focus: "text-base md:text-lg leading-[1.8]",
  reading: "text-base md:text-xl leading-[1.8]",
};

const SIZE_TITLE: Record<Size, string> = SIZE_TEXT;

function CopySectionButton({ text, label }: { text: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copiar seção ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ description: "Seção copiada!" });
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/60 text-muted-foreground opacity-100 transition-all duration-150 hover:border-primary/50 hover:text-primary md:opacity-0 md:group-hover/section:opacity-100"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

/**
 * Renderiza a resposta do Clínicus em formato documento:
 * seções com hierarquia, listas reais, índice rápido e cópia por bloco.
 * Sem markdown — mantém o padrão de títulos em caixa alta.
 */
export function StructuredResponse({
  content,
  size = "chat",
  trailing,
  className,
}: {
  content: string;
  size?: Size;
  /** Cursor de digitação exibido ao final do último bloco. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const structured = useMemo(() => isStructuredClinicalText(content), [content]);
  const sections = useMemo(() => (structured ? parseClinicalResponse(content) : []), [structured, content]);
  const titles = useMemo(() => clinicalSectionTitles(sections), [sections]);

  if (!structured) {
    return (
      <p className={cn("whitespace-pre-wrap", SIZE_TEXT[size], className)}>
        {stripMarkdown(content)}
        {trailing}
      </p>
    );
  }

  const slug = (t: string, i: number) => `sec-${i}-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div ref={rootRef} className={cn("max-w-[78ch]", className)}>
      {titles.length >= 3 && (
        <div className="flex flex-wrap gap-1.5 pb-3 mb-4 border-b border-border/50">
          {sections.map((s, i) =>
            s.title ? (
              <button
                key={slug(s.title, i)}
                type="button"
                onClick={() =>
                  rootRef.current
                    ?.querySelector(`#${CSS.escape(slug(s.title, i))}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-primary hover:border-primary/50"
              >
                {s.title}
              </button>
            ) : null,
          )}
        </div>
      )}

      <div className="space-y-5">
        {sections.map((section, i) => {
          const isLast = i === sections.length - 1;
          return (
            <section
              key={`${section.title}-${i}`}
              id={section.title ? slug(section.title, i) : undefined}
              className="group/section animate-fade-in scroll-mt-6"
            >
              {section.title && (
                <div className="flex items-center gap-2 mb-2">
                  <h3
                    className={cn(
                      "font-semibold uppercase tracking-[0.14em] text-primary",
                      SIZE_TITLE[size],
                    )}
                  >
                    {section.title}
                  </h3>
                  <span className="h-px flex-1 bg-border/60" />
                  <CopySectionButton text={section.raw} label={section.title} />
                </div>
              )}

              <div className={cn("space-y-2.5 text-foreground/90", SIZE_TEXT[size])}>
                {section.blocks.map((block, bi) => {
                  const last = isLast && bi === section.blocks.length - 1;
                  if (block.type === "bullets") {
                    return (
                      <ul key={bi} className="space-y-1.5">
                        {block.items.map((item, ii) => (
                          <li key={ii} className="flex gap-2.5">
                            <span className="mt-[0.62em] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                            <span className="whitespace-pre-wrap">
                              {item}
                              {last && ii === block.items.length - 1 ? trailing : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === "keyValue") {
                    return (
                      <p key={bi} className="whitespace-pre-wrap">
                        <span className="font-medium text-foreground">{block.label}: </span>
                        {block.value}
                        {last ? trailing : null}
                      </p>
                    );
                  }
                  return (
                    <p key={bi} className="whitespace-pre-wrap">
                      {block.text}
                      {last ? trailing : null}
                    </p>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default StructuredResponse;
