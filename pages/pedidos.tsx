import Link from "next/link";
import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileSignature, Headphones, PackageCheck, ReceiptText, ShieldCheck, ShoppingBag } from "lucide-react";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { Layout, Breadcrumb } from "@/components/Layout";
import { CardListSkeleton } from "@/components/LoadingSkeleton";
import { collections, db } from "@/lib/firebase";
import { formatCurrency } from "@/lib/format";
import { fetchCustomerOrders, fetchCustomerServiceRequests, fetchProducts } from "@/lib/firestoreData";
import { OrderStatusBadge } from "@/lib/orderStatus";
import { useAuthUser } from "@/lib/useAuthUser";
import type { Order, Product } from "@/lib/types";

export default function Pedidos() {
  const { user } = useAuthUser();
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Array<{ id: string; type: string; orderId: string; status: string }>>([]);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([fetchCustomerOrders(user.uid), fetchCustomerServiceRequests(user.uid)])
      .then(([orders, nextRequests]) => {
        setCustomerOrders(orders);
        setRequests(nextRequests);
      })
      .catch(() => {
        setCustomerOrders([]);
        setRequests([]);
      })
      .finally(() => setLoadingData(false));
  }, [user]);

  async function createOrderRequest(order: Order, type: "Cancelamento" | "Reembolso") {
    if (!user) return;
    const requestRef = await addDoc(collection(db, collections.serviceRequests), {
      customerId: user.uid,
      customerName: user.displayName || user.email,
      customerEmail: user.email,
      orderId: order.id,
      orderCode: order.code,
      productId: order.items[0]?.productId || "",
      type,
      reason: type === "Cancelamento" ? "Cliente solicitou cancelamento do pedido." : "Cliente solicitou reembolso de pedido cancelado.",
      description: "",
      contactPreference: "WhatsApp",
      status: "Aguardando confirmação",
      createdAt: serverTimestamp()
    });
    setRequests((current) => [...current, { id: requestRef.id, type, orderId: order.id, status: "Aguardando confirmação" }]);
    setMessage(type === "Cancelamento" ? "Cancelamento solicitado." : "Reembolso solicitado.");
  }

  return (
    <Layout title="Meus pedidos | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Minha conta", href: "/conta" }, { label: "Meus pedidos" }]} />
      <section className="container-page orders-page">
        <CustomerAuthGate message="Entre na sua conta para acompanhar seus pedidos.">
        <header className="orders-hero">
          <div className="orders-hero__content">
            <div>
              <span className="retail-eyebrow retail-eyebrow--light"><span /> Minha conta</span>
              <h1>Seus pedidos, organizados do pagamento à entrega.</h1>
              <p>Acompanhe cada compra, consulte produtos e resolva pendências sem procurar informações em vários lugares.</p>
            </div>
            <button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
              <Headphones size={18} />
              Falar sobre um pedido
            </button>
          </div>
          <div className="orders-hero__stats">
            <div><ShoppingBag size={20} /><span><strong>{customerOrders.length}</strong> pedido{customerOrders.length === 1 ? "" : "s"}</span></div>
            <div><PackageCheck size={20} /><span><strong>{customerOrders.filter((order) => order.status === "Entregue").length}</strong> entregue{customerOrders.filter((order) => order.status === "Entregue").length === 1 ? "" : "s"}</span></div>
          </div>
        </header>

        <div className="orders-list">
          <div className="orders-list__heading">
            <div><span>Histórico de compras</span><h2>Todos os pedidos</h2></div>
            <Link href="/catalogo">Continuar comprando <ArrowRight size={16} /></Link>
          </div>
          {message ? <p className="orders-message">{message}</p> : null}
          <div className="orders-grid">
          {loadingData ? <CardListSkeleton count={4} /> : customerOrders.map((order) => {
            const hasCancelRequest = requests.some((request) => request.orderId === order.id && request.type === "Cancelamento");
            const hasRefundRequest = requests.some((request) => request.orderId === order.id && request.type === "Reembolso");
            const canRequestCancel = ["Pedido recebido", "Aguardando pagamento", "Pagamento confirmado", "Preparando pedido", "Pronto para retirada"].includes(order.status) && !hasCancelRequest;
            const isPickup = order.deliveryMethod.toLowerCase().includes("retirar") || order.deliveryMethod.toLowerCase().includes("retirada");
            const isOnlinePayment = !order.paymentMethod.toLowerCase().includes("pessoal") && !order.paymentMethod.toLowerCase().includes("retirada");
            const canRequestRefund = order.status === "Cancelado" && isOnlinePayment && !isPickup && !hasRefundRequest;
            const warranty = getOrderWarranty(order);

            return (
              <article key={order.id} className="order-card">
                <div className="order-card__header">
                  <div>
                    <span>Pedido {order.code}</span>
                    <strong>{order.date}</strong>
                  </div>
                  <div>
                    <small>Total do pedido</small>
                    <strong>{formatCurrency(order.total)}</strong>
                  </div>
                </div>

                <div className="order-card__status">
                  <div>
                    <OrderStatusBadge status={order.status} />
                    <span>{order.deliveryMethod}</span>
                  </div>
                  <p>{order.paymentMethod}</p>
                  <div className="order-card__actions">
                    <Link className="flex items-center gap-2 border border-line bg-white px-3 py-2 text-sm font-semibold hover:border-ink" href={`/comprovante-pedido?id=${order.id}`}>
                      <ReceiptText size={16} /> Ver comprovante
                    </Link>
                    {order.agreementStatus === "Assinado" ? (
                      <Link className="flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-brand-green" href={`/assinar-termo?tipo=venda&id=${order.id}`}>
                        <CheckCircle2 size={16} /> Ver termo assinado
                      </Link>
                    ) : (
                      <Link className="flex items-center gap-2 bg-ink px-3 py-2 text-sm font-semibold text-white" href={`/assinar-termo?tipo=venda&id=${order.id}`}>
                        <FileSignature size={16} /> Revisar e assinar termo
                      </Link>
                    )}
                    {canRequestCancel ? (
                      <button className="rounded-sm border border-line bg-white px-3 py-2 text-sm font-medium hover:border-ink" onClick={() => createOrderRequest(order, "Cancelamento")} type="button">
                        Solicitar cancelamento
                      </button>
                    ) : null}
                    {hasCancelRequest && order.status !== "Cancelado" ? <span className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Cancelamento solicitado</span> : null}
                    {canRequestRefund ? (
                      <button className="rounded-sm border border-line bg-white px-3 py-2 text-sm font-medium hover:border-ink" onClick={() => createOrderRequest(order, "Reembolso")} type="button">
                        Solicitar reembolso
                      </button>
                    ) : null}
                    {hasRefundRequest ? <span className="border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">Reembolso solicitado</span> : null}
                  </div>
                </div>

                {warranty ? (
                  <div className="order-card__warranty">
                    <div><ShieldCheck size={21} /><span><small>Garantia da venda</small><strong>{warranty.active ? "Ativa" : "Prazo encerrado"}</strong></span></div>
                    <div><CalendarDays size={17} /><span>De {formatDate(order.warrantyStartsAt)} até {formatDate(order.warrantyExpiresAt)}</span></div>
                    <div><Clock3 size={17} /><strong>{warranty.active ? `${warranty.daysLeft} dias restantes` : "Garantia expirada"}</strong></div>
                  </div>
                ) : null}

                <div className="order-card__items">
                  <h3>Itens deste pedido</h3>
                  <div>
                    {order.items.map((item) => {
                      const product = products.find((candidate) => candidate.id === item.productId);
                      const name = item.name || product?.name || "Produto adquirido";
                      const image = item.image || product?.image;
                      const unitPrice = item.price ?? product?.price;

                      return (
                        <div key={item.productId} className="order-product">
                          {image ? (
                            <img className="aspect-square w-16 border border-line bg-white object-cover" src={image} alt={name} />
                          ) : (
                            <span className="grid aspect-square w-16 place-items-center border border-line bg-white text-gray-400">
                              <ClipboardList size={20} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="block font-medium">{name}</span>
                            <span className="mt-1 block text-xs text-gray-500">{item.quantity} unidade{item.quantity === 1 ? "" : "s"}</span>
                          </div>
                          {unitPrice !== undefined ? <strong className="col-span-2 font-medium sm:col-span-1">{formatCurrency(unitPrice * item.quantity)}</strong> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
          {!loadingData && customerOrders.length === 0 ? (
            <div className="orders-empty">
              <ClipboardList className="text-gray-400" size={34} />
              <p className="mt-3 font-medium">Nenhum pedido encontrado</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">Suas compras aparecem aqui com status, itens e total.</p>
              <Link className="mt-4 rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white" href="/catalogo">Ver catálogo</Link>
            </div>
          ) : null}
          </div>
        </div>
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function getOrderWarranty(order: Order) {
  if (!order.warrantyStartsAt || !order.warrantyExpiresAt) return null;
  const difference = new Date(order.warrantyExpiresAt).getTime() - Date.now();
  return { active: difference >= 0, daysLeft: Math.max(0, Math.ceil(difference / 86400000)) };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("pt-BR").format(date);
}
