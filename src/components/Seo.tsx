import { Helmet } from "react-helmet-async";
import { DISPLAY_PRICING } from "@/lib/subscription-tiers";

const SITE = "https://medstation-ai.com.br";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;
const INDEXABLE_PATHS = new Set(["/", "/pricing"]);

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  /** JSON-LD objects to inject on this route. */
  jsonLd?: Record<string, unknown>[];
}

function defaultJsonLd(path: string): Record<string, unknown>[] {
  if (path !== "/") return [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "MedStation",
      url: `${SITE}/`,
      description: "Plataforma de inteligência artificial para produtividade e documentação médica.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "MedStation",
      url: `${SITE}/`,
      inLanguage: "pt-BR",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MedStation",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      inLanguage: "pt-BR",
      description:
        "Plataforma web com 12 assistentes clínicos de IA, Modo Escuta e Modo Rotineiro para apoiar a produtividade médica.",
      url: `${SITE}/`,
      offers: [
        {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: DISPLAY_PRICING.bundle.monthly.now.toFixed(2),
          category: "monthly subscription",
          url: `${SITE}/pricing`,
        },
        {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: DISPLAY_PRICING.bundle.yearly.now.toFixed(2),
          category: "yearly subscription",
          url: `${SITE}/pricing`,
        },
      ],
    },
  ];
}

/** Per-rota: title, description, canonical, robots, Open Graph, Twitter e JSON-LD. */
export function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noIndex = false,
  jsonLd,
}: SeoProps) {
  const url = `${SITE}${path}`;
  // Fonte única da política de indexação: hoje apenas home e pricing são páginas
  // orgânicas. `noIndex` pode endurecer ainda mais, nunca ampliar a allowlist.
  const effectiveNoIndex = noIndex || !INDEXABLE_PATHS.has(path);
  const structuredData = effectiveNoIndex ? [] : (jsonLd ?? defaultJsonLd(path));

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={effectiveNoIndex ? "noindex,nofollow,noarchive" : "index,follow,max-image-preview:large"}
      />
      <meta
        name="googlebot"
        content={effectiveNoIndex ? "noindex,nofollow,noarchive" : "index,follow,max-image-preview:large"}
      />
      <link rel="canonical" href={url} />

      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="MedStation" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {structuredData.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
