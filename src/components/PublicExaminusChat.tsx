import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PublicExaminusChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Olá! Sou o Examinus, especializado em interpretação de exames médicos. Cole resultados de exames e farei uma análise detalhada para você!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("public-examinus", {
        body: { messages: [...messages, userMessage] }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Limite atingido",
          description: data.error,
          variant: "destructive",
        });
        
        // Add CTA message when limit reached
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "🎯 Você atingiu o limite de mensagens gratuitas! Crie uma conta gratuita para continuar conversando e ter acesso a recursos exclusivos como histórico de conversas, upload de documentos e todos os 6 agentes especializados."
        }]);
        
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRemainingMessages(data.remainingMessages);

      // Show upgrade prompt after 3 messages
      if (data.remainingMessages <= 7 && data.remainingMessages > 0) {
        setTimeout(() => {
          toast({
            title: "💡 Gostando do Examinus?",
            description: `Você tem ${data.remainingMessages} mensagens restantes. Crie uma conta gratuita para uso ilimitado!`,
            action: (
              <Button size="sm" onClick={() => navigate("/pricing")} className="ml-2">
                Criar Conta
              </Button>
            ),
          });
        }, 1000);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: "Analisar exame de sangue", icon: "🩸", prompt: "Analise estes resultados de hemograma completo e me explique os valores alterados:" },
    { label: "Interpretar imagem", icon: "🔬", prompt: "Preciso de ajuda para interpretar este resultado de exame de imagem:" },
    { label: "Reescrever laudo", icon: "📝", prompt: "Reescreva este laudo de forma mais clara e objetiva para o paciente:" },
    { label: "Valores de referência", icon: "📊", prompt: "Quais são os valores de referência normais para:" },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const messagesHeight = Math.min(500, Math.max(280, messages.length * 70 + 80));

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl border border-primary/20 bg-background/98 backdrop-blur transition-all duration-300">
      {/* Compact Header */}
      <div className="bg-gradient-primary p-3 rounded-t-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Examinus Demo</h3>
              <p className="text-white/90 text-xs">Interpretação de Exames com IA</p>
            </div>
          </div>
          {remainingMessages !== null && (
            <div className="text-white text-xs bg-white/15 backdrop-blur px-2.5 py-1 rounded-full font-medium">
              {remainingMessages} msgs
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Only show if no messages yet or just welcome message */}
      {messages.length <= 1 && (
        <div className="p-3 bg-muted/30 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-background hover:bg-primary/5 border border-border/50 hover:border-primary/30 transition-all group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-xs text-center text-muted-foreground group-hover:text-foreground font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages - Dynamic Height */}
      <ScrollArea 
        className="p-3 transition-all duration-300" 
        style={{ height: `${messagesHeight}px` }}
        ref={scrollRef}
      >
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-3"
                    : "bg-muted mr-3 border border-border/50"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-muted rounded-xl px-3.5 py-2.5 border border-border/50">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compact Input */}
      <div className="p-3 border-t bg-muted/30 backdrop-blur">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cole resultados de exames, descreva sintomas ou peça interpretações..."
            className="min-h-[70px] max-h-[180px] resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="self-end h-[70px] w-[70px]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {/* CTA Footer */}
        <div className="mt-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
          <p className="text-muted-foreground">
            💡 Teste grátis • Sem cadastro
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pricing")}
            className="text-primary hover:text-primary hover:bg-primary/10 h-7 text-xs"
          >
            Uso ilimitado
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
