import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Breadcrumb, Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/runtime";

type SessionStatus = {
  orderCode?: string;
  paid?: boolean;
  paymentStatus?: string;
  error?: string;
};

export default function PaymentSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = typeof router.query.session_id === "string" ? router.query.session_id : "";
    if (!router.isReady || !sessionId) return;

    let cancelled = false;
    let attempts = 0;

    const checkPayment = async () => {
      attempts += 1;
      try {
        const response = await apiFetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
        const result = await response.json() as SessionStatus;
        if (cancelled) return;

        setStatus(result);
        setLoading(false);

        if (!result.paid && attempts < 6) {
          window.setTimeout(checkPayment, 1500);
        }
      } catch {
        if (cancelled) return;
        setStatus({ error: "Não foi possível confirmar o pagamento agora." });
        setLoading(false);
      }
    };

    checkPayment();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.session_id]);

  const paid = status.paid === true;
  const failed = Boolean(status.error);

  return (
    <Layout title={`${paid ? "Pagamento confirmado" : "Confirmando pagamento"} | Minha Lojinha Tech`} noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Pagamento" }]} />
      <section className="container-page">
        <div className="mx-auto max-w-2xl border border-line bg-white p-6 text-center shadow-[0_10px_30px_rgba(17,24,39,0.04)] md:p-10">
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${paid ? "bg-brand-green text-white" : failed ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
            {paid ? <Check className="animate-[action-pop_.32s_ease-out]" size={32} /> : failed ? <AlertCircle size={32} /> : <LoaderCircle className="action-button__spinner" size={32} />}
          </span>
          <h1 className="mt-5 text-3xl font-semibold">
            {paid ? "Pagamento confirmado" : loading ? "Confirmando seu pagamento" : "Pagamento em processamento"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-600">
            {paid
              ? "Tudo certo. O pagamento foi confirmado e o pedido já está atualizado na sua conta."
              : status.error || "A Stripe ainda está processando a confirmação. O status também será atualizado automaticamente pelo webhook."}
          </p>
          {status.orderCode ? <p className="mt-3 text-sm font-medium text-gray-500">Pedido: {status.orderCode}</p> : null}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite" href="/pedidos">
              Ver meu pedido
            </Link>
            <Link className="rounded-sm border border-line bg-white px-5 py-3 text-sm font-semibold hover:border-ink" href="/">
              Voltar à loja
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
