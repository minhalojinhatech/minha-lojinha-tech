export type ProductCondition = "Novo" | "Seminovo" | "Usado";

export type ProductCategory = "Celulares" | "Tablets" | "Notebooks" | "Acessorios" | "Computadores";

export type HeroBanner = {
  id: string;
  title: string;
  image: string;
  enabled: boolean;
};

export type DemandModel = {
  id: string;
  name: string;
  brand: string;
  summary: string;
  image: string;
  gallery: string[];
  screen: string;
  processor: string;
  memory: string;
  storage: string;
  battery: string;
  operatingSystem: string;
  interestCount: number;
  active: boolean;
  featured: boolean;
  createdAt: string;
};

export type DemandSuggestion = {
  id: string;
  brand: string;
  model: string;
  notes: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string;
  status: "Pendente" | "Aprovada" | "Rejeitada";
  createdAt: string;
};

export type DemandInterest = {
  id: string;
  modelId: string;
  modelName: string;
  intent: "interest" | "updates";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  document?: string;
  createdAt: string;
};

export type RepairStatus =
  | "Solicitado"
  | "Em diagnóstico"
  | "Em reparo"
  | "Pronto para retirada"
  | "Finalizado";

export type Repair = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sourceRequestId?: string;
  device: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  deviceKey?: string;
  issue: string;
  diagnosis?: string;
  servicePerformed?: string;
  parts?: string;
  status: RepairStatus;
  externalDevice: boolean;
  warrantyEligible: boolean;
  warrantyCode?: string;
  warrantyCodeStatus?: "Disponível" | "Utilizado";
  finishedAt?: string;
  createdAt: string;
  agreementStatus?: "Pendente" | "Assinado";
  agreementSignedAt?: string;
  agreementDocumentHash?: string;
};

export type RepairWarranty = {
  id: string;
  repairId: string;
  repairCode: string;
  customerId: string;
  device: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  deviceKey?: string;
  servicePerformed: string;
  parts?: string;
  issue?: string;
  diagnosis?: string;
  startsAt: string;
  expiresAt: string;
  activatedAt: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
};

export type Product = {
  id: string;
  sku?: string;
  name: string;
  category: ProductCategory;
  brand: string;
  condition: ProductCondition;
  price: number;
  originalPrice?: number;
  installments: string;
  storage?: string;
  color?: string;
  available: boolean;
  badge: "Revisado" | "Garantia" | "Pronta entrega" | "Oferta";
  image: string;
  gallery: string[];
  specs: string[];
  included: string[];
  warranty: string;
  conservation: string;
  batteryHealth?: string;
  notes: string;
  videoUrl?: string;
  pickupPointIds?: string[];
};

export type OrderStatus =
  | "Pedido recebido"
  | "Aguardando pagamento"
  | "Pagamento confirmado"
  | "Preparando pedido"
  | "Pronto para retirada"
  | "Saiu para entrega"
  | "Entregue"
  | "Cancelado";

export type Order = {
  id: string;
  code: string;
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  coupon?: {
    code: string;
    title: string;
    discount: number;
  };
  status: OrderStatus;
  customer: Customer;
  paymentMethod: string;
  deliveryMethod: string;
  pickupPoint?: string;
  deliveryAddress?: string;
  agreementStatus?: "Pendente" | "Assinado";
  agreementSignedAt?: string;
  agreementDocumentHash?: string;
  warrantyStatus?: "Ativa" | "Expirada";
  warrantyCode?: string;
  warrantyDays?: number;
  warrantyStartsAt?: string;
  warrantyExpiresAt?: string;
  items: Array<{
    productId: string;
    quantity: number;
    name?: string;
    price?: number;
    image?: string;
  }>;
};

export type Review = {
  id: string;
  customerName: string;
  customerId?: string;
  rating: number;
  context: "Compra" | "Reparo" | "Atendimento";
  itemName: string;
  comment: string;
  images: string[];
  status: "Publicado" | "Pendente";
  createdAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: "Percentual" | "Valor fixo";
  value: number;
  minSubtotal: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount: number;
  public: boolean;
  createdAt: string;
};
