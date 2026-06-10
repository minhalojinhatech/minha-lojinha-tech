import Link from "next/link";
import { useRouter } from "next/router";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Smartphone } from "lucide-react";
import { FilterPanel, emptyCatalogFilters } from "@/components/FilterPanel";
import type { CatalogFilters } from "@/components/FilterPanel";
import { Layout, Breadcrumb } from "@/components/Layout";
import { ProductGrid } from "@/components/ProductGrid";
import { PromotionSpotlight } from "@/components/PromotionSpotlight";
import { fetchActivePublicCoupons, fetchProducts } from "@/lib/firestoreData";
import type { Coupon, Product } from "@/lib/types";

export default function Catalogo() {
  const router = useRouter();
  const brand = typeof router.query.marca === "string" ? router.query.marca : "";
  const condition = typeof router.query.condicao === "string" ? router.query.condicao : "";
  const offerOnly = router.query.categoria === "Ofertas";
  const search = typeof router.query.busca === "string" ? router.query.busca : "";
  const [sort, setSort] = useState("relevancia");
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchActivePublicCoupons()
      .then((coupons) => setActiveCoupon(coupons[0] || null))
      .catch(() => setActiveCoupon(null));
  }, []);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      brands: brand ? [brand] : [],
      conditions: condition ? [condition] : []
    }));
  }, [brand, condition]);

  const activeCount =
    filters.brands.length +
    filters.conditions.length +
    filters.storage.length +
    filters.badges.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  const visibleProducts = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalize(search.trim());
    const minPrice = Number(filters.minPrice.replace(/\D/g, "")) || 0;
    const maxPrice = Number(filters.maxPrice.replace(/\D/g, "")) || Infinity;

    const filtered = products.filter((product) => {
      const searchable = normalize([
        product.name,
        product.brand,
        product.category,
        product.condition,
        product.badge,
        product.storage ?? "",
        product.color ?? ""
      ].join(" "));

      return (
        product.available &&
        product.category === "Celulares" &&
        ["Apple", "Samsung", "Xiaomi", "Motorola"].includes(product.brand) &&
        (!term || searchable.includes(term)) &&
        (!offerOnly || (product.originalPrice !== undefined && product.originalPrice > product.price)) &&
        (filters.brands.length === 0 || filters.brands.includes(product.brand)) &&
        (filters.conditions.length === 0 || filters.conditions.includes(product.condition)) &&
        (filters.storage.length === 0 || (product.storage ? filters.storage.some((value) => normalize(value) === normalize(product.storage || "")) : false)) &&
        (filters.badges.length === 0 || filters.badges.includes(product.badge)) &&
        product.price >= minPrice &&
        product.price <= maxPrice
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === "menor-preco") return a.price - b.price;
      if (sort === "maior-preco") return b.price - a.price;
      if (sort === "pronta-entrega") return Number(b.badge === "Pronta entrega") - Number(a.badge === "Pronta entrega");
      return 0;
    });
  }, [filters, offerOnly, products, search, sort]);

  const toggleFilter = (key: keyof Pick<CatalogFilters, "brands" | "conditions" | "storage" | "badges">, value: string) => {
    setFilters((current) => {
      const values = current[key];
      return {
        ...current,
        [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
      };
    });
  };

  const clearFilters = () => {
    setFilters(emptyCatalogFilters);
    if (brand || condition || offerOnly || search) router.push("/catalogo", undefined, { shallow: true, scroll: false });
  };

  const selectBrand = async (event: MouseEvent<HTMLAnchorElement>, nextBrand: string) => {
    event.preventDefault();
    if (brand === nextBrand) return;
    await router.push(`/catalogo?marca=${encodeURIComponent(nextBrand)}`, undefined, { shallow: true, scroll: false });
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <Layout
      title="Smartphones novos e seminovos | Minha Lojinha Tech"
      description="Veja smartphones Apple, Samsung, Xiaomi e Motorola com fotos reais, condição detalhada, garantia informada e compra simples."
      canonicalPath="/catalogo"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Smartphones" }]} />
      <section className="container-page catalog-page">
        <header className="catalog-hero">
          <div>
            <span className="retail-eyebrow"><span /> Catálogo especializado</span>
            <h1>Smartphones escolhidos para uma compra mais segura.</h1>
            <p>Apple, Samsung, Xiaomi e Motorola. Cada unidade com fotos reais, condição explicada e informações importantes antes da compra.</p>
            <div className="catalog-hero__checks">
              <span><CheckCircle2 size={16} /> Seminovos revisados</span>
              <span><CheckCircle2 size={16} /> Estado real informado</span>
              <span><CheckCircle2 size={16} /> Atendimento direto</span>
            </div>
          </div>
          <Smartphone size={118} strokeWidth={.85} />
        </header>

        <nav className="brand-switcher" aria-label="Comprar por marca">
          {["Apple", "Samsung", "Xiaomi", "Motorola"].map((item) => (
            <Link key={item} className={brand === item ? "is-active" : ""} href={`/catalogo?marca=${item}`} onClick={(event) => selectBrand(event, item)}>
              <strong>{item}</strong>
              <span>Ver modelos <ArrowRight size={14} /></span>
            </Link>
          ))}
        </nav>

        {activeCoupon ? (
          <div className="catalog-promotion">
            <PromotionSpotlight compact coupon={activeCoupon} />
          </div>
        ) : null}
        <div className="catalog-toolbar" ref={resultsRef}>
          <div>
            <h2>{brand ? `Smartphones ${brand}` : offerOnly ? "Smartphones em oferta" : "Todos os smartphones"}</h2>
            <p>Filtre por marca, condição, armazenamento, preço e disponibilidade.</p>
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="relevancia">Ordenar por relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
            <option value="pronta-entrega">Pronta entrega</option>
          </select>
        </div>
        <div className="catalog-results">
          <FilterPanel
            activeCount={activeCount}
            filters={filters}
            onClear={clearFilters}
            onPriceChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            onToggle={toggleFilter}
          />
          <div>
            <div className="catalog-results__count">
              {loading ? "Carregando smartphones..." : `${visibleProducts.length} smartphone${visibleProducts.length === 1 ? "" : "s"} encontrado${visibleProducts.length === 1 ? "" : "s"}${search ? ` para "${search}"` : ""}`}
            </div>
            {!loading ? <div className="catalog-products"><ProductGrid density="catalogHorizontal" products={visibleProducts} /></div> : null}
            {!loading && visibleProducts.length === 0 ? (
              <div className="catalog-empty">
                <Smartphone size={30} />
                <h3>Nenhum smartphone encontrado</h3>
                <p>Tente remover alguns filtros ou explore outra marca.</p>
                <button onClick={clearFilters} type="button">Limpar filtros</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}
