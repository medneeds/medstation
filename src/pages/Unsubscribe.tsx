import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    if (error) setState("error");
    else if (data?.success) setState("done");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border border-border rounded-lg p-8 bg-card">
        <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-6">MEDSTATION AI</p>

        {state === "loading" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verificando seu link…</span>
          </div>
        )}

        {state === "valid" && (
          <>
            <MailX className="h-6 w-6 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Cancelar inscrição</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Você deixará de receber nossos e-mails informativos. Comunicações essenciais da sua
              conta continuam sendo enviadas.
            </p>
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar cancelamento
            </Button>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 className="h-6 w-6 text-primary mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Inscrição cancelada</h1>
            <p className="text-sm text-muted-foreground">
              Pronto. Você não receberá mais estes e-mails.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <CheckCircle2 className="h-6 w-6 text-primary mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Você já está fora da lista</h1>
            <p className="text-sm text-muted-foreground">Nenhuma ação adicional é necessária.</p>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <AlertCircle className="h-6 w-6 text-destructive mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link de cancelamento expirou ou não é válido. Se precisar de ajuda, fale com o
              suporte.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
