// Contato direto com o Artur pelo WhatsApp na página da Black: botão flutuante
// e botão na seção de dúvidas. O clique conta como cta_click (funil interno) e,
// com consentimento de marketing, como "Contact" no Pixel da Meta.

import { useEffect, useState } from "react";
import { trackCtaClick } from "@/lib/analytics";
import { hasMarketingConsent } from "@/lib/consent";
import { cn } from "@/lib/utils";

export const SALES_WHATSAPP_NUMBER = "5598981659576";
export const SALES_WHATSAPP_MESSAGE = "Oi Artur, quero saber mais sobre a MedStation.";

export function salesWhatsAppUrl(message: string = SALES_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function trackWhatsApp(cta: string) {
  trackCtaClick({ cta, section: "black", destination: "whatsapp" });
  try {
    if (hasMarketingConsent()) (window as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "Contact");
  } catch {
    /* noop */
  }
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 0 1 14.6-11.7 9.36 9.36 0 0 1 2.76 6.66c0 5.2-4.23 9.43-9.4 9.43m8.01-17.44A11.26 11.26 0 0 0 12.05.75C5.82.75.75 5.82.75 12.05c0 1.99.52 3.94 1.51 5.65L.65 23.25l5.67-1.49a11.3 11.3 0 0 0 5.4 1.38h.01c6.23 0 11.3-5.07 11.3-11.3 0-3.02-1.18-5.86-3.32-7.99" />
    </svg>
  );
}

/**
 * No celular, quantos pixels rolar antes de mostrar o botão: no topo ele
 * cobria o botão de compra do hero. No computador aparece sempre.
 */
function useShowAfterScroll(threshold: number) {
  const [show, setShow] = useState(threshold <= 0);
  useEffect(() => {
    if (threshold <= 0) return;
    const check = () => setShow(window.scrollY > threshold);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [threshold]);
  return show;
}

/** Botão redondo fixo no canto; no celular fica acima da barra de compra. */
export function WhatsAppFloatingButton({
  aboveStickyBar = false,
  mobileShowAfter = 0,
}: {
  aboveStickyBar?: boolean;
  /** Pixels de rolagem antes de aparecer no celular (0 = sempre). */
  mobileShowAfter?: number;
}) {
  const shown = useShowAfterScroll(mobileShowAfter);
  return (
    <a
      href={salesWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o Artur no WhatsApp"
      onClick={() => trackWhatsApp("black_whatsapp_floating")}
      className={cn(
        "fixed right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] transition-[transform,opacity] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366] md:bottom-6 md:pointer-events-auto md:opacity-100",
        aboveStickyBar ? "bottom-24" : "bottom-6",
        !shown && "pointer-events-none opacity-0 max-md:invisible",
      )}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

/** Botão em linha, para a seção de dúvidas. */
export function WhatsAppInlineButton({ className }: { className?: string }) {
  return (
    <a
      href={salesWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsApp("black_whatsapp_faq")}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]",
        className,
      )}
    >
      <WhatsAppIcon className="h-5 w-5" />
      Falar com o Artur no WhatsApp
    </a>
  );
}
