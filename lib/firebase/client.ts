import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyDU9TRAY_Vh7wSN4f5F1ZIzw6xNyX-SbYQ",
  authDomain: "jaeseung-try-2-34973152-e44aa.firebaseapp.com",
  projectId: "jaeseung-try-2-34973152-e44aa",
  storageBucket: "jaeseung-try-2-34973152-e44aa.firebasestorage.app",
  messagingSenderId: "385012475164",
  appId: "1:385012475164:web:a09491f1654c6e1ac486d9",
};

let firestoreInstance: Firestore | null = null;

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  };
}

function assertFirebaseConfig() {
  const config = getFirebaseConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing Firebase web config: ${missing.join(", ")}`);
  }

  return config;
}

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp(assertFirebaseConfig());
}

function getFirestoreInstance(app: FirebaseApp) {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }

  return firestoreInstance;
}

export function getFirebaseServices() {
  const app = getFirebaseApp();

  return {
    app,
    auth: getAuth(app),
    db: getFirestoreInstance(app),
    functions: getFunctions(app, "asia-northeast3"),
    storage: getStorage(app),
  };
}
