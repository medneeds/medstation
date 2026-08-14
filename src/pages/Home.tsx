import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Activity, Brain, Calculator, Pill, FileCode, TestTube2, Wind, FileCheck, BookOpen, Compass, Stethoscope, Sigma, MessagesSquare, ShieldAlert, Quote, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InlineCheckout } from "@/components/QuickCheckout";
import { Logo } from "@/components/Logo";
import { AssistantShowcaseDialog } from "@/components/AssistantShowcaseDialog";
import { AssistantPracticeShowcase } from "@/components/AssistantPracticeShowcase";
import { ClinicalFlowDemo } from "@/components/ClinicalFlowDemo";
import { assistantSlides } from "@/lib/assistantSlides";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TimeSavingsComparison } from "@/components/TimeSavingsComparison";
import { FAQMiniDemo } from "@/components/FAQMiniDemo";
import { HeroVideo } from "@/components/HeroVideo";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { trackCtaClick } from "@/lib/analytics";
import { SignupBenefitPrompt } from "@/components/demo/SignupBenefitPrompt";
import { Seo } from "@/components/Seo";
import { ConciergeFab } from "@/components/ConciergeFab";
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
    a: "Não. A MedStation roda direto no navegador, no computador, tablet ou celular. Basta entrar com seu e-mail e começar a usar.",
  },
  {
    q: "Como funciona o Modo Escuta?",
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
    a: "O Pro 1 dá acesso ao ecossistema dos 11 assistentes para o trabalho clínico do dia a dia. O Pro 2 inclui o Modo Escuta com transcrição da consulta. Você ainda pode combinar com o Studius para estudo médico contínuo.",
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

  const openLiveDemo = () => {
    trackCtaClick({ cta: 'badge_teste_agora', section: 'demo', destination: '#demo-live' });
    const card = document.getElementById('demo-live');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      const field = card?.querySelector<HTMLTextAreaElement | HTMLInputElement>('textarea, input[type="text"]');
      field?.focus({ preventScroll: true });
    }, 650);
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
        path="/"
        title="MedStation — 11 assistentes de IA para médicos"
        description="Anamnese, exames, prescrição e documentação clínica em segundos. Teste o Examinus grátis, sem cadastro."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MedStation",
            url: "https://medstation-ai.com.br/",
            description: "Plataforma de assistentes de inteligência artificial para médicos.",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MedStation",
            url: "https://medstation-ai.com.br/",
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "MedStation",
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
          <nav className="flex gap-1 md:gap-6 items-center">
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection('demo')}
            >
              Testar grátis
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection('plataforma')}
            >
              Assistentes
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection('planos')}
            >
              Planos
            </Button>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
              onClick={() => { trackCtaClick({ cta: 'header_login', section: 'header', destination: '/auth' }); navigate('/auth'); }}
            >
              Entrar
            </Button>
            <Button 
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
              onClick={() => { trackCtaClick({ cta: 'header_comecar', section: 'header', destination: '#cadastro' }); scrollToSection('cadastro'); }}
            >
              <span className="sm:hidden">Criar conta</span>
              <span className="hidden sm:inline">Criar conta grátis</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero — promessa em uma frase + 3 caminhos, todos na mesma página */}
      <section id="inicio" className="pt-10 md:pt-16 px-4 md:px-6 relative">
        <div className="container mx-auto max-w-4xl text-center space-y-5 md:space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
            <Badge variant="secondary" className="text-xs md:text-sm whitespace-nowrap">
              Assistentes de IA para médicos
            </Badge>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.05] text-foreground animate-fade-in" style={{ animationDelay: '80ms' }}>
            Recupere até 40 horas por mês.
          </h1>
          <p className="font-display text-xl sm:text-2xl md:text-3xl tracking-tight leading-snug text-primary max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '160ms' }}>
            Ferramentas que aliviam na burocracia, potencializam sua prática médica e devolvem seu tempo com o paciente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5 pt-1 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '240ms' }}>
            {[
              'Exame resumido',
              'Anamnese estruturada',
              'Prescrição direcionada',
              'Parecer clínico organizado',
              'Orientações de alta que o paciente entende',
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-xs md:text-sm font-medium text-foreground/80 whitespace-nowrap transition-colors hover:border-primary/40 hover:bg-primary/[0.08]"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '320ms' }}>
            Tudo pronto em segundos — o trabalho repetitivo sai do seu ombro e você volta ao que escolheu fazer: pensar no caso, olhar o paciente, ser médico de verdade.
          </p>


          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-2 text-left">
            {[
              {
                id: 'demo',
                titulo: '1 · Testar agora',
                sub: 'Sem cadastro, aqui embaixo',
                cta: 'Explorar agora',
                target: 'demo',
                primary: false,
              },
              {
                id: 'cadastro',
                titulo: '2 · Criar conta grátis',
                sub: 'R$ 0, sem cartão',
                cta: 'Criar conta grátis',
                target: 'cadastro',
                primary: true,
              },
              {
                id: 'como',
                titulo: '3 · Entender como funciona',
                sub: '3 passos, 1 minuto de leitura',
                cta: 'Ver como funciona',
                target: 'como-funciona',
                primary: false,
              },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { trackCtaClick({ cta: `hero_${c.id}`, section: 'hero', destination: `#${c.target}` }); scrollToSection(c.target); }}
                className={`group rounded-2xl p-4 md:p-5 border transition-all duration-300 hover:-translate-y-1 ${
                  c.primary
                    ? 'bg-primary text-primary-foreground border-primary shadow-medical'
                    : 'bg-card/60 backdrop-blur-sm border-border/60 hover:border-primary/40'
                }`}
              >
                <span className={`block text-[0.6rem] uppercase tracking-[0.2em] font-mono ${c.primary ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {c.sub}
                </span>
                <span className="block font-display text-lg md:text-xl tracking-tight mt-1.5">{c.titulo}</span>
                <span className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${c.primary ? '' : 'text-primary'}`}>
                  {c.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Você não sai desta página. Cada botão leva você para a seção logo abaixo.
          </p>
        </div>
      </section>

      {/* Seção 1: Examinus por MedStation */}
      <section id="demo" className="pt-8 md:pt-12 pb-6 md:pb-8 px-4 md:px-6 relative overflow-hidden scroll-mt-20">

          <div className="container mx-auto max-w-7xl relative">
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 text-center">

              {/* Cabeçalho da demo — deixa claro: dá pra testar AGORA */}
              <div className="space-y-3 md:space-y-4">
                <button
                  type="button"
                  onClick={openLiveDemo}
                  aria-label="Abrir a demonstração ao vivo do Examinus nesta página"
                  className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Badge
                    variant="secondary"
                    className="text-xs md:text-sm whitespace-nowrap cursor-pointer transition-transform hover:scale-[1.03]"
                  >
                    Teste agora · sem cadastro
                  </Badge>
                </button>
                <h2 className="font-display text-2xl md:text-4xl tracking-tight text-foreground">
                  É pra usar <span className="italic text-primary">agora</span>. Apareceu a dúvida, cola aqui.
                </h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                  Sem login, sem cartão, sem install. Cole o exame embaixo e veja o resumo sair pronto
                  em segundos. É o Examinus — e ele é grátis para sempre.
                </p>
                <button
                  type="button"
                  onClick={() => { trackCtaClick({ cta: 'demo_ver_na_pratica', section: 'demo', destination: '#como-funciona' }); scrollToSection('como-funciona'); }}
                  className="text-xs md:text-sm text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Ou veja "Ver na prática" — o que cada assistente faz ↓
                </button>
              </div>


              {/* Demo Card — pulso sutil para chamar interação */}
              <div id="demo-live" className="relative group scroll-mt-24">
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

      {/* Como funciona — didático, à prova de dúvida */}
      <section id="como-funciona" className="py-12 md:py-16 px-4 md:px-6 relative scroll-mt-20">
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-8 md:mb-12 space-y-3">
            <Badge variant="secondary" className="text-xs md:text-sm">Como funciona</Badge>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
              Três passos. <span className="italic text-primary">Só isso.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Nada para instalar, nada para configurar. Funciona no computador e no celular.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                n: "01",
                t: "Você joga a informação",
                d: "Cole o exame, escreva o caso ou grave a consulta pelo microfone. Do jeito que for mais rápido para você.",
              },
              {
                n: "02",
                t: "O assistente organiza",
                d: "Em segundos, o texto volta estruturado no padrão clínico: resumo do exame, anamnese, prescrição, atestado ou parecer.",
              },
              {
                n: "03",
                t: "Você revisa e copia",
                d: "Leia, ajuste se quiser e clique em copiar. Cola no seu prontuário e o atendimento acabou.",
              },
            ].map((s) => (
              <Card key={s.n} className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm">
                <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary">Passo {s.n}</span>
                <h3 className="font-display text-lg md:text-xl tracking-tight mt-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
              </Card>
            ))}
          </div>

          {/* Fluxo completo do atendimento, em segundos */}
          <div className="mt-12 md:mt-16">
            <div className="text-center mb-6 space-y-2">
              <Badge variant="secondary" className="text-xs md:text-sm whitespace-nowrap">Fluxo completo</Badge>
              <h3 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
                Um caso real, <span className="italic text-primary">do exame à alta</span>
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Rode a demonstração e acompanhe o mesmo paciente passando por exame resumido, anamnese, prescrição, parecer e orientações de alta — tudo em segundos.
              </p>
            </div>
            <ClinicalFlowDemo
              onPrimary={() => { trackCtaClick({ cta: 'fluxo_testar', section: 'como_funciona', destination: '#demo' }); scrollToSection('demo'); }}
            />
          </div>

          {/* Veja o que cada assistente faz com a sua informação */}

          <div className="mt-12 md:mt-16">
            <div className="text-center mb-6 space-y-2">
              <Badge variant="secondary" className="text-xs md:text-sm">Ver na prática</Badge>
              <h3 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
                O que cada assistente faz <span className="italic text-primary">com a sua informação</span>
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Escolha um assistente abaixo e veja, passo a passo, o que entra, como ele organiza e o que sai pronto para o prontuário.
              </p>
            </div>
            <AssistantPracticeShowcase
              onPrimary={() => { trackCtaClick({ cta: 'pratica_testar', section: 'como_funciona', destination: '#demo' }); scrollToSection('demo'); }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button size="lg" onClick={() => { trackCtaClick({ cta: 'como_criar_conta', section: 'como_funciona', plan: 'free', destination: '#cadastro' }); scrollToSection('cadastro'); }}>
              Criar conta grátis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { trackCtaClick({ cta: 'como_testar', section: 'como_funciona', destination: '#demo' }); scrollToSection('demo'); }}>
              Testar sem cadastro
            </Button>
          </div>
        </div>
      </section>

      {/* Para quem é a MedStation — dois perfis, um único objetivo */}
      <section id="para-quem" className="py-12 md:py-16 px-4 md:px-6 relative scroll-mt-20">
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-8 md:mb-12 space-y-3">
            <Badge variant="secondary" className="text-xs md:text-sm">Para quem é</Badge>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
              Feita para a sua rotina. <span className="italic text-primary">Seja qual for.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Do plantão de madrugada à consulta marcada: a MedStation se encaixa no seu dia, não o contrário.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Plantonista */}
            <Card className="p-5 md:p-7 border border-hairline bg-card/60 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
              <div className="relative space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] font-mono text-primary">Emergência · UTI · Plantão</span>
                </div>
                <h3 className="font-display text-2xl tracking-tight">Para o plantonista</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cinco exames abertos, gasometria às 3 da manhã, paciente complicando e prontuário
                  para fechar. Os 11 assistentes fazem o trabalho braçal: resumem exames, leem
                  gasometria, calculam scores, montam a prescrição e organizam o parecer — em
                  segundos, à beira do leito.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Examinus</strong> resume todos os exames de uma vez</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Gasometrus</strong> lê o ácido-base passo a passo</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Scorius</strong> estratifica risco na hora da decisão</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Prescriptus</strong> sugere a prescrição certa para o caso</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Mediscuss</strong> organiza o parecer e a discussão clínica</span></li>
                </ul>
              </div>
            </Card>

            {/* Especialista no consultório */}
            <Card className="p-5 md:p-7 border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-card/80 to-card/60 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
              <div className="relative space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/40 rounded-full">
                  <Stethoscope className="w-3 h-3 text-primary" />
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] font-mono text-primary">Ambulatório · Consultório</span>
                </div>
                <h3 className="font-display text-2xl tracking-tight">Para o especialista no consultório</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cada paciente tem 20 minutos. Você atende, conversa, examina — e a consulta se
                  escreve sozinha. O Modo Escuta transcreve o atendimento ao vivo e devolve a
                  anamnese estruturada no momento em que o paciente sai, no modelo que você já usa.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Clínicus</strong> estrutura a anamnese no seu padrão</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Orientus</strong> escreve a alta em linguagem do paciente</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Atestus</strong> gera o atestado em um clique</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span><strong>Protocolus</strong> traz a diretriz na hora da conduta</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Tudo isso enquanto você olha para o paciente</span></li>
                </ul>
              </div>
            </Card>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button size="lg" onClick={() => { trackCtaClick({ cta: 'para_quem_criar', section: 'para_quem', destination: '#cadastro' }); scrollToSection('cadastro'); }}>
              Criar conta grátis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { trackCtaClick({ cta: 'para_quem_testar', section: 'para_quem', destination: '#demo' }); scrollToSection('demo'); }}>
              Testar sem cadastro
            </Button>
          </div>
        </div>
      </section>

      {/* Seção: Saia das IAs genéricas */}
      <section id="proposito" className="py-12 md:py-16 lg:py-20 px-4 md:px-6 relative scroll-mt-20">
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-8 md:mb-12 space-y-3">
            <Badge variant="secondary" className="text-xs md:text-sm">Por que não uma IA genérica</Badge>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground max-w-2xl mx-auto">
              Saia das IAs genéricas. <span className="italic text-primary">Use uma feita 100% para a prática clínica.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Um chatbot qualquer escreve. A MedStation pensa dentro do raciocínio médico — e devolve pronto para usar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
            {/* IA genérica */}
            <Card className="p-5 md:p-7 border border-hairline bg-muted/30 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute -left-16 -top-16 w-40 h-40 rounded-full bg-muted-foreground/8 blur-3xl pointer-events-none" />
              <div className="relative space-y-4 opacity-90">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted-foreground/10 border border-muted-foreground/25 rounded-full">
                  <Brain className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] font-mono text-muted-foreground">IA genérica</span>
                </div>
                <h3 className="font-display text-xl md:text-2xl tracking-tight text-muted-foreground">O que você ganha de um chatbot qualquer</h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="mt-1">·</span> <span>Resposta solta, sem formato clínico — você reescreve tudo</span></li>
                  <li className="flex gap-2"><span className="mt-1">·</span> <span>Não conhece CID-10, nem protocolo, nem prescrição do caso</span></li>
                  <li className="flex gap-2"><span className="mt-1">·</span> <span>Alucina: responde o que não sabe e inventa dosagens que parecem certas — sem nenhuma garantia clínica</span></li>
                  <li className="flex gap-2"><span className="mt-1">·</span> <span>Gasometria virou parágrafo; exame virou texto corrido</span></li>
                  <li className="flex gap-2"><span className="mt-1">·</span> <span>Você vira revisor de IA. A burocracia continua sua.</span></li>
                </ul>
              </div>
            </Card>

            {/* MedStation */}
            <Card className="p-5 md:p-7 border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-card/80 to-card/60 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
              <div className="relative space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/40 rounded-full">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] font-mono text-primary">MedStation · 100% clínica</span>
                </div>
                <h3 className="font-display text-xl md:text-2xl tracking-tight text-foreground">O que você ganha de uma IA feita para a medicina</h3>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Saída estruturada: resumo, anamnese, prescrição e parecer no formato do prontuário</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Respostas construídas com foco em medicina baseada em evidências — Prescriptus, Gasometrus, Protocolus e demais assistentes citam a base que sustenta cada conduta</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>CID-10, scores, gasometria e protocolos embutidos no raciocínio</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Prescrição direcionada ao caso — posologia, via e alerta de interação</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Orientações de alta em linguagem que o paciente entende</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> <span>Você revisa e copia. A burocracia sai do seu ombro.</span></li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Limites clínicos e uso responsável */}
          <Card className="mt-4 md:mt-6 p-5 md:p-6 border border-amber-500/25 bg-amber-500/[0.04]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground">
                  Onde a IA para e o médico começa
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ser feita para a clínica não significa decidir pelo médico. A MedStation é ferramenta de apoio:
                  organiza, estrutura e fundamenta — a responsabilidade clínica e legal continua inteiramente sua.
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Não substitui a decisão médica, o exame do paciente nem a avaliação presencial</li>
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Toda prescrição, dose, via e conduta deve ser conferida e assinada pelo médico</li>
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Não é dispositivo de diagnóstico automático nem serviço de urgência</li>
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Evite dados identificáveis do paciente; siga LGPD e o sigilo profissional</li>
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Diretrizes mudam: confirme atualizações e o protocolo do seu serviço</li>
                  <li className="flex gap-2"><span className="text-amber-600 dark:text-amber-400 mt-0.5">·</span> Cada recomendação vem com indicador de confiança da evidência — leia antes de aplicar</li>
                </ul>
              </div>
            </div>
          </Card>


          <div className="text-center mt-7 md:mt-9 max-w-2xl mx-auto">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              A MedStation não é um chatbot com um prompt médico colado por cima. Cada um dos 11 assistentes foi
              desenhado do zero para uma tarefa clínica real — do exame de plantão à alta do ambulatório. Prescrições,
              pareceres e condutas são gerados com foco em medicina baseada em evidências, citando a fundamentação
              por trás de cada decisão. É o trabalho repetitivo saindo da sua manga para uma ferramenta que entende o
              que você está vendo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button size="lg" onClick={() => { trackCtaClick({ cta: 'proposito_criar', section: 'proposito', destination: '#cadastro' }); scrollToSection('cadastro'); }}>
                Criar conta grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { trackCtaClick({ cta: 'proposito_testar', section: 'proposito', destination: '#demo' }); scrollToSection('demo'); }}>
                Testar sem cadastro
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Medicina Baseada em Evidências */}
      <section id="evidencias" className="py-12 md:py-16 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4">
            <Badge variant="secondary" className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Medicina Baseada em Evidências
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight max-w-2xl mx-auto leading-[1.1] text-foreground">
              Cada resposta tem uma <span className="text-primary">fonte por trás.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Prescriptus, Gasometrus, Protocolus e os demais assistentes clínicos não inventam condutas.
              Cada recomendação é construída sobre diretrizes e fontes reconhecidas pela prática médica.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { name: "Diretrizes da SBC", desc: "Sociedade Brasileira de Cardiologia", scope: "Protocolus · Gasometrus" },
              { name: "Guidelines AHA/ACC", desc: "American Heart Association", scope: "Protocolus · Gasometrus" },
              { name: "Guidelines ESC", desc: "European Society of Cardiology", scope: "Protocolus · Gasometrus" },
              { name: "OMS / WHO", desc: "Organização Mundial da Saúde", scope: "Protocolus · Orientus" },
              { name: "UpToDate / BMJ", desc: "Bases de evidência clínica", scope: "Prescriptus · Clínicus" },
              { name: "Bulas ANVISA", desc: "Agência Nacional de Vigilância Sanitária", scope: "Prescriptus" },
              { name: "CID-10 / CID-11", desc: "Classificação Internacional de Doenças", scope: "Examinus · Clínicus" },
              { name: "Sociedades de Especialidade", desc: "SBP, SBI, SBR, SBPneumo e demais", scope: "Todos os assistentes" },
            ].map((src, i) => (
              <Card
                key={src.name}
                className="p-4 md:p-5 border border-hairline bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:bg-card transition-all duration-300"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded border border-hairline bg-primary/8 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-display text-xs md:text-sm tracking-tight text-foreground leading-tight">{src.name}</h4>
                </div>
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">{src.desc}</p>
                <span className="inline-block mt-2 text-[0.55rem] uppercase tracking-[0.15em] font-mono text-primary/70">
                  {src.scope}
                </span>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8 md:mt-10 max-w-2xl mx-auto">
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              As fontes guiam o raciocínio do assistente, mas a decisão final é sempre sua. A IA estrutura e sugere —
              você revisa, ajusta e valida antes de levar ao prontuário.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 2: MedStation - Plataforma Completa */}
      <section id="plataforma" className="py-12 md:py-16 lg:py-20 px-4 md:px-6 relative overflow-hidden scroll-mt-20">

        <div className="absolute inset-0 bg-muted/20 backdrop-blur-3xl"></div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-10 md:mb-14 lg:mb-16 space-y-4 md:space-y-5">
            <Badge variant="secondary" className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium backdrop-blur-sm">
              Ecossistema Completo
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight max-w-3xl mx-auto leading-[1.05] px-4 text-foreground">
              Onze assistentes. <span className="italic text-primary">Um único fluxo.</span>
            </h2>
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

      {/* Modo Escuta - novo produto */}
      <section id="consultorio" className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
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
                  Você atende.
                  <br />
                  <span className="italic text-primary">A MedStation escreve.</span>
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Modo Escuta, em tempo real: atenda como sempre. Nós transcrevemos a consulta ao vivo e devolvemos a anamnese estruturada no momento em que o paciente sai.
                </p>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Transcrição em tempo real, com revisão final do áudio</li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Sem invenções: registra apenas o que foi dito</li>
                  <li className="flex gap-2"><span className="text-primary mt-1">→</span> Anamnese estruturada automaticamente, pronta para revisar e registrar</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button size="lg" onClick={() => { trackCtaClick({ cta: 'consultorio_ver_planos', section: 'consultorio', destination: '#planos' }); scrollToSection('planos'); }}>
                    Ver planos do Modo Escuta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">A partir de R$ 29,90/mês</span>
                </div>
              </div>
              <div className="hidden md:block">
                <HeroVideo
                  slides={[{ id: "consultorio", label: "Modo Escuta", src: "/hero/hero.mp4", poster: "/hero/hero-poster.jpg" }]}
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

      {/* Depoimentos — prova social real de médicos */}
      <section id="depoimentos" className="py-12 md:py-16 px-4 md:px-6 relative scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-10 md:mb-12 space-y-3 md:space-y-4">
            <Badge variant="secondary" className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium backdrop-blur-sm">
              Depoimentos
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight max-w-3xl mx-auto leading-[1.05] px-4 text-foreground">
              Médicos que já recuperaram <span className="italic text-primary">seu tempo</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              O que mudou na rotina de quem usa a MedStation todos os dias
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Dr. Leandro Albuquerque */}
            <Card className="relative p-6 md:p-8 border-border/50 bg-card/70 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300 overflow-hidden">
              <Quote className="absolute -top-2 -right-2 w-12 h-12 md:w-16 md:h-16 text-primary/8 rotate-180 pointer-events-none" strokeWidth={1} />
              <div className="relative space-y-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" strokeWidth={0} />
                  ))}
                </div>
                <p className="text-sm md:text-base leading-relaxed text-foreground/90">
                  Utilizar a MedStation possibilitou otimizar meu processo de trabalho tanto do ponto de vista técnico como no auxílio na tomada de decisões nas condutas. Consigo executar minhas atividades de forma mais ágil e acurada, melhorando consequentemente a qualidade da assistência prestada ao paciente. Com a otimização do tempo é possível uma avaliação mais minuciosa e criteriosa, e isso interfere diretamente na melhora da qualidade da assistência.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display text-primary text-sm">
                    LA
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Dr. Leandro Albuquerque</p>
                    <p className="text-xs text-muted-foreground">Médico</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Dra. Luciara Duarte */}
            <Card className="relative p-6 md:p-8 border-border/50 bg-card/70 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300 overflow-hidden">
              <Quote className="absolute -top-2 -right-2 w-12 h-12 md:w-16 md:h-16 text-primary/8 rotate-180 pointer-events-none" strokeWidth={1} />
              <div className="relative space-y-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" strokeWidth={0} />
                  ))}
                </div>
                <p className="text-sm md:text-base leading-relaxed text-foreground/90">
                  A minha experiência com a plataforma foi a melhor possível, porque otimiza muito o meu tempo. Consigo fazer as minhas atividades com mais qualidade, além de ganhar tempo. Muito bom mesmo. Excelente!
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display text-primary text-sm">
                    LD
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Dra. Luciara Duarte</p>
                    <p className="text-xs text-muted-foreground">Médica</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
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
              Os 11 Assistentes e o Modo Escuta são <span className="text-foreground font-medium">produtos separados</span>. Assine só o que usa, ou junte os dois no MedStation Pro 2.
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

            {/* MedStation Pro — 11 Assistentes */}
            <Card className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">11 Assistentes</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1">MedStation Pro</h3>
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

            {/* MedStation Pro 2 — destaque */}
            <Card className="p-5 md:p-6 border-2 border-primary bg-card/85 backdrop-blur-sm flex flex-col relative overflow-hidden lg:scale-[1.03]">
              <div className="absolute top-0 right-0">
                <Badge className="bg-primary text-primary-foreground border-0 px-2.5 md:px-3 py-1 text-[0.55rem] md:text-[0.6rem] uppercase tracking-[0.16em] font-mono rounded-none rounded-bl-md">
                  Recomendado
                </Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary">Estação completa</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1 text-primary">MedStation Pro 2</h3>
                  <p className="text-xs text-muted-foreground mt-1">11 Assistentes + Modo Escuta no mesmo plano.</p>
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
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> <span className="text-foreground"><strong>Modo Escuta</strong> em tempo real</span></li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Anamnese estruturada automaticamente</li>
                  <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Suporte prioritário · Garantia 7 dias</li>
                </ul>
              </div>
              <Button className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_pro2', section: 'pricing', plan: billingPeriod === 'yearly' ? 'pro2_bundle_yearly' : 'pro2_bundle', billing_period: billingPeriod, price_brl: billingPeriod === 'yearly' ? 499.9 : 49.9, destination: '/pricing' }); navigate('/pricing'); }}>
                Assinar Pro 2
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            {/* Modo Escuta */}
            <Card className="p-5 md:p-6 border border-hairline bg-card/60 backdrop-blur-sm flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">Tempo real</span>
                  <h3 className="font-display text-2xl tracking-tight mt-1">Modo Escuta</h3>
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
              <Button variant="outline" className="w-full h-11 mt-5" onClick={() => { trackCtaClick({ cta: 'plano_consultorio', section: 'pricing', plan: billingPeriod === 'yearly' ? 'consultorio_yearly' : 'consultorio_monthly', billing_period: billingPeriod, destination: '#consultorio' }); scrollToSection('consultorio'); }}>
                Conhecer o Modo Escuta
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
          <p>© 2025 MedStation</p>
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

      <ConciergeFab />
    </div>
  );
}
