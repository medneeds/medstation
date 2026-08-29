import { lazy, useEffect, useState } from "react";
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
import { LeadForm } from "@/components/LeadForm";
import { DeferredSection, DeferredIdle } from "@/components/DeferredSection";

// Blocos abaixo da dobra: fora do bundle inicial, mas pré-carregados em idle
// logo após o first paint para que o scroll nunca espere download/mount.
const importQuickCheckout = () => import("@/components/QuickCheckout");
const importConciergeFab = () => import("@/components/ConciergeFab");
const importClinicalFlowDemo = () => import("@/components/ClinicalFlowDemo");
const importLandingToolExplorer = () => import("@/components/landing/LandingToolExplorer");

const QuickCheckout = lazy(() => importQuickCheckout().then(m => ({ default: m.QuickCheckout })));
const ConciergeFab = lazy(() => importConciergeFab().then(m => ({ default: m.ConciergeFab })));
const ClinicalFlowDemo = lazy(() => importClinicalFlowDemo().then(m => ({ default: m.ClinicalFlowDemo })));
const LandingToolExplorer = lazy(() => importLandingToolExplorer().then(m => ({ default: m.LandingToolExplorer })));

import { trackCtaClick } from "@/lib/analytics";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { DISPLAY_PRICING, brl } from "@/lib/subscription-tiers";
import { ArrowRight, Check, Quote, Star } from "lucide-react";

const proof = [
  { value: "Documentação", label: "texto clínico pronto para revisão" },
  { value: "Copiloto", label: "apoio de raciocínio no plantão" },
  { value: "Fluxo", label: "menos trabalho repetitivo na rotina" },
];


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
    a: "Você informa apenas o e-mail e recebe um link seguro de acesso. Durante 7 dias a plataforma inteira fica liberada: Documentação, Copiloto e Fluxo. Não pedimos cartão de crédito em momento nenhum do teste.",
  },

  {
    q: "E depois dos 7 dias?",
    a: "Ao fim dos 7 dias, basta assinar o plano único para continuar com tudo liberado. Sem assinatura, os assistentes ficam bloqueados, mas sua conta e seus registros continuam salvos.",
  },
  {
    q: "Existe diferença entre planos?",
    a: "Não. Existe um único plano com a plataforma inteira: Documentação, Copiloto e Fluxo, por R$ 49,90 por mês ou R$ 499,90 por ano.",
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




  const goForm = (label: string) => {
    trackCtaClick({ cta: label, section: "lp3", destination: "#comecar" });
    document.getElementById("comecar")?.scrollIntoView({ behavior: "smooth" });
  };

  const price = DISPLAY_PRICING.bundle[billing];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        path="/"
        title="MedStation — menos tempo no teclado, mais tempo na medicina"
        description="Documentação clínica organizada, apoio à decisão no plantão e menos tarefas repetitivas na rotina. Teste 7 dias grátis, sem cartão."
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
        {/* 1. Hero — promessa + cadastro por e-mail */}
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
                Menos tempo no teclado.{" "}
                <span className="text-primary">Mais tempo na medicina.</span>
              </h1>
              <p className="mt-5 text-base md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                A MedStation organiza a documentação clínica, apoia decisões e reduz tarefas
                repetitivas ao longo do plantão.
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

        {/* 2. Os três tipos de trabalho */}
        <section className="border-b border-border/50 bg-background">
          <div className="container mx-auto px-4 md:px-8 py-8 md:py-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {proof.map((p) => (
              <div key={p.label}>
                <div className="text-lg md:text-2xl font-semibold text-primary tracking-tight">{p.value}</div>
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
              Do áudio ou de uma informação solta até o texto pronto para o prontuário.
            </p>

            <DeferredSection
              className="mt-8"
              minHeight={520}
              prefetch={importClinicalFlowDemo}
              mountAfterMs={150}
            >
              <ClinicalFlowDemo onPrimary={() => goForm("flow_demo")} />
            </DeferredSection>
          </div>
        </section>

        {/* 4. Ferramentas — exploração interativa */}
        <section className="border-b border-border/50">
          <div className="container mx-auto px-4 md:px-8 py-14 md:py-20">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-center">
              Uma ferramenta para cada etapa
            </h2>
            <p className="mt-3 text-center text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Escolha um caminho e toque em uma ferramenta para ver o que ela faz na prática.
            </p>
            <DeferredSection minHeight={420} prefetch={importLandingToolExplorer} mountAfterMs={400}>
              <LandingToolExplorer />
            </DeferredSection>
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
              Um único plano com a plataforma inteira: Documentação, Copiloto e Fluxo.
              Sem módulos separados, sem upgrade escondido.
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
                    Valor vigente no plano único MedStation.
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

          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-primary/25 bg-background px-4 py-3 text-center text-xs md:text-sm">
            <strong className="text-primary">Preço vigente:</strong> este é o valor atual do plano único MedStation.
            Eventuais reajustes futuros serão definidos conforme a evolução do produto e comunicados antes de qualquer mudança na cobrança.
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {billing === "monthly"
              ? `Menos de ${brl(price.now / 30)} por dia — o valor de um café por um plantão inteiro sem digitar burocracia.`
              : `Equivale a ${brl(price.now / 12)} por mês — dois meses de cortesia em relação ao mensal.`}
          </p>

          <DeferredSection
            className="mt-6 max-w-xl mx-auto"
            minHeight={180}
            prefetch={importQuickCheckout}
            mountAfterMs={650}
          >
            <QuickCheckout origin="lp3" product="pro_completo" billingPeriod={billing} showPricing={false} />
          </DeferredSection>

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
            <Button className="mt-6" size="lg" onClick={() => goForm("cta_final_topo")}>
              Testar 7 dias grátis <ArrowRight className="w-4 h-4 ml-1.5" />
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

      <DeferredIdle delayMs={900}>
        <ConciergeFab />
      </DeferredIdle>
    </div>
  );
}
