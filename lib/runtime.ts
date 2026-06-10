export const siteUrl = "https://minhalojinhatech.store";
export const isDesktopBuild = process.env.NEXT_PUBLIC_DESKTOP_BUILD === "1";

export function appHref(path: string) {
  if (!isDesktopBuild) return path;

  const productMatch = path.match(/^\/produto\/([^/?#]+)$/);
  if (productMatch) return `/produto/desktop/?item=${encodeURIComponent(productMatch[1])}`;

  const demandMatch = path.match(/^\/procurando-smartphone\/([^/?#]+)$/);
  if (demandMatch) return `/procurando-smartphone/desktop/?item=${encodeURIComponent(demandMatch[1])}`;

  return path;
}

export async function apiFetch(path: string, init?: RequestInit) {
  if (!isDesktopBuild) return fetch(path, init);

  const { fetch: nativeFetch } = await import("@tauri-apps/plugin-http");
  return nativeFetch(new URL(path, siteUrl).toString(), init);
}

export async function openExternal(url: string) {
  if (!isDesktopBuild) {
    window.location.assign(url);
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
