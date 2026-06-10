import { FormEvent, useEffect, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { SkeletonBlock, TableRowsSkeleton } from "@/components/LoadingSkeleton";
import { DashboardCard, DashboardTable, StoreDashboardLayout } from "@/components/StoreDashboardLayout";
import { formatCurrency } from "@/lib/format";
import { collections, db, storage } from "@/lib/firebase";
import { fetchProducts } from "@/lib/firestoreData";
import { canPreviewImageFile, imageAccept, isSupportedImageFile, prepareImageForUpload } from "@/lib/imageProcessing";
import type { Product } from "@/lib/types";
import { getYouTubeVideoId } from "@/lib/youtube";

const pickupPoints = [
  { id: "ponto-retirada-1", title: "Ponto de retirada 1", area: "Jardim Guarujá" },
  { id: "ponto-retirada-2", title: "Ponto de retirada 2", area: "Parque Independência" }
];

export default function PainelProdutos() {
  const [images, setImages] = useState<File[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draftName, setDraftName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  function handleImagesChange(files: FileList | null) {
    const selectedFiles = Array.from(files || []).filter(isSupportedImageFile).slice(0, 5);
    setImages(selectedFiles);
  }

  async function refreshProducts() {
    await fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const sku = editingProduct?.sku || generateSku(name, nextSkuNumber(products));
    const price = Number(String(data.get("price") || "0").replace(".", "").replace(",", "."));
    const originalPriceValue = String(data.get("originalPrice") || "").trim();
    const originalPrice = originalPriceValue ? Number(originalPriceValue.replace(".", "").replace(",", ".")) : null;
    const videoUrl = String(data.get("videoUrl") || "").trim();

    if (!name || !sku || !price) {
      setMessageType("error");
      setMessage("Preencha nome e preço para salvar o produto.");
      return;
    }

    if (videoUrl && !getYouTubeVideoId(videoUrl)) {
      setMessageType("error");
      setMessage("Informe um link válido de vídeo do YouTube.");
      return;
    }

    const selectedPickupPointIds = data.getAll("pickupPointIds").map(String).filter((item) => pickupPoints.some((point) => point.id === item));
    if (selectedPickupPointIds.length === 0) {
      setMessageType("error");
      setMessage("Escolha pelo menos um local de retirada para o produto.");
      return;
    }

    if (!editingProduct && images.length === 0) {
      setMessageType("error");
      setMessage("Adicione pelo menos uma imagem do produto.");
      return;
    }

    setSaving(true);

    try {
      const productId = editingProduct?.id || slugify(sku);
      const uploadedGallery = images.length ? await Promise.all(
          images.map(async (image, index) => {
            const prepared = await prepareImageForUpload(image, `${productId}-${index + 1}`);
            const imageRef = ref(storage, `products/${productId}/${index + 1}-${Date.now()}-${slugify(image.name)}.${prepared.extension}`);
            await uploadBytes(imageRef, prepared.file, { contentType: prepared.contentType });
            return getDownloadURL(imageRef);
          })
        ) : [];
      const gallery = uploadedGallery.length ? uploadedGallery : editingProduct?.gallery || [];
      const pickupPointIds = selectedPickupPointIds;
      const location = pickupPoints
        .filter((point) => pickupPointIds.includes(point.id))
        .map((point) => point.title)
        .join(" / ");
      const payload = {
        id: productId,
        sku,
        name,
        brand: String(data.get("brand") || "").trim(),
        category: String(data.get("category") || "Acessorios"),
        condition: String(data.get("condition") || "Novo"),
        price,
        originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
        stock: String(data.get("stock") || "").trim(),
        mainAttribute: String(data.get("mainAttribute") || "").trim(),
        secondaryAttribute: String(data.get("secondaryAttribute") || "").trim(),
        color: String(data.get("color") || "").trim(),
        specs: String(data.get("specs") || "").split("\n").map((item) => item.trim()).filter(Boolean),
        conservation: String(data.get("conservation") || "").trim(),
        warranty: String(data.get("warranty") || "").trim(),
        videoUrl,
        location,
        pickupPointIds,
        included: String(data.get("included") || "").split(",").map((item) => item.trim()).filter(Boolean),
        image: gallery[0],
        gallery,
        available: editingProduct?.available ?? true,
        badge: originalPrice && originalPrice > price ? "Oferta" : editingProduct?.badge || "Pronta entrega",
        updatedAt: serverTimestamp(),
        ...(editingProduct ? {} : { createdAt: serverTimestamp() })
      };

      await setDoc(
        doc(db, collections.products, productId),
        payload,
        { merge: true }
      );

      setMessageType("success");
      setMessage(editingProduct ? "Produto atualizado." : "Produto salvo.");
      await refreshProducts();
      setImages([]);
      setEditingProduct(null);
      setDraftName("");
      form.reset();
      setShowForm(false);
      setShowAdvanced(false);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`Remover ${product.name}? Essa ação apaga o produto da loja.`)) return;

    setMessage("");
    try {
      await Promise.all(product.gallery.map((image) => deleteStorageUrl(image)));
      await deleteDoc(doc(db, collections.products, product.id));
      setMessageType("success");
      setMessage("Produto removido.");
      await refreshProducts();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o produto.");
    }
  }

  async function handleDeletePhoto(product: Product, image: string) {
    if (product.gallery.length <= 1) {
      setMessageType("error");
      setMessage("O produto precisa ter pelo menos uma foto.");
      return;
    }

    if (!window.confirm("Remover está foto do produto?")) return;

    const nextGallery = product.gallery.filter((item) => item !== image);

    try {
      await deleteStorageUrl(image);
      await updateDoc(doc(db, collections.products, product.id), {
        gallery: nextGallery,
        image: nextGallery[0],
        updatedAt: serverTimestamp()
      });
      setMessageType("success");
      setMessage("Foto removida.");
      await refreshProducts();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível remover a foto.");
    }
  }

  return (
    <StoreDashboardLayout title="Produtos" description="Cadastro, estoque e fotos dos itens.">
      {message ? (
        <p className={`mb-4 border p-3 text-sm font-medium ${messageType === "success" ? "border-green-100 bg-green-50 text-brand-green" : "border-red-100 bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}

      <DashboardCard title={showForm ? "Cadastro de produto" : "Produtos"}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="text-sm text-gray-600">
            {showForm ? "Preencha o essencial e abra o avançado só quando precisar." : loading ? <SkeletonBlock className="h-4 w-44" /> : `${products.length} produto${products.length === 1 ? "" : "s"} cadastrado${products.length === 1 ? "" : "s"}.`}
          </div>
          <button className="rounded-sm bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-graphite" onClick={() => {
            setEditingProduct(null);
            setImages([]);
            setDraftName("");
            setShowAdvanced(false);
            setShowForm((current) => !current);
          }} type="button">
            {showForm ? "Fechar formulário" : "Novo produto"}
          </button>
        </div>

        {showForm ? <form key={editingProduct?.id || "new"} className="mt-5 grid gap-4 border-t border-line pt-5" onSubmit={handleSubmit}>
          {editingProduct ? (
            <div className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-brand-blue">
              Editando: {editingProduct.name}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Field defaultValue={editingProduct?.name} label="Nome do produto" name="name" onChange={setDraftName} placeholder="Notebook Lenovo IdeaPad i5 / Carregador USB-C 20W" />
            <Field defaultValue={editingProduct?.brand} label="Marca" name="brand" placeholder="Apple, Samsung, Lenovo, Baseus..." />
            <SelectField defaultValue={editingProduct?.category} label="Categoria" name="category" options={["Celulares", "Tablets", "Notebooks", "Computadores", "Acessorios"]} />
            <SelectField defaultValue={editingProduct?.condition} label="Condição" name="condition" options={["Novo", "Seminovo", "Usado"]} />
            <Field defaultValue={editingProduct ? String(editingProduct.price).replace(".", ",") : ""} label="Preço final" name="price" placeholder="1899,00" />
            <Field defaultValue={editingProduct?.originalPrice ? String(editingProduct.originalPrice).replace(".", ",") : ""} label="Preço original (se for oferta)" name="originalPrice" placeholder="2199,00" />
            <Field defaultValue={editingProduct ? "1 unidade" : ""} label="Estoque" name="stock" placeholder="1 unidade / produto único" />
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Imagens do produto (até 5)
            <input accept={imageAccept} className="rounded-sm border border-line bg-white px-4 py-3 font-normal" multiple onChange={(event) => handleImagesChange(event.target.files)} type="file" />
            {editingProduct ? <span className="text-xs font-normal text-gray-500">Envie novas imagens apenas se quiser substituir a galeria atual.</span> : null}
          </label>
          {images.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {images.map((image) => (
                <div key={`${image.name}-${image.size}`} className="border border-line bg-gray-50 p-2 text-xs">
                  {canPreviewImageFile(image) ? (
                    <img className="aspect-square w-full object-cover" src={URL.createObjectURL(image)} alt={image.name} />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center bg-white p-3 text-center text-gray-500">
                      HEIC selecionado
                    </div>
                  )}
                  <p className="mt-2 truncate">{image.name}</p>
                </div>
              ))}
            </div>
          ) : null}
          <button className="w-max rounded-sm border border-line bg-white px-4 py-3 text-sm font-medium hover:border-ink" onClick={() => setShowAdvanced((current) => !current)} type="button">
            {showAdvanced ? "Ocultar avançado" : "Mostrar avançado"}
          </button>
          {showAdvanced ? (
            <div className="grid gap-4 border border-line bg-gray-50 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium">
                  SKU interno automático
                  <input
                    className="rounded-sm border border-line bg-gray-100 px-4 py-3 font-mono font-normal text-gray-700"
                    readOnly
                    value={editingProduct?.sku || generateSku(draftName || editingProduct?.name || "", nextSkuNumber(products))}
                  />
                  <span className="text-xs font-normal leading-5 text-gray-500">Criado pelas iniciais do produto e pela sequência da loja.</span>
                </label>
                <Field defaultValue={editingProduct?.color} label="Cor / acabamento" name="color" placeholder="Preto, prata, grafite..." />
                <Field defaultValue={editingProduct?.storage} label="Atributo principal" name="mainAttribute" placeholder="SSD 256GB, USB-C 20W, Tela 24 pol..." />
                <Field label="Atributo secundário" name="secondaryAttribute" placeholder="8GB RAM, Bluetooth, Bivolt..." />
                <Field defaultValue={editingProduct?.warranty} label="Garantia" name="warranty" placeholder="Garantia da loja por 90 dias" />
                <Field defaultValue={editingProduct?.included.join(", ")} label="Itens inclusos" name="included" placeholder="Produto, carregador, cabo, nota..." />
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Vídeo do produto no YouTube (opcional)
                <input
                  className="rounded-sm border border-line bg-white px-4 py-3 font-normal"
                  defaultValue={editingProduct?.videoUrl}
                  name="videoUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  type="url"
                />
                <span className="text-xs font-normal leading-5 text-gray-500">Aceita links de vídeos, Shorts ou compartilhamentos do YouTube.</span>
              </label>
              <fieldset className="grid gap-2 text-sm font-medium">
                <legend>Locais de retirada disponíveis</legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {pickupPoints.map((point) => {
                    const checked = editingProduct?.pickupPointIds?.length ? editingProduct.pickupPointIds.includes(point.id) : true;
                    return (
                      <label key={point.id} className="flex items-start gap-3 border border-line bg-white p-3 font-normal hover:border-ink">
                        <input className="mt-1 size-4 accent-ink" defaultChecked={checked} name="pickupPointIds" type="checkbox" value={point.id} />
                        <span>
                          <span className="block font-semibold">{point.title}</span>
                          <span className="mt-1 block text-sm text-gray-600">{point.area}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs font-normal leading-5 text-gray-500">Escolha um ponto específico ou marque os dois para permitir retirada em ambos.</p>
              </fieldset>
              <label className="grid gap-2 text-sm font-medium">
                Especificações do produto
                <textarea className="min-h-24 rounded-sm border border-line px-4 py-3 font-normal" defaultValue={editingProduct?.specs.join("\n")} name="specs" placeholder="Uma especificação por linha: processador, memória, potência, compatibilidade, conectividade..." />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Observações e estado físico
                <textarea className="min-h-24 rounded-sm border border-line px-4 py-3 font-normal" defaultValue={editingProduct?.conservation || editingProduct?.notes} name="conservation" placeholder="Marcas de uso, itens inclusos, reparos feitos, estado da bateria quando for celular/notebook..." />
              </label>
            </div>
          ) : null}
          <button className="w-full rounded-sm bg-ink px-5 py-3 font-medium text-white hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-60 md:w-max" disabled={saving} type="submit">
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
        </form> : null}
        {!showForm ? (
          <div className="mt-5">
            <DashboardTable>
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Preço</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableRowsSkeleton columns={5} rows={5} /> : products.map((product) => (
                  <tr key={product.id} className="border-t border-line align-middle">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[280px] items-center gap-3">
                        <img className="size-14 border border-line bg-white object-cover" src={product.image} alt={product.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{product.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{product.brand} · {product.condition}</p>
                          <p className="mt-1 text-xs text-gray-500">{product.gallery.length} foto{product.gallery.length === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className="px-4 py-3">
                      <span className={`border px-2 py-1 text-xs font-semibold ${product.available ? "border-green-100 bg-green-50 text-brand-green" : "border-red-100 bg-red-50 text-red-700"}`}>
                        {product.available ? "Disponível" : "Indisponível"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="border border-line bg-white px-3 py-2 text-xs font-medium hover:border-ink" onClick={() => {
                          setEditingProduct(product);
                          setImages([]);
                          setDraftName(product.name);
                          setShowForm(true);
                          setShowAdvanced(true);
                        }} type="button">
                          Editar
                        </button>
                        <button className="border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => handleDeleteProduct(product)} type="button">
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && products.length === 0 ? <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>Nenhum produto cadastrado ainda.</td></tr> : null}
              </tbody>
            </DashboardTable>
          </div>
        ) : null}
      </DashboardCard>
    </StoreDashboardLayout>
  );
}

function Field({ defaultValue = "", label, name, onChange, placeholder }: { defaultValue?: string; label: string; name: string; onChange?: (value: string) => void; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input className="rounded-sm border border-line px-4 py-3 font-normal" defaultValue={defaultValue} name={name} onChange={onChange ? (event) => onChange(event.target.value) : undefined} placeholder={placeholder} />
    </label>
  );
}

function SelectField({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select className="rounded-sm border border-line bg-white px-4 py-3 font-normal" defaultValue={defaultValue} name={name}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateSku(name: string, sequence: number) {
  const initials = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 6) || "PROD";

  return `MLT-${initials}-${String(sequence).padStart(4, "0")}`;
}

function nextSkuNumber(products: Product[]) {
  const highest = products.reduce((current, product) => {
    const match = product.sku?.match(/-(\d{4})$/);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);

  return highest + 1;
}

async function deleteStorageUrl(url: string) {
  if (!url.includes("firebasestorage.googleapis.com") && !url.startsWith("gs://")) return;
  await deleteObject(ref(storage, url));
}
