import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Activity, Brain, Calculator, Pill, FileCode, TestTube2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";

export default function Home() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medical transition-transform group-hover:scale-105">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-foreground tracking-tight">MedStation AI</div>
              <div className="text-[0.65rem] text-muted-foreground font-medium">Produza mais. Digite menos.</div>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            <button onClick={() => scrollToSection('demo')} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Demo
            </button>
            <button onClick={() => scrollToSection('plataforma')} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Plataforma
            </button>
            <button onClick={() => scrollToSection('planos')} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Planos
            </button>
            <Button 
              variant="outline" 
              size="sm"
              className="hover:bg-accent"
              onClick={() => scrollToSection('cadastro')}
            >
              Começar
            </Button>
          </nav>
        </div>
      </header>

      {/* Seção 1: Examinus por MedStation AI */}
      <section id="demo" className="py-8 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-30"></div>
        <div className="container mx-auto max-w-4xl relative">
          <div className="space-y-8 animate-in fade-in duration-700 text-center">

            {/* Demo Card Centralizado */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-primary rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative">
                <PublicExaminusChat />
              </div>
            </div>

            {/* CTA Footer */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Teste grátis • Sem cadastro • Sem cartão
              </p>
              <Button 
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => scrollToSection('plataforma')}
              >
                Ver plataforma completa
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Plataforma Completa MedStation AI */}
      <section id="plataforma" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="container mx-auto relative">
          <div className="text-center mb-20 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-700">
            <Badge variant="secondary" className="backdrop-blur-sm px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse" />
              MedStation AI - Plataforma Completa
            </Badge>
            <h2 className="text-4xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Inteligência artificial com assistentes médicos especializados
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Organize exames, estruture anamneses, calcule scores, automatize documentações médicas e muito mais. Tudo em um só lugar.
            </p>
            
            {/* CTA Button */}
            <div className="mt-12">
              <Button 
                size="lg"
                className="group relative overflow-hidden bg-gradient-primary text-primary-foreground shadow-medical hover:shadow-elevated transition-all duration-300 hover:scale-105 px-8 py-6 text-lg font-semibold"
                onClick={() => scrollToSection('agentes')}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Conhecer agora
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </div>
          </div>

          {/* Assistentes */}
          <div id="agentes" className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-primary rounded-full mb-6 shadow-medical">
              <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse"></div>
              <span className="text-sm font-semibold text-primary-foreground tracking-wide">6 ESPECIALISTAS IA</span>
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Cada assistente domina sua especialidade
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Juntos, formam o ecossistema médico mais completo do mercado
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              { icon: TestTube2, name: "Examinus", desc: "Interpreta exames de sangue, imagem e laudos", badge: "Grátis", color: "from-violet-500/20 to-purple-500/20" },
              { icon: Activity, name: "Clínicus", desc: "Estrutura anamneses e histórias clínicas", badge: null, color: "from-blue-500/20 to-cyan-500/20" },
              { icon: Calculator, name: "Scorius", desc: "Calcula scores e classificações de risco", badge: null, color: "from-emerald-500/20 to-green-500/20" },
              { icon: Pill, name: "Prescriptus", desc: "Guia prescrições baseadas em evidências", badge: null, color: "from-rose-500/20 to-pink-500/20" },
              { icon: Brain, name: "Numerus", desc: "Calculadoras médicas e conversores", badge: null, color: "from-amber-500/20 to-orange-500/20" },
              { icon: FileCode, name: "CODexus", desc: "Codificação CID-10 e TISS automatizada", badge: null, color: "from-indigo-500/20 to-blue-500/20" }
            ].map((agent, idx) => (
              <Card 
                key={idx} 
                className="group p-8 transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 hover:border-primary/50 relative overflow-hidden bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Animated Border Glow */}
                <div className="absolute -inset-0.5 bg-gradient-primary rounded-lg opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      {/* Icon Container */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 group-hover:from-primary group-hover:to-primary/80 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg group-hover:shadow-2xl">
                        <agent.icon className="w-8 h-8 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                      </div>
                    </div>
                    {agent.badge && (
                      <Badge className="bg-gradient-primary text-primary-foreground border-0 shadow-medical px-3 py-1 text-xs font-bold">
                        {agent.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-bold text-2xl tracking-tight group-hover:text-primary transition-colors duration-300">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                      {agent.desc}
                    </p>
                  </div>

                  {/* Call to Action Indicator */}
                  <div className="flex items-center gap-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span>Explorar</span>
                    <ArrowRight className="w-3 h-3 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* CTA Bottom - Infinite Scroll Ecosystem */}
          <div className="text-center mt-20 space-y-6 animate-in fade-in duration-700 overflow-hidden" style={{ animationDelay: '600ms' }}>
            <div className="relative">
              {/* Gradient Overlays */}
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10"></div>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10"></div>
              
              {/* Infinite Scroll Container */}
              <div className="flex gap-6 animate-[scroll_20s_linear_infinite] hover:[animation-play-state:paused]">
                {/* First Set */}
                {[
                  { gradient: "from-violet-500 to-purple-500", name: "Examinus", icon: TestTube2 },
                  { gradient: "from-blue-500 to-cyan-500", name: "Clínicus", icon: Activity },
                  { gradient: "from-emerald-500 to-green-500", name: "Scorius", icon: Calculator },
                  { gradient: "from-rose-500 to-pink-500", name: "Prescriptus", icon: Pill },
                  { gradient: "from-amber-500 to-orange-500", name: "Numerus", icon: Brain },
                  { gradient: "from-indigo-500 to-blue-500", name: "CODexus", icon: FileCode }
                ].map((assistant, idx) => (
                  <div key={`first-${idx}`} className="flex flex-col items-center gap-2 min-w-[120px]">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${assistant.gradient} border-2 border-background shadow-lg transition-transform hover:scale-110 hover:rotate-3 flex items-center justify-center`}>
                      <assistant.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{assistant.name}</span>
                  </div>
                ))}
                
                {/* Duplicate Set for Seamless Loop */}
                {[
                  { gradient: "from-violet-500 to-purple-500", name: "Examinus", icon: TestTube2 },
                  { gradient: "from-blue-500 to-cyan-500", name: "Clínicus", icon: Activity },
                  { gradient: "from-emerald-500 to-green-500", name: "Scorius", icon: Calculator },
                  { gradient: "from-rose-500 to-pink-500", name: "Prescriptus", icon: Pill },
                  { gradient: "from-amber-500 to-orange-500", name: "Numerus", icon: Brain },
                  { gradient: "from-indigo-500 to-blue-500", name: "CODexus", icon: FileCode }
                ].map((assistant, idx) => (
                  <div key={`second-${idx}`} className="flex flex-col items-center gap-2 min-w-[120px]">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${assistant.gradient} border-2 border-background shadow-lg transition-transform hover:scale-110 hover:rotate-3 flex items-center justify-center`}>
                      <assistant.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{assistant.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-sm font-medium text-muted-foreground pt-4">
              Ecossistema completo • R$ 19,90/mês
            </p>
            
            <Button 
              size="lg"
              className="shadow-medical hover:shadow-elevated transition-all hover:scale-105 px-8"
              onClick={() => scrollToSection('planos')}
            >
              Ver todos os planos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 px-6 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto text-center max-w-5xl">
          <div className="mb-12 space-y-4">
            <Badge variant="secondary" className="backdrop-blur-sm">
              Preço transparente
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Comece grátis, evolua quando quiser
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Examinus sempre grátis. Premium desbloqueia todo o ecossistema.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Plano Grátis */}
            <Card className="p-8 text-left">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Grátis</h3>
                  <p className="text-sm text-muted-foreground">Examinus ilimitado</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 0</span>
                  <span className="text-muted-foreground">/sempre</span>
                </div>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span><strong className="text-foreground">Organização e estruturação inteligente</strong> de qualquer resultado de exame laboratorial (hemograma, bioquímica, gasometria) e de imagem (tomografia, raio-X, ultrassom)</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span>Uso ilimitado, sem cadastro inicial</span>
                  </li>
                </ul>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => scrollToSection('demo')}
                >
                  Testar agora
                </Button>
              </div>
            </Card>

            {/* Plano Pro */}
            <Card className="p-8 text-left border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 relative overflow-hidden shadow-medical">
              <div className="absolute top-4 right-4">
                <Badge className="bg-gradient-primary text-primary-foreground border-0">Popular</Badge>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Pro</h3>
                  <p className="text-sm text-muted-foreground">Ecossistema completo • 6 assistentes IA</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">R$ 19,90</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ou <span className="font-semibold text-foreground">R$ 199,90/ano</span> (16% de desconto)
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { name: "Examinus", desc: "Interpretação de exames" },
                    { name: "Clínicus", desc: "Anamneses estruturadas" },
                    { name: "Scorius", desc: "Cálculo de scores clínicos" },
                    { name: "Prescriptus", desc: "Prescrições baseadas em evidências" },
                    { name: "Numerus", desc: "Calculadoras médicas" },
                    { name: "CODexus", desc: "Codificação CID-10 e TISS" }
                  ].map((agent, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                      <span><strong className="text-foreground">{agent.name}:</strong> {agent.desc}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full shadow-medical hover:shadow-elevated transition-all hover:scale-105"
                  onClick={() => navigate("/pricing")}
                >
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="cadastro" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
        <div className="container mx-auto max-w-2xl text-center relative space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Comece em 30 segundos
            </h2>
            <p className="text-muted-foreground text-lg">
              Sem cartão. Sem burocracia. Apenas IA médica que funciona.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg"
              className="shadow-medical hover:shadow-elevated transition-all hover:scale-105"
              onClick={() => navigate("/auth")}
            >
              Criar conta gratuita
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('demo')}
            >
              Ou testar sem cadastro
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Examinus grátis para sempre • Pro R$ 19,90/mês
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="container mx-auto flex flex-wrap justify-between gap-4 items-center text-xs text-muted-foreground">
          <p>© 2025 MedStation AI</p>
          <p className="flex items-center gap-4">
            <span>LGPD</span>
            <span>•</span>
            <span>Tecnologia médica</span>
          </p>
        </div>
      </footer>
    </div>
  );
}