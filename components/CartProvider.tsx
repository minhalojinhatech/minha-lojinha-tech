import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { calculateCouponDiscount, fetchCouponByCode, fetchCustomerCouponUsage, fetchProducts, isCouponUsableNow } from "@/lib/firestoreData";
import { useAuthContext } from "@/components/AuthProvider";
import type { Coupon, Product } from "@/lib/types";

type CartLine = {
  productId: string;
  quantity: number;
};

type CartProductLine = CartLine & {
  product: Product;
  lineTotal: number;
};

type CartContextValue = {
  items: CartLine[];
  lines: CartProductLine[];
  totalItems: number;
  subtotal: number;
  appliedCoupon: Coupon | null;
  discount: number;
  total: number;
  applyCoupon: (code: string) => Promise<string>;
  clearCoupon: () => void;
  addItem: (productId: string, quantity?: number, product?: Product) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [items, setItems] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const lines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product?.available) return null;
        return { ...item, product, lineTotal: product.price * item.quantity };
      })
      .filter(Boolean) as CartProductLine[];
  }, [items, products]);

  useEffect(() => {
    if (!products.length) return;
    setItems((current) => current.filter((item) => products.some((product) => product.id === item.productId && product.available)));
  }, [products]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.length;
    const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = appliedCoupon ? calculateCouponDiscount(appliedCoupon, subtotal) : 0;
    const total = Math.max(0, subtotal - discount);

    return {
      items,
      lines,
      totalItems,
      subtotal,
      appliedCoupon,
      discount,
      total,
      async applyCoupon(code) {
        const coupon = await fetchCouponByCode(code);

        if (!coupon) return "Cupom não encontrado.";
        if (!isCouponUsableNow(coupon)) return "Este cupom não está ativo agora.";
        if (subtotal < coupon.minSubtotal) return `Este cupom vale para compras a partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(coupon.minSubtotal)}.`;
        if (coupon.perUserLimit && user) {
          const customerUsage = await fetchCustomerCouponUsage(user.uid, coupon.code);
          if (customerUsage >= coupon.perUserLimit) return "Você já atingiu o limite de uso deste cupom.";
        }

        const nextDiscount = calculateCouponDiscount(coupon, subtotal);
        if (nextDiscount <= 0) return "Este cupom não gera desconto para este carrinho.";

        setAppliedCoupon(coupon);
        return `Cupom ${coupon.code} aplicado.`;
      },
      clearCoupon() {
        setAppliedCoupon(null);
      },
      addItem(productId, quantity = 1, product) {
        if (product && !product.available) return;
        if (product) {
          setProducts((current) => {
            const found = current.some((item) => item.id === product.id);
            return found ? current.map((item) => (item.id === product.id ? product : item)) : [...current, product];
          });
        }
        setItems((current) => {
          const found = current.find((item) => item.productId === productId);
          if (found) {
            return current;
          }
          return [...current, { productId, quantity: Math.min(1, Math.max(1, quantity)) }];
        });
      },
      removeItem(productId) {
        setItems((current) => current.filter((item) => item.productId !== productId));
      },
      setQuantity(productId, quantity) {
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.productId !== productId)
            : current.map((item) => (item.productId === productId ? { ...item, quantity: 1 } : item))
        );
      },
      clearCart() {
        setItems([]);
        setAppliedCoupon(null);
      }
    };
  }, [appliedCoupon, items, lines, user]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
