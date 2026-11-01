import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { blackStatus } from "@/lib/pricingSchedule";
import { whatsappLink, blackWhatsappMessage, type BlackContactKind } from "@/lib/blackAdmin";

type Dashboard = {
  offer: { startsAt: string; endsAt: string };
  kpis: {
    visits: number;
    visitors: number;
    vip: number;
    clicks: number;
    checkouts: number;
    paid: number;
    revenue_cents: number;
    pending_boletos: number;
    switched_from_monthly: number;
  };
  daily: { day: string; visits: number; clicks: number; paid: number }[];
  by_source: { source: string; clicks: number; paid: number; revenue_cents: number }[];
  vip: { email: string; phone: string | null; created_at: string; paid: boolean }[];
  abandoned: {
    email: string;
    phone: string | null;
    last_at: string | null;
    purchase_id: string | null;
    stage: string;
    recovery_url: string | null;
    recovery_status: string | null;
    recovery_emails?: { step: string; sent_at: string; outcome: string }[];
  }[];
  boletos: {
    id: string;
    email: string | null;
    phone: string | null;
    amount_cents: number | null;
    created_at: string;
    expires_at: string | null;
    voucher_url: string | null;
    reminders_sent: string[];
  }[];
  sales: {
    email: string | null;
    phone: string | null;
    amount_cents: number | null;
    method: string;
    paid_at: string | null;
    source: string;
    switched_from_monthly: boolean;
  }[];
};

const money = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
const METHOD: Record<string, string> = { card: "Cartão", boleto: "Boleto", pix: "Pix", unknown: "—" };
const STATUS_LABEL: Record<string, string> = { upcoming: "Ainda não abriu", active: "No ar", ended: "Encerrada" };

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

const RECOVERY_LABEL: Record<string, string> = { "1h": "E-mail 1 (1 h)", "24h": "E-mail 2 (24 h)" };

/** Lembretes automáticos (black-recovery-reminders): enviado, bloqueado pelo destinatário ou ainda não. */
function RecoveryEmails({ sent }: { sent: { step: string; sent_at: string; outcome: string }[] }) {
  const byStep = new Map(sent.map((s) => [s.step, s]));
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {["1h", "24h"].map((step) => {
        const row = byStep.get(step);
        const label = RECOVERY_LABEL[step];
        if (!row) return <Badge key={step} variant="outline" className="text-[10px] font-normal text-muted-foreground">{label}: não enviado</Badge>;
        if (row.outcome === "suppressed") return <Badge key={step} variant="outline" className="text-[10px] font-normal">{label}: bloqueado</Badge>;
        if (row.outcome === "sending") return <Badge key={step} variant="outline" className="text-[10px] font-normal">{label}: enviando</Badge>;
        return <Badge key={step} variant="secondary" className="text-[10px] font-normal">{label}: enviado {when(row.sent_at)}</Badge>;
      })}
    </div>
  );
}

function ContactButtons({ phone, email, kind, link }: { phone: string | null; email: string | null; kind: BlackContactKind; link?: string | null }) {
  const { toast } = useToast();
  const wa = phone ? whatsappLink(phone, blackWhatsappMessage(kind, link)) : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {wa ? (
        <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">sem telefone</span>
      )}
      {email && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => { navigator.clipboard.writeText(email); toast({ title: "E-mail copiado" }); }}
        >
          <Copy className="h-3.5 w-3.5" />E-mail
        </Button>
      )}
      {link && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copiado" }); }}
        >
          <ExternalLink className="h-3.5 w-3.5" />Link
        </Button>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export default function AdminBlack() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const status = blackStatus();

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("admin-black-dashboard", { method: "GET" });
    if (err || res?.error) setError(res?.error ?? err?.message ?? "Não foi possível carregar.");
    else setData(res as Dashboard);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markContacted = async (purchaseId: string) => {
    const { error: err } = await supabase.functions.invoke("admin-purchase-recovery", {
      method: "POST",
      body: { id: purchaseId, recovery_status: "contacted" },
    });
    if (err) toast({ variant: "destructive", title: "Não foi possível marcar" });
    else { toast({ title: "Marcado como contatado" }); load(); }
  };

  const copyVipEmails = () => {
    const list = (data?.vip ?? []).filter((v) => !v.paid).map((v) => v.email).join(", ");
    navigator.clipboard.writeText(list);
    toast({ title: "E-mails copiados", description: "Lista VIP que ainda não comprou." });
  };

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Black MedStation</h1>
          <p className="text-sm text-muted-foreground">
            1 a 30 de novembro · anual R$ 399,90 · <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {error && <Card className="border-destructive/50 p-4 text-sm text-destructive">{error}</Card>}
      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {k && data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Visitas na página" value={k.visits} hint={`${k.visitors} pessoas`} />
            <Kpi label="Lista VIP" value={k.vip} />
            <Kpi label="Clicaram em assinar" value={k.clicks} hint={`${pct(k.clicks, k.visitors)} de quem visitou`} />
            <Kpi label="Vendas" value={k.paid} hint={`${pct(k.paid, k.clicks)} de quem clicou`} />
            <Kpi label="Receita" value={money(k.revenue_cents)} />
            <Kpi label="Boletos em aberto" value={k.pending_boletos} />
            <Kpi label="Começou e não pagou" value={data.abandoned.length} />
            <Kpi label="Trocaram o mensal" value={k.switched_from_monthly} hint="mensal encerrado sem cobrança dupla" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="text-sm font-semibold">De onde vieram</h2>
              <p className="text-xs text-muted-foreground">Pela origem do link do anúncio (utm_source) ou do site de onde a pessoa veio.</p>
              {data.by_source.length === 0 ? <Empty>Sem cliques ainda.</Empty> : (
                <table className="mt-3 w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left font-normal">Origem</th><th className="text-right font-normal">Cliques</th><th className="text-right font-normal">Vendas</th><th className="text-right font-normal">Receita</th></tr>
                  </thead>
                  <tbody>
                    {data.by_source.map((s) => (
                      <tr key={s.source} className="border-t border-border">
                        <td className="py-1.5">{s.source}</td>
                        <td className="text-right tabular-nums">{s.clicks}</td>
                        <td className="text-right tabular-nums">{s.paid}</td>
                        <td className="text-right tabular-nums">{money(s.revenue_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="text-sm font-semibold">Dia a dia</h2>
              <p className="text-xs text-muted-foreground">Horário de Brasília.</p>
              {data.daily.length === 0 ? <Empty>Sem visitas ainda.</Empty> : (
                <div className="mt-3 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr><th className="text-left font-normal">Dia</th><th className="text-right font-normal">Visitas</th><th className="text-right font-normal">Cliques</th><th className="text-right font-normal">Vendas</th></tr>
                    </thead>
                    <tbody>
                      {[...data.daily].reverse().map((d) => (
                        <tr key={d.day} className="border-t border-border">
                          <td className="py-1.5">{d.day.split("-").reverse().slice(0, 2).join("/")}</td>
                          <td className="text-right tabular-nums">{d.visits}</td>
                          <td className="text-right tabular-nums">{d.clicks}</td>
                          <td className="text-right tabular-nums">{d.paid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Tabs defaultValue={status === "upcoming" ? "vip" : "abandoned"}>
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="vip">Lista VIP ({data.vip.length})</TabsTrigger>
              <TabsTrigger value="abandoned">Começou e não pagou ({data.abandoned.length})</TabsTrigger>
              <TabsTrigger value="boletos">Boletos em aberto ({data.boletos.length})</TabsTrigger>
              <TabsTrigger value="sales">Vendas ({data.sales.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="vip">
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Quem pediu para ser avisado da abertura. O botão do WhatsApp já abre a mensagem pronta com o link da Black.
                  </p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={copyVipEmails} disabled={!data.vip.length}>
                    <Copy className="h-3.5 w-3.5" />Copiar e-mails
                  </Button>
                </div>
                {data.vip.length === 0 ? <Empty>Ninguém na lista VIP ainda.</Empty> : (
                  <ul className="mt-3 divide-y divide-border">
                    {data.vip.map((v) => (
                      <li key={v.email} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{v.email}</p>
                          <p className="text-xs text-muted-foreground">{v.phone ?? "sem telefone"} · entrou {when(v.created_at)}</p>
                        </div>
                        {v.paid ? <Badge>Comprou</Badge> : <ContactButtons phone={v.phone} email={v.email} kind="vip" />}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="abandoned">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  Clicaram em assinar ou abriram o pagamento e não concluíram. O link de retomada aparece cerca de 3 horas depois que a pessoa sai do pagamento e reabre a mesma compra. Os e-mails automáticos saem cerca de 1 hora e 24 horas depois da última tentativa.
                </p>
                {data.abandoned.length === 0 ? <Empty>Ninguém parado no pagamento.</Empty> : (
                  <ul className="mt-3 divide-y divide-border">
                    {data.abandoned.map((a) => (
                      <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.stage} · {when(a.last_at)}{a.phone ? ` · ${a.phone}` : ""}
                            {a.recovery_status === "contacted" && " · já contatado"}
                          </p>
                          <RecoveryEmails sent={a.recovery_emails ?? []} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ContactButtons phone={a.phone} email={a.email} kind="abandoned" link={a.recovery_url} />
                          {a.purchase_id && a.recovery_status !== "contacted" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markContacted(a.purchase_id!)}>
                              Marcar contatado
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="boletos">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  Boletos gerados e ainda não pagos. A MedStation manda sozinha um lembrete no dia seguinte e outro no último dia, entre 8h e 21h.
                </p>
                {data.boletos.length === 0 ? <Empty>Nenhum boleto em aberto.</Empty> : (
                  <ul className="mt-3 divide-y divide-border">
                    {data.boletos.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{b.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(b.amount_cents)} · vence {when(b.expires_at)} · lembretes: {b.reminders_sent.length ? b.reminders_sent.map((r) => (r === "last_day" ? "último dia" : "dia seguinte")).join(", ") : "nenhum ainda"}
                          </p>
                        </div>
                        <ContactButtons phone={b.phone} email={b.email} kind="boleto" link={b.voucher_url} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="sales">
              <Card className="p-4">
                {data.sales.length === 0 ? <Empty>Nenhuma venda ainda.</Empty> : (
                  <ul className="divide-y divide-border">
                    {data.sales.map((s, i) => (
                      <li key={`${s.email}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(s.amount_cents)} · {METHOD[s.method] ?? s.method} · {when(s.paid_at)} · origem: {s.source}
                          </p>
                        </div>
                        {s.switched_from_monthly && <Badge variant="secondary">Trocou o mensal</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
