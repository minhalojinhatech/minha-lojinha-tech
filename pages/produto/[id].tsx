import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BatteryCharging, Box, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, PlayCircle, ShieldCheck, ShoppingCart, Truck, X, ZoomIn } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { ActionButtonContent } from "@/components/ActionButtonContent";
import { FadeInImage } from "@/components/FadeInImage";
import { Layout, Breadcrumb } from "@/components/Layout";
import { SkeletonBlock } from "@/components/LoadingSkeleton";
import { NotFoundPanel } from "@/components/NotFoundPanel";
import { formatCurrency } from "@/lib/format";
import { fetchProduct } from "@/lib/firestoreData";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import type { Product } from "@/lib/types";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { isDesktopBuild } from "@/lib/runtime";

export default function ProductPage() {
  const router = useRouter();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const productId = isDesktopBuild && typeof router.query.item === "string"
    ? router.query.item
    : typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchProduct(productId)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!product || product.available) return;

    setRedirectSeconds(5);
    const redirect = window.setTimeout(() => router.push("/"), 5000);
    const countdown = window.setInterval(() => {
      setRedirectSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(redirect);
      window.clearInterval(countdown);
    };
  }, [product, router]);

  const galleryLength = product ? (product.gallery.length ? product.gallery.length : product.image ? 1 : 0) : 0;

  useEffect(() => {
    if (!lightboxOpen || galleryLength === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") {
        setSelectedImage((current) => (current - 1 + galleryLength) % galleryLength);
      }
      if (event.key === "ArrowRight") {
        setSelectedImage((current) => (current + 1) % galleryLength);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, galleryLength]);

  if (loading) {
    return (
      <Layout title="Produto | Minha Lojinha Tech" noindex>
        <ProductPageSkeleton />
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout
        title="Produto não encontrado | Minha Lojinha Tech"
        description="Smartphone não encontrado na Minha Lojinha Tech. Veja outros modelos Apple, Samsung, Xiaomi e Motorola disponíveis no catálogo."
        noindex
      >
        <NotFoundPanel
          eyebrow="Produto não encontrado"
          title="Esse produto não está mais na vitrine"
          text="Ele pode ter sido vendido, reservado ou removido do catálogo. Veja outros itens disponíveis agora."
          primaryHref="/catalogo"
          primaryLabel="Ver produtos"
        />
      </Layout>
    );
  }

  if (!product.available) {
    return (
      <Layout
        title="Produto vendido | Minha Lojinha Tech"
        description="Este produto já foi vendido e não está mais disponível."
        noindex
      >
        <section className="container-page">
          <div className="mx-auto max-w-2xl border border-line bg-white p-7 text-center shadow-[0_12px_34px_rgba(17,24,39,0.06)] md:p-10">
            <span className="mx-auto grid size-12 place-items-center bg-green-50 text-brand-green">
              <CheckCircle2 size={25} />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase text-brand-blue">Produto vendido</p>
            <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Essa unidade já encontrou um novo dono</h1>
            <p className="mx-auto mt-3 max-w-lg leading-7 text-gray-600">
              O produto não está mais disponível para compra. Você será direcionado para a home em {redirectSeconds} {redirectSeconds === 1 ? "segundo" : "segundos"}.
            </p>
            <Link className="mt-6 inline-flex rounded-sm bg-ink px-5 py-3 font-medium text-white hover:bg-graphite" href="/">
              Voltar para a home agora
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  const hasOffer = product.originalPrice !== undefined && product.originalPrice > product.price;
  const gallery = product.gallery.length ? product.gallery : [product.image];
  const currentImage = gallery[selectedImage] || product.image;
  const videoEmbedUrl = getYouTubeEmbedUrl(product.videoUrl || "");
  const productDescription = `${product.name} ${product.condition.toLowerCase()} da marca ${product.brand}, com fotos reais, condição informada e compra pela Minha Lojinha Tech.`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: gallery.map((image) => absoluteUrl(image)),
    description: productDescription,
    brand: {
      "@type": "Brand",
      name: product.brand
    },
    category: product.category,
    itemCondition: product.condition === "Novo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produto/${product.id}`),
      priceCurrency: "BRL",
      price: product.price,
      availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@id": `${siteConfig.url}/#store`
      }
    }
  };
  const inCart = items.some((item) => item.productId === product.id);
  const observationRows = [
    product.conservation ? { label: "Estado", value: product.conservation } : null,
    product.batteryHealth ? { label: "Bateria", value: product.batteryHealth } : null,
    product.storage ? { label: "Armazenamento", value: product.storage } : null,
    product.color ? { label: "Cor", value: product.color } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const hasObservations = Boolean(product.notes || observationRows.length);
  const trustItems = [
    product.condition !== "Novo" ? { title: "Unidade conferida", text: "Estado e observações aparecem no anúncio quando aplicável.", icon: ClipboardCheck } : { title: "Produto novo", text: "Garantia conforme informação do item.", icon: Box },
    product.warranty ? { title: "Garantia", text: product.warranty, icon: ShieldCheck } : null,
    product.batteryHealth ? { title: "Bateria", text: product.batteryHealth, icon: BatteryCharging } : null,
    { title: "Entrega local", text: "Retirada, entrega combinada ou motoboy conforme região.", icon: Truck }
  ].filter(Boolean) as Array<{ title: string; text: string; icon: typeof ClipboardCheck }>;
  const trustGridClass = trustItems.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : trustItems.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : trustItems.length === 2 ? "sm:grid-cols-2" : "";

  const handleAdd = () => {
    if (inCart || !product.available) return;
    addItem(product.id, 1, product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  const previousImage = () => setSelectedImage((current) => (current - 1 + gallery.length) % gallery.length);
  const nextImage = () => setSelectedImage((current) => (current + 1) % gallery.length);

  return (
    <Layout
      title={`${product.name} | Minha Lojinha Tech`}
      description={productDescription}
      canonicalPath={`/produto/${product.id}`}
      image={product.image}
      jsonLd={productJsonLd}
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Catálogo", href: "/catalogo" }, { label: product.name }]} />
      <div className="container-page mb-5 border-t border-line" />

      <section className="container-page product-detail">
        <div className="product-detail__main grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-stretch">
          <div className="relative overflow-hidden border border-line bg-white p-2 shadow-[0_18px_55px_rgba(17,24,39,0.07)] lg:col-start-1 lg:row-start-1">
            <button
              aria-label="Ampliar imagem do produto"
              className="group relative block w-full overflow-hidden bg-gray-100 text-left"
              onClick={() => setLightboxOpen(true)}
              type="button"
            >
              <FadeInImage className="aspect-[4/3] w-full object-contain transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.015]" src={currentImage} alt={product.name} />
              <span className="absolute left-3 top-3 bg-ink px-3 py-2 text-xs font-semibold uppercase text-white shadow-lg">
                Foto real
              </span>
              <span className="absolute bottom-3 right-3 flex items-center gap-2 border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-lg transition group-hover:border-ink">
                <ZoomIn size={16} />
                Ampliar
              </span>
            </button>
            {gallery.length > 1 ? (
              <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                <button aria-label="Imagem anterior" className="grid size-10 place-items-center border border-line bg-white/90 text-ink hover:bg-white" onClick={previousImage} type="button">
                  <ChevronLeft size={20} />
                </button>
                <button aria-label="Próxima imagem" className="grid size-10 place-items-center border border-line bg-white/90 text-ink hover:bg-white" onClick={nextImage} type="button">
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : null}
          </div>

          <aside className="product-buybox order-3 flex h-full flex-col border border-line bg-white shadow-[0_20px_60px_rgba(17,24,39,0.08)] lg:order-none lg:col-start-2 lg:row-start-1">
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="border border-line bg-gray-50 px-2.5 py-1.5">{product.condition}</span>
                <span className="border border-green-100 bg-green-50 px-2.5 py-1.5 text-brand-green">{product.badge}</span>
                {product.available ? <span className="border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-brand-blue">Disponível</span> : null}
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">{product.brand}</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">{product.name}</h1>
              {product.conservation ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{product.conservation}</p> : null}
            </div>

            <div className="border-y border-line bg-gray-50 p-5 md:p-6">
              {hasOffer ? <p className="text-base text-gray-500 line-through">{formatCurrency(product.originalPrice!)}</p> : null}
              <p className="text-4xl font-semibold">{formatCurrency(product.price)}</p>
              <p className="mt-2 text-sm text-gray-500">{product.installments || "Consulte as condições de pagamento"}</p>
            </div>

            <div className="p-5 md:p-6">
              <button
                className="flex min-h-12 w-full items-center justify-center gap-2 bg-brand-blue px-5 py-3 text-center text-base font-semibold text-white hover:bg-[#075de5] disabled:cursor-not-allowed disabled:bg-gray-400"
                disabled={inCart}
                onClick={handleAdd}
                type="button"
              >
                <ActionButtonContent
                  state={inCart || added ? "success" : "idle"}
                  idleIcon={<ShoppingCart size={19} />}
                  idleLabel="Adicionar ao carrinho"
                  loadingLabel="Adicionando..."
                  successLabel="Produto no carrinho"
                />
              </button>
            </div>

            <div className="flex-1 border-t border-line bg-gray-50 p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Resumo da unidade</p>
              <dl className="mt-4 grid gap-0 text-sm">
                {observationRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-5 border-b border-line py-3 first:pt-0 last:border-b-0">
                    <dt className="text-gray-500">{row.label}</dt>
                    <dd className="max-w-[220px] text-right font-semibold text-ink">{row.value}</dd>
                  </div>
                ))}
                {product.included.length ? (
                  <div className="flex items-start justify-between gap-5 border-b border-line py-3 last:border-b-0">
                    <dt className="text-gray-500">Incluso</dt>
                    <dd className="max-w-[240px] text-right font-semibold leading-6 text-ink">{product.included.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </aside>

          <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-none lg:col-start-1 lg:row-start-2">
            {gallery.map((image, index) => (
              <button
                key={image}
                aria-label={`Ver imagem ${index + 1}`}
                aria-pressed={index === selectedImage}
                className={`w-20 shrink-0 overflow-hidden border bg-white p-1 transition hover:border-brand-blue md:w-24 ${index === selectedImage ? "border-brand-blue ring-2 ring-brand-blue/10" : "border-line"}`}
                onClick={() => setSelectedImage(index)}
                type="button"
              >
                <FadeInImage className="aspect-square w-full object-cover transition-opacity duration-300 ease-out" src={image} alt={`${product.name} imagem ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page mt-10 border-t border-line md:mt-12" />

      <section className="container-page product-detail__content mt-8 grid gap-5 md:mt-10">
        {hasObservations ? (
          <div className="border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,24,39,0.05)] md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">Transparência da unidade</p>
            <h2 className="mt-2 text-xl font-semibold">Estado real do produto</h2>
            {product.notes ? <p className="mt-3 leading-7 text-gray-600">{product.notes}</p> : null}
            {observationRows.length ? (
              <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                {observationRows.map((row) => (
                  <SpecRow key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        {product.specs.length || product.included.length ? (
          <div className={`grid gap-5 ${product.specs.length && product.included.length ? "lg:grid-cols-2" : ""}`}>
            {product.specs.length ? <InfoBlock title="Especificações técnicas" items={product.specs} /> : null}
            {product.included.length ? <InfoBlock title="Incluso na compra" items={product.included} /> : null}
          </div>
        ) : null}

        {videoEmbedUrl ? (
          <section className="overflow-hidden border border-line bg-white shadow-[0_10px_30px_rgba(17,24,39,0.03)]">
            <div className="flex items-start gap-3 border-b border-line p-5 md:p-6">
              <span className="grid size-10 shrink-0 place-items-center bg-mist text-ink">
                <PlayCircle size={21} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-brand-blue">Vídeo da unidade</p>
                <h2 className="mt-1 text-lg font-semibold">Veja o produto sendo mostrado e testado</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Gravação da lojinha para você avaliar esta unidade com mais detalhes antes da compra.</p>
              </div>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={videoEmbedUrl}
                title={`Vídeo de ${product.name}`}
              />
            </div>
          </section>
        ) : null}

        <div className={`grid gap-4 ${trustGridClass}`}>
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,24,39,0.05)]">
                <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-brand-blue">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="grid overflow-hidden border border-line bg-white md:grid-cols-3">
          <CommercialSummary
            icon={ShieldCheck}
            label="Garantia"
            value={product.warranty || "Consulte a cobertura deste item"}
            href="/garantia"
          />
          <CommercialSummary
            icon={Truck}
            label="Entrega"
            value="Retirada, entrega local ou motoboy"
            href="/entrega-retirada"
          />
          <CommercialSummary
            icon={ShoppingCart}
            label="Pagamento"
            value="Checkout ou pagamento na retirada"
            href="/trocas-devolucoes"
          />
        </div>

        <div className="border border-line bg-gray-50 p-5">
          <h2 className="text-lg font-semibold">Compra com conferência</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Em seminovos e usados, confira estado físico, bateria, acessórios, garantia e observações antes de finalizar.
          </p>
        </div>
      </section>

      {lightboxOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[10000] grid bg-black/90 p-4 text-white"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
        >
          <button
            aria-label="Fechar imagem ampliada"
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center border border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxOpen(false);
            }}
            type="button"
          >
            <X size={22} />
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                aria-label="Imagem anterior"
                className="absolute left-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center border border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  previousImage();
                }}
                type="button"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                aria-label="Próxima imagem"
                className="absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center border border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                type="button"
              >
                <ChevronRight size={24} />
              </button>
            </>
          ) : null}

          <div className="grid min-h-0 place-items-center">
            <FadeInImage
              className="max-h-[88vh] max-w-full object-contain transition-opacity duration-300 ease-out"
              src={currentImage}
              alt={product.name}
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          {gallery.length > 1 ? (
            <div className="absolute inset-x-4 bottom-4 flex justify-center gap-2">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  aria-label={`Ver imagem ${index + 1}`}
                  aria-pressed={index === selectedImage}
                  className={`h-14 w-14 overflow-hidden border bg-white/10 ${index === selectedImage ? "border-white" : "border-white/25"}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedImage(index);
                  }}
                  type="button"
                >
                  <FadeInImage className="h-full w-full object-cover transition-opacity duration-300 ease-out" src={image} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Layout>
  );
}

export function getStaticPaths() {
  return {
    paths: process.env.TAURI_BUILD === "1" ? [{ params: { id: "desktop" } }] : [],
    fallback: process.env.TAURI_BUILD !== "1"
  };
}

export function getStaticProps() {
  return { props: {} };
}

function ProductPageSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Carregando produto">
      <div className="container-page py-4">
        <SkeletonBlock className="h-4 w-56 max-w-[70%]" />
      </div>

      <section className="container-page">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-0">
          <div className="grid gap-4">
            <SkeletonBlock className="aspect-[4/3] w-full border border-line" />
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBlock key={index} className="aspect-square w-full border border-line" />
              ))}
            </div>
          </div>

          <aside className="border border-line bg-white">
            <div className="border-b border-line p-5">
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-20" />
                <SkeletonBlock className="h-6 w-24" />
              </div>
              <SkeletonBlock className="mt-5 h-3 w-24" />
              <SkeletonBlock className="mt-3 h-8 w-4/5" />
              <SkeletonBlock className="mt-2 h-8 w-3/5" />
            </div>
            <div className="border-b border-line bg-gray-50 p-5">
              <SkeletonBlock className="h-9 w-40" />
              <SkeletonBlock className="mt-3 h-4 w-48" />
            </div>
            <div className="grid gap-3 border-b border-line p-5">
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
            <div className="grid gap-4 p-5">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
              <SkeletonBlock className="h-4 w-4/6" />
            </div>
          </aside>
        </div>
      </section>

      <section className="container-page mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border border-line bg-white p-4">
            <SkeletonBlock className="size-9" />
            <SkeletonBlock className="mt-4 h-4 w-28 max-w-full" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
            <SkeletonBlock className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </section>
      <span className="sr-only">Carregando informações do produto...</span>
    </div>
  );
}

function CommercialSummary({
  icon: Icon,
  label,
  value,
  href
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link className="group flex gap-3 border-b border-line p-5 last:border-b-0 hover:bg-gray-50 md:border-b-0 md:border-r md:last:border-r-0" href={href}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-brand-blue">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</span>
        <strong className="mt-1 block font-medium leading-6 text-ink">{value}</strong>
        <span className="mt-2 block text-sm font-semibold text-brand-blue group-hover:text-ink">Ver detalhes</span>
      </span>
    </Link>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border border-line bg-white p-3">
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="font-medium leading-5 text-ink">{value}</dd>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-line bg-white p-5 md:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-4 grid gap-3 text-sm text-gray-600">
        {items.map((item) => (
          <li key={item} className="border border-line bg-gray-50 px-4 py-3">{item}</li>
        ))}
      </ul>
    </div>
  );
}
