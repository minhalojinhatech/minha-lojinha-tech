import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { BatteryCharging, Check, Cpu, HardDrive, Images, MemoryStick, MonitorSmartphone, SearchCheck, ShieldCheck, Smartphone } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";
import { DemandInterestButton } from "@/components/DemandInterestButton";
import { fetchDemandModel } from "@/lib/firestoreData";
import type { DemandModel } from "@/lib/types";
import { isDesktopBuild } from "@/lib/runtime";

export default function DemandModelDetail() {
  const router = useRouter();
  const [model, setModel] = useState<DemandModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const modelId = isDesktopBuild && typeof router.query.item === "string" ? router.query.item : router.query.id;
    if (typeof modelId !== "string") return;
    fetchDemandModel(modelId).then(setModel).catch(() => setModel(null)).finally(() => setLoading(false));
  }, [router.query.id, router.query.item]);

  if (loading) return <Layout title="Carregando modelo | Minha Lojinha Tech"><div className="container-page py-20">Carregando informações...</div></Layout>;
  if (!model || !model.active) return <Layout title="Modelo não encontrado | Minha Lojinha Tech" noindex><div className="container-page py-20"><h1 className="text-3xl font-semibold">Modelo não encontrado.</h1></div></Layout>;

  const specs = [
    { icon: MonitorSmartphone, label: "Tela", value: model.screen },
    { icon: Cpu, label: "Processador", value: model.processor },
    { icon: MemoryStick, label: "Memória", value: model.memory },
    { icon: HardDrive, label: "Armazenamento", value: model.storage },
    { icon: BatteryCharging, label: "Bateria", value: model.battery },
    { icon: Smartphone, label: "Sistema", value: model.operatingSystem }
  ].filter((item) => item.value);

  return (
    <Layout title={`${model.name} procurado | Minha Lojinha Tech`} description={model.summary} canonicalPath={`/procurando-smartphone/${model.id}`} image={model.image}>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Modelos procurados", href: "/procurando-smartphone" }, { label: model.name }]} />
      <article className="container-page demand-detail">
        <section className="demand-detail__hero">
          <div className={`demand-detail__gallery ${model.gallery.length <= 1 ? "is-single" : ""}`}>
            <img src={model.gallery[0] || model.image || "/logo-loja.png"} alt={model.name} />
            {model.gallery.length > 1 ? <div>{model.gallery.slice(1, 4).map((image) => <img key={image} src={image} alt="" />)}</div> : null}
          </div>
          <div className="demand-detail__copy">
            <span>Modelo procurado · não representa estoque</span>
            <p>{model.brand}</p>
            <h1>{model.name}</h1>
            <div className="demand-detail__count">{model.interestCount} {model.interestCount === 1 ? "pessoa demonstrou interesse" : "pessoas demonstraram interesse"}</div>
            <p className="demand-detail__summary">{model.summary}</p>
            <div className="demand-detail__actions">
              <DemandInterestButton modelId={model.id} modelName={model.name} className="is-primary" />
              <DemandInterestButton modelId={model.id} modelName={model.name} intent="updates" className="is-secondary" />
            </div>
          </div>
        </section>

        <section className="demand-detail__specs">
          {specs.map(({ icon: Icon, label, value }) => <div key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></div>)}
        </section>

        <section className="demand-detail__explanation">
          <div><SearchCheck size={28} /><h2>Como este aparelho pode ser encontrado?</h2><p>A loja pode encontrar este modelo novo, seminovo ou usado. A condição final dependerá da oportunidade disponível e nunca será presumida antes da avaliação.</p><div className="demand-condition-list"><span>Novo</span><span>Seminovo</span><span>Usado</span></div></div>
          <div><Images size={28} /><h2>O que acontece após demonstrar interesse?</h2><ol><li>Você demonstra interesse.</li><li>A loja procura oportunidades.</li><li>Ao encontrar uma boa unidade, entra em contato.</li><li>Você recebe fotos reais, estado e valor final.</li><li>Somente então decide se deseja prosseguir.</li></ol></div>
        </section>

        <section className="demand-transparency">
          <ShieldCheck size={34} />
          <div><span>Transparência em primeiro lugar</span><h2>Nenhum aparelho será comprado para você sem aprovação prévia.</h2><p>Toda oportunidade será apresentada antes de qualquer decisão.</p></div>
          <ul>{["Fotos reais","Estado estético","Estado funcional","Saúde da bateria, quando aplicável","Informações relevantes","Valor final"].map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
        </section>
      </article>
    </Layout>
  );
}

export function getStaticPaths() {
  return {
    paths: process.env.TAURI_BUILD === "1" ? [{ params: { id: "desktop" } }] : [],
    fallback: process.env.TAURI_BUILD !== "1"
  };
}

export function getStaticProps() {
  return { props: {} };
}
