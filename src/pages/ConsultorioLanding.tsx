import { Seo } from "@/components/Seo";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Mic,
  Sparkles,
  ShieldCheck,
  Brain,
  Loader2,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trackCtaClick, trackCheckoutStarted } from "@/lib/analytics";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GuestEmailDialog } from "@/components/GuestEmailDialog";

type ConsultorioPlan = "consultorio_monthly" | "consultorio_upgrade" | "pro2_bundle" | "agents_upgrade";

const PLAN_META: Record<ConsultorioPlan, { label: string; price: string }> = {
  consultorio_monthly: { label: "Modo Escuta", price: "R$ 29,90/mês" },
  consultorio_upgrade: { label: "Modo Escuta (upgrade)", price: "R$ 19,90/mês" },
  pro2_bundle: { label: "MedStation Pro 2", price: "R$ 49,90/mês" },
  agents_upgrade: { label: "10 Assistentes (upgrade)", price: "R$ 19,90/mês" },
};

export default function ConsultorioLanding() {
  const navigate = useNavigate();
  const { hasAgents, hasConsultorio } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ConsultorioPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const runGuestCheckout = async (plan: ConsultorioPlan, email: string) => {
    setLoading(plan);
    try {
      // Guests can only buy standalone or bundle (upgrades require existing sub)
      const guestPlan = plan === "consultorio_upgrade" || plan === "agents_upgrade" ? "consultorio_monthly" : plan;
      trackCheckoutStarted({
        origin: "consultorio_landing",
        plan: guestPlan,
        billing_period: "monthly",
        auth_state: "guest",
      });
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email, plan: guestPlan },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Erro no checkout",
        description: err.message || "Não foi possível iniciar.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const startCheckout = async (plan: ConsultorioPlan) => {
    setLoading(plan);
    trackCtaClick({
      cta: `consultorio_${plan}`,
      section: "consultorio_landing",
      plan,
      billing_period: "monthly",
      destination: "checkout",
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        trackCheckoutStarted({
          origin: "consultorio_landing",
          plan,
          billing_period: "monthly",
          auth_state: "authenticated",
        });
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      // Visitante: abre diálogo pedindo o email
      setPendingPlan(plan);
      setDialogOpen(true);
      setLoading(null);
    } catch (err: any) {
      toast({
        title: "Erro no checkout",
        description: err.message || "Não foi possível iniciar.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <Seo path="/consultorio-landing" title="Modo Escuta — anamnese pronta pela sua voz" description="Grave a consulta e receba a transcrição e a anamnese estruturada pronta para copiar no prontuário." />
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/12 via-background to-primary/8 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(var(--primary-rgb),0.25),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(var(--primary-rgb),0.18),transparent)] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <Logo size="sm" />
              <span className="hidden md:inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border-l border-hairline pl-3">
                Modo Escuta
              </span>
            </div>
            <nav className="flex gap-2 md:gap-4 items-center">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs md:text-sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> MedStation
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs md:text-sm">
                Login
              </Button>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-12 md:pt-20 pb-12 md:pb-16 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl text-center space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              MedStation Modo Escuta
              <span className="h-px w-8 bg-primary" />
            </div>
            <h1 className="font-display text-[clamp(2rem,7vw,4rem)] tracking-tight leading-[1.05] text-foreground">
              Produza mais. <span className="italic text-primary">Digite menos.</span>
              <br />
              <span className="text-2xl md:text-3xl lg:text-4xl text-muted-foreground font-normal">
                Direto da consulta.
              </span>
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transcreva sua consulta em tempo real e receba a anamnese estruturada pronta no momento em que o paciente sai do consultório. Zero alucinação. Zero retrabalho.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/80 max-w-2xl mx-auto">
              Produto separado da MedStation, pode ser assinado isoladamente <span className="text-foreground">ou</span> somado aos 10 Assistentes (R$ 19,90/mês de upgrade) <span className="text-foreground">ou</span> contratado completo no Pro 2.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                size="lg"
                onClick={() => document.getElementById("planos-consultorio")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6"
              >
                <Mic className="w-4 h-4 mr-2" />
                Assinar agora
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}>
                Como funciona
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-12 md:py-20 px-4 md:px-6 relative">
          <div className="absolute inset-0 bg-muted/20 backdrop-blur-3xl" />
          <div className="container mx-auto max-w-5xl relative">
            <div className="text-center mb-10 md:mb-14 space-y-3">
              <Badge variant="secondary" className="text-xs">Fluxo da consulta</Badge>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                Três passos. <span className="italic text-primary">Zero digitação.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                {
                  n: "01",
                  title: "Inicia a consulta",
                  desc: "Um clique e o microfone começa a captar. Indicador visual mostra que está ouvindo.",
                  icon: Mic,
                },
                {
                  n: "02",
                  title: "Conversa naturalmente",
                  desc: "Atenda como sempre. A transcrição aparece em tempo real e respeita as pausas naturais da conversa.",
                  icon: Brain,
                },
                {
                  n: "03",
                  title: "Anamnese pronta",
                  desc: "Ao finalizar, o áudio inteiro é revisado para máxima precisão e o Clínicus devolve a anamnese estruturada, pronta para revisar e registrar.",
                  icon: Sparkles,
                },
              ].map((step) => (
                <Card key={step.n} className="p-6 border-hairline bg-card/60 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground">{step.n}</span>
                    <div className="w-10 h-10 rounded border border-hairline bg-background/40 flex items-center justify-center">
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-display text-lg tracking-tight mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tecnologia */}
        <section className="py-12 md:py-20 px-4 md:px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-3">
              <Badge variant="secondary" className="text-xs">Tecnologia clínica</Badge>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                Engenharia clínica de ponta
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Dois motores de transcrição trabalhando juntos: velocidade durante a consulta <em>e</em> precisão na revisão final.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Transcrição ao vivo, palavra por palavra", desc: "Aparece na tela no ritmo da conversa, respeitando pausas naturais." },
                { title: "Revisão final do áudio completo", desc: "Ao encerrar, o áudio inteiro é re-processado para corrigir qualquer ruído e garantir máxima precisão." },
                { title: "Sem invenções, sem alucinação", desc: "Filtros rígidos impedem o modelo de completar frases ou inventar termos que não foram ditos." },
                { title: "Anamnese estruturada automaticamente", desc: "Clínicus recebe a transcrição limpa e devolve a anamnese pronta para revisar e registrar." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-4 rounded-md border border-hairline bg-card/40">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos-consultorio" className="py-12 md:py-20 px-4 md:px-6 relative">
          <div className="absolute inset-0 bg-muted/30 backdrop-blur-3xl" />
          <div className="container mx-auto max-w-5xl relative">
            <div className="text-center mb-10 space-y-3">
              <Badge variant="secondary" className="text-xs">Planos</Badge>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                Escolha como prefere assinar
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                {hasAgents && !hasConsultorio
                  ? "Você já tem os Assistentes — adicione o Modo Escuta com preço exclusivo de upgrade."
                  : hasConsultorio && !hasAgents
                  ? "Você já tem o Modo Escuta — complete sua estação com os 10 Assistentes."
                  : "Comece pelo essencial ou leve tudo no MedStation Pro 2."}
              </p>
            </div>

            {/* Conditional upgrade banner */}
            {(hasAgents && !hasConsultorio) && (
              <Card className="p-5 mb-6 border-2 border-primary bg-primary/5 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-primary mb-1">Preço de upgrade</div>
                    <div className="font-display text-xl tracking-tight">Adicione o Modo Escuta por <span className="text-primary">R$ 19,90/mês</span></div>
                    <p className="text-xs text-muted-foreground mt-1">Em vez de R$ 29,90 — exclusivo para assinantes dos Assistentes.</p>
                  </div>
                  <Button
                    onClick={() => startCheckout("consultorio_upgrade")}
                    disabled={loading === "consultorio_upgrade"}
                  >
                    {loading === "consultorio_upgrade" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Fazer upgrade <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Consultório standalone */}
              <Card className="p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Escuta</span>
                    <h3 className="font-display text-2xl tracking-tight mt-1">Modo Escuta</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">R$ 29,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">ou R$ 299,90/ano (≈ R$ 24,99/mês)</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Transcrição em tempo real, palavra por palavra</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Revisão final do áudio para máxima precisão</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Anamnese estruturada automaticamente</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Sem invenções: só registra o que foi dito</li>
                  </ul>
                </div>
                <Button
                  className="w-full mt-6"
                  variant="outline"
                  onClick={() => startCheckout("consultorio_monthly")}
                  disabled={loading === "consultorio_monthly"}
                >
                  {loading === "consultorio_monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assinar Modo Escuta"}
                </Button>
              </Card>

              {/* Pro 2 bundle - destaque */}
              <Card className="p-6 border-2 border-primary bg-card/80 backdrop-blur-sm relative overflow-hidden flex flex-col md:scale-105">
                <div className="absolute -top-1 -right-1">
                  <Badge className="bg-primary text-primary-foreground border-0 px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] font-mono rounded-sm">
                    Melhor valor
                  </Badge>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-primary">Pro 2 — Tudo incluso</span>
                    <h3 className="font-display text-2xl tracking-tight mt-1 text-primary">MedStation Pro 2</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">R$ 49,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Economize R$ 9,90 vs comprar separado</p>
                  <p className="text-[11px] text-muted-foreground -mt-2">ou R$ 499,90/ano (≈ R$ 41,66/mês)</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> <strong className="text-foreground">10 Assistentes</strong> (Clínicus, Examinus, etc.)</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> <strong className="text-foreground">Modo Escuta</strong> em tempo real</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Uso sem restrições, sem pop-ups</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Garantia 7 dias</li>
                  </ul>
                </div>
                <Button
                  className="w-full mt-6"
                  onClick={() => startCheckout("pro2_bundle")}
                  disabled={loading === "pro2_bundle"}
                >
                  {loading === "pro2_bundle" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Assinar Pro 2 <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </Card>

              {/* Assistentes standalone */}
              <Card className="p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Assistentes</span>
                    <h3 className="font-display text-2xl tracking-tight mt-1">10 Assistentes</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">R$ 29,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Clínicus, Examinus, Gasometrus...</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Prescriptus com Bula Inteligente</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Pacientes e casos ilimitados</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Garantia 7 dias</li>
                  </ul>
                </div>
                <Button
                  className="w-full mt-6"
                  variant="outline"
                  onClick={() => startCheckout("agents_upgrade" as any)}
                  disabled={loading !== null}
                  // For guests this re-routes to consultorio fallback; for logged-in agent users it'd be wrong.
                  // Best: navigate to /pricing for agents standalone
                >
                  <a onClick={(e) => { e.preventDefault(); navigate("/pricing"); }}>
                    Ver Assistentes
                  </a>
                </Button>
              </Card>
            </div>

            {/* Email é solicitado em diálogo ao clicar em qualquer botão de assinatura */}
            {!hasAgents && !hasConsultorio && (
              <p className="mt-6 text-xs text-center text-muted-foreground">
                Visitantes só precisam do email para começar — a senha é criada após o pagamento.
              </p>
            )}

            {/* Garantia */}
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Garantia incondicional de 7 dias — devolvemos 100% se não gostar
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-20 px-4 md:px-6">
          <div className="container mx-auto max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight text-center mb-10">
              Perguntas frequentes
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Por que o Modo Escuta é cobrado à parte dos Assistentes?",
                  a: "Os custos de manutenção são significativamente mais altos: transcrição ao vivo durante toda a consulta, revisão completa do áudio ao final e processamento contínuo. Para manter a qualidade, separamos o produto. Quem já assina os Assistentes paga apenas R$ 19,90/mês de upgrade.",
                },
                {
                  q: "Funciona offline?",
                  a: "Não. A transcrição em tempo real depende de conexão com nossos engines de áudio na nuvem. Recomendamos uma conexão estável durante a consulta.",
                },
                {
                  q: "E se eu já tiver o Modo Escuta e quiser os 10 Assistentes?",
                  a: "Você paga apenas R$ 19,90/mês adicional pelos Assistentes — mesma lógica de upgrade cruzado. Ou troque para o Pro 2 (R$ 49,90/mês) que já vem com tudo.",
                },
                {
                  q: "Tem teste grátis?",
                  a: "Não há trial gratuito, mas oferecemos garantia incondicional de 7 dias. Se não gostar, devolvemos 100% sem perguntas.",
                },
              ].map((item) => (
                <Card key={item.q} className="p-5 border border-hairline">
                  <h3 className="font-semibold text-sm mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 px-4 md:px-6">
          <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="font-mono uppercase tracking-[0.18em]">MedStation</span>
            </div>
            <p>© {new Date().getFullYear()} MedStation. Produza mais. Digite menos.</p>
          </div>
        </footer>

        <GuestEmailDialog
          open={dialogOpen}
          onOpenChange={(o) => { setDialogOpen(o); if (!o) setPendingPlan(null); }}
          planLabel={pendingPlan ? PLAN_META[pendingPlan].label : ""}
          priceLabel={pendingPlan ? PLAN_META[pendingPlan].price : ""}
          loading={loading !== null}
          onConfirm={(email) => {
            if (pendingPlan) runGuestCheckout(pendingPlan, email);
          }}
        />
      </div>
    </div>
  );
}
