import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Breadcrumb, Layout } from "@/components/Layout";

export default function PaymentCancelled() {
  return (
    <Layout title="Pagamento não concluído | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Pagamento" }]} />
      <section className="container-page">
        <div className="mx-auto max-w-2xl border border-line bg-white p-6 text-center shadow-[0_10px_30px_rgba(17,24,39,0.04)] md:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gray-100 text-ink">
            <CreditCard size={30} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold">Pagamento não concluído</h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-600">
            Nenhuma cobrança foi confirmada. O produto permanece reservado por alguns minutos enquanto você decide se quer tentar novamente.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite" href="/checkout">
              <ArrowLeft size={17} />
              Voltar ao checkout
            </Link>
            <Link className="rounded-sm border border-line bg-white px-5 py-3 text-sm font-semibold hover:border-ink" href="/pedidos">
              Ver pedidos
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
