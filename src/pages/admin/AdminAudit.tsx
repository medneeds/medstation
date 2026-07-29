import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Shield, AlertTriangle } from "lucide-react";

export default function AdminAudit() {
  const [audit, setAudit] = useState<any[]>([]);
  const [security, setSecurity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, s] = await Promise.all([
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      setAudit(a.data || []);
      setSecurity(s.data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold">Auditoria e segurança</h1>
        <p className="text-sm text-muted-foreground">Ações administrativas e eventos de segurança</p>
      </header>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit"><Shield className="h-3.5 w-3.5 mr-1.5" /> Log admin ({audit.length})</TabsTrigger>
          <TabsTrigger value="security"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Segurança ({security.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="audit">
          <Card className="overflow-hidden">
            {loading ? <div className="p-10 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div> :
             audit.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">Nenhuma ação registrada</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left px-4 py-2">Data</th><th className="text-left px-4 py-2">Ação</th><th className="text-left px-4 py-2">Admin</th><th className="text-left px-4 py-2">Alvo</th></tr>
                </thead>
                <tbody>
                  {audit.map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.admin_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.target_user_id?.slice(0, 8) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card className="overflow-hidden">
            {loading ? <div className="p-10 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div> :
             security.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">Nenhum evento</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left px-4 py-2">Data</th><th className="text-left px-4 py-2">Tipo</th><th className="text-left px-4 py-2">Função</th><th className="text-left px-4 py-2">Padrão</th><th className="text-left px-4 py-2">Usuário</th></tr>
                </thead>
                <tbody>
                  {security.map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.event_type}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.function_name}</td>
                      <td className="px-4 py-2 text-xs">{r.pattern_matched || "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.user_id?.slice(0, 8) || r.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
