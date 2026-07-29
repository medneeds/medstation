import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Gift, TrendingUp, Users, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AdminMetrics } from "./types";

interface Settings {
  active: boolean;
  referred_discount_percent: number;
  referred_stripe_coupon: string;
  referrer_reward_days: number;
  require_crm: boolean;
  max_rewards_per_referrer: number;
  lead_reward_enabled: boolean;
  block_existing_referrers: boolean;
  updated_at?: string;

}

interface CourtesyRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  reason: string | null;
  expires_at: string | null;
  days_left: number | null;
  active: boolean;
}


interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_user_id: string | null;
  referred_email: string | null;
  status: string;
  reward_credit_days: number | null;
  created_at: string;
  reward_applied_at: string | null;
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics["referrals"] | null>(null);
  const [topReferrers, setTopReferrers] = useState<Array<{ email: string; qualified: number; total: number }>>([]);
  const [courtesy, setCourtesy] = useState<CourtesyRow[]>([]);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const callAccess = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-referral-access", { body: payload });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadCourtesy = async () => {
    try {
      const res = await callAccess({ action: "list" });
      setCourtesy((res?.rows || []) as CourtesyRow[]);
    } catch (e: any) {
      console.error("[admin-referral-access]", e.message);
    }
  };

  const extendAccess = async (userId: string, days: number) => {
    setBusyUser(userId);
    try {
      await callAccess({ action: "extend", target_user_id: userId, days });
      toast({ title: `+${days} dias liberados` });
      await loadCourtesy();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setBusyUser(null);
    }
  };

  const revokeAccess = async (userId: string) => {
    setBusyUser(userId);
    try {
      await callAccess({ action: "revoke", target_user_id: userId });
      toast({ title: "Acesso encerrado" });
      await loadCourtesy();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setBusyUser(null);
    }
  };


  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const [{ data: s }, { data: refs }, metricsRes] = await Promise.all([
        supabase.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(500),
        fetch(`https://${projectId}.supabase.co/functions/v1/admin-metrics`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (s) setSettings(s as any);
      setReferrals((refs || []) as any);
      if (metricsRes) setMetrics((metricsRes as AdminMetrics).referrals);

      // Top referrers aggregation (from the recent 500 sample)
      const byRef = new Map<string, { qualified: number; total: number }>();
      for (const r of refs || []) {
        const cur = byRef.get(r.referrer_id) || { qualified: 0, total: 0 };
        cur.total += 1;
        if (r.status === "qualified" || r.status === "rewarded") cur.qualified += 1;
        byRef.set(r.referrer_id, cur);
      }
      const top = [...byRef.entries()]
        .sort((a, b) => b[1].qualified - a[1].qualified || b[1].total - a[1].total)
        .slice(0, 10);
      const ids = top.map(([id]) => id);
      let emailMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        (profs || []).forEach((p: any) => emailMap.set(p.id, p.full_name || p.id.slice(0, 8)));
      }
      setTopReferrers(top.map(([id, v]) => ({ email: emailMap.get(id) || id.slice(0, 8), ...v })));
      await loadCourtesy();

    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("referral_settings")
        .update({
          active: settings.active,
          referred_discount_percent: settings.referred_discount_percent,
          referred_stripe_coupon: settings.referred_stripe_coupon.trim(),
          referrer_reward_days: settings.referrer_reward_days,
          require_crm: settings.require_crm,
          max_rewards_per_referrer: settings.max_rewards_per_referrer,

          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", 1);
      if (error) throw error;
      toast({ title: "Parâmetros salvos", description: "As mudanças já valem para novos checkouts e recompensas." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Métricas e parâmetros do programa de indicação</p>
        </div>
        <Badge variant={settings.active ? "default" : "outline"}>
          {settings.active ? "Programa ativo" : "Programa desativado"}
        </Badge>
      </header>

      {/* Global KPIs (all-time, from admin-metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Users className="h-3 w-3" /> Códigos gerados</div>
          <div className="text-2xl font-display font-semibold mt-1">{metrics?.codes_generated ?? "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><TrendingUp className="h-3 w-3" /> Indicações</div>
          <div className="text-2xl font-display font-semibold mt-1">{metrics?.total ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{metrics?.conversion_rate ?? 0}% conversão</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Award className="h-3 w-3" /> Recompensados</div>
          <div className="text-2xl font-display font-semibold mt-1 text-primary">{metrics?.rewarded ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{metrics?.reward_days_total ?? 0} dias creditados</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Status</div>
          <div className="mt-1 text-sm space-y-0.5">
            <div>Pendentes: <span className="font-medium">{metrics?.pending ?? "—"}</span></div>
            <div>Qualificados: <span className="font-medium text-emerald-600">{metrics?.qualified ?? "—"}</span></div>
            <div>Bloqueados: <span className="font-medium text-red-600">{metrics?.blocked ?? "—"}</span></div>
          </div>
        </Card>
      </div>

      {/* Settings */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold">Parâmetros do programa</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Mudanças valem para novos checkouts e recompensas. Última atualização:{" "}
            {settings.updated_at ? new Date(settings.updated_at).toLocaleString("pt-BR") : "—"}
          </p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/40">
          <div>
            <div className="text-sm font-medium">Programa ativo</div>
            <div className="text-xs text-muted-foreground">Quando desativado, novos indicados não recebem desconto e recompensas não são aplicadas.</div>
          </div>
          <Switch checked={settings.active} onCheckedChange={(v) => setSettings({ ...settings, active: v })} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="discount">Desconto do indicado (%)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              value={settings.referred_discount_percent}
              onChange={(e) => setSettings({ ...settings, referred_discount_percent: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground">Apenas informativo — o desconto real vem do cupom Stripe abaixo.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon">Cupom Stripe aplicado</Label>
            <Input
              id="coupon"
              value={settings.referred_stripe_coupon}
              onChange={(e) => setSettings({ ...settings, referred_stripe_coupon: e.target.value })}
              placeholder="XzP9db0s"
            />
            <p className="text-[11px] text-muted-foreground">ID do cupom criado no Stripe Dashboard. Deve estar ativo.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reward-days">Bônus do indicador (dias grátis)</Label>
            <Input
              id="reward-days"
              type="number"
              min={0}
              max={365}
              value={settings.referrer_reward_days}
              onChange={(e) => setSettings({ ...settings, referrer_reward_days: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground">Aplicados via trial_end na assinatura ativa do indicador.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-rewards">Limite de recompensas por indicador</Label>
            <Input
              id="max-rewards"
              type="number"
              min={0}
              max={50}
              value={settings.max_rewards_per_referrer}
              onChange={(e) => setSettings({ ...settings, max_rewards_per_referrer: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground">Máximo de indicações pagas que geram bônus (padrão: 3 meses grátis).</p>
          </div>


          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/40">
              <div>
                <div className="text-sm font-medium">Exigir CRM cadastrado</div>
                <div className="text-xs text-muted-foreground">Anti-fraude: bloqueia duas indicações para o mesmo CRM.</div>
              </div>
              <Switch checked={settings.require_crm} onCheckedChange={(v) => setSettings({ ...settings, require_crm: v })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar parâmetros
          </Button>
        </div>
      </Card>

      {/* Top referrers */}
      <Card className="p-6">
        <h2 className="font-display font-semibold mb-3">Top indicadores</h2>
        {topReferrers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma indicação registrada ainda.</p>
        ) : (
          <div className="space-y-1">
            {topReferrers.map((t, i) => (
              <div key={t.email + i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <span className="text-sm">{t.email}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{t.total} indicações</span>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600/40">{t.qualified} convertidas</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent referrals */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <h2 className="font-display font-semibold">Indicações recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Email indicado</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Bônus (dias)</th>
                <th className="text-left px-4 py-2">Criada</th>
                <th className="text-left px-4 py-2">Recompensa aplicada</th>
              </tr>
            </thead>
            <tbody>
              {referrals.slice(0, 30).map((r) => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{r.referred_email || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={
                        r.status === "rewarded"
                          ? "text-primary border-primary/40"
                          : r.status === "qualified"
                          ? "text-emerald-600 border-emerald-600/40"
                          : r.status === "blocked"
                          ? "text-red-600 border-red-600/40"
                          : ""
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{r.reward_credit_days ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.reward_applied_at ? new Date(r.reward_applied_at).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma indicação ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
