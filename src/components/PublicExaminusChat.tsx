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
      content: "👋 Olá! Sou o **Examinus**, especializado em interpretação de exames médicos.\n\n💡 **Como funciona:**\n1. Clique em um exemplo rápido ou cole seus resultados\n2. Receba análise estruturada em segundos\n3. Zero digitação, máxima produtividade\n\nVamos começar?"
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

  const quickExamples = [
    { 
      label: "Hemograma", 
      icon: "🩸", 
      prompt: "Hemograma Completo:\n• Hemoglobina: 10,2 g/dL (ref: 12-16)\n• Hematócrito: 32% (ref: 36-48)\n• VCM: 74 fL (ref: 80-100)\n• CHCM: 30 g/dL (ref: 32-36)\n• Leucócitos: 12.400/mm³ (ref: 4.000-11.000)\n• Neutrófilos: 78% (ref: 40-75)\n• Linfócitos: 15% (ref: 20-45)\n• Plaquetas: 180.000/mm³ (ref: 150.000-400.000)"
    },
    { 
      label: "Glicemia", 
      icon: "🍬", 
      prompt: "Exames de Glicose:\n• Glicemia de jejum: 126 mg/dL (ref: 70-100)\n• Hemoglobina glicada (HbA1c): 7,2% (ref: <5,7)\n• Insulina basal: 18 µU/mL (ref: 5-25)"
    },
    { 
      label: "Tireoide", 
      icon: "🦋", 
      prompt: "Função Tireoidiana:\n• TSH: 8,5 mUI/L (ref: 0,4-4,0)\n• T4 livre: 0,7 ng/dL (ref: 0,9-1,8)\n• T3 total: 82 ng/dL (ref: 80-200)"
    },
    { 
      label: "Lipidograma", 
      icon: "💧", 
      prompt: "Perfil Lipídico:\n• Colesterol total: 245 mg/dL (ref: <200)\n• HDL: 38 mg/dL (ref: >40)\n• LDL: 165 mg/dL (ref: <100)\n• Triglicerídeos: 210 mg/dL (ref: <150)"
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const messagesHeight = Math.min(500, Math.max(280, messages.length * 70 + 80));

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border border-[#22c55e]/20 bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] backdrop-blur transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#22c55e]/90 to-[#16a34a]/90 p-4 rounded-t-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                Examinus Demo
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">Grátis</span>
              </h3>
              <p className="text-white/90 text-sm">Cole exames reais e veja a mágica acontecer</p>
            </div>
          </div>
          {remainingMessages !== null && (
            <div className="text-white text-sm bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold ring-2 ring-white/20">
              {remainingMessages} análises restantes
            </div>
          )}
        </div>
      </div>

      {/* Quick Examples - Show if no messages yet or just welcome message */}
      {messages.length <= 1 && (
        <div className="p-4 bg-gradient-to-b from-[#0f172a] to-transparent border-b border-white/5">
          <div className="mb-3">
            <p className="text-white/90 text-sm font-medium mb-1">⚡ Teste com exemplos prontos:</p>
            <p className="text-white/50 text-xs">Clique em um exemplo abaixo para ver a análise instantânea</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {quickExamples.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(example.prompt)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#0f172a]/50 hover:bg-[#22c55e]/10 border border-white/10 hover:border-[#22c55e]/30 transition-all group hover:scale-105 hover:shadow-lg"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{example.icon}</span>
                <span className="text-xs text-center text-white/70 group-hover:text-white font-medium">
                  {example.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages - Dynamic Height */}
      <ScrollArea 
        className="p-4 transition-all duration-300 bg-[#0a0f1a]/50" 
        style={{ height: `${messagesHeight}px` }}
        ref={scrollRef}
      >
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-300`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white ml-4"
                    : "bg-[#0f172a] text-white/90 mr-4 border border-white/10"
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
              <div className="bg-[#0f172a] rounded-2xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#22c55e]" />
                  <span className="text-white/60 text-sm">Analisando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-[#0f172a]/80 backdrop-blur rounded-b-xl">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cole resultados completos de exames aqui (hemograma, bioquímica, imagens, etc)..."
            className="min-h-[80px] max-h-[180px] resize-none text-sm bg-[#0a0f1a] border-white/20 text-white placeholder:text-white/40 focus:border-[#22c55e]/50 focus:ring-[#22c55e]/20"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="self-end h-[80px] w-[80px] bg-gradient-to-br from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#22c55e] shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </Button>
        </div>
        
        {/* CTA Footer */}
        <div className="mt-3 flex items-center justify-between text-xs flex-wrap gap-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg px-3 py-2">
          <p className="text-white/70 flex items-center gap-2">
            <span className="text-[#22c55e]">✓</span> Teste grátis • Sem cadastro • Sem cartão
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pricing")}
            className="text-[#22c55e] hover:text-white hover:bg-[#22c55e]/20 h-8 text-xs font-semibold"
          >
            Desbloquear ilimitado
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
