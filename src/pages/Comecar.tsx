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
  TestTube2,
  Stethoscope,
  Calculator,
  Sigma,
  Pill,
  FileCode,
  Wind,
  FileCheck,
  BookOpen,
  MessagesSquare,
  Mic,
} from "lucide-react";

const paths = [
  {
    id: "testar",
    icon: PlayCircle,
    title: "Explorar agora",
    sub: "Testar sem cadastro",
    hint: "Cole um exame e veja o resultado em segundos.",
    to: "/landing#demo",
  },
  {
    id: "dentro",
    icon: UserPlus,
    title: "Criar conta grátis",
    sub: "Inclui Examinus gratuito",
    hint: "Sem cartão, sem espera entre mensagens.",
    to: "/auth",
    primary: true,
  },
  {
    id: "conhecer",
    icon: Compass,
    title: "Ver apresentação",
    sub: "Tour pela plataforma",
    hint: "Assistentes, Modo Consultório, planos e garantia.",
    to: "/landing",
  },
];

const assistants = [
  { name: "Examinus", short: "EX", icon: TestTube2, desc: "Resume exames", free: true },
  { name: "Clínicus", short: "CL", icon: Stethoscope, desc: "Anamnese pronta" },
  { name: "Scorius", short: "SC", icon: Calculator, desc: "Scores e risco" },
  { name: "Numerus", short: "NU", icon: Sigma, desc: "Cálculos clínicos" },
  { name: "Prescriptus", short: "PR", icon: Pill, desc: "Bula inteligente" },
  { name: "CODexus", short: "CO", icon: FileCode, desc: "CID-10 certo" },
  { name: "Gasometrus", short: "GA", icon: Wind, desc: "Gasometria lida" },
  { name: "Atestus", short: "AT", icon: FileCheck, desc: "Atestados prontos" },
  { name: "Protocolus", short: "PT", icon: BookOpen, desc: "Protocolos atuais" },
  { name: "Orientus", short: "OR", icon: Compass, desc: "Orientação ao paciente" },
  { name: "Mediscuss", short: "MD", icon: MessagesSquare, desc: "Discussão de casos" },
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
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_15%_-5%,hsl(var(--primary)/0.20),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_95%_35%,hsl(var(--primary)/0.10),transparent)] pointer-events-none" />

      <div className="relative z-10">
        <header className="container mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
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

        <main className="container mx-auto px-4 md:px-8 pb-14 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna principal */}
            <div className="lg:col-span-8 space-y-10 md:space-y-12">
              <section className="space-y-4 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary text-[11px] font-semibold uppercase tracking-wider">
                    Assistentes clínicos de IA
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                  Menos burocracia.{" "}
                  <span className="text-primary">Mais tempo com o paciente.</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  A MedStation AI escreve com você: exames resumidos, anamnese estruturada, protocolos e
                  a consulta transcrita. Escolha por onde começar — cada caminho leva poucos minutos.
                </p>
              </section>

              {/* Três caminhos */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paths.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => go(p.to, `entrada_${p.id}`)}
                      className={`group relative p-5 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 ${
                        p.primary
                          ? "bg-primary text-primary-foreground border border-primary shadow-[0_20px_50px_-24px_hsl(var(--primary)/0.9)] hover:shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.8)]"
                          : "bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`mb-4 p-2 w-fit rounded-xl transition-colors ${
                          p.primary
                            ? "bg-background/15"
                            : "bg-muted/40 group-hover:bg-primary/10"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            p.primary
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-primary transition-colors"
                          }`}
                        />
                      </div>
                      <span className={`block font-semibold ${p.primary ? "text-lg" : "text-base"}`}>
                        {p.title}
                      </span>
                      <span
                        className={`block text-sm ${
                          p.primary ? "opacity-90 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {p.sub}
                      </span>
                      <span
                        className={`mt-3 block text-xs leading-relaxed pr-8 pb-1 ${
                          p.primary ? "opacity-80" : "text-muted-foreground/80"
                        }`}
                      >
                        {p.hint}
                      </span>
                      <ArrowRight
                        className={`absolute bottom-5 right-5 w-4 h-4 transition-transform group-hover:translate-x-1 ${
                          p.primary ? "" : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
                      {p.primary && (
                        <span className="absolute top-4 right-4 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </section>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
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

              {/* Ecossistema */}
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Ecossistema de assistentes</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      O Examinus é grátis para qualquer conta. A assinatura libera os demais.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                    11 assistentes + Consultório
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {assistants.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.name}
                        style={{ animationDelay: `${i * 40}ms` }}
                        className="animate-fade-in group relative aspect-square flex flex-col items-center justify-center text-center p-2 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center mb-2 group-hover:bg-primary transition-colors">
                          <Icon className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <span className="text-[11px] font-medium leading-tight">{a.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{a.desc}</span>
                        {a.free && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                            Grátis
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => go("/consultorio-landing", "entrada_consultorio")}
                    className="group aspect-square flex flex-col items-center justify-center text-center p-2 rounded-2xl bg-primary/5 border border-dashed border-primary/40 hover:bg-primary/10 hover:-translate-y-0.5 transition-all"
                  >
                    <Mic className="w-5 h-5 text-primary mb-2" />
                    <span className="text-[10px] font-semibold text-primary uppercase leading-tight">
                      Modo Consultório
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">Consulta transcrita</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Já sabe o que quer? Assine e libere os 10 assistentes pagos + Modo Consultório.
                  </p>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={() => go("/pricing", "entrada_assinar")}
                  >
                    Ver planos e assinar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            </div>

            {/* Concierge */}
            <aside className="lg:col-span-4 lg:sticky lg:top-8">
              <AssistentesAIChat className="h-[600px]" />
            </aside>
          </div>
        </main>

        <footer className="container mx-auto px-4 md:px-8 py-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MedStation AI</span>
          <button className="hover:text-foreground transition-colors" onClick={() => go("/landing", "entrada_footer")}>
            Ver apresentação completa
          </button>
        </footer>
      </div>
    </div>
  );
}
