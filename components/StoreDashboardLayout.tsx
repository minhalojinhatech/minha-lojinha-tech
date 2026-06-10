import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { BarChart3, Boxes, ClipboardList, ExternalLink, Handshake, Home, LogOut, Menu, Package, Search, Settings, TicketPercent, Truck, Users, Wrench, X } from "lucide-react";
import { isStoreOwner, logout } from "@/lib/auth";
import { useAuthUser } from "@/lib/useAuthUser";

const dashboardLinks = [
  { label: "Visão geral", href: "/painel", icon: BarChart3 },
  { label: "Produtos", href: "/painel/produtos", icon: Boxes },
  { label: "Modelos procurados", href: "/painel/interesses", icon: Search },
  { label: "Cupons", href: "/painel/cupons", icon: TicketPercent },
  { label: "Pedidos", href: "/painel/pedidos", icon: Package },
  { label: "Clientes", href: "/painel/clientes", icon: Users },
  { label: "Assistência", href: "/painel/assistencia", icon: Wrench },
  { label: "Solicitações", href: "/painel/solicitacoes", icon: ClipboardList },
  { label: "Colaborações", href: "/painel/colaboracoes", icon: Handshake },
  { label: "Entregas", href: "/painel/entregas", icon: Truck },
  { label: "Configurações", href: "/painel/configuracoes", icon: Settings }
];

const sidebarStorageKey = "store-dashboard-sidebar-expanded";
const useBrowserLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function StoreDashboardLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const allowed = isStoreOwner(user);
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useBrowserLayoutEffect(() => {
    const storedValue = window.localStorage.getItem(sidebarStorageKey);
    setExpanded(storedValue === null ? true : storedValue === "true");
  }, []);

  function updateExpanded(value: boolean) {
    setExpanded(value);
    window.localStorage.setItem(sidebarStorageKey, String(value));
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <InternalShell title={title}>
        <AccessPanel title="Carregando acesso" text="Verificando sua sessão antes de abrir a área interna." />
      </InternalShell>
    );
  }

  if (!user) {
    return (
      <InternalShell title={title}>
        <AccessPanel title="Acesso restrito" text="Entre com a conta autorizada para abrir a área interna da loja.">
          <Link className="mt-5 inline-block rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white" href="/login">
            Ir para login
          </Link>
        </AccessPanel>
      </InternalShell>
    );
  }

  if (!allowed) {
    return (
      <InternalShell title={title}>
        <AccessPanel title="Conta sem permissão" text="Esta área é liberada apenas para a conta responsável pela loja.">
          <button className="mt-5 rounded-sm border border-line px-5 py-3 text-sm font-medium" onClick={() => logout()} type="button">
            Sair da conta atual
          </button>
        </AccessPanel>
      </InternalShell>
    );
  }

  return (
    <InternalShell title={title}>
      <DashboardSidebar expanded={expanded} setExpanded={updateExpanded} userEmail={user.email || ""} pathname={router.pathname} />
      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] bg-ink/50 lg:hidden" role="dialog" aria-modal="true">
          <div className="dashboard-mobile-drawer flex h-full w-[min(340px,calc(100%-36px))] flex-col bg-ink text-white">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <div>
                <p className="text-xs font-medium uppercase text-white/50">Painel</p>
                <p className="font-semibold">Minha Lojinha Tech</p>
              </div>
              <button className="grid size-10 place-items-center border border-white/10" onClick={() => setMobileOpen(false)} type="button" aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>
            <DashboardNav expanded pathname={router.pathname} />
            <div className="mt-auto border-t border-white/10 p-3">
              <Link className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white" href="/">
                <Home size={19} />
                Ver loja
              </Link>
              <button className="w-full px-3 py-3 text-left text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white" onClick={() => logout()} type="button">
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`dashboard-shell min-h-screen transition-[padding] duration-200 ease-out ${expanded ? "lg:pl-64" : "lg:pl-[76px]"}`}>
        <header className="dashboard-header sticky top-0 z-40">
          <div className="dashboard-header__inner">
            <button className="dashboard-icon-button lg:hidden" onClick={() => setMobileOpen(true)} type="button" aria-label="Abrir menu">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="dashboard-header__eyebrow">Operação da loja</p>
              <h2 className="dashboard-header__title">{title}</h2>
              <p className="dashboard-header__description">{description}</p>
            </div>
            <div className="dashboard-header__actions">
              <span className="dashboard-status"><i /> Sistema operacional</span>
              <Link className="dashboard-store-link" href="/">
                Ver loja <ExternalLink size={15} />
              </Link>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-main__inner">
            {children}
          </div>
        </main>
      </div>
    </InternalShell>
  );
}

function DashboardSidebar({ expanded, setExpanded, userEmail, pathname }: { expanded: boolean; setExpanded: (value: boolean) => void; userEmail: string; pathname: string }) {
  return (
    <aside className={`dashboard-sidebar hidden overflow-hidden text-white transition-[width] duration-200 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col ${expanded ? "lg:w-64" : "lg:w-[76px]"}`}>
      <div className="dashboard-sidebar__brand">
        <button className="dashboard-sidebar__logo" onClick={() => setExpanded(!expanded)} type="button" aria-label={expanded ? "Recolher menu" : "Expandir menu"} title={expanded ? "Recolher menu" : "Expandir menu"}>
          <img className="max-h-full max-w-full object-contain" src="/logo-loja.png" alt="" />
        </button>
        <div className={`min-w-0 overflow-hidden pl-3 transition-[width,opacity] duration-200 ease-out ${expanded ? "w-[164px] opacity-100" : "w-0 opacity-0"}`}>
          <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Minha Lojinha Tech</p>
          <h1 className="mt-1 whitespace-nowrap text-sm font-semibold">Central de operação</h1>
        </div>
      </div>
      <DashboardNav expanded={expanded} pathname={pathname} />
      <div className="dashboard-sidebar__footer">
        <div className={`overflow-hidden px-3 transition-[height,opacity,margin] duration-200 ease-out ${expanded ? "mb-3 h-12 py-2 opacity-100" : "mb-0 h-0 py-0 opacity-0"}`}>
            <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/40">Conta responsável</p>
            <p className="mt-1 truncate text-xs text-white/70">{userEmail}</p>
        </div>
        <Link className={`dashboard-sidebar__utility ${expanded ? "w-full gap-3 px-3" : "mx-auto w-11 justify-center gap-0 px-0"}`} href="/" title="Ver loja">
          <Home className="shrink-0" size={18} />
          <span className={`overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 ${expanded ? "w-36 opacity-100" : "w-0 opacity-0"}`}>Ver loja</span>
        </Link>
        <button className={`dashboard-sidebar__utility ${expanded ? "w-full gap-3 px-3" : "mx-auto w-11 justify-center gap-0 px-0"}`} onClick={() => logout()} type="button" title="Sair">
          <LogOut className="shrink-0" size={18} />
          <span className={`overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 ${expanded ? "w-36 opacity-100" : "w-0 opacity-0"}`}>Sair</span>
        </button>
      </div>
    </aside>
  );
}

function DashboardNav({ expanded, pathname }: { expanded: boolean; pathname: string }) {
  return (
    <nav className="dashboard-nav">
      {dashboardLinks.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            className={`dashboard-nav__link ${expanded ? "w-full gap-3 px-3" : "mx-auto w-11 justify-center gap-0 px-0"} ${active ? "is-active" : ""}`}
            href={link.href}
            title={link.label}
          >
            <Icon className="shrink-0" size={18} />
            <span className={`overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 ease-out ${expanded ? "w-40 opacity-100" : "w-0 opacity-0"}`}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function InternalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{`${title} | Painel da loja`}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      {children}
    </>
  );
}

function AccessPanel({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="dashboard-access">
      <section>
        <span className="dashboard-access__logo"><img src="/logo-loja.png" alt="" /></span>
        <p className="dashboard-header__eyebrow">Painel da loja</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
      </section>
    </div>
  );
}

export function DashboardCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="dashboard-card__body">{children}</div>
    </section>
  );
}

export function DashboardMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="dashboard-metric">
      <span className="dashboard-metric__accent" />
      <p>{title}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function DashboardTable({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-table">
      <table>
        {children}
      </table>
    </div>
  );
}
