import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

type ProductGridDensity = "default" | "homeCompact" | "homeRelaxed" | "catalogHorizontal";

const gridClasses: Record<ProductGridDensity, string> = {
  default: "grid gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  homeCompact: "grid gap-4 min-[520px]:grid-cols-2 min-[980px]:grid-cols-3 min-[1120px]:grid-cols-4",
  homeRelaxed: "grid gap-4 min-[560px]:grid-cols-2 min-[1040px]:grid-cols-3 min-[1240px]:grid-cols-4",
  catalogHorizontal: "catalog-product-grid"
};

export function ProductGrid({ products, density = "default" }: { products: Product[]; density?: ProductGridDensity }) {
  return (
    <div className={gridClasses[density]}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={density === "catalogHorizontal" ? "horizontal" : "default"} />
      ))}
    </div>
  );
}
