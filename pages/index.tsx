import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Star,
  Wrench
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { PromotionSpotlight } from "@/components/PromotionSpotlight";
import { DemandModelCard } from "@/components/DemandModelCard";
import { collections, db } from "@/lib/firebase";
import { fetchActivePublicCoupons, fetchDemandModels, fetchProducts, fetchReviews } from "@/lib/firestoreData";
import type { Coupon, DemandModel, HeroBanner, Product, Review } from "@/lib/types";

const categories = [
  { name: "Apple", href: "/catalogo?marca=Apple", image: "/Logo das Marcas/1.png", hoverImage: "/Artes Smartphones/Apple.webp", color: "#000000" },
  { name: "Samsung", href: "/catalogo?marca=Samsung", image: "/Logo das Marcas/2.png", hoverImage: "/Artes Smartphones/Samsung.webp", color: "#004aad" },
  { name: "Xiaomi", href: "/catalogo?marca=Xiaomi", image: "/Logo das Marcas/3.png", hoverImage: "/Artes Smartphones/Xiaomi.webp", color: "#fc8d00" },
  { name: "Motorola", href: "/catalogo?marca=Motorola", image: "/Logo das Marcas/4.png", hoverImage: "/Artes Smartphones/Motorola.webp", color: "#ff0000" }
];

const inspectionSteps = [
  { number: "01", title: "Avaliação visual", text: "Carcaça, tela, câmeras e sinais de uso registrados." },
  { number: "02", title: "Teste funcional", text: "Conectividade, áudio, bateria e funções essenciais conferidas." },
  { number: "03", title: "Limpeza e preparo", text: "O aparelho é higienizado e preparado antes de ir para a vitrine." }
];

const HERO_INTERVAL_MS = 8000;
const REVIEW_INTERVAL_MS = 6500;

export default function Home() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTransition, setHeroTransition] = useState(true);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [demandModels, setDemandModels] = useState<DemandModel[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  const available = products
    .filter((product) => product.available)
    .sort((a, b) => badgePriority(b.badge) - badgePriority(a.badge));
  const featured = available.slice(0, 4);
  const featuredReviews = reviews.filter((review) => review.rating >= 4).slice(0, 3);
  const displayHeroBanners = heroBanners.filter((banner) => banner.enabled);
  const heroTrack = displayHeroBanners.length > 1 ? [...displayHeroBanners, displayHeroBanners[0]] : displayHeroBanners;
  const mainCoupon = coupons[0];

  useEffect(() => {
    getDoc(doc(db, collections.storeSettings, "homeHero"))
      .then((snapshot) => {
        const data = snapshot.data() as { banners?: HeroBanner[] } | undefined;
        setHeroBanners(data?.banners || []);
      })
      .catch(() => setHeroBanners([]));
    fetchProducts().then(setProducts).catch(() => setProducts([]));
    fetchReviews().then(setReviews).catch(() => setReviews([]));
    fetchActivePublicCoupons().then(setCoupons).catch(() => setCoupons([]));
    fetchDemandModels().then(setDemandModels).catch(() => setDemandModels([]));
  }, []);

  useEffect(() => {
    if (displayHeroBanners.length < 2) return;
    const interval = window.setInterval(() => {
      setHeroTransition(true);
      setHeroIndex((current) => current + 1);
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [displayHeroBanners.length]);

  useEffect(() => {
    if (featuredReviews.length < 2) return;
    const interval = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % featuredReviews.length);
    }, REVIEW_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [featuredReviews.length]);

  const handleHeroTransitionEnd = () => {
    if (displayHeroBanners.length > 1 && heroIndex === displayHeroBanners.length) {
      setHeroTransition(false);
      setHeroIndex(0);
      window.setTimeout(() => setHeroTransition(true), 30);
    }
  };

  return (
    <Layout
      title="Minha Lojinha Tech | Eletrônicos novos e seminovos"
      description="Smartphones e eletrônicos selecionados, com fotos reais, condição detalhada, garantia informada e atendimento direto em São Paulo."
      canonicalPath="/"
      flushTop
    >
      <h1 className="sr-only">Minha Lojinha Tech: smartphones novos e seminovos com procedência</h1>

      <section className="home-hero">
        <div className={`container-page home-hero__grid ${displayHeroBanners.length || available[0] ? "has-image" : ""}`}>
          <div className="home-hero__media" aria-hidden="true">
            {displayHeroBanners.length ? (
              <div
                className={`home-hero__track ${heroTransition ? "is-animated" : ""}`}
                onTransitionEnd={handleHeroTransitionEnd}
                style={{ transform: `translateX(-${heroIndex}00%)` }}
              >
                {heroTrack.map((banner, index) => (
                  <img
                    key={`${banner.id}-${index}`}
                    src={banner.image}
                    alt=""
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ))}
              </div>
            ) : available[0] ? (
              <img src={available[0].image} alt="" />
            ) : null}
          </div>

          <div className="home-hero__copy">
            <span className="retail-eyebrow retail-eyebrow--light"><span /> Tecnologia com procedência</span>
            <h2>Seu próximo smartphone, escolhido com mais clareza.</h2>
            <p>
              Smartphones novos, seminovos e usados preparados para uma compra tranquila:
              fotos reais, condição explicada e atendimento próximo do início ao pós-venda.
            </p>
            <div className="home-hero__actions">
              <Link href="/catalogo" className="retail-button retail-button--blue">
                Explorar produtos <ArrowRight size={18} />
              </Link>
              <button className="retail-button retail-button--light" onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
                Vender meu aparelho
              </button>
            </div>
            <div className="home-hero__assurances">
              <span><Check size={15} /> Fotos da unidade</span>
              <span><Check size={15} /> Revisão informada</span>
              <span><Check size={15} /> Compra segura</span>
            </div>
          </div>

          <div className="home-hero__seal">
            <Check size={20} />
            <span><strong>Compra clara</strong>do anúncio ao pós-venda</span>
          </div>
        </div>
      </section>

      <section className="home-brands">
        <div className="container-page storefront-module storefront-module--brands">
          <div className="home-section-heading">
            <div>
              <span className="retail-eyebrow"><span /> Encontre mais rápido</span>
              <h2>Escolha sua marca</h2>
              <p>Quatro fabricantes com linhas conhecidas, peças acessíveis e boa procura.</p>
            </div>
            <Link href="/catalogo">Ver catálogo completo <ArrowRight size={17} /></Link>
          </div>
          <div className="category-row">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="category-tile"
                style={{ backgroundColor: category.color }}
                aria-label={`Ver produtos ${category.name}`}
              >
                <img className="category-tile__logo" src={category.image} alt={`Logo ${category.name}`} />
                <img className="category-tile__showcase" src={category.hoverImage} alt="" loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {mainCoupon ? (
        <section className="home-campaign">
          <div className="container-page">
            <PromotionSpotlight coupon={mainCoupon} actionHref="/catalogo" actionLabel="Ver smartphones" />
          </div>
        </section>
      ) : null}

      <section className={`home-demand ${available.length === 0 ? "is-priority" : ""}`}>
        <div className="container-page storefront-module">
          <div className="home-section-heading">
            <div>
              <span className="retail-eyebrow"><span /> Interesse da comunidade</span>
              <h2>Procurando um smartphone?</h2>
              <p>Veja os modelos mais procurados pela comunidade ou sugira um aparelho que você gostaria de encontrar por aqui.</p>
            </div>
            <Link href="/procurando-smartphone">Ver todos <ArrowRight size={17} /></Link>
          </div>
          {demandModels.length ? (
            <div className="demand-grid demand-grid--home">
              {demandModels.slice(0, 4).map((model) => (
                <DemandModelCard
                  key={model.id}
                  model={model}
                  onInterest={() => setDemandModels((current) => current.map((item) => item.id === model.id ? { ...item, interestCount: item.interestCount + 1 } : item))}
                />
              ))}
            </div>
          ) : (
            <div className="demand-empty">
              <div><strong>A lista está começando agora.</strong><p>Seja uma das primeiras pessoas a sugerir o smartphone que gostaria de encontrar.</p></div>
              <Link href="/procurando-smartphone#sugerir">Sugerir um modelo <ArrowRight size={16} /></Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-showcase">
        <div className="container-page storefront-module storefront-module--showcase">
          <div className="home-section-heading">
            <div>
              <span className="retail-eyebrow"><span /> Disponíveis agora</span>
              <h2>Destaques da vitrine</h2>
              <p>Uma seleção curta das unidades que merecem atenção primeiro.</p>
            </div>
            <Link href="/catalogo">Ver todos <ArrowRight size={17} /></Link>
          </div>
          {featured.length ? <ProductShelf products={featured} /> : <EmptyShelf />}
        </div>
      </section>

      <section className="inspection-section">
        <div className="container-page inspection-section__grid">
          <div className="inspection-section__copy">
            <span className="retail-eyebrow retail-eyebrow--light"><span /> Seminovo sem mistério</span>
            <h2>Você sabe o que está comprando.</h2>
            <p>
              Cada aparelho usado entra na vitrine com o estado real descrito.
              Marcas de uso, saúde da bateria e observações importantes ficam visíveis antes da compra.
            </p>
            <Link href="/catalogo?condicao=Seminovo" className="retail-button retail-button--white">
              Ver seminovos <ArrowRight size={18} />
            </Link>
          </div>
          <div className="inspection-section__steps">
            {inspectionSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div><strong>{step.title}</strong><p>{step.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-services-zone">
        <div className="container-page storefront-module storefront-module--services">
          <div className="home-section-heading home-section-heading--split">
            <div>
              <span className="retail-eyebrow"><span /> O ciclo completo</span>
              <h2>Comprar é só uma parte do que a loja resolve.</h2>
            </div>
            <p>A mesma operação que seleciona aparelhos também avalia, prepara e ajuda a prolongar a vida de cada smartphone.</p>
          </div>

          <div className="circular-grid">
            <article className="circular-card circular-card--sell">
              <div>
                <span className="retail-eyebrow retail-eyebrow--light"><span /> Recompra</span>
                <h2>Tem um aparelho parado?</h2>
                <p>Conte o modelo e o estado. A gente organiza uma avaliação para compra ou troca.</p>
                <button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
                  Avaliar meu aparelho <ArrowRight size={17} />
                </button>
              </div>
              <RefreshCw size={112} strokeWidth={0.85} />
            </article>
            <Link href="/assistencia" className="circular-card circular-card--repair">
              <div>
                <span className="retail-eyebrow"><span /> Assistência técnica</span>
                <h2>Seu aparelho ainda tem história.</h2>
                <p>Diagnóstico, limpeza, bateria, tela e reparos com acompanhamento pela loja.</p>
                <span className="circular-card__link">Conhecer a assistência <ArrowRight size={17} /></span>
              </div>
              <Wrench size={104} strokeWidth={0.85} />
            </Link>
          </div>

        </div>
      </section>

      <section className="home-proof">
        <div className="container-page storefront-module storefront-module--proof">
          <div className="experience-panel">
            <div className="experience-panel__intro">
              <span className="retail-eyebrow"><span /> Confiança depois da compra</span>
              <h2>Atendimento próximo, processo profissional.</h2>
              <p>Você continua falando com a mesma loja para tirar dúvidas, acompanhar pedidos ou cuidar do aparelho depois da compra.</p>
              <div className="experience-panel__actions">
                <Link href="/avaliacoes">Ver experiências <ArrowRight size={16} /></Link>
                <button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
                  <MessageCircle size={16} /> Falar com a Mika
                </button>
              </div>
            </div>
            <div className="experience-panel__review">
              {featuredReviews.length ? (
                <ReviewCard review={featuredReviews[reviewIndex % featuredReviews.length]} />
              ) : (
                <div className="experience-panel__mika">
                  <img src="/mika-perfil-completo.webp" alt="Ilustração da Mika, assistente virtual da Minha Lojinha Tech" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function ProductShelf({ products }: { products: Product[] }) {
  return (
    <div className="product-shelf">
      {products.map((product) => (
        <div key={product.id} className="product-shelf__item">
          <ProductCard product={product} variant="horizontal" />
        </div>
      ))}
      {products.length < 4 ? (
        <aside className="product-shelf__stock">
          <span><PackageCheck size={22} /></span>
          <div>
            <small>Estoque por unidade</small>
            <h3>Poucos aparelhos. Informações completas.</h3>
            <p>Novos smartphones entram na vitrine conforme cada unidade termina avaliação, limpeza e preparação.</p>
            <Link href="/catalogo">Explorar todo o estoque <ArrowRight size={16} /></Link>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <>
      <div className="experience-panel__stars">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star key={value} className={value <= review.rating ? "is-active" : ""} size={18} />
        ))}
      </div>
      <blockquote>“{review.comment}”</blockquote>
      <strong>{review.customerName}</strong>
      <small>{review.context} · {review.itemName}</small>
    </>
  );
}

function EmptyShelf() {
  return (
    <div className="empty-shelf">
      <PackageCheck size={25} />
      <div><strong>Novidades a caminho</strong><p>Os produtos disponíveis aparecerão aqui assim que entrarem na vitrine.</p></div>
    </div>
  );
}

function badgePriority(badge: Product["badge"]) {
  if (badge === "Pronta entrega") return 4;
  if (badge === "Oferta") return 3;
  if (badge === "Garantia") return 2;
  return 1;
}
