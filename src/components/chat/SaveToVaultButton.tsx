import { useState } from "react";
import { Vault, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { saveAssistantReplyToVault } from "@/lib/vault";

export function SaveToVaultButton({ content, assistantLabel }: { content: string; assistantLabel?: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const save = async () => {
    if (state !== "idle") return;
    setState("saving");
    try {
      await saveAssistantReplyToVault(content, assistantLabel);
      setState("saved");
      toast({ description: "Salvo no Cofre Inteligente, na pasta \"Salvos dos assistentes\"." });
    } catch (e: any) {
      setState("idle");
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={save} disabled={state === "saving"} className="h-7 px-2 gap-1.5 text-xs" title="Salvar no Cofre Inteligente">
      {state === "saved" ? <Check className="h-3 w-3 text-primary" /> : <Vault className="h-3 w-3" />}
      <span className={state === "saved" ? "text-primary hidden md:inline" : "hidden md:inline"}>
        {state === "saved" ? "No Cofre" : "Salvar no Cofre"}
      </span>
    </Button>
  );
}
