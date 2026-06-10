import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, type DocumentData } from "firebase/firestore";
import { Archive, ArchiveRestore, Check, Mail, MessageCircle, Trash2 } from "lucide-react";
import { DashboardCard, DashboardMetric, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { isStoreOwner } from "@/lib/auth";
import { collections, db } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";

type Submission = {
  id: string;
  kind: "Parceria" | "Candidatura";
  name: string;
  organization: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  experience: string;
  message: string;
  status: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
};

export default function PainelColaboracoes() {
  const { user, loading: loadingAuth } = useAuthUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [kindFilter, setKindFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [archiveFilter, setArchiveFilter] = useState("Ativos");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (loadingAuth || !isStoreOwner(user)) return;
    getDocs(collection(db, collections.collaborationSubmissions))
      .then((snapshot) => setSubmissions(snapshot.docs.map((item) => submissionFromDoc(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setFeedback("Não foi possível carregar os registros. Confira se as novas regras do Firestore foram publicadas."))
      .finally(() => setLoadingData(false));
  }, [loadingAuth, user]);

  const categories = useMemo(() => [...new Set(submissions.map((item) => item.category).filter(Boolean))].sort(), [submissions]);
  const filtered = submissions.filter((item) => {
    if (kindFilter !== "Todos" && item.kind !== kindFilter) return false;
    if (categoryFilter !== "Todas" && item.category !== categoryFilter) return false;
    if (archiveFilter === "Ativos" && item.archived) return false;
    if (archiveFilter === "Arquivados" && !item.archived) return false;
    return true;
  });
  const unreadCount = submissions.filter((item) => !item.read && !item.archived).length;

  async function patchSubmission(id: string, patch: Partial<Submission>) {
    setFeedback("");
    setSubmissions((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    try {
      await updateDoc(doc(db, collections.collaborationSubmissions, id), { ...patch, updatedAt: serverTimestamp() });
    } catch {
      setFeedback("A alteração não foi salva. Recarregue a página e confira as regras do Firestore.");
    }
  }

  async function removeSubmission(submission: Submission) {
    if (!window.confirm(`Excluir definitivamente o registro de ${submission.name}?`)) return;
    setFeedback("");
    try {
      await deleteDoc(doc(db, collections.collaborationSubmissions, submission.id));
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
    } catch {
      setFeedback("Não foi possível excluir este registro.");
    }
  }

  return (
    <StoreDashboardLayout title="Colaborações" description="Propostas de parceria e pessoas interessadas em contribuir com a loja.">
      <div className="dashboard-metrics-grid">
        <DashboardMetric title="Novos contatos" value={String(unreadCount)} detail="Ainda não visualizados" />
        <DashboardMetric title="Parcerias" value={String(submissions.filter((item) => item.kind === "Parceria" && !item.archived).length)} detail="Propostas ativas" />
        <DashboardMetric title="Candidaturas" value={String(submissions.filter((item) => item.kind === "Candidatura" && !item.archived).length)} detail="Interesses ativos" />
      </div>

      <div className="mt-5">
        <DashboardCard title="Caixa de entrada" description="Filtre e organize os contatos recebidos pelas páginas institucionais.">
          <div className="collaboration-admin__filters">
            <label>Tipo
              <select onChange={(event) => setKindFilter(event.target.value)} value={kindFilter}>
                <option>Todos</option><option>Parceria</option><option>Candidatura</option>
              </select>
            </label>
            <label>Categoria
              <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                <option>Todas</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>Exibir
              <select onChange={(event) => setArchiveFilter(event.target.value)} value={archiveFilter}>
                <option>Ativos</option><option>Arquivados</option><option>Todos</option>
              </select>
            </label>
          </div>
          {feedback ? <p className="collaboration-admin__feedback">{feedback}</p> : null}
          <div className="collaboration-admin__list">
            {loadingData ? <p className="collaboration-admin__empty">Carregando contatos...</p> : filtered.map((submission) => (
              <article className={!submission.read ? "is-unread" : ""} key={submission.id}>
                <div className="collaboration-admin__topline">
                  <div>
                    <span className={`collaboration-admin__kind is-${submission.kind === "Parceria" ? "partner" : "team"}`}>{submission.kind}</span>
                    {!submission.read ? <span className="collaboration-admin__new">Novo</span> : null}
                  </div>
                  <time>{formatDate(submission.createdAt)}</time>
                </div>
                <div className="collaboration-admin__content">
                  <div>
                    <h3>{submission.name}</h3>
                    <p>{submission.organization || submission.city || "Contato direto"}</p>
                    <strong>{submission.category}</strong>
                  </div>
                  <div className="collaboration-admin__contacts">
                    <a href={`mailto:${submission.email}`}><Mail size={15} /> {submission.email}</a>
                    <a href={`https://wa.me/55${submission.phone.replace(/\D/g, "")}`} rel="noreferrer" target="_blank"><MessageCircle size={15} /> {submission.phone}</a>
                  </div>
                </div>
                {submission.experience ? <div className="collaboration-admin__text"><strong>Experiência</strong><p>{submission.experience}</p></div> : null}
                <div className="collaboration-admin__text"><strong>Mensagem</strong><p>{submission.message}</p></div>
                <div className="collaboration-admin__actions">
                  {!submission.read ? <button onClick={() => patchSubmission(submission.id, { read: true, status: "Lido" })} type="button"><Check size={15} /> Marcar como lido</button> : null}
                  <button onClick={() => patchSubmission(submission.id, { archived: !submission.archived, status: submission.archived ? "Lido" : "Arquivado" })} type="button">
                    {submission.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />} {submission.archived ? "Restaurar" : "Arquivar"}
                  </button>
                  <button className="is-danger" onClick={() => removeSubmission(submission)} type="button"><Trash2 size={15} /> Excluir</button>
                </div>
              </article>
            ))}
            {!loadingData && filtered.length === 0 ? <p className="collaboration-admin__empty">Nenhum registro encontrado com esses filtros.</p> : null}
          </div>
        </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}

function submissionFromDoc(id: string, data: DocumentData): Submission {
  return {
    id,
    kind: data.kind === "Candidatura" ? "Candidatura" : "Parceria",
    name: String(data.name || ""),
    organization: String(data.organization || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    city: String(data.city || ""),
    category: String(data.category || ""),
    experience: String(data.experience || ""),
    message: String(data.message || ""),
    status: String(data.status || "Novo"),
    read: Boolean(data.read),
    archived: Boolean(data.archived),
    createdAt: timestampToIso(data.createdAt)
  };
}

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  if (!value) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
