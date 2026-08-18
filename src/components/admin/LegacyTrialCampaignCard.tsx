import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, Send, Sparkles } from "lucide-react";

interface Stats {
  total: number;
  claimed: number;
  sent: number;
  pending: number;
}

export function LegacyTrialCampaignCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-send-legacy-trial-invites",
        { body: { mode: "stats" } },
      );
      if (error) throw error;
      setStats(data as Stats);
    } catch (e) {
      console.error("[LegacyTrialCampaign]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async (resend = false) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-send-legacy-trial-invites",
        { body: { mode: "send", resend } },
      );
      if (error) throw error;
      toast.success(`Convites enviados: ${data?.sent ?? 0}${data?.failed ? ` · falhas: ${data.failed}` : ""}`);
      load();
    } catch (e) {
      toast.error("Não foi possível disparar os convites.");
      console.error("[LegacyTrialCampaign] send", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> Campanha — 7 dias completos (usuários antigos)
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Convida quem já estava na plataforma a ativar 7 dias com todos os assistentes e modos.
        A contagem só começa quando o usuário aceita — no pop-up interno ou pelo botão do e-mail.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Elegíveis", value: stats?.total ?? 0 },
            { label: "Ativaram", value: stats?.claimed ?? 0 },
            { label: "E-mail enviado", value: stats?.sent ?? 0 },
            { label: "A enviar", value: stats?.pending ?? 0 },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-border p-3">
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => send(false)} disabled={sending || !stats?.pending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Disparar para {stats?.pending ?? 0} pendentes
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => send(true)}
          disabled={sending}
          title="Reenvia para quem ainda não ativou, mesmo que já tenha recebido"
        >
          <Mail className="h-4 w-4 mr-2" /> Reenviar a quem não ativou
        </Button>
      </div>
    </Card>
  );
}
