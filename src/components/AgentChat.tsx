import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  FileDown
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [message, setMessage] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
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

  useEffect(() => {
    fetchCases();
    loadConversations();
    loadLastActiveConversation();
  }, [agentType]);

  // Save current conversation ID to localStorage when it changes
  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem(`${agentType}_last_conversation`, currentConversation.id);
    }
  }, [currentConversation, agentType]);

  // Load last active conversation on mount
  const loadLastActiveConversation = async () => {
    const lastConvId = localStorage.getItem(`${agentType}_last_conversation`);
    if (lastConvId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", lastConvId)
        .single();

      if (!error && data) {
        const messages = await loadConversationMessages(data.id);
        setCurrentConversation({ ...data, messages });
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

      const updatedMessages = [...conversation.messages, userMessage];
      setCurrentConversation({ ...conversation, messages: updatedMessages });

      // Call AI agent
      const { data: aiData, error: aiError } = await supabase.functions.invoke("agent-chat", {
        body: {
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentType,
          caseId: selectedCaseId,
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

      const finalMessages = [...updatedMessages, assistantMessage];
      
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with agent info and actions */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3 flex-1">
          <div className={`rounded-xl p-3 bg-gradient-to-br from-primary/10 to-primary/5 ${agentColor}`}>
            {agentIcon}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{agentName}</h2>
            {currentConversation && (
              <p className="text-sm text-muted-foreground">{currentConversation.name}</p>
            )}
          </div>

          {/* Case selector */}
          {cases.length > 0 && (
            <div className="w-64">
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
        </div>

        <div className="flex gap-2">
          {currentConversation && currentConversation.messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportConversation}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={createNewConversation}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Histórico
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
        <div className="flex gap-2 py-3 border-b overflow-x-auto">
          {actionButtons.map((btn, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={btn.onClick}
              className="whitespace-nowrap"
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
          <div className="text-center py-12 text-muted-foreground">
            <div className={`rounded-full p-6 bg-gradient-to-br from-primary/10 to-primary/5 inline-block ${agentColor} mb-4`}>
              {agentIcon}
            </div>
            <p className="text-lg font-medium">Olá! Como posso ajudar?</p>
            <p className="text-sm mt-2">Envie uma mensagem para começar</p>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            {currentConversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 relative group ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
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
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {msg.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        title="Copiar texto"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={placeholder}
            className="flex-1"
            disabled={isRecording || isLoading}
          />
          {isRecording ? (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              className="shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                Parar
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
        <p className="text-xs text-muted-foreground mt-2">
          {isRecording 
            ? "Gravando áudio... Clique em 'Parar' quando terminar"
            : "Pressione Enter para enviar, Shift+Enter para quebrar linha"}
        </p>
      </div>
    </div>
  );
}
