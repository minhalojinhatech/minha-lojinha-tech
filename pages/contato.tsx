import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowRight, Clock3, Mail, MessageCircle, PackageSearch, Smartphone } from "lucide-react";
import { Layout, Breadcrumb } from "@/components/Layout";
import { collections, db } from "@/lib/firebase";
import { formatPhone } from "@/lib/inputMasks";
import { siteConfig, whatsappUrl } from "@/lib/seo";

export default function Contato() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setSubmitting(true);

    try {
      await addDoc(collection(db, collections.serviceRequests), {
        customerId: "",
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        orderId: "",
        orderCode: "Contato pelo site",
        productId: "",
        type: "Contato",
        reason: subject.trim(),
        description: messageText.trim(),
        contactPreference: phone.trim() ? "WhatsApp" : "E-mail",
        availability: "",
        status: "Aguardando confirmação",
        createdAt: serverTimestamp()
      });

      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessageText("");
      setFeedback("Mensagem enviada. A loja responderá pelo contato informado.");
    } catch {
      setFeedback("Não foi possível enviar agora. Você também pode chamar pelo WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout
      title="Contato | Minha Lojinha Tech"
      description="Fale com a Minha Lojinha Tech pelo WhatsApp ou e-mail para tirar dúvidas sobre produtos, pedidos, retirada, entrega local e disponibilidade."
      canonicalPath="/contato"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contato" }]} />
      <section className="container-page contact-page">
        <header className="contact-hero">
          <div><span className="retail-eyebrow retail-eyebrow--light"><span /> Fale com a loja</span><h1>O melhor canal depende do que você precisa resolver.</h1><p>A Mika organiza o primeiro atendimento. Para conversas diretas, você também pode usar WhatsApp ou e-mail.</p><button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">Abrir conversa com a Mika <ArrowRight size={17} /></button></div>
          <img src="/mika-atualizada-v2.webp" alt="Ilustração da Mika, assistente virtual da Minha Lojinha Tech" />
        </header>

        <section className="contact-channels">
          <button onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button"><MessageCircle size={22} /><strong>Mika no site</strong><span>Produtos, venda de aparelho, pedidos e assistência.</span></button>
          <a href={whatsappUrl("Olá, vim pelo site da Minha Lojinha Tech.")}><Smartphone size={22} /><strong>WhatsApp</strong><span>Conversa direta quando o caso já está encaminhado.</span></a>
          <a href={`mailto:${siteConfig.email}`}><Mail size={22} /><strong>E-mail</strong><span>Mensagens detalhadas, documentos e assuntos menos urgentes.</span></a>
        </section>

        <div className="contact-page__grid">
          <aside>
            <span className="retail-eyebrow"><span /> Antes de enviar</span><h2>Ajude a gente a responder mais rápido.</h2>
            <div><PackageSearch size={19} /><p>Para pedidos, informe o código ou produto comprado.</p></div>
            <div><Smartphone size={19} /><p>Para assistência, informe marca, modelo e o que aconteceu.</p></div>
            <div><Clock3 size={19} /><p>Inclua o melhor horário para retorno quando necessário.</p></div>
          </aside>
          <form onSubmit={handleSubmit}>
            <div><span className="retail-eyebrow"><span /> Mensagem direta</span><h2>Escreva para a loja</h2></div>
            <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => setName(event.target.value)} placeholder="Nome" required value={name} />
            <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" required type="email" value={email} />
            <input className="rounded-sm border border-line bg-white px-4 py-3" inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="WhatsApp" type="tel" value={phone} />
            <input className="rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => setSubject(event.target.value)} placeholder="Assunto" required value={subject} />
            <textarea className="min-h-36 rounded-sm border border-line bg-white px-4 py-3" onChange={(event) => setMessageText(event.target.value)} placeholder="Mensagem" required value={messageText} />
            {feedback ? <p className="border border-line bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{feedback}</p> : null}
            <button className="rounded-sm bg-ink px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Enviando..." : "Enviar mensagem"}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
