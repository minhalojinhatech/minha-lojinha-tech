import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { DashboardCard, DashboardMetric, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { useAuthContext } from "@/components/AuthProvider";
import { TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { collections, db, storage } from "@/lib/firebase";
import { fetchDemandInterests, fetchDemandModels, fetchDemandSuggestions } from "@/lib/firestoreData";
import { canPreviewImageFile, imageAccept, isSupportedImageFile, prepareImageForUpload } from "@/lib/imageProcessing";
import type { DemandInterest, DemandModel, DemandSuggestion } from "@/lib/types";
import { apiFetch, appHref } from "@/lib/runtime";

export default function PainelInteresses() {
  const { user } = useAuthContext();
  const [models, setModels] = useState<DemandModel[]>([]);
  const [suggestions, setSuggestions] = useState<DemandSuggestion[]>([]);
  const [interests, setInterests] = useState<DemandInterest[]>([]);
  const [editing, setEditing] = useState<DemandModel | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const pendingSuggestions = useMemo(() => suggestions.filter((item) => item.status === "Pendente"), [suggestions]);
  const totalInterest = useMemo(() => models.reduce((sum, model) => sum + model.interestCount, 0), [models]);

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
  }, []);

  async function refreshAll() {
    const [nextModels, nextSuggestions, nextInterests] = await Promise.all([
      fetchDemandModels(true).catch(() => []),
      fetchDemandSuggestions().catch(() => []),
      fetchDemandInterests().catch(() => [])
    ]);
    setModels(nextModels);
    setSuggestions(nextSuggestions);
    setInterests(nextInterests);
  }

  function startNew() {
    setEditing(null);
    setImages([]);
    setShowForm(true);
    setMessage("");
  }

  function startEditing(model: DemandModel) {
    setEditing(model);
    setImages([]);
    setShowForm(true);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const brand = String(data.get("brand") || "").trim();

    if (!name || !brand) {
      showMessage("Informe marca e modelo.", "error");
      return;
    }
    if (!editing && images.length === 0) {
      showMessage("Adicione pelo menos uma imagem do aparelho.", "error");
      return;
    }

    setSaving(true);
    try {
      const modelId = editing?.id || uniqueModelId(`${brand}-${name}`, models);
      const uploadedGallery = images.length ? await Promise.all(images.map(async (image, index) => {
        const prepared = await prepareImageForUpload(image, `${modelId}-${index + 1}`);
        const imageRef = ref(storage, `demand-models/${modelId}/${index + 1}-${Date.now()}-${slugify(image.name)}.${prepared.extension}`);
        await uploadBytes(imageRef, prepared.file, { contentType: prepared.contentType });
        return getDownloadURL(imageRef);
      })) : [];
      const gallery = uploadedGallery.length ? uploadedGallery : editing?.gallery || [];

      await setDoc(doc(db, collections.demandModels, modelId), {
        id: modelId,
        name,
        brand,
        summary: String(data.get("summary") || "").trim(),
        image: gallery[0] || "/logo-loja.png",
        gallery: gallery.length ? gallery : ["/logo-loja.png"],
        screen: String(data.get("screen") || "").trim(),
        processor: String(data.get("processor") || "").trim(),
        memory: String(data.get("memory") || "").trim(),
        storage: String(data.get("storage") || "").trim(),
        battery: String(data.get("battery") || "").trim(),
        operatingSystem: String(data.get("operatingSystem") || "").trim(),
        interestCount: editing?.interestCount || 0,
        active: data.get("active") === "on",
        featured: data.get("featured") === "on",
        updatedAt: serverTimestamp(),
        ...(editing ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      form.reset();
      setEditing(null);
      setImages([]);
      setShowForm(false);
      await refreshAll();
      showMessage("Modelo salvo e pronto para captar demanda.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível salvar o modelo.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(model: DemandModel) {
    if (!window.confirm(`Remover ${model.name} e sua página de interesse?`)) return;
    try {
      await Promise.all(model.gallery.map(deleteStorageUrl));
      await deleteDoc(doc(db, collections.demandModels, model.id));
      await refreshAll();
      showMessage("Modelo removido.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível remover o modelo.", "error");
    }
  }

  async function toggleActive(model: DemandModel) {
    await updateDoc(doc(db, collections.demandModels, model.id), {
      active: !model.active,
      updatedAt: serverTimestamp()
    });
    await refreshAll();
  }

  async function approveSuggestion(suggestion: DemandSuggestion) {
    try {
      const result = await manageSuggestion(suggestion.id, "approve", user);
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      if (result.modelId && !models.some((item) => item.id === result.modelId)) {
        const refreshedModels = await fetchDemandModels(true).catch(() => models);
        setModels(refreshedModels);
      } else {
        await refreshAll();
      }
      showMessage(result.message, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível aprovar a sugestão.", "error");
    }
  }

  async function rejectSuggestion(suggestion: DemandSuggestion) {
    try {
      const result = await manageSuggestion(suggestion.id, "reject", user);
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      showMessage(result.message, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível arquivar a sugestão.", "error");
    }
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  return (
    <StoreDashboardLayout title="Modelos procurados" description="Demanda, sugestões e potenciais compradores em um só lugar.">
      {message ? <p className={`mb-4 border p-3 text-sm font-medium ${messageType === "success" ? "border-green-100 bg-green-50 text-brand-green" : "border-red-100 bg-red-50 text-red-700"}`}>{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardMetric title="Interesses registrados" value={String(totalInterest)} detail="Pessoas que querem comprar" />
        <DashboardMetric title="Modelos ativos" value={String(models.filter((item) => item.active).length)} detail="Visíveis na loja" />
        <DashboardMetric title="Sugestões pendentes" value={String(pendingSuggestions.length)} detail="Aguardando análise" />
      </div>

      <div className="mt-5 grid gap-5">
        <DashboardCard
          title={showForm ? (editing ? `Editar ${editing.name}` : "Novo modelo procurado") : "Catálogo de interesse"}
          description="Estes aparelhos representam demanda, não estoque disponível."
          action={<button className="rounded-sm bg-ink px-4 py-3 text-sm font-medium text-white" onClick={() => showForm ? setShowForm(false) : startNew()} type="button">{showForm ? "Fechar" : "Novo modelo"}</button>}
        >
          {showForm ? (
            <form key={editing?.id || "new"} className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field defaultValue={editing?.brand} label="Marca" name="brand" placeholder="Apple, Samsung, Motorola..." />
                <Field defaultValue={editing?.name} label="Modelo" name="name" placeholder="iPhone 15, Galaxy S24..." />
              </div>
              <label className="grid gap-2 text-sm font-medium">Resumo
                <textarea className="min-h-24 rounded-sm border border-line px-4 py-3 font-normal" defaultValue={editing?.summary} name="summary" placeholder="Uma apresentação curta do aparelho e do perfil de uso." />
              </label>
              <label className="grid gap-2 text-sm font-medium">Imagens ilustrativas (até 5)
                <input accept={imageAccept} className="rounded-sm border border-line bg-white px-4 py-3 font-normal" multiple onChange={(event) => setImages(Array.from(event.target.files || []).filter(isSupportedImageFile).slice(0, 5))} type="file" />
                {editing ? <span className="text-xs font-normal text-gray-500">Novas imagens substituem a galeria atual.</span> : null}
              </label>
              {images.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{images.map((image) => <div className="border border-line bg-gray-50 p-2 text-xs" key={`${image.name}-${image.size}`}>{canPreviewImageFile(image) ? <img className="aspect-square w-full object-contain" src={URL.createObjectURL(image)} alt="" /> : <div className="grid aspect-square place-items-center">Imagem selecionada</div>}<p className="mt-2 truncate">{image.name}</p></div>)}</div> : null}
              <div className="grid gap-3 md:grid-cols-3">
                <Field defaultValue={editing?.screen} label="Tela" name="screen" placeholder="6,1 pol. OLED" />
                <Field defaultValue={editing?.processor} label="Processador" name="processor" placeholder="A16 Bionic" />
                <Field defaultValue={editing?.memory} label="Memória" name="memory" placeholder="8 GB" />
                <Field defaultValue={editing?.storage} label="Armazenamento" name="storage" placeholder="128 GB, 256 GB..." />
                <Field defaultValue={editing?.battery} label="Bateria" name="battery" placeholder="5.000 mAh" />
                <Field defaultValue={editing?.operatingSystem} label="Sistema operacional" name="operatingSystem" placeholder="Android 15, iOS 18..." />
              </div>
              <div className="flex flex-wrap gap-4">
                <CheckField defaultChecked={editing?.active ?? true} label="Visível na loja" name="active" />
                <CheckField defaultChecked={editing?.featured ?? false} label="Destacar na home" name="featured" />
              </div>
              <button className="w-max rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar modelo"}</button>
            </form>
          ) : (
            <DashboardTable>
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-medium">Modelo</th><th className="px-4 py-3 font-medium">Interesse</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Ações</th></tr></thead>
              <tbody>
                {loading ? <TableRowsSkeleton columns={4} rows={4} /> : models.map((model) => (
                  <tr className="border-t border-line" key={model.id}>
                    <td className="px-4 py-3"><div className="flex min-w-[260px] items-center gap-3"><img className="size-14 border border-line bg-white object-contain" src={model.image || "/logo-loja.png"} alt="" /><div><p className="font-semibold">{model.name}</p><p className="text-xs text-gray-500">{model.brand} · {model.gallery.length} foto{model.gallery.length === 1 ? "" : "s"}</p></div></div></td>
                    <td className="px-4 py-3 font-semibold">{model.interestCount}</td>
                    <td className="px-4 py-3"><button className={`border px-2 py-1 text-xs font-semibold ${model.active ? "border-green-100 bg-green-50 text-brand-green" : "border-gray-200 bg-gray-50 text-gray-600"}`} onClick={() => toggleActive(model)} type="button">{model.active ? "Ativo" : "Oculto"}</button></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Link className="border border-line px-3 py-2 text-xs font-medium" href={appHref(`/procurando-smartphone/${model.id}`)}>Ver</Link><button className="border border-line px-3 py-2 text-xs font-medium" onClick={() => startEditing(model)} type="button">Editar</button><button className="border border-red-200 px-3 py-2 text-xs font-medium text-red-700" onClick={() => handleDelete(model)} type="button">Remover</button></div></td>
                  </tr>
                ))}
                {!loading && models.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>Nenhum modelo cadastrado.</td></tr> : null}
              </tbody>
            </DashboardTable>
          )}
        </DashboardCard>

        <DashboardCard title="Sugestões enviadas" description="Aprovar cria uma página pública que pode ser enriquecida depois.">
          <DashboardTable>
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-medium">Aparelho</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Observações</th><th className="px-4 py-3 text-right font-medium">Ações</th></tr></thead>
            <tbody>
              {loading ? <TableRowsSkeleton columns={4} rows={3} /> : pendingSuggestions.map((suggestion) => (
                <tr className="border-t border-line align-top" key={suggestion.id}>
                  <td className="px-4 py-3"><p className="font-semibold">{suggestion.model}</p><p className="text-xs text-gray-500">{suggestion.brand}</p></td>
                  <td className="px-4 py-3 text-sm"><p>{suggestion.customerName}</p><p className="text-xs text-gray-500">{suggestion.customerEmail || suggestion.customerPhone}</p></td>
                  <td className="max-w-sm px-4 py-3 text-sm text-gray-600">{suggestion.notes || "Sem observações."}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="border border-green-200 px-3 py-2 text-xs font-medium text-brand-green" onClick={() => approveSuggestion(suggestion)} type="button">Aprovar</button><button className="border border-line px-3 py-2 text-xs font-medium" onClick={() => rejectSuggestion(suggestion)} type="button">Arquivar</button></div></td>
                </tr>
              ))}
              {!loading && pendingSuggestions.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>Nenhuma sugestão pendente.</td></tr> : null}
            </tbody>
          </DashboardTable>
        </DashboardCard>

        <DashboardCard title="Potenciais compradores" description="Contatos captados pelos botões de interesse e de novidades.">
          <DashboardTable>
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-medium">Modelo</th><th className="px-4 py-3 font-medium">Pessoa</th><th className="px-4 py-3 font-medium">Contato</th><th className="px-4 py-3 font-medium">Intenção</th></tr></thead>
            <tbody>
              {loading ? <TableRowsSkeleton columns={4} rows={4} /> : interests.map((interest) => (
                <tr className="border-t border-line" key={interest.id}><td className="px-4 py-3 font-semibold">{interest.modelName}</td><td className="px-4 py-3">{interest.customerName}</td><td className="px-4 py-3 text-sm">{interest.customerEmail || interest.customerPhone}</td><td className="px-4 py-3"><span className="border border-line px-2 py-1 text-xs font-semibold">{interest.intent === "updates" ? "Novidades" : "Tenho interesse"}</span></td></tr>
              ))}
              {!loading && interests.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>Nenhum contato registrado ainda.</td></tr> : null}
            </tbody>
          </DashboardTable>
        </DashboardCard>
      </div>
    </StoreDashboardLayout>
  );
}

function Field({ defaultValue = "", label, name, placeholder }: { defaultValue?: string; label: string; name: string; placeholder: string }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<input className="rounded-sm border border-line px-4 py-3 font-normal" defaultValue={defaultValue} name={name} placeholder={placeholder} /></label>;
}

function CheckField({ defaultChecked, label, name }: { defaultChecked: boolean; label: string; name: string }) {
  return <label className="flex items-center gap-2 text-sm font-medium"><input className="size-4 accent-ink" defaultChecked={defaultChecked} name={name} type="checkbox" />{label}</label>;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function uniqueModelId(value: string, models: DemandModel[]) {
  const base = slugify(value) || `modelo-${Date.now()}`;
  if (!models.some((item) => item.id === base)) return base;
  let suffix = 2;
  while (models.some((item) => item.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

async function deleteStorageUrl(url: string) {
  if (!url.includes("firebasestorage.googleapis.com") && !url.startsWith("gs://")) return;
  await deleteObject(ref(storage, url));
}

async function manageSuggestion(suggestionId: string, action: "approve" | "reject", user: User | null) {
  if (!user) throw new Error("Sua sessão expirou. Entre novamente no painel.");
  const token = await user.getIdToken();
  const response = await apiFetch("/api/demand/manage-suggestion", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ suggestionId, action })
  });
  const result = await response.json() as { error?: string; message?: string; modelId?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a sugestão.");
  return {
    message: result.message || "Sugestão atualizada.",
    modelId: result.modelId || ""
  };
}
