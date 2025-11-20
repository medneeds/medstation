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
      <section id="demo" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-30"></div>
        <div className="container mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center relative">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <Badge variant="secondary" className="backdrop-blur-sm">
              <TestTube2 className="w-3 h-3 mr-1.5" />
              Examinus por MedStation AI
            </Badge>
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                  Cole os resultados dos exames
                </span>
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  e veja a mágica acontecer
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Extraio só o que importa, formato em padrão limpo e padronizado, pronto para você copiar e documentar, Doc!
              </p>
            </div>
            
            {/* Value Props */}
            <div className="space-y-3">
              {[
                "Extraio só o que importa",
                "Formato em padrão limpo",
                "Pronto para documentar"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button 
                size="lg"
                variant="outline"
                onClick={() => scrollToSection('plataforma')}
              >
                Ver plataforma completa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Teste grátis • Sem cadastro • Sem cartão
            </p>
          </div>

          {/* Demo Card */}
          <div className="relative animate-in fade-in slide-in-from-right duration-700">
            <div className="absolute -inset-1 bg-gradient-primary rounded-3xl blur-2xl opacity-20"></div>
            <div className="relative">
              <PublicExaminusChat />
            </div>
          </div>
        </div>
      </section>

      {/* Divider com mensagem */}
      <section className="py-12 px-6 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Experimente um exemplo rápido acima ou cole qualquer resultado de exame.{" "}
            <span className="text-foreground font-medium">Literalmente qualquer um. Eu dou conta! 😎</span>
          </p>
        </div>
      </section>

      {/* Seção 2: Plataforma Completa MedStation AI */}
      <section id="plataforma" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent"></div>
        <div className="container mx-auto relative">
          <div className="text-center mb-16 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-700">
            <Badge variant="secondary" className="backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Plataforma Completa de IA Médica
            </Badge>
            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                Produza mais.
              </span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Digite menos.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              IA médica com assistentes especializados para interpretar exames, estruturar anamneses, calcular scores de risco e automatizar documentações médicas.
            </p>
          </div>

          {/* Assistentes */}
          <div id="agentes" className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-primary/10 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Especialistas IA</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
              6 assistentes especializados
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada assistente domina sua especialidade. Juntos, formam o ecossistema completo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: TestTube2, name: "Examinus", desc: "Interpreta exames de sangue, imagem e laudos", badge: "Grátis" },
              { icon: Activity, name: "Clínicus", desc: "Estrutura anamneses e histórias clínicas", badge: null },
              { icon: Calculator, name: "Scorius", desc: "Calcula scores e classificações de risco", badge: null },
              { icon: Pill, name: "Prescriptus", desc: "Guia prescrições baseadas em evidências", badge: null },
              { icon: Brain, name: "Numerus", desc: "Calculadoras médicas e conversores", badge: null },
              { icon: FileCode, name: "CODexus", desc: "Codificação CID-10 e TISS automatizada", badge: null }
            ].map((agent, idx) => (
              <Card key={idx} className="group p-6 transition-all hover:shadow-medical hover:-translate-y-1 hover:border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <div className="relative space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-gradient-primary flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <agent.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    {agent.badge && (
                      <Badge variant="secondary" className="text-[0.65rem]">{agent.badge}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{agent.desc}</p>
                </div>
              </Card>
            ))}
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
                  {["Interpretação de exames", "Análise estruturada", "Sem cadastro inicial"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      {item}
                    </li>
                  ))}
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
                  <p className="text-sm text-muted-foreground">Ecossistema completo</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 9,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-2.5 text-sm">
                  {["Todos os 6 assistentes", "Gestão de pacientes", "Documentação profissional", "PDFs e exportação"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      {item}
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
            Examinus grátis para sempre • Pro R$ 9,90/mês
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