import { collection, doc, getDoc, getDocs, query, where, type DocumentData } from "firebase/firestore";
import { collections, db } from "@/lib/firebase";
import { fallbackOrderCode } from "@/lib/orderCode";
import type { Coupon, Customer, DemandInterest, DemandModel, DemandSuggestion, Order, OrderStatus, Product, ProductCategory, ProductCondition, Repair, RepairStatus, RepairWarranty, Review } from "@/lib/types";

type ServiceRequest = {
  id: string;
  type: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerId: string;
  reason: string;
  status: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  createdAt: string;
};

const productCategories: ProductCategory[] = ["Celulares", "Tablets", "Notebooks", "Computadores", "Acessorios"];
const productConditions: ProductCondition[] = ["Novo", "Seminovo", "Usado"];
const pickupPointIds = ["ponto-retirada-1", "ponto-retirada-2"];

export async function fetchProducts() {
  const snapshot = await getDocs(collection(db, collections.products));
  return snapshot.docs.map((item) => productFromDoc(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchProduct(productId: string) {
  const snapshot = await getDoc(doc(db, collections.products, productId));
  return snapshot.exists() ? productFromDoc(snapshot.id, snapshot.data()) : null;
}

export async function fetchDemandModels(includeInactive = false) {
  const snapshot = await getDocs(collection(db, collections.demandModels));
  return snapshot.docs
    .map((item) => demandModelFromDoc(item.id, item.data()))
    .filter((item) => includeInactive || item.active)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.interestCount - a.interestCount || a.name.localeCompare(b.name));
}

export async function fetchDemandModel(modelId: string) {
  const snapshot = await getDoc(doc(db, collections.demandModels, modelId));
  return snapshot.exists() ? demandModelFromDoc(snapshot.id, snapshot.data()) : null;
}

export async function fetchDemandSuggestions() {
  const snapshot = await getDocs(collection(db, collections.demandSuggestions));
  return snapshot.docs.map((item) => demandSuggestionFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchDemandInterests() {
  const snapshot = await getDocs(collection(db, collections.demandInterests));
  return snapshot.docs.map((item) => demandInterestFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchOrders() {
  const snapshot = await getDocs(collection(db, collections.orders));
  return [...snapshot.docs]
    .sort((a, b) => orderTimestamp(b.data()) - orderTimestamp(a.data()))
    .map((item) => orderFromDoc(item.id, item.data()));
}

export async function fetchCustomerOrders(userId: string) {
  const snapshot = await getDocs(query(collection(db, collections.orders), where("customerId", "==", userId)));
  return [...snapshot.docs]
    .sort((a, b) => orderTimestamp(b.data()) - orderTimestamp(a.data()))
    .map((item) => orderFromDoc(item.id, item.data()));
}

export async function fetchCustomers() {
  const snapshot = await getDocs(collection(db, collections.users));
  return snapshot.docs.map((item) => customerFromDoc(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchServiceRequests() {
  const snapshot = await getDocs(collection(db, collections.serviceRequests));
  return snapshot.docs.map((item) => serviceRequestFromDoc(item.id, item.data()));
}

export async function fetchCustomerServiceRequests(userId: string) {
  const snapshot = await getDocs(query(collection(db, collections.serviceRequests), where("customerId", "==", userId)));
  return snapshot.docs.map((item) => serviceRequestFromDoc(item.id, item.data()));
}

export async function fetchRepairs() {
  const snapshot = await getDocs(collection(db, collections.repairs));
  return snapshot.docs.map((item) => repairFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchCustomerRepairs(userId: string) {
  const snapshot = await getDocs(query(collection(db, collections.repairs), where("customerId", "==", userId)));
  return snapshot.docs.map((item) => repairFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchCustomerRepairWarranties(userId: string) {
  const snapshot = await getDocs(query(collection(db, collections.repairWarranties), where("customerId", "==", userId)));
  return snapshot.docs.map((item) => repairWarrantyFromDoc(item.id, item.data())).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export async function fetchReviews() {
  const snapshot = await getDocs(query(collection(db, collections.reviews), where("status", "==", "Publicado")));
  return snapshot.docs.map((item) => reviewFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchCustomerReviews(userId: string) {
  const snapshot = await getDocs(query(collection(db, collections.reviews), where("customerId", "==", userId), where("status", "==", "Publicado")));
  return snapshot.docs.map((item) => reviewFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchCoupons() {
  const snapshot = await getDocs(collection(db, collections.coupons));
  return snapshot.docs.map((item) => couponFromDoc(item.id, item.data())).sort((a, b) => a.code.localeCompare(b.code));
}

export async function fetchActivePublicCoupons() {
  const snapshot = await getDocs(query(collection(db, collections.coupons), where("active", "==", true), where("public", "==", true)));
  return snapshot.docs.map((item) => couponFromDoc(item.id, item.data())).filter(isCouponUsableNow).sort((a, b) => b.value - a.value);
}

export async function fetchCouponByCode(code: string) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return null;
  const snapshot = await getDocs(query(collection(db, collections.coupons), where("code", "==", normalizedCode)));
  const first = snapshot.docs[0];
  return first ? couponFromDoc(first.id, first.data()) : null;
}

export async function fetchCustomerCouponUsage(userId: string, code: string) {
  if (!userId || !code) return 0;
  const snapshot = await getDocs(query(collection(db, collections.orders), where("customerId", "==", userId)));
  const normalizedCode = normalizeCouponCode(code);
  return snapshot.docs.filter((item) => normalizeCouponCode(String(item.data().coupon?.code || "")) === normalizedCode).length;
}

function productFromDoc(id: string, data: DocumentData): Product {
  const category = productCategories.includes(data.category) ? data.category : "Acessorios";
  const condition = productConditions.includes(data.condition) ? data.condition : "Novo";
  const gallery = Array.isArray(data.gallery) && data.gallery.length ? data.gallery.map(String) : [String(data.image || "")].filter(Boolean);
  const price = Number(data.price || 0);
  const originalPrice = Number(data.originalPrice || 0);
  const reservationExpired =
    data.reservedUntil?.toMillis instanceof Function &&
    data.reservedUntil.toMillis() <= Date.now();

  return {
    id: String(data.id || id),
    sku: data.sku ? String(data.sku) : undefined,
    name: String(data.name || "Produto sem nome"),
    category,
    brand: String(data.brand || "Sem marca"),
    condition,
    price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    installments: String(data.installments || ""),
    storage: data.storage ? String(data.storage) : data.mainAttribute ? String(data.mainAttribute) : undefined,
    color: data.color ? String(data.color) : undefined,
    available: Boolean(data.available ?? true) || reservationExpired,
    badge: data.badge || (originalPrice > price ? "Oferta" : "Pronta entrega"),
    image: String(data.image || gallery[0] || ""),
    gallery,
    specs: toStringList(data.specs),
    included: toStringList(data.included),
    warranty: String(data.warranty || ""),
    conservation: String(data.conservation || ""),
    batteryHealth: data.batteryHealth ? String(data.batteryHealth) : undefined,
    notes: String(data.notes || ""),
    videoUrl: data.videoUrl ? String(data.videoUrl) : undefined,
    pickupPointIds: toPickupPointIds(data.pickupPointIds)
  };
}

function demandModelFromDoc(id: string, data: DocumentData): DemandModel {
  const gallery = Array.isArray(data.gallery) ? data.gallery.map(String).filter(Boolean) : [];
  const image = String(data.image || gallery[0] || "");
  return {
    id: String(data.id || id),
    name: String(data.name || "Modelo não informado"),
    brand: String(data.brand || "Sem marca"),
    summary: String(data.summary || ""),
    image,
    gallery: gallery.length ? gallery : image ? [image] : [],
    screen: String(data.screen || ""),
    processor: String(data.processor || ""),
    memory: String(data.memory || ""),
    storage: String(data.storage || ""),
    battery: String(data.battery || ""),
    operatingSystem: String(data.operatingSystem || ""),
    interestCount: Number(data.interestCount || 0),
    active: Boolean(data.active ?? true),
    featured: Boolean(data.featured ?? false),
    createdAt: timestampToIso(data.createdAt)
  };
}

function demandSuggestionFromDoc(id: string, data: DocumentData): DemandSuggestion {
  return {
    id,
    brand: String(data.brand || ""),
    model: String(data.model || ""),
    notes: String(data.notes || ""),
    customerName: String(data.customerName || ""),
    customerEmail: String(data.customerEmail || ""),
    customerPhone: String(data.customerPhone || ""),
    customerId: String(data.customerId || ""),
    status: data.status === "Aprovada" ? "Aprovada" : data.status === "Rejeitada" ? "Rejeitada" : "Pendente",
    createdAt: timestampToIso(data.createdAt)
  };
}

function demandInterestFromDoc(id: string, data: DocumentData): DemandInterest {
  return {
    id,
    modelId: String(data.modelId || ""),
    modelName: String(data.modelName || ""),
    intent: data.intent === "updates" ? "updates" : "interest",
    customerName: String(data.customerName || ""),
    customerEmail: String(data.customerEmail || ""),
    customerPhone: String(data.customerPhone || ""),
    customerId: String(data.customerId || ""),
    createdAt: timestampToIso(data.createdAt)
  };
}

function orderFromDoc(id: string, data: DocumentData): Order {
  const customer = customerFromDoc(String(data.customerId || data.userId || ""), data.customer || data);
  const date = String(data.date || data.createdAt?.toDate?.().toISOString().slice(0, 10) || "");

  return {
    id: String(data.id || id),
    code: String(data.orderCode || data.code || fallbackOrderCode(String(data.id || id), date, customer)),
    date,
    subtotal: Number(data.subtotal || data.total || 0),
    discount: Number(data.discount || data.coupon?.discount || 0),
    total: Number(data.total || 0),
    coupon: data.coupon?.code ? {
      code: String(data.coupon.code),
      title: String(data.coupon.title || data.coupon.code),
      discount: Number(data.coupon.discount || data.discount || 0)
    } : undefined,
    status: validOrderStatus(data.status),
    customer,
    paymentMethod: String(data.paymentMethod || "A combinar"),
    deliveryMethod: String(data.deliveryMethod || "A combinar"),
    pickupPoint: data.pickupPoint ? String(data.pickupPoint) : undefined,
    deliveryAddress: data.deliveryAddress ? String(data.deliveryAddress) : undefined,
    agreementStatus: data.agreementStatus === "Assinado" ? "Assinado" : "Pendente",
    agreementSignedAt: data.agreementSignedAt ? timestampToIso(data.agreementSignedAt) : undefined,
    agreementDocumentHash: data.agreementDocumentHash ? String(data.agreementDocumentHash) : undefined,
    warrantyStatus: data.warrantyExpiresAt && new Date(timestampToIso(data.warrantyExpiresAt)).getTime() < Date.now() ? "Expirada" : data.warrantyStatus === "Ativa" ? "Ativa" : undefined,
    warrantyCode: data.warrantyCode ? String(data.warrantyCode) : undefined,
    warrantyDays: data.warrantyDays ? Number(data.warrantyDays) : undefined,
    warrantyStartsAt: data.warrantyStartsAt ? timestampToIso(data.warrantyStartsAt) : undefined,
    warrantyExpiresAt: data.warrantyExpiresAt ? timestampToIso(data.warrantyExpiresAt) : undefined,
    items: Array.isArray(data.items) ? data.items.map((item: DocumentData) => ({
      productId: String(item.productId || ""),
      quantity: Number(item.quantity || 1),
      name: item.name ? String(item.name) : undefined,
      price: item.price !== undefined ? Number(item.price) : undefined,
      image: item.image ? String(item.image) : undefined
    })) : []
  };
}

function orderTimestamp(data: DocumentData) {
  if (data.createdAt?.toMillis instanceof Function) return data.createdAt.toMillis();
  const parsed = Date.parse(String(data.createdAt || data.date || ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function customerFromDoc(id: string, data: DocumentData): Customer {
  const uid = String(data.uid || data.customerId || data.userId || id);
  return {
    id: String(data.customerCode || data.id || `CLI-${uid.slice(0, 6).toUpperCase()}`),
    uid,
    name: String(data.fullName || data.displayName || data.name || "Cliente sem nome"),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    document: data.document ? String(data.document) : undefined,
    createdAt: String(data.createdAt?.toDate?.().toISOString().slice(0, 10) || "")
  };
}

function serviceRequestFromDoc(id: string, data: DocumentData): ServiceRequest {
  return {
    id: String(data.id || id),
    type: String(data.type || data.requestType || "Solicitação"),
    orderId: String(data.orderId || data.order || ""),
    orderCode: String(data.orderCode || data.orderDisplayId || data.order || data.orderId || ""),
    customerName: String(data.customerName || data.customer?.name || "Cliente"),
    customerId: String(data.customerCode || data.customerId || data.userId || ""),
    reason: String(data.reason || data.description || ""),
    status: String(data.status || "Aguardando análise"),
    customerEmail: String(data.customerEmail || ""),
    customerPhone: String(data.customerPhone || ""),
    description: String(data.description || ""),
    createdAt: timestampToIso(data.createdAt)
  };
}

function repairFromDoc(id: string, data: DocumentData): Repair {
  return {
    id,
    code: String(data.code || `REP-${id.slice(0, 6).toUpperCase()}`),
    customerId: String(data.customerId || ""),
    customerName: String(data.customerName || "Cliente"),
    customerEmail: String(data.customerEmail || ""),
    customerPhone: String(data.customerPhone || ""),
    sourceRequestId: data.sourceRequestId ? String(data.sourceRequestId) : undefined,
    device: String(data.device || "Dispositivo não informado"),
    brand: data.brand ? String(data.brand) : undefined,
    model: data.model ? String(data.model) : undefined,
    serialNumber: data.serialNumber ? String(data.serialNumber) : undefined,
    deviceKey: data.deviceKey ? String(data.deviceKey) : undefined,
    issue: String(data.issue || ""),
    diagnosis: data.diagnosis ? String(data.diagnosis) : undefined,
    servicePerformed: data.servicePerformed ? String(data.servicePerformed) : undefined,
    parts: data.parts ? String(data.parts) : undefined,
    status: validRepairStatus(data.status),
    externalDevice: Boolean(data.externalDevice ?? true),
    warrantyEligible: Boolean(data.warrantyEligible ?? true),
    warrantyCode: data.warrantyCode ? String(data.warrantyCode) : undefined,
    warrantyCodeStatus: data.warrantyCodeStatus === "Utilizado" ? "Utilizado" : data.warrantyCode ? "Disponível" : undefined,
    finishedAt: data.finishedAt ? timestampToIso(data.finishedAt) : undefined,
    createdAt: timestampToIso(data.createdAt),
    agreementStatus: data.agreementStatus === "Assinado" ? "Assinado" : "Pendente",
    agreementSignedAt: data.agreementSignedAt ? timestampToIso(data.agreementSignedAt) : undefined,
    agreementDocumentHash: data.agreementDocumentHash ? String(data.agreementDocumentHash) : undefined
  };
}

function repairWarrantyFromDoc(id: string, data: DocumentData): RepairWarranty {
  return {
    id,
    repairId: String(data.repairId || ""),
    repairCode: String(data.repairCode || ""),
    customerId: String(data.customerId || ""),
    device: String(data.device || "Dispositivo não informado"),
    brand: data.brand ? String(data.brand) : undefined,
    model: data.model ? String(data.model) : undefined,
    serialNumber: data.serialNumber ? String(data.serialNumber) : undefined,
    deviceKey: data.deviceKey ? String(data.deviceKey) : undefined,
    servicePerformed: String(data.servicePerformed || "Serviço realizado"),
    parts: data.parts ? String(data.parts) : undefined,
    issue: data.issue ? String(data.issue) : undefined,
    diagnosis: data.diagnosis ? String(data.diagnosis) : undefined,
    startsAt: timestampToIso(data.startsAt),
    expiresAt: timestampToIso(data.expiresAt),
    activatedAt: timestampToIso(data.activatedAt)
  };
}

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return String(value || "");
}

function validRepairStatus(value: unknown): RepairStatus {
  const legacyMap: Record<string, RepairStatus> = {
    Confirmado: "Solicitado",
    "Aguardando aprovação": "Em diagnóstico",
    Entregue: "Finalizado"
  };
  const normalized = legacyMap[String(value || "")] || value;
  const statuses: RepairStatus[] = ["Solicitado", "Em diagnóstico", "Em reparo", "Pronto para retirada", "Finalizado"];
  return statuses.includes(normalized as RepairStatus) ? normalized as RepairStatus : "Solicitado";
}

function reviewFromDoc(id: string, data: DocumentData): Review {
  return {
    id: String(data.id || id),
    customerName: String(data.customerName || "Cliente"),
    customerId: data.customerId ? String(data.customerId) : undefined,
    rating: Math.min(5, Math.max(1, Number(data.rating || 5))),
    context: validReviewContext(data.context),
    itemName: String(data.itemName || "Atendimento da loja"),
    comment: String(data.comment || ""),
    images: Array.isArray(data.images) ? data.images.map(String).slice(0, 3) : [],
    status: data.status === "Pendente" ? "Pendente" : "Publicado",
    createdAt: String(data.createdAt?.toDate?.().toISOString().slice(0, 10) || data.createdAt || "")
  };
}

function couponFromDoc(id: string, data: DocumentData): Coupon {
  return {
    id: String(data.id || id),
    code: normalizeCouponCode(String(data.code || id)),
    title: String(data.title || "Cupom da loja"),
    description: String(data.description || ""),
    type: data.type === "Valor fixo" ? "Valor fixo" : "Percentual",
    value: Number(data.value || 0),
    minSubtotal: Number(data.minSubtotal || 0),
    active: Boolean(data.active ?? true),
    startsAt: data.startsAt ? String(data.startsAt) : undefined,
    endsAt: data.endsAt ? String(data.endsAt) : undefined,
    usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
    perUserLimit: data.perUserLimit ? Number(data.perUserLimit) : undefined,
    usedCount: Number(data.usedCount || 0),
    public: Boolean(data.public ?? true),
    createdAt: String(data.createdAt?.toDate?.().toISOString().slice(0, 10) || data.createdAt || "")
  };
}

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isCouponUsableNow(coupon: Coupon) {
  const today = new Date().toISOString().slice(0, 10);
  if (!coupon.active) return false;
  if (coupon.startsAt && coupon.startsAt > today) return false;
  if (coupon.endsAt && coupon.endsAt < today) return false;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number) {
  if (!isCouponUsableNow(coupon) || subtotal < coupon.minSubtotal) return 0;
  const rawDiscount = coupon.type === "Percentual" ? subtotal * (coupon.value / 100) : coupon.value;
  return Math.max(0, Math.min(subtotal, Math.round(rawDiscount * 100) / 100));
}

function validReviewContext(value: unknown): Review["context"] {
  const context = String(value || "Compra");
  if (context === "Reparo" || context === "Atendimento") return context;
  return "Compra";
}

function validOrderStatus(status: unknown): OrderStatus {
  const value = String(status || "Pedido recebido") as OrderStatus;
  return value;
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return [];
}

function toPickupPointIds(value: unknown) {
  if (!Array.isArray(value)) return pickupPointIds;
  const selected = value.map(String).filter((item) => pickupPointIds.includes(item));
  return selected.length ? selected : pickupPointIds;
}
