import type { Customer } from "@/lib/types";

export function createOrderCode(customerId: string) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const customerPart = customerId.replace(/^CLI-/i, "").slice(0, 6).toUpperCase() || "CLIENT";
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `PED-${day}${month}-${customerPart}-${suffix}`;
}

export function fallbackOrderCode(orderId: string, date: string, customer: Customer) {
  const [year, month, day] = date.split("-");
  const datePart = day && month ? `${day}${month}` : "0000";
  const customerPart = customer.id.replace(/^CLI-/i, "").slice(0, 6).toUpperCase() || orderId.slice(0, 6).toUpperCase();
  return `PED-${datePart}-${customerPart}`;
}
