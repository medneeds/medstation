import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
  Check
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  timestamp: Date;
  audioBlob?: Blob;
  audioUrl?: string;
  transcription?: string;
}

interface Project {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: Date;
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
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const createNewProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Projeto ${projects.length + 1}`,
      lastMessage: "",
      updatedAt: new Date(),
      messages: [],
    };
    setProjects([newProject, ...projects]);
    setCurrentProject(newProject);
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    let project = currentProject;
    if (!project) {
      project = {
        id: Date.now().toString(),
        name: `Conversa ${projects.length + 1}`,
        lastMessage: "",
        updatedAt: new Date(),
        messages: [],
      };
      setProjects([project, ...projects]);
      setCurrentProject(project);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    const updatedProject = {
      ...project,
      messages: [...project.messages, userMessage],
      lastMessage: message,
      updatedAt: new Date(),
    };

    setCurrentProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setMessage("");
    setIsLoading(true);

    try {
      // Call AI agent
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          messages: updatedProject.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentType,
          caseId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      const finalProject = {
        ...updatedProject,
        messages: [...updatedProject.messages, assistantMessage],
      };

      setCurrentProject(finalProject);
      setProjects(projects.map(p => p.id === finalProject.id ? finalProject : p));
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

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  };

  const renameProject = (projectId: string, newName: string) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, name: newName } : p
    ));
    if (currentProject?.id === projectId) {
      setCurrentProject({ ...currentProject, name: newName });
    }
    setEditingProjectId(null);
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
          timestamp: new Date(),
          audioBlob: blob,
          audioUrl: audioUrl,
        };

        const updatedProject = {
          ...currentProject!,
          messages: [...(currentProject?.messages || []), newMessage],
          lastMessage: "[Áudio]",
          updatedAt: new Date(),
        };

        setCurrentProject(updatedProject);
        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with agent info and actions */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-3 bg-gradient-to-br from-primary/10 to-primary/5 ${agentColor}`}>
            {agentIcon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{agentName}</h2>
            {currentProject && (
              <p className="text-sm text-muted-foreground">{currentProject.name}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={createNewProject}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Histórico de Projetos</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhum projeto ainda</p>
                      <p className="text-sm mt-1">Crie um novo projeto para começar</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <Card
                        key={project.id}
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                          currentProject?.id === project.id ? "bg-accent" : ""
                        }`}
                        onClick={() => setCurrentProject(project)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingProjectId === project.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => renameProject(project.id, editingName)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    renameProject(project.id, editingName);
                                  }
                                }}
                                className="h-7 mb-1"
                                autoFocus
                              />
                            ) : (
                              <p className="font-medium truncate">{project.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {project.lastMessage || "Sem mensagens"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {project.updatedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(project.id);
                                setEditingName(project.name);
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
                                  <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O projeto "{project.name}" será excluído permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProject(project.id)}
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
        {!currentProject || currentProject.messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className={`rounded-full p-6 bg-gradient-to-br from-primary/10 to-primary/5 inline-block ${agentColor} mb-4`}>
              {agentIcon}
            </div>
            <p className="text-lg font-medium">Olá! Como posso ajudar?</p>
            <p className="text-sm mt-2">Envie uma mensagem para começar</p>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            {currentProject.messages.map((msg) => (
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
                        const updatedMessages = currentProject.messages.map(m =>
                          m.id === msg.id ? { ...m, transcription: text, content: text } : m
                        );
                        const updatedProject = { ...currentProject, messages: updatedMessages };
                        setCurrentProject(updatedProject);
                        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
                      }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString([], { 
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
