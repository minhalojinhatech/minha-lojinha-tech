export const siteConfig = {
  name: "Minha Lojinha Tech",
  title: "Minha Lojinha Tech | Smartphones novos e seminovos",
  domain: "minhalojinhatech.store",
  url: "https://minhalojinhatech.store",
  email: "minhalojinhatech@gmail.com",
  whatsapp: "11953317085",
  whatsappInternational: "5511953317085",
  description:
    "Loja de smartphones em São Paulo com modelos Apple, Samsung, Xiaomi e Motorola novos, seminovos e usados. Fotos reais, condição detalhada, garantia informada e atendimento direto.",
  locale: "pt_BR",
  defaultImage: "/logo-loja.png"
};

export const publicRoutes = [
  "/",
  "/catalogo",
  "/procurando-smartphone",
  "/avaliacoes",
  "/assistencia",
  "/sobre",
  "/contato",
  "/garantia",
  "/trocas-devolucoes",
  "/entrega-retirada",
  "/termos",
  "/privacidade"
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}

export function whatsappUrl(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${siteConfig.whatsappInternational}${text}`;
}

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${siteConfig.url}/#store`,
  name: siteConfig.name,
  url: siteConfig.url,
  image: absoluteUrl(siteConfig.defaultImage),
  logo: absoluteUrl(siteConfig.defaultImage),
  description: siteConfig.description,
  email: siteConfig.email,
  telephone: `+55 ${siteConfig.whatsapp.slice(0, 2)} ${siteConfig.whatsapp.slice(2, 7)}-${siteConfig.whatsapp.slice(7)}`,
  areaServed: {
    "@type": "City",
    name: "São Paulo"
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "São Paulo",
    addressRegion: "SP",
    addressCountry: "BR"
  },
  sameAs: [whatsappUrl()]
};

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: {
      "@id": `${siteConfig.url}/#store`
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/catalogo?busca={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}
