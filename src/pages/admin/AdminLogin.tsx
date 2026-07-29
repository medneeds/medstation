import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Painel MedStation — porta de entrada dedicada à equipe interna.
 * Fluxo:
 *  1) Sessão ativa + staff (admin|support) → redireciona pra /admin.
 *  2) Sessão ativa mas usuário comum → assina saída e mostra bloqueio.
 *  3) Sem sessão → login exclusivo (sem cadastro, sem OAuth público).
 */
export default function AdminLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/admin";

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const roles = (data || []).map((r: any) => r.role);
      const isStaff = roles.includes("admin") || roles.includes("support");
      if (isStaff) { setAlreadyAuthed(true); }
      setChecking(false);
    })();
  }, []);

  if (alreadyAuthed) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !signIn.user) {
        toast.error("Credenciais inválidas");
        setSubmitting(false);
        return;
      }
      // Verifica papel de staff
      const { data: rolesRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signIn.user.id);
      const roles = (rolesRows || []).map((r: any) => r.role);
      const isStaff = roles.includes("admin") || roles.includes("support");

      if (!isStaff) {
        await supabase.auth.signOut();
        toast.error("Acesso restrito", {
          description: "Este painel é exclusivo para a equipe MedStation.",
        });
        setSubmitting(false);
        return;
      }
      toast.success("Bem-vindo ao painel");
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao entrar");
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220_18%_6%)]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[hsl(220_18%_6%)] text-foreground">
      {/* ============ Painel esquerdo — brand / narrativa ============ */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        {/* ambient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(900px_500px_at_80%_90%,hsl(var(--primary)/0.10),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(hsl(0_0%_100%/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.5)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-sm text-muted-foreground">MedStation</div>
            <div className="font-display font-semibold tracking-tight">Painel de Gestão</div>
          </div>
        </header>

        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Acesso restrito · Equipe MedStation
          </div>
          <h1 className="mt-6 font-display text-4xl xl:text-5xl leading-[1.05] tracking-tight">
            Operação clínica <br /> sob controle total.
          </h1>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed">
            Faturamento, cortesias, indicações, suporte e uso de IA — um único console para
            enxergar a saúde do negócio em tempo real.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              "KPIs globais sincronizados com Stripe e backend",
              "Auditoria e eventos de segurança rastreáveis",
              "Controle fino de assinantes, cortesias e feature flags",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="text-xs text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} MedStation AI</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Sessão criptografada
          </span>
        </footer>
      </aside>

      {/* ============ Painel direito — formulário ============ */}
      <main className="flex flex-col items-center justify-center px-6 py-14 relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
        </button>

        <div className="w-full max-w-[420px]">
          {/* logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">MedStation</div>
              <div className="font-display font-semibold">Painel de Gestão</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary/80 font-medium">
              Console interno
            </div>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Entrar no painel</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Credenciais MedStation. O acesso é validado por permissão.
            </p>
          </div>

          <Card className="p-6 bg-white/[0.02] border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.35)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  E-mail corporativo
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@medstation.ai"
                  className="h-11 bg-background/60 border-white/10 focus-visible:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-pass" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="admin-pass"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 bg-background/60 border-white/10 focus-visible:ring-primary/40 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !email || !password}
                className="w-full h-11 mt-2 font-medium tracking-wide"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando…</>
                ) : (
                  "Entrar no painel"
                )}
              </Button>

              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> TLS 1.3 · RLS ativa
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/auth?tab=recover")}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Esqueci a senha
                </button>
              </div>
            </form>
          </Card>

          <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
            Acesso monitorado. Tentativas e ações são registradas na auditoria.
            <br />
            Não é uma área de clientes — para uso da plataforma, acesse{" "}
            <button
              onClick={() => navigate("/auth")}
              className="underline underline-offset-4 hover:text-foreground"
            >
              a área de assinantes
            </button>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
