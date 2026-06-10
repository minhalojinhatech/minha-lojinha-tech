import Link from "next/link";
import type { ReactNode } from "react";
import { CircleDollarSign, MessageCircle, PackageCheck, Wrench } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";

export default function Solicitacoes() {
  return (
    <Layout title="Mika | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Minha conta", href: "/conta" }, { label: "Mika" }]} />
      <section className="container-page">
        <div className="grid gap-5 border border-line bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.04)] md:grid-cols-[1fr_320px] md:items-center md:p-6">
          <div>
            <p className="text-sm font-semibold uppercase text-brand-blue">Ferramenta da loja</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">A Mika organiza suas solicitações.</h1>
            <p className="mt-4 max-w-3xl leading-7 text-gray-600">
              Venda seu celular para a loja ou envie pedidos de reparo, assistência, devolução, reembolso e cancelamento por um fluxo guiado.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="flex items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite"
                onClick={() => window.dispatchEvent(new Event("open-store-bot"))}
                type="button"
              >
                <MessageCircle size={18} />
                Conversar com a Mika
              </button>
              <Link className="rounded-sm border border-line px-5 py-3 text-sm font-semibold hover:border-ink" href="/conta">
                Minha conta
              </Link>
            </div>
          </div>

          <aside className="grid gap-3 text-sm">
            <div className="flex justify-center overflow-hidden bg-[#edf3ff] p-3">
              <img className="size-44 rounded-full border-4 border-white object-cover shadow-lg" src="/mika-avatar-atualizada.webp" alt="Ilustração da Mika, assistente virtual da Minha Lojinha Tech" />
            </div>
            <InfoCard icon={<CircleDollarSign size={18} />} title="Venda seu celular" text="Envie modelo, estado e valor para avaliação." />
            <InfoCard icon={<Wrench size={18} />} title="Assistência" text="Triagem de aparelho e reparos simples." />
            <InfoCard icon={<PackageCheck size={18} />} title="Pedido" text="Reparo, devolução, reembolso e cancelamento." />
          </aside>
        </div>
      </section>
    </Layout>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 border border-line bg-gray-50 p-4">
      <span className="grid size-10 shrink-0 place-items-center bg-white text-ink">{icon}</span>
      <span>
        <strong className="block">{title}</strong>
        <span className="mt-1 block leading-6 text-gray-600">{text}</span>
      </span>
    </div>
  );
}
