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
}

export function UpgradeModal({ open, onOpenChange, reason = "engagement" }: UpgradeModalProps) {
  const navigate = useNavigate();

  const headline =
    reason === "limit-reached"
      ? "Você usou suas extrações gratuitas"
      : reason === "cooldown"
        ? "Cansou de esperar 30 segundos?"
        : "Conheça os outros 9 assistentes";

  const subline =
    reason === "limit-reached"
      ? "No Pro o Examinus fica ilimitado de verdade — sem cota, sem cooldown e sem pop-ups — e você libera os outros 9 assistentes."
      : reason === "cooldown"
        ? "No Pro acabam o cooldown e os pop-ups. Use os 10 assistentes sem espera."
        : "Examinus é só o começo (e no plano grátis tem cota, cooldown e pop-ups). O Pro libera os 10 assistentes ilimitados de verdade.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">MedStation AI Pro</span>
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
            <span>Acesso aos 10 assistentes, sem cooldown</span>
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
              navigate("/auth");
            }}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            Criar conta grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/pricing");
            }}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Ver planos
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Pro R$ 29,90/mês ou R$ 299,90/ano (economize R$ 58,90) · grátis sem cartão, com restrições
        </p>
      </DialogContent>
    </Dialog>
  );
}
