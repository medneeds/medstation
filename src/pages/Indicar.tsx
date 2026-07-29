import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Gift, Users, CheckCircle2, Clock } from "lucide-react";

interface Referral {
  id: string;
  status: string;
  referred_email: string | null;
  reward_applied_at: string | null;
  created_at: string;
}

export default function Indicar() {
  const { toast } = useToast();
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [maxRewards, setMaxRewards] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        const { data: codeRes, error: codeErr } = await supabase.functions.invoke("referral-init");
        if (codeErr) throw codeErr;
        setCode(codeRes?.code || "");

        const { data: rows } = await supabase
          .from("referrals")
          .select("id,status,referred_email,reward_applied_at,created_at")
          .order("created_at", { ascending: false });
        setReferrals(rows || []);

        const { data: settings } = await supabase
          .from("referral_settings")
          .select("max_rewards_per_referrer")
          .eq("id", 1)
          .maybeSingle();
        if (settings?.max_rewards_per_referrer) setMaxRewards(settings.max_rewards_per_referrer);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erro", description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const baseUrl = "https://medstation-ai.com.br";
  const shareLink = code ? `${baseUrl}/r/${code}` : "";

  const stats = {
    total: referrals.length,
    qualified: referrals.filter((r) => r.status === "rewarded" || r.status === "qualified").length,
    pending: referrals.filter((r) => r.status === "pending").length,
    monthsEarned: referrals.filter((r) => r.status === "rewarded").length,
  };
  const remaining = Math.max(0, maxRewards - stats.monthsEarned);


  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copiado", description: "Compartilhe com seus colegas." });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Achei essa ferramenta de IA pra médicos que tá economizando horas de digitação por plantão. Te dei 50% off no 1º mês: ${shareLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          <Gift className="h-3 w-3" />
          Programa de indicação
        </div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-foreground">
          Indique colegas.
          <br />
          <span className="italic text-primary">Ganhe meses grátis.</span>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">
          Cada médico que assinar pelo seu link ganha 50% off no 1º mês. Você ganha 30 dias grátis:
          se já assina, entram como crédito na próxima fatura; se ainda não assina, liberamos 30
          dias de acesso completo à plataforma — e você recebe um e-mail confirmando. São até{" "}
          {maxRewards} indicações válidas, ou seja, até {maxRewards} meses de acesso completo sem
          pagar nada.
        </p>


      </motion.div>

      {/* Link card */}
      <Card className="p-6 sm:p-8 border-hairline bg-gradient-to-br from-primary/5 to-transparent">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Seu link único
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            readOnly
            value={loading ? "Gerando…" : shareLink}
            className="h-12 rounded-xl text-base font-mono"
          />
          <Button
            onClick={copyLink}
            disabled={!code}
            className="h-12 rounded-xl px-6 gap-2"
            variant="outline"
          >
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button
            onClick={shareWhatsApp}
            disabled={!code}
            className="h-12 rounded-xl px-6 gap-2"
          >
            <Share2 className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
        {code && (
          <p className="mt-4 text-xs text-muted-foreground">
            Código curto: <span className="font-mono font-semibold text-foreground">{code}</span>
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Indicações" value={stats.total} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Pendentes" value={stats.pending} />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Convertidas"
          value={stats.qualified}
        />
        <StatCard
          icon={<Gift className="h-4 w-4" />}
          label="Meses ganhos"
          value={stats.monthsEarned}
          highlight
        />
      </div>

      {/* Progresso do limite */}
      <Card className="p-6 sm:p-8 border-hairline">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xl">Seu progresso</h2>
          <span className="text-sm text-muted-foreground">
            {stats.monthsEarned} de {maxRewards} meses conquistados
          </span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: maxRewards }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full ${
                i < stats.monthsEarned ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {remaining > 0
            ? `Faltam ${remaining} indicação${remaining > 1 ? "ões" : ""} paga${
                remaining > 1 ? "s" : ""
              } para completar seus ${maxRewards} meses grátis.`
            : "Você já atingiu o máximo de meses grátis do programa. Obrigado por indicar!"}
        </p>
      </Card>

      {/* Como funciona */}
      <Card className="p-6 sm:p-8 border-hairline">
        <h2 className="font-display text-xl mb-5">Como funciona</h2>
        <ol className="space-y-4 text-sm text-muted-foreground">
          {[
            "Compartilhe seu link com colegas médicos por WhatsApp, e-mail ou pessoalmente.",
            "Quando um colega clica e cria a conta, ele ganha 50% off no 1º mês de qualquer plano.",
            "Assim que ele paga a 1ª fatura, você recebe 30 dias: crédito na sua próxima cobrança, se você já assina, ou 30 dias de acesso completo liberado na hora, se você ainda não assina.",
            "Se o acesso liberado chegar ao fim sem uma nova indicação confirmada, ele é encerrado automaticamente — sem cobrança e sem surpresa.",
            `O link vale para até ${maxRewards} indicações pagas — ou seja, até ${maxRewards} meses seguidos de acesso completo sem custo.`,

          ].map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                {i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </Card>



      {/* Lista de indicações */}
      {referrals.length > 0 && (
        <Card className="p-6 sm:p-8 border-hairline">
          <h2 className="font-display text-xl mb-5">Suas indicações</h2>
          <div className="space-y-3">
            {referrals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 border-b border-hairline last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {anonymizeEmail(r.referred_email)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-4 border-hairline ${
        highlight ? "bg-primary/10 border-primary/30" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    pending: { label: "Aguardando assinatura", variant: "outline" },
    qualified: { label: "Processando crédito", variant: "secondary" },
    rewarded: { label: "+30 dias creditados", variant: "default" },
    blocked: { label: "Bloqueada", variant: "outline" },
  };
  const m = map[status] || map.pending;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function anonymizeEmail(email: string | null): string {
  if (!email) return "Médico convidado";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
}
