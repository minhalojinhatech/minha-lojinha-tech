import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CircleDollarSign, Handshake, Home, Menu, Search, ShoppingBag, ShoppingCart, UserPlus, UserRound, Wrench, X, type LucideIcon } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import { getCustomerProfile } from "@/lib/auth";

const categories = [
  { label: "Apple", href: "/catalogo?marca=Apple" },
  { label: "Samsung", href: "/catalogo?marca=Samsung" },
  { label: "Xiaomi", href: "/catalogo?marca=Xiaomi" },
  { label: "Motorola", href: "/catalogo?marca=Motorola" }
];

export function Header() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const { totalItems } = useCart();
  const [search, setSearch] = useState("");
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileName, setProfileName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const mobileMenuTimer = useRef<number | null>(null);
  const searchFromUrlRef = useRef(true);
  const firstName = (profileName || user?.displayName || "").trim().split(/\s+/)[0] || "";
  const accountLabel = user ? firstName || "Minha conta" : "Entrar";
  const accountHref = user ? "/conta" : "/login";
  const accountPhoto = profilePhotoURL || user?.photoURL || "";

  useEffect(() => {
    searchFromUrlRef.current = true;
    setSearch(typeof router.query.busca === "string" ? router.query.busca : "");
  }, [router.query.busca]);

  useEffect(() => {
    if (!user) {
      setProfilePhotoURL("");
      setProfileName("");
      return;
    }

    let active = true;

    const syncProfilePhoto = () => {
      getCustomerProfile(user.uid)
        .then((profile) => {
          if (active) {
            setProfilePhotoURL(profile?.photoURL || user.photoURL || "");
            setProfileName(profile?.fullName || user.displayName || "");
          }
        })
        .catch(() => {
          if (active) {
            setProfilePhotoURL(user.photoURL || "");
            setProfileName(user.displayName || "");
          }
        });
    };

    syncProfilePhoto();
    window.addEventListener("customer-profile-updated", syncProfilePhoto);

    return () => {
      active = false;
      window.removeEventListener("customer-profile-updated", syncProfilePhoto);
    };
  }, [user]);

  useEffect(() => {
    closeMobileMenu();
  }, [router.asPath]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    return () => {
      if (mobileMenuTimer.current) window.clearTimeout(mobileMenuTimer.current);
    };
  }, []);

  const openMobileMenu = () => {
    if (mobileMenuTimer.current) window.clearTimeout(mobileMenuTimer.current);
    setMobileMenuMounted(true);
    window.dispatchEvent(new CustomEvent("mobile-menu-visibility", { detail: { open: true } }));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setMobileMenuOpen(true)));
  };

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    if (mobileMenuTimer.current) window.clearTimeout(mobileMenuTimer.current);
    mobileMenuTimer.current = window.setTimeout(() => {
      setMobileMenuMounted(false);
      window.dispatchEvent(new CustomEvent("mobile-menu-visibility", { detail: { open: false } }));
    }, 280);
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/catalogo?busca=${encodeURIComponent(query)}` : "/catalogo");
  };

  const cartBadge = totalItems > 0 ? (
    <span className="flex min-w-5 items-center justify-center bg-brand-blue px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
      {totalItems}
    </span>
  ) : null;

  return (
    <header className="store-header">
      <div className="container-page store-header__main">
        <div className="store-header__brand-row">
          <Link href="/" className="store-header__brand">
            <span>
              <img src="/logo-loja.png" alt="Minha Lojinha Tech" />
            </span>
            <span className="store-header__brand-name">
              <strong>Minha Lojinha</strong>
              <small>Loja Tech</small>
            </span>
          </Link>

          <div className="store-header__mobile-actions">
            <Link className="store-header__icon-button is-dark" href="/carrinho" aria-label="Carrinho">
              <ShoppingCart size={18} />
              {totalItems > 0 ? <span>{totalItems}</span> : null}
            </Link>
            <button
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Abrir menu"
              className="store-header__icon-button"
              onClick={openMobileMenu}
              type="button"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="store-header__search">
          <Search size={18} />
            <input
              value={search}
              onChange={(event) => {
                searchFromUrlRef.current = false;
                setSearch(event.target.value);
              }}
              placeholder="O que você procura?"
              aria-label="Buscar produtos"
            />
          <button type="submit">Buscar</button>
        </form>

        <nav className="store-header__actions">
          <Link href={accountHref}>
            {accountPhoto ? (
              <img src={accountPhoto} alt="" />
            ) : (
              <UserRound size={18} />
            )}
            <span><small>{loading ? "Aguarde" : user ? "Bem-vindo" : "Olá, entre"}</small><strong>{loading ? "..." : accountLabel}</strong></span>
          </Link>
          <Link href="/carrinho" className="store-header__cart">
            <ShoppingBag size={19} />
            <span><small>Minha cesta</small><strong>Carrinho</strong></span>
            {cartBadge}
          </Link>
        </nav>
      </div>

      <div className="store-header__categories">
        <nav className="container-page">
          <Link className="store-header__catalog-link" href="/catalogo"><Menu size={17} /> Comprar smartphones</Link>
          <Link href="/procurando-smartphone">Modelos procurados</Link>
          {categories.map((category) => (
            <Link key={category.label} href={category.href}>
              {category.label}
            </Link>
          ))}
          <button className="store-header__sell-link" onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
            <CircleDollarSign size={16} /> Vender celular
          </button>
          <Link className="store-header__service-link" href="/assistencia"><Wrench size={16} /> Reparar celular</Link>
        </nav>
      </div>

      {mobileMenuMounted ? (
        <div
          id="mobile-menu"
          className={`fixed inset-0 z-[80] bg-white text-ink transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none lg:hidden ${mobileMenuOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
          role="dialog"
          aria-hidden={!mobileMenuOpen}
          aria-modal="true"
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-line bg-ink text-white">
              <div className="container-page flex h-16 items-center justify-between gap-3">
                <Link href="/" className="flex items-center gap-3 leading-none">
                  <span className="flex size-10 items-center justify-center rounded-sm bg-white p-1.5">
                    <img className="max-h-full max-w-full object-contain" src="/logo-loja.png" alt="Minha Lojinha Tech" />
                  </span>
                  <span className="font-semibold">Minha Lojinha Tech</span>
                </Link>
                <button aria-label="Fechar menu" className="grid size-10 place-items-center rounded-sm border border-white/15 text-white" onClick={closeMobileMenu} type="button">
                  <X size={21} />
                </button>
              </div>
            </div>

            <div className="container-page flex-1 overflow-y-auto py-5">
              <div className="grid gap-3">
                <MobileMenuLink href="/" icon={Home} label="Início" />
                <MobileMenuLink href="/catalogo" icon={Menu} label="Ver catálogo" />
                <MobileMenuLink href="/procurando-smartphone" icon={Search} label="Procurando um smartphone?" />
                <button className="flex items-center gap-3 rounded-sm border border-line bg-white px-4 py-4 text-left text-base font-semibold shadow-[0_8px_24px_rgba(17,24,39,0.025)]" onClick={() => {
                  closeMobileMenu();
                  window.setTimeout(() => window.dispatchEvent(new Event("open-store-bot")), 300);
                }} type="button">
                  <span className="grid size-9 place-items-center bg-mist text-ink"><CircleDollarSign size={19} /></span>
                  Vender meu celular
                </button>
                <MobileMenuLink href="/assistencia" icon={Wrench} label="Assistência técnica" />
                <MobileMenuLink href="/parceiros" icon={Handshake} label="Parceiros" />
                <MobileMenuLink href="/faca-parte-da-equipe" icon={UserPlus} label="Faça parte da loja" />
                <MobileMenuLink href={accountHref} icon={UserRound} label={loading ? "Conta" : accountLabel} />
                <MobileMenuLink href="/pedidos" icon={ShoppingCart} label="Meus pedidos" />
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase text-gray-500">Comprar por marca</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Link key={category.label} className="rounded-sm border border-line bg-gray-50 px-3 py-3 text-sm font-semibold hover:border-ink" href={category.href}>
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>

            </div>

            <div className="border-t border-line bg-white p-4">
              <Link className="flex h-12 items-center justify-center gap-2 rounded-sm bg-ink font-semibold text-white" href="/carrinho">
                <ShoppingCart size={18} />
                Carrinho
                {cartBadge}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileMenuLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link className="flex items-center gap-3 rounded-sm border border-line bg-white px-4 py-4 text-base font-semibold shadow-[0_8px_24px_rgba(17,24,39,0.025)]" href={href}>
      <span className="grid size-9 place-items-center bg-mist text-ink">
        <Icon size={19} />
      </span>
      {label}
    </Link>
  );
}
