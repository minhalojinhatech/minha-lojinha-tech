import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, FileSignature, KeyRound, Plus, ShieldCheck, Smartphone, Wrench } from "lucide-react";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { Breadcrumb, Layout } from "@/components/Layout";
import { CardListSkeleton, MetricSkeletons } from "@/components/LoadingSkeleton";
import { fetchCustomerRepairs, fetchCustomerRepairWarranties } from "@/lib/firestoreData";
import { useAuthUser } from "@/lib/useAuthUser";
import type { Repair, RepairWarranty } from "@/lib/types";

export default function GarantiasReparo() {
  const { user } = useAuthUser();
  const [warranties, setWarranties] = useState<RepairWarranty[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchCustomerRepairWarranties(user.uid), fetchCustomerRepairs(user.uid)])
      .then(([nextWarranties, nextRepairs]) => {
        setWarranties(nextWarranties);
        setRepairs(nextRepairs);
      })
      .catch(() => {
        setWarranties([]);
        setRepairs([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  function openBot(warrantyId = "") {
    window.dispatchEvent(new CustomEvent("open-repair-warranty-bot", { detail: { warrantyId, action: "warranty" } }));
  }

  function openNewRepair(device: string) {
    window.dispatchEvent(new CustomEvent("open-repair-warranty-bot", { detail: { action: "new-repair", device } }));
  }

  const activeCount = warranties.filter((warranty) => getWarrantyState(warranty).active).length;
  const warrantyGroups = useMemo(() => {
    const groups = new Map<string, RepairWarranty[]>();
    warranties.forEach((warranty) => {
      const key = warranty.deviceKey || buildDeviceKey(warranty);
      groups.set(key, [...(groups.get(key) || []), warranty]);
    });
    return [...groups.entries()].map(([key, items]) => ({
      key,
      device: items[0]?.device || "Dispositivo",
      identification: [items[0]?.brand, items[0]?.model, items[0]?.serialNumber && `Série/IMEI ${items[0].serialNumber}`].filter(Boolean).join(" · "),
      warranties: items.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    }));
  }, [warranties]);

  return (
    <Layout title="Reparos e garantias | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Minha conta", href: "/conta" }, { label: "Reparos e garantias" }]} />
      <section className="container-page">
        <CustomerAuthGate message="Entre na conta vinculada ao reparo para consultar ou ativar sua garantia.">
          <div className="border border-line bg-ink p-5 text-white md:p-7">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-white/55">Assistência técnica</p>
                <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Reparos e garantias</h1>
                <p className="mt-3 max-w-2xl leading-7 text-white/70">Acompanhe os dispositivos reparados, assine os termos e consulte a cobertura de cada serviço.</p>
              </div>
              <button className="flex items-center justify-center gap-2 border border-white/20 bg-white px-5 py-3 text-sm font-semibold text-ink" onClick={() => openBot()} type="button">
                <KeyRound size={18} /> Vincular código
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {loading ? <MetricSkeletons count={3} /> : (
              <>
                <Summary label="Reparos registrados" value={String(repairs.length)} />
                <Summary label="Garantias ativas" value={String(activeCount)} />
                <Summary label="Dispositivos cobertos" value={String(warrantyGroups.filter((group) => group.warranties.some((warranty) => getWarrantyState(warranty).active)).length)} />
              </>
            )}
          </div>

          <section className="mt-5 border border-line bg-white p-5 md:p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Wrench size={21} />
              <div>
                <h2 className="text-lg font-semibold">Meus reparos</h2>
                <p className="mt-1 text-sm text-gray-600">O número existe depois que a loja registra o reparo no painel.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {loading ? <CardListSkeleton count={2} /> : repairs.map((repair) => (
                <article key={repair.id} className="grid gap-4 border border-line bg-gray-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{repair.device}</strong>
                      <span className="border border-line bg-white px-2 py-1 text-xs font-semibold">{repair.code}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{[repair.brand, repair.model, repair.serialNumber && `Série/IMEI ${repair.serialNumber}`].filter(Boolean).join(" · ") || repair.issue}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{repair.status}</p>
                  </div>
                  {repair.agreementStatus === "Assinado" ? (
                    <Link className="flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-brand-green" href={`/assinar-termo?tipo=reparo&id=${repair.id}`}>
                      <CheckCircle2 size={16} /> Termo assinado
                    </Link>
                  ) : !repair.servicePerformed ? (
                    <span className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Aguardando a loja preparar o termo</span>
                  ) : (
                    <Link className="flex items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-semibold text-white" href={`/assinar-termo?tipo=reparo&id=${repair.id}`}>
                      <FileSignature size={17} /> Revisar e assinar
                    </Link>
                  )}
                </article>
              ))}
              {!loading && !repairs.length ? <p className="border border-dashed border-line p-4 text-sm text-gray-600">Nenhum reparo foi registrado nesta conta ainda.</p> : null}
            </div>
          </section>

          <div className="mt-5 grid gap-4">
            {loading ? <CardListSkeleton count={2} /> : null}
            {!loading && warrantyGroups.map((group) => {
              return (
                <article key={group.key} className="overflow-hidden border border-line bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
                  <div className="border-b border-line bg-gray-50 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid size-11 place-items-center bg-white text-ink"><Smartphone size={21} /></span>
                      <div>
                        <h2 className="text-xl font-semibold">{group.device}</h2>
                        <p className="mt-1 text-sm text-gray-500">{group.identification || "Histórico do dispositivo"}</p>
                      </div>
                      <button className="ml-auto flex items-center gap-2 border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-ink" onClick={() => openNewRepair(group.device)} type="button">
                        <Plus size={16} /> Outro problema neste aparelho
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5">
                    {group.warranties.map((warranty) => {
                      const state = getWarrantyState(warranty);
                      return (
                        <section key={warranty.id} className="grid gap-4 border border-line p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong>{warranty.repairCode}</strong>
                              <span className={`border px-2 py-1 text-xs font-semibold uppercase ${state.active ? "border-green-200 bg-green-50 text-brand-green" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                                {state.active ? "Ativa" : "Expirada"}
                              </span>
                            </div>
                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                              <Detail icon={<Wrench size={17} />} label="Cobertura deste reparo" value={getCoveredService(warranty)} />
                              {warranty.parts ? <Detail icon={<ShieldCheck size={17} />} label="Peças registradas" value={warranty.parts} /> : null}
                              <Detail icon={<CalendarDays size={17} />} label="Período" value={`${formatDate(warranty.startsAt)} até ${formatDate(warranty.expiresAt)}`} />
                            </dl>
                          </div>
                          <aside className="border border-line bg-gray-50 p-4">
                            <Clock3 size={20} />
                            <p className="mt-3 text-sm text-gray-500">{state.active ? "Tempo restante" : "Situação"}</p>
                            <strong className="mt-1 block text-2xl font-semibold">{state.active ? `${state.daysLeft} dias` : "Prazo encerrado"}</strong>
                            <p className="mt-2 text-xs leading-5 text-gray-500">Só use a garantia se o problema estiver ligado à cobertura descrita ao lado.</p>
                            <button className="mt-4 w-full bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!state.active} onClick={() => openBot(warranty.id)} type="button">
                              Problema no serviço coberto
                            </button>
                          </aside>
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
            {!loading && !warrantyGroups.length ? (
              <div className="border border-dashed border-line bg-white p-6 text-center">
                <ShieldCheck className="mx-auto text-gray-400" size={28} />
                <h2 className="mt-3 font-semibold">Nenhuma garantia vinculada</h2>
                <p className="mt-2 text-sm text-gray-600">Use o código entregue pela assistência para identificar seu reparo e dispositivo.</p>
                <button className="mt-4 bg-ink px-5 py-3 text-sm font-semibold text-white" onClick={() => openBot()} type="button">Vincular código</button>
              </div>
            ) : null}
          </div>
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function getWarrantyState(warranty: RepairWarranty) {
  const difference = new Date(warranty.expiresAt).getTime() - Date.now();
  return { active: difference >= 0, daysLeft: Math.max(0, Math.ceil(difference / 86400000)) };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("pt-BR").format(date);
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border border-line bg-white p-4"><p className="text-sm text-gray-500">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>;
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex gap-3 border border-line bg-gray-50 p-3"><span className="mt-0.5 text-gray-500">{icon}</span><span><dt className="text-gray-500">{label}</dt><dd className="mt-1 font-medium leading-5">{value}</dd></span></div>;
}

function getCoveredService(warranty: RepairWarranty) {
  const service = warranty.servicePerformed.trim();
  const looksLikeSchedule = /(previst|finaliz|amanh|prazo|retorno)/i.test(service);
  if (service && !looksLikeSchedule) return service;
  if (warranty.parts) return `Serviço relacionado a: ${warranty.parts}`;
  if (warranty.diagnosis) return warranty.diagnosis;
  return "Serviço e peça registrados neste reparo.";
}

function buildDeviceKey(warranty: RepairWarranty) {
  const serial = warranty.serialNumber?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (serial) return `serial:${serial}`;
  return `device:${[warranty.brand, warranty.model, warranty.device].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
