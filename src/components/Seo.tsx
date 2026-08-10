import { Helmet } from "react-helmet-async";

const SITE = "https://medstation-ai.com.br";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** JSON-LD objects to inject on this route. */
  jsonLd?: Record<string, unknown>[];
}

/** Per-rota: title, description, canonical e og/twitter auto-referenciados. */
export function Seo({ title, description, path, jsonLd }: SeoProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {jsonLd?.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
