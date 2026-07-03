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
import { Loader2, AlertTriangle, Stethoscope } from "lucide-react";
import { exportAgentConversationToPDF } from "@/utils/pdfExport";
import { pdfToImages } from "@/utils/pdfToImages";
import { AgentVoiceInput } from "@/components/AgentVoiceInput";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
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
  FileUp,
  SeparatorVertical,
  Clock,
  Pill,
  ListChecks,
  Zap,
  Minimize2,
  Maximize2,
  ChevronDown,
  Expand,
  Shrink,
  BookOpen
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  audioBlob?: Blob;
  audioUrl?: string;
  transcription?: string;
  pending?: boolean;
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
  const [message, setMessage] = useState("");
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
  const [directAHEMode, setDirectAHEMode] = useState(false);
  const [aheTemplate, setAheTemplate] = useState<"v1" | "v2" | "v3">("v1");
  const [bulaInteligenteMode, setBulaInteligenteMode] = useState(false);
  const [directLIMode, setDirectLIMode] = useState(false);
  const [quickCIDMode, setQuickCIDMode] = useState(false);
  const [mediscussMode, setMediscussMode] = useState("auto");
  const [mediscussSpecialty, setMediscussSpecialty] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [readingMessage, setReadingMessage] = useState<Message | null>(null);

  // ESC to exit focus mode
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusMode(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

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

  const sendMessage = async () => {
    if (isLoading) return;
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
          ...(agentType === "examinus" && { usePipeSeparator, includeTime, onlyAltered, clinicalImpression, compactMode }),
          ...(agentType === "clinicus" && { directAHEMode, aheTemplate }),
          ...(agentType === "prescriptus" && { bulaInteligenteMode }),
          ...(agentType === "gasometrus" && { directLIMode }),
          ...(agentType === "codexus" && { quickCIDMode }),
          ...(agentType === "mediscuss" && { mediscussMode, mediscussSpecialty })
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

  const ocrImage = async (
    base64: string,
    mimeType: string,
    fileName: string
  ): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('extract-file-text', {
      body: { file: base64, fileName, mimeType },
    });
    if (error || !data?.text) {
      throw new Error(error?.message || `Erro ao extrair ${fileName}`);
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

          const pages = await pdfToImages(file, { scale: 2, maxPages: 30 });

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
        focusMode
          ? "fixed inset-0 z-[60] bg-background flex flex-col p-4 md:p-8 overflow-hidden animate-fade-in"
          : "flex flex-col h-full p-3 md:p-6"
      }
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center">
            <Paperclip className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-bold">Solte o arquivo aqui</p>
            <p className="text-sm text-muted-foreground mt-2">Imagens, PDF, DOCX, PPTX, XLSX, TXT, MD</p>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Header — minimal identity */}
      <div className="flex flex-col gap-2 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/40 md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
          <div className={`rounded-lg p-1.5 md:p-2 bg-primary/10 ${agentColor} shrink-0`}>
            <span className="block [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5 [&>svg]:stroke-[1.75]">
              {agentIcon}
            </span>
          </div>
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
              <SelectContent>
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
                  {/* Core orb with the icon, gently breathing */}
                  <div className={`relative rounded-full p-4 md:p-6 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20 ${agentColor} animate-orb-breathe [&>svg]:stroke-[1.75] [&>svg]:relative [&>svg]:z-10`}>
                    {agentIcon}
                  </div>
                </div>
                <p className="text-base md:text-xl font-medium text-foreground tracking-tight">{g.title}</p>
                <p className="text-xs md:text-sm mt-2 leading-relaxed">{g.subtitle}</p>
                {lastConversation && (
                  <Button
                    onClick={restoreLastConversation}
                    variant="outline"
                    size="sm"
                    className="mt-5"
                  >
                    Continuar última conversa
                  </Button>
                )}
              </div>
            );
          })()
        ) : (
          <div className="space-y-4">
            {currentConversation.messages.map((msg) => {
              const isThinking = msg.role === "assistant" && msg.id === "streaming-temp" && (msg.content === "Pensando..." || msg.content === "");
              const isStreaming = msg.role === "assistant" && msg.id === "streaming-temp" && !isThinking;
              return (
              <div
                key={msg.id}
                className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${focusMode ? "max-w-[95%] md:max-w-4xl" : "max-w-[85%] md:max-w-[80%]"} rounded-2xl px-3 md:px-4 relative group ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground py-2 md:py-3"
                      : isThinking
                        ? "bg-muted/60 py-2 md:py-2.5"
                        : "bg-muted pt-2 md:pt-3 pb-8 md:pb-10"
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
                  ) : (
                    <p className={`whitespace-pre-wrap leading-relaxed ${focusMode ? "text-base md:text-lg" : "text-sm"}`}>
                      {msg.role === "assistant" && agentType === "clinicus" ? msg.content.replace(/\*\*/g, "") : msg.content}
                      {isStreaming && (
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
                      )}
                    </p>
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
                  {msg.role === "assistant" && (
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
        {/* Mobile: Examinus toggles row above input */}
        {isMobile && agentType === "examinus" && (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 -mx-1 px-1">
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
          </div>
        )}

        {/* Mobile: Other agent toggles row */}
        {isMobile && agentType === "clinicus" && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Toggle
              pressed={directAHEMode}
              onPressedChange={setDirectAHEMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Gerar anamnese estruturada direto"
            >
              <FileDown className="h-3 w-3" />
              <span>Anamnese</span>
            </Toggle>
            {directAHEMode && (
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAheTemplate("v1")}
                  title="Modelo 1: anamnese hospitalar padrão"
                  className={`px-2 h-6 rounded-full transition-colors ${aheTemplate === "v1" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  M1 · Padrão
                </button>
                <button
                  type="button"
                  onClick={() => setAheTemplate("v2")}
                  title="Modelo 2: admissão hospitalar para Medicina de Emergência"
                  className={`px-2 h-6 rounded-full transition-colors ${aheTemplate === "v2" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  M2 · Emergência
                </button>
                <button
                  type="button"
                  onClick={() => setAheTemplate("v3")}
                  title="Modelo 3: admissão de paciente crítico em UTI/urgência"
                  className={`px-2 h-6 rounded-full transition-colors ${aheTemplate === "v3" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  M3 · UTI
                </button>
              </div>
            )}
          </div>
        )}
        {isMobile && agentType === "prescriptus" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Toggle
              pressed={bulaInteligenteMode}
              onPressedChange={setBulaInteligenteMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo B.I."
            >
              <Pill className="h-3 w-3" />
              <span>B.I.</span>
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
              <SelectContent>
                {MEDISCUSS_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mediscussSpecialty} onValueChange={setMediscussSpecialty}>
              <SelectTrigger className="h-7 w-auto gap-1 rounded-full text-xs px-2.5 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDISCUSS_SPECIALTIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}



        {/* Toolbar row: attach + desktop toggles */}
        {!isMobile && (
          <div className="flex gap-2 items-center flex-wrap mb-2">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 gap-1.5 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              title="Anexar foto, PDF ou documento"
            >
              {uploadingFile ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Anexar</span>
            </Button>
            {agentType === "clinicus" && (
              <>
                <Toggle
                  pressed={directAHEMode}
                  onPressedChange={setDirectAHEMode}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                  title="Gerar anamnese hospitalar estruturada diretamente"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="text-xs">Anamnese</span>
                </Toggle>
                {directAHEMode && (
                  <div className="inline-flex items-center rounded-full border border-border bg-card/60 p-0.5 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setAheTemplate("v1")}
                      className={`px-2.5 h-7 rounded-full transition-colors ${aheTemplate === "v1" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      title="Modelo 1: anamnese hospitalar padrão"
                    >
                      Modelo 1 · Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => setAheTemplate("v2")}
                      className={`px-2.5 h-7 rounded-full transition-colors ${aheTemplate === "v2" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      title="Modelo 2: admissão hospitalar para Medicina de Emergência"
                    >
                      Modelo 2 · Emergência
                    </button>
                    <button
                      type="button"
                      onClick={() => setAheTemplate("v3")}
                      className={`px-2.5 h-7 rounded-full transition-colors ${aheTemplate === "v3" ? "bg-primary/20 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      title="Modelo 3: admissão de paciente crítico em UTI/urgência"
                    >
                      Modelo 3 · Admissão UTI
                    </button>
                  </div>
                )}
              </>
            )}
            {agentType === "prescriptus" && (
              <Toggle
                pressed={bulaInteligenteMode}
                onPressedChange={setBulaInteligenteMode}
                size="sm"
                className="shrink-0 h-8 data-[state=on]:bg-primary/20 gap-1 rounded-full"
                title="Modo B.I.: Bula Inteligente"
              >
                <Pill className="h-4 w-4" />
                <span className="text-xs">B.I.</span>
              </Toggle>
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
                  <SelectContent>
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
                  <SelectContent>
                    {MEDISCUSS_SPECIALTIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {agentType === "examinus" && (
              <>
                <Toggle
                  pressed={usePipeSeparator}
                  onPressedChange={setUsePipeSeparator}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-primary/20 rounded-full"
                  title="Separar exames com |"
                >
                  <SeparatorVertical className="h-4 w-4" />
                </Toggle>
                <div className="flex items-center gap-2 px-2 h-8 rounded-full bg-muted/40">
                  <Switch
                    id="include-time"
                    checked={includeTime}
                    onCheckedChange={setIncludeTime}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="include-time" className="text-xs cursor-pointer flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horário
                  </Label>
                </div>
                <Toggle
                  pressed={onlyAltered}
                  onPressedChange={setOnlyAltered}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400 rounded-full"
                  title="Mostrar apenas resultados alterados/críticos"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs ml-1">Alterados</span>
                </Toggle>
                <Toggle
                  pressed={clinicalImpression}
                  onPressedChange={setClinicalImpression}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 rounded-full"
                  title="Impressão clínica"
                >
                  <Stethoscope className="h-4 w-4" />
                  <span className="text-xs ml-1">Impressão</span>
                </Toggle>
                <Toggle
                  pressed={compactMode}
                  onPressedChange={setCompactMode}
                  size="sm"
                  className="shrink-0 h-8 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-600 dark:data-[state=on]:text-emerald-400 rounded-full"
                  title="Modo compacto"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span className="text-xs ml-1">Compacto</span>
                </Toggle>
              </>
            )}
          </div>
        )}

        {/* Input row: textarea (auto-grow + manual expand) + voice + send */}
        <div className="flex gap-1.5 md:gap-2 items-end">
          {isMobile && (
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
          )}
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 30000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isMobile ? "Mensagem... (Shift+Enter para nova linha)" : `${placeholder}  ·  Shift+Enter para nova linha`}
              maxLength={30000}
              rows={1}
              aria-invalid={(message.length > 0 && !message.trim()) || message.length >= 30000}
              className={`w-full resize-none pr-10 py-2.5 text-base leading-relaxed min-h-[44px] rounded-2xl transition-all ${
                (message.length > 0 && !message.trim()) || message.length >= 30000
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
          <Button
            onClick={sendMessage}
            disabled={!message.trim() || isLoading || message.length > 30000}
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full"
            title={!message.trim() ? "Digite uma mensagem para enviar" : "Enviar mensagem"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
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
              message.length >= 30000
                ? "text-destructive font-medium"
                : message.length >= 27000
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {message.length.toLocaleString("pt-BR")}/30.000
          </span>
        </div>
      </div>

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
                <p className="text-base md:text-xl leading-[1.7] whitespace-pre-wrap max-w-[80ch] mx-auto">
                  {agentType === "clinicus" ? readingMessage.content.replace(/\*\*/g, "") : readingMessage.content}
                </p>
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
