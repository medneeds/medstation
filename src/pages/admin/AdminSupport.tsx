import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, Search } from "lucide-react";
import type { AdminMetrics } from "./types";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  last_message_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

interface Requester {
  full_name: string | null;
  crm: string | null;
  specialty: string | null;
  phone: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  geral: "Dúvida geral",
  tecnico: "Problema técnico",
  assinatura: "Assinatura e cobrança",
  conta: "Conta e acesso",
  sugestao: "Sugestão",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  assigned: "Em atendimento",
  waiting_user: "Aguardando cliente",
  resolved: "Resolvido",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Requester>>({});
  const [metrics, setMetrics] = useState<AdminMetrics["support"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const [ticketsRes, metricsRes] = await Promise.all([
      supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200),
      fetch(`https://${projectId}.supabase.co/functions/v1/admin-metrics`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (ticketsRes.error) toast.error(ticketsRes.error.message);
    else {
      const rows = (ticketsRes.data as Ticket[]) || [];
      setTickets(rows);
      const ids = [...new Set(rows.map((t) => t.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, crm, specialty, phone")
          .in("id", ids);
        const map: Record<string, Requester> = {};
        (profs || []).forEach((p: any) => {
          map[p.id] = { full_name: p.full_name, crm: p.crm, specialty: p.specialty, phone: p.phone };
        });
        setProfiles(map);
      }
    }
    if (metricsRes) setMetrics((metricsRes as AdminMetrics).support);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);


  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selectedId)
        .order("created_at");
      setMessages(data || []);
    })();

    const channel = supabase
      .channel(`support-${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selectedId}` },
        (payload) => setMessages((m) => [...m, payload.new as Message])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: selectedId,
        sender_type: "agent",
        sender_id: user?.id,
        content: reply.trim(),
      });
      if (error) throw error;
      await supabase.from("support_tickets").update({
        status: "waiting_user",
        assigned_to: user?.id,
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedId);
      setReply("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  const resolve = async () => {
    if (!selectedId) return;
    await supabase.from("support_tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", selectedId);
    toast.success("Ticket resolvido");
    load();
  };

  const selected = tickets.find((t) => t.id === selectedId);

  return (
    <div className="p-4 sm:p-6 space-y-5 h-screen flex flex-col">
      <header>
        <p className="text-sm text-muted-foreground">
          {metrics
            ? `${metrics.open + metrics.assigned} em aberto · ${metrics.resolved_total} resolvidos · ${metrics.total} total (global)`
            : `${tickets.filter((t) => t.status !== "resolved").length} ticket(s) em aberto`}
        </p>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-0">
        <Card className="overflow-y-auto">
          {loading && <div className="p-6 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
          {!loading && tickets.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhum ticket ainda
            </div>
          )}
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/40 ${selectedId === t.id ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium truncate">{t.subject}</div>
                <Badge variant={t.status === "open" ? "default" : "outline"} className="shrink-0 text-2xs">{t.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(t.last_message_at).toLocaleString("pt-BR")}
              </div>
            </button>
          ))}
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Selecione um ticket
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <div className="font-medium">{selected.subject}</div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.user_id.slice(0, 8)}...</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{selected.status}</Badge>
                  {selected.status !== "resolved" && (
                    <Button size="sm" variant="outline" onClick={resolve}>Resolver</Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-lg p-3 text-sm ${
                      m.sender_type === "user" ? "bg-muted" :
                      m.sender_type === "ai" ? "bg-sky-500/10 border border-sky-500/20" :
                      "bg-primary/10 border border-primary/20"
                    }`}>
                      <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">
                        {m.sender_type === "user" ? "Cliente" : m.sender_type === "ai" ? "IA" : "Suporte"}
                      </div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <div className="text-center text-muted-foreground text-sm py-6">Sem mensagens</div>}
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
