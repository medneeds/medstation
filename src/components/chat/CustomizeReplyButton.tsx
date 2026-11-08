import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createCustomizableNote } from "@/lib/vault";

/** Opens the reply in the Bloco de Notas so the doctor can edit it freely; the edits stay saved in the note. */
export function CustomizeReplyButton({
  content,
  assistantLabel,
  returnTo,
}: {
  content: string;
  assistantLabel?: string;
  returnTo?: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await createCustomizableNote(content, assistantLabel);
      const params = new URLSearchParams();
      if (returnTo) params.set("voltar", returnTo);
      navigate(`/notes/${id}${params.size ? `?${params}` : ""}`);
    } catch (e: any) {
      toast({ title: "Não foi possível abrir", description: e.message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={open}
      disabled={busy}
      className="h-11 min-w-11 md:h-7 md:min-w-0 px-2 gap-1.5 text-xs"
      title="Personalizar no Bloco de Notas"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <SlidersHorizontal className="h-3 w-3" />}
      <span className="sr-only md:not-sr-only">Personalizar</span>
    </Button>
  );
}
