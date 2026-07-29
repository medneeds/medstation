import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, RefreshCw, Shield, Gift, KeyRound, Loader2, ShieldCheck, ShieldOff, Gift as GiftIcon } from "lucide-react";

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

interface Stats {
  total_users: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  courtesy: number;
  admin: number;
  none: number;
  paying_total: number;
  mrr_cents: number;
  currency: string;
}

export default function AdminUsers() {
  const [records, setRecords] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshingStripe, setRefreshingStripe] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshingStripe(true);
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
      setStats(data.stats || null);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshingStripe(false);
    }
  };

  useEffect(() => { load(); }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(total / 25));
  const fmtMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  const filterActive = status !== "all" || search.trim().length > 0;

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {stats ? `${stats.total_users} usuários no total` : "—"}
            {filterActive && ` · ${total} no filtro atual`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <GiftIcon className="h-4 w-4 mr-2" /> Cortesia em massa
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading && !refreshingStripe ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="default" size="sm" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingStripe ? "animate-spin" : ""}`} /> Recarregar Stripe
          </Button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          {[
            { label: "Ativos", value: stats.active, color: "text-emerald-600" },
            { label: "Trial", value: stats.trialing, color: "text-sky-600" },
            { label: "Em atraso", value: stats.past_due, color: "text-amber-600" },
            { label: "Cortesia", value: stats.courtesy, color: "text-purple-600" },
            { label: "Cancelados", value: stats.canceled, color: "text-red-600" },
            { label: "Admins", value: stats.admin, color: "text-primary" },
            { label: "Sem plano", value: stats.none, color: "text-muted-foreground" },
            { label: "MRR", value: fmtMoney(stats.mrr_cents, stats.currency), color: "text-emerald-600" },
          ].map((s) => (
            <Card key={s.label} className="px-3 py-2">
              <div className="text-2xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`text-base font-display font-semibold ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}

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
            <SelectItem value="paying">Pagantes (todos)</SelectItem>
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
      <BulkCourtesyDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={() => load(true)} />
    </div>
  );
}

function UserDetailSheet({ user, onClose, onChanged }: { user: UserRow | null; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.user_id);
      setRoles((data || []).map((r: any) => r.role));
    })();
  }, [user]);

  const call = async (fn: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  };

  const resetPassword = async () => {
    if (!user) return;
    setBusy("reset");
    try {
      await call("admin-reset-password", { email: user.email });
      toast.success("Email de reset enviado");
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setBusy(null); }
  };

  const grantCourtesy = async () => {
    if (!user) return;
    const days = prompt("Quantos dias de cortesia? (vazio = indefinido)");
    const reason = prompt("Motivo:") || "Concedido via /admin";
    setBusy("courtesy");
    try {
      const expires_at = days ? new Date(Date.now() + parseInt(days) * 86400000).toISOString() : null;
      await call("admin-grant-courtesy", { action: "grant", target_user_id: user.user_id, reason, expires_at });
      toast.success("Cortesia concedida");
      onChanged();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setBusy(null); }
  };

  const setRole = async (role: "admin" | "support", grant: boolean) => {
    if (!user) return;
    setBusy(`role-${role}`);
    try {
      await call("admin-set-role", { action: grant ? "grant" : "revoke", target_user_id: user.user_id, role });
      toast.success(grant ? `Role "${role}" concedida` : `Role "${role}" revogada`);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.user_id);
      setRoles((data || []).map((r: any) => r.role));
      onChanged();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setBusy(null); }
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
              <div>
                <div className="text-xs text-muted-foreground mb-1">Roles</div>
                <div className="flex flex-wrap gap-1">
                  {roles.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma role</span>}
                  {roles.map((r) => (
                    <Badge key={r} variant="outline" className={r === "admin" ? STATUS_COLORS.admin : ""}>{r}</Badge>
                  ))}
                </div>
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
              </div>

              <div className="pt-4 space-y-2 border-t border-border/60">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Roles administrativas</div>
                {(["admin", "support"] as const).map((r) => {
                  const has = roles.includes(r);
                  return (
                    <Button
                      key={r}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={busy === `role-${r}`}
                      onClick={() => setRole(r, !has)}
                    >
                      {has ? <ShieldOff className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      {busy === `role-${r}` ? "Salvando..." : (has ? `Remover ${r}` : `Promover a ${r}`)}
                    </Button>
                  );
                })}
                <p className="text-2xs text-muted-foreground pt-1">
                  Somente admins podem promover ou remover roles.
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BulkCourtesyDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [emails, setEmails] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const submit = async () => {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) { toast.error("Informe ao menos 1 email"); return; }
    setBusy(true);
    setResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-bulk-courtesy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          emails: list,
          reason: reason.trim() || null,
          expires_days: days ? parseInt(days) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResults(json.results);
      const ok = json.results.filter((r: any) => r.status === "granted").length;
      toast.success(`${ok}/${list.length} cortesia(s) concedida(s)`);
      onDone();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cortesia em massa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Emails (separados por vírgula, quebra de linha ou espaço)</Label>
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="joao@exemplo.com, maria@exemplo.com..."
              className="min-h-[120px] font-mono text-xs mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dias de cortesia</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="vazio = indefinido" />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Campanha lançamento" />
            </div>
          </div>
          {results && (
            <Card className="p-3 max-h-48 overflow-y-auto text-xs space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between font-mono">
                  <span>{r.email}</span>
                  <Badge variant="outline" className={
                    r.status === "granted" ? STATUS_COLORS.active :
                    r.status === "not_found" ? STATUS_COLORS.none :
                    STATUS_COLORS.canceled
                  }>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
