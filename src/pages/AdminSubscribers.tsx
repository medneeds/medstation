import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Gift,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CourtesyInfo {
  id: string;
  reason: string | null;
  expires_at: string | null;
  granted_by: string;
  created_at: string;
  active: boolean;
}

interface SubscriberRecord {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  specialty: string | null;
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_status: string;
  stripe_product_ids: string[];
  subscription_end: string | null;
  courtesy: CourtesyInfo | null;
  effective_status: string;
}

interface Stats {
  total: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  none: number;
  courtesy: number;
  admin: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  active: { label: "Ativa", variant: "default", className: "bg-green-600 hover:bg-green-700" },
  trialing: { label: "Trial", variant: "default", className: "bg-blue-600 hover:bg-blue-700" },
  past_due: { label: "Past Due", variant: "default", className: "bg-yellow-600 hover:bg-yellow-700" },
  canceled: { label: "Cancelada", variant: "destructive" },
  unpaid: { label: "Não Paga", variant: "destructive" },
  incomplete: { label: "Incompleta", variant: "secondary" },
  incomplete_expired: { label: "Expirada", variant: "secondary" },
  none: { label: "Sem assinatura", variant: "outline" },
  courtesy: { label: "Cortesia", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700" },
  admin: { label: "Admin", variant: "default", className: "bg-purple-600 hover:bg-purple-700" },
};

export default function AdminSubscribers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SubscriberRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cacheAge, setCacheAge] = useState(0);

  // Grant courtesy dialog
  const [grantDialog, setGrantDialog] = useState<{
    open: boolean;
    user: SubscriberRecord | null;
  }>({ open: false, user: null });
  const [grantReason, setGrantReason] = useState("");
  const [grantExpiresAt, setGrantExpiresAt] = useState("");
  const [granting, setGranting] = useState(false);

  // Verify admin access
  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        toast({
          title: "Acesso negado",
          description: "Esta página é exclusiva para administradores.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setAuthChecking(false);
    };
    checkAdmin();
  }, [navigate, toast]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search,
          status: statusFilter,
          page: String(page),
          perPage: "25",
        });
        if (forceRefresh) params.set("refresh", "true");

        const { data, error } = await supabase.functions.invoke(
          `admin-list-subscribers?${params.toString()}`,
          { method: "GET" }
        );
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setRecords(data.records || []);
        setStats(data.stats || null);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setCacheAge(data.cacheAge || 0);
      } catch (e: any) {
        console.error("[AdminSubscribers] fetch error", e);
        toast({
          title: "Erro ao carregar",
          description: e.message || "Falha ao buscar assinantes.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, page, toast]
  );

  useEffect(() => {
    if (!authChecking) fetchData(false);
  }, [authChecking, fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleGrant = async () => {
    if (!grantDialog.user) return;
    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-grant-courtesy", {
        body: {
          action: "grant",
          target_user_id: grantDialog.user.user_id,
          reason: grantReason || null,
          expires_at: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Cortesia concedida",
        description: `${grantDialog.user.email} agora tem acesso completo.`,
      });
      setGrantDialog({ open: false, user: null });
      setGrantReason("");
      setGrantExpiresAt("");
      await fetchData(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message || "Falha ao conceder cortesia.",
        variant: "destructive",
      });
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (user: SubscriberRecord) => {
    if (!confirm(`Revogar cortesia de ${user.email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-grant-courtesy", {
        body: { action: "revoke", target_user_id: user.user_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Cortesia revogada", description: user.email });
      await fetchData(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message || "Falha ao revogar.",
        variant: "destructive",
      });
    }
  };

  const openGrantDialog = (user: SubscriberRecord) => {
    setGrantReason(user.courtesy?.reason || "");
    setGrantExpiresAt(
      user.courtesy?.expires_at
        ? new Date(user.courtesy.expires_at).toISOString().slice(0, 16)
        : ""
    );
    setGrantDialog({ open: true, user });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Painel de Assinantes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acesso restrito a administradores. Visualize status do Stripe e conceda cortesias.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar Stripe
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { key: "total", label: "Total", color: "text-foreground" },
            { key: "active", label: "Ativas", color: "text-green-600" },
            { key: "trialing", label: "Trial", color: "text-blue-600" },
            { key: "past_due", label: "Past Due", color: "text-yellow-600" },
            { key: "canceled", label: "Cancel.", color: "text-red-600" },
            { key: "none", label: "Sem Sub", color: "text-muted-foreground" },
            { key: "courtesy", label: "Cortesia", color: "text-emerald-600" },
            { key: "admin", label: "Admin", color: "text-purple-600" },
          ].map((s) => (
            <Card key={s.key}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>
                  {stats[s.key as keyof Stats]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Cancelada</SelectItem>
              <SelectItem value="none">Sem assinatura</SelectItem>
              <SelectItem value="courtesy">Cortesia</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {total} usuário{total !== 1 ? "s" : ""} {search || statusFilter !== "all" ? "encontrados" : ""}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Cache Stripe: {cacheAge < 60000 ? `${Math.round(cacheAge / 1000)}s` : `${Math.round(cacheAge / 60000)}min`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email / Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const cfg = STATUS_CONFIG[r.effective_status] || STATUS_CONFIG.none;
                    const hasCourtesy = !!r.courtesy?.active;
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.email}</div>
                          {r.full_name && (
                            <div className="text-xs text-muted-foreground">{r.full_name}</div>
                          )}
                          {r.specialty && (
                            <div className="text-xs text-muted-foreground italic">{r.specialty}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={cfg.variant} className={cfg.className}>
                              {cfg.label}
                            </Badge>
                            {hasCourtesy && r.stripe_status !== "none" && (
                              <Badge variant="outline" className="text-xs">
                                Stripe: {STATUS_CONFIG[r.stripe_status]?.label || r.stripe_status}
                              </Badge>
                            )}
                            {r.courtesy?.reason && (
                              <span className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                                "{r.courtesy.reason}"
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                        <TableCell className="text-xs">{formatDate(r.last_sign_in_at)}</TableCell>
                        <TableCell className="text-xs">
                          {hasCourtesy
                            ? r.courtesy?.expires_at
                              ? formatDate(r.courtesy.expires_at)
                              : "Sem expiração"
                            : formatDate(r.subscription_end)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.stripe_customer_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                title="Abrir no Stripe"
                              >
                                <a
                                  href={`https://dashboard.stripe.com/customers/${r.stripe_customer_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {!r.is_admin && (
                              <>
                                {hasCourtesy ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openGrantDialog(r)}
                                      title="Editar cortesia"
                                    >
                                      <Gift className="h-4 w-4 text-emerald-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRevoke(r)}
                                      title="Revogar cortesia"
                                    >
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openGrantDialog(r)}
                                  >
                                    <Gift className="h-4 w-4 mr-1" />
                                    Cortesia
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Grant Dialog */}
      <Dialog
        open={grantDialog.open}
        onOpenChange={(open) => !open && setGrantDialog({ open: false, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-600" />
              {grantDialog.user?.courtesy?.active ? "Editar" : "Conceder"} Cortesia
            </DialogTitle>
            <DialogDescription>
              {grantDialog.user?.email} terá acesso completo a todos os assistentes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Reclamou que pagou e não recebeu acesso. Cortesia de 30 dias."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="expires">Expira em (opcional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={grantExpiresAt}
                onChange={(e) => setGrantExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para acesso permanente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantDialog({ open: false, user: null })}
              disabled={granting}
            >
              Cancelar
            </Button>
            <Button onClick={handleGrant} disabled={granting}>
              {granting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conceder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
