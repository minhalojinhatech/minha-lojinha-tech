import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera, CheckCircle2, MessageSquareText, Send, ShieldCheck, Star, X } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { Breadcrumb, Layout } from "@/components/Layout";
import { collections, db, storage } from "@/lib/firebase";
import { fetchReviews } from "@/lib/firestoreData";
import { imageAccept, isSupportedImageFile, prepareImageForUpload } from "@/lib/imageProcessing";
import type { Review } from "@/lib/types";

const contextOptions: Review["context"][] = ["Compra", "Reparo", "Atendimento"];

export default function Avaliacoes() {
  const { user } = useAuthContext();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [context, setContext] = useState<Review["context"]>("Compra");
  const [itemName, setItemName] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"Todas" | Review["context"]>("Todas");

  useEffect(() => {
    fetchReviews()
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.displayName && !customerName) setCustomerName(user.displayName);
  }, [customerName, user]);

  useEffect(() => {
    if (!modalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [modalOpen]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  }, [reviews]);
  const positiveReviews = useMemo(() => reviews.filter((review) => review.rating > 3), [reviews]);
  const complaintReviews = useMemo(() => reviews.filter((review) => review.rating < 3), [reviews]);
  const neutralReviews = useMemo(() => reviews.filter((review) => review.rating === 3), [reviews]);
  const visibleReviews = useMemo(
    () => activeFilter === "Todas" ? reviews : reviews.filter((review) => review.context === activeFilter),
    [activeFilter, reviews]
  );

  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(isSupportedImageFile).slice(0, 3);
    setImages(files);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      const reviewKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
      const uploadedImages = await Promise.all(
        images.map(async (image, index) => {
          const prepared = await prepareImageForUpload(image, `avaliacao-${index + 1}`);
          const imageRef = ref(storage, `reviews/${reviewKey}/foto-${index + 1}.${prepared.extension}`);
          await uploadBytes(imageRef, prepared.file, { contentType: prepared.contentType });
          return getDownloadURL(imageRef);
        })
      );

      const reviewData = {
        customerName: customerName.trim(),
        customerId: user?.uid || "",
        rating,
        context,
        itemName: itemName.trim(),
        comment: comment.trim(),
        images: uploadedImages,
        status: "Pendente" as const,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, collections.reviews), reviewData);
      setRating(5);
      setContext("Compra");
      setItemName("");
      setComment("");
      setImages([]);
      setMessage("Experiência enviada para análise. Ela aparecerá aqui após a publicação pela loja.");
      setModalOpen(false);
    } catch {
      setMessage("Não foi possível enviar sua experiência agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Experiências dos clientes | Minha Lojinha Tech"
      description="Veja experiências positivas, reclamações e relatos reais de clientes da Minha Lojinha Tech sobre compra, reparo, atendimento ou produto adquirido."
      canonicalPath="/avaliacoes"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Experiências" }]} />
      <section className="container-page public-content-page reviews-page">
        <header className="reviews-hero">
          <div className="reviews-hero__copy">
            <span className="retail-eyebrow retail-eyebrow--light"><span /> Opiniões publicadas</span>
            <h1>Experiências reais, sem esconder os pontos de atenção.</h1>
            <p>Relatos de compra, atendimento e assistência técnica. Elogios, críticas e reclamações permanecem organizados no mesmo lugar.</p>
            <button onClick={() => setModalOpen(true)} type="button">
              Enviar minha experiência <MessageSquareText size={18} />
            </button>
          </div>
          <div className="reviews-score">
            <span>Nota média</span>
            <strong>{averageRating ? averageRating.toFixed(1) : "—"}</strong>
            <div aria-label={`${averageRating.toFixed(1)} de 5 estrelas`}>
              {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={value <= Math.round(averageRating) ? "is-active" : ""} size={20} />)}
            </div>
            <p>Baseada em {reviews.length} relato{reviews.length === 1 ? "" : "s"} publicado{reviews.length === 1 ? "" : "s"}</p>
          </div>
        </header>

        {message ? <p className="reviews-message">{message}</p> : null}

        <section className="reviews-overview">
          <div className="reviews-overview__intro">
            <ShieldCheck size={25} />
            <div>
              <strong>Transparência faz parte da compra</strong>
              <p>As experiências só aparecem depois da análise para evitar spam, mas a nota e o conteúdo não são alterados.</p>
            </div>
          </div>
          <div className="reviews-overview__metrics">
            <ExperienceMetric title="Positivas" value={positiveReviews.length} detail="Notas 4 e 5" tone="good" />
            <ExperienceMetric title="Neutras" value={neutralReviews.length} detail="Nota 3" tone="neutral" />
            <ExperienceMetric title="Críticas" value={complaintReviews.length} detail="Notas 1 e 2" tone="bad" />
          </div>
        </section>

        <section className="reviews-content">
          <div className="reviews-content__heading">
            <div>
              <span className="retail-eyebrow"><span /> Relatos recentes</span>
              <h2>O que os clientes contam</h2>
            </div>
            <div className="reviews-filters" aria-label="Filtrar experiências">
              {(["Todas", ...contextOptions] as const).map((filter) => (
                <button className={activeFilter === filter ? "is-active" : ""} key={filter} onClick={() => setActiveFilter(filter)} type="button">{filter}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="reviews-empty">Carregando experiências...</div>
          ) : visibleReviews.length ? (
            <div className="reviews-grid">
              {visibleReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          ) : (
            <div className="reviews-empty">
              <MessageSquareText size={28} />
              <strong>{reviews.length ? "Nenhum relato neste filtro" : "Ainda não há experiências publicadas"}</strong>
              <p>{reviews.length ? "Escolha outra categoria para continuar navegando." : "Você pode ser a primeira pessoa a contar como foi."}</p>
              {!reviews.length ? <button onClick={() => setModalOpen(true)} type="button">Enviar experiência</button> : null}
            </div>
          )}
        </section>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-ink/55 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className="max-h-[92vh] w-full overflow-y-auto border border-line bg-white shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:max-w-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white p-5">
              <div>
                <p className="text-sm font-semibold uppercase text-brand-blue">Enviar experiência</p>
                <h2 id="review-modal-title" className="mt-1 text-2xl font-semibold">Conte como foi</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">Pode ser elogio, reclamação ou ponto de atenção.</p>
              </div>
              <button className="grid size-10 shrink-0 place-items-center rounded-sm border border-line text-ink hover:border-ink" onClick={() => setModalOpen(false)} type="button" aria-label="Fechar envio de experiência">
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Seu nome
                <input className="rounded-sm border border-line px-3 py-3 font-normal" onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome" required value={customerName} />
              </label>

              <div className="grid gap-2 text-sm font-medium">
                Nota
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                      className="grid size-10 place-items-center rounded-sm border border-line bg-white hover:border-ink"
                      onClick={() => setRating(value)}
                      type="button"
                    >
                      <Star className={value <= rating ? "fill-brand-blue text-brand-blue" : "text-gray-300"} size={21} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Tipo
                <select className="rounded-sm border border-line bg-white px-3 py-3 font-normal" onChange={(event) => setContext(event.target.value as Review["context"])} value={context}>
                  {contextOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Produto ou serviço
                <input className="rounded-sm border border-line px-3 py-3 font-normal" onChange={(event) => setItemName(event.target.value)} placeholder="Ex: iPhone 12, troca de tela..." required value={itemName} />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Comentário
                <textarea className="min-h-32 rounded-sm border border-line px-3 py-3 font-normal" onChange={(event) => setComment(event.target.value)} placeholder="Conte sua experiência com sinceridade" required value={comment} />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Fotos do produto
                <span className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-600 hover:border-ink">
                  <Camera size={18} />
                  Anexar até 3 imagens
                </span>
                <input accept={imageAccept} className="hidden" multiple onChange={handleImages} type="file" />
              </label>
              {images.length ? <p className="text-xs text-gray-500">{images.length} imagem{images.length > 1 ? "s" : ""} selecionada{images.length > 1 ? "s" : ""}.</p> : null}

              <button className="flex h-12 items-center justify-center gap-2 rounded-sm bg-ink font-semibold text-white hover:bg-graphite disabled:cursor-not-allowed disabled:bg-gray-400" disabled={submitting} type="submit">
                {submitting ? <CheckCircle2 size={18} /> : <Send size={18} />}
                {submitting ? "Enviando..." : "Enviar experiência"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

function ExperienceMetric({ title, value, detail, tone }: { title: string; value: number; detail: string; tone: "good" | "bad" | "neutral" }) {
  return (
    <div className={`reviews-metric is-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
      <div className="review-card__top">
        <div className="review-card__avatar">{review.customerName.slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{review.customerName}</strong>
          <span>{review.context}{review.createdAt ? ` · ${review.createdAt}` : ""}</span>
        </div>
        <div className="review-card__stars" aria-label={`${review.rating} de 5 estrelas`}>
          {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={value <= review.rating ? "is-active" : ""} size={15} />)}
        </div>
      </div>
      <h3>{review.itemName}</h3>
      <p>{review.comment}</p>
      {review.images.length ? (
        <div className="review-card__images">
          {review.images.map((image) => (
            <img key={image} src={image} alt={`Foto da experiência de ${review.itemName}`} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
