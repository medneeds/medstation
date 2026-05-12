import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { signUpSchema, signInSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [gender, setGender] = useState<"M" | "F" | "Outro" | "">("");
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Destino pós-login: respeita rota pretendida (vinda de ProtectedRoute) ou /dashboard
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = fromPath && fromPath !== "/auth" ? fromPath : "/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(destination, { replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate(destination, { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate, destination]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (signUpPassword !== confirmPassword) {
        toast({ variant: "destructive", title: "Senhas não coincidem", description: "Verifique as senhas digitadas." });
        setLoading(false);
        return;
      }
      const validated = signUpSchema.parse({ email: signUpEmail, password: signUpPassword, fullName });
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { full_name: validated.fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast({ variant: "destructive", title: "Erro no cadastro", description: error.message });
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").update({
          gender: gender || null,
          crm: crm || null,
          crm_state: crmState || null,
          specialty: specialty || null,
        }).eq("id", data.user.id);

        // Track referral if a code was captured before signup
        try {
          const refCode = localStorage.getItem("medstation_ref_code");
          if (refCode) {
            await supabase.functions.invoke("referral-track", { body: { code: refCode } });
            localStorage.removeItem("medstation_ref_code");
            localStorage.removeItem("medstation_ref_expiry");
          }
        } catch (e) {
          console.error("Referral tracking failed", e);
        }
      }
      toast({ title: "Cadastro realizado", description: "Você já pode entrar." });
      setFullName(""); setSignUpEmail(""); setSignUpPassword(""); setConfirmPassword("");
      setGender(""); setCrm(""); setCrmState(""); setSpecialty("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Dados inválidos", description: error.errors?.[0]?.message || error.message });
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
        toast({ variant: "destructive", title: "Erro no login", description: error.message });
        setLoading(false);
        return;
      }
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
              Dez assistentes clínicos especializados em IA. Anamnese, exames, prescrição,
              gasometria, scores — em segundos, no seu fluxo.
            </p>

            <ul className="space-y-2.5 pt-2">
              {[
                "Examinus, Clínicus, Gasometrus e mais 7",
                "Documentação automatizada com rigor clínico",
                "Sem treinamento. Funciona como você pensa.",
              ].map((line, i) => (
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
            © {new Date().getFullYear()} MedStation AI · LGPD
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
          <div className="w-full max-w-md space-y-6 lg:space-y-8">
            <div className="lg:hidden flex flex-col items-center gap-3 text-center">
              <Logo size="md" />
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
                Produza mais. <span className="text-primary">Digite menos.</span>
              </p>
            </div>

            <div className="space-y-1.5 lg:space-y-2 text-center lg:text-left">
              <h2 className="font-display text-2xl lg:text-3xl tracking-tight text-foreground">
                Bem-vindo
              </h2>
              <p className="text-sm text-muted-foreground">
                Entre com sua conta ou crie uma em segundos.
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

                    <form onSubmit={handleSignIn} className="space-y-4">
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
                        <Input
                          id="signin-password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="h-12 rounded-xl border-hairline bg-transparent text-base focus-visible:ring-1 focus-visible:ring-primary transition-all"
                          required
                        />
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
                    <GoogleAuthButton label="Cadastrar com Google" />

                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo *</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          autoComplete="name"
                          autoCapitalize="words"
                          placeholder="Dr. João Silva"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-12 rounded-xl border-hairline bg-transparent text-base focus-visible:ring-1 focus-visible:ring-primary"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sexo</Label>
                          <Select value={gender} onValueChange={(v: "M" | "F" | "Outro") => setGender(v)}>
                            <SelectTrigger className="h-12 rounded-xl border-hairline bg-transparent text-base">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Dr.</SelectItem>
                              <SelectItem value="F">Dra.</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-crm" className="text-xs uppercase tracking-wider text-muted-foreground">CRM</Label>
                          <Input
                            id="signup-crm"
                            type="text"
                            inputMode="numeric"
                            placeholder="123456"
                            value={crm}
                            onChange={(e) => setCrm(e.target.value)}
                            className="h-12 rounded-xl border-hairline bg-transparent text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">UF</Label>
                          <Select value={crmState} onValueChange={setCrmState}>
                            <SelectTrigger className="h-12 rounded-xl border-hairline bg-transparent text-base">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Especialidade</Label>
                          <Select value={specialty} onValueChange={setSpecialty}>
                            <SelectTrigger className="h-12 rounded-xl border-hairline bg-transparent text-base">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {["Generalista","Clínica Geral","Cardiologia","Dermatologia","Endocrinologia","Gastroenterologia","Geriatria","Ginecologia","Neurologia","Pediatria","Psiquiatria","Outra"].map((sp) => (
                                <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email *</Label>
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
                          className="h-12 rounded-xl border-hairline bg-transparent text-base"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha *</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            className="h-12 rounded-xl border-hairline bg-transparent text-base"
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-confirm" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar *</Label>
                          <Input
                            id="signup-confirm"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 rounded-xl border-hairline bg-transparent text-base"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      {confirmPassword && signUpPassword !== confirmPassword && (
                        <p className="text-xs text-destructive">As senhas não coincidem</p>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl text-base font-medium transition-all hover:translate-y-[-1px]"
                        disabled={loading}
                      >
                        {loading ? "Cadastrando..." : "Criar conta"}
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        * Obrigatórios. Você pode completar o perfil depois.
                      </p>
                    </form>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
