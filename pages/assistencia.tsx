import { BatteryCharging, CheckCircle2, ClipboardCheck, HardDrive, MonitorSmartphone, Sparkles, Wrench } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";

const services = [
  { title: "Diagnóstico", text: "Entender o defeito, o risco e se o reparo realmente vale a pena.", icon: ClipboardCheck },
  { title: "Troca de tela", text: "Avaliação de peça, compatibilidade, imagem e resposta ao toque.", icon: MonitorSmartphone },
  { title: "Bateria", text: "Análise de autonomia, carregamento e necessidade de substituição.", icon: BatteryCharging },
  { title: "Limpeza técnica", text: "Higienização externa e interna quando aplicável ao aparelho.", icon: Sparkles },
  { title: "Sistema e backup", text: "Formatação, organização e orientação de backup quando possível.", icon: HardDrive },
  { title: "Preparação para venda", text: "Avaliação, limpeza e pequenos reparos antes de uma possível recompra.", icon: Wrench }
];

export default function Assistencia() {
  return (
    <Layout title="Assistência técnica | Minha Lojinha Tech" description="Diagnóstico, tela, bateria, limpeza e preparação de smartphones." canonicalPath="/assistencia">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Assistência técnica" }]} />
      <section className="container-page repair-page">
        <header className="repair-hero">
          <div><span className="retail-eyebrow retail-eyebrow--light"><span /> Assistência para smartphones</span><h1>Antes de trocar de aparelho, vale entender se ele ainda tem solução.</h1><p>Diagnóstico claro, reparos viáveis e orientação honesta sobre custo, risco e prazo.</p><button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">Solicitar avaliação</button></div>
          <img src="/Imagem Assistencia Tecnica.png" alt="Assistência técnica da Minha Lojinha Tech" />
        </header>

        <section className="repair-flow">
          <div><span>01</span><strong>Conte o problema</strong><p>Modelo, defeito, quedas, líquido e reparos anteriores.</p></div>
          <div><span>02</span><strong>Receba a triagem</strong><p>A loja avalia viabilidade, peça, risco e estimativa de prazo.</p></div>
          <div><span>03</span><strong>Autorize com clareza</strong><p>O serviço só segue depois de você entender o próximo passo.</p></div>
        </section>

        <section className="repair-services">
          <div className="retail-heading"><div><span className="retail-eyebrow"><span /> O que avaliamos</span><h2>Serviços possíveis</h2><p>A disponibilidade depende do modelo, da peça e do estado do aparelho.</p></div></div>
          <div>{services.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="repair-notes">
          <div><span className="retail-eyebrow retail-eyebrow--light"><span /> Transparência técnica</span><h2>Nem todo reparo deve ser feito.</h2><p>Quando custo, risco ou disponibilidade de peça não fizerem sentido, a orientação será não seguir.</p></div>
          <ul>
            <li><CheckCircle2 size={17} /> Faça backup sempre que o aparelho ainda ligar.</li>
            <li><CheckCircle2 size={17} /> Contato com líquido e abertura anterior mudam a análise.</li>
            <li><CheckCircle2 size={17} /> Reparo de placa e microsolda pode não entrar no atendimento.</li>
            <li><CheckCircle2 size={17} /> Garantia de serviço é vinculada à conta quando aplicável.</li>
          </ul>
        </section>
      </section>
    </Layout>
  );
}
