import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AssistentesAIChat } from "@/components/AssistentesAIChat";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { trackCtaClick } from "@/lib/analytics";
import {
  ArrowRight,
  PlayCircle,
  UserPlus,
  Compass,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Stethoscope,
  Calculator,
  Sigma,
  Pill,
  FileCode,
  Wind,
  FileCheck,
  BookOpen,
  Compass as CompassIcon,
  MessagesSquare,
  Mic,
} from "lucide-react";

const paths = [
  {
    id: "testar",
    icon: PlayCircle,
    eyebrow: "Sem cadastro · 1 minuto",
    title: "Testar agora, sem criar conta",
    body:
      "Cole um exame e veja o Examinus organizar tudo em segundos. É a demonstração pública — tem limite de uso e pequenas esperas entre mensagens.",
    bullets: ["Nenhum dado pessoal pedido", "Resultado real, na hora", "Ideal para quem quer prova antes de conversa"],
    cta: "Testar o Examinus agora",
    to: "/landing#demo",
  },
  {
    id: "dentro",
    icon: UserPlus,
    eyebrow: "Conta grátis · sem cartão",
    title: "Conhecer a MedStation por dentro",
    body:
      "Criando conta você entra na plataforma e usa o Examinus completo de graça: sem espera entre mensagens, sem pop-ups e com histórico salvo.",
    bullets: [
      "Examinus liberado, gratuito e sem cartão",
      "Você vê a plataforma real, não um vídeo",
      "Os outros assistentes ficam visíveis para quando quiser",
    ],
    cta: "Criar conta grátis",
    to: "/auth",
    highlight: true,
  },
  {
    id: "conhecer",
    icon: Compass,
    eyebrow: "Ainda não conheço",
    title: "Entender o que é a MedStation",
    body:
      "Comece pela apresentação completa: a dor da burocracia clínica, o que cada assistente resolve, o Modo Consultório, preços e garantia.",
    bullets: ["Vídeo curto de apresentação", "Os 11 assistentes explicados", "Planos, preços e garantia de 7 dias"],
    cta: "Ver a apresentação",
    to: "/landing",
  },
];

const assistants = [
  { name: "Examinus", icon: TestTube2, desc: "Resume exames", free: true },
  { name: "Clínicus", icon: Stethoscope, desc: "Anamnese pronta" },
  { name: "Scorius", icon: Calculator, desc: "Scores e risco" },
  { name: "Numerus", icon: Sigma, desc: "Cálculos clínicos" },
  { name: "Prescriptus", icon: Pill, desc: "Bula inteligente" },
  { name: "CODexus", icon: FileCode, desc: "CID-10 certo" },
  { name: "Gasometrus", icon: Wind, desc: "Gasometria lida" },
  { name: "Atestus", icon: FileCheck, desc: "Atestados prontos" },
  { name: "Protocolus", icon: BookOpen, desc: "Protocolos atuais" },
  { name: "Orientus", icon: CompassIcon, desc: "Orientação ao paciente" },
  { name: "Mediscuss", icon: MessagesSquare, desc: "Discussão de casos" },
  { name: "Modo Consultório", icon: Mic, desc: "Consulta transcrita" },
];

export default function Comecar() {
  const navigate = useNavigate();
  useReferralCapture();

  const go = (to: string, label: string) => {
    trackCtaClick({ cta: label, section: "entrada", destination: to });
    if (to.includes("#")) {
      const [path, hash] = to.split("#");
      navigate(path, { state: { scrollTo: hash } });
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 400);
      return;
    }
    navigate(to);
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/12 via-background to-primary/8 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(var(--primary-rgb),0.25),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(var(--primary-rgb),0.12),transparent)] pointer-events-none" />

      <div className="relative z-10">
        <header className="container mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden md:inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border-l border-border/60 pl-3">
              Produza mais. Digite menos.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => go("/auth", "entrar_header")}>
              Entrar
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 md:px-6 pt-6 pb-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Assistentes clínicos de IA para médicos</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
            Menos burocracia. Mais tempo com o paciente.
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            A MedStation AI escreve com você: exames resumidos, anamnese estruturada, protocolos e a consulta
            transcrita. Escolha por onde quer começar — cada caminho leva poucos minutos.
          </p>
        </section>

        {/* 3 caminhos */}
        <section className="container mx-auto px-4 md:px-6 pb-4">
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {paths.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  onClick={() => go(p.to, `entrada_${p.id}`)}
                  className={`group cursor-pointer relative flex flex-col rounded-2xl border p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? "border-primary/40 bg-card/80 shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.55)]"
                      : "border-border/60 bg-card/60 hover:border-primary/30"
                  } backdrop-blur-xl`}
                >
                  {p.highlight && (
                    <span className="absolute -top-2.5 left-5 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      Mais escolhido
                    </span>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">{p.eyebrow}</p>
                  <h2 className="text-lg md:text-xl font-semibold leading-snug">{p.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                  <ul className="mt-4 space-y-1.5 flex-1">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-5 w-full ${p.highlight ? "bg-gradient-primary hover:opacity-90" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      go(p.to, `entrada_${p.id}`);
                    }}
                  >
                    {p.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dados protegidos, conforme a LGPD
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Sem instalar nada, roda no navegador
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" /> 7 dias de garantia nos planos pagos
            </span>
          </div>
        </section>

        {/* Atalho direto para assinatura + chat de dúvidas */}
        <section className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 items-start">
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Já sei o que quero</p>
                  <h2 className="text-lg md:text-xl font-semibold">Tudo que a assinatura libera</h2>
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => go("/pricing", "entrada_assinar")}
                >
                  Ver planos e assinar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {assistants.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.name}
                      className="relative rounded-xl border border-border/50 bg-background/40 p-3 hover:border-primary/30 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-primary mb-1.5" />
                      <p className="text-[13px] font-medium leading-tight">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{a.desc}</p>
                      {a.free && (
                        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                          Grátis
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                O Examinus é gratuito para qualquer conta. A assinatura libera os demais assistentes e, no plano
                superior, o Modo Consultório.
              </p>
            </div>

            <AssistentesAIChat />
          </div>
        </section>

        <footer className="container mx-auto px-4 md:px-6 py-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MedStation AI</span>
          <button className="hover:text-foreground transition-colors" onClick={() => go("/landing", "entrada_footer")}>
            Ver apresentação completa
          </button>
        </footer>
      </div>
    </div>
  );
}
