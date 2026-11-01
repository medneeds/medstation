import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type State = "checking" | "ready" | "saving" | "done" | "invalid" | "error";

/** Descadastro pelo link do rodapé dos e-mails (função email-unsubscribe + suppressed_emails). */
export default function Descadastrar() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>(token ? "checking" : "invalid");

  useEffect(() => {
    if (!token) return;
    supabase.functions
      .invoke(`email-unsubscribe?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then(({ data, error }) => {
        if (error || !data?.valid) setState("invalid");
        else setState(data.already ? "done" : "ready");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setState("saving");
    const { data, error } = await supabase.functions.invoke("email-unsubscribe", { body: { token } });
    setState(!error && data?.ok ? "done" : "error");
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground p-6 md:p-8 shadow-medical">
        <MailX className="h-6 w-6 text-primary" />
        {state === "checking" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Conferindo seu link...
          </p>
        )}
        {(state === "ready" || state === "saving") && (
          <>
            <h1 className="mt-4 text-xl font-semibold">Parar de receber estes lembretes?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você deixa de receber neste endereço os lembretes de compra não concluída da MedStation. E-mails de
              acesso, como o código de login, continuam chegando quando você pedir.
            </p>
            <Button className="mt-6 w-full h-11" onClick={confirm} disabled={state === "saving"}>
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Não quero mais receber"}
            </Button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="mt-4 text-xl font-semibold">Pronto, você foi descadastrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">Não enviaremos mais lembretes para este endereço.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <h1 className="mt-4 text-xl font-semibold">Link inválido ou incompleto</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra o link direto do e-mail ou escreva para contato@medstation-ai.com.br pedindo o descadastro.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="mt-4 text-xl font-semibold">Não deu certo agora</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente de novo em instantes ou escreva para contato@medstation-ai.com.br pedindo o descadastro.
            </p>
          </>
        )}
        <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground underline underline-offset-2">
          Voltar para a MedStation
        </Link>
      </div>
    </main>
  );
}
