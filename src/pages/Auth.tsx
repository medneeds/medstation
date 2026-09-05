import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { armBrandIntro } from "@/components/auth/BrandIntro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { signInSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Logo } from "@/components/Logo";
import { trackLifecycleEvent } from "@/lib/analytics";
import { Eye, EyeOff, MailCheck } from "lucide-react";

const AssistantOrbit = lazy(() =>
  import("@/components/auth/AssistantOrbit").then((m) => ({ default: m.AssistantOrbit }))
);

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpSent, setSignUpSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Destino pós-login: respeita rota pretendida (vinda de ProtectedRoute) ou /dashboard
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = fromPath && fromPath !== "/auth" ? fromPath : "/dashboard";

  // Retorno da confirmação de e-mail: se o link já devolveu uma sessão válida,
  // o usuário entra direto (o efeito abaixo redireciona). Sem signOut, sem loop.
  const justConfirmed = searchParams.get("confirmed") === "1";
  const [confirmHandled, setConfirmHandled] = useState(!justConfirmed);

  useEffect(() => {
    if (!justConfirmed) return;
    toast({
      title: "E-mail confirmado",
      description: "Sua conta está ativa.",
    });
    setConfirmHandled(true);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConfirmed]);


  useEffect(() => {
    if (!confirmHandled) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(destination, { replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (_event === "SIGNED_IN") armBrandIntro();
        navigate(destination, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, destination, confirmHandled]);


  // Cadastro passwordless: apenas e-mail. O link cria a conta se não existir
  // ou entra na conta existente (sem criar novo trial).
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const email = signUpEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ variant: "destructive", title: "E-mail inválido" });
      return;
    }
    setLoading(true);
    trackLifecycleEvent("signup_started", { source: "auth", auth_method: "email_magic_link" });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        },
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Não conseguimos enviar o link",
          description: error.message,
        });
        return;
      }
      setSignUpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validated = signInSchema.parse({ email: signInEmail, password: signInPassword });
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email, password: validated.password,
      });
      if (error) {
        const notConfirmed =
          /email not confirmed|not confirmed|email_not_confirmed/i.test(error.message) ||
          (error as any).code === "email_not_confirmed";

        if (notConfirmed) {
          toast({
            title: "Falta confirmar seu e-mail",
            description: "Abra o link que enviamos para ativar sua conta. Você pode reenviá-lo agora.",
          });
          navigate(`/confirmar-email?email=${encodeURIComponent(validated.email)}`, {
            state: { email: validated.email },
          });
          setLoading(false);
          return;
        }

        const msg = /invalid login credentials/i.test(error.message)
          ? "E-mail ou senha incorretos. Verifique os dados e tente novamente."
          : error.message;
        toast({ variant: "destructive", title: "Não foi possível entrar", description: msg });
        setLoading(false);
        return;
      }
      armBrandIntro();
      navigate(destination, { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Dados inválidos", description: error.errors?.[0]?.message || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ variant: "destructive", title: "Email necessário" });
      return;
    }
    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({ title: "Email enviado", description: "Verifique sua caixa de entrada." });
      setResetEmail("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Editorial background — pure green glow, NO purple/lilac */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* Editorial side — asymmetric */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:flex flex-col p-10 xl:p-14 border-r border-hairline"
        >
          <Logo size="md" />

          <div className="mt-8 space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              Para médicos ocupados
            </div>
            <h1 className="font-display text-4xl xl:text-5xl leading-[0.95] tracking-tight text-foreground">
              Produza mais.
              <br />
              <span className="italic text-primary">Digite menos.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Documentação, Copiloto e Fluxo em uma só plataforma. Em segundos, no seu fluxo.
            </p>
          </div>

          {/* Órbita 3D como destaque central do painel */}
          <div className="flex-1 flex items-center justify-center py-2">
            <Suspense fallback={<div className="h-[420px] xl:h-[520px]" />}>
              <AssistantOrbit />
            </Suspense>
          </div>

          <p className="pt-2 text-[0.7rem] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            © {new Date().getFullYear()} MedStation · LGPD
          </p>
        </motion.aside>

        {/* Auth panel */}
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="flex items-start lg:items-center justify-center px-5 pt-8 pb-10 sm:p-10 lg:p-16"
          style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.965 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="w-full max-w-md space-y-6 lg:space-y-8 rounded-3xl border border-hairline bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.35)]"
          >
            <div className="lg:hidden flex flex-col items-center gap-3 text-center">
              <Logo size="md" />
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
                Produza mais. <span className="text-primary">Digite menos.</span>
              </p>
            </div>

            {/* Cabeçalho com reflexo espelhado (estilo tela inicial de streaming) */}
            <div className="space-y-1.5 lg:space-y-2 text-center lg:text-left">
              <div className="relative pb-3">
                <h2 className="font-display text-2xl lg:text-3xl tracking-tight text-foreground">
                  Bem-vindo
                </h2>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 right-0 top-full -mt-1 block h-3 overflow-hidden font-display text-2xl lg:text-3xl leading-none tracking-tight text-foreground opacity-[0.14] blur-[0.6px] [transform:scaleY(-1)] [mask-image:linear-gradient(to_top,transparent_10%,black_100%)] [-webkit-mask-image:linear-gradient(to_top,transparent_10%,black_100%)] text-center lg:text-left"
                >
                  Bem-vindo
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                Entre na sua conta ou comece seu teste em segundos.
              </p>
            </div>


            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-full h-11">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="signin" key="signin">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-6 lg:mt-8 space-y-4 lg:space-y-5"
                  >
                    <GoogleAuthButton label="Continuar com Google" />

                    <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
                      <div className="space-y-1.5">
                        <Label htmlFor="signin-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="seu@email.com"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          className="h-12 rounded-xl border-hairline bg-transparent text-base focus-visible:ring-1 focus-visible:ring-primary transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                                Esqueci minha senha
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Recuperar senha</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Digite seu email para receber um link de recuperação.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="h-11"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePasswordReset} disabled={resetLoading}>
                                  {resetLoading ? "Enviando..." : "Enviar link"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showSignInPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            className="h-12 pr-12 rounded-xl border-hairline bg-transparent text-base focus-visible:ring-1 focus-visible:ring-primary transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPassword((v) => !v)}
                            aria-label={showSignInPassword ? "Ocultar senha" : "Mostrar senha"}
                            aria-pressed={showSignInPassword}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl text-base font-medium transition-all hover:translate-y-[-1px] active:translate-y-0"
                        disabled={loading}
                      >
                        {loading ? "Entrando..." : "Entrar"}
                      </Button>
                    </form>
                  </motion.div>
                </TabsContent>

                <TabsContent value="signup" key="signup">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-6 lg:mt-8 space-y-4 lg:space-y-5"
                  >
                    {signUpSent ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MailCheck className="h-5 w-5 text-primary shrink-0" aria-hidden />
                          <p className="text-sm font-semibold text-foreground">Confira seu e-mail</p>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Enviamos um link seguro para criar sua conta ou entrar. Ele foi enviado para{" "}
                          <span className="text-foreground">{signUpEmail.trim().toLowerCase()}</span>.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl"
                            onClick={() => setSignUpSent(false)}
                          >
                            Alterar e-mail
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 rounded-xl"
                            disabled={loading}
                            onClick={(e) => handleSignUp(e as unknown as React.FormEvent)}
                          >
                            {loading ? "Enviando..." : "Reenviar link"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <GoogleAuthButton label="Cadastrar com Google" trackAsSignup source="auth" />
                        <p className="text-xs text-muted-foreground text-center">
                          7 dias de acesso completo. Sem cartão de crédito.
                        </p>

                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                            <Input
                              id="signup-email"
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
                              placeholder="seu@email.com"
                              value={signUpEmail}
                              onChange={(e) => setSignUpEmail(e.target.value)}
                              className="h-12 rounded-xl border-hairline bg-transparent text-base focus-visible:ring-1 focus-visible:ring-primary transition-all"
                              required
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full h-12 rounded-xl text-base font-medium transition-all hover:translate-y-[-1px] active:translate-y-0"
                            disabled={loading}
                          >
                            {loading ? "Enviando link..." : "Enviar link de acesso"}
                          </Button>
                          <p className="text-[11px] text-muted-foreground text-center">
                            Sem senha. Enviaremos um link seguro para o seu e-mail.
                          </p>
                        </form>
                      </>
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>

        </motion.main>
      </div>
    </div>
  );
}
