import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Mic,
  Sparkles,
  ShieldCheck,
  Clock,
  Brain,
  Loader2,
  Mail,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConsultorioLanding() {
  const navigate = useNavigate();
  const { hasAgents, hasConsultorio } = useSubscription();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (plan: "consultorio_monthly" | "consultorio_upgrade" | "pro2_bundle" | "agents_upgrade") => {
    setLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      const trimmed = email.trim().toLowerCase();
      if (!trimmed.includes("@")) {
        toast({
          title: "Email necessário",
          description: "Digite seu email para iniciar a assinatura.",
          variant: "destructive",
        });
        return;
      }
      // Guests can only buy standalone or bundle (upgrades require existing sub)
      const guestPlan = plan === "consultorio_upgrade" || plan === "agents_upgrade" ? "consultorio_monthly" : plan;
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email: trimmed, plan: guestPlan },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Erro no checkout",
        description: err.message || "Não foi possível iniciar.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative">
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
                Modo Consultório
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
              MedStation Modo Consultório
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
                  desc: "Atenda como sempre. Transcrição aparece em tempo real, com VAD que respeita pausas.",
                  icon: Brain,
                },
                {
                  n: "03",
                  title: "Anamnese pronta",
                  desc: "Ao finalizar, Whisper revisa o áudio completo e o Clínicus estrutura a AHE automaticamente.",
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
              <Badge variant="secondary" className="text-xs">Tecnologia híbrida</Badge>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                Engenharia clínica de ponta
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Combinamos dois engines de transcrição para entregar latência baixa <em>e</em> precisão clínica.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Scribe v2 ao vivo", desc: "Transcrição streaming token-a-token com VAD de 700ms para fluidez natural." },
                { title: "Whisper na revisão", desc: "Áudio completo é re-processado ao final para corrigir qualquer ruído da live." },
                { title: "Anti-alucinação estrita", desc: "Filtros impedem o modelo de inventar termos ou completar frases que não foram ditas." },
                { title: "AHE estruturada automática", desc: "Clínicus recebe a transcrição limpa e devolve anamnese no formato hospitalar." },
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
                  ? "Você já tem os Assistentes — adicione o Consultório com preço exclusivo de upgrade."
                  : hasConsultorio && !hasAgents
                  ? "Você já tem o Consultório — complete sua estação com os 10 Assistentes."
                  : "Comece pelo essencial ou leve tudo no MedStation AI Pro 2."}
              </p>
            </div>

            {/* Conditional upgrade banner */}
            {(hasAgents && !hasConsultorio) && (
              <Card className="p-5 mb-6 border-2 border-primary bg-primary/5 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-primary mb-1">Preço de upgrade</div>
                    <div className="font-display text-xl tracking-tight">Adicione o Modo Consultório por <span className="text-primary">R$ 19,90/mês</span></div>
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
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Consultório</span>
                    <h3 className="font-display text-2xl tracking-tight mt-1">Modo Consultório</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">R$ 29,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Transcrição em tempo real</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Revisão final com Whisper</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> AHE estruturada automática</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Anti-alucinação estrita</li>
                  </ul>
                </div>
                <Button
                  className="w-full mt-6"
                  variant="outline"
                  onClick={() => startCheckout("consultorio_monthly")}
                  disabled={loading === "consultorio_monthly"}
                >
                  {loading === "consultorio_monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assinar Consultório"}
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
                    <h3 className="font-display text-2xl tracking-tight mt-1 text-primary">MedStation AI Pro 2</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">R$ 49,90</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Economize R$ 9,90 vs comprar separado</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> <strong className="text-foreground">10 Assistentes</strong> (Clínicus, Examinus, etc.)</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> <strong className="text-foreground">Modo Consultório</strong> em tempo real</li>
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5" /> Sem cooldown, sem pop-ups</li>
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

            {/* Email field for guests */}
            {!hasAgents && !hasConsultorio && (
              <div className="mt-8 max-w-md mx-auto">
                <p className="text-xs text-center text-muted-foreground mb-2">
                  Não tem conta? Digite seu email e crie a senha no checkout
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
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
                  q: "Por que o Modo Consultório é cobrado à parte dos Assistentes?",
                  a: "Os custos de manutenção são significativamente mais altos: transcrição streaming ao vivo, revisão completa com Whisper e processamento contínuo de áudio. Para manter a qualidade, separamos o produto. Quem já assina os Assistentes paga apenas R$ 19,90/mês de upgrade.",
                },
                {
                  q: "Funciona offline?",
                  a: "Não. A transcrição em tempo real depende de conexão com nossos engines de áudio na nuvem. Recomendamos uma conexão estável durante a consulta.",
                },
                {
                  q: "E se eu já tiver o Consultório e quiser os 10 Assistentes?",
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
              <span className="font-mono uppercase tracking-[0.18em]">MedStation AI</span>
            </div>
            <p>© {new Date().getFullYear()} MedStation. Produza mais. Digite menos.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
