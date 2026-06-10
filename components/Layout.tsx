import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { absoluteUrl, localBusinessJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";

const StoreBot = dynamic(() => import("@/components/StoreBot").then((module) => module.StoreBot), {
  ssr: false
});

type LayoutProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  noindex?: boolean;
  flushTop?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  children: ReactNode;
};

export function Layout({
  title = siteConfig.title,
  description = siteConfig.description,
  canonicalPath,
  image = siteConfig.defaultImage,
  noindex = false,
  flushTop = false,
  jsonLd,
  children
}: LayoutProps) {
  const router = useRouter();
  const [storeBotOpen, setStoreBotOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canonicalUrl = absoluteUrl(canonicalPath || router.asPath.split("?")[0] || "/");
  const imageUrl = absoluteUrl(image);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      withoutJsonLdContext(localBusinessJsonLd),
      withoutJsonLdContext(websiteJsonLd()),
      ...(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).map(withoutJsonLdContext)
    ]
  };

  useEffect(() => {
    const openStoreBot = () => setStoreBotOpen(true);
    const openRepairWarrantyBot = () => setStoreBotOpen(true);
    const handleMobileMenuVisibility = (event: Event) => {
      setMobileMenuOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener("open-store-bot", openStoreBot);
    window.addEventListener("open-repair-warranty-bot", openRepairWarrantyBot);
    window.addEventListener("mobile-menu-visibility", handleMobileMenuVisibility);

    return () => {
      window.removeEventListener("open-store-bot", openStoreBot);
      window.removeEventListener("open-repair-warranty-bot", openRepairWarrantyBot);
      window.removeEventListener("mobile-menu-visibility", handleMobileMenuVisibility);
    };
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
        <meta name="theme-color" content="#111827" />
        <meta name="format-detection" content="telephone=yes" />
        <meta property="og:locale" content={siteConfig.locale} />
        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </Head>
      <div className="public-site flex min-h-screen flex-col bg-[#f6f7f8] text-ink">
        <Header />
        <main className={`page-transition flex-1 ${flushTop ? "" : "pb-4 pt-4 md:pb-5 md:pt-5"}`}>{children}</main>
        <Footer />
        {!storeBotOpen && !mobileMenuOpen ? (
          <button
            className="group fixed bottom-5 right-5 z-[70] size-16 rounded-full shadow-[0_18px_45px_rgba(17,24,39,0.24)] transition duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-brand-blue/20"
            onClick={() => setStoreBotOpen(true)}
            type="button"
            aria-label="Conversar com a Mika"
            title="Mika, assistente virtual"
          >
            <span className="block size-full overflow-hidden rounded-full border-2 border-white bg-white">
              <img className="h-full w-full object-cover transition duration-200 group-hover:scale-105" src="/mika-avatar-atualizada.webp" alt="" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-[3px] border-white bg-teal" />
          </button>
        ) : null}
        <StoreBot open={storeBotOpen} onClose={() => setStoreBotOpen(false)} />
      </div>
    </>
  );
}

function withoutJsonLdContext(data: Record<string, unknown>) {
  const { ["@context"]: _context, ...node } = data;
  return node;
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="container-page py-4 text-sm text-gray-500" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label}>
          {item.href ? (
            <Link className="hover:text-ink" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
          {index < items.length - 1 ? <span className="mx-2">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
