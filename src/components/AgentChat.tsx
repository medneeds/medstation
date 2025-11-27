import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import { exportAgentConversationToPDF } from "@/utils/pdfExport";
import { 
  Send, 
  Paperclip, 
  Plus, 
  History,
  FolderOpen,
  Edit2,
  Trash2,
  Mic,
  Copy,
  Check,
  FileDown,
  FileUp,
  SeparatorVertical,
  Clock
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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(caseId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [usePipeSeparator, setUsePipeSeparator] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
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
    if (!message.trim() || isLoading) return;

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

      // Add user message and temporary "thinking" message
      const thinkingMessage: Message = {
        id: "thinking-temp",
        role: "assistant",
        content: "Pensando...",
        created_at: new Date().toISOString()
      };

      const updatedMessages = [...conversation.messages, userMessage, thinkingMessage];
      setCurrentConversation({ ...conversation, messages: updatedMessages });

      // Call AI agent
      const { data: aiData, error: aiError } = await supabase.functions.invoke("agent-chat", {
        body: {
          messages: [...conversation.messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentType,
          caseId: selectedCaseId,
          ...(agentType === "examinus" && { usePipeSeparator, includeTime })
        },
      });

      if (aiError) throw aiError;

      // Save assistant message
      const { data: assistantMsgData, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: aiData.message
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      const assistantMessage: Message = {
        ...assistantMsgData,
        role: assistantMsgData.role as "user" | "assistant"
      };

      // Replace thinking message with actual response
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
      
      // Remove thinking message on error
      if (conversation) {
        const messagesWithoutThinking = conversation.messages.filter(m => m.id !== "thinking-temp");
        setCurrentConversation({ ...conversation, messages: messagesWithoutThinking });
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        
        // Auto-send audio message with blob
        const newMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: "[Mensagem de áudio]",
          created_at: new Date().toISOString(),
          audioBlob: blob,
          audioUrl: audioUrl,
        };

        if (currentConversation) {
          const updatedMessages = [...currentConversation.messages, newMessage];
          setCurrentConversation({ ...currentConversation, messages: updatedMessages });
        }
        setAudioBlob(null);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Store recorder to stop it later
      (window as any).activeRecorder = mediaRecorder;
    } catch (error) {
      console.error("Erro ao gravar áudio:", error);
    }
  };

  const stopRecording = () => {
    const recorder = (window as any).activeRecorder;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setIsRecording(false);
    }
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

  const processFiles = async (files: File[]) => {
    setUploadingFile(true);
    
    try {
      for (const file of files) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const supportedDocFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
        
        let fileContent = '';
        
        if (supportedDocFormats.includes(fileExtension || '')) {
          // Parse document using Lovable's document parser
          toast({
            title: "Processando documento",
            description: `Extraindo conteúdo de ${file.name}...`,
          });
          
          // Convert to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          // Call document processing edge function
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: {
              file: base64,
              fileName: file.name,
              mimeType: file.type
            }
          });
          
          if (error || !data?.text) {
            throw new Error('Erro ao processar documento');
          }
          
          fileContent = data.text;
          
        } else if (fileExtension === 'txt' || fileExtension === 'md') {
          // Read text files directly
          fileContent = await file.text();
        } else {
          toast({
            title: "Formato não suportado",
            description: `O formato .${fileExtension} não é suportado. Use PDF, DOCX, PPTX, XLSX, TXT ou MD.`,
            variant: "destructive",
          });
          continue;
        }
        
        // Add file content as a message
        const fileMessage = `📎 Arquivo anexado: ${file.name}\n\n${fileContent.slice(0, 5000)}${fileContent.length > 5000 ? '...\n\n[Conteúdo truncado para brevidade]' : ''}`;
        
        setMessage(fileMessage);
        
        toast({
          title: "✓ Arquivo processado",
          description: `${file.name} foi extraído com sucesso. Clique em enviar.`,
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
      className="flex flex-col h-full p-4 md:p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center">
            <Paperclip className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-bold">Solte o arquivo aqui</p>
            <p className="text-sm text-muted-foreground mt-2">PDF, DOCX, PPTX, XLSX, TXT, MD</p>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Header with agent info and actions */}
      <div className="flex flex-col gap-3 pb-4 border-b md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className={`rounded-xl p-2 md:p-3 bg-gradient-to-br from-primary/10 to-primary/5 ${agentColor} shrink-0`}>
            {agentIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-2xl font-bold truncate">{agentName}</h2>
            {currentConversation && (
              <p className="text-xs md:text-sm text-muted-foreground truncate">{currentConversation.name}</p>
            )}
          </div>
        </div>

        {/* Case selector - full width on mobile */}
        {cases.length > 0 && (
          <div className="w-full md:w-64">
            <Select
              value={selectedCaseId || "none"}
              onValueChange={(value) => setSelectedCaseId(value === "none" ? undefined : value)}
            >
              <SelectTrigger className="w-full">
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

        <div className="flex gap-2">
          <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={createNewConversation} title="Nova Conversa">
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Nova Conversa</span>}
          </Button>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size={isMobile ? "icon" : "sm"} title="Histórico">
                <History className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Histórico</span>}
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {msg.role === "assistant" && (
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="border-t pt-3 md:pt-4">
        <div className="flex gap-1.5 md:gap-2">
          {!isMobile && (
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              title="Anexar arquivo (PDF, DOCX, PPTX, XLSX, TXT, MD)"
            >
              {uploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          )}
          {agentType === "examinus" && (
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
            </>
          )}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={isMobile ? "Mensagem..." : placeholder}
            className="flex-1 text-sm md:text-base"
            disabled={isRecording || isLoading}
          />
          {isRecording ? (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size={isMobile ? "sm" : "default"}
              className="shrink-0"
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm">Parar</span>
              </div>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={startRecording}
                className="shrink-0"
                title="Gravar áudio"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button 
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                size="icon"
                className="shrink-0"
                title="Enviar mensagem"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
        {!isMobile && (
          <p className="text-xs text-muted-foreground mt-2">
            {isRecording 
              ? "Gravando áudio... Clique em 'Parar' quando terminar"
              : "Pressione Enter para enviar, Shift+Enter para quebrar linha"}
          </p>
        )}
      </div>
    </div>
  );
}
