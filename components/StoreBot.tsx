import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck, KeyRound, PackageCheck, RefreshCcw, Send, ShieldCheck, Smartphone, Wrench, X } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { collections, db } from "@/lib/firebase";
import { fetchCustomerOrders, fetchCustomerRepairWarranties, fetchProducts } from "@/lib/firestoreData";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/inputMasks";
import type { Order, Product, RepairWarranty } from "@/lib/types";
import { apiFetch } from "@/lib/runtime";

type StoreBotProps = {
  open: boolean;
  onClose: () => void;
};

type BotMode = "menu" | "assistencia" | "pedido" | "garantia" | "vender";
type OrderRequestType = "Reparo" | "Devolução" | "Reembolso" | "Cancelamento";

const assistanceOptions = [
  "Diagnóstico",
  "Troca de tela",
  "Bateria",
  "Limpeza interna",
  "Backup e formatação"
];

const orderRequestTypes: Array<{ type: OrderRequestType; text: string }> = [
  { type: "Reparo", text: "Análise técnica de um produto comprado." },
  { type: "Devolução", text: "Pedido de devolução quando aplicável." },
  { type: "Reembolso", text: "Reembolso vinculado a pedido cancelado ou analisado." },
  { type: "Cancelamento", text: "Cancelar um pedido ainda em andamento." }
];

const reasonOptions = [
  "Defeito funcional",
  "Produto diferente do anunciado",
  "Arrependimento dentro do prazo",
  "Problema na bateria",
  "Problema na tela ou câmera",
  "Outro motivo"
];

const sellerConditionOptions = ["Excelente", "Bom", "Com marcas", "Com defeito"];
const sellerStorageOptions = ["64 GB", "128 GB", "256 GB", "512 GB ou mais"];
const greetingVariants = [
  (firstName: string) => `Oi${firstName ? `, ${firstName}` : ""}! Eu sou a Mika, assistente virtual da Minha Lojinha Tech. O que você precisa resolver hoje?`,
  (firstName: string) => `Olá${firstName ? `, ${firstName}` : ""}! Que bom ter você por aqui. Posso ajudar com produtos, assistência, pedidos ou avaliação do seu celular.`,
  (firstName: string) => `${firstName ? `${firstName}, ` : ""}vamos encontrar o caminho mais rápido? Escolha uma opção e eu organizo as próximas etapas para você.`,
  (firstName: string) => `Oi${firstName ? `, ${firstName}` : ""}! Estou por aqui para deixar seu atendimento mais simples. Por onde você quer começar?`
];

const modeMessages: Record<Exclude<BotMode, "menu">, string> = {
  assistencia: "Vamos entender o que aconteceu com o aparelho. Com alguns detalhes, consigo encaminhar uma triagem mais clara para a assistência.",
  pedido: "Vou localizar sua compra e organizar a solicitação certa. Para proteger seus dados, essa parte usa os pedidos vinculados à sua conta.",
  garantia: "Vamos conferir a garantia do reparo. Você pode vincular um código novo ou informar se um problema coberto voltou a acontecer.",
  vender: "Legal, vamos preparar uma avaliação do seu celular. Conte o modelo, o estado e o valor esperado; a loja analisa tudo antes de confirmar uma oferta."
};

export function StoreBot({ open, onClose }: StoreBotProps) {
  const { user, loading } = useAuthContext();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<BotMode>("menu");
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [repairWarranties, setRepairWarranties] = useState<RepairWarranty[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [warrantiesLoading, setWarrantiesLoading] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);

  const [service, setService] = useState(assistanceOptions[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [device, setDevice] = useState("");
  const [problem, setProblem] = useState("");
  const [availability, setAvailability] = useState("");

  const [requestType, setRequestType] = useState<OrderRequestType>("Reparo");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [reason, setReason] = useState(reasonOptions[0]);
  const [description, setDescription] = useState("");
  const [contactPreference, setContactPreference] = useState("WhatsApp");
  const [orderAvailability, setOrderAvailability] = useState("");
  const [warrantyCode, setWarrantyCode] = useState("");
  const [selectedWarrantyId, setSelectedWarrantyId] = useState("");
  const [warrantyProblem, setWarrantyProblem] = useState("");
  const [coveredProblemConfirmed, setCoveredProblemConfirmed] = useState(false);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerDevice, setSellerDevice] = useState("");
  const [sellerStorage, setSellerStorage] = useState(sellerStorageOptions[1]);
  const [sellerCondition, setSellerCondition] = useState(sellerConditionOptions[1]);
  const [sellerValue, setSellerValue] = useState("");
  const [sellerCity, setSellerCity] = useState("");
  const [sellerOwnershipConfirmed, setSellerOwnershipConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setGreetingIndex((current) => {
        if (greetingVariants.length < 2) return 0;
        const next = Math.floor(Math.random() * greetingVariants.length);
        return next === current ? (next + 1) % greetingVariants.length : next;
      });
      setMounted(true);
      window.requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    setOrdersLoading(true);
    fetchCustomerOrders(user.uid)
      .then((orders) => {
        setCustomerOrders(orders);
        setSelectedOrderId((current) => current || orders[0]?.id || "");
      })
      .catch(() => setCustomerOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [mounted, user]);

  useEffect(() => {
    const openWarranty = (event: Event) => {
      const detail = (event as CustomEvent<{ warrantyId?: string; action?: "warranty" | "new-repair"; device?: string }>).detail || {};
      if (detail.action === "new-repair") {
        setDevice(detail.device || "");
        setProblem("");
        setMode("assistencia");
        return;
      }
      setSelectedWarrantyId(detail.warrantyId || "");
      setCoveredProblemConfirmed(false);
      setMode("garantia");
    };
    window.addEventListener("open-repair-warranty-bot", openWarranty);
    return () => window.removeEventListener("open-repair-warranty-bot", openWarranty);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    setWarrantiesLoading(true);
    fetchCustomerRepairWarranties(user.uid)
      .then((warranties) => {
        setRepairWarranties(warranties);
        setSelectedWarrantyId((current) => current || warranties[0]?.id || "");
      })
      .catch(() => setRepairWarranties([]))
      .finally(() => setWarrantiesLoading(false));
  }, [mounted, user]);

  const selectedOrder = useMemo(
    () => customerOrders.find((order) => order.id === selectedOrderId) || customerOrders[0],
    [customerOrders, selectedOrderId]
  );

  const selectedOrderProducts = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items
      .map((item) => products.find((product) => product.id === item.productId))
      .filter(Boolean) as Product[];
  }, [products, selectedOrder]);

  useEffect(() => {
    setSelectedProductId((current) => {
      if (current && selectedOrderProducts.some((product) => product.id === current)) return current;
      return selectedOrderProducts[0]?.id || "";
    });
  }, [selectedOrderProducts]);

  const firstName = (user?.displayName || "").trim().split(/\s+/)[0] || "";
  const greeting = greetingVariants[greetingIndex](firstName);

  if (!mounted) return null;

  function selectMode(nextMode: BotMode) {
    setMessage("");
    setMode(nextMode);
  }

  function resetAssistanceForm() {
    setService(assistanceOptions[0]);
    setName("");
    setPhone("");
    setDevice("");
    setProblem("");
    setAvailability("");
  }

  function resetOrderForm() {
    setRequestType("Reparo");
    setReason(reasonOptions[0]);
    setDescription("");
    setContactPreference("WhatsApp");
    setOrderAvailability("");
  }

  function resetSellerForm() {
    setSellerName("");
    setSellerPhone("");
    setSellerDevice("");
    setSellerStorage(sellerStorageOptions[1]);
    setSellerCondition(sellerConditionOptions[1]);
    setSellerValue("");
    setSellerCity("");
    setSellerOwnershipConfirmed(false);
  }

  async function submitAssistance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      await addDoc(collection(db, collections.serviceRequests), {
        customerId: user?.uid || "",
        customerName: name.trim() || user?.displayName || user?.email || "Cliente",
        customerEmail: user?.email || "",
        customerPhone: phone.trim(),
        orderId: "",
        orderCode: "Assistência técnica",
        productId: "",
        type: "Assistência técnica",
        reason: service,
        description: `${device.trim() ? `Aparelho: ${device.trim()}\n` : ""}${problem.trim()}`,
        contactPreference: "WhatsApp",
        availability: availability.trim(),
        status: "Aguardando confirmação",
        createdAt: serverTimestamp()
      });
      resetAssistanceForm();
      setMessage("Solicitação enviada. Ela entrou no painel da loja para análise.");
      setMode("menu");
    } catch {
      setMessage("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOrderRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedOrder) return;
    setMessage("");
    setSubmitting(true);

    try {
      await addDoc(collection(db, collections.serviceRequests), {
        customerId: user.uid,
        customerName: user.displayName || user.email,
        customerEmail: user.email,
        orderId: selectedOrder.id,
        orderCode: selectedOrder.code,
        productId: selectedProductId,
        type: requestType,
        reason,
        description,
        contactPreference,
        availability: orderAvailability,
        status: "Aguardando confirmação",
        createdAt: serverTimestamp()
      });
      resetOrderForm();
      setMessage("Solicitação enviada. A loja vai analisar pelo painel.");
      setMode("menu");
    } catch {
      setMessage("Não foi possível enviar a solicitação agora.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSellerOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sellerOwnershipConfirmed) return;
    setMessage("");
    setSubmitting(true);

    try {
      await addDoc(collection(db, collections.serviceRequests), {
        customerId: user?.uid || "",
        customerName: sellerName.trim() || user?.displayName || user?.email || "Vendedor",
        customerEmail: user?.email || "",
        customerPhone: sellerPhone.trim(),
        orderId: "",
        orderCode: "Oferta de aparelho",
        productId: "",
        type: "Quero vender meu celular",
        reason: `${sellerDevice.trim()} - ${sellerStorage} - ${sellerCondition}`,
        description: [
          `Aparelho: ${sellerDevice.trim()}`,
          `Armazenamento: ${sellerStorage}`,
          `Estado: ${sellerCondition}`,
          `Valor pedido: R$ ${sellerValue.trim()}`,
          `Cidade ou bairro: ${sellerCity.trim()}`
        ].join("\n"),
        contactPreference: "WhatsApp",
        availability: "",
        status: "Aguardando confirmação",
        createdAt: serverTimestamp()
      });
      resetSellerForm();
      setMessage("Recebi sua oferta. A loja vai avaliar o aparelho e chamar você pelo WhatsApp.");
      setMode("menu");
    } catch {
      setMessage("Não foi possível enviar sua oferta agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  async function redeemWarranty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage("");
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/repairs/redeem-warranty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ code: warrantyCode })
      });
      const result = await response.json() as { warrantyId?: string; error?: string };
      if (!response.ok || !result.warrantyId) throw new Error(result.error || "Não foi possível ativar a garantia.");
      const warranties = await fetchCustomerRepairWarranties(user.uid);
      setRepairWarranties(warranties);
      setSelectedWarrantyId(result.warrantyId);
      setWarrantyCode("");
      setMessage("Garantia ativada. O dispositivo e o reparo já aparecem na sua conta.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar a garantia.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWarrantyClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const warranty = repairWarranties.find((item) => item.id === selectedWarrantyId);
    if (!warranty || !coveredProblemConfirmed) return;
    setMessage("");
    setSubmitting(true);
    try {
      await addDoc(collection(db, collections.serviceRequests), {
        customerId: user.uid,
        customerName: user.displayName || user.email || "Cliente",
        customerEmail: user.email || "",
        customerPhone: "",
        orderId: "",
        orderCode: warranty.repairCode,
        productId: "",
        repairId: warranty.repairId,
        repairWarrantyId: warranty.id,
        device: warranty.device,
        type: "Garantia de reparo",
        reason: "Retorno do problema coberto",
        description: warrantyProblem.trim(),
        contactPreference: "WhatsApp",
        availability: "",
        status: "Aguardando confirmação",
        createdAt: serverTimestamp()
      });
      setWarrantyProblem("");
      setCoveredProblemConfirmed(false);
      setMessage(`Solicitação de garantia enviada para o reparo ${warranty.repairCode} do ${warranty.device}.`);
    } catch {
      setMessage("Não foi possível acionar a garantia agora.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`store-chat-backdrop fixed inset-0 z-[90] md:flex md:items-end md:justify-end md:p-5 ${visible ? "is-visible" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-bot-title"
    >
      <section className={`store-chat-window flex h-full w-full flex-col bg-white text-ink shadow-[0_24px_80px_rgba(17,24,39,0.24)] md:h-[min(720px,calc(100vh-40px))] md:w-[440px] md:overflow-hidden md:rounded-2xl md:border md:border-line ${visible ? "is-visible" : ""}`}>
        <div className="border-b border-line bg-ink text-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative size-12 shrink-0">
                <span className="block size-full overflow-hidden rounded-full border-2 border-white/30 bg-white">
                  <img className="h-full w-full object-cover" src="/mika-avatar-atualizada.webp" alt="" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-ink bg-lime" />
              </span>
              <div className="min-w-0">
                <h2 id="store-bot-title" className="truncate text-lg font-semibold">Mika</h2>
                <p className="text-xs text-white/70">Assistente virtual · online agora</p>
              </div>
            </div>
            <button className="grid size-10 shrink-0 place-items-center rounded-sm border border-white/15 text-white hover:bg-white/10" onClick={onClose} type="button" aria-label="Fechar conversa com a Mika">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div key={mode} className="grid gap-3 store-bot-flow">
            <BotBubble>
              {mode === "menu" ? greeting : modeMessages[mode]}
            </BotBubble>

            {message ? (
              <div className="store-bot-item border border-green-100 bg-green-50 p-3 text-sm font-medium text-brand-green">
                {message}
              </div>
            ) : null}

            {mode === "menu" ? (
              <div className="store-bot-options-in">
                <MenuStep onSelect={selectMode} />
              </div>
            ) : null}

            {mode === "assistencia" ? (
              <form className="store-bot-form store-bot-item ml-auto grid w-[94%] gap-3 rounded-lg rounded-br-sm border border-[#b9e8dc] bg-[#e9fbf6] p-4" onSubmit={submitAssistance}>
                <StepHeader title="Solicitar assistência técnica" onBack={() => setMode("menu")} />
                <SegmentedOptions label="Tipo de serviço" options={assistanceOptions} value={service} onChange={setService} />
                <input className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required value={name} />
                <input className="rounded-sm border border-line px-4 py-3 text-sm" inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="WhatsApp" required type="tel" value={phone} />
                <input className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setDevice(event.target.value)} placeholder="Aparelho e modelo" required value={device} />
                <textarea className="min-h-28 rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setProblem(event.target.value)} placeholder="O que aconteceu? Teve queda, líquido ou reparo anterior?" required value={problem} />
                <input className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setAvailability(event.target.value)} placeholder="Melhor horário para retorno" value={availability} />
                <SubmitButton submitting={submitting} label="Enviar assistência" />
              </form>
            ) : null}

            {mode === "pedido" ? (
              <div className="store-bot-form store-bot-item ml-auto grid w-[94%] gap-3 rounded-lg rounded-br-sm border border-[#b9e8dc] bg-[#e9fbf6] p-4">
                <StepHeader title="Solicitação de pedido" onBack={() => setMode("menu")} />
                {loading ? <BotBubble>Verificando sua sessão...</BotBubble> : null}
                {!loading && !user ? (
                  <div className="border border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                    Para devolução, reembolso, cancelamento ou reparo vinculado a compra, entre na conta para eu localizar seus pedidos.
                    <Link className="mt-3 block rounded-sm bg-ink px-4 py-3 text-center font-semibold text-white" href="/login">
                      Entrar ou criar conta
                    </Link>
                  </div>
                ) : null}
                {user && ordersLoading ? <BotBubble>Carregando seus pedidos...</BotBubble> : null}
                {user && !ordersLoading && customerOrders.length === 0 ? (
                  <div className="border border-dashed border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                    Não encontrei pedidos nessa conta. Solicitações vinculadas aparecem aqui depois de uma compra.
                  </div>
                ) : null}
                {user && !ordersLoading && customerOrders.length ? (
                  <form className="grid gap-3" onSubmit={submitOrderRequest}>
                    <SegmentedOptions
                      label="Tipo"
                      options={orderRequestTypes.map((item) => item.type)}
                      value={requestType}
                      onChange={(value) => setRequestType(value as OrderRequestType)}
                    />
                    <select className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setSelectedOrderId(event.target.value)} value={selectedOrder?.id || ""} required>
                      {customerOrders.map((order) => (
                        <option key={order.id} value={order.id}>{order.code} - {formatCurrency(order.total)}</option>
                      ))}
                    </select>
                    <select className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setSelectedProductId(event.target.value)} value={selectedProductId} required>
                      {selectedOrderProducts.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    <select className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setReason(event.target.value)} value={reason}>
                      {reasonOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <textarea className="min-h-28 rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setDescription(event.target.value)} placeholder="Explique o ocorrido com objetividade." required value={description} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setContactPreference(event.target.value)} value={contactPreference}>
                        <option>WhatsApp</option>
                        <option>E-mail</option>
                        <option>Telefone</option>
                      </select>
                      <input className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setOrderAvailability(event.target.value)} placeholder="Disponibilidade" value={orderAvailability} />
                    </div>
                    <p className="border border-line bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                      A loja analisa garantia, prazo, condição do produto e histórico do pedido antes de confirmar o próximo passo.
                    </p>
                    <SubmitButton submitting={submitting} label="Enviar solicitação" />
                  </form>
                ) : null}
              </div>
            ) : null}

            {mode === "garantia" ? (
              <div className="store-bot-form store-bot-item ml-auto grid w-[94%] gap-4 rounded-lg rounded-br-sm border border-[#b9e8dc] bg-[#e9fbf6] p-4">
                <StepHeader title="Garantia de reparo" onBack={() => setMode("menu")} />
                {loading ? <BotBubble>Verificando sua conta...</BotBubble> : null}
                {!loading && !user ? (
                  <div className="border border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                    Entre na conta que recebeu o código para ativar ou acionar uma garantia.
                    <Link className="mt-3 block rounded-sm bg-ink px-4 py-3 text-center font-semibold text-white" href="/login">Entrar ou criar conta</Link>
                  </div>
                ) : null}
                {user ? (
                  <>
                    <form className="grid gap-3 border border-line bg-gray-50 p-4" onSubmit={redeemWarranty}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center bg-white"><KeyRound size={19} /></span>
                        <div>
                          <strong className="block text-sm">Vincular garantia com código</strong>
                          <span className="mt-1 block text-xs text-gray-600">O código só funciona nesta conta e em um único reparo.</span>
                        </div>
                      </div>
                      <input
                        className="rounded-sm border border-line bg-white px-4 py-3 text-sm uppercase"
                        onChange={(event) => setWarrantyCode(formatWarrantyCode(event.target.value))}
                        placeholder="GAR-0000-0000"
                        required
                        value={warrantyCode}
                      />
                      <SubmitButton submitting={submitting} label="Ativar garantia" />
                    </form>

                    {warrantiesLoading ? <BotBubble>Carregando garantias vinculadas...</BotBubble> : null}
                    {!warrantiesLoading && repairWarranties.some(isWarrantyActive) ? (
                      <form className="grid gap-3 border border-line bg-white p-4" onSubmit={submitWarrantyClaim}>
                        <div>
                          <strong className="text-sm">Problema no serviço coberto</strong>
                          <p className="mt-1 text-xs leading-5 text-gray-600">Use somente quando o defeito estiver ligado ao serviço ou à peça desta garantia.</p>
                        </div>
                        <select className="rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setSelectedWarrantyId(event.target.value)} value={selectedWarrantyId} required>
                          {repairWarranties.filter(isWarrantyActive).map((warranty) => (
                            <option key={warranty.id} value={warranty.id}>{warranty.device} - {warranty.repairCode}</option>
                          ))}
                        </select>
                        <textarea className="min-h-24 rounded-sm border border-line px-4 py-3 text-sm" onChange={(event) => setWarrantyProblem(event.target.value)} placeholder="Explique como o problema coberto voltou a acontecer." required value={warrantyProblem} />
                        <label className="flex items-start gap-3 border border-line bg-gray-50 p-3 text-xs leading-5">
                          <input checked={coveredProblemConfirmed} className="mt-1" onChange={(event) => setCoveredProblemConfirmed(event.target.checked)} required type="checkbox" />
                          Confirmo que o problema está relacionado ao serviço ou à peça coberta. Para outro defeito, abrirei uma nova assistência.
                        </label>
                        <SubmitButton submitting={submitting} label="Enviar retorno em garantia" />
                      </form>
                    ) : !warrantiesLoading ? (
                      <p className="border border-dashed border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">Nenhuma garantia de reparo vinculada a esta conta ainda.</p>
                    ) : null}
                    <Link className="text-center text-sm font-semibold text-brand-blue" href="/garantias-reparo">Ver minhas garantias de reparo</Link>
                  </>
                ) : null}
              </div>
            ) : null}

            {mode === "vender" ? (
              <form className="store-bot-form store-bot-item ml-auto grid w-[94%] gap-3 rounded-lg rounded-br-sm border border-[#b9e8dc] bg-[#e9fbf6] p-4" onSubmit={submitSellerOffer}>
                <StepHeader title="Quero vender meu celular" onBack={() => setMode("menu")} />
                <BotBubble>
                  A loja compra celulares para revenda após avaliar estado, procedência e valor. O envio não garante a compra.
                </BotBubble>
                <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => setSellerName(event.target.value)} placeholder="Seu nome" required value={sellerName} />
                <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" inputMode="numeric" onChange={(event) => setSellerPhone(formatPhone(event.target.value))} placeholder="Seu WhatsApp" required type="tel" value={sellerPhone} />
                <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => setSellerDevice(event.target.value)} placeholder="Marca e modelo do celular" required value={sellerDevice} />
                <SegmentedOptions label="Armazenamento" options={sellerStorageOptions} value={sellerStorage} onChange={setSellerStorage} />
                <SegmentedOptions label="Estado do aparelho" options={sellerConditionOptions} value={sellerCondition} onChange={setSellerCondition} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-gray-700">
                    Valor que você espera
                    <span className="flex items-center rounded-sm border border-line bg-white px-3">
                      <span className="text-sm text-gray-500">R$</span>
                      <input className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" inputMode="decimal" onChange={(event) => setSellerValue(event.target.value.replace(/[^\d.,]/g, ""))} placeholder="0,00" required value={sellerValue} />
                    </span>
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-gray-700">
                    Cidade ou bairro
                    <input className="rounded-sm border border-line bg-white px-3 py-3 text-sm font-normal" onChange={(event) => setSellerCity(event.target.value)} placeholder="Onde está o aparelho?" required value={sellerCity} />
                  </label>
                </div>
                <label className="flex items-start gap-3 rounded-sm border border-line bg-white p-3 text-xs leading-5">
                  <input checked={sellerOwnershipConfirmed} className="mt-1" onChange={(event) => setSellerOwnershipConfirmed(event.target.checked)} required type="checkbox" />
                  Confirmo que o aparelho é meu, tem procedência legítima e pode ser consultado pelo IMEI antes da compra.
                </label>
                <SubmitButton submitting={submitting} label="Enviar oferta para avaliação" />
              </form>
            ) : null}
          </div>
        </div>
        <div className="border-t border-line bg-white px-4 py-3">
          <div className="flex h-11 items-center justify-center rounded-full border border-line bg-gray-50 px-4 text-sm text-gray-400">
            Use as opções da conversa para responder
          </div>
        </div>
      </section>
    </div>
  );
}

function MenuStep({ onSelect }: { onSelect: (mode: BotMode) => void }) {
  return (
    <div className="store-bot-item ml-auto grid w-[94%] gap-2">
      <QuickReply icon={<Smartphone size={19} />} title="Comprar um celular" text="Veja os smartphones disponíveis na loja." onClick={() => { window.location.href = "/catalogo"; }} />
      <QuickReply icon={<CircleDollarSign size={19} />} title="Quero vender meu celular" text="Envie o aparelho e o valor para avaliação da loja." onClick={() => onSelect("vender")} featured />
      <QuickReply icon={<Wrench size={19} />} title="Solicitar assistência técnica" text="Diagnóstico, tela, bateria, limpeza ou sistema." onClick={() => onSelect("assistencia")} />
      <QuickReply icon={<PackageCheck size={19} />} title="Ajuda com um pedido" text="Cancelamento, devolução, reembolso ou produto comprado." onClick={() => onSelect("pedido")} />
    </div>
  );
}

function formatWarrantyCode(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^G(?:A(?:R)?)?/, "").slice(0, 8);
  return ["GAR", normalized.slice(0, 4), normalized.slice(4, 8)].filter(Boolean).join("-");
}

function isWarrantyActive(warranty: RepairWarranty) {
  return new Date(warranty.expiresAt).getTime() >= Date.now();
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
      <h3 className="font-semibold">{title}</h3>
      <button className="grid size-9 place-items-center rounded-full border border-line bg-white hover:border-ink" onClick={onBack} type="button" aria-label="Voltar ao início" title="Voltar">
        <ArrowLeft size={17} />
      </button>
    </div>
  );
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="store-bot-item flex max-w-[92%] items-end gap-2">
      <span className="mb-4 size-8 shrink-0 overflow-hidden rounded-full border border-line bg-white">
        <img className="h-full w-full object-cover" src="/mika-avatar-atualizada.webp" alt="" />
      </span>
      <div>
        <div className="rounded-lg rounded-bl-sm border border-line bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-700 shadow-[0_4px_14px_rgba(17,24,39,0.04)]">
          {children}
        </div>
        <span className="mt-1 block px-1 text-[10px] text-gray-400">Mika · agora</span>
      </div>
    </div>
  );
}

function QuickReply({ icon, title, text, onClick, featured = false }: { icon: ReactNode; title: string; text: string; onClick: () => void; featured?: boolean }) {
  return (
    <button
      className={`flex items-center gap-3 rounded-lg rounded-br-sm border p-3 text-left transition duration-200 hover:-translate-y-0.5 ${featured ? "border-[#8bd8c5] bg-[#e9fbf6] hover:border-teal" : "border-line bg-white hover:border-ink"}`}
      onClick={onClick}
      type="button"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${featured ? "bg-teal text-white" : "bg-mist text-ink"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{title}</strong>
        <span className="mt-0.5 block text-xs leading-5 text-gray-600">{text}</span>
      </span>
      <ChevronRight className="shrink-0 text-gray-400" size={18} />
    </button>
  );
}

function SegmentedOptions({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              className={`min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
              onClick={() => onChange(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button className="flex h-12 items-center justify-center gap-2 rounded-sm bg-ink px-4 font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-graphite disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60" disabled={submitting} type="submit">
      {submitting ? <CheckCircle2 size={18} /> : <Send size={18} />}
      {submitting ? "Enviando..." : label}
    </button>
  );
}
