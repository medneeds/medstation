// Vitrine dos assistentes na página da Black (Artur, 03/11): cada assistente
// aparece pela função que cumpre ("Organizador de histórias clínicas"), com o
// nome do produto em segundo plano. As descrições seguem o catálogo do
// Copiloto (supabase/functions/copilot-chat/catalog.ts): nada além do que existe.
// Componente reutilizável: base da divulgação depois da Black (aceita className).

import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  BookOpen,
  Briefcase,
  Calculator,
  ClipboardList,
  Droplets,
  FileCheck,
  FlaskConical,
  Gauge,
  Hash,
  HeartHandshake,
  MessagesSquare,
  Mic,
  Pill,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  icon: LucideIcon;
  role: string;
  text: string;
  name: string;
  /** Até 3 linhas curtas para assistentes com mais de um jeito de usar. */
  points?: { label: string; text: string }[];
};

const GROUPS: { title: string; subtitle: string; items: Item[] }[] = [
  {
    title: "Você manda, ela escreve",
    subtitle: "Cole, dite ou fotografe. Volta pronto para o prontuário.",
    items: [
      {
        icon: ClipboardList,
        role: "Organizador de histórias clínicas",
        text: "Dados soltos viram anamnese, evolução ou alta prontas.",
        name: "Clínicus",
      },
      {
        icon: FlaskConical,
        role: "Resumidor de exames",
        text: "Texto bruto, foto ou PDF: recebe tudo resumido e organizado. Lê até ECG e raio-X.",
        name: "Examinus",
      },
      {
        icon: MessagesSquare,
        role: "Redator de pareceres",
        text: "Parecer, vaga de UTI ou transferência, sem quebrar a cabeça com o texto.",
        name: "Mediscuss",
      },
      {
        icon: FileCheck,
        role: "Gerador de atestados",
        text: "Atestado com CID em segundos, no fim da consulta.",
        name: "Atestus",
      },
      {
        icon: HeartHandshake,
        role: "Orientador de alta",
        text: "Orientações que o paciente entende, prontas para entregar.",
        name: "Orientus",
      },
    ],
  },
  {
    title: "Respostas na hora, sem trocar de aplicativo",
    subtitle: "Cálculo, escore e protocolo onde você já está escrevendo.",
    items: [
      {
        icon: Pill,
        role: "Assistente de prescrição",
        text: "Três jeitos de prescrever mais rápido:",
        name: "Prescriptus",
        points: [
          { label: "Do caso à prescrição", text: "descreve o paciente e recebe a sugestão" },
          { label: "Bula inteligente", text: "dose, interação e ajuste em segundos" },
          { label: "Modo Receita", text: "a receita sai formatada, pronta para usar" },
        ],
      },
      {
        icon: Droplets,
        role: "Intérprete de gasometria",
        text: "Cola os valores e recebe a leitura completa, com conduta.",
        name: "Gasometrus",
      },
      {
        icon: Calculator,
        role: "Calculadora médica",
        text: "Dose, diluição, vasoativa e sedação pelo peso, sem conta de cabeça.",
        name: "Numerus",
      },
      {
        icon: Gauge,
        role: "Calculadora de escores",
        text: "Glasgow, CURB-65, Wells, HEART, SOFA e mais, já aplicados ao seu caso.",
        name: "Scorius",
      },
      {
        icon: BookOpen,
        role: "Consultor de protocolos",
        text: "A conduta da diretriz em segundos, sem procurar PDF.",
        name: "Protocolus",
      },
      {
        icon: Hash,
        role: "Buscador de CID-10",
        text: "O CID certo na hora, com sugestão de dias de afastamento.",
        name: "CODexus",
      },
      {
        icon: Scale,
        role: "Consultor ético-jurídico",
        text: "Como registrar e agir nas situações delicadas do plantão.",
        name: "Legalis",
      },
    ],
  },
];

const MODES: Item[] = [
  {
    icon: Mic,
    role: "Atenda sem digitar",
    text: "Você conversa com o paciente; a anamnese fica pronta quando a consulta acaba.",
    name: "Modo Escuta",
  },
  {
    icon: BedDouble,
    role: "Evolua a enfermaria e a UTI num instante",
    text: "A evolução de hoje já nasce com a de ontem. Você só dita o que mudou.",
    name: "Modo Rotineiro",
  },
  {
    icon: Briefcase,
    role: "Livre-se da papelada",
    text: "Transferência, alto custo/LME, resposta à auditoria: cola e sai pronto.",
    name: "Modo Operador",
  },
];

/** Funções curtas para a nuvem de etiquetas do topo da página. */
export const ASSISTANT_CHIPS = [
  "Organiza histórias clínicas",
  "Resume exames de texto, foto ou PDF",
  "Interpreta gasometria",
  "Lê ECG e raio-X",
  "Calcula doses",
  "Aplica escores",
  "Consulta protocolos",
  "Sugere prescrições e monta a receita",
  "Gera atestados com CID",
  "Escreve pareceres",
];

function Card({ item, wide = false }: { item: Item; wide?: boolean }) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        "flex h-full gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50",
        wide && "md:p-5",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] font-semibold leading-snug">{item.role}</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.text}</p>
        {item.points && (
          <ul className="mt-3 grid gap-2 md:grid-cols-3">
            {item.points.map((pt) => (
              <li key={pt.label} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm leading-snug">
                <span className="block font-semibold text-foreground">{pt.label}</span>
                <span className="text-muted-foreground">{pt.text}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-primary/80">{item.name}</p>
      </div>
    </div>
  );
}

export function AssistantsShowcase({ className }: { className?: string }) {
  return (
    <section id="assistentes" className={cn("scroll-mt-28", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">12 assistentes · 3 modos</p>
        <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight">Tudo o que te toma tempo, resolvido num só lugar</h2>
        <p className="mt-3 text-sm md:text-base text-muted-foreground">
          Você descreve, a MedStation entrega pronto. Você só revisa.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="flex flex-col gap-1 border-l-2 border-primary pl-3 md:flex-row md:items-baseline md:gap-3">
              <h3 className="text-lg font-semibold">{g.title}</h3>
              <p className="text-sm text-muted-foreground">{g.subtitle}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((item) => (
                // Assistente com mais de um jeito de usar ganha a linha inteira.
                <div key={item.name} className={cn(item.points && "sm:col-span-2 lg:col-span-3")}>
                  <Card item={item} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <div className="flex flex-col gap-1 border-l-2 border-primary pl-3 md:flex-row md:items-baseline md:gap-3">
            <h3 className="text-lg font-semibold">Modos que trabalham junto com você</h3>
            <p className="text-sm text-muted-foreground">No consultório, na enfermaria e na papelada.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {MODES.map((item) => (
              <Card key={item.name} item={item} wide />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
