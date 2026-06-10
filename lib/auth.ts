import {
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, collections, db, googleProvider } from "@/lib/firebase";
import type { CustomerAddress } from "@/lib/types";

export function isStoreOwner(user: User | null | undefined) {
  return user?.email?.toLowerCase() === "minhalojinhatech@gmail.com";
}

export type UserProfileForm = {
  fullName: string;
  phone: string;
  photoURL?: string;
  addresses?: CustomerAddress[];
};

export const passwordPolicy = {
  minLength: 6,
  maxLength: 16
} as const;

export function getPasswordPolicyChecks(password: string) {
  return [
    { id: "length", label: "De 6 a 16 caracteres", valid: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength },
    { id: "lowercase", label: "Uma letra minúscula", valid: /[a-z]/.test(password) },
    { id: "number", label: "Um número", valid: /\d/.test(password) },
    { id: "special", label: "Um caractere especial", valid: /[^A-Za-z0-9]/.test(password) }
  ];
}

export function validateNewPassword(password: string) {
  const missing = getPasswordPolicyChecks(password).filter((item) => !item.valid);
  if (missing.length) {
    throw new Error(`A senha precisa ter ${missing.map((item) => item.label.toLowerCase()).join(", ")}.`);
  }
}

export async function registerWithEmail(email: string, password: string, profile: UserProfileForm) {
  validateNewPassword(password);
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.length > 0 && !methods.includes("password")) {
    throw new Error("Este e-mail já foi usado com Google. Entre com Google ou use outro e-mail.");
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: profile.fullName });
  await upsertUserProfile(credential.user, "password", profile);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.length > 0 && !methods.includes("password")) {
    throw new Error("Esta conta foi criada com Google. Entre com Google em vez de senha.");
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  await upsertUserProfile(credential.user, "password");
  return credential.user;
}

export async function loginWithGoogle() {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    await upsertUserProfile(credential.user, "google.com");
    return credential.user;
  } catch (error) {
    const authError = error as { code?: string };
    if (authError.code === "auth/account-exists-with-different-credential") {
      throw new Error("Este e-mail já existe com outro método de login. Use o método original da conta.");
    }
    throw error;
  }
}

export async function updateCustomerProfile(profile: UserProfileForm) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Entre na conta para atualizar seus dados.");
  }

  const nextProfile: { displayName?: string; photoURL?: string } = {};

  if (profile.fullName && profile.fullName !== currentUser.displayName) {
    nextProfile.displayName = profile.fullName;
  }

  if (profile.photoURL !== undefined && profile.photoURL !== currentUser.photoURL) {
    nextProfile.photoURL = profile.photoURL;
  }

  if (Object.keys(nextProfile).length) {
    await updateProfile(currentUser, nextProfile);
  }

  await upsertUserProfile(currentUser, currentUser.providerData[0]?.providerId === "google.com" ? "google.com" : "password", profile);
}

export async function getCustomerProfile(uid: string) {
  const snapshot = await getDoc(doc(db, collections.users, uid));
  return snapshot.exists() ? snapshot.data() as Partial<UserProfileForm> & { email?: string; customerCode?: string } : null;
}

export async function logout() {
  await signOut(auth);
}

export async function deleteCustomerAccount() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Entre na conta para excluir seu cadastro.");
  }

  const profileRef = doc(db, collections.users, currentUser.uid);
  const profileSnapshot = await getDoc(profileRef);
  const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null;

  if (profileSnapshot.exists()) {
    await deleteDoc(profileRef);
  }

  try {
    await deleteUser(currentUser);
  } catch (error) {
    if (profileData) {
      await setDoc(profileRef, profileData, { merge: true });
    }
    throw error;
  }
}

export function getFriendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
  const message = error instanceof Error ? error.message : "";

  if (message && !message.startsWith("Firebase:")) {
    return message;
  }

  switch (code) {
    case "auth/email-already-in-use":
      return "Essa conta já existe. Entre com esse e-mail ou use outro endereço.";
    case "auth/invalid-email":
      return "Digite um e-mail valido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "A senha deve ter de 6 a 16 caracteres, uma letra minúscula, um número e um caractere especial.";
    case "auth/popup-closed-by-user":
      return "Login com Google cancelado antes de concluir.";
    case "auth/account-exists-with-different-credential":
      return "Esse e-mail já foi cadastrado com outro método de entrada. Use o método original da conta.";
    case "auth/network-request-failed":
      return "Não foi possível conectar agora. Verifique sua internet e tente novamente.";
    case "auth/requires-recent-login":
      return "Por segurança, entre novamente na conta antes de excluir seu cadastro.";
    default:
      return "Não foi possível concluir. Tente novamente em alguns instantes.";
  }
}

async function upsertUserProfile(user: User, provider: "password" | "google.com", profile?: Partial<UserProfileForm>) {
  const profileData =
    profile
      ? {
          fullName: profile.fullName ?? user.displayName ?? "",
          phone: profile.phone ?? "",
          displayName: profile.fullName ?? user.displayName ?? "",
          photoURL: profile.photoURL ?? user.photoURL ?? "",
          ...(profile.addresses ? { addresses: profile.addresses } : {})
        }
      : {
          displayName: user.displayName ?? "",
          photoURL: user.photoURL ?? ""
        };

  await setDoc(
    doc(db, collections.users, user.uid),
    {
      uid: user.uid,
      email: user.email,
      customerCode: buildCustomerCode(user.uid),
      ...profileData,
      provider,
      role: isStoreOwner(user) ? "owner" : "customer",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function buildCustomerCode(uid: string) {
  return `CLI-${uid.slice(0, 6).toUpperCase()}`;
}
