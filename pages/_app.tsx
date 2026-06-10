import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { RouteLoading } from "@/components/RouteLoading";
import "@/styles/globals.css";
import { isDesktopBuild, openExternal } from "@/lib/runtime";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const routeKey = router.asPath.split("?")[0];

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    }
    if ("caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith("mlt-")).map((key) => caches.delete(key))))
        .catch(() => undefined);
    }

    const reloadKey = "next-chunk-reload-attempted";
    const reloadOnce = () => {
      if (window.sessionStorage.getItem(reloadKey)) return;
      window.sessionStorage.setItem(reloadKey, "true");
      window.location.reload();
    };

    const handleError = (event: ErrorEvent) => {
      const target = event.target;
      const source = target instanceof HTMLScriptElement ? target.src : "";
      const message = event.message || "";

      if (source.includes("/_next/static/") || message.includes("ChunkLoadError")) {
        reloadOnce();
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("load", () => window.sessionStorage.removeItem(reloadKey), { once: true });

    return () => window.removeEventListener("error", handleError, true);
  }, []);

  useEffect(() => {
    if (!isDesktopBuild) return;

    const handleExternalLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      const href = target?.getAttribute("href") || "";
      if (!href || (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:") && !href.startsWith("tel:"))) return;

      event.preventDefault();
      openExternal(href).catch(() => undefined);
    };

    document.addEventListener("click", handleExternalLink);
    return () => document.removeEventListener("click", handleExternalLink);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <RouteLoading />
        <div className="route-page-enter" key={routeKey}>
          <Component {...pageProps} />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
