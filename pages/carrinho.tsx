import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, PackageCheck, ShieldCheck, ShoppingBag, TicketPercent, Trash2, Truck, X } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";
import { PromotionSpotlight } from "@/components/PromotionSpotlight";
import { useCart } from "@/components/CartProvider";
import { formatCurrency } from "@/lib/format";
import { fetchActivePublicCoupons } from "@/lib/firestoreData";
import type { Coupon } from "@/lib/types";
import { useRouter } from "next/router";
import { appHref } from "@/lib/runtime";

export default function Carrinho() {
  const router = useRouter();
  const { appliedCoupon, applyCoupon, clearCoupon, discount, lines, removeItem, subtotal, total } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [featuredCoupon, setFeaturedCoupon] = useState<Coupon | null>(null);
  const appliedQueryCoupon = useRef("");

  useEffect(() => { fetchActivePublicCoupons().then((coupons) => setFeaturedCoupon(coupons[0] || null)).catch(() => setFeaturedCoupon(null)); }, []);
  useEffect(() => {
    if (!router.isReady || typeof router.query.cupom !== "string") return;
    const code = router.query.cupom;
    if (appliedQueryCoupon.current === code) return;
    appliedQueryCoupon.current = code;
    setCouponCode(code);
    applyCoupon(code).then(setCouponMessage);
  }, [applyCoupon, router.isReady, router.query.cupom]);

  async function handleCouponSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setCouponMessage(await applyCoupon(couponCode)); }
  async function applyFeaturedCoupon() {
    if (!featuredCoupon) return;
    setCouponCode(featuredCoupon.code);
    setCouponMessage(await applyCoupon(featuredCoupon.code));
  }

  return (
    <Layout title="Carrinho | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Carrinho" }]} />
      <section className="container-page cart-page">
        <header className="cart-page__header">
          <div><span className="retail-eyebrow"><span /> Sua compra</span><h1>Revise seu carrinho</h1><p>Confira a unidade, o valor e as condições antes de continuar.</p></div>
          <span><ShoppingBag size={22} /><strong>{lines.length}</strong>{lines.length === 1 ? "item" : "itens"}</span>
        </header>

        {featuredCoupon && !appliedCoupon ? (
          <div className="cart-page__promotion">
            <PromotionSpotlight compact actionLabel="Aplicar cupom" coupon={featuredCoupon} onApply={applyFeaturedCoupon} />
          </div>
        ) : null}

        {lines.length === 0 ? (
          <div className="cart-empty">
            <span><ShoppingBag size={35} /></span><h2>Seu carrinho está vazio</h2>
            <p>Explore os smartphones disponíveis e escolha a unidade que combina com você.</p>
            <Link href="/catalogo">Explorar smartphones <ArrowRight size={17} /></Link>
          </div>
        ) : (
          <div className="cart-page__layout">
            <div className="cart-page__items">
              <div className="cart-page__items-head"><h2>Smartphones selecionados</h2><span>{lines.length} {lines.length === 1 ? "unidade" : "unidades"}</span></div>
              {lines.map((item) => (
                <article key={item.product.id} className="cart-item">
                  <Link href={appHref(`/produto/${item.product.id}`)}><img src={item.product.image} alt={item.product.name} /></Link>
                  <div className="cart-item__info">
                    <p>{item.product.brand}</p><h3><Link href={appHref(`/produto/${item.product.id}`)}>{item.product.name}</Link></h3>
                    <div><span>{item.product.condition}</span><span>{item.product.badge}</span>{item.product.storage ? <span>{item.product.storage}</span> : null}</div>
                    <small><CheckCircle2 size={14} /> Unidade real com condição informada</small>
                  </div>
                  <div className="cart-item__price"><small>1 unidade</small><strong>{formatCurrency(item.lineTotal)}</strong><button onClick={() => removeItem(item.product.id)} type="button"><Trash2 size={15} /> Remover</button></div>
                </article>
              ))}
              <Link className="cart-page__continue" href="/catalogo">Continuar comprando <ArrowRight size={16} /></Link>
            </div>

            <aside className="cart-summary">
              <h2>Resumo da compra</h2>
              <div className="cart-summary__values">
                <p><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></p>
                {appliedCoupon ? <p className="is-discount"><span>Cupom {appliedCoupon.code}</span><strong>-{formatCurrency(discount)}</strong></p> : null}
                <p><span>Entrega</span><strong>A combinar</strong></p>
              </div>
              <div className="cart-summary__coupon">
                {appliedCoupon ? (
                  <div><span><TicketPercent size={17} /> {appliedCoupon.title || appliedCoupon.code}</span><button onClick={clearCoupon} type="button" aria-label="Remover cupom"><X size={16} /></button></div>
                ) : (
                  <form onSubmit={handleCouponSubmit}><input onChange={(event) => setCouponCode(event.target.value)} placeholder="Código do cupom" value={couponCode} /><button type="submit">Aplicar</button></form>
                )}
                {couponMessage ? <p>{couponMessage}</p> : null}
              </div>
              <div className="cart-summary__total"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
              <Link href="/checkout">Continuar para checkout <ArrowRight size={18} /></Link>
              <div className="cart-summary__trust">
                <p><ShieldCheck size={16} /> Checkout e pagamento protegidos</p>
                <p><Truck size={16} /> Retirada ou entrega combinada</p>
                <p><PackageCheck size={16} /> Produto reservado após confirmação</p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </Layout>
  );
}
