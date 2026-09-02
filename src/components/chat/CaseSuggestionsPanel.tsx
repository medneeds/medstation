import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  blockToText,
  itemToFollowUpQuestion,
  parseCaseSuggestions,
} from "@/lib/caseSuggestions";
import { Copy, Lightbulb, Loader2, MessageCircleQuestion } from "lucide-react";

interface CaseSuggestionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  loading: boolean;
  /** Envia um item como nova pergunta ao assistente. */
  onAsk: (question: string) => void;
}

/**
 * Painel lateral com a análise crítica do caso: lacunas da história,
 * hipóteses diagnósticas, red flags e sugestões de conduta.
 * Somente leitura — nada é inserido no documento automaticamente.
 */
export function CaseSuggestionsPanel({
  open,
  onOpenChange,
  content,
  loading,
  onAsk,
}: CaseSuggestionsPanelProps) {
  const { toast } = useToast();
  const { blocks, footer } = parseCaseSuggestions(content);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copiado.` });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
      >
        <SheetHeader className="shrink-0 px-5 py-4 border-b border-border/50 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Sugestões para o caso
          </SheetTitle>
          <SheetDescription className="text-xs">
            Análise de apoio baseada apenas nos dados enviados. A decisão final é do médico assistente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {loading && blocks.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando o caso...
            </div>
          )}

          {blocks.map((block, blockIndex) => (
            <section
              key={`${block.title}-${blockIndex}`}
              className="rounded-xl border border-border/50 bg-muted/20 animate-fade-in"
            >
              <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/40">
                <h3 className="text-[11px] font-semibold tracking-wide text-primary">
                  {block.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => copy(blockToText(block), "Bloco")}
                  title="Copiar este bloco"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </header>

              <div className="px-4 py-3 space-y-2">
                {block.notes.map((note, i) => (
                  <p key={`note-${i}`} className="text-sm leading-relaxed text-muted-foreground">
                    {note}
                  </p>
                ))}

                {block.items.map((item, i) => (
                  <div
                    key={`item-${i}`}
                    className="group flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-background/70 transition-colors"
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <p className="flex-1 text-sm leading-relaxed">{item}</p>
                    <div className="flex shrink-0 gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Copiar item"
                        onClick={() => copy(item, "Item")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Perguntar ao assistente sobre este item"
                        onClick={() => {
                          onAsk(itemToFollowUpQuestion(item, block.title));
                          onOpenChange(false);
                        }}
                      >
                        <MessageCircleQuestion className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {loading && blocks.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Concluindo análise...
            </div>
          )}

          {footer && (
            <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
              {footer}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
