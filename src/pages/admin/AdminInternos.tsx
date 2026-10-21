import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { whatsappUrl } from "./AdminUsers";
import { INTERN_CAMPAIGN, isGuaranteedSpot } from "@/lib/internCampaign";

interface Row {
  id: string; full_name: string; email: string; phone: string; medical_school: string;
  current_period: string; city: string; state: string; graduation_year: number;
  converted_user_id: string | null; courtesy_granted_at: string | null; created_at: string;
}

export default function AdminInternos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intern_campaign_signups" as never)
      .select("*")
      .eq("campaign", INTERN_CAMPAIGN.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) toast.error("Não foi possível carregar as inscrições");
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async (r: Row) => {
    if (!r.converted_user_id) return;
    setBusy(r.id);
    const { data: { user } } = await supabase.auth.getUser();
    const expires = new Date(Date.now() + INTERN_CAMPAIGN.courtesyDays * 86400000).toISOString();
    const { error } = await supabase.from("courtesy_access").insert({
      user_id: r.converted_user_id, granted_by: user!.id, expires_at: expires,
      reason: `Campanha internos · posição ${rows.indexOf(r) + 1}`, source: "intern_campaign",
    });
    if (!error) {
      await supabase.from("intern_campaign_signups" as never).update({ courtesy_granted_at: new Date().toISOString() } as never).eq("id", r.id);
      toast.success(`${INTERN_CAMPAIGN.courtesyDays} dias liberados para ${r.full_name}`);
      await load();
    } else toast.error("Não foi possível liberar a cortesia");
    setBusy(null);
  };

  const granted = rows.filter((r) => r.courtesy_granted_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Campanha de internos</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} inscritos · {granted} cortesias liberadas · ordem de chegada define as {INTERN_CAMPAIGN.spots} vagas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
      </div>
      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma inscrição ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>{["#", "Interno", "Faculdade", "Período / formatura", "Cidade", "Inscrição", "Conta", "Cortesia"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pos = i + 1;
                const wa = whatsappUrl(r.phone);
                return (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="p-3">
                      <div className="font-semibold">{pos}</div>
                      <Badge variant={isGuaranteedSpot(pos) ? "default" : "secondary"} className="mt-1 whitespace-nowrap">
                        {isGuaranteedSpot(pos) ? "Vaga garantida" : "Lista de espera"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
                    </td>
                    <td className="p-3">{r.medical_school}</td>
                    <td className="p-3">{r.current_period}<div className="text-xs text-muted-foreground">Forma em {r.graduation_year}</div></td>
                    <td className="p-3">{r.city}/{r.state}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3">{r.converted_user_id ? <Badge variant="outline">Conta criada</Badge> : <span className="text-xs text-muted-foreground">Aguardando</span>}</td>
                    <td className="p-3">
                      {r.courtesy_granted_at ? (
                        <span className="text-xs">Liberada em {new Date(r.courtesy_granted_at).toLocaleDateString("pt-BR")}</span>
                      ) : (
                        <Button size="sm" variant={isGuaranteedSpot(pos) ? "default" : "outline"} disabled={!r.converted_user_id || busy === r.id} onClick={() => grant(r)}>
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gift className="mr-1 h-4 w-4" />Liberar {INTERN_CAMPAIGN.courtesyDays} dias</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
