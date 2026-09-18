import { BookOpen, Check, ExternalLink, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ANNUAL_BONUS } from "@/lib/annualBonus";

interface AnnualBonusCardProps {
  /** "sales" = páginas de venda. "member" = assinante anual dentro da plataforma. */
  variant?: "sales" | "member";
  /** E-mail da conta, exibido na variante member. */
  accountEmail?: string | null;
  className?: string;
}

export function AnnualBonusCard({ variant = "sales", accountEmail, className = "" }: AnnualBonusCardProps) {
  const isMember = variant === "member";

  return (
    <div
      className={`rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 md:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Gift className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[0.65rem]">
              {isMember ? "Seu bônus anual" : "Bônus do plano anual"}
            </Badge>
            <span className="text-[0.7rem] text-muted-foreground line-through">{ANNUAL_BONUS.valueLabel}</span>
            <span className="text-[0.7rem] font-semibold text-primary">incluso</span>
          </div>

          <h3 className="mt-2 text-base md:text-lg font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {ANNUAL_BONUS.name}
          </h3>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground">{ANNUAL_BONUS.tagline}</p>

          <ul className="mt-4 space-y-2">
            {ANNUAL_BONUS.items.map((item) => (
              <li key={item} className="flex gap-2 text-xs md:text-sm text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[0.7rem] md:text-xs text-muted-foreground leading-relaxed">
            {isMember ? ANNUAL_BONUS.deliveryDetailed : ANNUAL_BONUS.deliveryShort}
          </p>

          {isMember && (
            <>
              {accountEmail && (
                <p className="mt-2 text-[0.7rem] md:text-xs">
                  E-mail da sua assinatura: <strong className="text-foreground">{accountEmail}</strong>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a href={ANNUAL_BONUS.accessUrl} target="_blank" rel="noopener noreferrer">
                    Acessar o Arsenal Med
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href={`mailto:${ANNUAL_BONUS.supportEmail}`}>Não recebi meu acesso</a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
