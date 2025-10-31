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

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Examinus Demo</h3>
              <p className="text-white/80 text-sm">Interpretação de Exames com IA</p>
            </div>
          </div>
          {remainingMessages !== null && (
            <div className="text-white/90 text-sm bg-white/10 px-3 py-1 rounded-full">
              {remainingMessages} mensagens restantes
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-4"
                    : "bg-muted mr-4"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cole os resultados de exames aqui ou faça uma pergunta..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {/* CTA Footer */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            💡 Teste grátis • Sem cadastro necessário
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pricing")}
            className="text-primary hover:text-primary"
          >
            Criar conta para uso ilimitado
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
