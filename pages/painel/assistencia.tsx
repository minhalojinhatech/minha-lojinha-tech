import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, ChevronDown, ClipboardCopy, FileSignature, LockKeyhole, Plus, Search, ShieldCheck, Wrench, X } from "lucide-react";
import { DashboardCard, DashboardMetric, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { CardListSkeleton, MetricSkeletons } from "@/components/LoadingSkeleton";
import { useAuthUser } from "@/lib/useAuthUser";
import { collections, db } from "@/lib/firebase";
import { fetchCustomers, fetchRepairs, fetchServiceRequests } from "@/lib/firestoreData";
import type { Customer, Repair, RepairStatus } from "@/lib/types";
import { apiFetch } from "@/lib/runtime";

const statuses: RepairStatus[] = ["Solicitado", "Em diagnóstico", "Em reparo", "Pronto para retirada", "Finalizado"];

type AssistanceRequest = Awaited<ReturnType<typeof fetchServiceRequests>>[number];

const emptyDraft = {
  customerId: "",
  sourceRequestId: "",
  device: "",
  brand: "",
  model: "",
  serialNumber: "",
  issue: "",
  diagnosis: "",
  servicePerformed: "",
  parts: "",
  externalDevice: true
};

export default function PainelAssistencia() {
  const { user } = useAuthUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function loadData() {
    const [nextCustomers, nextRequests, nextRepairs] = await Promise.all([
      fetchCustomers(),
      fetchServiceRequests(),
      fetchRepairs()
    ]);
    setCustomers(nextCustomers);
    setRequests(nextRequests.filter((request) => request.type === "Assistência técnica"));
    setRepairs(nextRepairs);
    setLoadingData(false);
  }

  useEffect(() => {
    if (!user) return;
    loadData().catch(() => {
      setMessage("Não foi possível carregar a assistência.");
      setLoadingData(false);
    });
  }, [user]);

  const filteredRepairs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return repairs;
    return repairs.filter((repair) => [
      repair.code,
      repair.customerName,
      repair.customerEmail,
      repair.customerPhone,
      repair.device,
      repair.brand,
      repair.model,
      repair.serialNumber
    ].join(" ").toLowerCase().includes(normalized));
  }, [query, repairs]);

  const selectedCustomer = customers.find((customer) => customer.uid === draft.customerId);

  function chooseRequest(requestId: string) {
    const request = requests.find((item) => item.id === requestId);
    const matchingCustomer = customers.find((customer) =>
      customer.uid === request?.customerId ||
      customer.email.toLowerCase() === request?.customerEmail.toLowerCase() ||
      normalizePhone(customer.phone) === normalizePhone(request?.customerPhone || "")
    );
    const deviceLine = request?.description.split("\n").find((line) => line.toLowerCase().startsWith("aparelho:"));
    setDraft((current) => ({
      ...current,
      sourceRequestId: requestId,
      customerId: matchingCustomer?.uid || "",
      device: deviceLine?.replace(/^aparelho:\s*/i, "") || current.device,
      issue: request?.description.replace(/^aparelho:.*\n?/i, "").trim() || request?.reason || current.issue
    }));
  }

  async function createRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedCustomer) {
      setMessage("Selecione uma conta cadastrada para vincular o reparo.");
      return;
    }
    if (!selectedCustomer.phone.trim()) {
      setMessage("O cliente precisa cadastrar um telefone na conta antes do reparo ser vinculado.");
      return;
    }

    setSaving(true);
    try {
      const repairRef = await addDoc(collection(db, collections.repairs), {
        code: "",
        customerId: selectedCustomer.uid,
        customerName: selectedCustomer.name,
        customerEmail: selectedCustomer.email,
        customerPhone: selectedCustomer.phone,
        sourceRequestId: draft.sourceRequestId,
        device: draft.device.trim(),
        brand: draft.brand.trim(),
        model: draft.model.trim(),
        serialNumber: draft.serialNumber.trim(),
        deviceKey: buildDeviceKey(draft.serialNumber, draft.brand, draft.model, draft.device),
        issue: draft.issue.trim(),
        diagnosis: draft.diagnosis.trim(),
        servicePerformed: draft.servicePerformed.trim(),
        parts: draft.parts.trim(),
        status: "Solicitado",
        externalDevice: draft.externalDevice,
        warrantyEligible: draft.externalDevice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(repairRef, { code: `REP-${repairRef.id.slice(0, 8).toUpperCase()}` });
      if (draft.sourceRequestId) {
        await updateDoc(doc(db, collections.serviceRequests, draft.sourceRequestId), {
          status: "Confirmado",
          repairId: repairRef.id
        });
      }
      setDraft(emptyDraft);
      setFormOpen(false);
      setMessage("Reparo criado e vinculado ao dispositivo e ao cliente.");
      await loadData();
    } catch {
      setMessage("Não foi possível criar o reparo.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(repair: Repair, status: RepairStatus) {
    if (repair.status === "Finalizado") return;
    const currentIndex = statuses.indexOf(repair.status);
    const nextIndex = statuses.indexOf(status);
    if (nextIndex <= currentIndex) {
      setMessage("O status de um reparo só pode avançar.");
      return;
    }
    if (status === "Finalizado" && !window.confirm(`Finalizar ${repair.code}? Depois disso o reparo ficará fechado e não poderá voltar para outro status.`)) return;
    await updateDoc(doc(db, collections.repairs, repair.id), {
      status,
      ...(status === "Finalizado" ? { finishedAt: serverTimestamp(), closedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp()
    });
    setRepairs((current) => current.map((item) => item.id === repair.id ? { ...item, status, finishedAt: status === "Finalizado" ? new Date().toISOString() : item.finishedAt } : item));
  }

  async function generateWarrantyCode(repair: Repair) {
    if (!user) return;
    setGeneratingId(repair.id);
    setMessage("");
    try {
      const response = await apiFetch("/api/repairs/generate-warranty-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ repairId: repair.id })
      });
      const result = await response.json() as { code?: string; error?: string };
      if (!response.ok || !result.code) throw new Error(result.error || "Não foi possível gerar o código.");
      setRepairs((current) => current.map((item) => item.id === repair.id ? { ...item, warrantyCode: result.code, warrantyCodeStatus: "Disponível" } : item));
      await navigator.clipboard?.writeText(result.code);
      setMessage(`Código ${result.code} gerado e copiado. Ele pertence ao reparo ${repair.code} do ${repair.device}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o código.");
    } finally {
      setGeneratingId("");
    }
  }

  return (
    <StoreDashboardLayout title="Assistência" description="Reparos, dispositivos e garantias de serviço.">
      <div className="grid gap-3 md:grid-cols-3">
        {loadingData ? <MetricSkeletons count={3} /> : (
          <>
            <DashboardMetric title="Reparos registrados" value={String(repairs.length)} detail="Histórico completo" />
            <DashboardMetric title="Em andamento" value={String(repairs.filter((repair) => repair.status !== "Finalizado").length)} detail="Ainda abertos" />
            <DashboardMetric title="Garantias ativadas" value={String(repairs.filter((repair) => repair.warrantyCodeStatus === "Utilizado").length)} detail="Códigos já vinculados" />
          </>
        )}
      </div>

      <div className="mt-5">
        <section className="border border-line bg-white">
          <button className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => setFormOpen((current) => !current)} type="button">
            <span>
              <strong className="block">Registrar novo reparo</strong>
              <span className="mt-1 block text-sm text-gray-600">Abra somente quando precisar cadastrar uma nova ordem de serviço.</span>
            </span>
            <span className="flex items-center gap-2 bg-ink px-4 py-2 text-sm font-semibold text-white">
              {formOpen ? <X size={17} /> : <Plus size={17} />}
              {formOpen ? "Fechar" : "Novo reparo"}
            </span>
          </button>
          {formOpen ? <form className="grid gap-4 border-t border-line p-4" onSubmit={createRepair}>
            {message ? <p className="border border-line bg-gray-50 p-3 text-sm font-medium">{message}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Importar solicitação do bot">
                <select className={inputClass} onChange={(event) => chooseRequest(event.target.value)} value={draft.sourceRequestId}>
                  <option value="">Criar sem solicitação</option>
                  {requests.filter((request) => !repairs.some((repair) => repair.sourceRequestId === request.id)).map((request) => (
                    <option key={request.id} value={request.id}>{request.customerName} - {request.reason}</option>
                  ))}
                </select>
              </Field>
              <Field label="Conta do cliente">
                <select className={inputClass} onChange={(event) => setDraft({ ...draft, customerId: event.target.value })} required value={draft.customerId}>
                  <option value="">Selecione por nome, e-mail ou telefone</option>
                  {customers.map((customer) => (
                    <option key={customer.uid} value={customer.uid}>{customer.name} - {customer.email} - {customer.phone || "sem telefone"}</option>
                  ))}
                </select>
              </Field>
              <Field label="Dispositivo">
                <input className={inputClass} onChange={(event) => setDraft({ ...draft, device: event.target.value })} placeholder="Ex.: iPhone 13 128 GB azul" required value={draft.device} />
              </Field>
              <Field label="Marca e modelo">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} placeholder="Marca" value={draft.brand} />
                  <input className={inputClass} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="Modelo" value={draft.model} />
                </div>
              </Field>
              <Field label="Número de série ou IMEI">
                <input className={inputClass} onChange={(event) => setDraft({ ...draft, serialNumber: event.target.value })} placeholder="Identificação do aparelho" value={draft.serialNumber} />
              </Field>
              <div className="border border-line bg-gray-50 p-4 text-sm">
                <span className="text-gray-500">Status inicial</span>
                <strong className="mt-1 block">Solicitado</strong>
              </div>
            </div>
            <Field label="Problema informado">
              <textarea className={`${inputClass} min-h-24`} onChange={(event) => setDraft({ ...draft, issue: event.target.value })} required value={draft.issue} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Diagnóstico">
                <textarea className={`${inputClass} min-h-24`} onChange={(event) => setDraft({ ...draft, diagnosis: event.target.value })} value={draft.diagnosis} />
              </Field>
              <Field label="Serviço previsto/realizado">
                <textarea className={`${inputClass} min-h-24`} onChange={(event) => setDraft({ ...draft, servicePerformed: event.target.value })} value={draft.servicePerformed} />
              </Field>
              <Field label="Peças utilizadas">
                <textarea className={`${inputClass} min-h-24`} onChange={(event) => setDraft({ ...draft, parts: event.target.value })} value={draft.parts} />
              </Field>
            </div>
            <label className="flex items-start gap-3 border border-line bg-gray-50 p-4 text-sm">
              <input checked={draft.externalDevice} className="mt-1" onChange={(event) => setDraft({ ...draft, externalDevice: event.target.checked })} type="checkbox" />
              <span><strong className="block">Dispositivo não comprado na loja</strong><span className="mt-1 block text-gray-600">Ao finalizar, este reparo poderá gerar um código único de garantia de 90 dias.</span></span>
            </label>
            <button className="flex h-12 items-center justify-center gap-2 bg-ink px-5 font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">
              <Plus size={18} /> {saving ? "Registrando..." : "Registrar reparo"}
            </button>
          </form> : null}
        </section>
      </div>

      <div className="mt-5">
        <DashboardCard title="Reparos e garantias">
          <label className="mb-4 flex items-center gap-2 border border-line bg-white px-4 py-3">
            <Search size={18} className="text-gray-500" />
            <input className="w-full outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, aparelho, código, IMEI..." value={query} />
          </label>
          <div className="grid gap-3">
            {loadingData ? <CardListSkeleton count={3} /> : filteredRepairs.map((repair) => (
              <article key={repair.id} className="border border-line bg-white p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg">{repair.device}</strong>
                      <span className="border border-line bg-gray-50 px-2 py-1 text-xs font-semibold">{repair.code}</span>
                      {repair.externalDevice ? <span className="border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-brand-blue">Garantia de reparo</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{[repair.brand, repair.model, repair.serialNumber && `Série/IMEI: ${repair.serialNumber}`].filter(Boolean).join(" · ") || "Sem identificação complementar"}</p>
                    <p className="mt-3 text-sm"><strong>{repair.customerName}</strong> · {repair.customerEmail} · {repair.customerPhone}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{repair.servicePerformed || repair.diagnosis || repair.issue}</p>
                    <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${repair.agreementStatus === "Assinado" ? "text-brand-green" : "text-amber-700"}`}>
                      {repair.agreementStatus === "Assinado" ? <CheckCircle2 size={14} /> : <FileSignature size={14} />}
                      Termo {repair.agreementStatus === "Assinado" ? "assinado" : "pendente"}
                    </p>
                  </div>
                  {repair.status === "Finalizado" ? (
                    <div className="flex items-center justify-center gap-2 border border-line bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                      <LockKeyhole size={17} /> Finalizado
                    </div>
                  ) : (
                    <label className="relative">
                      <select className={`${inputClass} appearance-none pr-10`} onChange={(event) => updateStatus(repair, event.target.value as RepairStatus)} value={repair.status}>
                        {statuses.map((status, index) => <option disabled={index < statuses.indexOf(repair.status)} key={status}>{status}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-gray-500" size={17} />
                    </label>
                  )}
                  <div>
                    {repair.warrantyCode ? (
                      <button className="flex w-full items-center justify-center gap-2 border border-line bg-gray-50 px-3 py-3 text-sm font-semibold" onClick={() => navigator.clipboard?.writeText(repair.warrantyCode || "")} type="button">
                        <ClipboardCopy size={17} /> {repair.warrantyCode}
                      </button>
                    ) : (
                      <button
                        className="flex w-full items-center justify-center gap-2 bg-ink px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!repair.externalDevice || repair.agreementStatus !== "Assinado" || repair.status !== "Finalizado" || generatingId === repair.id}
                        onClick={() => generateWarrantyCode(repair)}
                        type="button"
                      >
                        <ShieldCheck size={17} /> {generatingId === repair.id ? "Gerando..." : "Gerar garantia"}
                      </button>
                    )}
                    {repair.warrantyCodeStatus ? (
                      <p className={`mt-2 flex items-center justify-center gap-1 text-xs font-semibold ${repair.warrantyCodeStatus === "Utilizado" ? "text-brand-green" : "text-gray-500"}`}>
                        {repair.warrantyCodeStatus === "Utilizado" ? <CheckCircle2 size={14} /> : <Wrench size={14} />}
                        {repair.warrantyCodeStatus}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {!loadingData && !filteredRepairs.length ? <p className="border border-dashed border-line bg-gray-50 p-5 text-sm text-gray-600">Nenhum reparo encontrado.</p> : null}
          </div>
        </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}

const inputClass = "w-full rounded-sm border border-line bg-white px-4 py-3 text-sm";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium">{label}{children}</label>;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function buildDeviceKey(serialNumber: string, brand: string, model: string, device: string) {
  const serial = serialNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (serial) return `serial:${serial}`;
  return `device:${[brand, model, device].join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
