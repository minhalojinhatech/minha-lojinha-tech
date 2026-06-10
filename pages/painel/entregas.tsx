import { useEffect, useState } from "react";
import { TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { DashboardCard, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { fetchOrders } from "@/lib/firestoreData";
import type { Order } from "@/lib/types";

export default function PainelEntregas() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StoreDashboardLayout title="Entregas" description="Retirada, entrega local e motoboy.">
      <DashboardCard title="Entregas e retiradas">
        <DashboardTable>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Andamento</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <TableRowsSkeleton columns={5} rows={4} /> : orders.map((order) => (
              <tr key={order.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{order.code}</td>
                <td className="px-4 py-3">{order.customer.name}</td>
                <td className="px-4 py-3">{order.customer.phone || order.customer.email}</td>
                <td className="px-4 py-3">{order.deliveryMethod}</td>
                <td className="px-4 py-3">
                  <select className="h-9 min-w-40 rounded-sm border border-line bg-white px-2 text-xs">
                    <option>A combinar</option>
                    <option>Agendada</option>
                    <option>Em rota</option>
                    <option>Entregue</option>
                    <option>Cancelada</option>
                  </select>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>Nenhum pedido com entrega registrado ainda.</td></tr> : null}
          </tbody>
        </DashboardTable>
      </DashboardCard>
    </StoreDashboardLayout>
  );
}
