import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Stethoscope, Brain, Zap, Shield, BarChart3, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const agents = [
    {
      name: "Clínicus",
      icon: Stethoscope,
      description: "Assistente para diagnóstico diferencial e análise de sintomas",
      color: "from-blue-500 to-blue-600",
      isPremium: true,
    },
    {
      name: "Examinus",
      icon: BarChart3,
      description: "Interpretação de exames laboratoriais e radiológicos",
      color: "from-purple-500 to-purple-600",
      isPremium: false,
    },
    {
      name: "Scorius",
      icon: Brain,
      description: "Cálculo de scores e classificações de risco",
      color: "from-green-500 to-green-600",
      isPremium: true,
    },
    {
      name: "Numerus",
      icon: BarChart3,
      description: "Análise estatística e predições epidemiológicas",
      color: "from-orange-500 to-orange-600",
      isPremium: true,
    },
    {
      name: "Prescriptus",
      icon: Stethoscope,
      description: "Sugestões de prescrições baseadas em evidências",
      color: "from-red-500 to-red-600",
      isPremium: true,
    },
    {
      name: "CODexus",
      icon: Shield,
      description: "Codificação CID-10 e TISS automatizada",
      color: "from-indigo-500 to-indigo-600",
      isPremium: true,
    },
  ];

  const benefits = [
    { icon: Zap, title: "Velocidade", text: "Respostas instantâneas dos agentes de IA" },
    { icon: Shield, title: "Segurança", text: "Dados criptografados e conformidade com LGPD" },
    { icon: Users, title: "Colaboração", text: "Gestão integrada de pacientes e casos" },
    { icon: Brain, title: "Inteligência", text: "6 agentes especializados para diferentes tarefas" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold">MedStation AI</span>
          </div>
          <div className="flex gap-2 md:gap-4">
            <Button variant="ghost" size="sm" className="md:h-10 md:px-4" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" className="md:h-10 md:px-4" onClick={() => navigate("/pricing")}>
              <span className="hidden sm:inline">Começar Agora</span>
              <span className="sm:hidden">Começar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <Badge className="mb-4 text-xs md:text-sm bg-primary/10 text-primary hover:bg-primary/20">
          Revolucione seu atendimento médico
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent leading-tight">
          A IA Médica que trabalha com você
        </h1>
        <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 md:mb-8 px-2">
          6 agentes especializados de inteligência artificial para auxiliar em cada etapa do atendimento clínico.
          Diagnósticos mais precisos, decisões mais rápidas.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
          <Button size="lg" onClick={() => navigate("/pricing")} className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-base md:text-lg">
            Começar Teste Grátis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-base md:text-lg">
            Fazer Login
          </Button>
        </div>
      </section>

      {/* Agents Grid */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl font-bold mb-4">Conheça nossos agentes</h2>
          <p className="text-muted-foreground text-lg">
            Cada agente é especializado em uma área específica da prática médica<br />
            <Badge className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">Examinus grátis para sempre</Badge>
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {agents.map((agent, index) => (
            <Card
              key={index}
              className="p-5 md:p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/50 relative"
            >
              {agent.isPremium ? (
                <Badge className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20 text-xs">
                  Pro
                </Badge>
              ) : (
                <Badge className="absolute top-3 right-3 bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  Grátis
                </Badge>
              )}
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-3 md:mb-4`}>
                <agent.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">{agent.name}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{agent.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl md:rounded-3xl p-6 md:p-12">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Por que escolher MedStation AI?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <benefit.icon className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <Card className="p-6 md:p-12 border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-background to-primary/5">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Pronto para começar?</h2>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
            Junte-se aos profissionais de saúde que já estão revolucionando seu atendimento com IA
          </p>
          <Button size="lg" onClick={() => navigate("/pricing")} className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-12 text-base md:text-lg">
            Ver Planos e Preços <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-8 mt-12 md:mt-20">
        <div className="container mx-auto px-4 text-center text-sm md:text-base text-muted-foreground">
          <p>&copy; 2025 MedStation AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
