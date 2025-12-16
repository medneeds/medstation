import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Activity, Brain, Calculator, Pill, FileCode, TestTube2, Wind, FileCheck, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const navigate = useNavigate();
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medical transition-transform group-hover:scale-105">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm md:text-base font-bold text-foreground tracking-tight">MedStation AI</div>
              <div className="hidden md:block text-[0.65rem] text-muted-foreground font-medium">Produza mais. Digite menos.</div>
            </div>
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
      <section id="demo" className="py-6 md:py-8 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-30"></div>
        <div className="container mx-auto max-w-4xl relative">
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 text-center">

            {/* Demo Card Centralizado */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-primary rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative">
                <PublicExaminusChat />
              </div>
            </div>

            {/* CTA Footer */}
            <div className="flex flex-col items-center gap-2 md:gap-3 pt-3 md:pt-4">
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Teste grátis • Sem cadastro
              </p>
              <Button 
                variant="ghost"
                size="sm"
                className="text-xs md:text-sm text-muted-foreground hover:text-foreground h-8 md:h-9"
                onClick={() => scrollToSection('plataforma')}
              >
                Ver plataforma completa
                <ArrowRight className="ml-1 md:ml-2 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Plataforma Completa MedStation AI */}
      <section id="plataforma" className="py-12 md:py-24 lg:py-32 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="container mx-auto relative">
          <div className="text-center mb-12 md:mb-16 lg:mb-20 space-y-4 md:space-y-6 max-w-3xl mx-auto animate-in fade-in duration-700">
            <Badge variant="secondary" className="backdrop-blur-sm px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm">
              <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 mr-1.5 md:mr-2 animate-pulse" />
              MedStation AI - Plataforma Completa
            </Badge>
            <h2 className="text-2xl md:text-4xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent px-4">
              Inteligência artificial com assistentes médicos especializados
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed px-4">
              Organize exames, estruture anamneses, calcule scores, automatize documentações médicas e muito mais.
            </p>
            
            {/* CTA Button */}
            <div className="mt-6 md:mt-8 lg:mt-12">
              <Button 
                size="lg"
                className="group relative overflow-hidden bg-gradient-primary text-primary-foreground shadow-medical hover:shadow-elevated transition-all duration-300 hover:scale-105 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold"
                onClick={() => scrollToSection('agentes')}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Conhecer agora
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </div>
          </div>

          {/* Assistentes */}
          <div id="agentes" className="text-center mb-8 md:mb-12 lg:mb-16 space-y-3 md:space-y-4 px-4">
            <div className="inline-flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2 bg-gradient-primary rounded-full mb-4 md:mb-6 shadow-medical">
              <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-primary-foreground animate-pulse"></div>
              <span className="text-xs md:text-sm font-semibold text-primary-foreground tracking-wide">9 ESPECIALISTAS IA</span>
            </div>
            <h3 className="text-xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Cada assistente domina sua especialidade
            </h3>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Juntos, formam o ecossistema médico mais completo do mercado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
            {[
              { icon: TestTube2, name: "Examinus", desc: "Interpreta exames de sangue, imagem e laudos", badge: "Grátis", color: "from-violet-500/20 to-purple-500/20" },
              { icon: Activity, name: "Clínicus", desc: "Estrutura anamneses e histórias clínicas", badge: null, color: "from-blue-500/20 to-cyan-500/20" },
              { icon: Calculator, name: "Scorius", desc: "Calcula scores e classificações de risco", badge: null, color: "from-emerald-500/20 to-green-500/20" },
              { icon: Pill, name: "Prescriptus", desc: "Guia prescrições baseadas em evidências", badge: null, color: "from-rose-500/20 to-pink-500/20" },
              { icon: Brain, name: "Numerus", desc: "Calculadoras médicas e conversores", badge: null, color: "from-amber-500/20 to-orange-500/20" },
              { icon: FileCode, name: "CODexus", desc: "Codificação CID-10 e TISS automatizada", badge: null, color: "from-indigo-500/20 to-blue-500/20" },
              { icon: Wind, name: "Gasometrus", desc: "Análise avançada de gasometria arterial", badge: null, color: "from-cyan-500/20 to-teal-500/20" },
              { icon: FileCheck, name: "Atestus", desc: "Geração inteligente de atestados médicos", badge: null, color: "from-emerald-500/20 to-teal-500/20" },
              { icon: BookOpen, name: "Protocolus", desc: "Protocolos clínicos e guidelines atualizados", badge: null, color: "from-amber-500/20 to-yellow-500/20" }
            ].map((agent, idx) => (
              <Card 
                key={idx} 
                className="group p-5 md:p-6 lg:p-8 transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 hover:border-primary/50 relative overflow-hidden bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Animated Border Glow */}
                <div className="absolute -inset-0.5 bg-gradient-primary rounded-lg opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative space-y-4 md:space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      {/* Icon Container */}
                      <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-muted to-muted/50 group-hover:from-primary group-hover:to-primary/80 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg group-hover:shadow-2xl">
                        <agent.icon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                      </div>
                    </div>
                    {agent.badge && (
                      <Badge className="bg-gradient-primary text-primary-foreground border-0 shadow-medical px-2 md:px-3 py-0.5 md:py-1 text-xs font-bold">
                        {agent.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 md:space-y-2">
                    <h3 className="font-bold text-lg md:text-xl lg:text-2xl tracking-tight group-hover:text-primary transition-colors duration-300">
                      {agent.name}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
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
                  { gradient: "from-indigo-500 to-blue-500", name: "CODexus", icon: FileCode },
                  { gradient: "from-cyan-500 to-teal-500", name: "Gasometrus", icon: Wind },
                  { gradient: "from-emerald-500 to-teal-500", name: "Atestus", icon: FileCheck },
                  { gradient: "from-amber-500 to-yellow-500", name: "Protocolus", icon: BookOpen }
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
                  { gradient: "from-indigo-500 to-blue-500", name: "CODexus", icon: FileCode },
                  { gradient: "from-cyan-500 to-teal-500", name: "Gasometrus", icon: Wind },
                  { gradient: "from-emerald-500 to-teal-500", name: "Atestus", icon: FileCheck },
                  { gradient: "from-amber-500 to-yellow-500", name: "Protocolus", icon: BookOpen }
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
              <span className="relative inline-block">
                <span className="opacity-0 select-none">Ecossistema completo • R$ 59,90 R$ 19,90/mês</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="relative group cursor-pointer">
                    <span className="absolute inset-0 bg-primary/30 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    <span className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 px-4 py-1.5 rounded-lg border border-primary-foreground/20 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.6)] rotate-[-1deg] group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 inline-block">
                      <span className="text-sm font-black text-primary-foreground tracking-wide drop-shadow">Em breve!</span>
                    </span>
                  </span>
                </span>
              </span>
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
      <section id="planos" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto text-center max-w-5xl">
          <div className="mb-8 md:mb-10 lg:mb-12 space-y-3 md:space-y-4 px-4">
            <Badge variant="secondary" className="backdrop-blur-sm text-xs md:text-sm">
              Preço transparente
            </Badge>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Comece grátis, evolua quando quiser
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Examinus sempre grátis. Premium desbloqueia todo o ecossistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {/* Plano Grátis */}
            <Card className="p-5 md:p-6 lg:p-8 text-left border-2 border-border/50 h-full flex flex-col">
              <div className="space-y-4 md:space-y-5 flex-1 flex flex-col">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">Grátis</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Examinus ilimitado</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl lg:text-5xl font-bold">R$ 0</span>
                  <span className="text-base md:text-lg lg:text-xl text-muted-foreground">/sempre</span>
                </div>
                <ul className="space-y-2.5 text-sm flex-1">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span><strong className="text-foreground">Organização e estruturação inteligente</strong> de qualquer resultado de exame laboratorial (hemograma, bioquímica, gasometria) e de imagem (tomografia, raio-X, ultrassom)</span>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                    <span>Uso ilimitado dentro da plataforma (cadastro gratuito)</span>
                  </li>
                </ul>
                
                <div className="space-y-3 mt-auto">
                  <Button 
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => scrollToSection('demo')}
                  >
                    Testar agora
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Sem cartão • Sem compromisso
                  </p>
                </div>
              </div>
            </Card>

            {/* Plano Pro */}
            <Card className="p-5 md:p-6 lg:p-8 text-left border-2 border-primary relative overflow-hidden shadow-[0_20px_70px_-15px_rgba(168,85,247,0.4)] animate-in fade-in duration-700 hover:shadow-[0_25px_80px_-15px_rgba(168,85,247,0.5)] transition-all">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 animate-pulse"></div>
              
              {/* Popular badge with glow */}
              <div className="absolute -top-1 -right-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-lg opacity-70 animate-pulse"></div>
                  <Badge className="relative bg-gradient-primary text-primary-foreground border-0 px-4 py-1.5 text-xs font-bold shadow-lg">
                    🔥 POPULAR
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 md:space-y-5 relative">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Pro</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Ecossistema completo • 7 assistentes IA</p>
                </div>
                
                {/* Pricing with "Em breve" overlay */}
                <div className="relative my-4 md:my-6 min-h-[180px] md:min-h-[200px]">
                  {/* Preço original (coberto pela tarja) */}
                  <div className="relative z-10">
                    {/* Discount badge */}
                    <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full mb-3">
                      <span className="text-[10px] md:text-xs font-bold text-green-600 dark:text-green-400">67% DE DESCONTO</span>
                    </div>
                    
                    <div className="flex items-end gap-2 md:gap-3">
                      <div className="flex flex-col">
                        {/* Old price crossed out */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm md:text-base lg:text-lg text-muted-foreground line-through decoration-2">De R$ 59,90</span>
                        </div>
                        {/* New price highlighted */}
                        <div className="flex items-baseline gap-1 md:gap-2">
                          <span className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">R$ 19,90</span>
                          <span className="text-base md:text-lg lg:text-xl text-muted-foreground font-medium">/mês</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Annual option */}
                    <div className="flex items-center gap-2 p-2 md:p-3 bg-muted/50 rounded-lg border border-border/50 mt-3">
                      <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        Ou <span className="font-bold text-foreground">R$ 199,90/ano</span> • Economize R$ 38,90
                      </span>
                    </div>
                  </div>

                  {/* Tarja "Em breve" sobreposta - ENHANCED */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-background/99 via-background/98 to-background/97 backdrop-blur-3xl rounded-2xl border-2 border-primary/30">
                    <div className="relative group cursor-pointer">
                      {/* Glow on hover only */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                      
                      {/* Decorative sparkles - subtle */}
                      <div className="absolute -top-4 -left-4 w-1.5 h-1.5 bg-primary/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity"></div>
                      <div className="absolute -bottom-4 -right-4 w-1.5 h-1.5 bg-purple-500/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" style={{ animationDelay: '0.3s' }}></div>
                      
                      {/* Main badge with enhanced styling */}
                      <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 px-8 py-4 md:px-14 md:py-7 rounded-2xl border-2 border-primary-foreground/30 shadow-[0_0_60px_-10px_rgba(168,85,247,0.7)] rotate-[-3deg] group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-out">
                        {/* Inner glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-2xl"></div>
                        
                        {/* Text with enhanced effects */}
                        <div className="relative flex flex-col items-center gap-1">
                          <span className="text-3xl md:text-5xl lg:text-6xl font-black text-primary-foreground tracking-wider drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                            EM BREVE!
                          </span>
                          <div className="flex items-center gap-1.5 text-primary-foreground/90 text-xs md:text-sm font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80"></div>
                            <span>Aguarde o lançamento</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                  {[
                    { name: "Examinus", desc: "Interpretação de exames" },
                    { name: "Clínicus", desc: "Anamneses estruturadas" },
                    { name: "Scorius", desc: "Cálculo de scores clínicos" },
                    { name: "Prescriptus", desc: "Prescrições baseadas em evidências" },
                    { name: "Numerus", desc: "Calculadoras médicas" },
                    { name: "CODexus", desc: "Codificação CID-10 e TISS" },
                    { name: "Gasometrus", desc: "Análise de gasometria arterial" }
                  ].map((agent, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2"></div>
                      <span><strong className="text-foreground">{agent.name}:</strong> {agent.desc}</span>
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
                      <h4 className="font-bold text-xs md:text-sm text-foreground mb-0.5 md:mb-1">Garantia incondicional de 7 dias</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                        Teste sem riscos. Se não ficar satisfeito, devolvemos 100% do seu dinheiro.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-11 md:h-12 shadow-medical hover:shadow-elevated transition-all hover:scale-105 text-sm md:text-base"
                  onClick={() => setShowComingSoonDialog(true)}
                >
                  Começar agora
                  <ArrowRight className="ml-2 h-3.5 md:h-4 w-3.5 md:w-4" />
                </Button>
                
                <p className="text-[10px] md:text-xs text-center text-muted-foreground">
                  Cancele quando quiser • Sem taxa
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="cadastro" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
        <div className="container mx-auto max-w-2xl text-center relative space-y-6 md:space-y-8">
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Comece em 30 segundos
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
              Sem cartão. Sem burocracia. Apenas IA médica que funciona.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg"
              className="shadow-medical hover:shadow-elevated transition-all hover:scale-105 h-11 md:h-12 text-sm md:text-base"
              onClick={() => setShowComingSoonDialog(true)}
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
            <span>Examinus grátis • Pro</span>
            <span className="relative inline-block">
              <span className="opacity-0 select-none">R$ 59,90 R$ 19,90/mês</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="relative group cursor-pointer">
                  <span className="absolute inset-0 bg-primary/30 blur-lg rounded opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <span className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 px-3 py-1 rounded-md border border-primary-foreground/20 shadow-[0_8px_30px_-8px_rgba(168,85,247,0.6)] rotate-[-1deg] group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 inline-block">
                    <span className="text-[10px] md:text-xs font-black text-primary-foreground tracking-wide drop-shadow">Em breve!</span>
                  </span>
                </span>
              </span>
            </span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 md:py-8 px-4 md:px-6">
        <div className="container mx-auto flex flex-col md:flex-row flex-wrap justify-between gap-3 md:gap-4 items-center text-[10px] md:text-xs text-muted-foreground">
          <p>© 2025 MedStation AI</p>
          <p className="flex items-center gap-3 md:gap-4">
            <span>LGPD</span>
            <span>•</span>
            <span>Tecnologia médica</span>
          </p>
        </div>
      </footer>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Assinatura em Breve! 🚀
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-4">
              <p className="text-foreground/90">
                A assinatura da plataforma MedStation AI estará disponível em breve!
              </p>
              <p className="text-foreground/90">
                Seja um dos primeiros a ter acesso exclusivo falando diretamente com{" "}
                <span className="font-semibold text-primary">Artur Batista</span>, 
                médico desenvolvedor da plataforma.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open("https://w.app/medstationai", "_blank")}
              className="w-full h-12 text-base font-semibold"
            >
              💬 Falar com Artur no WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowComingSoonDialog(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
