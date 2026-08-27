import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { armBrandIntro } from "@/components/auth/BrandIntro";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { signInSchema, signUpSchema } from "@/lib/validations";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = fromPath && fromPath !== "/auth" ? fromPath : "/dashboard";

  const justConfirmed = searchParams.get("confirmed") === "1";
  const [confirmHandled, setConfirmHandled] = useState(!justConfirmed);

  useEffect(() => {
    if (!justConfirmed) return;

    let alive = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;

      setSearchParams({}, { replace: true });
      setConfirmHandled(true);

      if (session) {
        toast({
          title: "E-mail confirmado",
          description: "Sua conta está ativa. Entrando na MedStation...",
        });
        armBrandIntro();
        navigate(destination, { replace: true });
        return;
      }

      // Some confirmation flows may return without a local session. Never force a
      // sign-out: keep the user on login and allow an ordinary sign-in instead.
      toast({
        title: "E-mail confirmado",
        description: "Sua conta está ativa. Entre para continuar.",
      });
    });

    return () => {
      alive = false;
    };
  }, [justConfirmed, navigate, destination, setSearchParams, toast]);

  useEffect(() => {
    if (!confirmHandled) return;

    let alive = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive && session) navigate(destination, { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === "SIGNED_IN") armBrandIntro();
      navigate(destination, { replace: true });
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [navigate, destination, confirmHandled]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (signUpPassword !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Senhas não coincidem",
          description: "Verifique as senhas digitadas.",
        });
        return;
      }

      const validated = signUpSchema.parse({
        email: signUpEmail,
        password: signUpPassword,
        fullName,
      });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { full_name: validated.fullName },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        },
      });

      if (error) {
        const msg = /already registered|already been registered|User already/i.test(error.message)
          ? "Este e-mail já possui cadastro. Tente entrar ou recuperar a senha."
          : error.message;
        toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
        return;
      }

      if (data.user) {
        try {
          const refCode = localStorage.getItem("medstation_ref_code");
          if (refCode) {
            await supabase.functions.invoke("referral-track", { body: { code: refCode } });
            localStorage.removeItem("medstation_ref_code");
            localStorage.removeItem("medstation_ref_expiry");
          }
        } catch (error) {
          console.error("Referral tracking failed", error);
        }

        try {
          await supabase.functions.invoke("send-welcome-lead", {
            body: { userId: data.user.id },
          });
        } catch (error) {
          console.error("Welcome email failed", error);
        }
      }

      if (data.session) {
        armBrandIntro();
        navigate(destination, { replace: true });
        return;
      }

      navigate(`/confirmar-email?email=${encodeURIComponent(validated.email)}`, {
        replace: true,
        state: { email: validated.email },
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const validated = signInSchema.parse({ email: signInEmail, password: signInPassword });
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
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
          return;
        }

        const msg = /invalid login credentials/i.test(error.message)
          ? "E-mail ou senha incorretos. Verifique os dados e tente novamente."
          : error.message;
        toast({ variant: "destructive", title: "Não foi possível entrar", description: msg });
        return;
      }

      armBrandIntro();
      navigate(destination, { replace: true });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || error.message,
      });
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

  const passwordToggle = (
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => setVisible((value) => !value)}
      aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
      aria-pressed={visible}
      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:flex flex-col p-10 xl:p-14 border-r border-hairline"
        >
          <Logo size="md" />
          <div className="mt-10 space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              Para médicos ocupados
            </div>
            <h1 className="font-display text-5xl xl:text-6xl leading-[0.95] tracking-tight text-foreground">
              Produza mais.
              <br />
              <span className="italic text-primary">Digite menos.</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Documentação clínica e ferramentas de IA para reduzir o tempo gasto digitando durante a prática médica.
            </p>
            <ul className="space-y-2.5 pt-2">
              {["Resuma exames em segundos", "Estruture anamnese e evolução", "Teste 7 dias sem cartão"].map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>
          <p className="mt-auto pt-10 text-[0.7rem] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            © {new Date().getFullYear()} MedStation · LGPD
          </p>
        </motion.aside>

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

            <div className="space-y-1.5 lg:space-y-2 text-center lg:text-left">
              <h2 className="font-display text-2xl lg:text-3xl tracking-tight text-foreground">Bem-vindo</h2>
              <p className="text-sm text-muted-foreground">Entre com sua conta ou crie uma em segundos.</p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-full h-11">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Criar conta</TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="signin" key="signin">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 lg:mt-8 space-y-4 lg:space-y-5">
                    <GoogleAuthButton label="Continuar com Google" />

                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="signin-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                        <Input id="signin-email" type="email" autoComplete="email" autoCapitalize="none" placeholder="seu@email.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="h-12 rounded-xl border-hairline bg-transparent text-base" required />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">Esqueci minha senha</button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Recuperar senha</AlertDialogTitle>
                                <AlertDialogDescription>Digite seu email para receber um link de recuperação.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input type="email" placeholder="seu@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="h-11" />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePasswordReset} disabled={resetLoading}>{resetLoading ? "Enviando..." : "Enviar link"}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="relative">
                          <Input id="signin-password" type={showSignInPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="h-12 pr-12 rounded-xl border-hairline bg-transparent text-base" required />
                          {passwordToggle(showSignInPassword, setShowSignInPassword, "senha")}
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-xl text-base font-medium" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
                    </form>
                  </motion.div>
                </TabsContent>

                <TabsContent value="signup" key="signup">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 lg:mt-8 space-y-4 lg:space-y-5">
                    <GoogleAuthButton label="Cadastrar com Google" trackAsSignup source="auth" />

                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                        <Input id="signup-name" type="text" autoComplete="name" placeholder="Dr. João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl border-hairline bg-transparent text-base" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                        <Input id="signup-email" type="email" autoComplete="email" autoCapitalize="none" placeholder="seu@email.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="h-12 rounded-xl border-hairline bg-transparent text-base" required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                          <div className="relative">
                            <Input id="signup-password" type={showSignUpPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="h-12 pr-12 rounded-xl border-hairline bg-transparent text-base" required minLength={8} />
                            {passwordToggle(showSignUpPassword, setShowSignUpPassword, "senha")}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-confirm" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar</Label>
                          <div className="relative">
                            <Input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 pr-12 rounded-xl border-hairline bg-transparent text-base" required minLength={8} />
                            {passwordToggle(showConfirmPassword, setShowConfirmPassword, "confirmação de senha")}
                          </div>
                        </div>
                      </div>
                      {confirmPassword && signUpPassword !== confirmPassword && <p className="text-xs text-destructive">As senhas não coincidem</p>}
                      <Button type="submit" className="w-full h-12 rounded-xl text-base font-medium" disabled={loading}>{loading ? "Cadastrando..." : "Criar conta"}</Button>
                      <p className="text-[11px] text-muted-foreground text-center">Dados profissionais podem ser completados depois do primeiro acesso.</p>
                    </form>
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
