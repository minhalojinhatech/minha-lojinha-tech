import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, MessageCircle, RefreshCw, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";

const process = [
  { number: "01", title: "Selecionar", text: "Priorizamos Apple, Samsung, Xiaomi e Motorola com potencial real de uso e revenda.", icon: Smartphone },
  { number: "02", title: "Conferir", text: "Estado, funções, bateria e observações importantes entram na avaliação da unidade.", icon: ClipboardCheck },
  { number: "03", title: "Preparar", text: "Limpeza, organização e reparos viáveis deixam o aparelho pronto para um novo ciclo.", icon: Sparkles },
  { number: "04", title: "Explicar", text: "Fotos e descrição mostram o que você precisa saber antes de decidir.", icon: ShieldCheck }
];

export default function Sobre() {
  return (
    <Layout title="Sobre | Minha Lojinha Tech" description="Conheça a Minha Lojinha Tech, loja especializada em smartphones novos, seminovos e usados." canonicalPath="/sobre">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sobre nós" }]} />
      <section className="container-page about-page">
        <header className="about-hero">
          <div>
            <span className="retail-eyebrow retail-eyebrow--light"><span /> Sobre a Minha Lojinha Tech</span>
            <h1>Dar uma boa segunda vida a smartphones também é fazer tecnologia melhor.</h1>
            <p>A loja nasceu para selecionar, preparar e vender smartphones com uma conversa mais honesta sobre estado, valor e procedência.</p>
            <div><Link href="/catalogo">Ver smartphones <ArrowRight size={17} /></Link><button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">Vender meu aparelho</button></div>
          </div>
          <aside>
            <RefreshCw size={42} />
            <strong>Mais valor por ciclo</strong>
            <p>Um aparelho bem avaliado, limpo e reparado pode continuar útil por muito mais tempo.</p>
          </aside>
        </header>

        <section className="about-story">
          <div><span className="retail-eyebrow"><span /> A ideia</span><h2>Uma loja pequena o bastante para cuidar. Organizada o bastante para crescer.</h2></div>
          <div><p>A Minha Lojinha Tech não quer competir com grandes varejistas em volume. A proposta é outra: trabalhar com unidades escolhidas, conhecer o que está sendo vendido e atender de forma próxima.</p><p>O foco em smartphones torna essa promessa mais forte. É uma categoria com giro rápido, reparos mais viáveis e espaço para entregar valor real na seleção de seminovos.</p></div>
        </section>

        <section className="about-process">
          <div className="retail-heading"><div><span className="retail-eyebrow"><span /> Como trabalhamos</span><h2>Da avaliação à vitrine</h2></div></div>
          <div>{process.map(({ icon: Icon, ...item }) => <article key={item.number}><span>{item.number}</span><Icon size={23} /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </section>

        <section className="about-values">
          <div><CheckCircle2 size={22} /><strong>Transparência antes da venda</strong><p>Observações relevantes não ficam escondidas.</p></div>
          <div><MessageCircle size={22} /><strong>Atendimento direto</strong><p>Você consegue conversar antes e depois da compra.</p></div>
          <div><ShieldCheck size={22} /><strong>Responsabilidade</strong><p>Garantias e limites são explicados com clareza.</p></div>
        </section>
      </section>
    </Layout>
  );
}
