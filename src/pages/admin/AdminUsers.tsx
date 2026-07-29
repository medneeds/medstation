import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Search, RefreshCw, Shield, Gift, KeyRound, CheckCircle2, Loader2 } from "lucide-react";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  specialty: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  effective_status: string;
  stripe_status: string;
  subscription_end: string | null;
  courtesy: any;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  trialing: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  past_due: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  canceled: "bg-red-500/10 text-red-600 border-red-500/20",
  none: "bg-muted text-muted-foreground border-border",
  courtesy: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-primary/10 text-primary border-primary/20",
} as const;

export default function AdminUsers() {
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record | null>(null);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: "25", search, status });
      if (refresh) params.set("refresh", "true");
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-subscribers?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data.records);
      setTotal(data.total);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{total} usuário(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="courtesy">Cortesia</SelectItem>
            <SelectItem value="past_due">Em atraso</SelectItem>
            <SelectItem value="canceled">Cancelados</SelectItem>
            <SelectItem value="none">Sem assinatura</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setPage(1); load(); }}>Buscar</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Criado</th>
                <th className="text-left px-4 py-2">Último login</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...</td></tr>
              )}
              {!loading && records.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum resultado</td></tr>
              )}
              {records.map((r) => (
                <tr key={r.user_id} className="border-t border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-4 py-2">{r.full_name || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={STATUS_COLORS[r.effective_status] || ""}>
                      {r.effective_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>

      <UserDetailSheet user={selected} onClose={() => setSelected(null)} onChanged={() => load(true)} />
    </div>
  );
}

function UserDetailSheet({ user, onClose, onChanged }: { user: UserRow | null; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const resetPassword = async () => {
    if (!user) return;
    setBusy("reset");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Email de reset enviado");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setBusy(null); }
  };

  const grantCourtesy = async () => {
    if (!user) return;
    const days = prompt("Quantos dias de cortesia? (deixe vazio para indefinido)");
    const reason = prompt("Motivo:") || "Concedido via /admin";
    setBusy("courtesy");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-grant-courtesy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: user.user_id, reason, expires_days: days ? parseInt(days) : null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Cortesia concedida");
      onChanged();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setBusy(null); }
  };

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {user && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-sm">{user.email}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Nome</div>
                <div>{user.full_name || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Especialidade</div>
                <div>{user.specialty || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status efetivo</div>
                <Badge variant="outline" className={STATUS_COLORS[user.effective_status]}>{user.effective_status}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fim assinatura</div>
                <div>{user.subscription_end ? new Date(user.subscription_end).toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              {user.courtesy && (
                <div className="p-3 rounded-md bg-purple-500/5 border border-purple-500/20">
                  <div className="text-xs font-medium text-purple-600 mb-1">Cortesia ativa</div>
                  <div className="text-xs text-muted-foreground">{user.courtesy.reason}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Expira: {user.courtesy.expires_at ? new Date(user.courtesy.expires_at).toLocaleDateString("pt-BR") : "Indefinido"}
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2 border-t border-border/60">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Ações</div>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={resetPassword} disabled={busy === "reset"}>
                  <KeyRound className="h-4 w-4 mr-2" /> {busy === "reset" ? "Enviando..." : "Enviar reset de senha"}
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={grantCourtesy} disabled={busy === "courtesy"}>
                  <Gift className="h-4 w-4 mr-2" /> {busy === "courtesy" ? "Concedendo..." : "Conceder cortesia"}
                </Button>
                {user.is_admin && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 text-xs">
                    <Shield className="h-3.5 w-3.5 text-primary" /> Este usuário é admin
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
