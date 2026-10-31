import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSetPasswordForm } from "./AdminSetPasswordForm";

type Result =
  | { type: "success"; message: string; userName?: string | null }
  | { type: "error"; message: string; suggestions?: string[] };

export async function sendAdminPasswordReset(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ userEmail: email }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, ...json } as {
    ok: boolean;
    message?: string;
    error?: string;
    userName?: string | null;
    suggestions?: string[];
  };
}

export function PasswordResetPanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const send = async (target = email) => {
    const value = target.trim();
    if (!value) return;
    setEmail(value);
    setLoading(true);
    setResult(null);
    try {
      const r = await sendAdminPasswordReset(value);
      if (!r.ok) {
        setResult({ type: "error", message: r.error || "Não foi possível enviar.", suggestions: r.suggestions });
        return;
      }
      setResult({ type: "success", message: r.message || `E-mail enviado para ${value}`, userName: r.userName });
      toast.success("E-mail de redefinição enviado");
    } catch {
      setResult({ type: "error", message: "Sem conexão. Tente de novo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <KeyRound className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Redefinição de senha</h2>
          <p className="text-xs text-muted-foreground">
            Envie um link por e-mail ou, se o e-mail não chegar, defina a senha aqui mesmo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="link" className="space-y-3">
        <TabsList className="h-9">
          <TabsTrigger value="link" className="text-xs">Enviar link por e-mail</TabsTrigger>
          <TabsTrigger value="direct" className="text-xs">Definir senha agora</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-0">
          <AdminSetPasswordForm />
        </TabsContent>

        <TabsContent value="link" className="mt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            O usuário recebe um link para criar uma nova senha, válido por 1 hora.
          </p>
      <form
        className="flex gap-2 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          type="email"
          placeholder="usuario@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setResult(null);
          }}
          disabled={loading}
          className="flex-1 min-w-[220px] max-w-md"
          aria-label="E-mail do usuário"
        />
        <Button type="submit" size="sm" className="h-10" disabled={loading || !email.trim()}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
          {loading ? "Enviando..." : "Enviar redefinição"}
        </Button>
      </form>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
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
            {result.type === "success" && result.userName && (
              <p className="text-xs text-muted-foreground">Usuário: {result.userName}</p>
            )}
            {result.type === "error" && result.suggestions && result.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.suggestions.map((s) => (
                  <Button key={s} type="button" size="sm" variant="outline" onClick={() => send(s)} disabled={loading}>
                    Enviar para {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
