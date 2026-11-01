import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/config/company";
import { openCookiePreferences } from "@/lib/consent";

interface SiteFooterProps {
  className?: string;
}

/**
 * Rodapé das páginas públicas: identificação da empresa (Decreto 7.962/2013),
 * links das políticas e acesso às preferências de cookies.
 */
export function SiteFooter({ className }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const linkClass =
    "underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline";

  return (
    <footer className={cn("border-t border-border/60 py-8 text-xs text-muted-foreground", className)}>
      <div className="container mx-auto px-4 md:px-8 flex flex-col gap-4">
        <nav aria-label="Políticas e informações legais">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link to="/termos" className={linkClass}>
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className={linkClass}>
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link to="/reembolso" className={linkClass}>
                Reembolso e cancelamento
              </Link>
            </li>
            <li>
              <button type="button" onClick={openCookiePreferences} className={linkClass}>
                Preferências de cookies
              </button>
            </li>
          </ul>
        </nav>
        <div className="space-y-1 leading-relaxed">
          <p>
            © {year} {COMPANY.brand} · {COMPANY.legalName}
            {COMPANY.cnpj ? ` · CNPJ ${COMPANY.cnpj}` : ""}
          </p>
          {COMPANY.address ? <p>{COMPANY.address}</p> : null}
          {COMPANY.contactEmail ? (
            <p>
              Contato:{" "}
              <a href={`mailto:${COMPANY.contactEmail}`} className={linkClass}>
                {COMPANY.contactEmail}
              </a>
              {COMPANY.supportWhatsapp ? (
                <>
                  {" "}· WhatsApp (suporte):{" "}
                  <a href={COMPANY.supportWhatsappUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {COMPANY.supportWhatsapp}
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <p>
            A MedStation é uma ferramenta de apoio. Ela não substitui a avaliação médica, e a decisão
            clínica final é sempre do médico.
          </p>
        </div>
      </div>
    </footer>
  );
}
