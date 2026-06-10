import { useEffect, useMemo, useState } from "react";
import { Apple, Check, Download, ExternalLink, Laptop, MonitorDown, Package, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/Layout";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type Platform = "windows" | "macos" | "linux";

const repository = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY || "minhalojinhatech/minha-lojinha-tech";

const platforms: Array<{
  id: Platform;
  title: string;
  description: string;
  formats: string;
  icon: typeof Apple;
}> = [
  {
    id: "windows",
    title: "Windows",
    description: "Para computadores com Windows 10 ou 11, em arquitetura 64 bits.",
    formats: "Instalador .exe",
    icon: MonitorDown
  },
  {
    id: "macos",
    title: "macOS",
    description: "Para Macs com processador Apple Silicon ou Intel.",
    formats: "Imagem .dmg",
    icon: Apple
  },
  {
    id: "linux",
    title: "Linux",
    description: "Pacotes para as distribuições Linux mais utilizadas.",
    formats: "AppImage e .deb",
    icon: Package
  }
];

export default function BaixarApp() {
  const [assets, setAssets] = useState<ReleaseAsset[]>([]);
  const [releaseName, setReleaseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    const platform = navigator.userAgent.toLowerCase();
    setDetectedPlatform(platform.includes("windows") ? "windows" : platform.includes("mac") ? "macos" : platform.includes("linux") ? "linux" : null);

    if (!repository) {
      setLoading(false);
      return;
    }

    fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Release indisponível");
        return response.json() as Promise<{ name?: string; tag_name?: string; assets?: ReleaseAsset[] }>;
      })
      .then((release) => {
        setReleaseName(release.name || release.tag_name || "");
        setAssets(release.assets || []);
      })
      .catch(() => {
        setReleaseName("");
        setAssets([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const assetsByPlatform = useMemo(() => ({
    windows: assets.filter((asset) => asset.name.toLowerCase().endsWith(".exe")),
    macos: assets.filter((asset) => asset.name.toLowerCase().endsWith(".dmg")),
    linux: assets.filter((asset) => /\.(appimage|deb)$/i.test(asset.name))
  }), [assets]);

  return (
    <Layout
      title="Baixar aplicativo | Minha Lojinha Tech"
      description="Baixe o aplicativo oficial da Minha Lojinha Tech para Windows, macOS ou Linux."
      canonicalPath="/baixar-app"
    >
      <section className="container-page py-8 md:py-14">
        <div className="overflow-hidden border border-line bg-ink text-white shadow-[0_24px_70px_rgba(17,24,39,0.16)]">
          <div className="grid gap-8 p-7 md:p-11 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                <Laptop size={16} /> Aplicativo para computador
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                A loja completa, agora instalada no seu computador.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-300 md:text-lg">
                Navegue pelo catálogo, acompanhe pedidos e acesse a assistência em uma janela própria, com a interface incluída no aplicativo.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-200">
                <span className="flex items-center gap-2"><Check size={16} className="text-blue-300" /> Mesmo estoque e mesma conta</span>
                <span className="flex items-center gap-2"><Check size={16} className="text-blue-300" /> Atualizações centralizadas</span>
                <span className="flex items-center gap-2"><Check size={16} className="text-blue-300" /> Interface oficial embutida</span>
              </div>
            </div>
            <div className="border border-white/10 bg-white/5 p-6">
              <ShieldCheck size={31} className="text-blue-300" />
              <h2 className="mt-4 text-xl font-semibold">Download oficial</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Os instaladores são publicados diretamente nas releases oficiais do projeto.
              </p>
              {releaseName ? <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-200">Versão disponível: {releaseName}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const platformAssets = assetsByPlatform[platform.id];
            const recommended = detectedPlatform === platform.id;

            return (
              <article className={`relative border bg-white p-6 shadow-[0_12px_36px_rgba(17,24,39,0.05)] ${recommended ? "border-brand-blue ring-2 ring-brand-blue/10" : "border-line"}`} key={platform.id}>
                {recommended ? <span className="absolute right-4 top-4 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-brand-blue">Recomendado</span> : null}
                <span className="grid size-12 place-items-center bg-mist text-ink"><Icon size={24} /></span>
                <h2 className="mt-5 text-2xl font-semibold">{platform.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">{platform.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{platform.formats}</p>

                <div className="mt-6 grid gap-2">
                  {loading ? (
                    <span className="flex min-h-12 items-center justify-center bg-gray-100 px-4 text-sm font-semibold text-gray-500">Verificando versão...</span>
                  ) : platformAssets.length ? platformAssets.map((asset) => (
                    <a className="flex min-h-12 items-center justify-center gap-2 bg-ink px-4 text-center text-sm font-semibold text-white hover:bg-graphite" href={asset.browser_download_url} key={asset.name}>
                      <Download size={17} /> {downloadLabel(asset.name, platform.id)}
                    </a>
                  )) : (
                    <span className="flex min-h-12 items-center justify-center border border-line bg-gray-50 px-4 text-center text-sm font-semibold text-gray-500">
                      Instalador ainda não publicado
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Sobre os avisos do sistema:</strong> enquanto os instaladores não tiverem certificados comerciais de assinatura, Windows e macOS podem exibir uma confirmação de segurança antes da instalação. Baixe sempre por esta página.
        </div>

        {repository ? (
          <a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-ink" href={`https://github.com/${repository}/releases`} rel="noreferrer" target="_blank">
            Ver histórico de versões <ExternalLink size={15} />
          </a>
        ) : null}
      </section>
    </Layout>
  );
}

function downloadLabel(name: string, platform: Platform) {
  const normalized = name.toLowerCase();
  if (platform === "linux" && normalized.endsWith(".deb")) return "Baixar .deb";
  if (platform === "linux") return "Baixar AppImage";
  if (normalized.includes("aarch64") || normalized.includes("arm64")) return "Baixar para Apple Silicon";
  if (normalized.includes("x64") || normalized.includes("x86_64")) return platform === "macos" ? "Baixar para Mac Intel" : "Baixar instalador";
  return "Baixar instalador";
}
