import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CircleAlert, Loader2, MessageCircle, Pause, Play, PlayCircle, RefreshCw, Send, UserPlus, UserX } from "lucide-react";

// Painel da recuperação por WhatsApp (Bird). Dados e ações: edge function admin-whatsapp-recovery.

type Msg = {
  id: string;
  step: number;
  status: "sending" | "accepted" | "sent" | "delivered" | "read" | "failed";
  error_code: string | null;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  read_at: string | null;
};

type Contact = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone_e164: string;
  segment: "trial_expired" | "ex_subscriber";
  status: "active" | "replied" | "converted" | "opted_out" | "finished" | "failed" | "paused";
  last_step: number;
  last_sent_at: string | null;
  last_inbound_at: string | null;
  last_inbound_text: string | null;
  entered_at: string;
  converted_at: string | null;
  note: string | null;
  messages: Msg[];
};

type Eligible = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string;
  segment: Contact["segment"];
  trial_ends_at: string | null;
  last_sign_in_at: string | null;
};

type Overview = {
  generated_at: string;
  config: {
    bird_configured: boolean;
    from: string | null;
    webhook_configured: boolean;
    auto_enabled: boolean;
    daily_cap: number;
    enrolled_today: number;
    landing_path: string;
    send_window_open: boolean;
    templates: { segment: string; step: number; slug: string }[];
  };
  totals: { users: number; paying: number; eligible_waiting: number; opted_out: number };
  funnel: {
    contacts: number;
    messagesSent: number;
    messagesFailed: number;
    delivered: number;
    read: number;
    replied: number;
    converted: number;
    optedOut: number;
    byStatus: Record<Contact["status"], number>;
    conversionRate: number;
  };
  ineligible_reasons: Record<string, number>;
  eligible: Eligible[];
  contacts: Contact[];
};

type ActionResult = {
  error?: string;
  outcome?: string;
  enrolled?: number;
  sent?: Record<string, number>;
  plan?: { enroll: number; send: number; close: number };
};

const SEGMENT: Record<Contact["segment"], string> = { trial_expired: "Teste expirado", ex_subscriber: "Ex-assinante" };
const STATUS: Record<Contact["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Em cadência", variant: "secondary" },
  replied: { label: "Respondeu", variant: "default" },
  converted: { label: "Converteu", variant: "default" },
  opted_out: { label: "Pediu para sair", variant: "outline" },
  finished: { label: "Cadência concluída", variant: "outline" },
  failed: { label: "Falhou", variant: "destructive" },
  paused: { label: "Pausado", variant: "outline" },
};
const MSG_STATUS: Record<Msg["status"], string> = {
  sending: "enviando",
  accepted: "aceita",
  sent: "enviada",
  delivered: "entregue",
  read: "lida",
  failed: "falhou",
};
const REASON: Record<string, string> = {
  admin: "Administradores",
  paying: "Assinantes ativos",
  courtesy: "Cortesias",
  not_doctor: "Não declarados médicos",
  no_email: "Sem e-mail",
  no_phone: "Sem celular válido",
  skip_list: "Contas de teste",
  no_trial: "Nunca fizeram o teste",
  trial_active: "Teste em andamento",
  trial_too_recent: "Teste acabou há menos de 24 h",
  trial_too_old: "Teste acabou há mais de 1 ano",
  opted_out: "Pediram para sair",
};
const OUTCOME: Record<string, string> = {
  sent: "Mensagem enviada",
  converted: "Já é assinante: marcado como convertido",
  already: "Essa etapa já tinha sido enviada",
  failed: "WhatsApp recusou o número",
  retry: "Falha temporária: tente de novo em alguns minutos",
  skipped_access_check: "Não enviado: acesso atual não permite (cortesia, teste ativo ou verificação falhou)",
  not_configured: "Bird ainda não configurado",
};

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
const phoneLabel = (e164: string) => e164.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
const waMe = (e164: string) => `https://wa.me/${e164.replace(/\D/g, "")}`;

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
      <span className={ok ? "text-muted-foreground" : ""}>{children}</span>
    </li>
  );
}

function Steps({ messages }: { messages: Msg[] }) {
  const byStep = new Map(messages.map((m) => [m.step, m]));
  return (
    <div className="flex flex-wrap gap-1">
      {[1, 2, 3].map((step) => {
        const m = byStep.get(step);
        if (!m) return <Badge key={step} variant="outline" className="text-[10px] font-normal text-muted-foreground">{step}ª: —</Badge>;
        return (
          <Badge
            key={step}
            variant={m.status === "failed" ? "destructive" : m.status === "read" ? "default" : "secondary"}
            className="text-[10px] font-normal"
            title={m.error_message ?? undefined}
          >
            {step}ª: {MSG_STATUS[m.status]} {when(m.created_at)}
          </Badge>
        );
      })}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export default function AdminWhatsappRecovery() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ enroll: number; send: number; close: number } | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("admin-whatsapp-recovery", { method: "GET" });
    if (err || !res || res.error) setError(err?.message ?? res?.error ?? "Não foi possível carregar.");
    else setData(res as Overview);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (key: string, body: Record<string, unknown>, done?: (res: ActionResult) => void) => {
    setBusy(key);
    const { data, error: err } = await supabase.functions.invoke("admin-whatsapp-recovery", { method: "POST", body });
    const res = (data ?? null) as ActionResult | null;
    setBusy(null);
    if (err || res?.error) {
      toast({ title: "Não deu certo", description: res?.error ?? err?.message, variant: "destructive" });
      return;
    }
    if (done) done(res);
    else if (res?.outcome) toast({ title: OUTCOME[res.outcome] ?? res.outcome });
    else toast({ title: "Feito" });
    await load();
  };

  const match = (s: { name: string | null; email: string | null; phone_e164?: string; phone?: string }) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.email, s.phone_e164, s.phone].some((v) => (v ?? "").toLowerCase().includes(q));
  };

  const replied = (data?.contacts ?? []).filter((c) => c.status === "replied").filter(match);
  const contacts = (data?.contacts ?? []).filter(match);
  const eligible = (data?.eligible ?? []).filter(match);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando recuperação por WhatsApp…
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="space-y-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar de novo</Button>
      </div>
    );
  }
  if (!data) return null;

  const { config, funnel, totals } = data;
  const ready = config.bird_configured && config.webhook_configured;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Recuperação por WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Médicos com WhatsApp e e-mail que fizeram o teste grátis (ou já assinaram) e não pagam hoje. Cortesias ficam de fora.
            Três mensagens: na entrada, 3 dias depois e 4 dias depois. Quem responde sai da automação e vem para conversa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() => act("preview", { action: "preview" }, (res) => setPreview(res.plan ?? null))}
          >
            {busy === "preview" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-1 h-4 w-4" />}
            Simular rodada
          </Button>
          <Button
            size="sm"
            disabled={!!busy || !config.bird_configured}
            onClick={() =>
              act("run", { action: "run_now" }, (res) =>
                toast({ title: "Rodada concluída", description: `${res.enrolled} novos contatos · ${res.sent?.sent ?? 0} mensagens enviadas` }))
            }
          >
            {busy === "run" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Rodar agora
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {preview && (
        <Card className="p-3 text-sm">
          Se rodar agora: <b>{preview.enroll}</b> novos contatos recebem a 1ª mensagem, <b>{preview.send}</b> recebem a próxima etapa e{" "}
          <b>{preview.close}</b> mudam de status.{" "}
          {!config.send_window_open && <span className="text-muted-foreground">(Fora do horário de envio: seg–sáb, 9h–20h. Nada sai agora.)</span>}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Envio automático</p>
            <p className="text-xs text-muted-foreground">
              De hora em hora, seg–sáb, 9h–20h (Fortaleza). Até {config.daily_cap} novos contatos por dia (hoje: {config.enrolled_today}).
              Links levam para {config.landing_path}.
            </p>
          </div>
          <Switch
            checked={config.auto_enabled}
            disabled={!!busy || (!config.auto_enabled && !ready)}
            onCheckedChange={(enabled) => act("toggle", { action: "toggle_auto", enabled })}
            aria-label="Envio automático"
          />
        </div>
        {!ready || !config.auto_enabled ? (
          <ul className="mt-4 space-y-1.5">
            <Check ok={config.bird_configured}>
              Número de WhatsApp próprio conectado no Bird e segredos <code>BIRD_API_KEY</code> e <code>BIRD_WHATSAPP_FROM</code>{" "}
              {config.from ? `(${phoneLabel(config.from)})` : ""}
            </Check>
            <Check ok={config.webhook_configured}>
              Webhook do Bird apontando para <code>bird-whatsapp-webhook</code> e segredo <code>BIRD_WEBHOOK_SECRET</code> (entregas, leituras e respostas)
            </Check>
            <Check ok={false}>
              6 modelos de Marketing aprovados pela Meta no Bird, em pt-BR:{" "}
              {config.templates.map((t) => <code key={t.slug} className="mr-1">{t.slug}</code>)}
            </Check>
          </ul>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Aguardando entrada" value={totals.eligible_waiting} hint={`de ${totals.users} contas`} />
        <Kpi label="Na recuperação" value={funnel.contacts} hint={`${funnel.byStatus.active} em cadência`} />
        <Kpi label="Entregues" value={funnel.delivered} hint={pct(funnel.delivered, funnel.contacts)} />
        <Kpi label="Leram" value={funnel.read} hint={pct(funnel.read, funnel.delivered)} />
        <Kpi label="Responderam" value={funnel.replied} hint={pct(funnel.replied, funnel.delivered)} />
        <Kpi label="Converteram" value={funnel.converted} hint={pct(funnel.converted, funnel.contacts)} />
        <Kpi label="Pediram para sair" value={funnel.optedOut} hint={funnel.messagesFailed ? `${funnel.messagesFailed} falhas de envio` : undefined} />
      </div>

      <Input placeholder="Buscar por nome, e-mail ou celular" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <Tabs defaultValue={replied.length ? "conversa" : "cadencia"}>
        <TabsList>
          <TabsTrigger value="conversa">Responderam ({replied.length})</TabsTrigger>
          <TabsTrigger value="cadencia">Na recuperação ({contacts.length})</TabsTrigger>
          <TabsTrigger value="elegiveis">Aguardando ({eligible.length})</TabsTrigger>
          <TabsTrigger value="fora">Fora da régua</TabsTrigger>
        </TabsList>

        <TabsContent value="conversa" className="space-y-2">
          {replied.length === 0 && <Empty>Ninguém respondeu ainda. As respostas aparecem aqui para você continuar a conversa.</Empty>}
          {replied.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{c.name ?? c.email}</p>
                <p className="text-xs text-muted-foreground">{c.email} · {phoneLabel(c.phone_e164)} · {SEGMENT[c.segment]}</p>
                {c.last_inbound_text && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">“{c.last_inbound_text}” <span className="text-xs text-muted-foreground">{when(c.last_inbound_at)}</span></p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                  <a href={waMe(c.phone_e164)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Responder</a>
                </Button>
                <Button size="sm" variant="ghost" className="h-8" disabled={!!busy} onClick={() => act(c.id, { action: "set_status", contactId: c.id, status: "finished" })}>
                  Encerrar
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="cadencia" className="space-y-2">
          {contacts.length === 0 && <Empty>Ninguém na recuperação ainda.</Empty>}
          {contacts.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name ?? c.email}</p>
                  <Badge variant={STATUS[c.status].variant} className="text-[10px]">{STATUS[c.status].label}</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal">{SEGMENT[c.segment]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.email} · {phoneLabel(c.phone_e164)} · entrou {when(c.entered_at)}</p>
                <Steps messages={c.messages} />
                {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(c.status === "active" || c.status === "paused") && c.last_step < 3 && (
                  <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!!busy || !config.bird_configured}
                    onClick={() => act(c.id, { action: "send_next", contactId: c.id })}>
                    {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar {c.last_step + 1}ª agora
                  </Button>
                )}
                {c.status === "active" && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={!!busy} onClick={() => act(c.id, { action: "set_status", contactId: c.id, status: "paused" })}>
                    <Pause className="h-4 w-4" />Pausar
                  </Button>
                )}
                {c.status === "paused" && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={!!busy} onClick={() => act(c.id, { action: "set_status", contactId: c.id, status: "active" })}>
                    <Play className="h-4 w-4" />Retomar
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost" className="h-8 gap-1">
                  <a href={waMe(c.phone_e164)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Abrir</a>
                </Button>
                {c.status !== "opted_out" && c.status !== "converted" && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground" disabled={!!busy}
                    onClick={() => { if (confirm("Tirar este celular da recuperação para sempre?")) act(c.id, { action: "opt_out", contactId: c.id }); }}>
                    <UserX className="h-4 w-4" />Descadastrar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="elegiveis" className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Entram sozinhos na próxima rodada automática (até {config.daily_cap} por dia, do teste mais recente para o mais antigo). Você pode incluir alguém agora.
          </p>
          {eligible.length === 0 && <Empty>Nenhum elegível aguardando.</Empty>}
          {eligible.map((e) => (
            <Card key={e.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.name ?? e.email}</p>
                <p className="text-xs text-muted-foreground">
                  {e.email} · {phoneLabel(e.phone)} · {SEGMENT[e.segment]}
                  {e.trial_ends_at ? ` · teste acabou ${when(e.trial_ends_at)}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!!busy || !config.bird_configured}
                onClick={() => act(e.user_id, { action: "enroll", userId: e.user_id })}>
                {busy === e.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Incluir e enviar 1ª
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fora">
          <Card className="divide-y">
            {Object.entries(data.ineligible_reasons).sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
              <div key={reason} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{REASON[reason] ?? reason}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
