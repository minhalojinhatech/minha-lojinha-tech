import type { OrderStatus } from "@/lib/types";

export const orderStatuses: OrderStatus[] = [
  "Pedido recebido",
  "Aguardando pagamento",
  "Pagamento confirmado",
  "Preparando pedido",
  "Pronto para retirada",
  "Saiu para entrega",
  "Entregue",
  "Cancelado"
];

export function getOrderStatusOptions(deliveryMethod: string, paymentMethod: string): OrderStatus[] {
  const isPickup = deliveryMethod.toLowerCase().includes("retirar") || deliveryMethod.toLowerCase().includes("retirada");
  const isPayOnPickup = paymentMethod.toLowerCase().includes("pessoal") || paymentMethod.toLowerCase().includes("retirada");

  return [
    "Pedido recebido",
    ...(isPayOnPickup ? [] : ["Aguardando pagamento", "Pagamento confirmado"] as OrderStatus[]),
    "Preparando pedido",
    ...(isPickup ? ["Pronto para retirada"] as OrderStatus[] : ["Saiu para entrega"] as OrderStatus[]),
    "Entregue",
    "Cancelado"
  ];
}

export function getOrderStatusClass(status: OrderStatus) {
  switch (status) {
    case "Pagamento confirmado":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Entregue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Cancelado":
      return "border-red-200 bg-red-50 text-red-700";
    case "Saiu para entrega":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "Preparando pedido":
    case "Pronto para retirada":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Aguardando pagamento":
      return "border-gray-200 bg-gray-50 text-gray-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex w-max items-center border px-2.5 py-1 text-xs font-semibold ${getOrderStatusClass(status)}`}>
      {status}
    </span>
  );
}
