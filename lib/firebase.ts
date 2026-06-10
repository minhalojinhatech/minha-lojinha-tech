import { getAnalytics, isSupported } from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAftJ05xfy5dGnpBuuL9V3w0rJPMGWavMo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "minhalojinhatech.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "minhalojinhatech",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "minhalojinhatech.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1044701830249",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1044701830249:web:0bf10d40dda2b1875b16f8",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X8FXHCEP3Q"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const analyticsPromise =
  typeof window === "undefined"
    ? Promise.resolve(null)
    : isSupported().then((supported) => (supported ? getAnalytics(app) : null));

export const ownerEmail = "minhalojinhatech@gmail.com";

export const collections = {
  users: "users",
  products: "products",
  orders: "orders",
  reviews: "reviews",
  serviceRequests: "serviceRequests",
  repairs: "repairs",
  repairWarrantyCodes: "repairWarrantyCodes",
  repairWarranties: "repairWarranties",
  agreements: "agreements",
  coupons: "coupons",
  couponUsages: "couponUsages",
  categories: "categories",
  deliveryZones: "deliveryZones",
  storeSettings: "storeSettings",
  demandModels: "demandModels",
  demandInterests: "demandInterests",
  demandSuggestions: "demandSuggestions",
  collaborationSubmissions: "collaborationSubmissions"
} as const;
