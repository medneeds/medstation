import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ListChecks
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
import { Toggle } from "@/components/ui/toggle";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  audioBlob?: Blob;
  audioUrl?: string;
  transcription?: string;
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
  const isMobile = useIsMobile();
  const [message, setMessage] = useState("");
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
  const [directAHEMode, setDirectAHEMode] = useState(false);
  const [bulaInteligenteMode, setBulaInteligenteMode] = useState(false);
  const [directLIMode, setDirectLIMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast({
        title: "Mensagem vazia",
        description: "Digite algo antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let conversation = currentConversation;
    
    // Create new conversation if none exists
    if (!conversation) {
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

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível criar a conversa.",
          variant: "destructive",
        });
        return;
      }

      conversation = { ...data, messages: [] };
      setConversations([conversation, ...conversations]);
      setCurrentConversation(conversation);
    }

    const messageContent = message;
    setMessage("");
    setIsLoading(true);

    try {
      // Save user message
      const { data: userMsgData, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: messageContent
        })
        .select()
        .single();

      if (userError) throw userError;

      const userMessage: Message = {
        ...userMsgData,
        role: userMsgData.role as "user" | "assistant"
      };

      // Add user message and "Pensando..." message
      const thinkingMessage: Message = {
        id: "streaming-temp",
        role: "assistant",
        content: "Pensando...",
        created_at: new Date().toISOString()
      };
      const updatedMessages = [...conversation.messages, userMessage, thinkingMessage];
      setCurrentConversation({ ...conversation, messages: updatedMessages });

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
          ...(agentType === "examinus" && { usePipeSeparator, includeTime, onlyAltered, clinicalImpression }),
          ...(agentType === "clinicus" && { directAHEMode }),
          ...(agentType === "prescriptus" && { bulaInteligenteMode }),
          ...(agentType === "gasometrus" && { directLIMode })
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
        title: "Copiado!",
        description: "Texto copiado para a área de transferência.",
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
      className="flex flex-col h-full p-3 md:p-6"
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
      
      {/* Header — compact, single row on mobile */}
      <div className="flex flex-col gap-2 pb-3 md:pb-4 border-b md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className={`rounded-lg md:rounded-xl p-1.5 md:p-3 bg-gradient-to-br from-primary/10 to-primary/5 ${agentColor} shrink-0`}>
            <span className="block [&>svg]:h-5 [&>svg]:w-5 md:[&>svg]:h-8 md:[&>svg]:w-8">
              {agentIcon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-2xl font-bold truncate leading-tight">{agentName}</h2>
            {currentConversation && (
              <p className="text-[11px] md:text-sm text-muted-foreground truncate">{currentConversation.name}</p>
            )}
          </div>

          {/* Mobile inline actions */}
          <div className="flex md:hidden gap-1 shrink-0">
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
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            <div className={`rounded-full p-4 md:p-6 bg-gradient-to-br from-primary/10 to-primary/5 inline-block ${agentColor} mb-4`}>
              {agentIcon}
            </div>
            <p className="text-base md:text-lg font-medium">Olá! Como posso ajudar?</p>
            <p className="text-xs md:text-sm mt-2">Envie uma mensagem para começar</p>
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
        ) : (
          <div className="space-y-4">
            {currentConversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 md:px-4 relative group ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground py-2 md:py-3"
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
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.role === "assistant" && agentType === "clinicus" ? msg.content.replace(/\*\*/g, "") : msg.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {msg.role === "assistant" && (
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
            ))}
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
          </div>
        )}

        {/* Mobile: Other agent toggles row */}
        {isMobile && agentType === "clinicus" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Toggle
              pressed={directAHEMode}
              onPressedChange={setDirectAHEMode}
              size="sm"
              className="h-7 px-2 text-xs rounded-full shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo AHE"
            >
              <FileDown className="h-3 w-3" />
              <span>AHE</span>
            </Toggle>
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

        {/* Input row */}
        <div className="flex gap-1.5 md:gap-2 items-center">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 h-9 w-9 rounded-full hover:bg-primary/10"
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
          {!isMobile && (
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              title="Anexar foto, PDF ou documento (imagem, PDF, DOCX, PPTX, XLSX, TXT, MD)"
            >
              {uploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          )}
          {/* Desktop-only agent toggles inline */}
          {!isMobile && agentType === "clinicus" && (
            <Toggle
              pressed={directAHEMode}
              onPressedChange={setDirectAHEMode}
              size="sm"
              className="shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo AHE: gerar anamnese hospitalar estruturada diretamente"
            >
              <FileDown className="h-4 w-4" />
              <span className="text-xs">AHE</span>
            </Toggle>
          )}
          {!isMobile && agentType === "prescriptus" && (
            <Toggle
              pressed={bulaInteligenteMode}
              onPressedChange={setBulaInteligenteMode}
              size="sm"
              className="shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo B.I.: Bula Inteligente - resposta estruturada sobre medicamento"
            >
              <Pill className="h-4 w-4" />
              <span className="text-xs">B.I.</span>
            </Toggle>
          )}
          {!isMobile && agentType === "gasometrus" && (
            <Toggle
              pressed={directLIMode}
              onPressedChange={setDirectLIMode}
              size="sm"
              className="shrink-0 data-[state=on]:bg-primary/20 gap-1"
              title="Modo L.I.: Leitura Sistemática - análise objetiva focada"
            >
              <ListChecks className="h-4 w-4" />
              <span className="text-xs">L.I.</span>
            </Toggle>
          )}
          {!isMobile && agentType === "examinus" && (
            <>
              <Toggle
                pressed={usePipeSeparator}
                onPressedChange={setUsePipeSeparator}
                size="sm"
                className="shrink-0 data-[state=on]:bg-primary/20"
                title="Separar exames com |"
              >
                <SeparatorVertical className="h-4 w-4" />
              </Toggle>
              <div className="flex items-center gap-2 px-2">
                <Switch
                  id="include-time"
                  checked={includeTime}
                  onCheckedChange={setIncludeTime}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="include-time" className="text-sm cursor-pointer flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Horário
                </Label>
              </div>
              <Toggle
                pressed={onlyAltered}
                onPressedChange={setOnlyAltered}
                size="sm"
                className="shrink-0 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                title="Mostrar apenas resultados alterados/críticos"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs ml-1">Alterados</span>
              </Toggle>
              <Toggle
                pressed={clinicalImpression}
                onPressedChange={setClinicalImpression}
                size="sm"
                className="shrink-0 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400"
                title="Impressão clínica: análise das alterações laboratoriais"
              >
                <Stethoscope className="h-4 w-4" />
                <span className="text-xs ml-1">Impressão</span>
              </Toggle>
            </>
          )}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 10000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={isMobile ? "Mensagem..." : placeholder}
            maxLength={10000}
            aria-invalid={(message.length > 0 && !message.trim()) || message.length >= 10000}
            className={`flex-1 text-base md:text-base h-11 md:h-10 ${
              (message.length > 0 && !message.trim()) || message.length >= 10000
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
            disabled={isLoading}
          />
          <AgentVoiceInput 
            onTranscription={handleVoiceTranscription}
            disabled={isLoading}
            context={agentType}
          />
          <Button 
            onClick={sendMessage}
            disabled={!message.trim() || isLoading || message.length > 10000}
            size="icon"
            className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full md:rounded-md"
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
              <p className="text-xs text-destructive truncate" role="alert">
                A mensagem contém apenas espaços. Digite algum texto para enviar.
              </p>
            ) : !isMobile ? (
              <p className="text-xs text-muted-foreground truncate">
                Pressione Enter para enviar, Shift+Enter para quebrar linha
              </p>
            ) : null}
          </div>
          <span
            className={`text-xs tabular-nums shrink-0 ${
              message.length >= 10000
                ? "text-destructive font-medium"
                : message.length >= 9000
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {message.length.toLocaleString("pt-BR")}/10.000
          </span>
        </div>
      </div>
    </div>
  );
}
