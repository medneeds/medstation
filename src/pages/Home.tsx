import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Activity, Brain, Calculator, Pill, FileCode, TestTube2, Wind, FileCheck, BookOpen, Compass, Stethoscope, Sigma, MessagesSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InlineCheckout } from "@/components/QuickCheckout";
import { Logo } from "@/components/Logo";
import { AssistantShowcaseDialog } from "@/components/AssistantShowcaseDialog";
import { assistantSlides } from "@/lib/assistantSlides";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TimeSavingsComparison } from "@/components/TimeSavingsComparison";
import { FAQMiniDemo } from "@/components/FAQMiniDemo";
import { HeroVideo } from "@/components/HeroVideo";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { trackCtaClick } from "@/lib/analytics";
import { SignupBenefitPrompt } from "@/components/demo/SignupBenefitPrompt";
import { Seo } from "@/components/Seo";
import { InlineSignup } from "@/components/InlineSignup";


type FAQItem = {
  q: string;
  a: string;
  demo?: "consultorio" | "seguranca" | "teste";
};

const faqs: FAQItem[] = [
  {
    q: "Os meus dados e dos meus pacientes ficam protegidos?",
    a: "Sim. Toda a infraestrutura segue a LGPD, com criptografia em trânsito e em repouso. Nenhuma informação clínica é usada para treinar modelos e o acesso é restrito à sua conta autenticada.",
    demo: "seguranca",
  },
  {
    q: "Preciso instalar algo ou baixar aplicativo?",
    a: "Não. A MedStation AI roda direto no navegador, no computador, tablet ou celular. Basta entrar com seu e-mail e começar a usar.",
  },
  {
    q: "Como funciona o Modo Consultório?",
    a: "Você grava a conversa com o paciente direto pelo navegador e a plataforma transcreve em tempo real, separando fala do médico e do paciente, e organiza tudo em uma anamnese estruturada pronta para revisar e copiar para o seu prontuário.",
    demo: "consultorio",
  },
  {
    q: "Posso testar antes de assinar?",
    a: "Pode. O Examinus tem versão gratuita com restrições direto na página inicial, sem precisar criar conta. Os planos pagos ainda têm 7 dias de garantia incondicional: se não gostar, devolvemos 100% do valor.",
    demo: "teste",
  },
  {
    q: "Funciona para qualquer especialidade?",
    a: "Sim. Os assistentes foram desenhados para o raciocínio clínico geral e atendem clínica médica, emergência, UTI, ambulatório e a maioria das especialidades. Você adapta o estilo de redação aos seus padrões.",
  },
  {
    q: "Posso cancelar a assinatura quando quiser?",
    a: "Sim, a qualquer momento, direto no portal de assinatura. Sem multa, sem fidelidade e sem ligação para o SAC.",
  },
  {
    q: "Qual a diferença entre os planos?",
    a: "O Pro 1 dá acesso ao ecossistema dos 11 assistentes para o trabalho clínico do dia a dia. O Pro 2 inclui o Modo Consultório com transcrição da consulta. Você ainda pode combinar com o Studius para estudo médico contínuo.",
  },
];

// Definição centralizada dos agentes com descrições precisas
const agents = [
  { name: "Examinus", icon: TestTube2, shortDesc: "Exames", fullDesc: "Resuma exames em segundos", color: "from-purple-500 to-purple-600" },
  { name: "Clínicus", icon: Stethoscope, shortDesc: "Anamnese", fullDesc: "Sua anamnese pronta", color: "from-blue-500 to-blue-600" },
  { name: "Scorius", icon: Calculator, shortDesc: "Scores", fullDesc: "Calcule scores e risco em segundos", color: "from-red-500 to-red-600" },
  { name: "Numerus", icon: Sigma, shortDesc: "Cálculos", fullDesc: "Calculadoras médicas instantâneas", color: "from-green-500 to-green-600" },
  { name: "Prescriptus", icon: Pill, shortDesc: "Medicamentos", fullDesc: "Bula inteligente e consulta de medicamentos", color: "from-orange-500 to-orange-600" },
  { name: "CODexus", icon: FileCode, shortDesc: "CID-10", fullDesc: "Encontre o CID-10 certo na hora", color: "from-indigo-500 to-indigo-600" },
  { name: "Gasometrus", icon: Wind, shortDesc: "Gasometria", fullDesc: "Leia gasometria na hora", color: "from-cyan-500 to-cyan-600" },
  { name: "Atestus", icon: FileCheck, shortDesc: "Atestados", fullDesc: "Atestados prontos em um clique", color: "from-emerald-500 to-emerald-600" },
  { name: "Protocolus", icon: BookOpen, shortDesc: "Protocolos", fullDesc: "Protocolos atualizados na hora", color: "from-amber-500 to-amber-600" },
  { name: "Orientus", icon: Compass, shortDesc: "Orientações", fullDesc: "Orientações claras para o paciente", color: "from-rose-500 to-rose-600" },
  { name: "Mediscuss", icon: MessagesSquare, shortDesc: "Discussão de casos", fullDesc: "Pareceres e discussões prontos para o prontuário", color: "from-teal-500 to-teal-600" },
];

export default function Home() {
  const navigate = useNavigate();
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  useReferralCapture();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeAgent = activeAssistant ? agents.find(a => a.name === activeAssistant) : null;
  const activeIndex = activeAgent ? agents.findIndex(a => a.name === activeAgent.name) : -1;

  return (
    <div className="min-h-screen relative">
      {/* Full-page gradient background - amplo e intenso */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/12 via-background to-primary/8 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(var(--primary-rgb),0.25),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(var(--primary-rgb),0.18),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(var(--primary-rgb),0.12),transparent)] pointer-events-none" />
      
      <div className="relative z-10">
      <Seo
        path="/landing"
        title="MedStation AI — 11 assistentes de IA para médicos"
        description="Anamnese, exames, prescrição e documentação clínica em segundos. Teste o Examinus grátis, sem cadastro."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MedStation AI",
            url: "https://medstation-ai.com.br/",
            description: "Plataforma de assistentes de inteligência artificial para médicos.",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MedStation AI",
            url: "https://medstation-ai.com.br/",
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "MedStation AI",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            description: "Onze assistentes clínicos de IA para anamnese, exames, prescrição, scores e documentação médica.",
            url: "https://medstation-ai.com.br/landing",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <SignupBenefitPrompt />


      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo size="sm" />
            <span className="hidden md:inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border-l border-hairline pl-3">
              Produza mais. Digite menos.
            </span>
          </div>
          <nav className="flex gap-2 md:gap-8 items-center">
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection('demo')}
            >
              Demo
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection('plataforma')}
            >
              Plataforma
            </Button>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
              onClick={() => { trackCtaClick({ cta: 'header_login', section: 'header', destination: '/auth' }); navigate('/auth'); }}
            >
              Login
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
              onClick={() => { trackCtaClick({ cta: 'header_comecar', section: 'header', destination: '#cadastro' }); scrollToSection('cadastro'); }}
            >
              Começar
            </Button>
          </nav>
        </div>
      </header>

      {/* Seção 1: Examinus por MedStation AI */}
      <section id="demo" className="pt-10 md:pt-16 pb-6 md:pb-8 px-4 md:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl relative">
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 text-center">

            {/* Demo Card — pulso sutil para chamar interação */}
            <div className="relative group">
              {/* Glow pulsante */}
              <div className="absolute -inset-1 bg-primary/20 rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 animate-[pulse_4s_ease-in-out_infinite]"></div>
              {/* Hairline ring que respira */}
              <div className="absolute -inset-px rounded-2xl border border-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Affordance — clip/nota no canto superior direito (oculto em telas muito pequenas para não sobrepor) */}
              <div className="hidden sm:block absolute -top-3 right-4 md:right-6 z-10 pointer-events-none rotate-[2deg] origin-top-right">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary text-primary-foreground border border-primary/60 text-[0.58rem] uppercase tracking-[0.2em] font-mono shadow-md">
                  <span className="w-1 h-1 rounded-full bg-primary-foreground animate-pulse" />
                  Cole um exame e teste
                </div>
              </div>

              <div className="relative transition-transform duration-500 group-hover:-translate-y-0.5">
                <PublicExaminusChat />
              </div>
            </div>


            {/* CTA Footer */}
            <div className="flex flex-col items-center gap-2 md:gap-3 pt-2 md:pt-3">
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Grátis para sempre · Sem cartão · Sem cadastro
              </p>
              <Button 
                variant="ghost"
                size="sm"
                className="text-xs md:text-sm text-muted-foreground hover:text-foreground h-8 md:h-9"
                onClick={() => scrollToSection('plataforma')}
              >
                Ver os outros 10 assistentes ↓
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: MedStation AI - Plataforma Completa */}
      <section id="plataforma" className="py-12 md:py-16 lg:py-20 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/20 backdrop-blur-3xl"></div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-10 md:mb-14 lg:mb-16 space-y-4 md:space-y-5">
            <Badge variant="secondary" className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium backdrop-blur-sm">
              Ecossistema Completo
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight max-w-3xl mx-auto leading-[1.05] px-4 text-foreground">
              Onze assistentes. <span className="italic text-primary">Um único fluxo.</span>
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
              11 assistentes especializados para acelerar sua rotina médica
            </p>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mb-10 md:mb-14 lg:mb-16">
            {agents.map((agent, i) => {
              const Icon = agent.icon;
              const code = String(i + 1).padStart(2, "0");
              return (
                <button
                  type="button"
                  key={agent.name}
                  onClick={() => setActiveAssistant(agent.name)}
                  aria-label={`Saiba mais sobre ${agent.name}`}
                  className="group relative text-left p-4 md:p-5 rounded-md border border-hairline bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card transition-all duration-300 cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Mono code, top-right — matches LogoMark registration ticks */}
                  <span className="absolute top-2 right-2.5 text-[0.55rem] uppercase tracking-[0.2em] font-mono text-muted-foreground/60">
                    {code}
                  </span>

                  {/* Icon — hairline frame, mint stroke, no fill */}
                  <div className="relative w-9 h-9 md:w-10 md:h-10 mb-3 rounded border border-hairline bg-background/40 flex items-center justify-center group-hover:border-primary/50 transition-colors duration-300">
                    <Icon
                      strokeWidth={1.5}
                      className="w-4 h-4 md:w-[18px] md:h-[18px] text-primary transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  <h4 className="font-display text-sm md:text-base tracking-tight text-foreground">{agent.name}</h4>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{agent.shortDesc}</p>
                </button>
              );
            })}
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-14 lg:mb-16">
            {[
              { title: "Economia de tempo", desc: "Até 70% menos digitação em documentação clínica", metric: "70%" },
              { title: "Precisão", desc: "IA treinada com guidelines médicos atualizados", metric: "99.9%" },
              { title: "Integrado", desc: "Todos os assistentes conectados em um ecossistema", metric: "11 IAs" },
            ].map((prop, i) => (
              <Card key={i} className="p-4 md:p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">{prop.metric}</div>
                <h4 className="font-semibold text-sm md:text-base mb-1">{prop.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">{prop.desc}</p>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 md:space-y-6">
            <p className="text-xs md:text-sm text-muted-foreground">
              Usado por médicos em mais de 50 hospitais e clínicas
            </p>
            
            <Button 
              size="lg"
              className="shadow-medical hover:shadow-elevated transition-all hover:scale-105 px-8"
              onClick={() => { trackCtaClick({ cta: 'provas_ver_planos', section: 'provas_sociais', destination: '#planos' }); scrollToSection('planos'); }}
            >
              Ver planos e preços
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Modo Consultório - novo produto */}
      <section id="consultorio" className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl relative">
          <Card className="p-6 md:p-10 lg:p-14 border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-card/80 to-card/60 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/40 rounded-full">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] font-mono text-primary">Novo · Tempo real</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.05]">
                  Modo Consultório.
                  <br />
                  <span className="italic text-primary">Em tempo real.</span>
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Atenda como sempre. Nós transcrevemos a consulta ao vivo e devolvemos a anamnese estruturada no momento em que o paciente sai.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Transcrição em tempo real, com revisão final do áudio</li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Sem invenções: registra apenas o que foi dito</li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Anamnese estruturada automaticamente, pronta para revisar e registrar</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button size="lg" onClick={() => navigate('/consultorio-landing')}>
                    Conhecer o Modo Consultório
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">A partir de R$ 29,90/mês</span>
                </div>
              </div>
              <div className="hidden md:block">
                <HeroVideo
                  slides={[{ id: "consultorio", label: "Modo Consultório", src: "/hero/hero.mp4", poster: "/hero/hero-poster.jpg" }]}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Comparativo de tempo — vende benefício antes do preço */}
      <section className="py-10 md:py-14 px-4 md:px-6 relative">
        <div className="container mx-auto max-w-6xl relative">
          <TimeSavingsComparison />
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 backdrop-blur-3xl"></div>
        <div className="container mx-auto text-center max-w-7xl relative">
          <div className="mb-8 md:mb-10 lg:mb-12 space-y-3 md:space-y-4 px-4">
            <Badge variant="secondary" className="backdrop-blur-sm text-xs md:text-sm">
              Preço justo para médicos
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
              Comece grátis, <span className="italic text-primary">monte sua estação</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Os 11 Assistentes e o Modo Consultório são <span className="text-foreground font-medium">produtos separados</span>. Assine só o que usa, ou junte os dois no MedStation AI Pro 2.
            </p>

            {/* Shared billing toggle */}
            <div className="inline-flex p-1 border border-hairline rounded-md bg-muted/40 mt-2">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('yearly')}
                className={`relative px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${billingPeriod === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Anual
                <span className="ml-1.5 text-[0.6rem] text-primary/90 font-semibold">−16%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 text-left">
            {/* Grátis */}
            <Card className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Sempre grátis</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1">Grátis</h3>
                  <p className="text-xs text-muted-foreground mt-1">Examinus para experimentar — com restrições</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl tracking-tight">R$ 0</span>
                  <span className="text-sm text-muted-foreground">/sempre</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Apenas Examinus</li>
                  <li className="flex gap-2"><span className="text-amber-500 mt-0.5">!</span> Limite de uso e tempo de espera entre mensagens</li>
                  <li className="flex gap-2"><span className="text-amber-500 mt-0.5">!</span> Pop-ups de upgrade</li>
                  <li className="flex gap-2"><span className="text-amber-500 mt-0.5">!</span> Outros 10 bloqueados</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_gratis', section: 'pricing', plan: 'free', billing_period: billingPeriod, destination: '/auth' }); navigate('/auth'); }}>
                Criar conta grátis
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">Sem cartão</p>
            </Card>

            {/* MedStation AI Pro — 11 Assistentes */}
            <Card className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">11 Assistentes</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1">MedStation AI Pro</h3>
                  <p className="text-xs text-muted-foreground mt-1">Os 11 assistentes liberados, sem restrições de uso.</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">{billingPeriod === 'yearly' ? 'R$ 299,90' : 'R$ 29,90'}</span>
                    <span className="text-sm text-muted-foreground">{billingPeriod === 'yearly' ? '/ano' : '/mês'}</span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-[10px] text-muted-foreground mt-1">≈ R$ 24,99/mês — economize R$ 58,90</p>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Clínicus, Examinus, Gasometrus...</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Prescriptus com Bula Inteligente</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Pacientes e casos ilimitados</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Garantia 7 dias</li>
                </ul>
              </div>
              <Button className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_agents', section: 'pricing', plan: billingPeriod === 'yearly' ? 'agents_yearly' : 'agents_monthly', billing_period: billingPeriod, price_brl: billingPeriod === 'yearly' ? 299.9 : 29.9, destination: '/pricing' }); navigate('/pricing'); }}>
                Assinar Pro
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            {/* MedStation AI Pro 2 — destaque */}
            <Card className="p-5 md:p-6 border-2 border-primary bg-card/85 backdrop-blur-sm flex flex-col relative overflow-hidden lg:scale-[1.03]">
              <div className="absolute -top-1 -right-1">
                <Badge className="bg-primary text-primary-foreground border-0 px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] font-mono rounded-sm">
                  Recomendado
                </Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary">Estação completa</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1 text-primary">MedStation AI Pro 2</h3>
                  <p className="text-xs text-muted-foreground mt-1">11 Assistentes + Modo Consultório no mesmo plano.</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">{billingPeriod === 'yearly' ? 'R$ 499,90' : 'R$ 49,90'}</span>
                    <span className="text-sm text-muted-foreground">{billingPeriod === 'yearly' ? '/ano' : '/mês'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {billingPeriod === 'yearly' ? '≈ R$ 41,66/mês — economize R$ 98,90' : 'Economize R$ 9,90/mês vs assinar separado'}
                  </p>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> <span className="text-foreground"><strong>11 Assistentes</strong> ilimitados</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> <span className="text-foreground"><strong>Modo Consultório</strong> em tempo real</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Anamnese estruturada automaticamente</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Suporte prioritário · Garantia 7 dias</li>
                </ul>
              </div>
              <Button className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_pro2', section: 'pricing', plan: billingPeriod === 'yearly' ? 'pro2_bundle_yearly' : 'pro2_bundle', billing_period: billingPeriod, price_brl: billingPeriod === 'yearly' ? 499.9 : 49.9, destination: '/pricing' }); navigate('/pricing'); }}>
                Assinar Pro 2
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            {/* Modo Consultório */}
            <Card className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Tempo real</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1">Modo Consultório</h3>
                  <p className="text-xs text-muted-foreground mt-1">Produto separado. Pode ser somado aos 11 Assistentes.</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight">{billingPeriod === 'yearly' ? 'R$ 299,90' : 'R$ 29,90'}</span>
                    <span className="text-sm text-muted-foreground">{billingPeriod === 'yearly' ? '/ano' : '/mês'}</span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-[10px] text-muted-foreground mt-1">≈ R$ 24,99/mês — economize R$ 58,90</p>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Transcrição em tempo real, palavra por palavra</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Anamnese estruturada automaticamente</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> 3 camadas que impedem qualquer invenção do modelo</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Reconhecimento de voz treinado para vocabulário médico</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_consultorio', section: 'pricing', plan: billingPeriod === 'yearly' ? 'consultorio_yearly' : 'consultorio_monthly', billing_period: billingPeriod, destination: '/consultorio-landing' }); navigate('/consultorio-landing'); }}>
                Conhecer o Consultório
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>

          {/* Cross-upgrade strip */}
          <div className="mt-8 md:mt-10 max-w-4xl mx-auto">
            <Card className="p-4 md:p-5 border border-primary/30 bg-primary/5 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center md:text-left">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs md:text-sm text-muted-foreground">
                  Já é assinante de um dos lados? Adicione o outro por <span className="text-primary font-semibold">apenas R$ 19,90/mês</span> — preço exclusivo de upgrade cruzado.
                </p>
                <Button variant="link" size="sm" className="text-primary h-auto p-0" onClick={() => { trackCtaClick({ cta: 'upgrade_cruzado', section: 'pricing_cross_upgrade', destination: '/pricing' }); navigate('/pricing'); }}>
                  Ver upgrade <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Cadastro inline — o usuário cria a conta sem sair da página */}
      <section id="cadastro" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
        <div className="container mx-auto max-w-6xl relative space-y-6 md:space-y-8">
          <div className="text-center space-y-3 md:space-y-4 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
              Comece em <span className="italic text-primary">30 segundos</span>
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
              Preencha aqui mesmo. Sem cartão, sem burocracia, sem sair desta página.
            </p>
          </div>
          <InlineSignup />
        </div>
      </section>


      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 px-4 md:px-6 relative">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10 md:mb-14">
            <Badge variant="outline" className="mb-4 text-[10px] md:text-xs">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Perguntas frequentes</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Tudo que médicos costumam perguntar antes de começar.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                <AccordionTrigger className="text-left text-sm md:text-base font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                  {item.demo && <FAQMiniDemo kind={item.demo} />}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      <footer className="border-t border-border/50 py-6 md:py-8 px-4 md:px-6 relative">
        <div className="container mx-auto flex flex-col md:flex-row flex-wrap justify-between gap-3 md:gap-4 items-center text-[10px] md:text-xs text-muted-foreground">
          <p>© 2025 MedStation AI</p>
          <p className="flex items-center gap-3 md:gap-4">
            <span>LGPD</span>
            <span>•</span>
            <span>Tecnologia médica</span>
          </p>
        </div>
      </footer>
      </div>

      {activeAgent && (
        <AssistantShowcaseDialog
          open={!!activeAssistant}
          onOpenChange={(o) => !o && setActiveAssistant(null)}
          name={activeAgent.name}
          shortDesc={activeAgent.shortDesc}
          fullDesc={activeAgent.fullDesc}
          icon={activeAgent.icon}
          slides={assistantSlides[activeAgent.name] ?? []}
          code={String(activeIndex + 1).padStart(2, "0")}
        />
      )}
    </div>
  );
}
