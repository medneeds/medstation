import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Mail, KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Provider = "google" | "email" | "unknown";

export function AccountSecurityCard() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("unknown");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // 2FA state
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      const ids = (user.identities || []).map((i: any) => i.provider);
      if (ids.includes("google")) setProvider("google");
      else if (ids.includes("email")) setProvider("email");
      else setProvider((user.app_metadata?.provider as Provider) || "email");
    }
    await refreshFactors();
    setLoading(false);
  };

  const refreshFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors(data.totp || []);
    }
  };

  const verifiedTotp = factors.find((f) => f.status === "verified");
  const has2FA = !!verifiedTotp;

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      // Limpar fatores não verificados antigos
      for (const f of factors.filter((x) => x.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrollData({
        factorId: data.id,
        qr: (data as any).totp?.qr_code || "",
        secret: (data as any).totp?.secret || "",
      });
      setEnrollOpen(true);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível iniciar 2FA.", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enrollData) return;
    setVerifying(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: ch.id,
        code: verifyCode.trim(),
      });
      if (vErr) throw vErr;
      toast({ title: "2FA ativado", description: "Autenticação em duas etapas habilitada com sucesso." });
      setEnrollOpen(false);
      setEnrollData(null);
      setVerifyCode("");
      await refreshFactors();
    } catch (e: any) {
      toast({ title: "Código inválido", description: e.message || "Verifique o código e tente novamente.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!verifiedTotp) return;
    if (!confirm("Desabilitar autenticação em duas etapas? Isso reduz a segurança da sua conta.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedTotp.id });
      if (error) throw error;
      toast({ title: "2FA desabilitado" });
      await refreshFactors();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível desabilitar.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Conta e segurança
        </CardTitle>
        <CardDescription>Método de login e autenticação em duas etapas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {provider === "google" ? (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">Método de login</p>
                  <p className="text-sm text-muted-foreground">
                    {provider === "google" ? "Conta Google" : "E-mail e senha"}
                    {email && <span className="ml-1">· {email}</span>}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto">
                {provider === "google" ? "Google" : "E-mail"}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${has2FA ? "bg-primary/15" : "bg-muted"}`}>
                  {has2FA ? <ShieldCheck className="h-5 w-5 text-primary" /> : <KeyRound className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    Autenticação em duas etapas (2FA)
                    {has2FA && <Badge className="bg-primary/20 text-primary border-primary/30">Ativo</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {has2FA
                      ? "Você precisará de um código do seu app autenticador para entrar."
                      : "Adicione uma camada extra de segurança usando um app como Google Authenticator ou 1Password."}
                  </p>
                </div>
              </div>
              {has2FA ? (
                <Button variant="outline" onClick={disable2FA} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                  Desabilitar
                </Button>
              ) : (
                <Button onClick={startEnroll} disabled={enrolling}>
                  {enrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                  Habilitar 2FA
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={enrollOpen} onOpenChange={(o) => { if (!o) { setEnrollOpen(false); setEnrollData(null); setVerifyCode(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar 2FA</DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, 1Password) e insira o código de 6 dígitos abaixo.
            </DialogDescription>
          </DialogHeader>
          {enrollData && (
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-4 rounded-lg">
                {enrollData.qr ? (
                  <img src={enrollData.qr} alt="QR code 2FA" className="h-48 w-48" />
                ) : (
                  <div className="text-sm text-muted-foreground">QR não disponível</div>
                )}
              </div>
              {enrollData.secret && (
                <div className="text-xs text-center text-muted-foreground">
                  Ou insira manualmente: <code className="font-mono">{enrollData.secret}</code>
                </div>
              )}
              <div>
                <Label htmlFor="totp-code">Código de 6 dígitos</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnrollOpen(false)}>Cancelar</Button>
            <Button onClick={verifyEnroll} disabled={verifying || verifyCode.length !== 6}>
              {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
