import { useRouter } from "next/router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, FileCheck2, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { Breadcrumb, Layout } from "@/components/Layout";
import { agreementContent, agreementVersions, type AgreementType } from "@/lib/agreementTerms";
import { getCustomerProfile } from "@/lib/auth";
import { fetchCustomerOrders, fetchCustomerRepairs, fetchProducts } from "@/lib/firestoreData";
import { formatCurrency } from "@/lib/format";
import { formatCpf } from "@/lib/inputMasks";
import { useAuthUser } from "@/lib/useAuthUser";
import type { Order, Product, Repair } from "@/lib/types";
import { apiFetch } from "@/lib/runtime";

export default function AssinarTermo() {
  const router = useRouter();
  const { user } = useAuthUser();
  const type = router.query.tipo === "reparo" ? "repair" : router.query.tipo === "venda" ? "sale" : null;
  const resourceId = typeof router.query.id === "string" ? router.query.id : "";
  const [order, setOrder] = useState<Order | null>(null);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [signature, setSignature] = useState("");
  const [observations, setObservations] = useState("");
  const [confirmations, setConfirmations] = useState<boolean[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  const content = type ? agreementContent[type] : null;

  useEffect(() => {
    if (!user || !type || !resourceId || !content) return;
    setLoading(true);
    const load = async () => {
      const profile = await getCustomerProfile(user.uid);
      setFullName(profile?.fullName || user.displayName || "");
      setCpf("");

      if (type === "sale") {
        const [orders, nextProducts] = await Promise.all([fetchCustomerOrders(user.uid), fetchProducts()]);
        const selected = orders.find((item) => item.id === resourceId) || null;
        setOrder(selected);
        setProducts(nextProducts);
        setCpf(formatCpf(selected?.customer.document || ""));
        setSigned(selected?.agreementStatus === "Assinado");
      } else {
        const repairs = await fetchCustomerRepairs(user.uid);
        const selected = repairs.find((item) => item.id === resourceId) || null;
        setRepair(selected);
        setSigned(selected?.agreementStatus === "Assinado");
      }
      setConfirmations(content.confirmations.map(() => false));
    };
    load().catch(() => setMessage("Não foi possível carregar o termo.")).finally(() => setLoading(false));
  }, [user, type, resourceId, content]);

  const resourceExists = type === "sale" ? Boolean(order) : Boolean(repair);
  const resourceCode = type === "sale" ? order?.code : repair?.code;
  const agreementSignedAt = type === "sale" ? order?.agreementSignedAt : repair?.agreementSignedAt;
  const agreementHash = type === "sale" ? order?.agreementDocumentHash : repair?.agreementDocumentHash;

  async function submitAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !type || !resourceId) return;
    setMessage("");
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/agreements/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          type,
          resourceId,
          fullName,
          cpf,
          signature,
          observations,
          confirmations
        })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar a assinatura.");
      setSigned(true);
      setMessage("Termo assinado e registrado com sucesso.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a assinatura.");
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = type === "repair" ? "/garantias-reparo" : "/pedidos";

  return (
    <Layout title={`${content?.title || "Assinar termo"} | Minha Lojinha Tech`} noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: type === "repair" ? "Reparos e garantias" : "Meus pedidos", href: backHref }, { label: "Assinar termo" }]} />
      <section className="container-page">
        <CustomerAuthGate message="Entre na conta vinculada ao pedido ou reparo para assinar este termo.">
          {loading ? <div className="border border-line bg-white p-6 text-sm text-gray-600">Carregando termo e dados do atendimento...</div> : null}
          {!loading && (!content || !resourceExists) ? (
            <div className="border border-line bg-white p-6">
              <h1 className="text-xl font-semibold">Termo não encontrado</h1>
              <p className="mt-2 text-sm text-gray-600">O pedido ou reparo não existe nesta conta.</p>
            </div>
          ) : null}
          {!loading && content && resourceExists ? (
            <form className="grid gap-5" onSubmit={submitAgreement}>
              <header className="border border-line bg-ink p-5 text-white md:p-7">
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="text-sm font-semibold uppercase text-white/55">Aceite eletrônico · {agreementVersions[type!]}</p>
                    <h1 className="mt-2 text-3xl font-semibold">{content.title}</h1>
                    <p className="mt-3 max-w-3xl leading-7 text-white/70">{content.intro}</p>
                  </div>
                  <span className="w-max border border-white/20 bg-white/10 px-4 py-3 font-semibold">{resourceCode}</span>
                </div>
              </header>

              {message ? (
                <p className={`border p-4 text-sm font-semibold ${signed ? "border-green-200 bg-green-50 text-brand-green" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</p>
              ) : null}

              {signed ? (
                <section className="border border-green-200 bg-white p-6 text-center">
                  <CheckCircle2 className="mx-auto text-brand-green" size={34} />
                  <h2 className="mt-3 text-xl font-semibold">Termo já assinado</h2>
                  <p className="mt-2 text-sm text-gray-600">O aceite está vinculado ao {type === "sale" ? "pedido" : "reparo"} {resourceCode} e não precisa ser assinado novamente.</p>
                  <div className="mx-auto mt-4 max-w-xl border border-line bg-gray-50 p-4 text-left text-sm">
                    <p><strong>Data registrada:</strong> {formatDateTime(agreementSignedAt)}</p>
                    <p className="mt-2 break-all text-xs text-gray-500"><strong>Identificador de integridade:</strong> {agreementHash || "Registrado no servidor"}</p>
                  </div>
                  <button className="mt-5 border border-line px-5 py-3 text-sm font-semibold" onClick={() => router.push(backHref)} type="button">Voltar</button>
                </section>
              ) : (
                <>
                  <ResourceSummary type={type!} order={order} repair={repair} products={products} />

                  <section className="border border-line bg-white p-5 md:p-6">
                    <div className="flex items-start gap-3 border-b border-line pb-4">
                      <FileCheck2 size={22} />
                      <div>
                        <h2 className="text-lg font-semibold">Condições do termo</h2>
                        <p className="mt-1 text-sm text-gray-600">Leia cada seção antes de confirmar.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4">
                      {content.sections.map((section, index) => (
                        <details key={section.title} className="group border border-line bg-gray-50 p-4" open={index === 0}>
                          <summary className="cursor-pointer font-semibold">{index + 1}. {section.title}</summary>
                          <div className="mt-3 grid gap-2 text-sm leading-6 text-gray-700">
                            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>

                  <section className="border border-line bg-white p-5 md:p-6">
                    <h2 className="text-lg font-semibold">Suas confirmações</h2>
                    <div className="mt-4 grid gap-3">
                      {content.confirmations.map((confirmation, index) => (
                        <label key={confirmation} className="flex items-start gap-3 border border-line bg-gray-50 p-4 text-sm leading-6">
                          <input
                            checked={confirmations[index] || false}
                            className="mt-1 size-4"
                            onChange={(event) => setConfirmations((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
                            required
                            type="checkbox"
                          />
                          <span>{confirmation}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="border border-line bg-white p-5 md:p-6">
                    <div className="flex items-start gap-3 border-b border-line pb-4">
                      <PenLine size={22} />
                      <div>
                        <h2 className="text-lg font-semibold">Identificação e assinatura</h2>
                        <p className="mt-1 text-sm text-gray-600">A assinatura será registrada junto à sua conta e ao conteúdo acima.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Nome completo">
                        <input className={inputClass} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
                      </Field>
                      <Field label="CPF">
                        <input className={inputClass} inputMode="numeric" onChange={(event) => setCpf(formatCpf(event.target.value))} placeholder="000.000.000-00" required value={cpf} />
                      </Field>
                      <Field label="Observação do cliente (opcional)">
                        <textarea className={`${inputClass} min-h-24`} onChange={(event) => setObservations(event.target.value)} placeholder="Registre aqui alguma ressalva antes de assinar." value={observations} />
                      </Field>
                      <Field label="Assinatura eletrônica">
                        <div>
                          <input className={`${inputClass} font-serif text-lg italic`} onChange={(event) => setSignature(event.target.value)} placeholder="Digite seu nome completo novamente" required value={signature} />
                          <p className="mt-2 text-xs leading-5 text-gray-500">A assinatura deve ser igual ao nome completo informado.</p>
                        </div>
                      </Field>
                    </div>
                    <div className="mt-5 flex items-start gap-3 border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      <LockKeyhole className="mt-0.5 shrink-0" size={18} />
                      <p>O sistema registra a conta autenticada, a versão do termo, os dados do {type === "sale" ? "pedido" : "reparo"}, a data do servidor e uma impressão digital do documento para preservar a evidência do aceite.</p>
                    </div>
                    <button
                      className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 bg-ink px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={submitting || confirmations.some((value) => !value)}
                      type="submit"
                    >
                      <ShieldCheck size={19} /> {submitting ? "Registrando assinatura..." : "Assinar e concluir"}
                    </button>
                  </section>
                </>
              )}
            </form>
          ) : null}
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function ResourceSummary({ type, order, repair, products }: { type: AgreementType; order: Order | null; repair: Repair | null; products: Product[] }) {
  if (type === "repair" && repair) {
    return (
      <section className="border border-line bg-white p-5 md:p-6">
        <h2 className="text-lg font-semibold">Dados do reparo preenchidos pela loja</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Summary label="Número" value={repair.code} />
          <Summary label="Dispositivo" value={repair.device} />
          <Summary label="Identificação" value={[repair.brand, repair.model, repair.serialNumber && `Série/IMEI ${repair.serialNumber}`].filter(Boolean).join(" · ") || "Não informada"} />
          <Summary label="Status" value={repair.status} />
          <Summary label="Problema informado" value={repair.issue || "Não informado"} />
          <Summary label="Diagnóstico" value={repair.diagnosis || "Pendente"} />
          <Summary label="Serviço registrado" value={repair.servicePerformed || "Pendente"} />
          <Summary label="Peças registradas" value={repair.parts || "Nenhuma informada"} />
        </div>
      </section>
    );
  }

  if (!order) return null;
  return (
    <section className="border border-line bg-white p-5 md:p-6">
      <h2 className="text-lg font-semibold">Dados da venda preenchidos pelo pedido</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Summary label="Número" value={order.code} />
        <Summary label="Total" value={formatCurrency(order.total)} />
        <Summary label="Pagamento" value={order.paymentMethod} />
        <Summary label="Entrega" value={order.deliveryMethod} />
      </div>
      <div className="mt-4 grid gap-3">
        {order.items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return (
            <div key={item.productId} className="border border-line bg-gray-50 p-4">
              <strong>{item.name || product?.name || "Produto adquirido"}</strong>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {[product?.brand, product?.condition, product?.storage, product?.color, product?.batteryHealth && `Bateria ${product.batteryHealth}`].filter(Boolean).join(" · ") || "Detalhes registrados no pedido"}
              </p>
              <p className="mt-1 text-sm text-gray-600">Garantia: {product?.warranty || "Conforme informado na venda"}</p>
              {product?.notes ? <p className="mt-1 text-sm text-gray-600">Observações: {product.notes}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const inputClass = "w-full rounded-sm border border-line bg-white px-4 py-3";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium">{label}{children}</label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border border-line bg-gray-50 p-3"><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 text-sm font-medium leading-6">{value}</p></div>;
}

function formatDateTime(value?: string) {
  if (!value) return "Registrada no servidor";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Registrada no servidor" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
