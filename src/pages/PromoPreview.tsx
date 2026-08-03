import { FlaskConical, ArrowRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeModal } from "@/components/demo/UpgradeModal";

export default function PromoPreview() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-examinus">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-lg font-semibold tracking-tight">Examinus</h3>
                <Badge variant="secondary" className="text-[10px]">Grátis para você</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Interprete exames laboratoriais e de imagem sem custo, direto aqui dentro da plataforma —
                sem espera entre mensagens e sem limite de demonstração.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button asChild><Link to="/examinus">Usar Examinus<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link to="/pricing"><Crown className="mr-1.5 h-4 w-4" />Liberar os 10 assistentes</Link></Button>
          </div>
        </div>
      </div>
      <UpgradeModal open onOpenChange={() => {}} reason="engagement" />
    </div>
  );
}
