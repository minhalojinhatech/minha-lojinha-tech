import Link from "next/link";
import { useRouter } from "next/router";
import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useCart } from "@/components/cart/CartProvider";
import { whatsappProductUrl } from "@/lib/format";

const isMockUserLoggedIn = false;

const nav = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?categoria=iPhones", label: "iPhones" },
  { href: "/catalogo?categoria=Androids", label: "Androids" },
  { href: "/catalogo?categoria=Notebooks", label: "Notebooks" },
  { href: "/catalogo?categoria=Acessorios", label: "Acessorios" },
  { href: "/assistencia", label: "Assistencia" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-white/96 shadow-[0_8px_24px_rgba(17,24,39,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink p-1.5 shadow-soft">
                <img className="max-h-full max-w-full object-contain" src="/logo-loja.png" alt="Minha Lojinha Tech" />
              </span>
              <span className="hidden leading-tight sm:block">
                <strong className="block text-base font-black tracking-tight">Minha Lojinha Tech</strong>
                <span className="text-[11px] font-black uppercase text-brand-blue">Loja Tech</span>
              </span>
            </Link>

            <form className="hidden h-10 max-w-xl flex-1 overflow-hidden rounded-md border border-line bg-mist lg:flex">
              <input
                className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
                placeholder="Buscar celular, notebook, acessorio..."
                aria-label="Buscar produtos"
              />
              <Link href="/catalogo" className="grid w-11 place-items-center bg-brand-blue text-white">
                <Search size={18} />
              </Link>
            </form>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={isMockUserLoggedIn ? "/minha-conta" : "/login"}
                aria-label={isMockUserLoggedIn ? "Minha conta" : "Entrar"}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink transition hover:border-brand-blue"
              >
                <UserRound size={18} />
                {isMockUserLoggedIn ? "Conta" : "Entrar"}
              </Link>
              <Link
                href="/carrinho"
                aria-label="Carrinho"
                className="focus-ring relative inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white transition hover:bg-graphite"
              >
                <ShoppingBag size={18} />
                Carrinho
                {count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-xs font-black text-ink">
                    {count}
                  </span>
                )}
              </Link>
            </div>

            <button
              type="button"
              className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-line bg-white lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setOpen((value) => !value)}
            >
              <Menu size={20} />
            </button>
          </div>

          <form className="flex h-10 overflow-hidden rounded-md border border-line bg-mist lg:hidden">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
              placeholder="Buscar produtos..."
              aria-label="Buscar produtos"
            />
            <Link href="/catalogo" className="grid w-11 place-items-center bg-brand-blue text-white">
              <Search size={18} />
            </Link>
          </form>

          <nav className="hidden h-10 items-center gap-1 border-t border-line lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm font-bold transition",
                  router.asPath === item.href || router.pathname === item.href
                    ? "bg-ink text-white"
                    : "text-graphite hover:bg-mist hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {open && (
          <div className="border-t border-line bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-graphite hover:bg-mist"
                >
                  {item.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href={isMockUserLoggedIn ? "/minha-conta" : "/login"} className="rounded-2xl bg-mist px-4 py-3 text-center text-sm font-bold">
                  {isMockUserLoggedIn ? "Conta" : "Entrar"}
                </Link>
                <Link href="/carrinho" className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-bold text-white">
                  Carrinho {count > 0 ? `(${count})` : ""}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-line bg-ink text-white">
        <div className="border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 text-sm font-bold sm:px-6 md:grid-cols-3 lg:px-8">
            <span className="rounded-lg bg-white/10 px-4 py-3">Condicao do produto sem enrolacao</span>
            <span className="rounded-lg bg-white/10 px-4 py-3">Garantia informada antes da compra</span>
            <span className="rounded-lg bg-white/10 px-4 py-3">Pedido, carrinho e checkout preparados</span>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-2">
                <img className="max-h-full max-w-full object-contain" src="/logo-loja.png" alt="Minha Lojinha Tech" />
              </span>
              <span className="text-lg font-black">Minha Lojinha Tech</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
              Loja online de tecnologia com celulares, notebooks, PCs e acessorios no centro da experiencia.
            </p>
          </div>
          <div>
            <p className="font-bold">Loja</p>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/pedidos">Meus pedidos</Link>
              <Link href="/assistencia">Assistência técnica</Link>
            </div>
          </div>
          <div>
            <p className="font-bold">Atendimento</p>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              <a href={whatsappProductUrl()} target="_blank" rel="noreferrer">WhatsApp da loja</a>
              <Link href="/contato">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
