import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Check, CircleUserRound, LockKeyhole, PackageCheck, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getFriendlyAuthError, getPasswordPolicyChecks, loginWithEmail, loginWithGoogle, passwordPolicy, registerWithEmail } from "@/lib/auth";
import { formatPhone } from "@/lib/inputMasks";
import { useAuthUser } from "@/lib/useAuthUser";
import { isDesktopBuild } from "@/lib/runtime";

export default function Login() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);
  const passwordChecks = getPasswordPolicyChecks(password);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/conta");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        setMessageType("success");
        setMessage("Login realizado. Redirecionando...");
      } else {
        await registerWithEmail(email, password, { fullName, phone });
        setMessageType("success");
        setMessage("Conta criada. Redirecionando...");
      }
      await router.push("/");
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setMessage("");
    setSubmitting(true);
    try {
      await loginWithGoogle();
      setMessageType("success");
      setMessage("Login com Google realizado. Redirecionando...");
      await router.push("/");
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Login | Minha Lojinha Tech" noindex>
      <section className="container-page auth-page">
        <div className="auth-page__shell">
          <aside className="auth-page__intro">
            <span className="retail-eyebrow retail-eyebrow--light"><span /> Sua área na lojinha</span>
            <h1>Uma conta para acompanhar tudo com tranquilidade.</h1>
            <p>Pedidos, endereços, garantias e atendimento ficam organizados em um só lugar.</p>
            <div className="auth-page__benefits">
              <AuthBenefit icon={PackageCheck} title="Pedidos organizados" text="Acompanhe cada etapa da compra." />
              <AuthBenefit icon={ShieldCheck} title="Garantias vinculadas" text="Produtos e reparos associados à sua conta." />
              <AuthBenefit icon={Smartphone} title="Checkout mais rápido" text="Dados e endereços prontos para usar." />
            </div>
            <div className="auth-page__security"><LockKeyhole size={17} /> Seus dados de acesso são protegidos pelo Firebase Authentication.</div>
          </aside>

          <div className="auth-page__form">
            <div className="auth-page__form-head">
              <span className="grid size-11 place-items-center rounded-lg bg-blue-50 text-brand-blue"><UserRound size={21} /></span>
              <div>
                <p>{mode === "login" ? "Bem-vindo de volta" : "Primeira vez por aqui?"}</p>
                <h2>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>
              </div>
            </div>

            <div className="auth-page__tabs">
              <button className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")} type="button">Entrar</button>
              <button className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")} type="button">Criar conta</button>
            </div>

            <form onSubmit={handleSubmit}>
              {message ? (
                <p className={`auth-page__message ${messageType === "success" ? "is-success" : "is-error"}`}>{message}</p>
              ) : null}
              {mode === "register" ? (
                <div className="auth-page__row">
                  <label>Nome completo<input disabled={submitting} onChange={(event) => setFullName(event.target.value)} placeholder="Nome e sobrenome" required type="text" value={fullName} /></label>
                  <label>WhatsApp<input disabled={submitting} inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(11) 99999-9999" required type="tel" value={phone} /></label>
                </div>
              ) : null}
              <label>E-mail<input disabled={submitting} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@email.com" required type="email" value={email} /></label>
              <label>
                Senha
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={submitting}
                  maxLength={mode === "register" ? passwordPolicy.maxLength : undefined}
                  minLength={mode === "register" ? passwordPolicy.minLength : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "register" ? "Crie uma senha segura" : "Sua senha"}
                  required
                  type="password"
                  value={password}
                />
              </label>
              {mode === "register" ? (
                <div className="auth-page__password-policy" aria-label="Requisitos da senha">
                  {passwordChecks.map((item) => (
                    <span className={item.valid ? "is-valid" : ""} key={item.id}>
                      <Check size={13} /> {item.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <button className="auth-page__primary" disabled={submitting} type="submit">
                {submitting ? "Processando..." : mode === "login" ? "Entrar na minha conta" : "Criar minha conta"}
              </button>
            </form>

            {isDesktopBuild ? (
              <p className="auth-page__note"><Check size={15} /> No aplicativo, entre com e-mail e senha. O login Google permanece disponível no site.</p>
            ) : (
              <>
                <div className="auth-page__divider"><span>ou continue com</span></div>
                <button className="auth-page__google" disabled={submitting} onClick={handleGoogleLogin} type="button">
                  <CircleUserRound size={18} /> {submitting ? "Aguarde..." : "Google"}
                </button>
                <p className="auth-page__note"><Check size={15} /> Use sempre o mesmo método escolhido ao criar sua conta.</p>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function AuthBenefit({ icon: Icon, title, text }: { icon: typeof PackageCheck; title: string; text: string }) {
  return <div><span><Icon size={19} /></span><div><strong>{title}</strong><p>{text}</p></div></div>;
}
