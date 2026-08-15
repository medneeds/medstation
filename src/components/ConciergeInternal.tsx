import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Search,
  ArrowRight,
  CheckCircle2,
  Circle,
  BookOpen,
  MessageCircleQuestion,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssistentesAIChat } from "@/components/AssistentesAIChat";
import { cn } from "@/lib/utils";

type Guide = {
  id: string;
  name: string;
  group: "Assistentes" | "Modos" | "Organização" | "Conta";
  what: string;
  when: string;
  steps: string[];
  url: string;
};

const GUIDES: Guide[] = [
  {
    id: "clinicus",
    name: "Clínicus",
    group: "Assistentes",
    what: "Transforma dados soltos do atendimento em anamnese, evolução ou relatório prontos para o prontuário.",
    when: "Quando você já colheu a história e precisa escrever rápido e bem.",
    steps: [
      "Escolha o contexto (consultório, enfermaria, emergência, UTI)",
      "Cole ou dite os dados do paciente",
      "Ative Anamnese ou Relatório e envie",
      "Copie o texto final no botão de cópia",
    ],
    url: "/clinicus",
  },
  {
    id: "examinus",
    name: "Examinus",
    group: "Assistentes",
    what: "Organiza e interpreta exames, e sugere quais exames pedir no modo consultor.",
    when: "Ao receber resultados extensos ou na dúvida sobre a próxima investigação.",
    steps: ["Cole os resultados ou envie foto/PDF", "Ligue os ajustes que quiser (tempo, comparação, impressão)", "Envie e copie o resumo"],
    url: "/examinus",
  },
  {
    id: "gasometrus",
    name: "Gasometrus",
    group: "Assistentes",
    what: "Interpretação completa de gasometria, passo a passo, com conduta sugerida.",
    when: "Beira de leito, emergência e UTI.",
    steps: ["Cole os valores da gasometria", "Opcional: ative a leitura sistemática", "Leia a interpretação e a conduta"],
    url: "/gasometrus",
  },
  {
    id: "prescriptus",
    name: "Prescriptus",
    group: "Assistentes",
    what: "Discussão de fármacos, doses e interações — e o Modo Receita, que entrega a prescrição formatada.",
    when: "Antes de prescrever ou quando quiser a receita pronta.",
    steps: ["Descreva o caso e o objetivo terapêutico", "Ative o Modo Receita se quiser o documento pronto", "Revise sempre antes de assinar"],
    url: "/prescriptus",
  },
  {
    id: "numerus",
    name: "Numerus",
    group: "Assistentes",
    what: "Calculadoras interativas por peso: drogas vasoativas, sedação, intubação e protocolos.",
    when: "Quando precisa de dose e diluição na hora.",
    steps: ["Informe o peso", "Escolha a droga ou o protocolo", "Confira o resultado e copie"],
    url: "/numerus",
  },
  {
    id: "mediscuss",
    name: "Mediscuss",
    group: "Assistentes",
    what: "Monta pedidos de parecer, discussão de caso, internação, UTI ou transferência.",
    when: "Na hora de acionar outra equipe com clareza.",
    steps: ["Cole os dados do caso", "Escolha o modo e a especialidade", "Copie o texto para o prontuário"],
    url: "/mediscuss",
  },
  {
    id: "atestus",
    name: "Atestus",
    group: "Assistentes",
    what: "Atestados e declarações com CID, sem descrição de doença.",
    when: "Fim do atendimento, quando o paciente precisa do documento.",
    steps: ["Informe período e CID", "Gere e revise", "Copie"],
    url: "/atestus",
  },
  {
    id: "orientus",
    name: "Orientus",
    group: "Assistentes",
    what: "Orientações de alta em linguagem que o paciente entende.",
    when: "Ao liberar o paciente.",
    steps: ["Descreva diagnóstico e conduta", "Gere as orientações", "Entregue impresso ou por mensagem"],
    url: "/orientus",
  },
  {
    id: "protocolus",
    name: "Protocolus",
    group: "Assistentes",
    what: "Protocolos e diretrizes atualizadas (AHA, ESC, OMS e outras).",
    when: "Quando quer condutas embasadas em segundos.",
    steps: ["Pergunte pelo protocolo ou cenário", "Leia os pontos-chave"],
    url: "/protocolus",
  },
  {
    id: "legalis",
    name: "Legalis",
    group: "Assistentes",
    what: "Proteção jurídica: blindagem do registro, ética e defesa argumentativa.",
    when: "Casos sensíveis, recusa de tratamento, conflitos.",
    steps: ["Descreva a situação", "Receba orientação de conduta e de registro"],
    url: "/legalis",
  },
  {
    id: "scorius",
    name: "Scorius",
    group: "Assistentes",
    what: "Escores clínicos aplicados ao caso.",
    when: "Estratificação de risco.",
    steps: ["Informe os dados", "Escolha o escore", "Interprete o resultado"],
    url: "/scorius",
  },
  {
    id: "codexus",
    name: "CODexus",
    group: "Assistentes",
    what: "Busca de CID e codificação.",
    when: "Ao fechar documentos e faturamento.",
    steps: ["Digite o diagnóstico", "Escolha o código adequado"],
    url: "/codexus",
  },
  {
    id: "escuta",
    name: "Modo Escuta",
    group: "Modos",
    what: "Grava o atendimento, transcreve em tempo real e estrutura a anamnese sozinho.",
    when: "Consultas e atendimentos em que você não quer digitar nada.",
    steps: [
      "Abra Modo Escuta > Novo atendimento",
      "Inicie a gravação (o paciente deve ser avisado)",
      "Ao finalizar, revise a transcrição e gere a estruturação",
      "Salve em uma pasta com nome e data",
    ],
    url: "/consultorio",
  },
  {
    id: "escuta-hist",
    name: "Histórico do Modo Escuta",
    group: "Organização",
    what: "Todos os atendimentos salvos, por pasta e por data.",
    when: "Para retomar, copiar ou comparar atendimentos.",
    steps: ["Abra Histórico", "Filtre por pasta ou data", "Abra e copie o que precisar"],
    url: "/consultorio/historico",
  },
  {
    id: "rotina",
    name: "Modo Rotineiro",
    group: "Modos",
    what: "Mapa de leitos da sua enfermaria/UTI com evolução diária que herda o dia anterior e o assistente Carpe Diem.",
    when: "Visita diária de rotina.",
    steps: [
      "Configure unidades e leitos",
      "Interne o paciente no leito",
      "Abra a evolução do dia — ela já nasce herdada",
      "Descreva as mudanças e peça ao Carpe Diem para reescrever",
      "Movimente o leito ou dê alta (fica no arquivo)",
    ],
    url: "/rotina",
  },
  {
    id: "arquivo",
    name: "Arquivo de altas",
    group: "Organização",
    what: "Consulta de todos os pacientes já liberados, com histórico das evoluções.",
    when: "Quando precisa resgatar um caso antigo.",
    steps: ["Abra Arquivo de altas", "Busque pelo nome ou período"],
    url: "/rotina/arquivo",
  },
  {
    id: "indicar",
    name: "Indique e ganhe",
    group: "Conta",
    what: "Seu link único: quem entra por ele ganha desconto e você ganha dias de acesso.",
    when: "Sempre que um colega perguntar da plataforma.",
    steps: ["Copie seu link", "Envie ao colega", "Acompanhe as indicações"],
    url: "/indicar",
  },
  {
    id: "perfil",
    name: "Perfil e assinatura",
    group: "Conta",
    what: "Seus dados, preferências, tema e gestão do plano.",
    when: "Para ajustar conta e pagamento.",
    steps: ["Abra Perfil", "Ajuste o que precisar"],
    url: "/settings",
  },
];

const GROUPS = ["Todos", "Assistentes", "Modos", "Organização", "Conta"] as const;

const FIRST_STEPS = [
  { id: "s1", label: "Abrir o Examinus e colar um exame", url: "/examinus" },
  { id: "s2", label: "Gerar uma anamnese no Clínicus", url: "/clinicus" },
  { id: "s3", label: "Fazer um atendimento no Modo Escuta", url: "/consultorio" },
  { id: "s4", label: "Montar seu mapa de leitos no Modo Rotineiro", url: "/rotina" },
];

const DONE_KEY = "concierge-first-steps";

export function ConciergeInternal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const setOpen = onOpenChange;
  const [tab, setTab] = useState<"guia" | "perguntar">("guia");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ text: string; nonce: number }>({ text: "", nonce: 0 });
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
    } catch {
      setDone([]);
    }
  }, []);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(DONE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUIDES.filter(
      (g) =>
        (group === "Todos" || g.group === group) &&
        (!q ||
          g.name.toLowerCase().includes(q) ||
          g.what.toLowerCase().includes(q) ||
          g.when.toLowerCase().includes(q)),
    );
  }, [query, group]);

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  const askAbout = (g: Guide) => {
    setTab("perguntar");
    setAsk({ text: `Como uso o ${g.name} no meu dia a dia? Dê um exemplo prático.`, nonce: Date.now() });
  };

  return (
    <>
      {/* Painel */}
      <div
        className={cn(
          "fixed z-[60] transition-all duration-300 ease-out",
          "inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-24 sm:w-[420px]",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
        role="dialog"
        aria-label="Concierge MedStation"
        aria-hidden={!open}
      >
        <div className="relative flex h-[72vh] max-h-[600px] sm:h-[560px] flex-col rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)]">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/50">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[15px] font-semibold truncate">Concierge MedStation</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Descubra tudo o que dá para fazer aqui dentro
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 rounded-full"
              onClick={() => setOpen(false)}
              aria-label="Fechar concierge"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Abas */}
          <div className="flex gap-1 px-4 pt-3">
            {(
              [
                { id: "guia", label: "Guia", icon: BookOpen },
                { id: "perguntar", label: "Perguntar", icon: MessageCircleQuestion },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  tab === t.id
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "guia" ? (
            <>
              <div className="px-4 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar recurso: gasometria, receita, leitos..."
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroup(g)}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                        group === g
                          ? "border-primary/40 text-primary bg-primary/5"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4 py-3">
                {!query && group === "Todos" && (
                  <div className="mb-4 rounded-2xl border border-border/60 bg-background/50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      Primeiros passos
                    </p>
                    <div className="space-y-1">
                      {FIRST_STEPS.map((s) => {
                        const isDone = done.includes(s.id);
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDone(s.id)}
                              aria-label={isDone ? "Desmarcar passo" : "Marcar passo como feito"}
                              className="shrink-0 text-primary"
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/60" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => go(s.url)}
                              className={cn(
                                "flex-1 text-left text-xs hover:text-primary transition-colors",
                                isDone && "line-through text-muted-foreground",
                              )}
                            >
                              {s.label}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {results.map((g) => {
                    const isOpen = expanded === g.id;
                    return (
                      <div
                        key={g.id}
                        className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : g.id)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{g.name}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                              {g.group}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.what}</p>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-border/40">
                            <p className="text-[11px] text-muted-foreground mb-2">
                              QUANDO USAR: {g.when}
                            </p>
                            <ol className="space-y-1 mb-3">
                              {g.steps.map((s, i) => (
                                <li key={s} className="flex gap-2 text-xs">
                                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <span className="text-foreground/90">{s}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 text-xs" onClick={() => go(g.url)}>
                                Abrir agora
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => askAbout(g)}
                              >
                                Tirar dúvida
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {results.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nada encontrado. Tente outra palavra ou pergunte na aba Perguntar.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 min-h-0 p-3">
              <AssistentesAIChat
                className="h-full border-0 shadow-none bg-transparent rounded-2xl"
                title="Perguntar ao Concierge"
                subtitle="Explico qualquer recurso da plataforma e por onde começar"
                welcome="Pode perguntar: como uso o Modo Rotineiro? Qual assistente serve para alta? Como salvo um atendimento?"
                suggestions={[
                  "Por onde eu começo hoje?",
                  "Como funciona o Modo Escuta?",
                  "Qual assistente uso no plantão?",
                  "Como salvo e organizo meus atendimentos?",
                ]}
                ask={ask}
              />
            </div>
          )}
        </div>
      </div>

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar concierge" : "Abrir concierge MedStation"}
        aria-expanded={open}
        className={cn(
          "fixed z-[61] right-4 sm:right-5 bottom-[5.25rem] sm:bottom-[5.5rem]",
          "inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5",
          "bg-card/90 backdrop-blur border border-primary/30 text-foreground shadow-elevated",
          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
          open && "opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto",
        )}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Sparkles className="relative h-4 w-4 text-primary" strokeWidth={1.9} />
        </span>
        <span className="text-xs font-medium hidden sm:inline">Como usar</span>
      </button>
    </>
  );
}

export default ConciergeInternal;
