import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { DemandInterestButton } from "@/components/DemandInterestButton";
import type { DemandModel } from "@/lib/types";
import { appHref } from "@/lib/runtime";

export function DemandModelCard({ model, onInterest }: { model: DemandModel; onInterest?: () => void }) {
  return (
    <article className="demand-card">
      <Link className="demand-card__media" href={appHref(`/procurando-smartphone/${model.id}`)}>
        <img src={model.image || "/logo-loja.png"} alt={model.name} />
        <span>Modelo procurado</span>
      </Link>
      <div className="demand-card__body">
        <p>{model.brand}</p>
        <h3><Link href={appHref(`/procurando-smartphone/${model.id}`)}>{model.name}</Link></h3>
        <div className="demand-card__interest"><Users size={16} /> {model.interestCount} {model.interestCount === 1 ? "pessoa interessada" : "pessoas interessadas"}</div>
        <DemandInterestButton
          className="demand-card__button"
          modelId={model.id}
          modelName={model.name}
          onRegistered={(created) => { if (created) onInterest?.(); }}
        />
        <Link className="demand-card__details" href={appHref(`/procurando-smartphone/${model.id}`)}>Conhecer o modelo <ArrowRight size={15} /></Link>
      </div>
    </article>
  );
}
