import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AssistantGlyph } from "@/components/AssistantGlyph";
import { copyText } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { todayISO } from "@/hooks/useWard";
import { Check, Copy, Loader2, Sparkles, Sun, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Evolução avulsa: cola a evolução anterior + o que mudou hoje e recebe a
 * evolução do dia pelo Carpe Diem, sem internar nem cadastrar o paciente.
 * Nada é salvo no banco.
 */
export function QuickRoundDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [previous, setPrevious] = useState("");
  const [changes, setChanges] = useState("");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!previous.trim() && !changes.trim()) {
      toast({ title: "Cole a evolução anterior ou descreva o que mudou hoje", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("carpe-diem-round", {
        body: {
          patient: {},
          previousRound: previous.trim(),
          changes: changes.trim(),
          roundDate: todayISO(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.content?.trim();
      if (!text) throw new Error("Resposta vazia");
      setResult(text);
    } catch (e: any) {
      toast({
        title: "Carpe Diem indisponível",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const doCopy = async () => {
    const ok = await copyText(result);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
    toast({ title: ok ? "Evolução copiada" : "Não foi possível copiar", variant: ok ? undefined : "destructive" });
  };

  const clearAll = () => {
    setPrevious("");
    setChanges("");
    setResult("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <AssistantGlyph size="sm" animate={false}>
              <Sun className="h-4 w-4" />
            </AssistantGlyph>
            <div className="min-w-0">
              <SheetTitle className="text-left">Evolução avulsa</SheetTitle>
              <SheetDescription className="text-left">
                Cole a evolução de ontem, diga o que mudou hoje e receba a evolução do dia. Sem cadastrar paciente e sem salvar nada.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="quick-previous">Evolução anterior</Label>
            <Textarea
              id="quick-previous"
              value={previous}
              onChange={(e) => setPrevious(e.target.value)}
              placeholder="Cole aqui a evolução do dia anterior..."
              className="min-h-[180px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-changes">O que mudou hoje</Label>
            <Textarea
              id="quick-changes"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="Ex.: febre à noite, retirado o cateter central, D5 de meropenem, desmame de noradrenalina."
              className="min-h-[110px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={generating}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Atualizar com Carpe Diem</>
              )}
            </Button>
            <Button variant="ghost" onClick={clearAll} disabled={generating}>
              <Trash2 className="h-4 w-4 mr-2" /> Limpar
            </Button>
          </div>

          {result && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="quick-result">Evolução de hoje</Label>
                  <Button size="sm" variant="outline" onClick={doCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <Textarea
                  id="quick-result"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="min-h-[320px] font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
