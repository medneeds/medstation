import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  getConsent,
  OPEN_COOKIE_PREFERENCES_EVENT,
  saveConsent,
} from "@/lib/consent";

/**
 * Banner de cookies (LGPD + Guia de Cookies da ANPD): aparece até o visitante
 * decidir; "Aceitar" e "Recusar" têm o mesmo peso visual; nada não essencial
 * carrega antes da escolha. Reabre por evento (rodapé, política, configurações).
 */
export function CookieConsent() {
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getConsent()) setBannerOpen(true);

    const openPrefs = () => {
      const current = getConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setPrefsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPrefs);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPrefs);
  }, []);

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setBannerOpen(false);
    setPrefsOpen(false);
  };

  const openCustomize = () => {
    const current = getConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    setPrefsOpen(true);
  };

  return (
    <>
      {bannerOpen && !prefsOpen ? (
        <section
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 backdrop-blur shadow-[0_-8px_30px_-12px_hsl(var(--foreground)/0.25)]"
        >
          <div className="container mx-auto px-4 md:px-8 py-3 md:py-4 flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:gap-6">
            <p className="text-xs sm:text-sm text-foreground leading-relaxed md:flex-1">
              <span className="sm:hidden">
                Usamos cookies para o site funcionar e, se você permitir, para análise e medição de anúncios. Saiba mais na{" "}
              </span>
              <span className="hidden sm:inline">
                Usamos cookies necessários para o site funcionar e, com a sua permissão, cookies de análise e de
                marketing para entender o uso e medir anúncios. Você pode mudar a escolha quando quiser. Saiba mais
                na{" "}
              </span>
              <Link to="/privacidade#cookies" className="text-primary underline underline-offset-4">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
              <Button variant="outline" size="sm" onClick={() => decide({ analytics: false, marketing: false })}>
                Recusar opcionais
              </Button>
              <Button variant="outline" size="sm" onClick={() => decide({ analytics: true, marketing: true })}>
                Aceitar todos
              </Button>
              <Button variant="link" size="sm" onClick={openCustomize}>
                Personalizar
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <Dialog
        open={prefsOpen}
        onOpenChange={(open) => {
          setPrefsOpen(open);
          // Fechar sem salvar volta ao banner, se ainda não houve decisão.
          if (!open && !getConsent()) setBannerOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>
              Escolha o que podemos usar além do necessário. Você pode mudar isso a qualquer momento pelo rodapé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium" id="cookie-necessary-label">
                  Necessários
                </p>
                <p className="text-xs text-muted-foreground">
                  Login, segurança do aparelho, tema e preferências. Sempre ativos.
                </p>
              </div>
              <Switch checked disabled aria-labelledby="cookie-necessary-label" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="cookie-analytics">
                  Análise
                </label>
                <p className="text-xs text-muted-foreground">
                  Como o site e a plataforma são usados (PostHog), sem gravação de tela e sem dados clínicos.
                </p>
              </div>
              <Switch id="cookie-analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="cookie-marketing">
                  Marketing
                </label>
                <p className="text-xs text-muted-foreground">
                  Medição de anúncios (Meta Pixel), sem dados clínicos, nome, e-mail ou CRM.
                </p>
              </div>
              <Switch id="cookie-marketing" checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => decide({ analytics: false, marketing: false })}>
              Recusar opcionais
            </Button>
            <Button onClick={() => decide({ analytics, marketing })}>Salvar escolhas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
