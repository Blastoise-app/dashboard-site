// Bootstrap script: promote a user to platform_admin.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json npx tsx functions/src/seedPlatformAdmin.ts <email>
//
// Or, if the project is set via `firebase use`, you can also run:
//   FIREBASE_PROJECT=<project-id> npx tsx ... using application-default credentials
//   from `gcloud auth application-default login`.
//
// This script:
//   1. Looks up the auth user by email.
//   2. Sets custom claims { role: "platform_admin" } on that user.
//   3. Writes /users/{uid} with role=platform_admin.
//
// Run this AFTER the user has signed in once (so the auth user exists).
// Note: the onUserCreate blocking trigger already sets these for emails in
// PLATFORM_ADMIN_EMAILS. This script is a fallback / re-promotion tool.

import { adminAuth, adminDb } from "./lib/admin.js";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx functions/src/seedPlatformAdmin.ts <email>");
    process.exit(1);
  }

  const auth = adminAuth();
  const db = adminDb();

  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(`No auth user found for ${email}. Have they signed in at least once?`);
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, { role: "platform_admin" });
  await db.doc(`users/${user.uid}`).set(
    {
      uid: user.uid,
      email,
      role: "platform_admin",
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`✓ ${email} promoted to platform_admin (uid=${user.uid}).`);
  console.log("  They must sign out and sign back in for the new claim to take effect.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
