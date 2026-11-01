import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openCookiePreferences } from "@/lib/consent";

/** Acesso às políticas e às preferências de cookies para quem está logado. */
export function PrivacyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Privacidade
        </CardTitle>
        <CardDescription>Seus dados, cookies e as regras de uso da MedStation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="outline" size="sm" onClick={openCookiePreferences}>
          Preferências de cookies
        </Button>
        <Link to="/privacidade" className="text-sm text-primary underline-offset-4 hover:underline">
          Política de Privacidade
        </Link>
        <Link to="/termos" className="text-sm text-primary underline-offset-4 hover:underline">
          Termos de Uso
        </Link>
        <Link to="/reembolso" className="text-sm text-primary underline-offset-4 hover:underline">
          Reembolso e cancelamento
        </Link>
      </CardContent>
    </Card>
  );
}
