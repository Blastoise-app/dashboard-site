import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

export function adminApp(): App {
  if (app) return app;
  app = getApps()[0] ?? initializeApp();
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  if (db) return db;
  db = getFirestore(adminApp());
  // The sheet parsers emit `undefined` for absent optional fields (docLink,
  // asOf, cpc, …); without this the Admin SDK throws on the snapshot write.
  // Set once, before any operation (settings() throws if called twice/late).
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}
