import { useEffect, useState } from "react";
import { deleteField, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { DashboardCard, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { fetchServiceRequests } from "@/lib/firestoreData";
import { collections, db } from "@/lib/firebase";

export default function PainelSolicitacoes() {
  const [requests, setRequests] = useState<Array<{ id: string; type: string; orderId: string; orderCode: string; customerName: string; customerId: string; customerPhone: string; customerEmail: string; reason: string; description: string; status: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchServiceRequests().then(setRequests).catch(() => setRequests([])).finally(() => setLoadingData(false));
  }, []);

  async function updateRequest(request: { id: string; type: string; orderId: string }, status: string) {
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
    await updateDoc(doc(db, collections.serviceRequests, request.id), { status });
    if (request.type === "Cancelamento" && status === "Confirmado") {
      await updateDoc(doc(db, collections.orders, request.orderId), { status: "Cancelado" });
      await restoreOrderProducts(request.orderId);
    }
  }

  return (
    <StoreDashboardLayout title="Solicitações" description="Ofertas de celulares, cancelamentos, reembolsos e suporte.">
      <DashboardCard title="Solicitações">
        <DashboardTable>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="px-4 py-3 font-medium">Detalhes</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? <TableRowsSkeleton rows={5} columns={5} /> : requests.map((request) => (
              <tr key={request.id} className="border-t border-line align-top">
                <td className="px-4 py-3 font-semibold">{request.type}</td>
                <td className="px-4 py-3">
                  <span className="block">{request.customerName}</span>
                  {request.customerPhone ? <a className="mt-1 block text-xs font-medium text-brand-blue hover:underline" href={`https://wa.me/55${request.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{request.customerPhone}</a> : null}
                  {request.customerEmail ? <span className="mt-1 block text-xs text-gray-500">{request.customerEmail}</span> : null}
                </td>
                <td className="px-4 py-3">{request.orderCode || request.orderId || "-"}</td>
                <td className="px-4 py-3">
                  <p className="max-w-[420px] text-sm font-medium leading-5">{request.reason || "-"}</p>
                  {request.description && request.description !== request.reason ? <p className="mt-2 max-w-[420px] whitespace-pre-line text-xs leading-5 text-gray-500">{request.description}</p> : null}
                </td>
                <td className="px-4 py-3">
                  {["Confirmado", "Recusado", "Finalizado"].includes(request.status) ? (
                    <span className="border border-line bg-white px-2 py-1 text-xs font-medium text-gray-500">{request.status}</span>
                  ) : (
                    <select className="h-9 min-w-52 rounded-sm border border-line bg-white px-2 text-xs" onChange={(event) => updateRequest(request, event.target.value)} value={request.status}>
                      <option>Aguardando confirmação</option>
                      <option>Confirmado</option>
                      <option>Recusado</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {!loadingData && requests.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>Nenhuma solicitação aberta.</td></tr> : null}
          </tbody>
        </DashboardTable>
      </DashboardCard>
    </StoreDashboardLayout>
  );
}

async function restoreOrderProducts(orderId: string) {
  const orderSnapshot = await getDoc(doc(db, collections.orders, orderId));
  const items = orderSnapshot.data()?.items;
  if (!Array.isArray(items)) return;

  await Promise.all(items.filter((item) => item?.productId).map((item) => (
    updateDoc(doc(db, collections.products, String(item.productId || "")), {
      available: true,
      status: "Disponível",
      reservedOrderId: deleteField(),
      updatedAt: serverTimestamp()
    })
  )));
}
