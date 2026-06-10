import Link from "next/link";
import { ArrowLeft, Home, PackageSearch, Search } from "lucide-react";

type NotFoundPanelProps = {
  eyebrow?: string;
  title?: string;
  text?: string;
  primaryHref?: string;
  primaryLabel?: string;
};

export function NotFoundPanel({
  eyebrow = "Página não encontrada",
  title = "Essa página saiu da vitrine",
  text = "O endereço pode ter mudado, o produto pode ter sido vendido ou o link ficou antigo.",
  primaryHref = "/catalogo",
  primaryLabel = "Ver catálogo"
}: NotFoundPanelProps) {
  return (
    <section className="container-page">
      <div className="grid gap-6 border border-line bg-white p-6 shadow-[0_14px_36px_rgba(17,24,39,0.05)] md:grid-cols-[1fr_320px] md:items-center md:p-8">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-blue">{eyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl leading-7 text-gray-600">{text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite" href={primaryHref}>
              <Search size={17} />
              {primaryLabel}
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-sm border border-line bg-white px-5 py-3 text-sm font-semibold hover:border-ink" href="/">
              <Home size={17} />
              Ir para home
            </Link>
          </div>
        </div>

        <div className="relative min-h-[220px] overflow-hidden border border-line bg-gray-50">
          <div className="absolute left-6 top-6 grid size-16 place-items-center bg-white text-ink shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
            <PackageSearch size={30} />
          </div>
          <div className="absolute right-5 top-10 h-12 w-28 border border-line bg-white" />
          <div className="absolute bottom-6 left-6 right-6 border border-dashed border-gray-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Produto indisponível</p>
            <div className="mt-3 h-3 w-3/4 bg-gray-200" />
            <div className="mt-2 h-3 w-1/2 bg-gray-200" />
          </div>
          <Link className="absolute bottom-6 right-6 grid size-11 place-items-center bg-ink text-white hover:bg-graphite" href={primaryHref} aria-label={primaryLabel}>
            <ArrowLeft className="rotate-180" size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
