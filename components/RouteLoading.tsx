import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export function RouteLoading() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const show = (_url: string, options: { shallow?: boolean }) => {
      if (options.shallow) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setVisible(true), 80);
    };
    const hide = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setVisible(false), 160);
    };

    router.events.on("routeChangeStart", show);
    router.events.on("routeChangeComplete", hide);
    router.events.on("routeChangeError", hide);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      router.events.off("routeChangeStart", show);
      router.events.off("routeChangeComplete", hide);
      router.events.off("routeChangeError", hide);
    };
  }, [router.events]);

  return (
    <div className={`route-loading ${visible ? "route-loading--visible" : ""}`} aria-hidden={!visible}>
      <span />
    </div>
  );
}
