import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";
import { DemandModelCard } from "@/components/DemandModelCard";
import { DemandSuggestionForm } from "@/components/DemandSuggestionForm";
import { fetchDemandModels } from "@/lib/firestoreData";
import type { DemandModel } from "@/lib/types";

export default function ProcurandoSmartphone() {
  const [models, setModels] = useState<DemandModel[]>([]);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemandModels().then(setModels).catch(() => setModels([])).finally(() => setLoading(false));
  }, []);

  const brands = useMemo(() => [...new Set(models.map((model) => model.brand))].sort(), [models]);
  const visible = useMemo(() => {
    const term = normalize(search);
    return models.filter((model) => (!brand || model.brand === brand) && (!term || normalize(`${model.brand} ${model.name} ${model.summary}`).includes(term)));
  }, [brand, models, search]);

  return (
    <Layout
      title="Procurando um smartphone? | Minha Lojinha Tech"
      description="Demonstre interesse nos smartphones que gostaria que a Minha Lojinha Tech encontrasse e ajude a orientar as próximas oportunidades."
      canonicalPath="/procurando-smartphone"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Procurando um smartphone?" }]} />
      <section className="container-page demand-page">
        <header className="demand-hero">
          <span className="retail-eyebrow retail-eyebrow--light"><span /> Demanda da comunidade</span>
          <h1>Qual smartphone você gostaria de encontrar por aqui?</h1>
          <p>Os aparelhos desta página não estão em estoque. Eles mostram o que os clientes procuram e ajudam a loja a buscar boas oportunidades com mais direção.</p>
        </header>

        <div className="demand-toolbar">
          <label><Search size={18} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar marca ou modelo" value={search} /></label>
          <label><SlidersHorizontal size={17} /><select onChange={(event) => setBrand(event.target.value)} value={brand}><option value="">Todas as marcas</option>{brands.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        {loading ? <p className="demand-loading">Carregando modelos procurados...</p> : visible.length ? (
          <div className="demand-grid">
            {visible.map((model) => (
              <DemandModelCard
                key={model.id}
                model={model}
                onInterest={() => setModels((current) => current.map((item) => item.id === model.id ? { ...item, interestCount: item.interestCount + 1 } : item))}
              />
            ))}
          </div>
        ) : (
          <div className="demand-empty"><div><strong>Nenhum modelo encontrado.</strong><p>Você pode sugerir o aparelho desejado logo abaixo.</p></div></div>
        )}

        <section id="sugerir" className="demand-suggestion-section">
          <DemandSuggestionForm />
        </section>
      </section>
    </Layout>
  );
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
