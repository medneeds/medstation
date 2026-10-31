import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminPasswordProblem } from "../../../supabase/functions/_shared/admin-password";

/** Readable random password: no look-alike characters, always letters + digits. */
function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string, n: number) => {
    const bytes = new Uint32Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => set[b % set.length]).join("");
  };
  return `Med${pick(letters, 5)}${pick(digits, 4)}`;
}

type Result =
  | { type: "success"; message: string; userName?: string | null; password: string }
  | { type: "error"; message: string };

export function AdminSetPasswordForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [askConfirm, setAskConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const problem = password ? adminPasswordProblem(password, cleanEmail) : null;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !!cleanEmail && !!password && !problem && confirm === password && !loading;

  const fillGenerated = () => {
    const p = generatePassword();
    setPassword(p);
    setConfirm(p);
    setShow(true);
    setResult(null);
  };

  const submit = async () => {
    setAskConfirm(false);
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ type: "error", message: json.error || "Não foi possível alterar a senha." });
        return;
      }
      setResult({ type: "success", message: json.message, userName: json.userName, password });
      toast.success("Senha alterada");
      setConfirm("");
    } catch {
      setResult({ type: "error", message: "Sem conexão. Tente de novo." });
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (pwd: string) => {
    const text = `Olá! Sua senha de acesso à MedStation foi redefinida.\n\nE-mail: ${cleanEmail}\nSenha provisória: ${pwd}\n\nEntre em https://medstation-ai.com.br/auth e troque a senha em Configurações assim que puder.`;
    await navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
        <p>
          Use só quando o e-mail de confirmação ou de redefinição não chega. A senha vale na hora, o e-mail da conta fica
          confirmado e a ação fica registrada no histórico do admin. Envie a senha ao médico por um canal seguro e peça
          para ele trocar depois.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-2 max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) setAskConfirm(true);
        }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="admin-set-email" className="text-xs">E-mail da conta</Label>
          <Input
            id="admin-set-email"
            type="email"
            placeholder="usuario@exemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setResult(null);
            }}
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-set-password" className="text-xs">Nova senha</Label>
            <button
              type="button"
              onClick={fillGenerated}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              disabled={loading}
            >
              <Sparkles className="h-3 w-3" /> Gerar senha
            </button>
          </div>
          <div className="relative">
            <Input
              id="admin-set-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setResult(null);
              }}
              disabled={loading}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Esconder senha" : "Mostrar senha"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {problem && <p className="text-xs text-destructive">{problem}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-set-confirm" className="text-xs">Repita a senha</Label>
          <Input
            id="admin-set-confirm"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          {mismatch && <p className="text-xs text-destructive">As senhas não são iguais.</p>}
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" size="sm" className="h-10" disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "Alterando..." : "Definir nova senha"}
          </Button>
        </div>
      </form>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm max-w-2xl ${
            result.type === "success"
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-foreground"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
          )}
          <div className="space-y-2">
            <p>{result.message}</p>
            {result.type === "success" && (
              <>
                {result.userName && <p className="text-xs text-muted-foreground">Usuário: {result.userName}</p>}
                <Button type="button" size="sm" variant="outline" onClick={() => copyMessage(result.password)}>
                  <Copy className="h-3.5 w-3.5 mr-2" /> Copiar mensagem para o médico
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={askConfirm} onOpenChange={setAskConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar a senha desta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A senha de {cleanEmail} será trocada agora e a senha antiga deixa de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Trocar senha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
