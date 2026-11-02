import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  /** Recebe o texto lido de cada arquivo, já com a etiqueta do nome. */
  onText: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function readFile(file: File): Promise<string> {
  const { data, error } = await supabase.functions.invoke("extract-file-text", {
    body: { file: await toBase64(file), fileName: file.name, mimeType: file.type },
  });
  if (error) {
    let msg = "";
    try {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") msg = (await ctx.json())?.error || "";
    } catch { /* ignora */ }
    throw new Error(msg || `Não consegui ler ${file.name}`);
  }
  const text = String((data as any)?.text || "").trim();
  if (!text) throw new Error((data as any)?.error || `Não encontrei texto em ${file.name}`);
  return text;
}

/**
 * Anexa fotos (exames, monitor, folha de prescrição) e PDFs ao campo do
 * Carpe Diem: o texto lido entra no campo para o médico conferir antes de atualizar.
 */
export function CarpeDiemFileButton({ onText, disabled, className }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handle = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, MAX_FILES);
    if (list.length > MAX_FILES) toast({ title: `Até ${MAX_FILES} arquivos por vez` });
    for (const file of files) {
      const ok = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!ok) { toast({ title: `${file.name}: envie foto ou PDF`, variant: "destructive" }); continue; }
      if (file.size > MAX_BYTES) { toast({ title: `${file.name}: arquivo maior que 10 MB`, variant: "destructive" }); continue; }
      setBusy(file.name);
      try {
        const text = await readFile(file);
        onText(`[Arquivo: ${file.name}]\n${text}`);
      } catch (e: any) {
        toast({ title: "Não foi possível ler o arquivo", description: e?.message, variant: "destructive" });
      }
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn("h-10 w-10 rounded-full shrink-0", className)}
            disabled={disabled || !!busy}
            onClick={() => inputRef.current?.click()}
            aria-label="Anexar foto ou PDF"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{busy ? `Lendo ${busy}...` : "Anexar foto ou PDF"}</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => void handle(e.target.files)}
      />
    </TooltipProvider>
  );
}
