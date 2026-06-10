import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackagePlus, ShoppingBag, Wrench } from "lucide-react";
import { DashboardCard, DashboardMetric, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { MetricSkeletons, TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { formatCurrency } from "@/lib/format";
import { fetchCustomers, fetchOrders, fetchProducts, fetchServiceRequests } from "@/lib/firestoreData";
import { OrderStatusBadge } from "@/lib/orderStatus";
import type { Customer, Order, Product } from "@/lib/types";

export default function Painel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<Array<{ id: string; type: string; orderId: string; orderCode: string; customerName: string; customerId: string; status: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchProducts(), fetchCustomers(), fetchServiceRequests()])
      .then(([nextOrders, nextProducts, nextCustomers, nextRequests]) => {
        setOrders(nextOrders);
        setProducts(nextProducts);
        setCustomers(nextCustomers);
        setRequests(nextRequests);
      })
      .finally(() => setLoadingData(false));
  }, []);

  const revenue = orders
    .filter((order) => {
      const hasRefundOrReturnRequest = requests.some((request) =>
        request.orderId === order.id &&
        ["Reembolso", "Devolução"].includes(request.type) &&
        request.status !== "Recusado"
      );
      return order.status === "Entregue" && !hasRefundOrReturnRequest;
    })
    .reduce((sum, order) => sum + order.total, 0);
  const availableProducts = products.filter((product) => product.available).length;
  const openRequests = requests.length;

  return (
    <StoreDashboardLayout title="Visão geral" description="Resumo direto da operação.">
      <section className="dashboard-overview">
        <div>
          <p className="dashboard-overview__eyebrow">Central de operação</p>
          <h1>O que precisa da sua atenção hoje</h1>
          <p className="dashboard-overview__copy">Acompanhe vendas, estoque e atendimentos em um único lugar. Os atalhos levam direto às rotinas mais frequentes da loja.</p>
        </div>
        <div className="dashboard-overview__actions">
          <Link href="/painel/produtos"><PackagePlus size={16} /> Cadastrar produto</Link>
          <Link href="/painel/pedidos"><ShoppingBag size={16} /> Ver pedidos</Link>
          <Link href="/painel/assistencia"><Wrench size={16} /> Assistência</Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loadingData ? <MetricSkeletons count={4} /> : (
          <>
            <DashboardMetric title="Pedidos" value={String(orders.length)} detail="Registrados" />
            <DashboardMetric title="Faturamento" value={formatCurrency(revenue)} detail="Pedidos entregues" />
            <DashboardMetric title="Produtos ativos" value={String(availableProducts)} detail="Disponíveis" />
            <DashboardMetric title="Solicitações" value={String(openRequests)} detail={`${customers.length} clientes`} />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5">
        <DashboardCard
          title="Pedidos recentes"
          description="Últimas compras registradas na loja."
          action={<Link className="flex items-center gap-1 text-xs font-semibold text-brand-blue" href="/painel/pedidos">Ver todos <ArrowRight size={14} /></Link>}
        >
          <DashboardTable>
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? <TableRowsSkeleton rows={5} columns={4} /> : orders.slice(0, 8).map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link className="font-semibold hover:text-brand-blue" href="/painel/pedidos">{order.code}</Link>
                    <p className="mt-1 text-xs text-gray-500">{order.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{order.customer.id}</p>
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.total)}</td>
                </tr>
              ))}
              {!loadingData && orders.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>Nenhum pedido registrado ainda.</td></tr> : null}
            </tbody>
          </DashboardTable>
        </DashboardCard>

        <DashboardCard
          title="Solicitações abertas"
          description="Casos que podem exigir acompanhamento."
          action={<Link className="flex items-center gap-1 text-xs font-semibold text-brand-blue" href="/painel/solicitacoes">Abrir fila <ArrowRight size={14} /></Link>}
        >
          <DashboardTable>
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? <TableRowsSkeleton rows={4} columns={4} /> : requests.slice(0, 8).map((request) => (
                <tr key={request.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold"><Link href="/painel/solicitacoes">{request.type}</Link></td>
                  <td className="px-4 py-3">{request.customerName}</td>
                  <td className="px-4 py-3">{request.orderCode || request.orderId}</td>
                  <td className="px-4 py-3"><span className="border border-line bg-white px-2 py-1 text-xs font-medium">{request.status}</span></td>
                </tr>
              ))}
              {!loadingData && requests.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>Nenhuma solicitação aberta.</td></tr> : null}
            </tbody>
          </DashboardTable>
        </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}
