/** @type {import('next').NextConfig} */
const desktopBuild = process.env.TAURI_BUILD === "1";

const nextConfig = {
  reactStrictMode: true,
  ...(desktopBuild ? { output: "export", trailingSlash: true, distDir: ".next-desktop" } : {}),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" }
        ]
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
        ]
      }
    ];
  },
  images: {
    unoptimized: desktopBuild,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org"
      }
    ]
  }
};

module.exports = nextConfig;
