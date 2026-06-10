import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { FadeInImage } from "@/components/FadeInImage";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { appHref } from "@/lib/runtime";

export function ProductCard({ product, variant = "default" }: { product: Product; variant?: "default" | "horizontal" }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.some((item) => item.productId === product.id);

  const handleAdd = () => {
    if (inCart || !product.available) return;
    addItem(product.id, 1, product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  const hasOffer = product.originalPrice !== undefined && product.originalPrice > product.price;
  const attributes = [product.storage, product.color, product.warranty].filter(Boolean).slice(0, 2);

  return (
    <article className={`product-card group ${variant === "horizontal" ? "product-card--horizontal" : ""}`}>
      <Link href={appHref(`/produto/${product.id}`)} className="product-card__media">
        <FadeInImage className="product-card__image" src={product.image} alt={product.name} />
        <div className="product-card__badges">
          <span>{product.condition}</span>
          <span className="is-status">{product.badge}</span>
        </div>
        {hasOffer ? <span className="product-card__offer">Oferta</span> : null}
      </Link>
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand}</p>
        <h3>
          <Link href={appHref(`/produto/${product.id}`)}>
            {product.name}
          </Link>
        </h3>
        {attributes.length ? (
          <div className="product-card__attributes">
            {attributes.map((attribute) => <span key={attribute}>{attribute}</span>)}
          </div>
        ) : null}
        <div className="product-card__price">
          {hasOffer ? <small>{formatCurrency(product.originalPrice!)}</small> : <small>&nbsp;</small>}
          <strong>{formatCurrency(product.price)}</strong>
          <span>{product.installments || "Consulte as condições"}</span>
        </div>
        <p className="product-card__trust"><Check size={14} /> {product.warranty || "Condição informada no anúncio"}</p>
        <div className="product-card__actions">
          <button
            disabled={inCart || !product.available}
            onClick={handleAdd}
            type="button"
          >
            <ShoppingCart size={16} />
            {!product.available ? "Indisponível" : inCart ? "No carrinho" : added ? "Adicionado" : "Adicionar"}
          </button>
          <Link href={appHref(`/produto/${product.id}`)} aria-label={`Ver detalhes de ${product.name}`}>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
