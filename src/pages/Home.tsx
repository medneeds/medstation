import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Stethoscope, Brain, Zap, Shield, BarChart3, Users, CheckCircle, FileText, Mic, Upload, ClipboardList, Pill, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";

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
      color: "from-primary to-secondary",
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

  const features = [
    { 
      icon: Upload, 
      title: "Extração Automática de Documentos", 
      text: "Arraste documentos médicos e a IA extrai automaticamente diagnósticos, sintomas e informações clínicas"
    },
    { 
      icon: Mic, 
      title: "Transcrição de Áudio Inteligente", 
      text: "Grave sua consulta falando e transforme em casos clínicos, prescrições e notas estruturadas"
    },
    { 
      icon: Users, 
      title: "Gestão Completa de Pacientes", 
      text: "Prontuário digital com histórico completo, casos clínicos, prescrições e exames em um só lugar"
    },
    { 
      icon: Brain, 
      title: "6 Agentes de IA Especializados", 
      text: "Diagnóstico diferencial, interpretação de exames, scores, prescrições, estatísticas e codificação CID-10"
    },
    { 
      icon: FileText, 
      title: "Documentação Profissional", 
      text: "Gere prescrições, atestados e laudos em PDF prontos para impressão ou envio"
    },
    { 
      icon: Zap, 
      title: "Busca Instantânea", 
      text: "Encontre qualquer paciente, caso ou documento em segundos com busca inteligente"
    },
  ];

  const benefits = [
    { icon: Zap, title: "Economize 60% do tempo", text: "Menos digitação, mais atendimento ao paciente" },
    { icon: Shield, title: "100% Seguro e Privado", text: "Dados criptografados e conformidade com LGPD" },
    { icon: Sparkles, title: "Decisões Mais Precisas", text: "IA baseada em evidências científicas atualizadas" },
    { icon: CheckCircle, title: "Comece em 2 minutos", text: "Não precisa configurar nada, já está pronto para usar" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/60 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">MedStation AI</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button onClick={() => navigate("/pricing")}>
              Começar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">
              Examinus grátis para sempre
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              Atenda mais.<br />Documente menos.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              IA médica que economiza horas do seu dia com automação inteligente
            </p>
          </div>

          {/* Demo */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Teste agora</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Interprete exames com IA
              </h2>
              <p className="text-sm text-muted-foreground">
                Cole resultados e receba análise detalhada
              </p>
            </div>
            
            <PublicExaminusChat />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" onClick={() => navigate("/pricing")}>
              Criar Conta Gratuita <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Já tenho conta
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Sem cartão · 2 minutos · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Agents */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Agentes especializados</h2>
          <p className="text-muted-foreground">
            IA focada em cada área da medicina
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {agents.map((agent, index) => (
            <Card key={index} className="p-5 hover:shadow-md transition-all relative group">
              <Badge 
                variant={agent.isPremium ? "secondary" : "default"} 
                className="absolute top-4 right-4 text-xs"
              >
                {agent.isPremium ? "Pro" : "Grátis"}
              </Badge>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center mb-3`}>
                <agent.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">{agent.name}</h3>
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Funcionalidades</h2>
          <p className="text-muted-foreground">
            Tudo que você precisa em um só lugar
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-bold mb-1">{benefit.title}</h3>
              <p className="text-xs text-muted-foreground">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="p-10 text-center max-w-3xl mx-auto border-primary/20">
          <h2 className="text-3xl font-bold mb-3">Comece agora</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Examinus grátis para sempre. Sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/pricing")}>
              Criar Conta Gratuita <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 MedStation AI</p>
        </div>
      </footer>
    </div>
  );
}
