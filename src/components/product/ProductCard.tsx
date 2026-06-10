import Image from "next/image";
import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatCurrency, whatsappProductUrl } from "@/lib/format";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="group overflow-hidden rounded-[28px] border border-white bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/produto/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-mist">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-contain p-5 transition duration-500 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-black text-ink backdrop-blur">
            {product.condition}
          </span>
          {product.badge && (
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-ink">
              {product.badge}
            </span>
          )}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal">{product.brand}</p>
            <Link href={`/produto/${product.id}`} className="mt-1 block text-lg font-black leading-tight text-ink">
              {product.name}
            </Link>
          </div>
          <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-graphite">
            {product.availability}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-graphite">{product.conservation}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            {product.oldPrice && <p className="text-xs font-semibold text-graphite line-through">{formatCurrency(product.oldPrice)}</p>}
            <p className="text-2xl font-black text-ink">{formatCurrency(product.price)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Adicionar ao carrinho"
              onClick={() => addItem(product)}
              className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-ink text-white transition hover:bg-graphite"
            >
              <ShoppingBag size={18} />
            </button>
            <a
              href={whatsappProductUrl(product.name)}
              target="_blank"
              rel="noreferrer"
              aria-label="Chamar no WhatsApp"
              className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-teal transition hover:border-teal"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
