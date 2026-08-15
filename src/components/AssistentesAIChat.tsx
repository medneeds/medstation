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
  "Como funciona o Modo Escuta?",
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
export function AssistentesAIChat({
  className = "",
  title = "Concierge MedStation",
  subtitle = "Pergunte sobre qualquer assistente — resposta na hora, sem cadastro",
  suggestions = SUGGESTIONS,
  welcome,
  ask,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  suggestions?: string[];
  welcome?: string;
  /** Envia automaticamente uma pergunta quando o nonce muda. */
  ask?: { text: string; nonce: number };
}) {
  const welcomeMsg = useRef<Msg>(welcome ? { role: "assistant", content: welcome } : WELCOME).current;
  const [messages, setMessages] = useState<Msg[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastNonce = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);


  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const history = messages.filter((m) => m !== welcomeMsg);
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

  useEffect(() => {
    if (!ask || !ask.nonce || ask.nonce === lastNonce.current) return;
    lastNonce.current = ask.nonce;
    send(ask.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.nonce]);


  return (
    <div
      className={`flex flex-col h-full min-h-0 rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)] ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-background/40">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <MessageCircleQuestion className="w-4 h-4 text-primary" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>

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
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
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

      <div className="border-t border-border/50 bg-background/40 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: o Clínicus serve para emergência?"
            maxLength={2000}
            className="h-10 text-sm"
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-2.5">
          Tira dúvidas sobre a plataforma. Não substitui avaliação clínica.
        </p>
      </div>
    </div>
  );
}

export default AssistentesAIChat;

