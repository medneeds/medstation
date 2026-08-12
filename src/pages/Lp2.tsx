import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickCheckout } from "@/components/QuickCheckout";
import { Lp2SignupDialog } from "@/components/Lp2SignupDialog";
import { ConciergeFab } from "@/components/ConciergeFab";
import { ClinicalFlowDemo } from "@/components/ClinicalFlowDemo";
import { trackCtaClick } from "@/lib/analytics";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  Pill,
  ShieldCheck,
  Star,
  Stethoscope,
  TestTube2,
  Quote,
} from "lucide-react";

const pains = [
  "Sai do plantão e ainda tem evolução e alta para escrever",
  "Paciente grave chega e a anamnese precisa sair na hora",
  "Exame com 40 linhas para transformar em três frases úteis",
  "Prescrição, atestado, orientação de alta: sempre digitando o mesmo",
];

const gains = [
  {
    icon: TestTube2,
    title: "Exame resumido",
    text: "Cole o laboratorial ou o laudo e receba a conclusão pronta para o prontuário.",
  },
  {
    icon: Stethoscope,
    title: "Anamnese estruturada",
    text: "Informação solta vira texto clínico coerente no modelo do seu contexto.",
  },
  {
    icon: Pill,
    title: "Conduta e prescrição",
    text: "Doses, ajustes e alertas com base em medicina baseada em evidências.",
  },
  {
    icon: FileText,
    title: "Alta e documentos",
    text: "Orientação ao paciente, atestado e parecer prontos para assinar.",
  },
  {
    icon: Clock,
    title: "Até 40h por mês",
    text: "O trabalho repetitivo sai do seu ombro e o tempo volta para o paciente.",
  },
];

const steps = [
  { title: "Cole ou dite", text: "Exame bruto, laudo ou a sua fala sobre o caso — do jeito que já está." },
  { title: "Escolha o assistente", text: "Exame, anamnese, conduta, alta ou documento. Cada um com foco clínico próprio." },
  { title: "Copie e siga", text: "Texto pronto no padrão do prontuário. Você revisa, copia e segue para o próximo paciente." },
];

const audience = [
  {
    title: "Emergência",
    text: "Volume alto, tempo curto. Evolução, exame e alta saem em segundos, entre um leito e outro.",
    bullets: ["Exames e gasometria interpretados", "Evolução e parecer prontos", "Protocolos direto ao ponto"],
  },
  {
    title: "UTI",
    text: "Paciente complexo, decisão rápida. Conduta, prescrição e balanço estruturados na hora.",
    bullets: ["Conduta e prescrição com alertas", "Gasometria e exames à beira do leito", "Evolução e balanços prontos"],
  },
];

const testimonials = [
  {
    name: "Dr. Leandro Albuquerque",
    role: "Médico",
    text: "Utilizar a MedStation possibilitou otimizar meu processo de trabalho tanto do ponto de vista técnico como no auxílio na tomada de decisões nas condutas. Consigo executar minhas atividades de forma mais ágil e acurada, melhorando a qualidade da assistência prestada ao paciente.",
  },
  {
    name: "Dra. Luciara Duarte",
    role: "Médica",
    text: "A minha experiência com a plataforma foi a melhor possível, porque otimiza muito o meu tempo. Consigo fazer minhas atividades com mais qualidade, além do tempo. Muito bom mesmo. Excelente!",
  },
];

export default function Lp2() {
  const navigate = useNavigate();
  const [signupOpen, setSignupOpen] = useState(false);
  useReferralCapture();

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.classList.add("light");
    return () => {
      if (wasDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      }
    };
  }, []);

  const goPlans = (label: string) => {
    trackCtaClick({ cta: label, section: "lp2", destination: "#planos" });
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  const openSignup = (label: string) => {
    trackCtaClick({ cta: label, section: "lp2", destination: "popup_cadastro" });
    setSignupOpen(true);
  };

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Seo
        path="/lp2"
        title="MedStation AI — recupere até 40h por mês de burocracia"
        description="Assistentes de IA feitos para a prática clínica: exame resumido, anamnese estruturada, conduta e alta em segundos. Teste com garantia de 7 dias."
      />

      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <Button size="sm" onClick={() => goPlans("header_planos")}>
            Ver planos
          </Button>
        </div>
      </header>

      <main>
        {/* 1. Hero — dor + promessa + CTA */}
        <section className="container mx-auto px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-5 whitespace-nowrap">
              IA criada para a prática clínica
            </Badge>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Recupere até 40 horas por mês.{" "}
              <span className="text-primary">Sem digitar burocracia.</span>
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Exame resumido, anamnese estruturada, conduta e orientação de alta prontos em segundos.
              Você volta ao que escolheu fazer: cuidar do paciente.
            </p>

            <ul className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {pains.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="text-base" onClick={() => goPlans("hero_assinar")}>
                Ver planos e assinar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base" onClick={() => openSignup("hero_criar_conta")}>
                Criar conta e testar 7 dias
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> 7 dias de garantia
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary" /> 7 dias grátis, sem cartão
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Sem instalar nada
              </span>
            </div>
          </div>
        </section>

        {/* 2. Como funciona na prática (demonstração) */}
        <section className="border-y border-border/60 bg-muted/20">
          <div className="container mx-auto px-4 md:px-8 py-12 md:py-16">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight max-w-2xl">
              Veja o fluxo na prática
            </h2>
            <p className="mt-2.5 text-sm md:text-base text-muted-foreground max-w-2xl">
              Você cola ou dita a informação do caso. O assistente devolve o texto pronto para o prontuário.
            </p>

            <div className="mt-6 grid sm:grid-cols-3 gap-2.5">
              {steps.map((s, i) => (
                <div key={s.title} className="rounded-xl border border-border/60 bg-background px-4 py-3">
                  <span className="text-[0.7rem] font-semibold text-primary">Passo {i + 1}</span>
                  <h3 className="mt-0.5 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-[0.8rem] text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <ClinicalFlowDemo onPrimary={() => openSignup("flow_demo")} />
            </div>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5">
              {gains.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.title} className="flex gap-3">
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold leading-tight">{g.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{g.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        {/* 3. Para quem é */}
        <section className="container mx-auto px-4 md:px-8 py-16 md:py-20">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight max-w-2xl">
            Feito para o médico plantonista
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Da chegada do paciente grave à evolução do plantão. Tudo o que você
            precisa entre um leito e outro, na velocidade que a emergência e a UTI exigem.
          </p>
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {audience.map((a) => (
              <div key={a.title} className="rounded-2xl border border-border/60 p-6">
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                <ul className="mt-4 space-y-2">
                  {a.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Depoimentos */}
        <section className="border-y border-border/60 bg-muted/20">
          <div className="container mx-auto px-4 md:px-8 py-16 md:py-20">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight max-w-2xl">
              O que dizem os médicos que usam
            </h2>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="relative rounded-2xl border border-border/60 bg-background p-6"
                >
                  <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/15" />
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">
                    “{t.text}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {t.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Planos + CTA final */}
        <section id="planos" className="container mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
              Assinatura por menos de R$ 1 por dia
            </h2>
            <p className="mt-3 text-muted-foreground">
              Assinatura mensal, cancele quando quiser. 7 dias de garantia incondicional.
            </p>
          </div>
          <div className="mt-10 max-w-xl mx-auto">
            <QuickCheckout origin="lp2" />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Prefere conhecer antes?{" "}
            <button className="underline hover:text-foreground" onClick={() => openSignup("planos_conta_gratis")}>
              Crie sua conta e teste 7 dias sem cartão
            </button>
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="container mx-auto px-4 md:px-8 py-8 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} MedStation AI</span>
          <span>A decisão clínica final é sempre do médico.</span>
        </div>
      </footer>

      <Lp2SignupDialog open={signupOpen} onOpenChange={setSignupOpen} />
      <ConciergeFab />
    </div>
  );
}
