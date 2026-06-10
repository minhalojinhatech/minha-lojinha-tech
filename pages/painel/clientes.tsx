import { useMemo, useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { DashboardCard, DashboardMetric, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { MetricSkeletons, TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { formatCurrency } from "@/lib/format";
import { fetchCustomers, fetchOrders } from "@/lib/firestoreData";
import { OrderStatusBadge } from "@/lib/orderStatus";
import type { Customer, Order } from "@/lib/types";

export default function PainelClientes() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchOrders()])
      .then(([nextCustomers, nextOrders]) => {
        setCustomers(nextCustomers);
        setOrders(nextOrders);
      })
      .finally(() => setLoadingData(false));
  }, []);

  const customerRows = useMemo(() => {
    return customers.map((customer) => {
      const customerOrders = orders.filter((order) => order.customer.id === customer.id);
      const total = customerOrders.reduce((sum, order) => sum + order.total, 0);

      return {
        customer,
        orders: customerOrders,
        total
      };
    });
  }, [customers, orders]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCustomers = customerRows.filter(({ customer }) => {
    if (!normalizedQuery) return true;

    return [customer.id, customer.name, customer.email, customer.phone]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <StoreDashboardLayout title="Clientes" description="Busca e histórico por cliente.">
      <div className="grid gap-3 md:grid-cols-3">
        {loadingData ? <MetricSkeletons count={3} /> : (
          <>
            <DashboardMetric title="Clientes cadastrados" value={String(customers.length)} detail="Com ID único" />
            <DashboardMetric title="Clientes com compras" value={String(customerRows.filter((row) => row.orders.length > 0).length)} detail="Pedidos vinculados" />
            <DashboardMetric title="Compras acumuladas" value={formatCurrency(customerRows.reduce((sum, row) => sum + row.total, 0))} detail="Pedidos registrados" />
          </>
        )}
      </div>

      <div className="mt-5">
      <DashboardCard title="Buscar cliente">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Código, nome, e-mail ou telefone
            <input
              className="rounded-sm border border-line px-4 py-3 font-normal"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="CLI-8F42"
              value={query}
            />
          </label>
          <Link className="rounded-sm border border-line px-4 py-3 text-center text-sm font-medium hover:border-ink" href="/painel/pedidos">
            Ver pedidos
          </Link>
        </div>
      </DashboardCard>
      </div>

      <div className="mt-5">
      <DashboardCard title="Clientes">
        <DashboardTable>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Último status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? <TableRowsSkeleton rows={5} columns={5} /> : filteredCustomers.map(({ customer, orders: customerOrders, total }) => {
              const lastOrder = customerOrders[0];
              return (
                <tr key={customer.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex min-w-[230px] items-center gap-3">
                      <CustomerAvatar customer={customer} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{customer.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate">{customer.email}</p>
                    <p className="mt-1 text-xs text-gray-500">{customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-brand-blue hover:text-ink" href="/painel/pedidos">{customerOrders.length}</Link>
                  </td>
                  <td className="px-4 py-3">{lastOrder ? <OrderStatusBadge status={lastOrder.status} /> : <span className="text-sm text-gray-500">Sem pedidos</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(total)}</td>
                </tr>
              );
            })}
            {!loadingData && filteredCustomers.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>Nenhum cliente encontrado.</td></tr> : null}
          </tbody>
        </DashboardTable>
      </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}

function CustomerAvatar({ customer }: { customer: Customer }) {
  const initials = customer.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CL";

  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-gray-100 text-sm font-semibold text-ink">
      {customer.photoURL ? (
        <img className="h-full w-full object-cover" src={customer.photoURL} alt={customer.name} />
      ) : (
        initials
      )}
    </span>
  );
}
