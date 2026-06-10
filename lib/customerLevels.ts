import type { Order, Review } from "@/lib/types";

export type CustomerLevelKey = "bronze" | "prata" | "ouro" | "diamante";

export type CustomerLevel = {
  key: CustomerLevelKey;
  name: string;
  persona: string;
  minPoints: number;
  colorClass: string;
  barClass: string;
  badgeClass: string;
};

export type CustomerLevelProgress = {
  points: number;
  currentLevel: CustomerLevel;
  nextLevel?: CustomerLevel;
  nextLevelPoints: number;
  progressPercent: number;
  unlockedGoals: CustomerLevelGoal[];
  pendingGoals: CustomerLevelGoal[];
};

export type CustomerLevelGoal = {
  id: string;
  label: string;
  points: number;
  done: boolean;
};

export const customerLevels: CustomerLevel[] = [
  {
    key: "bronze",
    name: "Bronze",
    persona: "Começando por aqui",
    minPoints: 0,
    colorClass: "from-stone-600 via-amber-700 to-orange-500",
    barClass: "bg-amber-700",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800"
  },
  {
    key: "prata",
    name: "Prata",
    persona: "Cliente frequente",
    minPoints: 60,
    colorClass: "from-gray-500 via-slate-400 to-zinc-200",
    barClass: "bg-slate-500",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700"
  },
  {
    key: "ouro",
    name: "Ouro",
    persona: "Cliente da casa",
    minPoints: 140,
    colorClass: "from-yellow-600 via-amber-400 to-yellow-200",
    barClass: "bg-amber-500",
    badgeClass: "border-yellow-200 bg-yellow-50 text-yellow-800"
  },
  {
    key: "diamante",
    name: "Diamante",
    persona: "Cliente especial",
    minPoints: 230,
    colorClass: "from-cyan-600 via-sky-400 to-indigo-300",
    barClass: "bg-sky-500",
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-800"
  }
];

export function calculateCustomerLevel({
  orders,
  reviews,
  hasCompleteProfile,
  hasProfilePhoto
}: {
  orders: Order[];
  reviews: Review[];
  hasCompleteProfile: boolean;
  hasProfilePhoto: boolean;
}): CustomerLevelProgress {
  const activeOrders = orders.filter((order) => order.status !== "Cancelado");
  const deliveredOrders = orders.filter((order) => order.status === "Entregue");
  const reviewCount = reviews.length;

  const goals: CustomerLevelGoal[] = [
    {
      id: "profile",
      label: "Completar nome e telefone",
      points: 25,
      done: hasCompleteProfile
    },
    {
      id: "photo",
      label: "Colocar foto no perfil",
      points: 15,
      done: hasProfilePhoto
    },
    {
      id: "first-review",
      label: "Enviar a primeira experiência",
      points: 25,
      done: reviewCount >= 1
    },
    {
      id: "regular-review",
      label: "Compartilhar 3 experiências",
      points: 50,
      done: reviewCount >= 3
    },
    {
      id: "first-order",
      label: "Ter o primeiro pedido registrado",
      points: 30,
      done: activeOrders.length >= 1
    },
    {
      id: "regular-order",
      label: "Ter 3 pedidos ao longo do tempo",
      points: 60,
      done: activeOrders.length >= 3
    },
    {
      id: "delivered-order",
      label: "Receber ou retirar 2 pedidos",
      points: 25,
      done: deliveredOrders.length >= 2
    }
  ];

  const points = goals.reduce((total, goal) => total + (goal.done ? goal.points : 0), 0);
  const currentLevel = [...customerLevels].reverse().find((level) => points >= level.minPoints) || customerLevels[0];
  const nextLevel = customerLevels.find((level) => level.minPoints > points);
  const previousPoints = currentLevel.minPoints;
  const nextLevelPoints = nextLevel?.minPoints || currentLevel.minPoints;
  const progressPercent = nextLevel
    ? Math.min(100, Math.max(0, ((points - previousPoints) / (nextLevel.minPoints - previousPoints)) * 100))
    : 100;

  return {
    points,
    currentLevel,
    nextLevel,
    nextLevelPoints,
    progressPercent,
    unlockedGoals: goals.filter((goal) => goal.done),
    pendingGoals: goals.filter((goal) => !goal.done)
  };
}
