import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";

type FooterLink = { label: string; href?: string; action?: "storeBot" };

export function Footer() {
  const { user, loading } = useAuthContext();
  const customerLinks: FooterLink[] = [
    ...(user || loading ? [] : [{ label: "Entrar na conta", href: "/login" }]),
    { label: "Minha conta", href: "/conta" },
    { label: "Meus pedidos", href: "/pedidos" }
  ];

  return (
    <footer className="site-footer">
      <div className="container-page site-footer__grid">
        <div className="site-footer__brand">
          <Link href="/">
            <span><img src="/logo-loja.png" alt="Minha Lojinha Tech" /></span>
            <span><strong>Minha Lojinha</strong><small>Loja Tech</small></span>
          </Link>
          <p>Smartphones novos, seminovos e usados com procedência, informação clara e atendimento direto em São Paulo.</p>
          <button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
            <MessageCircle size={17} /> Atendimento pelo site
          </button>
        </div>

        <FooterColumn title="Comprar" links={[
          { label: "Todos os smartphones", href: "/catalogo" },
          { label: "Modelos procurados", href: "/procurando-smartphone" },
          { label: "Apple", href: "/catalogo?marca=Apple" },
          { label: "Samsung", href: "/catalogo?marca=Samsung" },
          { label: "Xiaomi", href: "/catalogo?marca=Xiaomi" },
          { label: "Motorola", href: "/catalogo?marca=Motorola" }
        ]} />
        <FooterColumn title="Atendimento" links={[
          ...customerLinks,
          { label: "Vender meu celular", action: "storeBot" },
          { label: "Assistência técnica", href: "/assistencia" },
          { label: "Contato", href: "/contato" }
        ]} />
        <FooterColumn title="Informações" links={[
          { label: "Sobre a loja", href: "/sobre" },
          { label: "Parceiros", href: "/parceiros" },
          { label: "Faça parte", href: "/faca-parte-da-equipe" },
          { label: "Experiências", href: "/avaliacoes" },
          { label: "Garantia", href: "/garantia" },
          { label: "Trocas e devoluções", href: "/trocas-devolucoes" },
          { label: "Entrega e retirada", href: "/entrega-retirada" },
          { label: "Termos de uso", href: "/termos" },
          { label: "Privacidade", href: "/privacidade" },
          { label: "Baixar aplicativo", href: "/baixar-app" }
        ]} />
      </div>

      <div className="site-footer__bottom">
        <div className="container-page">
          <span>© 2026 Minha Lojinha Tech</span>
          <span>Smartphones selecionados, reparados e vendidos com clareza.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="site-footer__column">
      <h3>{title}</h3>
      <div>
        {links.map((link) => link.action === "storeBot" ? (
          <button key={link.label} onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">{link.label}</button>
        ) : (
          <Link key={link.href} href={link.href || "/"}>{link.label}</Link>
        ))}
      </div>
    </div>
  );
}
