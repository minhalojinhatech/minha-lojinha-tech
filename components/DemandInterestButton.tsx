import { FormEvent, useEffect, useState } from "react";
import { Bell, Check, Heart, X } from "lucide-react";
import { ActionButtonContent, type ActionButtonState } from "@/components/ActionButtonContent";
import { useAuthContext } from "@/components/AuthProvider";
import { formatPhone } from "@/lib/inputMasks";
import { apiFetch } from "@/lib/runtime";

type Props = {
  modelId: string;
  modelName: string;
  intent?: "interest" | "updates";
  label?: string;
  className?: string;
  onRegistered?: (created: boolean) => void;
};

export function DemandInterestButton({ modelId, modelName, intent = "interest", label, className = "", onRegistered }: Props) {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionState, setActionState] = useState<ActionButtonState>("idle");
  const [registered, setRegistered] = useState(false);
  const storageKey = `demand-${intent}-${modelId}`;

  useEffect(() => {
    if (!open) return;
    setName((current) => current || user?.displayName || "");
    setEmail((current) => current || user?.email || "");
  }, [open, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "registered") {
      setRegistered(true);
      setActionState("success");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user.getIdToken().then((token) => apiFetch(`/api/demand/register-interest?modelId=${encodeURIComponent(modelId)}&intent=${intent}`, {
      headers: { Authorization: `Bearer ${token}` }
    })).then((response) => response.ok ? response.json() : null)
      .then((result: { registered?: boolean } | null) => {
        if (!cancelled && result?.registered) markRegistered();
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [intent, modelId, user]);

  function markRegistered() {
    setRegistered(true);
    setActionState("success");
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "registered");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registered) {
      setOpen(false);
      return;
    }
    setActionState("loading");
    setErrorMessage("");
    try {
      const token = user ? await user.getIdToken() : "";
      const response = await apiFetch("/api/demand/register-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ modelId, intent, customerName: name, customerEmail: email, customerPhone: phone })
      });
      const result = await response.json() as { error?: string; message?: string; created?: boolean };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar agora.");
      markRegistered();
      onRegistered?.(Boolean(result.created));
    } catch (error) {
      setActionState("error");
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível registrar agora.");
    }
  }

  const Icon = intent === "updates" ? Bell : Heart;

  return (
    <>
      <button className={`${className} action-button ${registered ? "is-complete" : ""}`} disabled={registered} onClick={() => setOpen(true)} type="button">
        <ActionButtonContent
          state={registered ? "success" : "idle"}
          idleIcon={<Icon size={17} />}
          idleLabel={label || (intent === "updates" ? "Receber novidades sobre este modelo" : "Tenho interesse")}
          loadingLabel="Registrando..."
          successLabel={intent === "updates" ? "Novidades ativadas" : "Já interessado"}
        />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label={`Interesse em ${modelName}`}>
          <form className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-blue">{intent === "updates" ? "Acompanhar modelo" : "Lista de interesse"}</p>
                <h2 className="mt-2 text-2xl font-semibold">{modelName}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Isso não é uma reserva nem uma compra. Seus dados serão usados apenas para avisar sobre oportunidades deste aparelho.</p>
              </div>
              <button className="grid size-9 shrink-0 place-items-center rounded-full border border-line" onClick={() => setOpen(false)} type="button" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            {!registered ? <div className="mt-5 grid gap-3">
              <input className="rounded-md border border-line px-4 py-3 text-sm" disabled={actionState === "loading"} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required value={name} />
              <input className="rounded-md border border-line px-4 py-3 text-sm" disabled={actionState === "loading"} onChange={(event) => setEmail(event.target.value)} placeholder="Seu e-mail" type="email" value={email} />
              <input className="rounded-md border border-line px-4 py-3 text-sm" disabled={actionState === "loading"} inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="Seu WhatsApp" type="tel" value={phone} />
            </div> : <div className="demand-interest-success"><span><Check size={24} /></span><strong>{intent === "updates" ? "Novidades ativadas" : "Interesse registrado"}</strong><p>Pronto. A loja já pode considerar você quando surgir uma boa oportunidade.</p></div>}
            {errorMessage ? <p className="mt-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
            <button className={`action-button mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 font-semibold text-white ${actionState === "error" ? "bg-red-700" : "bg-ink"}`} disabled={actionState === "loading"} onClick={registered ? () => setOpen(false) : undefined} type={registered ? "button" : "submit"}>
              {registered ? <><X size={18} />Fechar</> : <ActionButtonContent state={actionState} idleIcon={<Icon size={18} />} idleLabel={intent === "updates" ? "Quero receber novidades" : "Confirmar interesse"} loadingLabel="Registrando..." successLabel="Registrado" />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
