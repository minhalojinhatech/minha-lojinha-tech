import { FormEvent, useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { CardListSkeleton, SkeletonBlock } from "@/components/LoadingSkeleton";
import { DashboardCard, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { collections, db, storage } from "@/lib/firebase";
import { canPreviewImageFile, imageAccept, isSupportedImageFile, prepareImageForUpload } from "@/lib/imageProcessing";
import type { HeroBanner } from "@/lib/types";

export default function PainelConfiguracoes() {
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, collections.storeSettings, "homeHero"))
      .then((snapshot) => {
        const data = snapshot.data() as { banners?: HeroBanner[] } | undefined;
        setHeroBanners(data?.banners || []);
      })
      .catch(() => setHeroBanners([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleHeroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const enabled = data.get("enabled") === "on";

    if (!title || !bannerImage) {
      setMessageType("error");
      setMessage("Informe o titulo e selecione uma imagem para a hero.");
      return;
    }

    setSaving(true);

    try {
      const id = `${Date.now()}-${slugify(title)}`;
      const prepared = await prepareImageForUpload(bannerImage, id);
      const imageRef = ref(storage, `hero/${id}-${slugify(bannerImage.name)}.${prepared.extension}`);
      await uploadBytes(imageRef, prepared.file, { contentType: prepared.contentType });
      const image = await getDownloadURL(imageRef);
      const nextBanners = [...heroBanners, { id, title, image, enabled }];

      await setDoc(
        doc(db, collections.storeSettings, "homeHero"),
        {
          banners: nextBanners,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setHeroBanners(nextBanners);
      setBannerImage(null);
      form.reset();
      setMessageType("success");
      setMessage("Banner salvo na hero.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o banner.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBanner(id: string) {
    const nextBanners = heroBanners.map((banner) => banner.id === id ? { ...banner, enabled: !banner.enabled } : banner);
    setHeroBanners(nextBanners);
    await setDoc(doc(db, collections.storeSettings, "homeHero"), { banners: nextBanners, updatedAt: serverTimestamp() }, { merge: true });
  }

  return (
    <StoreDashboardLayout title="Configurações" description="Banners e ajustes visuais da loja.">
      <DashboardCard title="Hero da home">
        <form className="grid gap-4" onSubmit={handleHeroSubmit}>
          {message ? (
            <p className={`border p-3 text-sm font-medium ${messageType === "success" ? "border-green-100 bg-green-50 text-brand-green" : "border-red-100 bg-red-50 text-red-700"}`}>
              {message}
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
            <Info label="Tamanho recomendado" value="1920 x 720 px" />
            {loading ? <div className="border border-line bg-gray-50 p-4"><SkeletonBlock className="h-4 w-24" /><SkeletonBlock className="mt-2 h-5 w-10" /></div> : <Info label="Banners ativos" value={String(heroBanners.filter((banner) => banner.enabled).length)} />}
            <button className="rounded-sm bg-ink px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
              {saving ? "Salvando..." : "Adicionar banner"}
            </button>
          </div>
          <div className="border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-gray-700">
            <strong className="text-ink">Orientação para o Canva:</strong> use 1920 × 720 px, deixe a metade esquerda mais limpa para receber os textos da loja e posicione produtos ou elementos principais à direita. No celular, a imagem vira fundo vertical e pode recortar bastante as laterais, então mantenha o assunto principal próximo ao centro.
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Título interno
              <input className="rounded-sm border border-line px-4 py-3 font-normal" name="title" placeholder="Oferta da semana" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Imagem da hero
              <input accept={imageAccept} className="rounded-sm border border-line bg-white px-4 py-3 font-normal" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setBannerImage(file && isSupportedImageFile(file) ? file : null);
              }} type="file" />
            </label>
            <label className="flex items-center gap-2 border border-line px-4 py-3 text-sm font-medium">
              <input className="size-4 accent-ink" defaultChecked name="enabled" type="checkbox" />
              Ativo
            </label>
          </div>
          {bannerImage ? (
            <div className="w-full max-w-md border border-line bg-gray-50 p-2 text-xs">
              {canPreviewImageFile(bannerImage) ? (
                <img className="aspect-[8/3] w-full bg-white object-cover" src={URL.createObjectURL(bannerImage)} alt="Prévia do banner" />
              ) : (
                <div className="grid aspect-[8/3] w-full place-items-center bg-white text-gray-500">
                  HEIC selecionado
                </div>
              )}
              <p className="mt-2 truncate">{bannerImage.name}</p>
            </div>
          ) : null}
        </form>
        <div className="mt-5 grid gap-3">
          {loading ? (
            <CardListSkeleton count={2} />
          ) : heroBanners.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum banner cadastrado ainda.</p>
          ) : heroBanners.map((banner) => (
            <article key={banner.id} className="grid gap-3 border border-line bg-gray-50 p-3 md:grid-cols-[180px_1fr_auto] md:items-center">
              <img className="aspect-[8/3] w-full bg-white object-cover" src={banner.image} alt={banner.title} />
              <div>
                <p className="font-medium">{banner.title}</p>
                <p className="mt-1 text-sm text-gray-500">{banner.enabled ? "Ativo na home" : "Desativado"}</p>
              </div>
              <button className="rounded-sm border border-line bg-white px-4 py-3 text-sm font-medium hover:border-ink" onClick={() => toggleBanner(banner.id)} type="button">
                {banner.enabled ? "Desativar" : "Ativar"}
              </button>
            </article>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Arte de assistência da home">
        <div className="grid gap-3 md:grid-cols-[240px_1fr]">
          <Info label="Tamanho para o Canva" value="1500 x 500 px" />
          <div className="border border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            Use proporção 3:1 e mantenha textos e elementos importantes nos 70% centrais. No celular, a arte ocupa toda a largura com altura fixa de 160 px e pode recortar as laterais.
          </div>
        </div>
      </DashboardCard>

    </StoreDashboardLayout>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <strong className="mt-1 block font-medium">{value}</strong>
    </div>
  );
}
