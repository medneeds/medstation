import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowDown, Sparkles, Activity, Brain, Calculator, Pill, FileCode, TestTube2, Wind, FileCheck, BookOpen, Compass, Stethoscope, Sigma } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InlineCheckout } from "@/components/QuickCheckout";
import { Logo } from "@/components/Logo";
import { AssistantShowcaseDialog } from "@/components/AssistantShowcaseDialog";
import { assistantSlides } from "@/lib/assistantSlides";

// Definição centralizada dos agentes com descrições precisas
const agents = [
  { name: "Examinus", icon: TestTube2, shortDesc: "Exames", fullDesc: "Extração e formatação de exames laboratoriais e de imagem", color: "from-purple-500 to-purple-600" },
  { name: "Clínicus", icon: Stethoscope, shortDesc: "Anamnese", fullDesc: "Anamneses hospitalares estruturadas e passagem de plantão", color: "from-blue-500 to-blue-600" },
  { name: "Scorius", icon: Calculator, shortDesc: "Scores", fullDesc: "Cálculo e interpretação de scores clínicos e escalas prognósticas", color: "from-red-500 to-red-600" },
  { name: "Numerus", icon: Sigma, shortDesc: "Cálculos", fullDesc: "Calculadoras médicas e conversão de unidades", color: "from-green-500 to-green-600" },
  { name: "Prescriptus", icon: Pill, shortDesc: "Prescrição", fullDesc: "Prescrições estruturadas com Bula Inteligente integrada", color: "from-orange-500 to-orange-600" },
  { name: "CODexus", icon: FileCode, shortDesc: "CID-10", fullDesc: "Codificação CID-10, TISS e procedimentos médicos", color: "from-indigo-500 to-indigo-600" },
  { name: "Gasometrus", icon: Wind, shortDesc: "Gasometria", fullDesc: "Análise completa e interpretação de gasometria arterial", color: "from-cyan-500 to-cyan-600" },
  { name: "Atestus", icon: FileCheck, shortDesc: "Atestados", fullDesc: "Geração de atestados médicos e declarações", color: "from-emerald-500 to-emerald-600" },
  { name: "Protocolus", icon: BookOpen, shortDesc: "Protocolos", fullDesc: "Consulta a protocolos e guidelines nacionais e internacionais", color: "from-amber-500 to-amber-600" },
  { name: "Orientus", icon: Compass, shortDesc: "Orientações", fullDesc: "Orientações ao paciente e instruções de alta hospitalar", color: "from-rose-500 to-rose-600" },
];

export default function Home() {
  const navigate = useNavigate();
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);

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
              onClick={() => navigate('/auth')}
            >
              Login
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
              onClick={() => scrollToSection('cadastro')}
            >
              Começar
            </Button>
          </nav>
        </div>
      </header>

      {/* Seção 1: Examinus por MedStation AI */}
      <section id="demo" className="pt-10 md:pt-16 pb-6 md:pb-8 px-4 md:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl relative">
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-700 text-center">

            {/* Hero editorial header */}
            <div className="space-y-4 md:space-y-5 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                <span className="h-px w-8 bg-primary" />
                Para médicos ocupados
              </div>
              <h1 className="font-display text-[clamp(2rem,8.5vw,4.5rem)] tracking-tight leading-[1.05] text-foreground md:whitespace-nowrap">
                Produza mais. <span className="italic text-primary">Digite menos.</span>
              </h1>
              <p className="text-[13px] md:text-base text-muted-foreground max-w-2xl mx-auto px-2 leading-relaxed">
                Conheça <span className="font-medium text-foreground">Examinus</span> — um dos 10 assistentes clínicos da MedStation AI.
                Teste agora, grátis e sem cadastro
                <ArrowDown className="inline-block w-3.5 h-3.5 text-primary ml-1 translate-y-[2px] animate-bounce" />
              </p>
            </div>

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
                Ver os outros 9 assistentes ↓
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
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight max-w-3xl mx-auto leading-[1.05] px-4 text-foreground">
              Dez assistentes. <span className="italic text-primary">Um único fluxo.</span>
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
              10 assistentes especializados para acelerar sua rotina médica
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
              { title: "Integrado", desc: "Todos os assistentes conectados em um ecossistema", metric: "10 IAs" },
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
              onClick={() => scrollToSection('planos')}
            >
              Ver planos e preços
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 backdrop-blur-3xl"></div>
        <div className="container mx-auto text-center max-w-5xl">
          <div className="mb-8 md:mb-10 lg:mb-12 space-y-3 md:space-y-4 px-4">
            <Badge variant="secondary" className="backdrop-blur-sm text-xs md:text-sm">
              Preço justo para médicos
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
              Comece grátis, <span className="italic text-primary">evolua quando quiser</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Examinus grátis para experimentar (com restrições). Pro libera os 10 assistentes <span className="italic text-foreground">verdadeiramente ilimitados</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {/* Plano Grátis */}
            <Card className="p-5 md:p-6 lg:p-8 text-left border-2 border-border/50 h-full flex flex-col">
              <div className="space-y-4 md:space-y-5 flex-1 flex flex-col">
                <div>
                  <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-1">Grátis</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Examinus para experimentar — com restrições</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl md:text-5xl tracking-tight">R$ 0</span>
                  <span className="text-base md:text-lg text-muted-foreground">/sempre</span>
                </div>
                <ul className="space-y-2.5 text-sm flex-1">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span><strong className="text-foreground">Apenas Examinus:</strong> extração e formatação de exames laboratoriais e de imagem</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span>Aceita PDFs, fotos e textos confusos — qualquer formato</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2"></div>
                    <span><strong className="text-foreground">Cota limitada por sessão:</strong> após poucas extrações, o uso é bloqueado temporariamente</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2"></div>
                    <span><strong className="text-foreground">Tempo de espera entre extrações</strong> (cooldown) que aumenta conforme o volume</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2"></div>
                    <span><strong className="text-foreground">Pop-ups de upgrade</strong> e processamento mais lento em horário de pico</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2"></div>
                    <span>Os outros 9 assistentes ficam <strong className="text-foreground">bloqueados</strong></span>
                  </li>
                </ul>
                
                <div className="space-y-3 mt-auto">
                  <Button 
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => navigate('/auth')}
                  >
                    Criar conta grátis
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Sem cartão • Sem compromisso
                  </p>
                </div>
              </div>
            </Card>

            {/* Plano Pro */}
            <Card className="p-5 md:p-6 lg:p-8 text-left border-2 border-primary relative overflow-hidden animate-in fade-in duration-700 transition-all">
              {/* Popular badge */}
              <div className="absolute -top-1 -right-1">
                <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] font-mono">
                  Recomendado
                </Badge>
              </div>

              <div className="space-y-4 md:space-y-5 relative">
                <div>
                  <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-1 text-primary">MedStation AI Pro</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">10 assistentes IA — ilimitado de verdade, sem cooldown e sem pop-ups</p>
                </div>
                
                {/* Pricing */}
                <div className="my-4 md:my-6">
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 bg-primary/10 border border-primary/30 rounded-full mb-3">
                    <span className="text-[0.65rem] uppercase tracking-[0.18em] font-mono text-primary">Oferta especial</span>
                  </div>
                  
                  <div className="flex items-end gap-2 md:gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">R$ 29,90</span>
                        <span className="text-base md:text-lg text-muted-foreground">/mês</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 md:p-3 bg-muted/50 rounded-lg border border-hairline mt-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      Ou <span className="font-medium text-foreground">R$ 299,90/ano</span> (em vez de R$ 358,80) — economize <span className="font-medium text-foreground">R$ 58,90 (16%)</span>
                    </span>
                  </div>
                </div>
                
                <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                  {agents.map((agent, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                      <span><strong className="text-foreground">{agent.name}:</strong> {agent.fullDesc}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Garantia de 7 dias */}
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs md:text-sm text-foreground mb-0.5 md:mb-1">Garantia de 7 dias</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                        Teste sem risco. Se não gostar, devolvemos 100% do valor.
                      </p>
                    </div>
                  </div>
                </div>
                
                <InlineCheckout 
                  product="agents" 
                  billingPeriod="monthly"
                  buttonText="Assinar agora"
                  placeholder="Seu email para começar"
                  className="flex-col sm:flex-row"
                />
                
                <p className="text-[10px] md:text-xs text-center text-muted-foreground">
                  Cancele quando quiser • Sem multa • Crie sua senha no checkout
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="cadastro" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-2xl text-center relative space-y-6 md:space-y-8">
          <div className="space-y-3 md:space-y-4">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
              Comece em <span className="italic text-primary">30 segundos</span>
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
              Sem cartão. Sem burocracia. Examinus grátis para experimentar (com restrições) — Pro libera os 10 ilimitados de verdade.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg"
              className="shadow-medical hover:shadow-elevated transition-all hover:scale-105 h-11 md:h-12 text-sm md:text-base"
              onClick={() => navigate('/auth')}
            >
              Criar conta gratuita
              <ArrowRight className="ml-2 h-3.5 md:h-4 w-3.5 md:w-4" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-11 md:h-12 text-sm md:text-base"
              onClick={() => scrollToSection('demo')}
            >
              Testar sem cadastro
            </Button>
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>Examinus grátis com restrições • Pro R$ 29,90/mês ou R$ 299,90/ano</span>
          </p>
        </div>
      </section>

      {/* Footer */}
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
