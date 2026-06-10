import { FormEvent, useEffect, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Plus, TicketPercent } from "lucide-react";
import { MetricSkeletons, TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { DashboardCard, DashboardMetric, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { fetchCoupons, normalizeCouponCode } from "@/lib/firestoreData";
import { collections, db } from "@/lib/firebase";
import { formatCurrency } from "@/lib/format";
import type { Coupon } from "@/lib/types";

type CouponForm = {
  code: string;
  title: string;
  description: string;
  type: Coupon["type"];
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
  active: boolean;
  public: boolean;
};

const initialForm: CouponForm = {
  code: "",
  title: "",
  description: "",
  type: "Percentual",
  value: "",
  minSubtotal: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perUserLimit: "",
  active: true,
  public: true
};

export default function PainelCupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(initialForm);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCoupons = () => fetchCoupons()
    .then(setCoupons)
    .catch(() => setCoupons([]))
    .finally(() => setLoading(false));

  useEffect(() => {
    loadCoupons();
  }, []);

  function startCreate() {
    setEditingCoupon(null);
    setForm(initialForm);
    setMessage("");
    setShowForm(true);
  }

  function startEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      type: coupon.type,
      value: String(coupon.value || ""),
      minSubtotal: String(coupon.minSubtotal || ""),
      startsAt: coupon.startsAt || "",
      endsAt: coupon.endsAt || "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : "",
      active: coupon.active,
      public: coupon.public
    });
    setMessage("");
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeCouponCode(form.code);

    if (!code) {
      setMessage("Informe um código válido.");
      return;
    }

    const couponId = editingCoupon?.id || code.toLowerCase();
    const value = Number(form.value || 0);

    if (value <= 0) {
      setMessage("O desconto precisa ser maior que zero.");
      return;
    }

    if (form.type === "Percentual" && value > 100) {
      setMessage("O desconto percentual não pode passar de 100%.");
      return;
    }

    if (!form.startsAt) {
      setMessage("Informe a data de início do cupom.");
      return;
    }

    if (form.endsAt && form.endsAt < form.startsAt) {
      setMessage("A data final não pode ser anterior ao início.");
      return;
    }

    await setDoc(doc(db, collections.coupons, couponId), {
      code,
      title: form.title.trim() || `Cupom ${code}`,
      description: form.description.trim(),
      type: form.type,
      value,
      minSubtotal: Number(form.minSubtotal || 0),
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : 0,
      usedCount: editingCoupon?.usedCount || 0,
      active: form.active,
      public: form.public,
      updatedAt: serverTimestamp(),
      createdAt: editingCoupon?.createdAt || serverTimestamp()
    }, { merge: true });

    setMessage("Cupom salvo.");
    setShowForm(false);
    setForm(initialForm);
    setEditingCoupon(null);
    loadCoupons();
  }

  async function removeCoupon(coupon: Coupon) {
    if (!window.confirm(`Remover o cupom ${coupon.code}?`)) return;
    await deleteDoc(doc(db, collections.coupons, coupon.id));
    loadCoupons();
  }

  const activeCoupons = coupons.filter((coupon) => coupon.active);
  const publicCoupons = coupons.filter((coupon) => coupon.public && coupon.active);

  return (
    <StoreDashboardLayout title="Cupons" description="Promoções, descontos e campanhas da loja.">
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? <MetricSkeletons count={3} /> : (
          <>
            <DashboardMetric title="Cupons ativos" value={String(activeCoupons.length)} detail="Liberados para uso" />
            <DashboardMetric title="Divulgados" value={String(publicCoupons.length)} detail="Aparecem no site" />
            <DashboardMetric title="Usos registrados" value={String(coupons.reduce((total, coupon) => total + coupon.usedCount, 0))} detail="Pedidos com cupom" />
          </>
        )}
      </div>

      <div className="mt-5">
        <DashboardCard title="Promoções">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-start gap-3 text-sm leading-6 text-gray-600">
            <span className="grid size-10 shrink-0 place-items-center bg-mist text-ink">
              <TicketPercent size={20} />
            </span>
            <p>Crie cupons públicos para aparecerem no site ou privados para enviar direto no WhatsApp.</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-3 text-sm font-semibold text-white" onClick={startCreate} type="button">
            <Plus size={17} />
            Novo cupom
          </button>
        </div>

        {message ? <p className="mb-4 border border-line bg-gray-50 px-4 py-3 text-sm font-medium">{message}</p> : null}

        {showForm ? (
          <form className="mb-5 grid gap-4 border border-line bg-gray-50 p-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Código
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal uppercase" onChange={(event) => setForm((current) => ({ ...current, code: normalizeCouponCode(event.target.value) }))} placeholder="PRIMEIRACOMPRA" required value={form.code} />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Nome interno
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Primeira compra com desconto" value={form.title} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Descrição curta
              <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Use no checkout para ganhar desconto." value={form.description} />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Tipo
                <select className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as Coupon["type"] }))} value={form.type}>
                  <option>Percentual</option>
                  <option>Valor fixo</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Desconto
                <span className="flex overflow-hidden rounded-sm border border-line bg-white focus-within:border-ink">
                  <span className="grid min-w-12 place-items-center border-r border-line bg-gray-50 text-sm font-semibold text-gray-600">{form.type === "Percentual" ? "%" : "R$"}</span>
                  <input className="min-w-0 flex-1 px-3 py-3 font-normal outline-none" max={form.type === "Percentual" ? "100" : undefined} min="0" onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder={form.type === "Percentual" ? "10" : "50,00"} required step={form.type === "Percentual" ? "1" : "0.01"} type="number" value={form.value} />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Compra mínima
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" min="0" onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))} placeholder="0" type="number" value={form.minSubtotal} />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-2 text-sm font-medium">
                Início obrigatório
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} required type="date" value={form.startsAt} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Fim
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} type="date" value={form.endsAt} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Limite total de usos
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" min="0" onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Sem limite" type="number" value={form.usageLimit} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Limite por cliente
                <input className="rounded-sm border border-line bg-white px-3 py-3 font-normal" min="0" onChange={(event) => setForm((current) => ({ ...current, perUserLimit: event.target.value }))} placeholder="Sem limite" type="number" value={form.perUserLimit} />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input checked={form.active} className="size-4 accent-ink" onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />
                Cupom ativo
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input checked={form.public} className="size-4 accent-ink" onChange={(event) => setForm((current) => ({ ...current, public: event.target.checked }))} type="checkbox" />
                Mostrar no site
              </label>
            </div>
            <div className="flex gap-3">
              <button className="rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white" type="submit">Salvar cupom</button>
              <button className="rounded-sm border border-line bg-white px-5 py-3 text-sm font-semibold" onClick={() => setShowForm(false)} type="button">Cancelar</button>
            </div>
          </form>
        ) : null}

        <DashboardTable>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cupom</th>
              <th className="px-4 py-3 font-medium">Desconto</th>
              <th className="px-4 py-3 font-medium">Condição</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <TableRowsSkeleton columns={5} rows={4} /> : coupons.map((coupon) => (
              <tr key={coupon.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-semibold">{coupon.code}</p>
                  <p className="mt-1 text-xs text-gray-500">{coupon.title}</p>
                </td>
                <td className="px-4 py-3">{coupon.type === "Percentual" ? `${coupon.value}%` : formatCurrency(coupon.value)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <p>Min. {formatCurrency(coupon.minSubtotal)}</p>
                  <p className="mt-1">{coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit} usos totais` : `${coupon.usedCount} usos · sem limite total`}</p>
                  <p className="mt-1">{coupon.perUserLimit ? `${coupon.perUserLimit} por cliente` : "Sem limite por cliente"}</p>
                  <p className="mt-1">{coupon.startsAt}{coupon.endsAt ? ` até ${coupon.endsAt}` : " · sem data final"}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`border px-2 py-1 text-xs font-medium ${coupon.active ? "border-green-100 bg-green-50 text-brand-green" : "border-line bg-gray-50 text-gray-500"}`}>
                    {coupon.active ? "Ativo" : "Inativo"}
                  </span>
                  {coupon.public ? <span className="ml-2 border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-brand-blue">Site</span> : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="mr-2 rounded-sm border border-line px-3 py-2 text-sm font-medium hover:border-ink" onClick={() => startEdit(coupon)} type="button">Editar</button>
                  <button className="rounded-sm border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:border-red-300" onClick={() => removeCoupon(coupon)} type="button">Remover</button>
                </td>
              </tr>
            ))}
            {!loading && coupons.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>Nenhum cupom criado ainda.</td></tr> : null}
          </tbody>
        </DashboardTable>
        </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}
