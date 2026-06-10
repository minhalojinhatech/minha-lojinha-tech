import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const serviceAccount = parseServiceAccount();
  const projectId =
    serviceAccount?.project_id ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = serviceAccount?.client_email || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (serviceAccount?.private_key || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

function parseServiceAccount() {
  const value = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!value) return null;

  try {
    return JSON.parse(value) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new Error("FIREBASE_ADMIN_INVALID_CREDENTIAL");
  }
}
