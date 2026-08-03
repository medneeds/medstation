import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircleQuestion, Send, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "O que o Examinus faz na prática?",
  "Como funciona o Modo Consultório?",
  "Qual assistente ajuda no plantão?",
  "O que vem no plano pago?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Olá, doutor(a). Posso explicar o que cada assistente faz e ajudar você a escolher por onde começar. O que quer saber?",
};

/**
 * Chat público de dúvidas sobre os assistentes — usado na tela de entrada
 * para orientar o lead frio antes de qualquer cadastro.
 */
export function AssistentesAIChat({ className = "" }: { className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const history = messages.filter((m) => m !== WELCOME);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-assistants-chat", {
        body: { message: question, history },
      });
      if (error) throw error;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data?.response ||
            data?.error ||
            "Não consegui responder agora. Tente novamente em instantes.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Não consegui responder agora. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full min-h-0 rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)] ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-background/40">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <MessageCircleQuestion className="w-4 h-4 text-primary" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">Concierge MedStation</p>
          <p className="text-[11px] text-muted-foreground">
            Pergunte sobre qualquer assistente — resposta na hora, sem cadastro
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Online
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-5 py-4">

        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                  <LogoMark className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm"
                    : "max-w-[90%] text-sm text-foreground whitespace-pre-line"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Pensando...
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 p-3 border-t border-border/50 bg-background/40"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: o Clínicus serve para emergência?"
          maxLength={2000}
          className="h-9 text-sm"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

export default AssistentesAIChat;
