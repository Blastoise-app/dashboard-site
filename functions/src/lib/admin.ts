import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

export function adminApp(): App {
  if (app) return app;
  app = getApps()[0] ?? initializeApp();
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}
