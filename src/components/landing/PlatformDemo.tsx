import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Mic,
  MessagesSquare,
  NotebookPen,
  Paperclip,
  Pill,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackCtaClick } from "@/lib/analytics";

/**
 * Demo animada da plataforma: telas recriadas do ambiente interno (assistentes,
 * modos e Cofre Inteligente). Avança sozinha e aceita swipe/abas.
 * Os casos são ilustrativos; a decisão clínica final é sempre do médico.
 */

type Kind = "chat" | "escuta" | "cofre";

interface DemoSlide {
  id: string;
  tab: string;
  icon: ComponentType<{ className?: string }>;
  kicker: string;
  title: string;
  benefit: string;
  bullets: string[];
  path: string;
  pills: string[];
  kind: Kind;
  input?: string;
  attachment?: string;
  response?: string;
  footerChip?: string;
}

const SLIDES: DemoSlide[] = [
  {
    id: "clinicus",
    tab: "Clínicus",
    icon: Stethoscope,
    kicker: "Assistente · Documentação",
    title: "Do rascunho à anamnese completa",
    benefit: "Você escreve do seu jeito, abreviado. O Clínicus devolve no padrão do prontuário.",
    bullets: ["Títulos padronizados", "Nada inventado: o que faltar fica como \"não informado\"", "Contextos de emergência, enfermaria e UTI"],
    path: "clinicus",
    pills: ["Anamnese", "Contexto: Emergência"],
    kind: "chat",
    input: "masc 67a, dor toracica tipica ha 2h, sudorese. HAS, DM2. PA 160x90 FC 98 SpO2 95%. ECG supra ST V2-V4",
    response:
      "IDENTIFICAÇÃO\nMasculino, 67 anos.\n\nQUEIXA PRINCIPAL\nDor torácica há 2 horas.\n\nHISTÓRIA DA DOENÇA ATUAL\nDor torácica típica iniciada há 2 horas, associada a sudorese.\n\nANTECEDENTES\n• Hipertensão arterial sistêmica\n• Diabetes mellitus tipo 2\n\nEXAME FÍSICO\nPA 160x90 mmHg · FC 98 bpm · SpO2 95%\n\nEXAMES\nECG: supradesnivelamento do segmento ST em V2-V4.",
  },
  {
    id: "examinus",
    tab: "Examinus",
    icon: Activity,
    kicker: "Assistente · Exames",
    title: "Exames colados, organizados em segundos",
    benefit: "Cole o laboratório como vier. Sai separado por sistema, com setas e alertas.",
    bullets: ["Leitura de PDF e foto do laudo", "Valores alterados sinalizados", "Formato pronto para a evolução"],
    path: "examinus",
    pills: ["Separador |", "Alertas"],
    kind: "chat",
    input: "Hb 9,8 Leuco 14200 Plaq 180mil Cr 2,1 Ur 88 Na 134 K 5,6 PCR 120 Lactato 3,1",
    response:
      "HEMOGRAMA\nHb 9,8 ↓ | Leuc 14.200 ↑ | Plaq 180.000\n\nFUNÇÃO RENAL E ELETRÓLITOS\nCr 2,1 ↑ | Ur 88 ↑ | Na 134 ↓ | K 5,6 ↑\n\nINFLAMATÓRIOS\nPCR 120 ↑ | Lactato 3,1 ↑\n\nALERTAS\n• Potássio elevado: 5,6\n• Lactato elevado: 3,1",
  },
  {
    id: "prescriptus",
    tab: "Prescriptus",
    icon: Pill,
    kicker: "Assistente · Prescrição",
    title: "Receita pronta, só conferir e imprimir",
    benefit: "Diga o caso. O Modo Receita entrega a prescrição limpa, com posologia completa.",
    bullets: ["Receita simples e controle especial", "Alerta de alergia do paciente", "Modelos salvos para reutilizar"],
    path: "prescriptus",
    pills: ["Modo Receita"],
    kind: "chat",
    input: "Amigdalite bacteriana, adulta, 62 kg, sem alergias",
    response:
      "RECEITUÁRIO\n\nUSO ORAL\n\n1. Amoxicilina 500 mg — 30 cápsulas\nTomar 1 cápsula de 8 em 8 horas por 10 dias.\n\n2. Dipirona 500 mg — 1 caixa\nTomar 1 comprimido de 6 em 6 horas se dor ou febre, por até 3 dias.",
    footerChip: "Gerar PDF da receita",
  },
  {
    id: "codexus",
    tab: "CODexus",
    icon: FileText,
    kicker: "Assistente · CID e afastamento",
    title: "CID e dias de afastamento em um passo",
    benefit: "O modo D.A. sugere os CIDs do caso e os dias para trabalho administrativo e braçal.",
    bullets: ["2 a 5 CIDs para escolher", "Dias por tipo de trabalho", "Atalho direto para o atestado"],
    path: "codexus",
    pills: ["D.A. Dias & Afastamento"],
    kind: "chat",
    input: "Lombalgia aguda mecânica, pedreiro, sem sinais de alarme",
    response:
      "CID SUGERIDOS\n• M54.5 Dor lombar baixa\n• M54.4 Lumbago com ciática\n\nDIAS DE AFASTAMENTO\nTrabalho administrativo: 2 a 3 dias\nTrabalho braçal: 5 a 7 dias\n\nREAVALIAR SE\nDor irradiada, perda de força ou piora apesar do tratamento.",
    footerChip: "Emitir no Atestus",
  },
  {
    id: "mediscuss",
    tab: "Mediscuss",
    icon: MessagesSquare,
    kicker: "Assistente · Discussão de caso",
    title: "Um colega para discutir o caso difícil",
    benefit: "Raciocínio clínico direto, com diretriz por trás e sem completar o que você não informou.",
    bullets: ["Separa o que foi pedido do que foi feito", "Suspeita nunca vira diagnóstico", "Conduta objetiva para decidir"],
    path: "mediscuss",
    pills: ["Discussão"],
    kind: "chat",
    input: "IC FEr, creatinina subiu de 1,2 para 1,6 após iniciar sacubitril/valsartana. Suspendo?",
    response:
      "LEITURA DO CASO\nAumento de cerca de 33% da creatinina após o início do sacubitril/valsartana.\n\nO QUE PESA\n• Elevação de até 50% do basal é aceita pelas diretrizes de IC\n• Revisar volemia, dose do diurético e potássio\n\nCONDUTA A CONSIDERAR\nManter a medicação, checar potássio e repetir a função renal em 1 a 2 semanas.",
  },
  {
    id: "escuta",
    tab: "Modo Escuta",
    icon: Mic,
    kicker: "Modo · Consultório e emergência",
    title: "A consulta vira anamnese enquanto você atende",
    benefit: "Você conversa com o paciente. A MedStation ouve, transcreve e organiza no padrão do prontuário.",
    bullets: ["Consultório ou emergência", "Avaliação rápida ou admissão completa", "Transcrição em português médico"],
    path: "consultorio",
    pills: ["Emergência", "Avaliação rápida"],
    kind: "escuta",
    response:
      "QUEIXA PRINCIPAL\nFebre e tosse há 3 dias.\n\nHISTÓRIA DA DOENÇA ATUAL\nFebre e tosse há 3 dias, com falta de ar ao subir escadas.\n\nANTECEDENTES\nNão informado.",
  },
  {
    id: "operador",
    tab: "Modo Operador",
    icon: Workflow,
    kicker: "Modo · Central de operações",
    title: "Converte, organiza e indica o assistente certo",
    benefit: "Mande o laudo, o documento ou o pedido. O Operador transforma no formato que você precisa.",
    bullets: ["Converter documentos", "Organizar exames por data", "Indica o melhor assistente para o caso"],
    path: "operador",
    pills: ["Converter documento"],
    kind: "chat",
    input: "Transforme este laudo em texto curto para o prontuário",
    attachment: "laudo_tc_torax.pdf",
    response:
      "TC DE TÓRAX\nConsolidação em lobo inferior direito, sem derrame pleural.\n\nPARA O PRONTUÁRIO\nTC de tórax: consolidação em LID, sem derrame pleural.",
    footerChip: "Discutir no Mediscuss",
  },
  {
    id: "cofre",
    tab: "Cofre Inteligente",
    icon: NotebookPen,
    kicker: "Acervo clínico · Cofre Inteligente",
    title: "Tudo o que importa, guardado e fácil de achar",
    benefit: "Salve respostas dos assistentes, notas e arquivos em pastas. Ache tudo em segundos.",
    bullets: ["Pastas com favoritos no topo", "Salvar resposta com 1 clique", "PDFs, imagens e documentos"],
    path: "notes",
    pills: ["Pastas", "Arquivos", "Favoritos"],
    kind: "cofre",
  },
];

const TYPE_MS = 2600;
const HOLD_MS = 3800;
const TOTAL_MS = TYPE_MS + HOLD_MS;
const PAUSE_AFTER_TOUCH_MS = 15000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Tempo decorrido (ms) enquanto `running`; volta a zero quando `resetKey` muda. */
function useElapsed(running: boolean, resetKey: unknown, max: number) {
  const [elapsed, setElapsed] = useState(0);
  const acc = useRef(0);
  useEffect(() => {
    acc.current = 0;
    setElapsed(0);
  }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const start = Date.now() - acc.current;
    const id = window.setInterval(() => {
      const e = Math.min(max, Date.now() - start);
      acc.current = e;
      setElapsed(e);
      if (e >= max) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [running, resetKey, max]);
  return elapsed;
}

function DocText({ text, typing }: { text: string; typing?: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 text-[0.8rem] md:text-sm leading-relaxed">
      {lines.map((line, i) => {
        const isHeader = line.length > 2 && line === line.toUpperCase() && /[A-ZÀ-Ú]/.test(line) && !/^\d/.test(line);
        if (!line) return <div key={i} className="h-2" />;
        return (
          <p
            key={i}
            className={cn(isHeader ? "pt-0.5 text-[0.7rem] font-semibold tracking-[0.12em] text-primary" : "text-foreground/90")}
          >
            {line}
            {typing && i === lines.length - 1 && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary motion-safe:animate-stream-cursor" />
            )}
          </p>
        );
      })}
    </div>
  );
}

function ChatScreen({ slide, p }: { slide: DemoSlide; p: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const response = slide.response ?? "";
  const started = p > 0.08;
  const shown = response.slice(0, Math.floor(response.length * Math.min(1, Math.max(0, (p - 0.12) / 0.88))));
  const done = p >= 1;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  return (
    <div ref={scrollRef} className="h-full overflow-hidden px-3 md:px-5 py-4 space-y-3">
      <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm border border-border bg-muted/60 px-3.5 py-2.5 text-[0.8rem] md:text-sm text-foreground">
        {slide.attachment && (
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[0.7rem] text-muted-foreground">
            <Paperclip className="h-3 w-3" /> {slide.attachment}
          </span>
        )}
        <p>{slide.input}</p>
      </div>

      <div className="max-w-[96%] rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3 shadow-sm">
        {!started || shown.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary motion-safe:animate-thinking-logo" /> Pensando...
          </p>
        ) : (
          <DocText text={shown} typing={!done} />
        )}
        {done && (
          <div className="mt-3 flex flex-wrap items-center gap-2 motion-safe:animate-fade-in">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[0.68rem] text-muted-foreground">
              <Check className="h-3 w-3 text-primary" /> Copiado
            </span>
            {slide.footerChip && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[0.68rem] font-medium text-primary-foreground">
                {slide.footerChip} <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ESCUTA_LINES = [
  { who: "Paciente", text: "Doutor, faz três dias que estou com febre e tosse." },
  { who: "Médico", text: "Sente falta de ar?" },
  { who: "Paciente", text: "Um pouco, quando subo escada." },
];

function EscutaScreen({ slide, p }: { slide: DemoSlide; p: number }) {
  const linesShown = Math.min(ESCUTA_LINES.length, Math.floor(p / 0.14));
  const docP = Math.max(0, (p - 0.45) / 0.55);
  const response = slide.response ?? "";
  const shown = response.slice(0, Math.floor(response.length * Math.min(1, docP)));
  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3 px-3 md:px-5 py-4">
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          Ouvindo a consulta · 02:14
          <div className="ml-auto flex h-4 items-end gap-0.5" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-primary motion-safe:animate-thinking-dot"
                style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 5) * 120}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {ESCUTA_LINES.slice(0, linesShown).map((l) => (
            <p key={l.text} className="text-[0.78rem] motion-safe:animate-fade-in">
              <span className="font-medium text-foreground">{l.who}:</span>{" "}
              <span className="text-muted-foreground">{l.text}</span>
            </p>
          ))}
          {linesShown === 0 && <p className="text-[0.78rem] text-muted-foreground">...</p>}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Anamnese sendo montada</p>
        {shown ? <DocText text={shown} typing={docP < 1} /> : <p className="text-xs text-muted-foreground">Aguardando a conversa...</p>}
      </div>
    </div>
  );
}

const FOLDERS = [
  { name: "Plantão UTI", count: 18, fav: true },
  { name: "Protocolos", count: 9, fav: true },
  { name: "Consultório", count: 24, fav: false },
  { name: "Estudos", count: 12, fav: false },
];
const ITEMS = [
  { title: "Evolução leito 4", meta: "Salvo do Clínicus · agora", file: false },
  { title: "Protocolo sepse 1ª hora.pdf", meta: "Arquivo · Protocolos", file: true },
  { title: "Doses de drogas vasoativas", meta: "Nota fixada · Plantão UTI", file: false },
];

function CofreScreen({ p }: { p: number }) {
  const query = "sepse";
  const typedQuery = query.slice(0, Math.floor(query.length * Math.min(1, Math.max(0, (p - 0.55) / 0.2))));
  const itemsShown = Math.min(ITEMS.length, Math.floor(Math.max(0, p - 0.2) / 0.1));
  const filtered = typedQuery.length === query.length;
  return (
    <div className="h-full overflow-hidden px-3 md:px-5 py-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {FOLDERS.map((f, i) => (
          <div
            key={f.name}
            className={cn(
              "rounded-xl border bg-card p-2.5 transition-all duration-500",
              p > i * 0.04 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
              f.fav ? "border-primary/40" : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <Folder className="h-4 w-4 text-primary" />
              {f.fav && <Star className="h-3 w-3 fill-primary text-primary" />}
            </div>
            <p className="mt-2 truncate text-[0.75rem] font-medium">{f.name}</p>
            <p className="text-[0.65rem] text-muted-foreground">{f.count} itens</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[0.78rem]">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        {typedQuery ? <span>{typedQuery}</span> : <span className="text-muted-foreground">Buscar notas e arquivos</span>}
      </div>

      <div className="space-y-2">
        {ITEMS.slice(0, itemsShown).map((it) => {
          const hidden = filtered && !it.title.toLowerCase().includes(query);
          return (
            <div
              key={it.title}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-500 motion-safe:animate-fade-in",
                hidden && "opacity-30",
                filtered && !hidden && "border-primary/50 bg-primary/5",
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                {it.file ? <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> : <NotebookPen className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.78rem] font-medium">{it.title}</p>
                <p className="text-[0.65rem] text-muted-foreground">{it.meta}</p>
              </div>
            </div>
          );
        })}
      </div>

      {p > 0.3 && p < 0.55 && (
        <div className="ml-auto w-fit rounded-lg bg-foreground px-3 py-1.5 text-[0.7rem] text-background motion-safe:animate-fade-in">
          <Check className="mr-1 inline h-3 w-3" /> Salvo no Cofre
        </div>
      )}
    </div>
  );
}

function MockWindow({ slide, p, activeIndex }: { slide: DemoSlide; p: number; activeIndex: number }) {
  const Icon = slide.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_30px_80px_-40px_hsl(var(--foreground)/0.45)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <span className="ml-2 truncate rounded-md bg-background px-2 py-0.5 font-mono text-[0.62rem] text-muted-foreground">
          medstation-ai.com.br/{slide.path}
        </span>
      </div>
      <div className="flex h-[400px] md:h-[440px]">
        <aside className="hidden sm:flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-muted/30 py-3">
          {SLIDES.map((s, i) => {
            const I = s.icon;
            return (
              <span
                key={s.id}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  i === activeIndex ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <I className="h-4 w-4" />
              </span>
            );
          })}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 md:px-5 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="text-sm font-semibold">{slide.tab}</span>
            <div className="ml-auto flex gap-1.5 overflow-hidden">
              {slide.pills.map((pill) => (
                <span key={pill} className="whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[0.62rem] font-medium text-primary">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {slide.kind === "chat" && <ChatScreen slide={slide} p={p} />}
            {slide.kind === "escuta" && <EscutaScreen slide={slide} p={p} />}
            {slide.kind === "cofre" && <CofreScreen p={p} />}
          </div>
          {slide.kind !== "cofre" && (
            <div className="border-t border-border px-3 md:px-5 py-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[0.75rem] text-muted-foreground">
                <span className="flex-1 truncate">Escreva ou dite o caso...</span>
                <Mic className="h-3.5 w-3.5" />
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlatformDemo({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [emblaRef, api] = useEmblaCarousel({ loop: true, align: "center" });
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    const onPointer = () => setPausedUntil(Date.now() + PAUSE_AFTER_TOUCH_MS);
    api.on("select", onSelect);
    api.on("pointerDown", onPointer);
    return () => {
      api.off("select", onSelect);
      api.off("pointerDown", onPointer);
    };
  }, [api]);

  const elapsed = useElapsed(inView && !reduced, index, TOTAL_MS);
  const p = reduced ? 1 : Math.min(1, elapsed / TYPE_MS);

  // Avança sozinho, a menos que o médico tenha mexido há pouco.
  useEffect(() => {
    if (!api || reduced || !inView || elapsed < TOTAL_MS) return;
    const wait = Math.max(0, pausedUntil - Date.now());
    const id = window.setTimeout(() => api.scrollNext(), wait);
    return () => window.clearTimeout(id);
  }, [api, elapsed, inView, pausedUntil, reduced]);

  const go = useCallback(
    (i: number) => {
      setPausedUntil(Date.now() + PAUSE_AFTER_TOUCH_MS);
      api?.scrollTo(i);
      trackCtaClick({ cta: `demo_tab_${SLIDES[i].id}`, section: "black_demo", destination: "demo" });
    },
    [api],
  );

  return (
    <section ref={sectionRef} className={cn("space-y-6", className)} aria-label="Demonstração da plataforma">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Veja por dentro</p>
        <h2 className="mt-2 text-2xl md:text-4xl font-semibold tracking-tight">A MedStation trabalhando, em 8 telas</h2>
        <p className="mt-3 text-muted-foreground">
          Arraste para o lado ou toque em uma aba. Cada tela mostra em segundos o que hoje leva minutos no seu plantão.
        </p>
      </div>

      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pb-1" role="tablist">
          {SLIDES.map((s, i) => {
            const I = s.icon;
            const active = i === index;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go(i)}
                className={cn(
                  "relative overflow-hidden rounded-full border px-3.5 py-2 text-xs md:text-sm font-medium transition-colors",
                  active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <I className="h-3.5 w-3.5" /> {s.tab}
                </span>
                {active && !reduced && (
                  <span
                    className="absolute bottom-0 left-0 h-0.5 bg-offer-gold"
                    style={{ width: `${(elapsed / TOTAL_MS) * 100}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {SLIDES.map((s, i) => (
              <div key={s.id} className="min-w-0 shrink-0 grow-0 basis-full px-1" aria-hidden={i !== index}>
                <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 items-center">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{s.kicker}</p>
                    <h3 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground">{s.benefit}</p>
                    <ul className="mt-4 space-y-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <MockWindow slide={s} p={i === index ? p : 0} activeIndex={i} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[0.7rem] text-muted-foreground">Casos ilustrativos. A decisão clínica final é sempre do médico.</p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Tela anterior"
              onClick={() => go((index - 1 + SLIDES.length) % SLIDES.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima tela"
              onClick={() => go((index + 1) % SLIDES.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
