export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function whatsappProductUrl(productName?: string) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511999999999";
  const message = productName
    ? `Olá! Quero saber mais sobre o produto ${productName}.`
    : "Olá! Quero falar com a loja sobre produtos de tecnologia.";

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
