import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Loader2, Pill, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { CustomizeReplyButton } from "@/components/chat/CustomizeReplyButton";
import { copyText } from "@/lib/clipboard";

interface PrescriptionPaneProps {
  prescription: string;
  onChange: (value: string) => void;
  isPrescribing: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
}

/** Proposta de receituário do Prescriptus gerada a partir da consulta. */
export function PrescriptionPane({ prescription, onChange, isPrescribing, onGenerate, canGenerate }: PrescriptionPaneProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const has = prescription.trim().length > 0;

  const copy = async () => {
    const ok = await copyText(prescription.trim());
    if (ok) toast.success("Receita copiada 👏");
    else toast.error("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
  };

  const openPrescriptus = () => {
    sessionStorage.setItem("agent-prefill", `Revise esta proposta de receita gerada a partir da consulta:\n\n${prescription.trim()}`);
    navigate("/prescriptus");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <Pill className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-xs md:text-sm truncate">Prescrição sugerida · Prescriptus</h3>
          {isPrescribing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {has && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs" onClick={copy}>
              <Copy className="h-3 w-3" /> <span className="hidden md:inline">Copiar receita</span>
            </Button>
            <CustomizeReplyButton content={prescription} assistantLabel="Prescriptus" returnTo="/consultorio" />
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs" onClick={openPrescriptus} title="Ajustar no Prescriptus">
              <Send className="h-3 w-3" /> <span className="hidden md:inline">Ajustar</span>
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 space-y-3">
          {!has ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-muted-foreground">
                {isPrescribing
                  ? "O Prescriptus está montando a receita a partir da consulta..."
                  : "A receita sugerida aparece aqui ao estruturar a consulta."}
              </p>
              {!isPrescribing && (
                <Button size="sm" variant="outline" onClick={onGenerate} disabled={!canGenerate} className="gap-1.5">
                  <Pill className="h-3.5 w-3.5" /> Gerar receita sugerida
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                {editing ? (
                  <Textarea
                    value={prescription}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    className="min-h-[360px] border-0 font-sans text-xs md:text-sm leading-relaxed focus-visible:ring-0"
                    autoFocus
                  />
                ) : (
                  <pre
                    onClick={() => setEditing(true)}
                    className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed text-foreground/90 px-3 py-3 cursor-text"
                  >
                    {prescription}
                  </pre>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Proposta para revisão. A decisão e a assinatura são suas.</p>
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={onGenerate} disabled={isPrescribing || !canGenerate}>
                  {isPrescribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Gerar de novo
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
