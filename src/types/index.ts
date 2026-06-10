export type ProductCondition = "Novo" | "Seminovo" | "Usado";
export type ProductAvailability = "Disponivel" | "Reservado" | "Vendido";
export type ProductCategory =
  | "iPhones"
  | "Androids"
  | "MacBooks"
  | "Notebooks"
  | "PCs"
  | "Acessorios"
  | "Promocoes";

export type OrderStatus =
  | "Pedido recebido"
  | "Pagamento aprovado"
  | "Separando produto"
  | "Em preparacao"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

export type Product = {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: ProductCategory;
  condition: ProductCondition;
  conservation: string;
  price: number;
  oldPrice?: number;
  images: string[];
  description: string;
  specs: string[];
  warranty: string;
  availability: ProductAvailability;
  storage?: string;
  color?: string;
  batteryHealth?: string;
  includedAccessories: string[];
  revised: boolean;
  notes: string[];
  featured?: boolean;
  badge?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Order = {
  id: string;
  date: string;
  total: number;
  status: OrderStatus;
  items: CartItem[];
};
