import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, User, Loader2, BookOpen, Plus, History, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  useStudiusConversations, 
  useStudiusMessages, 
  useStudiusStats,
  StudiusMessage 
} from "@/hooks/useStudius";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const suggestedQuestions = [
  "Explique a fisiopatologia da insuficiência cardíaca",
  "Quais são os critérios de Light para derrame pleural?",
  "Resuma as indicações de anticoagulação na fibrilação atrial",
  "Qual o mecanismo de ação dos inibidores de SGLT2?",
];

export default function StudiusChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get("id");
  
  const { 
    conversations, 
    createConversation, 
    updateConversation, 
    deleteConversation 
  } = useStudiusConversations();
  
  const { messages, addMessage, setMessages } = useStudiusMessages(conversationId);
  const { incrementStat } = useStudiusStats();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<StudiusMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local messages with DB messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  const startNewConversation = async () => {
    try {
      const newConv = await createConversation();
      setSearchParams({ id: newConv.id });
      setLocalMessages([]);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erro ao criar conversa");
    }
  };

  const selectConversation = (id: string) => {
    setSearchParams({ id });
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (conversationId === id) {
        setSearchParams({});
        setLocalMessages([]);
      }
      toast.success("Conversa excluída");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Erro ao excluir conversa");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    let currentConversationId = conversationId;

    // Create conversation if none exists
    if (!currentConversationId) {
      try {
        const newConv = await createConversation(input.trim().slice(0, 50));
        currentConversationId = newConv.id;
        setSearchParams({ id: newConv.id });
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast.error("Erro ao criar conversa");
        return;
      }
    }

    const userMessageContent = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message to local state immediately
    const tempUserMessage: StudiusMessage = {
      id: crypto.randomUUID(),
      conversation_id: currentConversationId,
      role: "user",
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Save user message to DB
      await supabase.from("studius_messages").insert({
        conversation_id: currentConversationId,
        role: "user",
        content: userMessageContent,
      });

      // Increment stats
      await incrementStat("messages_sent");

      // Call AI
      const response = await supabase.functions.invoke("studius-chat", {
        body: {
          messages: [...localMessages, tempUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || "Desculpe, não consegui processar sua pergunta.";

      // Save assistant message to DB
      const { data: savedMessage, error: saveError } = await supabase
        .from("studius_messages")
        .insert({
          conversation_id: currentConversationId,
          role: "assistant",
          content: assistantContent,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      const assistantMessage: StudiusMessage = {
        ...savedMessage,
        role: savedMessage.role as "user" | "assistant",
      };

      setLocalMessages((prev) => [...prev, assistantMessage]);

      // Update conversation with last message
      await updateConversation(currentConversationId, {
        last_message: assistantContent.slice(0, 100),
      });
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studius-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/studius")}
            className="hover:bg-studius-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Chat IA Médico</h1>
              <p className="text-xs text-muted-foreground">Assistente especializado em medicina</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startNewConversation}
            className="border-studius-border hover:bg-studius-muted"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-studius-border hover:bg-studius-muted"
              >
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-studius-border">
              <SheetHeader>
                <SheetTitle>Histórico de Conversas</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma conversa ainda
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                        conversationId === conv.id
                          ? "border-studius-primary bg-studius-primary/10"
                          : "border-studius-border hover:border-studius-primary/50"
                      }`}
                      onClick={() => selectConversation(conv.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conv.title}</p>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conv.last_message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 py-4" ref={scrollAreaRef}>
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-studius-primary to-studius-secondary mb-6">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Como posso ajudar seus estudos?
            </h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Pergunte sobre qualquer tema médico. Posso explicar conceitos, resumir artigos, criar questões e muito mais.
            </p>
            
            {/* Suggested Questions */}
            <div className="grid gap-2 w-full max-w-lg">
              <p className="text-sm text-muted-foreground mb-2">Sugestões:</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-left p-3 rounded-lg border border-studius-border bg-card/50 hover:border-studius-primary/50 hover:bg-studius-muted/50 transition-all text-sm text-foreground"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 px-2">
            {localMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-studius-primary to-studius-secondary text-white">
                      <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-studius-primary to-studius-secondary text-white"
                      : "bg-studius-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-studius-primary to-studius-secondary text-white">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-studius-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-studius-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="pt-4 border-t border-studius-border">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo sobre medicina..."
            className="min-h-[60px] max-h-[200px] resize-none bg-studius-muted border-studius-border focus:border-studius-primary rounded-xl"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-[60px] w-[60px] rounded-xl bg-gradient-to-br from-studius-primary to-studius-secondary hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
