import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { CheckCircle2, Printer, ReceiptText, ShieldCheck } from "lucide-react";
import { Breadcrumb, Layout } from "@/components/Layout";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { fetchCustomerOrders, fetchProducts } from "@/lib/firestoreData";
import { formatCurrency } from "@/lib/format";
import { useAuthUser } from "@/lib/useAuthUser";
import type { Order, Product } from "@/lib/types";

export default function ComprovantePedido() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = typeof router.query.id === "string" ? router.query.id : "";
    if (!user || !router.isReady || !orderId) return;
    setLoading(true);
    Promise.all([fetchCustomerOrders(user.uid), fetchProducts()])
      .then(([orders, nextProducts]) => {
        setOrder(orders.find((item) => item.id === orderId) || null);
        setProducts(nextProducts);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.id, user]);

  return (
    <Layout title="Comprovante do pedido | Minha Lojinha Tech" noindex>
      <div className="receipt-screen-only"><Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Meus pedidos", href: "/pedidos" }, { label: "Comprovante" }]} /></div>
      <section className="container-page receipt-page">
        <CustomerAuthGate message="Entre na conta vinculada ao pedido para abrir o comprovante.">
          {loading ? <div className="border border-line bg-white p-8 text-sm text-gray-600">Carregando comprovante...</div> : null}
          {!loading && !order ? (
            <div className="border border-line bg-white p-8 text-center">
              <ReceiptText className="mx-auto text-gray-400" size={34} />
              <h1 className="mt-3 text-2xl font-semibold">Comprovante não encontrado</h1>
              <p className="mt-2 text-gray-600">Este pedido não pertence à conta atual ou não está mais disponível.</p>
              <Link className="mt-5 inline-flex bg-ink px-5 py-3 text-sm font-semibold text-white" href="/pedidos">Voltar aos pedidos</Link>
            </div>
          ) : null}
          {!loading && order ? <ReceiptDocument order={order} products={products} /> : null}
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function ReceiptDocument({ order, products }: { order: Order; products: Product[] }) {
  const paymentConfirmed = ["Pagamento confirmado", "Preparando pedido", "Pronto para retirada", "Saiu para entrega", "Entregue"].includes(order.status);
  return (
    <>
      <div className="receipt-toolbar receipt-screen-only">
        <Link href="/pedidos">Voltar aos pedidos</Link>
        <button onClick={() => window.print()} type="button"><Printer size={17} /> Imprimir ou salvar em PDF</button>
      </div>
      <article className="receipt-document">
        <header>
          <div className="receipt-brand"><img src="/logo-loja.png" alt="" /><div><strong>Minha Lojinha Tech</strong><span>Comprovante do pedido</span></div></div>
          <div className="receipt-number"><span>Número</span><strong>{order.code}</strong><small>{formatDate(order.date)}</small></div>
        </header>

        <div className="receipt-status">
          <CheckCircle2 size={20} />
          <div><strong>{paymentConfirmed ? "Compra registrada" : "Pedido registrado"}</strong><p>Status atual: {order.status}</p></div>
        </div>

        <section className="receipt-details">
          <ReceiptField label="Cliente" value={order.customer.name} />
          <ReceiptField label="E-mail" value={order.customer.email || "-"} />
          <ReceiptField label="Pagamento" value={order.paymentMethod} />
          <ReceiptField label="Entrega ou retirada" value={order.deliveryMethod} />
          {order.pickupPoint ? <ReceiptField label="Ponto de retirada" value={order.pickupPoint} /> : null}
          {order.deliveryAddress ? <ReceiptField label="Endereço" value={order.deliveryAddress} /> : null}
        </section>

        <section className="receipt-items">
          <h2>Itens do pedido</h2>
          {order.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            const name = item.name || product?.name || "Produto adquirido";
            const price = item.price ?? product?.price ?? 0;
            return <div key={item.productId}><span>{item.quantity}x {name}</span><strong>{formatCurrency(price * item.quantity)}</strong></div>;
          })}
        </section>

        <section className="receipt-totals">
          <div><span>Subtotal</span><strong>{formatCurrency(order.subtotal)}</strong></div>
          {order.discount > 0 ? <div><span>Desconto {order.coupon?.code ? `(${order.coupon.code})` : ""}</span><strong>-{formatCurrency(order.discount)}</strong></div> : null}
          <div className="is-total"><span>Total</span><strong>{formatCurrency(order.total)}</strong></div>
        </section>

        {order.warrantyStartsAt && order.warrantyExpiresAt ? (
          <section className="receipt-warranty"><ShieldCheck size={22} /><div><strong>Garantia ativada</strong><p>Código: {order.warrantyCode || order.code} · Período de {formatDate(order.warrantyStartsAt)} até {formatDate(order.warrantyExpiresAt)}.</p></div></section>
        ) : null}

        <footer>
          <p>Este documento comprova o registro do pedido na Minha Lojinha Tech. Ele não substitui nota fiscal quando ela for aplicável.</p>
          <p>O termo de venda e as condições de garantia permanecem disponíveis na área do cliente.</p>
        </footer>
      </article>
    </>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR").format(date);
}
