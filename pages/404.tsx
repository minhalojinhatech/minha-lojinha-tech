import { Layout } from "@/components/Layout";
import { NotFoundPanel } from "@/components/NotFoundPanel";

export default function Custom404() {
  return (
    <Layout title="Página não encontrada | Minha Lojinha Tech" noindex>
      <NotFoundPanel />
    </Layout>
  );
}
