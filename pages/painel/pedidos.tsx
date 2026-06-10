import { useEffect, useState } from "react";
import { deleteField, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { DashboardCard, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { formatCurrency } from "@/lib/format";
import { fetchOrders, fetchProducts } from "@/lib/firestoreData";
import { db, collections } from "@/lib/firebase";
import { getOrderStatusOptions, OrderStatusBadge } from "@/lib/orderStatus";
import { isStoreOwner } from "@/lib/auth";
import { useAuthUser } from "@/lib/useAuthUser";
import { CheckCircle2, FileSignature, KeyRound, ShieldCheck } from "lucide-react";
import type { Order, OrderStatus, Product } from "@/lib/types";

export default function PainelPedidos() {
  const { user, loading: loadingAuth } = useAuthUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [warrantyCode, setWarrantyCode] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("90");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loadingAuth || !isStoreOwner(user)) return;
    Promise.all([fetchOrders(), fetchProducts()])
      .then(([nextOrders, nextProducts]) => {
        setOrders(nextOrders);
        setProducts(nextProducts);
      })
      .finally(() => setLoadingData(false));
  }, [loadingAuth, user]);

  async function updateOrderStatus(order: Order, status: OrderStatus) {
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    await updateDoc(doc(db, collections.orders, order.id), { status });
    if (status === "Cancelado") {
      await restoreOrderProducts(order);
    }
  }

  async function activateWarranty() {
    const normalizedCode = warrantyCode.trim().toUpperCase();
    const order = orders.find((item) => item.code.toUpperCase() === normalizedCode);
    const days = Number(warrantyDays);
    if (!order) {
      setMessage("Pedido não encontrado. Confira o código PED informado.");
      return;
    }
    if (order.status === "Cancelado") {
      setMessage("Não é possível ativar garantia para um pedido cancelado.");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 730) {
      setMessage("Informe um prazo entre 1 e 730 dias.");
      return;
    }
    if (order.warrantyStartsAt && !window.confirm(`A garantia do pedido ${order.code} já foi ativada. Deseja reiniciar o prazo para ${days} dias a partir de hoje?`)) return;

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + days * 86400000);
    try {
      await updateDoc(doc(db, collections.orders, order.id), {
        warrantyStatus: "Ativa",
        warrantyCode: order.code,
        warrantyDays: days,
        warrantyStartsAt: Timestamp.fromDate(startsAt),
        warrantyExpiresAt: Timestamp.fromDate(expiresAt),
        warrantyActivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setOrders((current) => current.map((item) => item.id === order.id ? {
        ...item,
        warrantyStatus: "Ativa",
        warrantyCode: item.code,
        warrantyDays: days,
        warrantyStartsAt: startsAt.toISOString(),
        warrantyExpiresAt: expiresAt.toISOString()
      } : item));
      setWarrantyCode("");
      setMessage(`Garantia do pedido ${order.code} ativada por ${days} dias.`);
    } catch {
      setMessage("Não foi possível ativar a garantia. Verifique sua sessão do painel.");
    }
  }

  return (
    <StoreDashboardLayout title="Pedidos" description="Compras, cliente, entrega e status em uma tabela.">
      <DashboardCard title="Ativar garantia de uma venda" description="Use o próprio número do pedido como código. Nenhuma coleção nova é criada.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end">
          <label className="grid gap-2 text-sm font-medium">Código do pedido
            <input className="rounded-sm border border-line px-4 py-3 font-normal uppercase" onChange={(event) => setWarrantyCode(event.target.value)} placeholder="PED-..." value={warrantyCode} />
          </label>
          <label className="grid gap-2 text-sm font-medium">Prazo em dias
            <input className="rounded-sm border border-line px-4 py-3 font-normal" max="730" min="1" onChange={(event) => setWarrantyDays(event.target.value)} type="number" value={warrantyDays} />
          </label>
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-sm bg-ink px-5 text-sm font-semibold text-white" onClick={activateWarranty} type="button"><KeyRound size={17} /> Ativar garantia</button>
        </div>
        {message ? <p className="mt-3 border border-line bg-gray-50 p-3 text-sm font-medium">{message}</p> : null}
      </DashboardCard>

      <div className="mt-5">
      <DashboardCard title="Pedidos">
        <DashboardTable>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Itens</th>
              <th className="px-4 py-3 font-medium">Entrega</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? <TableRowsSkeleton rows={6} columns={6} /> : orders.map((order) => (
              <tr key={order.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold">{order.code}</p>
                  <p className="mt-1 text-xs text-gray-500">{order.date}</p>
                  <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${order.agreementStatus === "Assinado" ? "text-brand-green" : "text-amber-700"}`}>
                    {order.agreementStatus === "Assinado" ? <CheckCircle2 size={14} /> : <FileSignature size={14} />}
                    Termo {order.agreementStatus === "Assinado" ? "assinado" : "pendente"}
                  </p>
                  {order.warrantyStartsAt ? <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-green"><ShieldCheck size={14} /> Garantia até {formatDate(order.warrantyExpiresAt)}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{order.customer.id}</p>
                  <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">{order.customer.email || order.customer.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-1">
                    {order.items.map((item) => {
                      const product = products.find((candidate) => candidate.id === item.productId);
                      return <p key={item.productId} className="max-w-[260px] truncate text-sm">{item.quantity}x {product?.name || item.productId}</p>;
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">{order.deliveryMethod}</p>
                  <p className="mt-1 text-xs text-gray-500">{order.paymentMethod}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-2">
                    <OrderStatusBadge status={order.status} />
                    {order.status === "Cancelado" ? (
                      <span className="text-xs font-medium text-gray-500">Bloqueado</span>
                    ) : (
                      <select
                        className="h-9 min-w-48 rounded-sm border border-line bg-white px-2 text-xs"
                        onChange={(event) => updateOrderStatus(order, event.target.value as OrderStatus)}
                        value={order.status}
                      >
                        {getOrderStatusOptions(order.deliveryMethod, order.paymentMethod).map((status) => <option key={status}>{status}</option>)}
                      </select>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {order.coupon ? (
                    <p className="mb-1 text-xs font-medium text-brand-green">{order.coupon.code} -{formatCurrency(order.discount)}</p>
                  ) : null}
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                </td>
              </tr>
            ))}
            {!loadingData && orders.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>Nenhum pedido registrado ainda.</td></tr> : null}
          </tbody>
        </DashboardTable>
      </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("pt-BR").format(date);
}

async function restoreOrderProducts(order: Order) {
  await Promise.all(order.items.filter((item) => item.productId).map((item) => (
    updateDoc(doc(db, collections.products, item.productId), {
      available: true,
      status: "Disponível",
      reservedOrderId: deleteField(),
      updatedAt: serverTimestamp()
    })
  )));
}
