import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { SiteFooter } from "@/components/SiteFooter";
import { LEGAL_LAST_UPDATED } from "@/config/company";

interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  children: ReactNode;
}

/** Moldura simples e legível para Privacidade, Termos e Reembolso. */
export function LegalLayout({ title, description, path, children }: LegalLayoutProps) {
  const { hash } = useLocation();

  // Links como /privacidade#cookies: rola até a seção depois de montar.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    el?.scrollIntoView();
  }, [hash, path]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title={`${title} · MedStation`} description={description} path={path} />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center">
          <Link to="/" aria-label="MedStation — página inicial">
            <Logo size="sm" />
          </Link>
        </div>
      </header>
      <main id="conteudo" className="flex-1 container mx-auto px-4 md:px-8 py-10 md:py-16">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL_LAST_UPDATED}</p>
          <div className="legal-prose mt-8 space-y-6 text-[0.95rem] leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-3 [&_td]:border-b [&_td]:border-border/60 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
