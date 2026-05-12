import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const KEY = "medstation_ref_code";
const EXPIRY_KEY = "medstation_ref_expiry";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Rota /r/:code — salva o código e redireciona para a landing. */
export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code && /^[A-Z0-9]{4,12}$/i.test(code)) {
      try {
        localStorage.setItem(KEY, code.toUpperCase());
        localStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
      } catch {
        /* ignore */
      }
    }
    navigate("/?ref=" + (code || ""), { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirecionando…
    </div>
  );
}
