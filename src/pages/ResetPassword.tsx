import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean) => {
      if (!cancelled) setStatus(ok ? "ready" : "invalid");
    };

    const run = async () => {
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();
      const query = new URLSearchParams(window.location.search);

      // Erro explícito vindo do link (expirado, já usado)
      if (hash.get("error") || query.get("error")) {
        finish(false);
        return;
      }

      // Formato novo: ?code=... (PKCE)
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, "", "/reset-password");
        finish(!error);
        return;
      }

      // Formato clássico: #access_token=...&type=recovery
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, "", "/reset-password");
        finish(!error);
        return;
      }

      // Alguns clientes já processaram o link e criaram a sessão
      const { data: { session } } = await supabase.auth.getSession();
      finish(!!session);
    };

    void run();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: "destructive", title: "Senha muito curta", description: "Use ao menos 8 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "As senhas não conferem" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("done");
      toast({ title: "Senha alterada", description: "Você já pode entrar com a nova senha." });
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Não foi possível alterar a senha",
        description: err?.message || "Tente novamente ou peça um novo link.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = resendEmail.trim().toLowerCase();
    const token = code.replace(/\D/g, "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ variant: "destructive", title: "Informe seu e-mail" });
      return;
    }
    if (token.length < 6) {
      toast({ variant: "destructive", title: "Código inválido", description: "O código tem 6 dígitos." });
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
      if (error) throw error;
      setCode("");
      setStatus("ready");
      toast({ title: "Código confirmado", description: "Agora escolha sua nova senha." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Código não aceito",
        description: err?.message || "Confira o código ou peça um novo e-mail.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    const email = resendEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ variant: "destructive", title: "E-mail inválido" });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Link enviado", description: "Confira sua caixa de entrada e o spam." });
      setResendEmail("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err?.message || "Tente novamente." });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Criar nova senha
            </CardTitle>
            <CardDescription>
              {status === "invalid"
                ? "Este link expirou ou já foi usado."
                : status === "done"
                ? "Senha atualizada com sucesso."
                : "Defina a senha que você vai usar para entrar."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === "checking" && (
              <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Validando seu link...
              </div>
            )}

            {status === "ready" && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <Input
                    id="confirm-password"
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar nova senha
                </Button>
              </form>
            )}

            {status === "done" && (
              <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
                Ir para a plataforma
              </Button>
            )}

            {status === "invalid" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Por segurança, o link vale por pouco tempo e só pode ser usado uma vez.
                  Informe seu e-mail para receber um novo.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Seu e-mail</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                  />
                </div>
                <Button className="w-full" onClick={handleResend} disabled={resending}>
                  {resending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar novo link
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                  Voltar para o login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
