import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSISTANTS_GRID } from "@/lib/demoPromoContent";
import { Sparkles, ArrowRight, Check, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "limit-reached" | "cooldown" | "engagement";
  /** "app" = usuário já logado (sem CTA de criar conta) */
  context?: "public" | "app";
}

export function UpgradeModal({ open, onOpenChange, reason = "engagement", context = "public" }: UpgradeModalProps) {
  const navigate = useNavigate();

  const headline =
    reason === "limit-reached"
      ? "Você usou suas extrações gratuitas"
      : reason === "cooldown"
        ? "Cansou de esperar 30 segundos?"
        : "Conheça o resto da MedStation";

  const subline =
    reason === "limit-reached"
      ? "No Pro o Examinus fica liberado, sem restrições de uso, sem espera e sem pop-ups — e você ainda libera o restante da plataforma."
      : reason === "cooldown"
        ? "No Pro acabam a espera entre mensagens e os pop-ups. Use a plataforma inteira sem interrupção."
        : "Examinus é só o começo (e no plano grátis tem limite de uso, espera entre mensagens e pop-ups). O Pro libera o restante da plataforma sem restrições.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">MedStation Pro</span>
          </div>
          <DialogTitle className="text-2xl mt-3">{headline}</DialogTitle>
          <DialogDescription className="text-base">{subline}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-2">
          {ASSISTANTS_GRID.map((a) => (
            <div
              key={a.name}
              className={`p-3 rounded-lg border ${
                a.free
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/50 bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{a.name}</span>
                {a.free && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    Grátis
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 my-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>Acesso completo à MedStation, sem espera entre mensagens</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span>7 dias de garantia incondicional</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <span>Interface fluida, sem anúncios, sempre</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(context === "app" ? "/pricing" : "/auth");
            }}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {context === "app" ? "Assinar e liberar a MedStation completa" : "Criar conta grátis"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(context === "app" ? "/examinus" : "/pricing");
            }}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            {context === "app" ? "Agora não" : "Ver planos"}
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Plano único R$ 49,90/mês ou R$ 499,90/ano · 7 dias grátis no cadastro, sem cartão
        </p>
      </DialogContent>
    </Dialog>
  );
}
