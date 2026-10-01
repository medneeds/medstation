import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  clearDeviceState,
  clearFreshLogin,
  deviceHashFor,
  getDeviceId,
  getDeviceLabel,
  isDeviceOk,
  isFreshLogin,
  isSharedDevice,
  setDeviceOk,
  sharedSessionExpired,
} from "@/lib/deviceGuard";

const HEARTBEAT_MS = 60 * 1000;

type Phase = "checking" | "ok" | "code";

async function revokeOthers() {
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch {
    /* não bloqueia o médico */
  }
}

/**
 * Login protegido por aparelho: pede código por e-mail em aparelho novo e
 * mantém apenas um acesso ativo por conta. Qualquer falha nossa libera o acesso.
 */
export function DeviceGuard({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(60);
  const loggingOut = useRef(false);

  const forceLogout = useCallback(async (title: string, description?: string) => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    clearDeviceState();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      toast.error(title, description ? { description } : undefined);
    }
  }, []);

  const runCheck = useCallback(
    async (resend = false) => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);

      if (sharedSessionExpired()) {
        await forceLogout("Sessão encerrada", "Computador compartilhado: entre novamente.");
        return;
      }
      if (!resend && isDeviceOk(uid)) {
        setPhase("ok");
        return;
      }

      try {
        const { data: res, error: fnErr } = await supabase.functions.invoke("device-check", {
          body: {
            device_id: getDeviceId(),
            label: getDeviceLabel(),
            fresh: isFreshLogin(),
            shared: isSharedDevice(),
            resend,
          },
        });
        if (fnErr || !res) throw fnErr ?? new Error("sem resposta");
        if (res.status === "code_required") {
          setMaskedEmail(res.email ?? "");
          setPhase("code");
          setResendIn(60);
          return;
        }
        clearFreshLogin();
        setDeviceOk(uid);
        setPhase("ok");
        if (res.revoke_others) void revokeOthers();
      } catch (e) {
        console.warn("[device-guard] verificação indisponível, liberando acesso", e);
        setDeviceOk(uid);
        setPhase("ok");
      }
    },
    [forceLogout],
  );

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  // Contador do "Reenviar código"
  useEffect(() => {
    if (phase !== "code" || resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, resendIn]);

  // Batimento: este aparelho ainda é o acesso ativo?
  useEffect(() => {
    if (phase !== "ok" || !userId) return;
    let cancelled = false;
    const beat = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      if (sharedSessionExpired()) {
        await forceLogout("Sessão encerrada", "Computador compartilhado: entre novamente.");
        return;
      }
      const { data, error } = await supabase
        .from("active_sessions")
        .select("device_hash")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const mine = await deviceHashFor(userId);
      if (data.device_hash !== mine) {
        await forceLogout(
          "Sua conta foi acessada em outro aparelho",
          "Por segurança, este acesso foi encerrado. Entre novamente se for você.",
        );
      }
    };
    void beat();
    const interval = window.setInterval(beat, HEARTBEAT_MS);
    const onVis = () => document.visibilityState === "visible" && void beat();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, userId, forceLogout]);

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("device-verify", {
        body: { device_id: getDeviceId(), code: value, label: getDeviceLabel(), shared: isSharedDevice() },
      });
      if (fnErr || !res) throw fnErr ?? new Error("sem resposta");
      if (res.status === "ok") {
        clearFreshLogin();
        if (userId) setDeviceOk(userId);
        setPhase("ok");
        void revokeOthers();
        toast.success("Acesso confirmado", { description: "Os outros aparelhos foram desconectados." });
        return;
      }
      setError(res.message ?? "Código inválido.");
      setCode("");
    } catch {
      setError("Não foi possível confirmar agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "ok") return <>{children}</>;

  if (phase === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Confirme que é você</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este aparelho é novo para a sua conta. Enviamos um código de 6 dígitos para{" "}
            <span className="text-foreground">{maskedEmail || "seu e-mail"}</span>.
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              const digits = v.replace(/\D/g, "");
              setCode(digits);
              if (digits.length === 6) void verify(digits);
            }}
            disabled={busy}
            autoFocus
            inputMode="numeric"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full h-11" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Confirmar e entrar
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={resendIn > 0 || busy}
            onClick={() => {
              setError(null);
              void runCheck(true);
            }}
          >
            {resendIn > 0 ? `Reenviar código em ${resendIn}s` : "Reenviar código"}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              clearDeviceState();
              await supabase.auth.signOut({ scope: "local" });
            }}
          >
            Sair
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Ao confirmar, os outros computadores conectados à sua conta serão desconectados. Não recebeu? Confira a caixa de spam.
        </p>
      </div>
    </div>
  );
}
