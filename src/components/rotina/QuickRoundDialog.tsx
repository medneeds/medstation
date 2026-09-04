import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AssistantGlyph } from "@/components/AssistantGlyph";
import { AgentVoiceInput } from "@/components/AgentVoiceInput";
import { copyText } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { todayISO } from "@/hooks/useWard";
import { Check, Copy, Loader2, Send, Sparkles, Sun, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Turn {
  id: string;
  instruction: string;
  status: "pending" | "done" | "error";
}

/**
 * Evolução avulsa: cola a evolução anterior + o que mudou hoje e recebe a
 * evolução do dia pelo Carpe Diem, sem internar nem cadastrar o paciente.
 * Depois da primeira geração, um chat de ajustes permite refinar o texto
 * (por digitação ou por voz, à beira do leito). Nada é salvo no banco.
 */
export function QuickRoundDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [previous, setPrevious] = useState("");
  const [changes, setChanges] = useState("");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);

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
      setTurns([]);
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

  const refine = async (raw?: string) => {
    const text = (raw ?? instruction).trim();
    if (!text || refining || !result.trim()) return;
    const id = `${Date.now()}`;
    setTurns((prev) => [...prev, { id, instruction: text, status: "pending" }]);
    setInstruction("");
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("carpe-diem-round", {
        body: {
          mode: "refine",
          patient: {},
          currentRound: result,
          instruction: text,
          roundDate: todayISO(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const content = (data as any)?.content?.trim();
      if (!content) throw new Error("Resposta vazia");
      setResult(content);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done" } : t)));
    } catch (e: any) {
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error" } : t)));
      toast({
        title: "Não foi possível ajustar",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRefining(false);
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
    setTurns([]);
    setInstruction("");
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="quick-changes">O que mudou hoje</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">Ditar</span>
                <AgentVoiceInput
                  context="Evolução médica diária de enfermaria e UTI. Termos clínicos, medicações e doses."
                  disabled={generating}
                  onTranscription={(t) => setChanges((prev) => (prev ? `${prev} ${t}` : t))}
                />
              </div>
            </div>
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

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label>Ajustes com o Carpe Diem</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Peça mudanças e ele reescreve a evolução acima. Ex.: "deixe mais objetivo", "acrescente que a diurese está mantida", "reorganize a conduta em tópicos".
                  </p>
                </div>

                {turns.length > 0 && (
                  <div className="space-y-2">
                    {turns.map((t) => (
                      <div key={t.id} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                        <div className="flex-1 min-w-0 text-sm">{t.instruction}</div>
                        <div className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                          {t.status === "pending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {t.status === "done" && <Check className="h-3.5 w-3.5 text-primary" />}
                          {t.status === "error" && <span className="text-destructive">falhou</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void refine();
                      }
                    }}
                    placeholder="Escreva ou dite o ajuste..."
                    disabled={refining}
                    className="min-h-[52px] max-h-40 resize-none"
                  />
                  <AgentVoiceInput
                    context="Ajuste de evolução médica à beira do leito."
                    disabled={refining}
                    onTranscription={(t) => void refine(t)}
                  />
                  <Button
                    size="icon"
                    onClick={() => void refine()}
                    disabled={refining || !instruction.trim()}
                    aria-label="Enviar ajuste"
                    className="h-10 w-10 rounded-full shrink-0"
                  >
                    {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
