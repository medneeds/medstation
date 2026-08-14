import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QuickCheckout } from "@/components/QuickCheckout";
import { LeadForm } from "@/components/LeadForm";
import { ConciergeFab } from "@/components/ConciergeFab";
import { ClinicalFlowDemo } from "@/components/ClinicalFlowDemo";
import { trackCtaClick } from "@/lib/analytics";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { DISPLAY_PRICING, brl } from "@/lib/subscription-tiers";
import { ArrowRight, Check, Quote, Star } from "lucide-react";

const proof = [
  { value: "40h", label: "recuperadas por mês" },
  { value: "12", label: "assistentes clínicos" },
  { value: "7 dias", label: "grátis, sem cartão" },
];

const assistants = [
  ["Examinus", "Exames e laudos resumidos"],
  ["Clínicus", "Anamnese e evolução estruturadas"],
  ["Prescriptus", "Conduta e prescrição com alertas"],
  ["Gasometrus", "Gasometria interpretada"],
  ["Protocolus", "Protocolos direto ao ponto"],
  ["Orientus", "Orientação de alta ao paciente"],
  ["Atestus", "Atestados prontos"],
  ["Mediscuss", "Discussão de caso complexo"],
  ["Legalis", "Proteção jurídica e ética"],
  ["Codexus", "CID e codificação"],
  ["Numerus", "Escores e cálculos"],
  ["Scorius", "Estratificação de risco"],
] as const;

const testimonials = [
  {
    name: "Dr. Leandro Albuquerque",
    role: "Médico",
    text: "Otimizou meu processo de trabalho no técnico e na tomada de decisão. Executo minhas atividades de forma mais ágil e acurada, melhorando a qualidade da assistência ao paciente.",
  },
  {
    name: "Dra. Luciara Duarte",
    role: "Médica",
    text: "A melhor experiência possível. Otimiza muito o meu tempo e consigo fazer minhas atividades com mais qualidade. Muito bom mesmo. Excelente!",
  },
];

const faq = [
  {
    q: "Como funciona o teste de 7 dias?",
    a: "Você cria a conta com nome, telefone e e-mail e usa tudo por 7 dias: os 12 assistentes e o Modo Escuta. Não pedimos cartão de crédito em momento nenhum do teste.",
  },
  {
    q: "E depois dos 7 dias?",
    a: "Se você não assinar, sua conta continua ativa com o Examinus liberado em até 10 consultas por mês. Os demais assistentes ficam bloqueados até a assinatura.",
  },
  {
    q: "Serve para qualquer especialidade?",
    a: "Sim. Os assistentes se adaptam ao contexto clínico (emergência, UTI, enfermaria, consultório) e à especialidade, inclusive de forma automática no Modo Escuta.",
  },
  {
    q: "A IA decide por mim?",
    a: "Não. Cada resposta é apoio à decisão, com base em evidências, e a decisão clínica final é sempre do médico.",
  },
];

export default function Lp3() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
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

  const goForm = (label: string) => {
    trackCtaClick({ cta: label, section: "lp3", destination: "#comecar" });
    document.getElementById("comecar")?.scrollIntoView({ behavior: "smooth" });
  };

  const price = DISPLAY_PRICING.bundle[billing];

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Seo
        path="/lp3"
        title="MedStation — a IA que escreve a burocracia do seu plantão"
        description="Anamnese, exame, conduta e alta prontos em segundos. 12 assistentes clínicos e Modo Escuta. Teste 7 dias grátis, sem cartão."
      />

      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" />
            <span className="hidden sm:inline text-xs md:text-sm text-muted-foreground border-l border-border/60 pl-3 whitespace-nowrap">
              Produza mais. Digite menos.
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                trackCtaClick({ cta: "header_login", section: "lp3", destination: "/auth" });
                window.location.href = "/auth";
              }}
            >
              Já sou cliente
            </Button>
            <Button size="sm" onClick={() => goForm("header_teste")}>
              Testar 7 dias grátis
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero — 1 promessa + formulário completo */}
        <section
          id="comecar"
          className="relative overflow-hidden border-b border-border/50"
          style={{
            background:
              "radial-gradient(1200px 500px at 15% -10%, hsl(var(--primary) / 0.14), transparent 60%), linear-gradient(180deg, hsl(var(--muted) / 0.55), hsl(var(--background)))",
          }}
        >
          <div className="container mx-auto px-4 md:px-8 py-14 md:py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <div>
              <Badge variant="secondary" className="mb-5">
                IA criada para a prática clínica
              </Badge>
              <h1 className="text-[2.1rem] leading-[1.06] md:text-6xl font-semibold tracking-tight">
                A burocracia do plantão{" "}
                <span className="text-primary">escrita por você, sem digitar.</span>
              </h1>
              <p className="mt-5 text-base md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Anamnese, exame, conduta e alta prontos em segundos — no padrão do prontuário.
              </p>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                {["Sem cartão de crédito", "Sem instalar nada", "Cancele quando quiser"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <LeadForm source="lp3" />
          </div>
        </section>

        {/* 2. Prova de autoridade */}
        <section className="border-b border-border/50 bg-background">
          <div className="container mx-auto px-4 md:px-8 py-8 md:py-10 grid grid-cols-3 gap-4 text-center">
            {proof.map((p) => (
              <div key={p.label}>
                <div className="text-2xl md:text-4xl font-semibold text-primary tracking-tight">{p.value}</div>
                <div className="mt-1 text-[0.72rem] md:text-sm text-muted-foreground">{p.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Como funciona */}
        <section className="bg-muted/25 border-b border-border/50">
          <div className="container mx-auto px-4 md:px-8 py-14 md:py-20">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center">
              Você fala ou cola. Ele escreve.
            </h2>
            <p className="mt-3 text-center text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              O mesmo caso, do áudio ao texto pronto para o prontuário.
            </p>
            <div className="mt-8">
              <ClinicalFlowDemo onPrimary={() => goForm("flow_demo")} />
            </div>
          </div>
        </section>

        {/* 4. Assistentes */}
        <section className="border-b border-border/50">
          <div className="container mx-auto px-4 md:px-8 py-14 md:py-20">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center">
              12 assistentes, um para cada tarefa
            </h2>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {assistants.map(([name, desc]) => (
                <div
                  key={name}
                  className="rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-colors hover:border-primary/45"
                >
                  <h3 className="text-sm font-semibold">{name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Mais o Modo Escuta: grava, transcreve e estrutura a consulta em tempo real.
            </p>
          </div>
        </section>

        {/* 5. Prova social */}
        <section className="bg-muted/25 border-b border-border/50">
          <div className="container mx-auto px-4 md:px-8 py-14 md:py-20">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center">
              Quem já usa, não volta atrás
            </h2>
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {testimonials.map((t) => (
                <figure key={t.name} className="relative rounded-2xl border border-border/60 bg-background p-6">
                  <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/15" />
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <blockquote className="text-sm md:text-base leading-relaxed text-muted-foreground">
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

        {/* 6. Preço + FAQ + CTA final */}
        <section id="planos" className="container mx-auto px-4 md:px-8 py-14 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
              Um plantão de burocracia custa mais caro
            </h2>
            <p className="mt-3 text-muted-foreground">
              Um único plano com tudo dentro: os 12 assistentes clínicos e o Modo Escuta, que ouve o
              atendimento e devolve a anamnese pronta. Preço de lançamento por tempo limitado.
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {(["monthly", "yearly"] as const).map((cycle) => {
              const p = DISPLAY_PRICING.bundle[cycle];
              const active = billing === cycle;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBilling(cycle)}
                  className={`relative text-left rounded-2xl border p-5 transition-all ${
                    active
                      ? "border-2 border-primary bg-primary/5 shadow-medical"
                      : "border border-border/60 bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{cycle === "monthly" ? "Mensal" : "Anual"}</span>
                    {cycle === "yearly" ? (
                      <Badge
                        variant="secondary"
                        className="text-[0.65rem] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20"
                      >
                        2 meses grátis
                      </Badge>
                    ) : active ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-primary">{brl(p.now)}</span>
                    <span className="text-sm text-muted-foreground">{cycle === "monthly" ? "/mês" : "/ano"}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="line-through">{brl(p.list)}</span> valor de referência do mercado
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {cycle === "monthly"
                      ? "Flexível, cancele quando quiser."
                      : `≈ ${brl(p.now / 12)} por mês.`}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 max-w-xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Referência de mercado</div>
                <div className="mt-1 text-base md:text-lg font-semibold line-through text-muted-foreground">
                  {brl(price.list)}
                </div>
              </div>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Você paga hoje</div>
                <div className="mt-1 text-base md:text-lg font-bold text-primary">{brl(price.now)}</div>
              </div>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Desconto</div>
                <div className="mt-1 text-base md:text-lg font-semibold text-primary">
                  {Math.round((1 - price.now / price.list) * 100)}%
                </div>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-primary/15 text-center text-sm">
              Economia de{" "}
              <strong className="text-primary">{brl(price.list - price.now)}</strong>{" "}
              {billing === "monthly" ? "por mês" : "por ano"} —{" "}
              {billing === "monthly"
                ? `${brl((price.list - price.now) * 12)} em 12 meses.`
                : `equivale a ${brl(price.now / 12)} por mês.`}
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {billing === "monthly"
              ? `Menos de ${brl(price.now / 30)} por dia — o valor de um café por um plantão inteiro sem digitar burocracia.`
              : `Equivale a ${brl(price.now / 12)} por mês — dois meses de cortesia em relação ao mensal.`}
          </p>

          <div className="mt-6 max-w-xl mx-auto">
            <QuickCheckout origin="lp3" product="pro_completo" billingPeriod={billing} showPricing={false} />
          </div>

          <div className="mt-14 max-w-2xl mx-auto">
            <h3 className="text-lg md:text-xl font-semibold tracking-tight text-center">Perguntas frequentes</h3>
            <Accordion type="single" collapsible className="mt-4">
              {faq.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="mt-14 max-w-xl mx-auto text-center">
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
              Comece pelo teste. Decida depois.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              7 dias com tudo liberado, sem cartão. Leva menos de um minuto.
            </p>
            <div className="mt-6 text-left">
              <LeadForm source="lp3_final" ctaLabel="Começar agora" />
            </div>
            <Button variant="ghost" className="mt-4 text-sm" onClick={() => goForm("cta_final_topo")}>
              Voltar ao topo <ArrowRight className="w-4 h-4 ml-1.5 -rotate-90" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="container mx-auto px-4 md:px-8 py-8 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} MedStation</span>
          <span>A decisão clínica final é sempre do médico.</span>
        </div>
      </footer>

      <ConciergeFab />
    </div>
  );
}
