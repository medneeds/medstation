import { getAgentSuggestions } from "@/lib/agentIntro";
import { OutputControl } from "@/components/chat/OutputControl";
import { AssistantGlyph } from "@/components/AssistantGlyph";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, AlertTriangle, Stethoscope, ScanLine, X } from "lucide-react";
import {
  MAX_RADIOLOGY_IMAGES,
  RADIOLOGY_ACCEPT_ATTR,
  appendRadiologyFiles,
  buildRadiologyRequestBody,
  canSendRadiologyMessage,
  collectRadiologyEvidenceIds,
  describeRadiologyMessage,
  formatBytes,
  normalizeRadiologyPrompt,
  radiologyAssistantMessageMetadata,
  radiologyChipLabel,
  radiologyEvidenceMetadata,
  radiologyStoragePath,
  radiologyUserMessageMetadata,
  resolveExaminusModes,
  routeExaminusFiles,
  selectEvidenceIdsForRequest,
  type RadiologyMime,
  type RadiologyOutputMode,
} from "@/lib/radiologyInterpreter";
import { exportAgentConversationToPDF } from "@/utils/pdfExport";
import { pdfToImages } from "@/utils/pdfToImages";
import { AgentVoiceInput } from "@/components/AgentVoiceInput";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { StructuredResponse } from "@/components/chat/StructuredResponse";
import { CaseSuggestionsPanel } from "@/components/chat/CaseSuggestionsPanel";

import { useSubscription } from "@/contexts/SubscriptionContext";

import { 
  Send, 
  Paperclip, 
  Plus, 
  History,
  FolderOpen,
  Edit2,
  Trash2,
  Copy,
  Check,
  FileDown,
  FileText,
  FileUp,
  SeparatorVertical,
  Clock,
  Pill,
  ScrollText,
  ListChecks,
  Zap,
  Minimize2,
  Lightbulb,
  Maximize2,
  ChevronDown,
  Expand,
  Shrink,
  LayoutPanelLeft,

  BookOpen,
  ClipboardList
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";

const AGENTS_WITH_CONTROLS = new Set([
  "examinus",
  "clinicus",
  "prescriptus",
  "gasometrus",
  "codexus",
  "mediscuss",
  "legalis",
]);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  audioBlob?: Blob;
  audioUrl?: string;
  transcription?: string;
  pending?: boolean;
  /** Metadados persistidos (ex.: Interpretador — IDs das radiografias em contexto). Nunca contém base64. */
  metadata?: unknown;
  /** Pré-visualizações locais (object URLs) da mensagem otimista; não persistidas. */
  attachments?: { previewUrl: string; name: string }[];
}

/** Radiografia pendente de envio no Interpretador (Examinus). */
interface RadiologyAttachment {
  id: string;
  file: File;
  mime: RadiologyMime;
  previewUrl: string;
  name: string;
  size: number;
}

/**
 * Consome um stream SSE no formato OpenAI (`data: {choices:[{delta:{content}}]}`),
 * chamando `onContent` com o texto acumulado a cada delta. Retorna o texto final.
 */
async function readAssistantSSE(
  body: ReadableStream<Uint8Array>,
  onContent: (accumulated: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let accumulated = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { finished = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          accumulated += content;
          onContent(accumulated);
        }
      } catch {
        // JSON incompleto — devolve ao buffer e aguarda mais dados
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
  return accumulated;
}

interface Conversation {
  id: string;
  name: string;
  last_message: string;
  updated_at: string;
  agent_type: string;
  case_id: string | null;
  messages: Message[];
}

interface AgentChatProps {
  agentName: string;
  agentIcon: React.ReactNode;
  agentColor: string;
  agentType: string;
  caseId?: string;
  placeholder?: string;
  actionButtons?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
}

interface CaseOption {
  id: string;
  title: string;
  patient_name: string;
}

const MEDISCUSS_MODES = [
  { value: "auto", label: "Automático" },
  { value: "parecer_curto", label: "Parecer curto" },
  { value: "parecer_completo", label: "Parecer completo" },
  { value: "discussao", label: "Discussão clínica" },
  { value: "internacao", label: "Internação" },
  { value: "uti", label: "UTI" },
  { value: "transferencia", label: "Transferência / Regulação" },
  { value: "evolucao", label: "Evolução p/ discussão" },
];

const MEDISCUSS_SPECIALTIES = [
  { value: "auto", label: "Geral / Automático" },
  { value: "cardiologia", label: "Cardiologia" },
  { value: "neurologia", label: "Neurologia" },
  { value: "neurocirurgia", label: "Neurocirurgia" },
  { value: "cirurgia", label: "Cirurgia Geral" },
  { value: "infectologia", label: "Infectologia" },
  { value: "hematologia", label: "Hematologia" },
  { value: "nefrologia", label: "Nefrologia" },
  { value: "ortopedia", label: "Ortopedia" },
];

const LEGALIS_MODES = [
  { value: "auto", label: "Automático" },
  { value: "consulta_etica", label: "Consulta ética (CFM)" },
  { value: "blindagem", label: "Blindagem de registro" },
  { value: "defesa", label: "Defesa argumentativa" },
  { value: "documento", label: "Documento de proteção" },
];

const LEGALIS_SCENARIOS = [
  { value: "auto", label: "Automático" },
  { value: "emergencia", label: "Emergência" },
  { value: "uti", label: "UTI" },
  { value: "enfermaria", label: "Enfermaria" },
  { value: "consultorio", label: "Consultório" },
  { value: "telemedicina", label: "Telemedicina" },
  { value: "plantao", label: "Plantão / Regulação" },
];

const LEGALIS_TOPICS = [
  { value: "auto", label: "Geral" },
  { value: "responsabilidade", label: "Responsabilidade civil" },
  { value: "etico_profissional", label: "Ético-profissional (CRM)" },
  { value: "sigilo", label: "Sigilo e LGPD" },
  { value: "consentimento", label: "Consentimento / Recusa" },
  { value: "menor_incapaz", label: "Menor / Incapaz" },
  { value: "fim_de_vida", label: "Fim de vida" },
  { value: "prontuario", label: "Prontuário e atestados" },
  { value: "relacao_institucional", label: "Relação institucional" },
];


const CLINICUS_CONTEXTS = [
  { value: "consultorio", label: "Consultório" },
  { value: "enfermaria", label: "Enfermaria / Clínica Médica" },
  { value: "emergencia_inicial", label: "Emergência · Avaliação Inicial" },
  { value: "emergencia_completa", label: "Emergência · Admissão Completa" },
  { value: "uti_admissao", label: "UTI · Admissão (Paciente Crítico)" },
  { value: "uti_evolucao", label: "UTI · Evolução / Plantão" },
] as const;

type ClinicusContext = (typeof CLINICUS_CONTEXTS)[number]["value"];

const CLINICUS_REPORT_TYPES = [
  { value: "relatorio_medico", label: "Relatório médico" },
  { value: "passagem_caso", label: "Passagem de caso" },
  { value: "relatorio_administrativo_internacao", label: "Relatório de internação" },
] as const;

type ClinicusReportType = (typeof CLINICUS_REPORT_TYPES)[number]["value"];

const CLINICUS_REPORT_PURPOSES = [
  { value: "geral", label: "Finalidade geral" },
  { value: "justificar_exame", label: "Justificar exame" },
  { value: "justificar_internacao", label: "Justificar internação" },
  { value: "justificar_medicacao", label: "Justificar medicação / alto custo" },
  { value: "convenio_pericia", label: "Convênio / perícia" },
  { value: "encaminhamento", label: "Encaminhamento" },
] as const;

const CLINICUS_HANDOFF_TARGETS = [
  { value: "auto", label: "Sem especialidade definida" },
  { value: "clinica_medica", label: "Clínica Médica" },
  { value: "cardiologia", label: "Cardiologia" },
  { value: "neurologia", label: "Neurologia" },
  { value: "neurocirurgia", label: "Neurocirurgia" },
  { value: "cirurgia", label: "Cirurgia Geral" },
  { value: "infectologia", label: "Infectologia" },
  { value: "nefrologia", label: "Nefrologia" },
  { value: "hematologia", label: "Hematologia" },
  { value: "ortopedia", label: "Ortopedia" },
  { value: "uti", label: "Terapia Intensiva (UTI)" },
  { value: "plantao", label: "Plantão seguinte (mesmo setor)" },
] as const;

/** Cursor de digitação exibido no fim do texto em streaming. */
function StreamCursor() {
  return (
    <>
      <span className="inline-block w-[2px] h-3.5 ml-0.5 align-[-2px] bg-primary animate-stream-cursor" />
      <span
        className="inline-flex items-baseline gap-0.5 ml-2 align-baseline text-primary/80"
        aria-label="digitando"
        role="status"
      >
        <span className="sr-only">digitando</span>
        <span className="animate-thinking-dot text-base leading-none">•</span>
        <span className="animate-thinking-dot [animation-delay:0.18s] text-base leading-none">•</span>
        <span className="animate-thinking-dot [animation-delay:0.36s] text-base leading-none">•</span>
      </span>
    </>
  );
}

/**
 * Card compacto de resposta do assistente no Modo Workflow.
 * Evita duplicar o documento exibido no painel principal: mostra apenas
 * um indicador + prévia da primeira linha, apontando para o documento.
 */
function WorkflowAnswerChip({ content, streaming }: { content: string; streaming?: boolean }) {
  const trimmed = (content || "").replace(/\*\*/g, "").trim();
  const firstLine = trimmed.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
  const preview = firstLine.length > 96 ? firstLine.slice(0, 96) + "…" : firstLine;
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 text-xs">
        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-medium text-foreground/80">
          {streaming ? "Gerando documento…" : "Documento gerado"}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
          Ver no documento →
        </span>
      </div>
      {!streaming && preview && (
        <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed break-words">
          {preview}
        </p>
      )}
    </div>
  );
}




export function AgentChat({ 
  agentName, 
  agentIcon, 
  agentColor,
  agentType,
  caseId,
  placeholder = "Digite sua mensagem...",
  actionButtons = []
}: AgentChatProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { subscribed } = useSubscription();
  const [message, setMessage] = useState("");
  // Assinantes: sem limite de caracteres. Cadastrados sem assinatura: 30.000.
  const FREE_CHAR_LIMIT = 30000;
  const charLimit = subscribed ? Infinity : FREE_CHAR_LIMIT;
  const overLimit = message.length > charLimit;
  const nearLimit = !subscribed && message.length >= FREE_CHAR_LIMIT * 0.9;


  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [lastConversation, setLastConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(caseId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [usePipeSeparator, setUsePipeSeparator] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [onlyAltered, setOnlyAltered] = useState(false);
  const [clinicalImpression, setClinicalImpression] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [examSuggestMode, setExamSuggestMode] = useState(false);
  // Interpretador (Examinus) — V1: radiografia de tórax. Exclusivo com o Consultor.
  const [radiologyInterpretMode, setRadiologyInterpretMode] = useState(false);
  const [radiologyAttachments, setRadiologyAttachments] = useState<RadiologyAttachment[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const radiologyActive = agentType === "examinus" && radiologyInterpretMode;
  const radiologyHistoricalIds = radiologyActive
    ? collectRadiologyEvidenceIds(currentConversation?.messages ?? [])
    : [];
  const canSend = radiologyActive
    ? canSendRadiologyMessage({ text: message, pendingCount: radiologyAttachments.length, historicalCount: radiologyHistoricalIds.length })
    : message.trim().length > 0;

  /** Liga/desliga Consultor e Interpretador mantendo a exclusividade mútua. */
  const setExaminusModes = (change: { consultor?: boolean; interpretador?: boolean }) => {
    const next = resolveExaminusModes({ examSuggestMode, radiologyInterpretMode }, change);
    setExamSuggestMode(next.examSuggestMode);
    setRadiologyInterpretMode(next.radiologyInterpretMode);
    if (!next.radiologyInterpretMode && radiologyAttachments.length > 0) {
      // Ao sair do Interpretador, descarta as imagens ainda não enviadas.
      setRadiologyAttachments([]);
    }
  };

  // Libera as object URLs das pré-visualizações ao desmontar.
  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
    };
  }, []);
  const [directAHEMode, setDirectAHEMode] = useState(false);
  const [aheTemplate, setAheTemplate] = useState<ClinicusContext>("enfermaria");
  const [reportMode, setReportMode] = useState(false);
  const [reportType, setReportType] = useState<ClinicusReportType>("relatorio_medico");
  const [reportPurpose, setReportPurpose] = useState("geral");
  const [reportSpecialty, setReportSpecialty] = useState("auto");
  const [bulaInteligenteMode, setBulaInteligenteMode] = useState(false);
  const [receitaMode, setReceitaMode] = useState(false);
  const [directLIMode, setDirectLIMode] = useState(false);
  const [quickCIDMode, setQuickCIDMode] = useState(false);
  const [mediscussMode, setMediscussMode] = useState("auto");
  const [mediscussSpecialty, setMediscussSpecialty] = useState("auto");
  const [legalisMode, setLegalisMode] = useState("auto");
  const [legalisScenario, setLegalisScenario] = useState("auto");
  const [legalisTopic, setLegalisTopic] = useState("auto");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [workflowMode, setWorkflowMode] = useState(false);
  const [readingMessage, setReadingMessage] = useState<Message | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsContent, setSuggestionsContent] = useState("");
  // Modo Workflow e leitura estruturada disponíveis para todos os assistentes (desktop)
  const workflowAvailable = !isMobile;
  // Sugestões para o caso: só no Clínicus e apenas quando já existe caso analisável
  const caseSuggestionsAvailable =
    agentType === "clinicus" &&
    (currentConversation?.messages ?? []).some(
      (m) => m.id !== "streaming-temp" && !!m.content?.trim(),
    );


  // Conteúdo enviado de outra tela (ex.: Modo Escuta)
  useEffect(() => {
    const prefill = sessionStorage.getItem("agent-prefill");
    if (prefill) {
      setMessage(prefill);
      sessionStorage.removeItem("agent-prefill");
    }
  }, []);

  // ESC to exit focus mode

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusMode(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  // Modo Workflow: só em telas grandes; sai com ESC
  useEffect(() => {
    if (!workflowAvailable && workflowMode) setWorkflowMode(false);
  }, [workflowAvailable, workflowMode]);

  useEffect(() => {
    if (!workflowMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWorkflowMode(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workflowMode]);



  // Auto-resize textarea based on content
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = inputExpanded ? 400 : 200;
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }, [message, inputExpanded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  useEffect(() => {
    fetchCases();
    loadConversations();
    loadLastConversation();
  }, [agentType]);

  // Save current conversation to localStorage when it changes
  useEffect(() => {
    if (currentConversation && currentConversation.messages.length > 0) {
      const convToSave = {
        ...currentConversation,
        messages: currentConversation.messages.slice(-20) // Save only last 20 messages
      };
      localStorage.setItem(`${agentType}_last_conversation`, JSON.stringify(convToSave));
      setLastConversation(convToSave);
    }
  }, [currentConversation, agentType]);

  // Load last conversation from localStorage on mount
  const loadLastConversation = () => {
    const saved = localStorage.getItem(`${agentType}_last_conversation`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) {
          setLastConversation(parsed);
        }
      } catch (e) {
        console.error("Error loading last conversation:", e);
      }
    }
  };

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", agentType)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data.map(conv => ({
        ...conv,
        messages: []
      })));
    }
  };

  const fetchCases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("cases")
      .select(`
        id,
        title,
        patients (name)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setCases(
        data.map((c: any) => ({
          id: c.id,
          title: c.title,
          patient_name: c.patients?.name || "Sem paciente",
        }))
      );
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      return data.map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      })) as Message[];
    }
    return [];
  };

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save current conversation as last conversation before creating new one
    if (currentConversation && currentConversation.messages.length > 0) {
      const convToSave = {
        ...currentConversation,
        messages: currentConversation.messages.slice(-20)
      };
      localStorage.setItem(`${agentType}_last_conversation`, JSON.stringify(convToSave));
      setLastConversation(convToSave);
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        agent_type: agentType,
        name: `Conversa ${conversations.length + 1}`,
        case_id: selectedCaseId || null
      })
      .select()
      .single();

    if (!error && data) {
      const newConv: Conversation = {
        ...data,
        messages: []
      };
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
    }
  };

  const restoreLastConversation = () => {
    if (lastConversation) {
      setCurrentConversation(lastConversation);
      setLastConversation(null);
    }
  };

  /**
   * Sugestões para o caso (Clínicus): análise crítica em painel lateral.
   * Não grava mensagem na conversa nem altera o documento gerado.
   */
  const runCaseSuggestions = async () => {
    if (suggestionsLoading || isLoading) return;
    const history = (currentConversation?.messages ?? []).filter(
      (m) => m.id !== "streaming-temp" && !!m.content?.trim(),
    );
    if (history.length === 0) return;

    setSuggestionsOpen(true);
    setSuggestionsLoading(true);
    setSuggestionsContent("");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            {
              role: "user",
              content:
                "Gere as SUGESTÕES PARA O CASO com base exclusivamente nas informações já enviadas nesta conversa.",
            },
          ],
          agentType,
          caseId: selectedCaseId,
          caseSuggestMode: true,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Falha ao gerar sugestões");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              acc += content;
              setSuggestionsContent(acc);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      toast({
        title: "Não foi possível gerar as sugestões",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSuggestionsLoading(false);
    }
  };


  /**
   * Interpretador (Examinus): envia a(s) radiografia(s) ORIGINAL(is) ao motor multimodal
   * `radiograph-interpret`. Fluxo: upload no bucket privado → registro em `evidences`
   * → chamada com IDs (nunca base64) → streaming da leitura.
   */
  const sendRadiologyMessage = async () => {
    if (isLoading) return;
    const pendingFiles = radiologyAttachments;
    const historicalIds = radiologyHistoricalIds;

    if (!canSendRadiologyMessage({ text: message, pendingCount: pendingFiles.length, historicalCount: historicalIds.length })) {
      const msg = "Anexe uma radiografia de tórax (JPEG, PNG ou WebP) para interpretar.";
      setValidationAnnouncement("");
      setTimeout(() => setValidationAnnouncement(msg), 50);
      toast({ title: "Nenhuma radiografia anexada", description: msg, variant: "destructive" });
      return;
    }
    setValidationAnnouncement("");

    const messageContent = normalizeRadiologyPrompt(message);
    const baseConversation = currentConversation;

    // OPTIMISTIC UI
    const optimisticUserId = `optimistic-user-${Date.now()}`;
    const optimisticUserMessage: Message = {
      id: optimisticUserId,
      role: "user",
      content: messageContent,
      created_at: new Date().toISOString(),
      pending: true,
      attachments: pendingFiles.map((a) => ({ previewUrl: a.previewUrl, name: a.name })),
      metadata: pendingFiles.length > 0 ? radiologyUserMessageMetadata([], pendingFiles.length) : undefined,
    };
    const thinkingMessage: Message = {
      id: "streaming-temp",
      role: "assistant",
      content: pendingFiles.length > 0 ? "Analisando a radiografia..." : "Pensando...",
      created_at: new Date().toISOString(),
    };
    const optimisticConversation: Conversation = baseConversation
      ? { ...baseConversation, messages: [...baseConversation.messages, optimisticUserMessage, thinkingMessage] }
      : {
          id: `optimistic-conv-${Date.now()}`,
          name: `Conversa ${conversations.length + 1}`,
          last_message: messageContent,
          updated_at: new Date().toISOString(),
          agent_type: agentType,
          case_id: selectedCaseId || null,
          messages: [optimisticUserMessage, thinkingMessage],
        };

    flushSync(() => {
      setMessage("");
      setRadiologyAttachments([]);
      setIsLoading(true);
      setCurrentConversation(optimisticConversation);
    });

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !session) {
      setCurrentConversation(baseConversation);
      setRadiologyAttachments(pendingFiles);
      setIsLoading(false);
      toast({ title: "Sessão expirada", description: "Faça login novamente para continuar a conversa.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    let conversation = baseConversation;
    const uploadedPaths: string[] = [];
    let uploadsComplete = false;

    try {
      if (!conversation) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            agent_type: agentType,
            name: `Conversa ${conversations.length + 1}`,
            case_id: selectedCaseId || null,
          })
          .select()
          .single();
        if (error) throw new Error("Não foi possível criar a conversa.");
        conversation = { ...data, messages: [] };
        setConversations((prev) => [conversation!, ...prev]);
        setCurrentConversation((prev) => ({
          ...conversation!,
          messages: prev?.messages ?? [optimisticUserMessage, thinkingMessage],
        }));
      }

      // 1) Upload das imagens originais para o bucket privado + registro em `evidences`
      const newIds: string[] = [];
      const batchStamp = Date.now();
      for (let i = 0; i < pendingFiles.length; i++) {
        const att = pendingFiles[i];
        const filePath = radiologyStoragePath(user.id, att.mime, i, batchStamp);
        const { error: uploadError } = await supabase.storage
          .from("evidences")
          .upload(filePath, att.file, { contentType: att.mime, upsert: false });
        if (uploadError) {
          console.error("[interpretador] upload error:", uploadError.message);
          throw new Error(`Não foi possível enviar "${att.name}". Verifique sua conexão e tente novamente.`);
        }
        uploadedPaths.push(filePath);

        const { data: evidenceRow, error: evidenceError } = await supabase
          .from("evidences")
          .insert({
            user_id: user.id,
            case_id: selectedCaseId || null,
            type: "image",
            source_type: "upload",
            title: att.name,
            file_path: filePath,
            file_size: att.size,
            metadata: radiologyEvidenceMetadata(att.mime),
            tags: ["radiografia", "torax", "interpretador"],
            origin: "examinus_interpretador",
            is_active: true,
          })
          .select("id")
          .single();
        if (evidenceError || !evidenceRow) {
          console.error("[interpretador] evidence insert error:", evidenceError?.message);
          throw new Error(`Não foi possível registrar "${att.name}". Tente novamente.`);
        }
        newIds.push(evidenceRow.id);
      }
      uploadsComplete = true;

      const evidenceIds = selectEvidenceIdsForRequest(newIds, historicalIds);
      const userMetadata = radiologyUserMessageMetadata(evidenceIds, newIds.length);

      // 2) Persiste a mensagem do usuário (com IDs, sem base64) — em segundo plano
      const userInsertPromise = supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: messageContent,
          metadata: userMetadata,
        })
        .select()
        .single();

      userInsertPromise.then(({ data: userMsgData, error: userError }) => {
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => {
              if (m.id !== optimisticUserId) return m;
              if (userError || !userMsgData) return { ...m, pending: false, metadata: userMetadata };
              return {
                ...userMsgData,
                role: userMsgData.role as "user" | "assistant",
                pending: false,
                attachments: m.attachments,
              };
            }),
          };
        });
      });

      const userMessage: Message = { ...optimisticUserMessage, metadata: userMetadata };

      // 3) Chamada ao motor multimodal (streaming)
      const body = buildRadiologyRequestBody({
        messages: [...conversation.messages, userMessage],
        evidenceIds,
        caseId: selectedCaseId,
        outputMode: "auto",
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radiograph-interpret`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        let detail = "Falha ao conectar com o Interpretador.";
        try {
          const err = await response.json();
          if (typeof err?.error === "string" && err.error) detail = err.error;
        } catch { /* corpo não-JSON */ }
        throw new Error(detail);
      }

      const outputMode = (response.headers.get("X-Radiology-Output-Mode") as RadiologyOutputMode | null) ?? "auto";

      const assistantContent = await readAssistantSSE(response.body, (accumulated) => {
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => (m.id === "streaming-temp" ? { ...m, content: accumulated } : m)),
          };
        });
      });

      if (!assistantContent.trim()) {
        throw new Error("O Interpretador não retornou uma leitura. Tente novamente.");
      }

      // 4) Persiste a resposta
      const { data: assistantMsgData, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: assistantContent,
          metadata: radiologyAssistantMessageMetadata(evidenceIds, outputMode),
        })
        .select()
        .single();
      if (assistantError) throw assistantError;

      const assistantMessage: Message = { ...assistantMsgData, role: assistantMsgData.role as "user" | "assistant" };
      const persistedUser = await userInsertPromise;
      const finalUserMessage: Message = persistedUser.data
        ? { ...persistedUser.data, role: "user", attachments: optimisticUserMessage.attachments }
        : { ...userMessage, pending: false };
      const finalMessages = [...conversation.messages, finalUserMessage, assistantMessage];

      const lastPreview = pendingFiles.length > 0
        ? `Radiografia (${pendingFiles.length}) · ${messageContent}`
        : messageContent;
      await supabase
        .from("conversations")
        .update({ last_message: lastPreview, updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      setCurrentConversation({ ...conversation, messages: finalMessages, last_message: lastPreview });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation!.id ? { ...c, last_message: lastPreview, updated_at: new Date().toISOString() } : c)),
      );
    } catch (error: any) {
      console.error("[interpretador] error:", error);

      // Remove a resposta em andamento e a mensagem otimista quando nada foi persistido
      setCurrentConversation((prev) => {
        if (!prev) return prev;
        const kept = prev.messages.filter((m) => m.id !== "streaming-temp" && (uploadsComplete || m.id !== optimisticUserId));
        return { ...prev, messages: kept };
      });

      if (!uploadsComplete) {
        // Devolve as imagens à fila para o médico tentar de novo sem reanexar
        setRadiologyAttachments(pendingFiles);
        setMessage((prev) => prev || (messageContent === normalizeRadiologyPrompt("") ? "" : messageContent));
        if (uploadedPaths.length > 0) {
          void supabase.storage.from("evidences").remove(uploadedPaths);
        }
      }

      toast({
        title: "Não foi possível interpretar",
        description: error?.message || "Falha ao processar a radiografia.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (isLoading) return;
    if (radiologyActive) {
      await sendRadiologyMessage();
      return;
    }
    if (!message.trim()) {
      const msg = "Mensagem vazia. Digite algum texto antes de enviar.";
      setValidationAnnouncement("");
      // re-set on next tick so screen readers re-announce repeated attempts
      setTimeout(() => setValidationAnnouncement(msg), 50);
      toast({
        title: "Mensagem vazia",
        description: "Digite algo antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    setValidationAnnouncement("");

    const messageContent = message;
    const baseConversation = currentConversation;

    // OPTIMISTIC UI: clear input + show user bubble + thinking instantly
    // (BEFORE any await — so the first paint happens in the same frame as the click)
    const optimisticUserId = `optimistic-user-${Date.now()}`;
    const optimisticUserMessage: Message = {
      id: optimisticUserId,
      role: "user",
      content: messageContent,
      created_at: new Date().toISOString(),
      pending: true,
    };
    const thinkingMessage: Message = {
      id: "streaming-temp",
      role: "assistant",
      content: "Pensando...",
      created_at: new Date().toISOString(),
    };

    // Temporary local conversation shell so the bubble renders even before
    // the real conversation row is created in the backend.
    const optimisticConversation: Conversation = baseConversation
      ? {
          ...baseConversation,
          messages: [...baseConversation.messages, optimisticUserMessage, thinkingMessage],
        }
      : {
          id: `optimistic-conv-${Date.now()}`,
          name: `Conversa ${conversations.length + 1}`,
          last_message: messageContent,
          updated_at: new Date().toISOString(),
          agent_type: agentType,
          case_id: selectedCaseId || null,
          messages: [optimisticUserMessage, thinkingMessage],
        };

    flushSync(() => {
      setMessage("");
      setIsLoading(true);
      setCurrentConversation(optimisticConversation);
    });

    // Now do the async work (session check, persistence, AI call) — UI is already painted.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      // rollback optimistic UI
      setCurrentConversation(baseConversation);
      setIsLoading(false);
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para continuar a conversa.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    let conversation = baseConversation;

    try {
      // Create conversation if it doesn't exist (background)
      if (!conversation) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            agent_type: agentType,
            name: `Conversa ${conversations.length + 1}`,
            case_id: selectedCaseId || null,
          })
          .select()
          .single();

        if (error) throw new Error("Não foi possível criar a conversa.");

        conversation = { ...data, messages: [] };
        setConversations((prev) => [conversation!, ...prev]);
        setCurrentConversation((prev) => ({
          ...conversation!,
          messages: prev?.messages ?? [optimisticUserMessage, thinkingMessage],
        }));
      }

      // Persist user message in background; do NOT block UI
      const userInsertPromise = supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: messageContent,
        })
        .select()
        .single();

      // Reconcile optimistic ID once persisted (non-blocking) and clear pending state
      userInsertPromise.then(({ data: userMsgData, error: userError }) => {
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => {
              if (m.id !== optimisticUserId) return m;
              if (userError || !userMsgData) {
                return { ...m, pending: false };
              }
              return { ...userMsgData, role: userMsgData.role as "user" | "assistant", pending: false };
            }),
          };
        });
      });

      const userMessage: Message = optimisticUserMessage;


      // Call AI agent with streaming
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...conversation.messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentType,
          caseId: selectedCaseId,
          ...(agentType === "examinus" && { usePipeSeparator, includeTime, onlyAltered, clinicalImpression, compactMode, examSuggestMode }),
          ...(agentType === "clinicus" && { directAHEMode, aheTemplate, reportMode, reportType, reportPurpose, reportSpecialty }),
          ...(agentType === "prescriptus" && { bulaInteligenteMode, receitaMode }),
          ...(agentType === "gasometrus" && { directLIMode }),
          ...(agentType === "codexus" && { quickCIDMode }),
          ...(agentType === "mediscuss" && { mediscussMode, mediscussSpecialty }),
          ...(agentType === "legalis" && { legalisMode, legalisScenario, legalisTopic })

        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Falha ao conectar com o assistente");
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              if (agentType === "clinicus") {
                assistantContent = assistantContent.replace(/\*\*/g, "");
              }
              // Update UI with new content
              setCurrentConversation(prev => {
                if (!prev) return prev;
                const updatedMessages = prev.messages.map(m => 
                  m.id === "streaming-temp" ? { ...m, content: assistantContent } : m
                );
                return { ...prev, messages: updatedMessages };
              });
            }
          } catch {
            // Incomplete JSON, put back and wait for more data
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final assistant message to database
      const { data: assistantMsgData, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: assistantContent
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      const assistantMessage: Message = {
        ...assistantMsgData,
        role: assistantMsgData.role as "user" | "assistant"
      };

      // Replace streaming message with final saved message
      const finalMessages = [...conversation.messages, userMessage, assistantMessage];
      
      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message: messageContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", conversation.id);

      setCurrentConversation({ ...conversation, messages: finalMessages, last_message: messageContent });
      setConversations(conversations.map(c => 
        c.id === conversation.id 
          ? { ...c, last_message: messageContent, updated_at: new Date().toISOString() } 
          : c
      ));

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Remove streaming message on error
      if (conversation) {
        const messagesWithoutStreaming = conversation.messages.filter(m => m.id !== "streaming-temp");
        setCurrentConversation({ ...conversation, messages: messagesWithoutStreaming });
      }
      
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível processar sua mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (!error) {
      setConversations(conversations.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    }
  };

  const renameConversation = async (conversationId: string, newName: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ name: newName })
      .eq("id", conversationId);

    if (!error) {
      setConversations(conversations.map(c => 
        c.id === conversationId ? { ...c, name: newName } : c
      ));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation({ ...currentConversation, name: newName });
      }
      setEditingConversationId(null);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    const messages = await loadConversationMessages(conversation.id);
    setCurrentConversation({ ...conversation, messages });
    setHistoryOpen(false); // Close the history sidebar after loading
  };

  // Handle voice transcription
  const handleVoiceTranscription = (transcription: string) => {
    setMessage(transcription);
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast({
        title: "Copiado 👏",
        description: "Cole direto no prontuário.",
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const exportConversation = () => {
    if (!currentConversation || currentConversation.messages.length === 0) {
      toast({
        title: "Nenhuma conversa",
        description: "Não há mensagens para exportar.",
        variant: "destructive",
      });
      return;
    }

    const messagesToExport = currentConversation.messages.map(m => ({
      ...m,
      timestamp: new Date(m.created_at)
    }));
    exportAgentConversationToPDF(agentName, messagesToExport);
    
    toast({
      title: "PDF gerado!",
      description: "A conversa foi exportada com sucesso.",
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  /**
   * Interpretador (Examinus): enfileira radiografias originais para envio.
   * Só JPEG/PNG/WebP até 10 MB, máximo 4. Não há OCR aqui.
   */
  const addRadiologyAttachments = (files: File[]) => {
    if (files.length === 0) return;
    const { accepted, rejected } = appendRadiologyFiles(radiologyAttachments.length, files);
    if (accepted.length > 0) {
      const stamp = Date.now();
      const next: RadiologyAttachment[] = accepted.map(({ file, mime }, i) => {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);
        return {
          id: `rx-${stamp}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          mime,
          previewUrl,
          name: file.name,
          size: file.size,
        };
      });
      setRadiologyAttachments((prev) => [...prev, ...next]);
      toast({
        description: `${accepted.length} ${accepted.length === 1 ? "radiografia pronta" : "radiografias prontas"} para interpretar. Clique em enviar.`,
      });
    }
    if (rejected.length > 0) {
      toast({
        title: rejected.length === files.length ? "Imagem não aceita" : "Algumas imagens não foram aceitas",
        description: rejected.map((r) => r.reason).join(" "),
        variant: "destructive",
      });
    }
  };

  const removeRadiologyAttachment = (id: string) => {
    setRadiologyAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const ocrImage = async (
    base64: string,
    mimeType: string,
    fileName: string
  ): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('extract-file-text', {
      body: { file: base64, fileName, mimeType },
    });
    if (error) {
      let serverMessage = '';
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          serverMessage = body?.error || '';
        }
      } catch {
        // ignora falha ao ler corpo do erro
      }
      throw new Error(serverMessage || error.message || `Erro ao extrair ${fileName}`);
    }
    if (!data?.text) {
      throw new Error(data?.error || `Não consegui ler ${fileName}`);
    }
    return data.text as string;
  };


  const fileToBase64 = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const processFiles = async (files: File[]) => {
    // Interpretador (Examinus): a imagem ORIGINAL vai para o bucket privado e para o modelo.
    // Nunca passa por OCR (extract-file-text) — retorno antes de qualquer extração.
    if (radiologyActive) {
      const { radiology } = routeExaminusFiles(files, { radiologyInterpretMode });
      addRadiologyAttachments(radiology);
      return;
    }

    setUploadingFile(true);


    try {
      const sections: string[] = [];
      const imageFiles: File[] = [];

      // First pass: separate images for parallel batch OCR; handle PDFs/docs/text sequentially
      for (const file of files) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || fileExtension === 'pdf';
        const supportedDocFormats = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

        if (isImage) {
          imageFiles.push(file);
          continue;
        }

        if (isPdf) {
          toast({
            title: "Processando PDF",
            description: `Renderizando páginas de ${file.name}...`,
          });

          const pages = await pdfToImages(file, { scale: 2.5, quality: 0.92, maxPages: 30 });

          toast({
            title: "Lendo páginas",
            description: `OCR em ${pages.length} página${pages.length > 1 ? 's' : ''} de ${file.name}...`,
          });

          // Parallel OCR per page (limit concurrency to 4)
          const results: string[] = new Array(pages.length).fill('');
          const concurrency = 4;
          let cursor = 0;
          const workers = Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
            while (cursor < pages.length) {
              const idx = cursor++;
              const p = pages[idx];
              try {
                results[idx] = await ocrImage(p.base64, p.mimeType, `${file.name}-p${p.pageNumber}.jpg`);
              } catch (err: any) {
                console.error(`OCR page ${p.pageNumber} failed:`, err);
                results[idx] = `[Erro ao processar página ${p.pageNumber}]`;
              }
            }
          });
          await Promise.all(workers);

          const pdfText = pages
            .map((p, i) => `===== PÁGINA ${p.pageNumber} =====\n${results[i].trim()}`)
            .join('\n\n');

          sections.push(`📎 ${file.name} (${pages.length} página${pages.length > 1 ? 's' : ''})\n\n${pdfText}`);
          continue;
        }

        if (supportedDocFormats.includes(fileExtension || '')) {
          toast({
            title: "Processando documento",
            description: `Extraindo conteúdo de ${file.name}...`,
          });
          const base64 = await fileToBase64(file);
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: { file: base64, fileName: file.name, mimeType: file.type },
          });
          if (error || !data?.text) throw new Error('Erro ao processar documento');
          sections.push(`📎 ${file.name}\n\n${data.text}`);
          continue;
        }

        if (fileExtension === 'txt' || fileExtension === 'md') {
          const text = await file.text();
          sections.push(`📎 ${file.name}\n\n${text}`);
          continue;
        }

        toast({
          title: "Formato não suportado",
          description: `.${fileExtension} não é suportado. Use imagens, PDF, DOCX, PPTX, XLSX, TXT ou MD.`,
          variant: "destructive",
        });
      }

      // Parallel batch OCR for all images
      if (imageFiles.length > 0) {
        toast({
          title: "Lendo imagens",
          description: `OCR em ${imageFiles.length} imagem${imageFiles.length > 1 ? 'ns' : ''}...`,
        });
        const concurrency = 4;
        const results: string[] = new Array(imageFiles.length).fill('');
        let cursor = 0;
        const workers = Array.from({ length: Math.min(concurrency, imageFiles.length) }, async () => {
          while (cursor < imageFiles.length) {
            const idx = cursor++;
            const f = imageFiles[idx];
            try {
              const base64 = await fileToBase64(f);
              results[idx] = await ocrImage(base64, f.type || 'image/jpeg', f.name);
            } catch (err: any) {
              console.error(`OCR image ${f.name} failed:`, err);
              results[idx] = `[Erro ao processar ${f.name}]`;
            }
          }
        });
        await Promise.all(workers);

        imageFiles.forEach((f, i) => {
          const label = imageFiles.length > 1
            ? `===== IMAGEM ${i + 1}: ${f.name} =====`
            : `📎 ${f.name}`;
          sections.push(`${label}\n\n${results[i].trim()}`);
        });
      }

      if (sections.length > 0) {
        const combined = sections.join('\n\n---\n\n');
        // Soft cap to keep within 10k input limit
        const MAX = 9500;
        const fileMessage = combined.length > MAX
          ? `${combined.slice(0, MAX)}\n\n[Conteúdo truncado para brevidade]`
          : combined;

        setMessage(fileMessage);

        toast({
          title: "✓ Arquivos processados",
          description: `${files.length} arquivo${files.length > 1 ? 's' : ''} extraído${files.length > 1 ? 's' : ''}. Clique em enviar.`,
        });
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error.message || "Não foi possível processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div 
      className={
        focusMode || workflowMode
          ? "fixed inset-0 z-[60] bg-background flex flex-col p-4 md:p-6 overflow-hidden animate-fade-in"
          : "flex flex-col h-full p-3 md:p-6"
      }

      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center">
            {radiologyActive ? (
              <ScanLine className="h-16 w-16 mx-auto mb-4 text-primary" />
            ) : (
              <Paperclip className="h-16 w-16 mx-auto mb-4 text-primary" />
            )}
            <p className="text-xl font-bold">{radiologyActive ? "Solte a radiografia aqui" : "Solte o arquivo aqui"}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {radiologyActive ? "JPEG, PNG ou WebP · até 4 imagens · sem PDF ou DICOM" : "Imagens, PDF, DOCX, PPTX, XLSX, TXT, MD"}
            </p>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={radiologyActive ? RADIOLOGY_ACCEPT_ATTR : "image/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Header — minimal identity */}
      <div className="flex flex-col gap-2 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/40 md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
          <AssistantGlyph size="sm" className={agentColor}>
            <span className="block [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5">
              {agentIcon}
            </span>
          </AssistantGlyph>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-lg font-medium tracking-tight truncate leading-tight">{agentName}</h2>
            {currentConversation && (
              <p className="text-[11px] md:text-xs text-muted-foreground/80 truncate mt-0.5">{currentConversation.name}</p>
            )}
          </div>

          {/* Mobile inline actions */}
          <div className="flex md:hidden gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFocusMode(v => !v)} title={focusMode ? "Sair do modo foco" : "Modo foco — expandir leitura"}>
              {focusMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createNewConversation} title="Nova Conversa">
              <Plus className="h-4 w-4" />
            </Button>
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Histórico de Conversas</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                  <div className="space-y-2">
                    {conversations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Nenhuma conversa ainda</p>
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <Card
                          key={conv.id}
                          className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                            currentConversation?.id === conv.id ? "bg-accent" : ""
                          }`}
                          onClick={() => loadConversation(conv)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{conv.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.last_message || "Sem mensagens"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(conv.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A conversa "{conv.name}" será excluída permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteConversation(conv.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Case selector */}
        {cases.length > 0 && (
          <div className="w-full md:w-64">
            <Select
              value={selectedCaseId || "none"}
              onValueChange={(value) => setSelectedCaseId(value === "none" ? undefined : value)}
            >
              <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                <SelectValue placeholder="Selecionar caso" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="none">Sem caso específico</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.patient_name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Desktop actions */}
        <div className="hidden md:flex gap-2">
          {workflowAvailable && (
            <Button
              variant={workflowMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setWorkflowMode(v => !v); setFocusMode(false); }}
              title={workflowMode ? "Sair do Modo Workflow (Esc)" : "Modo Workflow — conversa e documento lado a lado"}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              <span className="ml-2">{workflowMode ? "Sair do Workflow" : "Workflow"}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setFocusMode(v => !v)} title={focusMode ? "Sair do modo foco (Esc)" : "Modo foco — expandir área de leitura"}>
            {focusMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            <span className="ml-2">{focusMode ? "Sair do foco" : "Foco"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={createNewConversation} title="Nova Conversa">
            <Plus className="h-4 w-4" />
            <span className="ml-2">Nova Conversa</span>
          </Button>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" title="Histórico">
                <History className="h-4 w-4" />
                <span className="ml-2">Histórico</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Histórico de Conversas</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhuma conversa ainda</p>
                      <p className="text-sm mt-1">Crie uma nova conversa para começar</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <Card
                        key={conv.id}
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                          currentConversation?.id === conv.id ? "bg-accent" : ""
                        }`}
                        onClick={() => loadConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingConversationId === conv.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => renameConversation(conv.id, editingName)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    renameConversation(conv.id, editingName);
                                  }
                                }}
                                className="h-7 mb-1"
                                autoFocus
                              />
                            ) : (
                              <p className="font-medium truncate">{conv.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message || "Sem mensagens"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConversationId(conv.id);
                                setEditingName(conv.name);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A conversa "{conv.name}" será excluída permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteConversation(conv.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Action buttons if provided */}
      {actionButtons.length > 0 && (
        <div className="flex gap-2 py-3 border-b overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          {actionButtons.map((btn, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={btn.onClick}
              className="whitespace-nowrap shrink-0"
            >
              {btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>
      )}

      {/* Área de trabalho: conversa (esquerda) + documento e ferramentas (Modo Workflow) */}
      <div className={workflowMode ? "flex-1 min-h-0 flex gap-4" : "contents"}>
      <div
        className={
          workflowMode
            ? "flex flex-col min-h-0 w-[33%] max-w-[440px] min-w-[300px] shrink-0 border-r border-border/40 pr-3"
            : "contents"
        }
      >
      {/* Chat messages */}

      <ScrollArea className="flex-1 py-4">
        {!currentConversation || currentConversation.messages.length === 0 ? (
          (() => {
            const greetings: Record<string, { title: string; subtitle: string }> = {
              clinicus: {
                title: "Às ordens, doutor(a). O caso é seu, a digitação é minha.",
                subtitle: "Pode falar livre — sintomas soltos, exame físico, áudio do plantão. Eu organizo, estruturo e devolvo a anamnese pronta para colar no prontuário.",
              },
              examinus: {
                title: "Laboratório e imagem na mesa. Pode mandar.",
                subtitle: "Cole resultados, envie PDF ou foto — laboratoriais ou laudos de imagem (TC, RM, USG, RX). Devolvo em segundos só o que está alterado e muda a sua conduta.",
              },
              prescriptus: {
                title: "Receituário pronto. Qual o cenário?",
                subtitle: "Descreva o paciente — eu devolvo prescrição com dose, via, ajuste renal e a evidência por trás. Sem chute.",
              },
              gasometrus: {
                title: "Pode soltar a gasometria.",
                subtitle: "Em segundos: distúrbio, compensação esperada, ânion gap e a conduta à beira-leito.",
              },
              atestus: {
                title: "Atestado em três linhas. Diga o essencial.",
                subtitle: "CID e dias de afastamento — eu cuido da redação, sem floreio e sem descrever doença.",
              },
              codexus: {
                title: "Sou rápido com CID. Pode descrever.",
                subtitle: "Quadro clínico ou termo livre — devolvo os códigos candidatos prontos para colar no sistema.",
              },
              scorius: {
                title: "Qual escore aplicamos hoje?",
                subtitle: "CHA₂DS₂-VASc, qSOFA, NEWS, Wells… diga o cenário e eu pontuo com a interpretação clínica.",
              },
              numerus: {
                title: "Calculadora afiada. O que precisa?",
                subtitle: "Doses pediátricas, clearance, conversões, infusões — manda o dado bruto que eu entrego o número certo.",
              },
              protocolus: {
                title: "Diretrizes na ponta. Qual condição?",
                subtitle: "Trago o protocolo (AHA, ESC, WHO, SBC) com a recomendação atualizada e o nível de evidência.",
              },
              orientus: {
                title: "Vamos traduzir isso para o paciente.",
                subtitle: "Diga o quadro e o tratamento — escrevo a orientação de alta em linguagem clara, do jeito que ele entende em casa.",
              },
            };
            const g = greetings[agentType] ?? {
              title: `Pronto, doutor(a). ${agentName} à postos.`,
              subtitle: "Pode começar — eu cuido do resto.",
            };
            return (
              <div className="text-center py-8 md:py-12 text-muted-foreground max-w-xl mx-auto px-4">
                <div className="relative inline-flex items-center justify-center mb-6 animate-orb-float" style={{ willChange: "transform" }}>
                  {/* Subtle expanding ring */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/15 animate-orb-ring" />
                  {/* Slow rotating conic shimmer — discreet */}
                  <span
                    className="pointer-events-none absolute -inset-2 rounded-full opacity-40 blur-md animate-orb-spin-slow"
                    style={{
                      background:
                        "conic-gradient(from 0deg, hsl(var(--primary) / 0.0), hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.0), hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.0))",
                    }}
                  />
                  {/* Soft outer glow */}
                  <span className="pointer-events-none absolute -inset-3 rounded-full bg-primary/8 blur-2xl animate-orb-shimmer" />
                  {/* Core orb with the icon, glass depth + gentle breathing */}
                  <AssistantGlyph size="lg" className={agentColor}>
                    {agentIcon}
                  </AssistantGlyph>

                </div>
                <p className="text-base md:text-xl font-medium text-foreground tracking-tight">{g.title}</p>
                <p className="text-xs md:text-sm mt-2 leading-relaxed">{g.subtitle}</p>
                {getAgentSuggestions(agentType).length > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {getAgentSuggestions(agentType).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setMessage(s);
                          textareaRef.current?.focus();
                        }}
                        className="text-[11px] md:text-xs px-3 py-1.5 rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors duration-150 hover:text-foreground hover:border-primary/50 hover:bg-primary/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {lastConversation && (
                  <Button
                    onClick={restoreLastConversation}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Continuar última conversa
                  </Button>
                )}

              </div>
            );
          })()
        ) : (
          <div className="space-y-4 px-1 md:px-2">
            {currentConversation.messages.map((msg) => {
              const isThinking = msg.role === "assistant" && msg.id === "streaming-temp" && (msg.content === "Pensando..." || msg.content === "");
              const isStreaming = msg.role === "assistant" && msg.id === "streaming-temp" && !isThinking;
              return (
              <div
                key={msg.id}
                className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${
                    focusMode
                      ? "max-w-[97%] md:max-w-5xl"
                      : workflowMode && msg.role === "assistant"
                        ? "max-w-[96%] md:max-w-[96%]"
                        : msg.role === "assistant"
                          ? "max-w-[96%] md:max-w-[92%]"
                          : "max-w-[90%] md:max-w-[72%]"
                  } rounded-2xl px-3 md:px-4 relative group ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground py-2 md:py-3"
                      : isThinking
                        ? "bg-muted/60 py-2 md:py-2.5"
                        : workflowMode
                          ? "bg-muted/15 border border-border/40 py-2 px-3"
                          : "bg-muted/25 border border-border/50 pt-4 md:pt-5 px-4 md:px-6 pb-9 md:pb-11"
                  }`}
                >
                  {msg.audioBlob && msg.audioUrl ? (
                    <AudioPlayer 
                      audioBlob={msg.audioBlob}
                      audioUrl={msg.audioUrl}
                      messageId={msg.id}
                      transcription={msg.transcription}
                      onTranscription={(text) => {
                        const updatedMessages = currentConversation!.messages.map(m =>
                          m.id === msg.id ? { ...m, transcription: text, content: text } : m
                        );
                        setCurrentConversation({ ...currentConversation!, messages: updatedMessages });
                      }}
                    />
                  ) : isThinking ? (
                    <ThinkingIndicator />
                  ) : workflowMode && msg.role === "assistant" ? (
                    <WorkflowAnswerChip content={msg.content} streaming={isStreaming} />
                  ) : msg.role === "assistant" ? (
                    <StructuredResponse
                      content={msg.content}
                      size={focusMode ? "focus" : "chat"}
                      trailing={isStreaming ? <StreamCursor /> : undefined}
                    />
                  ) : (
                    <>
                      {msg.role === "user" && (() => {
                        const info = describeRadiologyMessage(msg.metadata);
                        const previews = (msg.attachments ?? []).filter((a) => !!a.previewUrl);
                        if (!info && previews.length === 0) return null;
                        const label = info ? radiologyChipLabel(info) : `${previews.length} ${previews.length === 1 ? "radiografia anexada" : "radiografias anexadas"}`;
                        return (
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            {previews.map((a) => (
                              <img
                                key={a.previewUrl}
                                src={a.previewUrl}
                                alt={a.name}
                                loading="lazy"
                                className="h-14 w-14 md:h-16 md:w-16 rounded-lg object-cover border border-primary-foreground/30 bg-black/20"
                              />
                            ))}
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px] font-medium">
                              <ScanLine className="h-3 w-3" />
                              {label}
                            </span>
                          </div>
                        );
                      })()}
                      <p className={`whitespace-pre-wrap leading-relaxed ${focusMode ? "text-base md:text-lg" : "text-sm"}`}>
                        {msg.content}
                        {isStreaming && <StreamCursor />}
                      </p>
                    </>
                  )}

                  <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {msg.role === "user" && msg.pending && (
                      <span className="inline-flex items-baseline ml-1" aria-label="enviando">
                        <span className="animate-thinking-dot">.</span>
                        <span className="animate-thinking-dot [animation-delay:0.18s]">.</span>
                        <span className="animate-thinking-dot [animation-delay:0.36s]">.</span>
                      </span>
                    )}
                  </p>
                  {msg.role === "assistant" && !workflowMode && (
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReadingMessage(msg)}
                        className="h-7 px-2 gap-1.5 text-xs"
                        title="Abrir em leitura ampliada"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span className="hidden md:inline">Ler</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const upperText = msg.content.toUpperCase();
                          navigator.clipboard.writeText(upperText);
                          toast({
                            description: "Texto em caixa alta copiado!",
                          });
                        }}
                        className="h-7 px-2 gap-1.5 text-xs"
                        title="Copiar em caixa alta"
                      >
                        <FileUp className="h-3 w-3" />
                        <span className="hidden md:inline">Maiúscula</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="h-7 px-2 gap-1.5 text-xs"
                        title="Copiar texto"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-primary" />
                            <span className="text-primary hidden md:inline">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="hidden md:inline">Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t pt-3 md:pt-4 sticky bottom-0 bg-background z-10 pb-[env(safe-area-inset-bottom)] md:static md:pb-0">
        {/* Interpretador (Examinus): radiografias pendentes antes do envio */}
        {radiologyActive && radiologyAttachments.length > 0 && (
          <div className="mb-2 flex items-start gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 animate-fade-in" aria-label="Radiografias anexadas">
            {radiologyAttachments.map((att) => (
              <div key={att.id} className="relative shrink-0 w-16 md:w-20">
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover border border-border/60 bg-muted"
                />
                <button
                  type="button"
                  onClick={() => removeRadiologyAttachment(att.id)}
                  disabled={isLoading}
                  aria-label={`Remover ${att.name}`}
                  title="Remover imagem"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border shadow-sm inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-colors disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground" title={att.name}>
                  {att.name}
                </span>
              </div>
            ))}
            <p className="shrink-0 self-center pl-1 text-[11px] text-muted-foreground">
              {radiologyAttachments.length}/{MAX_RADIOLOGY_IMAGES} · {formatBytes(radiologyAttachments.reduce((acc, a) => acc + a.size, 0))}
            </p>
          </div>
        )}
        {radiologyActive && radiologyAttachments.length === 0 && radiologyHistoricalIds.length > 0 && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ScanLine className="h-3 w-3 shrink-0 text-cyan-700 dark:text-cyan-300" />
            Perguntas seguirão sobre {radiologyHistoricalIds.length === 1 ? "a radiografia já anexada" : `as ${radiologyHistoricalIds.length} radiografias já anexadas`} nesta conversa. Anexe outra imagem para trocar.
          </p>
        )}

        {/* Mobile: Examinus toggles row above input */}
        {isMobile && agentType === "examinus" && (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Toggle
              pressed={examSuggestMode}
              onPressedChange={(v) => setExaminusModes({ consultor: v })}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-600 dark:data-[state=on]:text-violet-400"
              title="Consultor: sugestão de exames, contraindicações e explicações"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              <span>Consultor</span>
            </Toggle>
            <Toggle
              pressed={radiologyInterpretMode}
              onPressedChange={(v) => setExaminusModes({ interpretador: v })}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-700 dark:data-[state=on]:text-cyan-300"
              title="Interpretador: segunda leitura de radiografia de tórax a partir da imagem"
            >
              <ScanLine className="w-3 h-3 mr-1" />
              <span>Interpretador</span>
            </Toggle>
            {!examSuggestMode && !radiologyInterpretMode && (<>
            <Toggle
              pressed={usePipeSeparator}
              onPressedChange={setUsePipeSeparator}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20"
              title="Separar com |"
            >
              <SeparatorVertical className="w-3 h-3 mr-1" />
              <span>|</span>
            </Toggle>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded-full h-7 shrink-0">
              <Switch
                id="include-time-mobile-agent"
                checked={includeTime}
                onCheckedChange={setIncludeTime}
                className="data-[state=checked]:bg-primary scale-75"
              />
              <Label htmlFor="include-time-mobile-agent" className="text-[10px] cursor-pointer flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Hora
              </Label>
            </div>
            <Toggle
              pressed={onlyAltered}
              onPressedChange={setOnlyAltered}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
              title="Só alterados"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>Alterados</span>
            </Toggle>
            <Toggle
              pressed={clinicalImpression}
              onPressedChange={setClinicalImpression}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400"
              title="Impressão clínica"
            >
              <Stethoscope className="w-3 h-3 mr-1" />
              <span>Impressão</span>
            </Toggle>
            <Toggle
              pressed={compactMode}
              onPressedChange={setCompactMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-600 dark:data-[state=on]:text-emerald-400"
              title="Modo compacto: omite VCM, HCM, CHCM, RDW e diferencial"
            >
              <Minimize2 className="w-3 h-3 mr-1" />
              <span>Compacto</span>
            </Toggle>
            </>)}
          </div>
        )}

        {/* Mobile: Other agent toggles row */}
        {isMobile && agentType === "clinicus" && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Toggle
              pressed={directAHEMode}
              onPressedChange={(v) => { setDirectAHEMode(v); if (v) setReportMode(false); }}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Gerar anamnese estruturada direto"
            >
              <FileDown className="h-3 w-3" />
              <span>Anamnese</span>
            </Toggle>
            {directAHEMode && (
              <Select value={aheTemplate} onValueChange={(v) => setAheTemplate(v as ClinicusContext)}>
                <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[80]">
                  {CLINICUS_CONTEXTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Toggle
              pressed={reportMode}
              onPressedChange={(v) => { setReportMode(v); if (v) setDirectAHEMode(false); }}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Relatório médico ou passagem de caso"
            >
              <ClipboardList className="h-3 w-3" />
              <span>Relatório</span>
            </Toggle>
            {reportMode && (
              <>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ClinicusReportType)}>
                  <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {CLINICUS_REPORT_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reportType === "relatorio_medico" && (
                  <Select value={reportPurpose} onValueChange={setReportPurpose}>
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      {CLINICUS_REPORT_PURPOSES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {reportType === "passagem_caso" && (
                  <Select value={reportSpecialty} onValueChange={setReportSpecialty}>
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      {CLINICUS_HANDOFF_TARGETS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>
        )}
        {isMobile && agentType === "prescriptus" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Toggle
              pressed={bulaInteligenteMode}
              onPressedChange={(v) => { setBulaInteligenteMode(v); if (v) setReceitaMode(false); }}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo B.I."
            >
              <Pill className="h-3 w-3" />
              <span>B.I.</span>
            </Toggle>
            <Toggle
              pressed={receitaMode}
              onPressedChange={(v) => { setReceitaMode(v); if (v) setBulaInteligenteMode(false); }}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo Receita"
            >
              <ScrollText className="h-3 w-3" />
              <span>Receita</span>
            </Toggle>
          </div>
        )}
        {isMobile && agentType === "gasometrus" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Toggle
              pressed={directLIMode}
              onPressedChange={setDirectLIMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo L.I."
            >
              <ListChecks className="h-3 w-3" />
              <span>L.I.</span>
            </Toggle>
          </div>
        )}
        {isMobile && agentType === "codexus" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Toggle
              pressed={quickCIDMode}
              onPressedChange={setQuickCIDMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo C.R.: CID Rápido — sugere até 10 CIDs sem perguntas"
            >
              <Zap className="h-3 w-3" />
              <span>C.R.</span>
            </Toggle>
          </div>
        )}
        {isMobile && agentType === "mediscuss" && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Select value={mediscussMode} onValueChange={setMediscussMode}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {MEDISCUSS_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mediscussSpecialty} onValueChange={setMediscussSpecialty}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {MEDISCUSS_SPECIALTIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isMobile && agentType === "legalis" && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Select value={legalisMode} onValueChange={setLegalisMode}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {LEGALIS_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={legalisScenario} onValueChange={setLegalisScenario}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {LEGALIS_SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={legalisTopic} onValueChange={setLegalisTopic}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {LEGALIS_TOPICS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}




        {/* Barra de ajustes de saída (desktop) */}
        {!isMobile && AGENTS_WITH_CONTROLS.has(agentType) && (
          <div className={`flex flex-nowrap gap-2 items-center mb-3 px-3 py-2.5 rounded-2xl bg-muted/35 border border-border/50 overflow-x-auto scrollbar-none ${workflowMode ? "mb-2 py-1.5" : ""}`}>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 mr-1 shrink-0">
              Ajustes de saída
            </span>

            {agentType === "clinicus" && (
              <>
                <Toggle
                  pressed={directAHEMode}
                  onPressedChange={(v) => { setDirectAHEMode(v); if (v) setReportMode(false); }}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                  title="Gerar anamnese hospitalar estruturada diretamente"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="text-xs">Anamnese</span>
                </Toggle>
                {directAHEMode && (
                  <Select value={aheTemplate} onValueChange={(v) => setAheTemplate(v as ClinicusContext)}>
                    <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                      <span className="text-muted-foreground">Contexto:</span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      {CLINICUS_CONTEXTS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Toggle
                  pressed={reportMode}
                  onPressedChange={(v) => { setReportMode(v); if (v) setDirectAHEMode(false); }}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                  title="Transformar informações soltas em relatório médico ou passagem de caso"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-xs">Relatório</span>
                </Toggle>
                {reportMode && (
                  <>
                    <Select value={reportType} onValueChange={(v) => setReportType(v as ClinicusReportType)}>
                      <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                        <span className="text-muted-foreground">Tipo:</span>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[80]">
                        {CLINICUS_REPORT_TYPES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reportType === "relatorio_medico" && (
                      <Select value={reportPurpose} onValueChange={setReportPurpose}>
                        <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                          <span className="text-muted-foreground">Finalidade:</span>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                          {CLINICUS_REPORT_PURPOSES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {reportType === "passagem_caso" && (
                      <Select value={reportSpecialty} onValueChange={setReportSpecialty}>
                        <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                          <span className="text-muted-foreground">Destino:</span>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                          {CLINICUS_HANDOFF_TARGETS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </>
            )}
            {agentType === "prescriptus" && (
              <>
              <Toggle
                pressed={bulaInteligenteMode}
                onPressedChange={(v) => { setBulaInteligenteMode(v); if (v) setReceitaMode(false); }}
                size="sm"
                className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                title="Modo B.I.: Bula Inteligente"
              >
                <Pill className="h-4 w-4" />
                <span className="text-xs">B.I.</span>
              </Toggle>
              <Toggle
                pressed={receitaMode}
                onPressedChange={(v) => { setReceitaMode(v); if (v) setBulaInteligenteMode(false); }}
                size="sm"
                className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                title="Modo Receita: saída pronta para o receituário"
              >
                <ScrollText className="h-4 w-4" />
                <span className="text-xs">Receita</span>
              </Toggle>
              </>
            )}
            {agentType === "gasometrus" && (
              <Toggle
                pressed={directLIMode}
                onPressedChange={setDirectLIMode}
                size="sm"
                className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                title="Modo L.I.: Leitura Sistemática"
              >
                <ListChecks className="h-4 w-4" />
                <span className="text-xs">L.I.</span>
              </Toggle>
            )}
            {agentType === "codexus" && (
              <Toggle
                pressed={quickCIDMode}
                onPressedChange={setQuickCIDMode}
                size="sm"
                className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                title="Modo C.R.: CID Rápido"
              >
                <Zap className="h-4 w-4" />
                <span className="text-xs">C.R.</span>
              </Toggle>
            )}
            {agentType === "mediscuss" && (
              <>
                <Select value={mediscussMode} onValueChange={setMediscussMode}>
                  <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                    <span className="text-muted-foreground">Modo:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {MEDISCUSS_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={mediscussSpecialty} onValueChange={setMediscussSpecialty}>
                  <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                    <span className="text-muted-foreground">Especialidade:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {MEDISCUSS_SPECIALTIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {agentType === "legalis" && (
              <>
                <Select value={legalisMode} onValueChange={setLegalisMode}>
                  <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                    <span className="text-muted-foreground">Modo:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {LEGALIS_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={legalisScenario} onValueChange={setLegalisScenario}>
                  <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                    <span className="text-muted-foreground">Cenário:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {LEGALIS_SCENARIOS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={legalisTopic} onValueChange={setLegalisTopic}>
                  <SelectTrigger className="shrink-0 h-8 w-auto gap-1.5 rounded-full text-xs px-3">
                    <span className="text-muted-foreground">Tema:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {LEGALIS_TOPICS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {agentType === "examinus" && (
              <>
                <div className="w-px h-6 bg-border/70 mx-0.5 shrink-0" />
                <OutputControl
                  icon={Lightbulb}
                  tone="violet"
                  label="Consultor"
                  info="Sugere exames complementares, aponta contraindicações e explica exames e procedimentos a partir do caso."
                  pressed={examSuggestMode}
                  onPressedChange={(v) => setExaminusModes({ consultor: v })}
                />
                <OutputControl
                  icon={ScanLine}
                  tone="cyan"
                  label="Interpretador"
                  info="Segunda leitura de radiografia de tórax: envie a imagem (JPEG, PNG ou WebP, até 4) e receba achados, impressão com grau de confiança e limitações. A imagem original vai direto ao modelo."
                  pressed={radiologyInterpretMode}
                  onPressedChange={(v) => setExaminusModes({ interpretador: v })}
                />
                {!examSuggestMode && !radiologyInterpretMode && (<>
                <OutputControl
                  icon={SeparatorVertical}
                  tone="primary"
                  label="Separar com |"
                  info="Organiza os resultados em linha contínua separada por barra vertical — pronto para colar na evolução."
                  pressed={usePipeSeparator}
                  onPressedChange={setUsePipeSeparator}
                />
                <OutputControl
                  icon={Clock}
                  tone="primary"
                  label="Incluir horário"
                  info="Mostra o horário de coleta ao lado de cada exame, útil para acompanhar a evolução no plantão."
                  pressed={includeTime}
                  onPressedChange={setIncludeTime}
                />
                <div className="w-px h-6 bg-border/70 mx-0.5 shrink-0" />
                <OutputControl
                  icon={AlertTriangle}
                  tone="amber"
                  label="Só alterados"
                  info="Exibe apenas os valores fora da referência, ocultando os resultados normais."
                  pressed={onlyAltered}
                  onPressedChange={setOnlyAltered}
                />
                <OutputControl
                  icon={Stethoscope}
                  tone="blue"
                  label="Impressão clínica"
                  info="Acrescenta uma leitura interpretativa das alterações encontradas ao final do resumo."
                  pressed={clinicalImpression}
                  onPressedChange={setClinicalImpression}
                />
                <OutputControl
                  icon={Minimize2}
                  tone="green"
                  label="Compacto"
                  info="Resumo enxuto: omite índices hematimétricos (VCM, HCM, CHCM, RDW) e detalhes secundários."
                  pressed={compactMode}
                  onPressedChange={setCompactMode}
                />
                </>)}
              </>
            )}

          </div>
        )}

        {/* Composer */}
        {isMobile ? (
          <div className="flex gap-1.5 items-end">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full hover:bg-primary/10"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              title="Anexar arquivo"
            >
              {uploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 text-primary" />
              )}
            </Button>
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(subscribed ? e.target.value : e.target.value.slice(0, FREE_CHAR_LIMIT))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={radiologyActive ? "Envie a radiografia e, se quiser, o contexto clínico" : "Mensagem... (Shift+Enter para nova linha)"}
                maxLength={subscribed ? undefined : FREE_CHAR_LIMIT}
                rows={1}
                aria-invalid={(message.length > 0 && !message.trim()) || overLimit}
                className={`w-full resize-none pr-10 py-2.5 text-base leading-relaxed min-h-[44px] rounded-2xl transition-all ${
                  (message.length > 0 && !message.trim()) || overLimit
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                style={{ maxHeight: inputExpanded ? 400 : 200 }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setInputExpanded((v) => !v)}
                className="absolute right-2 top-2 h-6 w-6 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title={inputExpanded ? "Reduzir campo" : "Expandir campo"}
                aria-label={inputExpanded ? "Reduzir campo de mensagem" : "Expandir campo de mensagem"}
              >
                {inputExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
            <AgentVoiceInput
              onTranscription={handleVoiceTranscription}
              disabled={isLoading}
              context={agentType}
            />
            {caseSuggestionsAvailable && (
              <Button
                variant="outline"
                size="icon"
                onClick={runCaseSuggestions}
                disabled={isLoading || suggestionsLoading}
                className="shrink-0 h-10 w-10 rounded-full"
                title="Sugestões para o caso"
                aria-label="Sugestões para o caso"
              >
                {suggestionsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Lightbulb className="h-4 w-4 text-primary" />
                )}
              </Button>
            )}
            <Button
              onClick={sendMessage}
              disabled={!canSend || isLoading || overLimit}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full"
              title={!canSend ? (radiologyActive ? "Anexe uma radiografia para enviar" : "Digite uma mensagem para enviar") : radiologyActive ? "Interpretar radiografia" : "Enviar mensagem"}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          /* Desktop: textarea dominante com ações flutuantes */
          <div className="relative group">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(subscribed ? e.target.value : e.target.value.slice(0, FREE_CHAR_LIMIT))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={radiologyActive
                ? "Envie uma radiografia de tórax (JPEG, PNG ou WebP) e, se quiser, descreva o contexto clínico. Peça \"avaliação rápida\" ou \"laudo completo\"."
                : agentType === "examinus" && examSuggestMode
                  ? "Peça um painel, cole um caso ou pergunte sobre um exame"
                  : placeholder}
              maxLength={subscribed ? undefined : FREE_CHAR_LIMIT}
              aria-invalid={(message.length > 0 && !message.trim()) || overLimit}
              className={`w-full resize-none rounded-2xl text-base leading-relaxed p-5 pb-16 bg-muted/25 border-2 transition-colors duration-200 ${
                workflowMode
                  ? "min-h-[72px] max-h-44 p-3.5 pb-12 text-sm"
                  : inputExpanded
                    ? "min-h-[240px] max-h-[45vh]"
                    : "min-h-[132px] max-h-64"
              } ${
                (message.length > 0 && !message.trim()) || overLimit
                  ? "border-destructive focus:border-destructive"
                  : "border-border/40 focus:border-primary/60 focus:bg-background"
              }`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setInputExpanded((v) => !v)}
              className="absolute right-3.5 top-3.5 h-7 w-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={inputExpanded ? "Reduzir campo" : "Expandir campo"}
              aria-label={inputExpanded ? "Reduzir campo de mensagem" : "Expandir campo de mensagem"}
            >
              {inputExpanded ? <ChevronDown className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || isLoading}
                className="h-11 w-11 shrink-0 rounded-xl bg-background/90 hover:bg-primary/10 hover:border-primary/50 transition-colors duration-200"
                title="Anexar foto, PDF ou documento"
              >
                {uploadingFile ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Paperclip className="h-5 w-5 text-primary" />
                )}
              </Button>
              <AgentVoiceInput
                onTranscription={handleVoiceTranscription}
                disabled={isLoading}
                context={agentType}
              />
              {caseSuggestionsAvailable && (
                <Button
                  variant="outline"
                  onClick={runCaseSuggestions}
                  disabled={isLoading || suggestionsLoading}
                  className="h-11 px-4 rounded-xl font-medium bg-background/90 hover:bg-primary/10 hover:border-primary/50"
                  title="Analisar o caso: lacunas da história, hipóteses diagnósticas e sugestões de conduta"
                >
                  {suggestionsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-1.5 text-primary" />
                      Sugestões para o caso
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={sendMessage}
                disabled={!canSend || isLoading || overLimit}
                className="h-11 px-7 rounded-xl font-semibold transition-[opacity,box-shadow] duration-200 hover:opacity-90 active:scale-95"
                title={!canSend ? (radiologyActive ? "Anexe uma radiografia para enviar" : "Digite uma mensagem para enviar") : radiologyActive ? "Interpretar radiografia" : "Enviar mensagem"}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="min-w-0 flex-1">
            {message.length > 0 && !message.trim() ? (
              <p
                className="text-xs text-destructive truncate"
                role="alert"
                aria-live="assertive"
              >
                A mensagem contém apenas espaços. Digite algum texto para enviar.
              </p>
            ) : !isMobile ? (
              <p className="text-xs text-muted-foreground truncate">
                Pressione Enter para enviar, Shift+Enter para quebrar linha
              </p>
            ) : null}
            {/* SR-only live region for blocked send attempts */}
            <span role="status" aria-live="assertive" className="sr-only">
              {validationAnnouncement}
            </span>
          </div>
          <span
            className={`text-xs tabular-nums shrink-0 ${
              overLimit
                ? "text-destructive font-medium"
                : nearLimit
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {subscribed
              ? `${message.length.toLocaleString("pt-BR")} caracteres · sem limite`
              : `${message.length.toLocaleString("pt-BR")}/30.000`}
          </span>

        </div>
      </div>
      {/* Fim da coluna de conversa */}
      </div>

      {/* Modo Workflow: documento em destaque + trilha de ferramentas */}
      {workflowMode && (() => {
        const lastAnswer = [...(currentConversation?.messages ?? [])]
          .reverse()
          .find((m) => m.role === "assistant" && !!m.content?.trim());
        const isLive = lastAnswer?.id === "streaming-temp" && lastAnswer.content !== "Pensando...";
        return (
          <>
            <div className="flex-1 min-w-0 min-h-0 flex flex-col rounded-2xl border border-border/50 bg-background shadow-sm overflow-hidden animate-fade-in">
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border/40 bg-muted/30">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">Documento</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {currentConversation?.name || "Resposta mais recente do assistente"}
                    </p>
                  </div>
                </div>
                {lastAnswer && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(lastAnswer.content.replace(/\*\*/g, "").toUpperCase());
                        toast({ title: "Texto em caixa alta copiado", description: "Documento pronto para colar no prontuário." });
                      }}
                      title="Copiar tudo em MAIÚSCULAS"
                    >
                      <FileUp className="h-4 w-4" />
                      <span className="ml-2">Maiúscula</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(lastAnswer.content.replace(/\*\*/g, ""));
                        toast({ title: "Texto copiado", description: "Documento pronto para colar no prontuário." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="ml-2">Copiar tudo</span>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                {lastAnswer ? (
                  <StructuredResponse content={lastAnswer.content} size="reading" className="mx-auto" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <LayoutPanelLeft className="h-8 w-8 opacity-30" />
                    <p className="text-sm max-w-sm">
                      Envie o caso na coluna ao lado. A resposta aparece aqui em formato documento, pronta para leitura e cópia.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden xl:flex w-56 shrink-0 flex-col gap-2 rounded-2xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-1">Estação de trabalho</p>
              <Button variant="outline" size="sm" className="justify-start" onClick={createNewConversation}>
                <Plus className="h-4 w-4" />
                <span className="ml-2">Nova conversa</span>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" />
                <span className="ml-2">Histórico</span>
              </Button>
              {lastAnswer && (
                <Button variant="outline" size="sm" className="justify-start" onClick={() => setReadingMessage(lastAnswer)}>
                  <Expand className="h-4 w-4" />
                  <span className="ml-2">Leitura ampliada</span>
                </Button>
              )}
              <div className="mt-auto space-y-2">
                {selectedCaseId && (
                  <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
                    Caso vinculado: {cases.find((c) => c.id === selectedCaseId)?.title || "selecionado"}
                  </p>
                )}
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setWorkflowMode(false)}>
                  <Shrink className="h-4 w-4" />
                  <span className="ml-2">Sair do Workflow</span>
                </Button>
              </div>
            </aside>
          </>
        );
      })()}
      </div>



      {/* Painel lateral de sugestões para o caso (Clínicus) */}
      <CaseSuggestionsPanel
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        content={suggestionsContent}
        loading={suggestionsLoading}
        onAsk={(question) => {
          setMessage(question);
          setTimeout(() => textareaRef.current?.focus(), 60);
        }}
      />

      {/* Reading dialog: per-message expanded view */}
      <Dialog open={!!readingMessage} onOpenChange={(o) => !o && setReadingMessage(null)}>
        <DialogContent className="max-w-[min(1200px,96vw)] w-[96vw] h-[92vh] sm:h-[92vh] flex flex-col p-4 md:p-6 gap-3">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Leitura ampliada
            </DialogTitle>
          </DialogHeader>
          {readingMessage && (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 rounded-lg bg-muted/30 p-4 md:p-6">
                <StructuredResponse content={readingMessage.content} size="reading" className="mx-auto" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(readingMessage.content.toUpperCase());
                    toast({ description: "Texto em caixa alta copiado!" });
                  }}
                  className="gap-1.5"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Maiúscula
                </Button>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(readingMessage.content, readingMessage.id)}
                  className="gap-1.5"
                >
                  {copiedMessageId === readingMessage.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
