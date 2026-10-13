import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, Gift, Loader2, Lock, Quote, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackCheckoutStarted } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { DISPLAY_PRICING, brl } from "@/lib/subscription-tiers";
import { ANNUAL_BONUS } from "@/lib/annualBonus";

type Cycle = "monthly" | "yearly";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscribeNowDialog({ open, onOpenChange }: Props) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const monthly = DISPLAY_PRICING.bundle.monthly.now;
  const yearly = DISPLAY_PRICING.bundle.yearly.now;
  const saving = monthly * 12 - yearly;
  const savingPct = Math.round((saving / (monthly * 12)) * 100);
  const perDay = cycle === "yearly" ? yearly / 365 : monthly / 30;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Confira o e-mail e tente de novo." });
      return;
    }
    setLoading(true);
    const plan = cycle === "yearly" ? "pro_completo_yearly" : "pro_completo";
    trackCheckoutStarted({
      origin: "lp3_hero_dialog",
      product: "pro_completo",
      plan,
      billing_period: cycle,
      price_brl: cycle === "yearly" ? yearly : monthly,
      auth_state: "guest",
    });
    try {
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email: clean, product: "pro_completo", billingPeriod: cycle, plan },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Não foi possível abrir o pagamento.");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Não deu certo", description: err?.message || "Tente novamente em instantes." });
      setLoading(false);
    }
  };

  const option = (c: Cycle) => {
    const active = cycle === c;
    return (
      <button
        type="button"
        onClick={() => setCycle(c)}
        aria-pressed={active}
        className={`relative text-left rounded-xl p-3.5 transition-all ${
          active ? "border-2 border-primary bg-primary/5 shadow-medical" : "border border-border/70 bg-card hover:border-primary/40"
        }`}
      >
        {c === "yearly" && (
          <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
            Melhor custo · {savingPct}% off
          </span>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{c === "yearly" ? "Anual" : "Mensal"}</span>
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {active && <Check className="h-2.5 w-2.5" />}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">{brl(c === "yearly" ? yearly : monthly)}</span>
          <span className="text-xs text-muted-foreground">{c === "yearly" ? "/ano" : "/mês"}</span>
        </div>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {c === "yearly" ? `Pagamento único · economize ${brl(saving)}` : "Renova todo mês"}
        </p>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-lg gap-0">
        <div
          className="px-6 pt-6 pb-5 border-b border-border/60"
          style={{ background: "radial-gradient(500px 200px at 10% -20%, hsl(var(--primary) / 0.16), transparent 70%)" }}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Garantia incondicional de 7 dias
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold tracking-tight leading-tight">
            Menos de {brl(perDay)} por dia para devolver horas ao seu plantão
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed">
            Se a MedStation poupar 10 minutos de digitação por plantão, ela já se paga. Não gostou em 7 dias? Devolvemos 100% do valor, sem perguntas.
          </DialogDescription>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 pt-1">
            {option("monthly")}
            {option("yearly")}
          </div>

          <div
            className={`overflow-hidden rounded-xl border transition-all duration-300 ${
              cycle === "yearly" ? "border-primary/30 bg-primary/5 opacity-100" : "border-border/60 bg-muted/30 opacity-70"
            }`}
          >
            <div className="flex gap-3 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Gift className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Bônus anual: {ANNUAL_BONUS.name}{" "}
                  <span className="font-normal text-muted-foreground line-through">{ANNUAL_BONUS.valueLabel}</span>{" "}
                  <span className="text-primary">grátis</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{ANNUAL_BONUS.tagline}.</p>
                {cycle === "monthly" && (
                  <button type="button" onClick={() => setCycle("yearly")} className="mt-1.5 text-xs font-medium text-primary hover:underline">
                    Quero o anual com bônus →
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="sub-email" className="text-sm font-medium">Seu melhor e-mail</label>
            <Input
              id="sub-email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11"
              autoFocus
            />
            <p className="text-[0.7rem] text-muted-foreground">Seu acesso é criado com este e-mail logo após o pagamento.</p>
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo pagamento seguro...</>
            ) : (
              <>Assinar {cycle === "yearly" ? "anual" : "mensal"} · {brl(cycle === "yearly" ? yearly : monthly)} <ArrowRight className="ml-1.5 h-4 w-4" /></>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> 7 dias de garantia</span>
            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Cancele quando quiser</span>
          </div>

          <figure className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
            </div>
            <blockquote className="mt-2 text-sm leading-relaxed text-foreground/90">
              <Quote className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5 text-primary" />
              Otimizou meu processo de trabalho no técnico e na tomada de decisão. Executo minhas atividades de forma mais ágil e acurada.
            </blockquote>
            <figcaption className="mt-2 text-xs text-muted-foreground">Dr. Leandro Albuquerque · Médico</figcaption>
          </figure>
        </form>
      </DialogContent>
    </Dialog>
  );
}
