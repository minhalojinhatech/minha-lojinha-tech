import Link from "next/link";
import { ArrowRight, TicketPercent } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Coupon } from "@/lib/types";

type PromotionSpotlightProps = {
  coupon: Coupon;
  compact?: boolean;
  actionHref?: string;
  actionLabel?: string;
  onApply?: () => void;
};

export function PromotionSpotlight({
  coupon,
  compact = false,
  actionHref = `/carrinho?cupom=${encodeURIComponent(coupon.code)}`,
  actionLabel = "Usar no carrinho",
  onApply
}: PromotionSpotlightProps) {
  const discount = coupon.type === "Percentual" ? `${coupon.value}% OFF` : `${formatCurrency(coupon.value)} OFF`;
  const conditions = promotionConditions(coupon);

  if (compact) {
    return (
      <aside className="promotion-compact">
        <span className="promotion-compact__icon">
          <TicketPercent size={24} />
        </span>
        <div className="promotion-compact__content">
          <p className="text-xs font-semibold uppercase text-[#246b55]">Campanha ativa</p>
          <p className="mt-1 font-semibold text-ink">{discount} com o cupom <span className="font-mono">{coupon.code}</span></p>
          <p className="mt-1 text-sm text-gray-600">{coupon.description || conditions}</p>
        </div>
        {onApply ? (
          <button className="promotion-compact__action" onClick={onApply} type="button">
            {actionLabel}
            <ArrowRight size={16} />
          </button>
        ) : (
          <Link className="promotion-compact__action" href={actionHref}>
            {actionLabel}
            <ArrowRight size={16} />
          </Link>
        )}
      </aside>
    );
  }

  return (
    <section className="promotion-spotlight overflow-hidden border border-[#cfd9d3] bg-white shadow-[0_14px_36px_rgba(17,24,39,0.055)]">
      <div className="grid md:grid-cols-[210px_1fr_auto] md:items-stretch">
        <div className="grid content-center bg-[#173d32] px-5 py-6 text-white md:px-6">
          <span className="flex size-10 items-center justify-center border border-white/20 bg-white/10">
            <TicketPercent size={21} />
          </span>
          <strong className="mt-5 text-3xl font-semibold leading-none">{discount}</strong>
          <span className="mt-2 text-sm text-white/75">promoção da lojinha</span>
        </div>

        <div className="grid content-center px-5 py-6 md:px-7">
          <p className="text-xs font-semibold uppercase text-[#246b55]">Tem mimo ativo por aqui</p>
          <h2 className="mt-2 text-xl font-semibold md:text-2xl">{coupon.title || `Use o cupom ${coupon.code}`}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {coupon.description || "Aplique o código no carrinho e aproveite a condição especial desta campanha."}
          </p>
          <p className="mt-3 text-xs font-medium text-gray-500">{conditions}</p>
        </div>

        <div className="grid content-center border-t border-dashed border-[#cfd9d3] bg-[#f2f7f3] p-5 md:min-w-[220px] md:border-l md:border-t-0">
          <span className="text-xs font-semibold uppercase text-gray-500">Seu código</span>
          <strong className="mt-2 border border-dashed border-[#88a99b] bg-white px-4 py-3 text-center font-mono text-lg tracking-normal text-[#173d32]">
            {coupon.code}
          </strong>
          <Link className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-ink px-4 text-sm font-semibold text-white hover:bg-graphite" href={actionHref}>
            {actionLabel}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function promotionConditions(coupon: Coupon) {
  const conditions = [];
  if (coupon.minSubtotal > 0) conditions.push(`Compras a partir de ${formatCurrency(coupon.minSubtotal)}`);
  if (coupon.perUserLimit) conditions.push(`${coupon.perUserLimit} uso${coupon.perUserLimit === 1 ? "" : "s"} por cliente`);
  if (coupon.endsAt) conditions.push(`Válido até ${formatDate(coupon.endsAt)}`);
  return conditions.length ? conditions.join(" · ") : "Enquanto a campanha estiver ativa.";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}
