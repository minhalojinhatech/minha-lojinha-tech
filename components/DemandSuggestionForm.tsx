import { FormEvent, useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { formatPhone } from "@/lib/inputMasks";
import { apiFetch } from "@/lib/runtime";

export function DemandSuggestionForm({ compact = false }: { compact?: boolean }) {
  const { user } = useAuthContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.displayName || "");
    setEmail(user?.email || "");
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setMessage("");
    try {
      const token = user ? await user.getIdToken() : "";
      const response = await apiFetch("/api/demand/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          brand: data.get("brand"),
          model: data.get("model"),
          notes: data.get("notes"),
          customerName: name,
          customerEmail: email,
          customerPhone: phone
        })
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
      setMessage(result.message || "Sugestão enviada.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={`demand-suggestion ${compact ? "is-compact" : ""}`} onSubmit={handleSubmit}>
      <div>
        <span><Lightbulb size={20} /></span>
        <div><strong>Não encontrou o aparelho?</strong><p>Sugira um modelo para a loja analisar e incluir nesta lista.</p></div>
      </div>
      <div className="demand-suggestion__fields">
        <input name="brand" placeholder="Marca" required />
        <input name="model" placeholder="Modelo" required />
        <textarea name="notes" placeholder="Observações opcionais" />
        <input onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required value={name} />
        <input onChange={(event) => setEmail(event.target.value)} placeholder="Seu e-mail" type="email" value={email} />
        <input inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="Seu WhatsApp" value={phone} />
      </div>
      {message ? <p className="demand-suggestion__message">{message}</p> : null}
      <button disabled={saving} type="submit">{saving ? "Enviando..." : "Enviar sugestão"}</button>
    </form>
  );
}
