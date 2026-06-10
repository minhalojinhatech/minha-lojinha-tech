import { FormEvent, useState, type ComponentType } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowDown, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { ActionButtonContent, type ActionButtonState } from "@/components/ActionButtonContent";
import { Breadcrumb, Layout } from "@/components/Layout";
import { collections, db } from "@/lib/firebase";
import { formatPhone } from "@/lib/inputMasks";

type Feature = {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
};

type CollaborationPageProps = {
  kind: "Parceria" | "Candidatura";
  canonicalPath: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroButton: string;
  featureEyebrow: string;
  featureTitle: string;
  featureDescription: string;
  features: Feature[];
  valuesEyebrow: string;
  valuesTitle: string;
  valuesDescription: string;
  values: string[];
  formEyebrow: string;
  formTitle: string;
  formDescription: string;
  submitLabel: string;
  successLabel: string;
  categories: string[];
};

export function CollaborationPage(props: CollaborationPageProps) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [message, setMessage] = useState("");
  const [buttonState, setButtonState] = useState<ActionButtonState>("idle");
  const [feedback, setFeedback] = useState("");

  function scrollToForm() {
    document.getElementById("formulario-colaboracao")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (buttonState === "loading") return;
    setButtonState("loading");
    setFeedback("");

    try {
      await addDoc(collection(db, collections.collaborationSubmissions), {
        kind: props.kind,
        name: name.trim(),
        organization: organization.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        category,
        experience: experience.trim(),
        message: message.trim(),
        status: "Novo",
        read: false,
        archived: false,
        createdAt: serverTimestamp()
      });
      setButtonState("success");
      setFeedback(props.successLabel);
      setName("");
      setOrganization("");
      setEmail("");
      setPhone("");
      setCity("");
      setCategory("");
      setExperience("");
      setMessage("");
    } catch {
      setButtonState("error");
      setFeedback("Não foi possível enviar agora. Revise os dados e tente novamente.");
    }
  }

  return (
    <Layout title={props.title} description={props.description} canonicalPath={props.canonicalPath}>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: props.kind === "Parceria" ? "Parceiros" : "Faça parte" }]} />
      <div className={`container-page collaboration-page ${props.kind === "Candidatura" ? "collaboration-page--team" : ""}`}>
        <section className="collaboration-hero">
          <div className="collaboration-hero__content">
            <span className="retail-eyebrow retail-eyebrow--light"><span /> {props.eyebrow}</span>
            <h1>{props.heroTitle}</h1>
            <p>{props.heroDescription}</p>
            <button onClick={scrollToForm} type="button">{props.heroButton} <ArrowDown size={18} /></button>
          </div>
          <div className="collaboration-hero__visual" aria-hidden="true">
            <span className="collaboration-hero__orbit collaboration-hero__orbit--one" />
            <span className="collaboration-hero__orbit collaboration-hero__orbit--two" />
            <div><strong>Ideias reais.</strong><span>Conexões que fazem sentido.</span></div>
            <i />
          </div>
        </section>

        <section className="collaboration-section">
          <header className="collaboration-section__header">
            <span className="retail-eyebrow"><span /> {props.featureEyebrow}</span>
            <h2>{props.featureTitle}</h2>
            <p>{props.featureDescription}</p>
          </header>
          <div className="collaboration-feature-grid">
            {props.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title}>
                  <span className="collaboration-feature-grid__number">0{index + 1}</span>
                  <div className="collaboration-feature-grid__icon"><Icon size={23} /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="collaboration-values">
          <div>
            <span className="retail-eyebrow retail-eyebrow--light"><span /> {props.valuesEyebrow}</span>
            <h2>{props.valuesTitle}</h2>
            <p>{props.valuesDescription}</p>
          </div>
          <ul>
            {props.values.map((value) => <li key={value}><CheckCircle2 size={20} /> {value}</li>)}
          </ul>
        </section>

        <section className="collaboration-form-section" id="formulario-colaboracao">
          <aside>
            <span className="retail-eyebrow"><span /> {props.formEyebrow}</span>
            <h2>{props.formTitle}</h2>
            <p>{props.formDescription}</p>
            <div className="collaboration-form-section__note">
              <strong>Conversa direta, sem burocracia.</strong>
              <span>A proposta chega para a equipe da loja e o retorno acontece pelos dados informados.</span>
            </div>
          </aside>

          <form onSubmit={handleSubmit}>
            <div className="collaboration-form__row">
              <label>{props.kind === "Parceria" ? "Nome" : "Nome completo"}
                <input maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} />
              </label>
              {props.kind === "Parceria" ? (
                <label>Empresa ou projeto <small>opcional</small>
                  <input maxLength={140} onChange={(event) => setOrganization(event.target.value)} value={organization} />
                </label>
              ) : (
                <label>Cidade
                  <input maxLength={100} onChange={(event) => setCity(event.target.value)} required value={city} />
                </label>
              )}
            </div>
            <div className="collaboration-form__row">
              <label>E-mail
                <input maxLength={160} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
              </label>
              <label>WhatsApp
                <input inputMode="numeric" maxLength={16} onChange={(event) => setPhone(formatPhone(event.target.value))} required type="tel" value={phone} />
              </label>
            </div>
            <label>{props.kind === "Parceria" ? "Tipo de parceria" : "Área de interesse"}
              <select onChange={(event) => setCategory(event.target.value)} required value={category}>
                <option value="">Selecione uma opção</option>
                {props.categories.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            {props.kind === "Candidatura" ? (
              <label>Experiência <small>opcional</small>
                <textarea maxLength={1200} onChange={(event) => setExperience(event.target.value)} placeholder="Conte brevemente o que você já fez ou está aprendendo." value={experience} />
              </label>
            ) : null}
            <label>Mensagem
              <textarea maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="Conte um pouco sobre a ideia e como imagina essa colaboração." required value={message} />
            </label>
            {feedback ? <p className={`collaboration-form__feedback is-${buttonState}`} role="status">{feedback}</p> : null}
            <button className={`collaboration-form__submit is-${buttonState}`} disabled={buttonState === "loading" || buttonState === "success"} type="submit">
              <ActionButtonContent
                state={buttonState}
                idleLabel={props.submitLabel}
                loadingLabel="Enviando..."
                successLabel="Enviado"
                idleIcon={<Send size={18} />}
              />
              {buttonState === "idle" ? <ArrowRight size={18} /> : null}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
