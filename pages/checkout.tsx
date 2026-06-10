import { ArrowLeft, Check, Clock, CreditCard, LockKeyhole, MapPin, PackageCheck, Plus, ShieldCheck, TicketPercent, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout, Breadcrumb } from "@/components/Layout";
import { ActionButtonContent } from "@/components/ActionButtonContent";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { useCart } from "@/components/CartProvider";
import { useAuthContext } from "@/components/AuthProvider";
import { getCustomerProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { formatCep, formatCpf, formatPhone, onlyDigits } from "@/lib/inputMasks";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CustomerAddress } from "@/lib/types";
import { apiFetch, openExternal } from "@/lib/runtime";

const pickupPoints = [
  {
    id: "ponto-retirada-1",
    title: "Ponto de retirada 1",
    area: "Jardim Guarujá",
    address: "R. Cittadella, 271 - Jardim Guarujá, São Paulo - SP, 05876-050",
    weekdayHours: "Segunda a sexta, das 13:20 às 20:00",
    weekendHours: "Sábado e domingo, das 10:00 às 18:00",
    description: "Retirada no portão/ponto combinado."
  },
  {
    id: "ponto-retirada-2",
    title: "Ponto de retirada 2",
    area: "Parque Independência",
    address: "R. Diamante Verde, 825 - Parque Independência, São Paulo - SP, 05880-280",
    weekdayHours: "Segunda a sexta, das 13:00 às 18:00",
    weekendHours: "Sábado e domingo, das 10:00 às 18:00",
    description: "Retirada no portão/ponto combinado."
  }
];

const deliveryOptions = [
  { id: "retirada-ponto", title: "Retirar em ponto combinado", text: "Veja o produto e, se preferir, pague pessoalmente." },
  { id: "entrega-local", title: "Entrega local", text: "Para regiões próximas ou de fácil acesso." },
  { id: "motoboy", title: "Motoboy", text: "Disponibilidade e custo confirmados após o pedido." }
];

const paymentOptions = [
  { id: "checkout", title: "Pagar agora", text: "Confirme o pedido com pagamento online." },
  { id: "presencial", title: "Pagar na retirada", text: "Disponível para conferir o produto antes de pagar." }
];

const steps = [
  { id: 1, title: "Identificação", description: "Seus dados de contato", icon: UserRound },
  { id: 2, title: "Entrega", description: "Como receber o pedido", icon: MapPin },
  { id: 3, title: "Pagamento", description: "Escolha como pagar", icon: CreditCard },
  { id: 4, title: "Revisão", description: "Confira tudo antes de pagar", icon: PackageCheck }
];

type CheckoutData = {
  name: string;
  email: string;
  phone: string;
  document: string;
  deliveryMethod: string;
  pickupPoint: string;
  deliveryCep: string;
  deliveryStreet: string;
  deliveryNumber: string;
  deliveryComplement: string;
  deliveryNeighborhood: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryNotes: string;
  paymentMethod: string;
};

export default function Checkout() {
  const router = useRouter();
  const { appliedCoupon, applyCoupon, clearCart, clearCoupon, discount, lines, subtotal, total } = useCart();
  const { user } = useAuthContext();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState("");
  const [successOrderCode, setSuccessOrderCode] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualAddressOpen, setManualAddressOpen] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const flowRef = useRef<HTMLDivElement>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: "",
    email: "",
    phone: "",
    document: "",
    deliveryMethod: "retirada-ponto",
    pickupPoint: pickupPoints[0].id,
    deliveryCep: "",
    deliveryStreet: "",
    deliveryNumber: "",
    deliveryComplement: "",
    deliveryNeighborhood: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryNotes: "",
    paymentMethod: "checkout"
  });
  const availablePickupPoints = useMemo(() => {
    if (!lines.length) return pickupPoints;
    return pickupPoints.filter((point) =>
      lines.every((line) => {
        const productPickupPoints = line.product.pickupPointIds?.length ? line.product.pickupPointIds : pickupPoints.map((item) => item.id);
        return productPickupPoints.includes(point.id);
      })
    );
  }, [lines]);

  useEffect(() => {
    setCheckoutData((current) => ({
      ...current,
      name: current.name || user?.displayName || "",
      email: current.email || user?.email || ""
    }));
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!user) return;
    getCustomerProfile(user.uid)
      .then((profile) => {
        const savedAddresses = profile?.addresses || [];
        setCustomerAddresses(savedAddresses);
        const firstAddress = savedAddresses[0];
        if (firstAddress) {
          setSelectedAddressId(firstAddress.id);
          setManualAddressOpen(false);
        }
        setCheckoutData((current) => ({
          ...current,
          phone: current.phone || formatPhone(profile?.phone || ""),
          ...(firstAddress && !current.deliveryCep ? {
            deliveryCep: firstAddress.cep,
            deliveryStreet: firstAddress.street,
            deliveryNumber: firstAddress.number,
            deliveryComplement: firstAddress.complement,
            deliveryNeighborhood: firstAddress.neighborhood,
            deliveryCity: firstAddress.city,
            deliveryState: firstAddress.state,
            deliveryNotes: firstAddress.notes || current.deliveryNotes
          } : {})
        }));
      })
      .catch(() => setCustomerAddresses([]));
  }, [user]);

  const updateField = (field: keyof CheckoutData, value: string) => {
    setCheckoutData((current) => {
      const next = { ...current, [field]: value };
      if (field === "deliveryMethod" && value !== "retirada-ponto" && current.paymentMethod === "presencial") {
        next.paymentMethod = "checkout";
      }
      return next;
    });
  };

  useEffect(() => {
    if (checkoutData.deliveryMethod !== "retirada-ponto") return;
    if (availablePickupPoints.some((point) => point.id === checkoutData.pickupPoint)) return;
    setCheckoutData((current) => ({
      ...current,
      pickupPoint: availablePickupPoints[0]?.id || "",
      deliveryMethod: availablePickupPoints.length ? current.deliveryMethod : "entrega-local",
      paymentMethod: availablePickupPoints.length ? current.paymentMethod : "checkout"
    }));
  }, [availablePickupPoints, checkoutData.deliveryMethod, checkoutData.pickupPoint]);

  const canContinue = (step = currentStep): boolean => {
    if (step === 1) return Boolean(checkoutData.name && checkoutData.email && checkoutData.phone);
    if (step === 2) {
      if (checkoutData.deliveryMethod === "retirada-ponto") return Boolean(checkoutData.pickupPoint && availablePickupPoints.length);
      return Boolean(checkoutData.deliveryCep && checkoutData.deliveryStreet && checkoutData.deliveryNumber && checkoutData.deliveryCity && checkoutData.deliveryState);
    }
    if (step === 3) {
      if (checkoutData.deliveryMethod !== "retirada-ponto" && checkoutData.paymentMethod === "presencial") return false;
      return Boolean(checkoutData.paymentMethod);
    }
    return canContinue(1) && canContinue(2) && canContinue(3);
  };

  useEffect(() => {
    if (!successOrderId) return;
    const timeout = window.setTimeout(() => router.push("/pedidos"), 2600);
    return () => window.clearTimeout(timeout);
  }, [router, successOrderId]);

  const nextStep = () => {
    if (!canContinue()) {
      setMessage("Preencha os campos principais desta etapa antes de continuar.");
      return;
    }
    setMessage("");
    changeStep(Math.min(4, currentStep + 1));
  };

  const changeStep = (step: number) => {
    setCurrentStep(step);
    window.requestAnimationFrame(() => {
      flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  async function lookupCheckoutCep() {
    const cep = onlyDigits(checkoutData.deliveryCep);
    if (cep.length !== 8) {
      setCepMessage("Digite um CEP com 8 números.");
      return;
    }

    setCepMessage("Buscando CEP...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

      if (data.erro) {
        setCepMessage("CEP não encontrado.");
        return;
      }

      setCheckoutData((current) => ({
        ...current,
        deliveryCep: formatCep(cep),
        deliveryStreet: data.logradouro || current.deliveryStreet,
        deliveryNeighborhood: data.bairro || current.deliveryNeighborhood,
        deliveryCity: data.localidade || current.deliveryCity,
        deliveryState: data.uf || current.deliveryState
      }));
      setCepMessage("CEP preenchido.");
    } catch {
      setCepMessage("Não foi possível buscar o CEP agora.");
    }
  }

  function useSavedAddress(address: CustomerAddress) {
    setSelectedAddressId(address.id);
    setManualAddressOpen(false);
    setCheckoutData((current) => ({
      ...current,
      deliveryCep: address.cep,
      deliveryStreet: address.street,
      deliveryNumber: address.number,
      deliveryComplement: address.complement,
      deliveryNeighborhood: address.neighborhood,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryNotes: address.notes || current.deliveryNotes
    }));
    setCepMessage(`${address.label} aplicado.`);
  }

  function useManualAddress() {
    setSelectedAddressId("");
    setManualAddressOpen(true);
    setCepMessage("");
    setCheckoutData((current) => ({
      ...current,
      deliveryCep: "",
      deliveryStreet: "",
      deliveryNumber: "",
      deliveryComplement: "",
      deliveryNeighborhood: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryNotes: ""
    }));
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lines.length === 0) {
      setMessage("Adicione um produto ao carrinho antes de finalizar.");
      return;
    }
    if (!user) {
      setMessage("Entre na sua conta para finalizar.");
      return;
    }
    if (![1, 2, 3].every((step) => canContinue(step))) {
      setMessage("Revise os dados das etapas anteriores antes de finalizar.");
      return;
    }

    setSubmitting(true);

    const selectedPickupPoint = availablePickupPoints.find((point) => point.id === checkoutData.pickupPoint);
    const deliveryMethod = deliveryOptions.find((option) => option.id === checkoutData.deliveryMethod)?.title || checkoutData.deliveryMethod;
    const paymentMethod = paymentOptions.find((option) => option.id === checkoutData.paymentMethod)?.title || checkoutData.paymentMethod;
    const formattedDeliveryAddress = formatCheckoutAddress(checkoutData);

    try {
      const idToken = await user.getIdToken();
      const response = await apiFetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: lines.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          couponCode: appliedCoupon?.code || "",
          customer: {
            name: checkoutData.name,
            email: checkoutData.email,
            phone: checkoutData.phone,
            document: checkoutData.document
          },
          delivery: {
            method: deliveryMethod,
            pickupPoint: selectedPickupPoint ? `${selectedPickupPoint.title} - ${selectedPickupPoint.address}` : "",
            pickupSchedule: selectedPickupPoint ? `${selectedPickupPoint.weekdayHours}; ${selectedPickupPoint.weekendHours}` : "",
            address: formattedDeliveryAddress,
            addressData: {
              cep: checkoutData.deliveryCep,
              street: checkoutData.deliveryStreet,
              number: checkoutData.deliveryNumber,
              complement: checkoutData.deliveryComplement,
              neighborhood: checkoutData.deliveryNeighborhood,
              city: checkoutData.deliveryCity,
              state: checkoutData.deliveryState
            },
            notes: checkoutData.deliveryNotes
          },
          paymentMethod: checkoutData.paymentMethod
        })
      });

      const result = await response.json() as {
        error?: string;
        orderId?: string;
        orderCode?: string;
        checkoutUrl?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível registrar o pedido agora.");
      }

      setMessage("");
      clearCart();

      if (checkoutData.paymentMethod === "checkout") {
        if (!result.checkoutUrl) throw new Error("A Stripe não retornou o endereço de pagamento.");
        await openExternal(result.checkoutUrl);
        return;
      }

      setSuccessOrderId(result.orderId || "");
      setSuccessOrderCode(result.orderCode || result.orderId || "");
      setCurrentStep(1);
      setCheckoutData((current) => ({
        ...current,
        phone: "",
        document: "",
        deliveryCep: "",
        deliveryStreet: "",
        deliveryNumber: "",
        deliveryComplement: "",
        deliveryNeighborhood: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryNotes: "",
        deliveryMethod: "retirada-ponto",
        pickupPoint: availablePickupPoints[0]?.id || pickupPoints[0].id,
        paymentMethod: "checkout"
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("não está mais disponível")) {
        setMessage(errorMessage);
        clearCart();
      } else if (errorMessage.includes("limite de uso")) {
        setMessage(errorMessage);
        clearCoupon();
      } else if (errorMessage.includes("cupom não está mais disponível")) {
        setMessage(errorMessage);
        clearCoupon();
      } else {
        setMessage(errorMessage || "Não foi possível registrar o pedido agora.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Checkout | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Carrinho", href: "/carrinho" }, { label: "Checkout" }]} />
      <section className="container-page checkout-page" ref={flowRef}>
        <CustomerAuthGate message="Para finalizar uma compra, entre ou crie uma conta. Assim o pedido fica vinculado ao seu histórico.">
          {successOrderId ? (
            <SuccessPanel orderCode={successOrderCode || successOrderId} />
          ) : (
          lines.length === 0 ? (
            <div className="mt-6 border border-line bg-white p-8 text-center">
              <h1 className="text-xl font-semibold">Carrinho vazio</h1>
              <p className="mt-2 text-gray-600">Volte ao catálogo e adicione um produto antes de finalizar.</p>
              {message ? <p className="mx-auto mt-4 max-w-xl border border-line bg-gray-50 px-4 py-3 text-sm font-medium text-ink">{message}</p> : null}
              <Link className="mt-5 inline-flex rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite" href="/catalogo">
                Ver catálogo
              </Link>
            </div>
          ) : (
          <div className="mx-auto grid w-full max-w-6xl gap-5">
            <header className="checkout-page__header overflow-hidden border border-line bg-white shadow-[0_14px_40px_rgba(17,24,39,0.05)]">
              <div className="bg-ink px-5 py-6 text-white md:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Checkout seguro</p>
                    <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{steps[currentStep - 1].title}</h1>
                    <p className="mt-2 text-sm text-white/70">{steps[currentStep - 1].description}</p>
                  </div>
                  <p className="text-sm font-medium text-white/70">Passo {currentStep} de {steps.length}</p>
                </div>
              </div>
              <Stepper currentStep={currentStep} />
            </header>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <CheckoutBlock key={currentStep} title={steps[currentStep - 1].title} description={steps[currentStep - 1].description}>
                {currentStep === 1 ? (
                  <IdentificationStep checkoutData={checkoutData} updateField={updateField} />
                ) : null}
                {currentStep === 2 ? (
                  <DeliveryStep availablePickupPoints={availablePickupPoints} cepMessage={cepMessage} checkoutData={checkoutData} customerAddresses={customerAddresses} lookupCep={lookupCheckoutCep} manualAddressOpen={manualAddressOpen} selectedAddressId={selectedAddressId} updateField={updateField} useManualAddress={useManualAddress} useSavedAddress={useSavedAddress} />
                ) : null}
                {currentStep === 3 ? (
                  <PaymentStep checkoutData={checkoutData} updateField={updateField} />
                ) : null}
                {currentStep === 4 ? (
                  <ReviewStep
                    appliedCoupon={appliedCoupon}
                    applyCoupon={applyCoupon}
                    changeStep={changeStep}
                    checkoutData={checkoutData}
                    clearCoupon={clearCoupon}
                    discount={discount}
                    lines={lines}
                    subtotal={subtotal}
                    total={total}
                  />
                ) : null}
              </CheckoutBlock>

              {message ? <p className="border border-line bg-gray-50 px-4 py-3 text-sm font-medium text-ink">{message}</p> : null}

              <div className="flex flex-col-reverse gap-3 border border-line bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.035)] sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-line bg-white px-5 text-sm font-semibold hover:border-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  disabled={currentStep === 1 || submitting}
                  onClick={() => changeStep(Math.max(1, currentStep - 1))}
                  type="button"
                >
                  <ArrowLeft size={17} />
                  Voltar
                </button>
                {currentStep < 4 ? (
                  <button className="inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-ink px-7 text-sm font-semibold text-white hover:bg-graphite sm:w-auto" onClick={nextStep} type="button">
                    {currentStep === 3 ? "Revisar pedido" : "Continuar"}
                  </button>
                ) : (
                  <div className="grid w-full gap-2 sm:w-auto sm:text-right">
                    <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-ink px-7 text-sm font-semibold text-white hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" disabled={submitting || lines.length === 0} type="submit">
                      <ActionButtonContent
                        state={submitting ? "loading" : message ? "error" : "idle"}
                        idleIcon={<LockKeyhole size={17} />}
                        idleLabel={checkoutData.paymentMethod === "checkout" ? "Ir para pagamento seguro" : "Confirmar pedido"}
                        loadingLabel={checkoutData.paymentMethod === "checkout" ? "Abrindo pagamento..." : "Confirmando pedido..."}
                        successLabel="Pedido confirmado"
                      />
                    </button>
                    <span className="text-xs text-gray-500">
                      {checkoutData.paymentMethod === "checkout" ? "Você será direcionado para a Stripe." : "Nenhuma cobrança será feita agora."}
                    </span>
                  </div>
                )}
              </div>
            </form>
          </div>
          )
          )}
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid grid-cols-2 border-t border-line bg-white md:grid-cols-4">
      {steps.map((step) => {
        const Icon = step.icon;
        const active = currentStep === step.id;
        const done = currentStep > step.id;

        return (
          <div key={step.id} className={`flex min-h-[76px] items-center gap-3 border-b border-r border-line px-4 py-3 last:border-r-0 md:border-b-0 ${active ? "bg-white" : done ? "bg-green-50/70" : "bg-gray-50"}`}>
            <span className={`grid size-9 shrink-0 place-items-center ${active ? "bg-ink text-white" : done ? "bg-brand-green text-white" : "border border-line bg-white text-gray-400"}`}>
              {done ? <Check size={16} /> : <Icon size={16} />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase leading-none text-gray-500">Passo {step.id}</p>
              <p className="mt-1 truncate text-sm font-semibold leading-tight">{step.title}</p>
              <span className={`mt-2 block h-0.5 w-8 ${active ? "bg-ink" : done ? "bg-brand-green" : "bg-line"}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IdentificationStep({ checkoutData, updateField }: StepProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input className="rounded-sm border border-line px-4 py-3" onChange={(event) => updateField("name", event.target.value)} placeholder="Nome completo" required value={checkoutData.name} />
      <input className="rounded-sm border border-line px-4 py-3" onChange={(event) => updateField("email", event.target.value)} placeholder="E-mail" required type="email" value={checkoutData.email} />
      <input className="rounded-sm border border-line px-4 py-3" inputMode="numeric" onChange={(event) => updateField("phone", formatPhone(event.target.value))} placeholder="Telefone / WhatsApp" required type="tel" value={checkoutData.phone} />
      <input className="rounded-sm border border-line px-4 py-3" inputMode="numeric" onChange={(event) => updateField("document", formatCpf(event.target.value))} placeholder="CPF (opcional)" value={checkoutData.document} />
    </div>
  );
}

function DeliveryStep({
  availablePickupPoints,
  cepMessage,
  checkoutData,
  customerAddresses,
  lookupCep,
  manualAddressOpen,
  selectedAddressId,
  updateField,
  useManualAddress,
  useSavedAddress
}: StepProps & {
  availablePickupPoints: typeof pickupPoints;
  cepMessage: string;
  customerAddresses: CustomerAddress[];
  lookupCep: () => void;
  manualAddressOpen: boolean;
  selectedAddressId: string;
  useManualAddress: () => void;
  useSavedAddress: (address: CustomerAddress) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        {deliveryOptions.map((option) => {
          const pickupUnavailable = option.id === "retirada-ponto" && availablePickupPoints.length === 0;
          return (
            <RadioCard
              checked={checkoutData.deliveryMethod === option.id}
              disabled={pickupUnavailable}
              key={option.id}
              name="deliveryMethod"
              onChange={() => updateField("deliveryMethod", option.id)}
              text={pickupUnavailable ? "Os itens do carrinho não possuem um ponto de retirada em comum." : option.text}
              title={option.title}
              value={option.id}
            />
          );
        })}
      </div>

      {checkoutData.deliveryMethod === "retirada-ponto" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {availablePickupPoints.map((point) => (
            <RadioCard
              checked={checkoutData.pickupPoint === point.id}
              key={point.id}
              name="pickupPoint"
              onChange={() => updateField("pickupPoint", point.id)}
              text={`${point.address}. ${point.description}`}
              title={point.title}
              value={point.id}
              details={[
                point.weekdayHours,
                point.weekendHours
              ]}
            />
          ))}
          {availablePickupPoints.length === 0 ? (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 md:col-span-2">
              Nenhum ponto de retirada atende todos os itens do carrinho. Escolha entrega local ou motoboy para combinar o envio.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          {customerAddresses.length ? (
            <div className="grid gap-2">
              <div>
                <p className="text-sm font-medium">Escolha onde receber</p>
                <p className="mt-1 text-sm text-gray-600">Seus endereços salvos na conta já estão prontos para usar.</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {customerAddresses.map((address) => (
                  <button
                    key={address.id}
                    className={`flex items-start gap-3 border p-4 text-left text-sm transition ${selectedAddressId === address.id && !manualAddressOpen ? "border-ink bg-white ring-2 ring-ink/10" : "border-line bg-gray-50 hover:border-ink hover:bg-white"}`}
                    onClick={() => useSavedAddress(address)}
                    type="button"
                  >
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${selectedAddressId === address.id && !manualAddressOpen ? "border-ink bg-ink text-white" : "border-gray-300 bg-white"}`}>
                      {selectedAddressId === address.id && !manualAddressOpen ? <Check size={12} /> : null}
                    </span>
                    <span>
                      <strong className="block">{address.label}</strong>
                      <span className="mt-1 block leading-6 text-gray-600">{formatCustomerAddress(address)}</span>
                    </span>
                  </button>
                ))}
                <button
                  className={`flex items-start gap-3 border p-4 text-left text-sm transition ${manualAddressOpen ? "border-ink bg-white ring-2 ring-ink/10" : "border-line bg-gray-50 hover:border-ink hover:bg-white"}`}
                  onClick={useManualAddress}
                  type="button"
                >
                  <span className="grid size-9 shrink-0 place-items-center bg-white text-ink"><Plus size={17} /></span>
                  <span>
                    <strong className="block">Usar outro endereço</strong>
                    <span className="mt-1 block leading-6 text-gray-600">Preencher um endereço diferente somente para este pedido.</span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {manualAddressOpen || customerAddresses.length === 0 ? <div className="grid gap-3 border border-line bg-gray-50 p-4">
            {customerAddresses.length ? <h3 className="font-semibold">Outro endereço</h3> : (
              <div>
                <h3 className="font-semibold">Endereço de entrega</h3>
                <p className="mt-1 text-sm text-gray-600">Você ainda não possui endereços salvos na conta.</p>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input className="rounded-sm border border-line bg-white px-4 py-3" inputMode="numeric" onChange={(event) => updateField("deliveryCep", formatCep(event.target.value))} placeholder="CEP" value={checkoutData.deliveryCep} />
              <button className="rounded-sm bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-graphite" onClick={lookupCep} type="button">Buscar CEP</button>
            </div>
            {cepMessage ? <p className="text-sm text-gray-600">{cepMessage}</p> : null}
            <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => updateField("deliveryStreet", event.target.value)} placeholder="Rua" value={checkoutData.deliveryStreet} />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => updateField("deliveryNumber", event.target.value)} placeholder="Número" value={checkoutData.deliveryNumber} />
              <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => updateField("deliveryComplement", event.target.value)} placeholder="Complemento" value={checkoutData.deliveryComplement} />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => updateField("deliveryCity", event.target.value)} placeholder="Cidade" value={checkoutData.deliveryCity} />
              <input className="rounded-sm border border-line bg-white px-4 py-3 uppercase" onChange={(event) => updateField("deliveryState", event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" value={checkoutData.deliveryState} />
            </div>
            <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => updateField("deliveryNeighborhood", event.target.value)} placeholder="Bairro" value={checkoutData.deliveryNeighborhood} />
          </div> : (
            <div className="border border-green-100 bg-green-50 p-4 text-sm text-brand-green">
              Endereço selecionado. Você pode continuar sem preencher os dados novamente.
            </div>
          )}
        </div>
      )}

      <textarea
        className="min-h-24 rounded-sm border border-line px-4 py-3"
        onChange={(event) => updateField("deliveryNotes", event.target.value)}
        placeholder="Observações: melhor horário, referência, bairro ou combinados"
        value={checkoutData.deliveryNotes}
      />
      {checkoutData.deliveryMethod === "retirada-ponto" ? (
        <div className="border border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
          O atendimento acontece no ponto combinado, dentro dos horários informados.
        </div>
      ) : null}
    </div>
  );
}

function PaymentStep({ checkoutData, updateField }: StepProps) {
  const isPickup = checkoutData.deliveryMethod === "retirada-ponto";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        {paymentOptions.map((option) => (
          <RadioCard
            checked={checkoutData.paymentMethod === option.id}
            disabled={option.id === "presencial" && !isPickup}
            key={option.id}
            name="paymentMethod"
            onChange={() => updateField("paymentMethod", option.id)}
            text={option.text}
            title={option.title}
            value={option.id}
          />
        ))}
      </div>
      <div className="rounded-sm border border-line bg-gray-50 p-4 text-sm leading-6 text-gray-600">
        Na próxima etapa você revisará todos os dados, itens e valores. O pagamento só começa depois da sua confirmação final.
      </div>
    </div>
  );
}

function RadioCard({ checked, details = [], disabled = false, name, onChange, text, title, value }: { checked: boolean; details?: string[]; disabled?: boolean; name: string; onChange: () => void; text: string; title: string; value: string }) {
  return (
    <label className={`border p-4 transition ${disabled ? "cursor-not-allowed border-line bg-gray-100 opacity-60" : checked ? "cursor-pointer border-ink bg-white ring-2 ring-ink/10" : "cursor-pointer border-line bg-gray-50 hover:border-ink hover:bg-white"}`}>
      <input checked={checked} className="sr-only" disabled={disabled} name={name} onChange={onChange} type="radio" value={value} />
      <span className="flex items-start gap-3">
        <span className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border ${checked ? "border-ink bg-ink" : "border-gray-300 bg-white"}`}>
          {checked ? <span className="size-2 rounded-full bg-white" /> : null}
        </span>
        <span>
          <span className="block font-semibold text-ink">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-gray-600">{text}</span>
          {details.length ? (
            <span className="mt-3 grid gap-1 text-xs font-medium text-gray-600">
              {details.map((detail) => (
                <span key={detail} className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {detail}
                </span>
              ))}
            </span>
          ) : null}
          {disabled ? <span className="mt-2 block text-xs font-medium text-gray-500">Apenas para retirada.</span> : null}
        </span>
      </span>
    </label>
  );
}

function ReviewStep({
  appliedCoupon,
  applyCoupon,
  changeStep,
  checkoutData,
  clearCoupon,
  discount,
  lines,
  subtotal,
  total
}: {
  appliedCoupon: ReturnType<typeof useCart>["appliedCoupon"];
  applyCoupon: ReturnType<typeof useCart>["applyCoupon"];
  changeStep: (step: number) => void;
  checkoutData: CheckoutData;
  clearCoupon: ReturnType<typeof useCart>["clearCoupon"];
  discount: number;
  lines: ReturnType<typeof useCart>["lines"];
  subtotal: number;
  total: number;
}) {
  const selectedPickupPoint = pickupPoints.find((point) => point.id === checkoutData.pickupPoint);
  const deliveryLabel = deliveryOptions.find((option) => option.id === checkoutData.deliveryMethod)?.title || "A combinar";
  const paymentLabel = paymentOptions.find((option) => option.id === checkoutData.paymentMethod)?.title || "A combinar";
  const deliveryDetail = checkoutData.deliveryMethod === "retirada-ponto"
    ? selectedPickupPoint?.address || "Ponto a confirmar"
    : formatCheckoutAddress(checkoutData);

  return (
    <div className="grid gap-6">
      <div className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-brand-blue">
        Confira com calma. Nada será cobrado até você usar o botão de pagamento no final da página.
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ReviewCard
          action={() => changeStep(1)}
          icon={UserRound}
          label="Contato"
          lines={[checkoutData.name, checkoutData.email, checkoutData.phone, checkoutData.document].filter(Boolean)}
        />
        <ReviewCard
          action={() => changeStep(2)}
          icon={MapPin}
          label={deliveryLabel}
          lines={[deliveryDetail, checkoutData.deliveryNotes].filter(Boolean)}
        />
        <ReviewCard
          action={() => changeStep(3)}
          icon={CreditCard}
          label="Pagamento"
          lines={[
            paymentLabel,
            checkoutData.paymentMethod === "checkout" ? "Checkout seguro processado pela Stripe" : "Pagamento feito no momento da retirada"
          ]}
        />
      </div>

      <OrderSummary
        appliedCoupon={appliedCoupon}
        applyCoupon={applyCoupon}
        checkoutData={checkoutData}
        clearCoupon={clearCoupon}
        discount={discount}
        lines={lines}
        subtotal={subtotal}
        total={total}
      />
    </div>
  );
}

function ReviewCard({ action, icon: Icon, label, lines }: { action: () => void; icon: typeof UserRound; label: string; lines: string[] }) {
  return (
    <section className="grid content-start gap-3 border border-line bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <Icon size={17} />
          {label}
        </span>
        <button className="text-xs font-semibold text-brand-blue hover:underline" onClick={action} type="button">
          Editar
        </button>
      </div>
      <div className="grid gap-1 text-sm leading-6 text-gray-600">
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </section>
  );
}

function OrderSummary({ appliedCoupon, applyCoupon, checkoutData, clearCoupon, discount, lines, subtotal, total }: { appliedCoupon: ReturnType<typeof useCart>["appliedCoupon"]; applyCoupon: ReturnType<typeof useCart>["applyCoupon"]; checkoutData: CheckoutData; clearCoupon: ReturnType<typeof useCart>["clearCoupon"]; discount: number; lines: ReturnType<typeof useCart>["lines"]; subtotal: number; total: number }) {
  const selectedPickupPoint = pickupPoints.find((point) => point.id === checkoutData.pickupPoint);
  const deliveryLabel = deliveryOptions.find((option) => option.id === checkoutData.deliveryMethod)?.title || "A combinar";
  const paymentLabel = paymentOptions.find((option) => option.id === checkoutData.paymentMethod)?.title || "A combinar";
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  async function handleCouponSubmit() {
    const result = await applyCoupon(couponCode);
    setCouponMessage(result);
  }

  return (
    <section className="border border-line bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="grid size-10 place-items-center bg-mist text-ink">
          <PackageCheck size={20} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Resumo do pedido</h2>
          <p className="text-sm text-gray-500">{lines.length} {lines.length === 1 ? "item" : "itens"} no pedido</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="grid content-start gap-3">
          {lines.map((item) => (
            <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border border-line bg-gray-50 p-3" key={item.product.id}>
              <img className="aspect-square w-16 border border-line bg-white object-cover" src={item.product.image} alt={item.product.name} />
              <div className="min-w-0">
                <p className="font-medium leading-5">{item.product.name}</p>
                <p className="mt-1 text-xs text-gray-500">{item.quantity} unidade{item.quantity === 1 ? "" : "s"}</p>
              </div>
              <strong className="text-sm">{formatCurrency(item.lineTotal)}</strong>
            </div>
          ))}

          <div className="grid gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4"><span className="text-gray-600">Produtos</span><strong>{formatCurrency(subtotal)}</strong></div>
            {appliedCoupon ? <div className="flex justify-between gap-4 text-brand-green"><span>Cupom {appliedCoupon.code}</span><strong>-{formatCurrency(discount)}</strong></div> : null}
            <div className="flex justify-between gap-4"><span className="text-gray-600">Entrega</span><strong>{checkoutData.deliveryMethod === "retirada-ponto" ? "Retirada" : "A confirmar"}</strong></div>
            <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3 text-lg"><span className="font-semibold">Total</span><strong>{formatCurrency(total)}</strong></div>
          </div>
        </div>

        <div className="grid content-start gap-4 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="border border-line bg-gray-50 p-3">
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-brand-green">
                  <TicketPercent size={17} />
                  {appliedCoupon.title || appliedCoupon.code}
                </span>
                <button className="grid size-8 place-items-center border border-line bg-white text-gray-500 hover:border-ink hover:text-ink" onClick={clearCoupon} type="button" aria-label="Remover cupom">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
                <input className="rounded-sm border border-line bg-white px-3 py-2 text-sm uppercase" onChange={(event) => setCouponCode(event.target.value)} placeholder="Cupom" value={couponCode} />
                <button className="rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={handleCouponSubmit} type="button">Aplicar</button>
              </div>
            )}
            {couponMessage ? <p className="mt-2 text-sm text-gray-600">{couponMessage}</p> : null}
          </div>

          <div className="grid gap-3 text-sm">
            <SummaryRow label="Entrega" value={deliveryLabel} />
            {checkoutData.deliveryMethod === "retirada-ponto" && selectedPickupPoint ? <SummaryRow label="Ponto" value={selectedPickupPoint.address} /> : null}
            {checkoutData.deliveryMethod === "retirada-ponto" && selectedPickupPoint ? <SummaryRow label="Horários" value={`${selectedPickupPoint.weekdayHours}; ${selectedPickupPoint.weekendHours}`} /> : null}
            {formatCheckoutAddress(checkoutData) ? <SummaryRow label="Endereço" value={formatCheckoutAddress(checkoutData)} /> : null}
            <SummaryRow label="Pagamento" value={paymentLabel} />
          </div>
          <div className="flex gap-2 border border-green-100 bg-green-50 p-3 text-sm leading-6 text-brand-green">
            <ShieldCheck className="mt-0.5 shrink-0" size={17} />
            <span>Ao confirmar, o produto fica reservado para você.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SuccessPanel({ orderCode }: { orderCode: string }) {
  return (
    <div className="mt-6 border border-green-100 bg-white p-6 text-center shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-green-50 text-brand-green">
        <Check size={28} />
      </span>
      <h2 className="mt-4 text-2xl font-semibold">Pedido finalizado com sucesso</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
        Seu pedido foi registrado. Você será direcionado para a página de pedidos para acompanhar status, pagamento e retirada/entrega.
      </p>
      <p className="mt-3 text-sm text-gray-500">Pedido: {orderCode}</p>
      <Link className="mt-5 inline-flex rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-graphite" href="/pedidos">
        Ver meus pedidos
      </Link>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function formatCheckoutAddress(checkoutData: CheckoutData) {
  return [
    checkoutData.deliveryStreet && checkoutData.deliveryNumber ? `${checkoutData.deliveryStreet}, ${checkoutData.deliveryNumber}` : checkoutData.deliveryStreet,
    checkoutData.deliveryComplement,
    checkoutData.deliveryNeighborhood,
    checkoutData.deliveryCity && checkoutData.deliveryState ? `${checkoutData.deliveryCity} - ${checkoutData.deliveryState}` : checkoutData.deliveryCity,
    checkoutData.deliveryCep
  ].filter(Boolean).join(" · ");
}

function formatCustomerAddress(address: CustomerAddress) {
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    address.neighborhood,
    `${address.city}${address.state ? ` - ${address.state}` : ""}`,
    address.cep
  ].filter(Boolean).join(" · ");
}

type StepProps = {
  checkoutData: CheckoutData;
  updateField: (field: keyof CheckoutData, value: string) => void;
};

function CheckoutBlock({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="checkout-step-page min-h-[430px] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.035)] md:p-8">
      <div className="mb-7 flex items-center gap-4 border-b border-line pb-5">
        <span className="grid size-11 shrink-0 place-items-center bg-mist text-ink">
          <PackageCheck size={20} />
        </span>
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
