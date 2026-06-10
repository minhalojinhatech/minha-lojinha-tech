export function getYouTubeVideoId(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") return sanitizeVideoId(url.pathname.split("/").filter(Boolean)[0] || "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") return sanitizeVideoId(url.searchParams.get("v") || "");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return sanitizeVideoId(parts[1] || "");
    }
  } catch {
    return "";
  }

  return "";
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : "";
}

function sanitizeVideoId(value: string) {
  return /^[a-zA-Z0-9_-]{11}$/.test(value) ? value : "";
}
