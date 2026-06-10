import type { ReactNode } from "react";
import { Breadcrumb, Layout } from "@/components/Layout";

type PolicyPageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PolicyPage({ title, description, children }: PolicyPageProps) {
  return (
    <Layout title={`${title} | Minha Lojinha Tech`} description={description}>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: title }]} />
      <section className="container-page policy-page">
        <article>
          <header>
            <span className="retail-eyebrow"><span /> Informações da loja</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          <div>{children}</div>
        </article>
      </section>
    </Layout>
  );
}

export function PolicyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="policy-page__block">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
