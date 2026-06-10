import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { Camera, ChevronDown, LayoutDashboard, LogOut, MapPin, PackageCheck, Plus, RefreshCcw, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { CustomerAuthGate } from "@/components/CustomerAuthGate";
import { Layout, Breadcrumb } from "@/components/Layout";
import { CardListSkeleton, SkeletonBlock } from "@/components/LoadingSkeleton";
import { deleteCustomerAccount, getCustomerProfile, getFriendlyAuthError, isStoreOwner, logout, updateCustomerProfile } from "@/lib/auth";
import { fetchCustomerOrders } from "@/lib/firestoreData";
import { storage } from "@/lib/firebase";
import { canPreviewImageFile, imageAccept, isSupportedImageFile, prepareImageForUpload } from "@/lib/imageProcessing";
import { formatCep, formatPhone, onlyDigits } from "@/lib/inputMasks";
import { useAuthUser } from "@/lib/useAuthUser";
import type { CustomerAddress, Order } from "@/lib/types";

const emptyAddress: CustomerAddress = {
  id: "",
  label: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  notes: ""
};

export default function Conta() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);
  const [accountAction, setAccountAction] = useState<"logout" | "delete" | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressDraft, setAddressDraft] = useState<CustomerAddress>(emptyAddress);
  const [addressLookup, setAddressLookup] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [accountDataLoading, setAccountDataLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    setFullName(user.displayName || "");

    getCustomerProfile(user.uid)
      .then((profile) => {
        setFullName(profile?.fullName || user.displayName || "");
        setPhone(formatPhone(profile?.phone || ""));
        setPhotoURL(profile?.photoURL || user.photoURL || "");
        setCustomerCode(profile?.customerCode || `CLI-${user.uid.slice(0, 6).toUpperCase()}`);
        setAddresses(normalizeAddresses(profile?.addresses || []));
      })
      .catch(() => {
        setCustomerCode(`CLI-${user.uid.slice(0, 6).toUpperCase()}`);
      })
      .finally(() => setProfileLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setAccountDataLoading(true);
    fetchCustomerOrders(user.uid)
      .then(setCustomerOrders)
      .catch(() => {
        setCustomerOrders([]);
      })
      .finally(() => setAccountDataLoading(false));
  }, [user]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(files: FileList | null) {
    const file = files?.[0] || null;
    if (!file) return;

    if (!isSupportedImageFile(file)) {
      setMessageType("error");
      setMessage("Escolha um arquivo de imagem.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setMessageType("error");
      setMessage("A foto precisa ter até 15 MB.");
      return;
    }

    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(canPreviewImageFile(file) ? URL.createObjectURL(file) : "");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      let nextPhotoURL = photoURL.trim();

      if (photoFile && user) {
        const prepared = await prepareImageForUpload(photoFile, "perfil");
        const photoRef = ref(storage, `users/${user.uid}/profile-${Date.now()}-${slugify(photoFile.name)}.${prepared.extension}`);
        await uploadBytes(photoRef, prepared.file, { contentType: prepared.contentType });
        nextPhotoURL = await getDownloadURL(photoRef);
      }

      await updateCustomerProfile({ fullName, phone, photoURL: nextPhotoURL, addresses });
      setPhotoURL(nextPhotoURL);
      setPhotoFile(null);
      setPhotoPreview("");
      window.dispatchEvent(new Event("customer-profile-updated"));
      setMessageType("success");
      setMessage("Dados atualizados.");
      setProfileOpen(false);
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setMessage("");
    setAccountAction("logout");

    try {
      await logout();
      router.push("/");
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setAccountAction(null);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Excluir sua conta remove seu acesso e seus dados de perfil. Pedidos já feitos podem continuar registrados para atendimento. Deseja continuar?");

    if (!confirmed) return;

    setMessage("");
    setAccountAction("delete");

    try {
      await deleteCustomerAccount();
      router.push("/");
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setAccountAction(null);
    }
  }

  function updateAddressDraft(field: keyof CustomerAddress, value: string) {
    setAddressDraft((current) => ({ ...current, [field]: value }));
  }

  async function lookupAddressCep() {
    const cep = onlyDigits(addressDraft.cep);
    if (cep.length !== 8) {
      setAddressLookup("Digite um CEP com 8 números.");
      return;
    }

    setAddressLookup("Buscando CEP...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

      if (data.erro) {
        setAddressLookup("CEP não encontrado.");
        return;
      }

      setAddressDraft((current) => ({
        ...current,
        cep: formatCep(cep),
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state
      }));
      setAddressLookup("CEP preenchido.");
    } catch {
      setAddressLookup("Não foi possível buscar o CEP agora.");
    }
  }

  async function saveAddress() {
    if (!addressDraft.label.trim() || !addressDraft.cep.trim() || !addressDraft.street.trim() || !addressDraft.number.trim()) {
      setAddressLookup("Preencha nome, CEP, rua e número.");
      return;
    }

    const nextAddress = {
      ...addressDraft,
      id: addressDraft.id || `${Date.now()}`
    };

    const exists = addresses.some((address) => address.id === nextAddress.id);
    const nextAddresses = exists
      ? addresses.map((address) => address.id === nextAddress.id ? nextAddress : address)
      : [...addresses, nextAddress];

    setAddressSaving(true);
    try {
      await updateCustomerProfile({ fullName, phone, photoURL, addresses: nextAddresses });
      setAddresses(nextAddresses);
      setAddressDraft(emptyAddress);
      setAddressEditorOpen(false);
      setAddressLookup("");
      setMessageType("success");
      setMessage(exists ? "Endereço atualizado." : "Endereço adicionado.");
    } catch (error) {
      setAddressLookup(getFriendlyAuthError(error));
    } finally {
      setAddressSaving(false);
    }
  }

  function editAddress(address: CustomerAddress) {
    setAddressDraft(address);
    setAddressLookup("");
    setAddressEditorOpen(true);
  }

  async function removeAddress(addressId: string) {
    const nextAddresses = addresses.filter((address) => address.id !== addressId);
    setAddressSaving(true);
    try {
      await updateCustomerProfile({ fullName, phone, photoURL, addresses: nextAddresses });
      setAddresses(nextAddresses);
      setMessageType("success");
      setMessage("Endereço removido.");
    } catch (error) {
      setMessageType("error");
      setMessage(getFriendlyAuthError(error));
    } finally {
      setAddressSaving(false);
    }
  }

  const displayName = fullName || user?.displayName || "Complete seu nome";
  const profilePhoto = photoPreview || photoURL || user?.photoURL || "";
  const canAccessPanel = isStoreOwner(user);
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CL";

  return (
    <Layout title="Minha conta | Minha Lojinha Tech" noindex>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Minha conta" }]} />
      <section className="container-page account-page">
        <CustomerAuthGate message="Entre na sua conta para ver dados, pedidos e solicitações.">
          <section className="account-hero border border-line bg-ink text-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
            <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
              <div className="relative size-24 overflow-hidden rounded-full border border-white/20 bg-white/10">
                {profilePhoto ? (
                  <img className="h-full w-full object-cover" src={profilePhoto} alt={displayName} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-semibold">{initials}</div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium uppercase text-white/55">Minha conta</p>
                {profileLoading ? <SkeletonBlock className="mt-2 h-8 w-64 max-w-full bg-white/20" /> : <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{displayName}</h1>}
                {profileLoading ? <SkeletonBlock className="mt-3 h-4 w-80 max-w-full bg-white/20" /> : <p className="mt-2 text-sm text-white/70">{user?.email || "E-mail da conta"} · {phone || "Telefone pendente"}</p>}
              </div>
              <div className="grid gap-1 border border-white/15 bg-white/5 px-4 py-3 text-sm">
                <span className="text-white/55">Código do cliente</span>
                {profileLoading ? <SkeletonBlock className="h-5 w-28 bg-white/20" /> : <strong className="font-semibold">{customerCode}</strong>}
                <span className="mt-2 text-xs text-white/55">Use este código quando falar com o atendimento.</span>
              </div>
            </div>
          </section>

          <nav className={`account-shortcuts mt-5 grid gap-3 ${canAccessPanel ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {canAccessPanel ? (
              <Link className="flex items-center gap-3 border border-ink bg-ink p-4 text-white shadow-[0_10px_30px_rgba(17,24,39,0.06)] hover:bg-graphite" href="/painel">
                <span className="grid size-10 place-items-center bg-white/10 text-white"><LayoutDashboard size={20} /></span>
                <span>
                  <span className="block font-medium">Painel da loja</span>
                  <span className="mt-1 block text-sm text-white/65">Acesso administrativo</span>
                </span>
              </Link>
            ) : null}
            <Link className="flex items-center gap-3 border border-line bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.035)] hover:border-ink" href="/pedidos">
              <span className="grid size-10 place-items-center bg-mist text-ink"><PackageCheck size={20} /></span>
              <span>
                <span className="block font-medium">Meus pedidos</span>
                <span className="mt-1 block text-sm text-gray-600">{accountDataLoading ? "Carregando..." : `${customerOrders.length} recentes`}</span>
              </span>
            </Link>
            <button className="flex items-center gap-3 border border-line bg-white p-4 text-left shadow-[0_10px_30px_rgba(17,24,39,0.035)] hover:border-ink" onClick={() => window.dispatchEvent(new Event("open-store-bot"))} type="button">
              <span className="grid size-10 place-items-center bg-mist text-ink"><RefreshCcw size={20} /></span>
              <span>
                <span className="block font-medium">Solicitações</span>
                <span className="mt-1 block text-sm text-gray-600">Abrir pelo bot</span>
              </span>
            </button>
            <Link className="flex items-center gap-3 border border-line bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.035)] hover:border-ink" href="/garantias-reparo">
              <span className="grid size-10 place-items-center bg-mist text-ink"><ShieldCheck size={20} /></span>
              <span>
                <span className="block font-medium">Garantias de reparo</span>
                <span className="mt-1 block text-sm text-gray-600">Dispositivos e prazos</span>
              </span>
            </Link>
          </nav>

          {message ? (
            <p className={`mt-5 border p-3 text-sm font-medium ${messageType === "success" ? "border-green-100 bg-green-50 text-brand-green" : "border-red-100 bg-red-50 text-red-700"}`}>
              {message}
            </p>
          ) : null}

          <section className="mt-5 border border-line bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
            <button className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6" onClick={() => setProfileOpen((current) => !current)} type="button">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center bg-mist text-ink"><UserRound size={21} /></span>
                <span>
                  <strong className="block text-lg">Dados do perfil</strong>
                  <span className="mt-1 block text-sm text-gray-600">{phone || "Adicione seu telefone"} · {user?.email || "E-mail da conta"}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                {profileOpen ? "Fechar" : "Editar dados"}
                <ChevronDown className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} size={18} />
              </span>
            </button>

            {profileOpen ? (
              <form className="border-t border-line p-5 md:p-6" onSubmit={handleSave}>
                <div className="grid gap-5 md:grid-cols-[150px_1fr]">
                  <div>
                    <div className="relative size-32 overflow-hidden rounded-full border border-line bg-gray-50">
                      {profilePhoto ? (
                        <img className="h-full w-full object-cover" src={profilePhoto} alt={displayName} />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-3xl font-semibold text-ink">{initials}</div>
                      )}
                    </div>
                    <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-line bg-white px-3 text-sm font-medium hover:border-ink">
                      <Camera size={17} />
                      Alterar foto
                      <input accept={imageAccept} className="sr-only" onChange={(event) => handlePhotoChange(event.target.files)} type="file" />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      Nome completo
                      <input className="rounded-sm border border-line px-4 py-3 font-normal" onChange={(event) => setFullName(event.target.value)} placeholder="Nome e sobrenome" required value={fullName} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      E-mail
                      <input className="rounded-sm border border-line bg-gray-50 px-4 py-3 font-normal text-gray-600" readOnly value={user?.email || ""} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Telefone
                      <input className="rounded-sm border border-line px-4 py-3 font-normal" inputMode="numeric" onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(11) 99999-9999" type="tel" value={phone} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Código do cliente
                      <input className="rounded-sm border border-line bg-gray-50 px-4 py-3 font-normal text-gray-600" readOnly value={customerCode} />
                    </label>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button className="rounded-sm border border-line px-5 py-3 text-sm font-medium hover:border-ink" onClick={() => setProfileOpen(false)} type="button">Cancelar</button>
                  <button className="rounded-sm bg-ink px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="mt-5 border border-line bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
            <button className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6" onClick={() => setAddressesOpen((current) => !current)} type="button">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center bg-mist text-ink"><MapPin size={21} /></span>
                <span>
                  <strong className="block text-lg">Endereços salvos</strong>
                  <span className="mt-1 block text-sm text-gray-600">{addresses.length ? `${addresses.length} ${addresses.length === 1 ? "endereço salvo" : "endereços salvos"}` : "Nenhum endereço salvo"}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                {addressesOpen ? "Fechar" : "Gerenciar"}
                <ChevronDown className={`transition-transform ${addressesOpen ? "rotate-180" : ""}`} size={18} />
              </span>
            </button>

            {addressesOpen ? (
              <div className="border-t border-line p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-gray-600">Use seus endereços no checkout para entrega local ou motoboy.</p>
                  {!addressEditorOpen ? (
                    <button className="flex items-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-graphite" onClick={() => {
                      setAddressDraft(emptyAddress);
                      setAddressLookup("");
                      setAddressEditorOpen(true);
                    }} type="button">
                      <Plus size={17} />
                      Adicionar endereço
                    </button>
                  ) : null}
                </div>

                {addressEditorOpen ? (
                  <div className="mt-5 border border-line bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{addressDraft.id ? "Editar endereço" : "Novo endereço"}</h3>
                      <button className="grid size-9 place-items-center rounded-sm border border-line bg-white hover:border-ink" onClick={() => {
                        setAddressDraft(emptyAddress);
                        setAddressLookup("");
                        setAddressEditorOpen(false);
                      }} type="button" aria-label="Fechar formulário de endereço">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm md:col-span-2" onChange={(event) => updateAddressDraft("label", event.target.value)} placeholder="Nome do endereço (Casa, Trabalho...)" value={addressDraft.label} />
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto] md:col-span-2">
                        <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" inputMode="numeric" onChange={(event) => updateAddressDraft("cep", formatCep(event.target.value))} placeholder="CEP" value={addressDraft.cep} />
                        <button className="rounded-sm bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-graphite" onClick={lookupAddressCep} type="button">Buscar CEP</button>
                      </div>
                      <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm md:col-span-2" onChange={(event) => updateAddressDraft("street", event.target.value)} placeholder="Rua" value={addressDraft.street} />
                      <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => updateAddressDraft("number", event.target.value)} placeholder="Número" value={addressDraft.number} />
                      <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => updateAddressDraft("complement", event.target.value)} placeholder="Complemento" value={addressDraft.complement} />
                      <input className="rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => updateAddressDraft("neighborhood", event.target.value)} placeholder="Bairro" value={addressDraft.neighborhood} />
                      <div className="grid grid-cols-[1fr_80px] gap-2">
                        <input className="min-w-0 rounded-sm border border-line bg-white px-4 py-3 text-sm" onChange={(event) => updateAddressDraft("city", event.target.value)} placeholder="Cidade" value={addressDraft.city} />
                        <input className="min-w-0 rounded-sm border border-line bg-white px-3 py-3 text-sm uppercase" onChange={(event) => updateAddressDraft("state", event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" value={addressDraft.state} />
                      </div>
                      <textarea className="min-h-20 rounded-sm border border-line bg-white px-4 py-3 text-sm md:col-span-2" onChange={(event) => updateAddressDraft("notes", event.target.value)} placeholder="Informações adicionais" value={addressDraft.notes} />
                    </div>
                    {addressLookup ? <p className="mt-3 text-sm text-gray-600">{addressLookup}</p> : null}
                    <div className="mt-4 flex justify-end">
                      <button className="rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-60" disabled={addressSaving} onClick={saveAddress} type="button">
                        {addressSaving ? "Salvando..." : addressDraft.id ? "Salvar endereço" : "Adicionar endereço"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3">
                  {profileLoading ? <CardListSkeleton count={2} /> : addresses.length ? addresses.map((address) => (
                    <div key={address.id} className="grid gap-3 border border-line bg-gray-50 p-4 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <p className="font-semibold">{address.label}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{formatAddress(address)}</p>
                        {address.notes ? <p className="mt-1 text-sm text-gray-500">{address.notes}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-sm border border-line bg-white px-3 py-2 text-sm font-medium hover:border-ink" onClick={() => editAddress(address)} type="button">Editar</button>
                        <button className="rounded-sm border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={addressSaving} onClick={() => removeAddress(address.id)} type="button">Remover</button>
                      </div>
                    </div>
                  )) : !addressEditorOpen ? (
                    <div className="border border-dashed border-line bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                      Nenhum endereço salvo. Use “Adicionar endereço” quando precisar cadastrar um.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-5 border border-line bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <h2 className="text-lg font-semibold">Sessão e conta</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Saia desta sessão ou remova seu cadastro quando não quiser mais usar a conta.</p>
              </div>
              <button
                className="flex items-center justify-center gap-2 rounded-sm border border-line px-5 py-3 text-sm font-medium hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={accountAction !== null}
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={17} />
                {accountAction === "logout" ? "Saindo..." : "Sair"}
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-sm border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={accountAction !== null}
                onClick={handleDeleteAccount}
                type="button"
              >
                <Trash2 size={17} />
                {accountAction === "delete" ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </section>
        </CustomerAuthGate>
      </section>
    </Layout>
  );
}

function normalizeAddresses(value: CustomerAddress[]) {
  return value.map((address, index) => ({
    ...emptyAddress,
    ...address,
    id: address.id || `${index}-${address.cep || "endereco"}`
  }));
}

function formatAddress(address: CustomerAddress) {
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    address.neighborhood,
    `${address.city}${address.state ? ` - ${address.state}` : ""}`,
    address.cep
  ].filter(Boolean).join(" · ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
