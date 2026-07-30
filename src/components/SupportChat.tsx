import { useState, useRef, useEffect, useCallback } from "react";

export const SUPPORT_CHAT_EVENT = "open-support-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  Square,
  Loader2,
  UserRound,
  Lock,
  ArrowLeft,
  Inbox,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  last_message_at: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Olá! Sou o assistente de suporte da MedStation. Me conte o que está acontecendo — se eu não resolver, encaminho para a equipe com todo o histórico.",
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "geral", label: "Dúvida geral" },
  { value: "tecnico", label: "Problema técnico" },
  { value: "assinatura", label: "Assinatura e cobrança" },
  { value: "conta", label: "Conta e acesso" },
  { value: "sugestao", label: "Sugestão de melhoria" },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  assigned: "Em atendimento",
  waiting_user: "Aguardando você",
  resolved: "Resolvido",
};

const SEEN_KEY = "support-tickets-seen";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSeen(map: Record<string, string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
}

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"assistant" | "tickets">("assistant");

  // AI chat
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Escalation form
  const [escalating, setEscalating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("geral");
  const [priority, setPriority] = useState("normal");

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketReply, setTicketReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [seen, setSeen] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscribed, loading: subLoading } = useSubscription();
  const { isStaff, loading: roleLoading } = useAdminRole();

  const hasAccess = subscribed || isStaff;
  const accessLoading = subLoading || roleLoading;

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [ticketMessages]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(SUPPORT_CHAT_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_CHAT_EVENT, handler);
  }, []);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, status, priority, category, created_at, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (error) console.error("[support] tickets", error);
    else setTickets((data as Ticket[]) || []);
    setTicketsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && hasAccess) loadTickets();
  }, [isOpen, hasAccess, loadTickets]);

  // Realtime on the open ticket thread
  useEffect(() => {
    if (!activeTicketId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, sender_type, content, created_at")
        .eq("ticket_id", activeTicketId)
        .order("created_at");
      if (!cancelled) setTicketMessages((data as TicketMessage[]) || []);
    })();

    const channel = supabase
      .channel(`support-user-${activeTicketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${activeTicketId}`,
        },
        (payload: any) => {
          setTicketMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as TicketMessage],
          );
          markSeen(activeTicketId);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicketId]);

  const markSeen = (ticketId: string) => {
    setSeen((prev) => {
      const next = { ...prev, [ticketId]: new Date().toISOString() };
      writeSeen(next);
      return next;
    });
  };

  const unreadCount = tickets.filter((t) => {
    if (t.status === "resolved") return false;
    const last = seen[t.id];
    return !last || new Date(t.last_message_at) > new Date(last);
  }).length;

  const handleClose = () => {
    setIsOpen(false);
    setEscalating(false);
  };

  const openTicket = (t: Ticket) => {
    setActiveTicketId(t.id);
    markSeen(t.id);
  };

  const startEscalation = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    setSubject(lastUserMsg.slice(0, 90) || "Solicitação de suporte");
    setEscalating(true);
  };

  const createTicket = async () => {
    if (!subject.trim() || creating) return;
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert([
          {
            user_id: user.id,
            subject: subject.trim(),
            category,
            priority,
            status: "open",
            ai_context_snapshot: { messages } as any,
            last_message_at: new Date().toISOString(),
          },
        ])
        .select("id, subject, status, priority, category, created_at, last_message_at")
        .single();
      if (error) throw error;

      const rows = messages
        .filter((m) => m.content && m.content !== INITIAL_MESSAGE.content)
        .map((m) => ({
          ticket_id: ticket.id,
          sender_type: m.role === "user" ? "user" : "ai",
          sender_id: m.role === "user" ? user.id : null,
          content: m.content,
        }));
      if (rows.length) {
        const { error: msgErr } = await supabase.from("support_messages").insert(rows);
        if (msgErr) console.error("[support] history", msgErr);
      }

      setTickets((prev) => [ticket as Ticket, ...prev]);
      setEscalating(false);
      setTab("tickets");
      setActiveTicketId(ticket.id);
      markSeen(ticket.id);
      setMessages([INITIAL_MESSAGE]);
      toast({ title: "Chamado aberto", description: "Nossa equipe foi notificada e responde por aqui." });
    } catch (e: any) {
      console.error("[support] createTicket", e);
      toast({ title: "Erro", description: e.message || "Não foi possível abrir o chamado.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const sendTicketReply = async () => {
    if (!activeTicketId || !ticketReply.trim() || sendingReply) return;
    setSendingReply(true);
    const content = ticketReply.trim();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: activeTicketId,
        sender_type: "user",
        sender_id: user?.id,
        content,
      });
      if (error) throw error;
      const now = new Date().toISOString();
      await supabase
        .from("support_tickets")
        .update({ status: "open", last_message_at: now })
        .eq("id", activeTicketId);
      setTicketReply("");
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicketId ? { ...t, status: "open", last_message_at: now } : t)),
      );
      markSeen(activeTicketId);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível enviar.", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-chat", { body: { message: text } });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ title: "Erro", description: "Não foi possível acessar o microfone.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        if (!base64Audio) throw new Error("Falha ao converter áudio");
        const { data, error } = await supabase.functions.invoke("transcribe-case", { body: { audio: base64Audio } });
        if (error) throw error;
        if (data?.transcription) await sendMessage(data.transcription);
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({ title: "Erro", description: "Não foi possível processar o áudio.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  if (!isOpen) return null;

  return (
    <Card
      className="fixed z-50 flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 overflow-hidden
        inset-x-4 bottom-4 h-[80vh] max-h-[640px]
        md:inset-x-auto md:bottom-6 md:left-[calc(var(--sidebar-width,16rem)+1rem)] md:w-[400px] md:h-[640px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="font-semibold truncate">Suporte MedStation</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="hover:bg-primary-foreground/20 h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {accessLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !hasAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Suporte exclusivo para assinantes</h3>
            <p className="text-sm text-muted-foreground">
              O atendimento com a nossa equipe faz parte dos planos MedStation AI. Assine para abrir chamados e falar
              direto com quem constrói a plataforma.
            </p>
          </div>
          <div className="w-full space-y-2">
            <Button className="w-full" onClick={() => { handleClose(); navigate("/pricing"); }}>
              <Sparkles className="h-4 w-4 mr-2" />
              Ver planos
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Agora não
            </Button>
          </div>
        </div>
      ) : activeTicket ? (
        /* ---------- Ticket thread ---------- */
        <>
          <div className="px-3 py-2.5 border-b flex items-start gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setActiveTicketId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{activeTicket.subject}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={activeTicket.status === "resolved" ? "outline" : "secondary"} className="text-2xs">
                  {STATUS_LABEL[activeTicket.status] || activeTicket.status}
                </Badge>
                <span className="text-2xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === activeTicket.category)?.label || activeTicket.category}
                </span>
              </div>
            </div>
          </div>

          <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {ticketMessages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.sender_type === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.sender_type === "ai"
                        ? "bg-muted/60 border border-border/50"
                        : "bg-muted"
                  }`}
                >
                  {m.sender_type !== "user" && (
                    <div className="text-2xs uppercase tracking-wider opacity-60 mb-1">
                      {m.sender_type === "ai" ? "Assistente" : "Equipe MedStation"}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {ticketMessages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">Sem mensagens neste chamado.</div>
            )}
          </div>

          {activeTicket.status === "resolved" ? (
            <div className="p-3 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Chamado resolvido
            </div>
          ) : (
            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={ticketReply}
                onChange={(e) => setTicketReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTicketReply();
                  }
                }}
                placeholder="Responder à equipe..."
                className="min-h-[52px] resize-none"
              />
              <Button size="icon" onClick={sendTicketReply} disabled={sendingReply || !ticketReply.trim()}>
                {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b bg-muted/20">
            <button
              onClick={() => setTab("assistant")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                tab === "assistant" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              Assistente
            </button>
            <button
              onClick={() => setTab("tickets")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tab === "tickets" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              Meus chamados
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-2xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {tab === "assistant" ? (
            escalating ? (
              /* ---------- Escalation form ---------- */
              <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-sm">Abrir chamado com a equipe</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    A conversa com o assistente vai anexada automaticamente.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assunto</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEscalating(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={createTicket} disabled={creating || !subject.trim()}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Abrir chamado
                  </Button>
                </div>
              </div>
            ) : (
              /* ---------- AI chat ---------- */
              <>
                <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Precisa de um humano?</span>
                  <Button size="sm" variant="outline" onClick={startEscalation} className="h-7 text-xs">
                    <UserRound className="h-3 w-3 mr-1.5" />
                    Abrir chamado
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t space-y-2">
                  {isProcessing && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processando áudio...
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      placeholder="Digite sua dúvida..."
                      className="min-h-[56px] resize-none"
                      disabled={isLoading || isRecording || isProcessing}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading || isRecording || isProcessing}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isLoading || isProcessing}
                        size="icon"
                        variant={isRecording ? "destructive" : "outline"}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            /* ---------- Ticket list ---------- */
            <div className="flex-1 overflow-y-auto">
              {ticketsLoading && (
                <div className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin inline text-muted-foreground" />
                </div>
              )}
              {!ticketsLoading && tickets.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  Você ainda não abriu nenhum chamado.
                  <Button variant="link" className="mt-2 block mx-auto" onClick={() => setTab("assistant")}>
                    Falar com o assistente
                  </Button>
                </div>
              )}
              {tickets.map((t) => {
                const isUnread =
                  t.status !== "resolved" && (!seen[t.id] || new Date(t.last_message_at) > new Date(seen[t.id]));
                return (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t)}
                    className="w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium truncate">{t.subject}</span>
                      {isUnread && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={t.status === "resolved" ? "outline" : "secondary"} className="text-2xs">
                        {STATUS_LABEL[t.status] || t.status}
                      </Badge>
                      <span className="text-2xs text-muted-foreground">
                        {new Date(t.last_message_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
