import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/admin.js";
import { buildClaims, resolveAccess } from "./lib/auth.js";

// Blocking trigger that runs on every Google sign-up. Resolves the user's role
// from the hardcoded allowlist (see lib/auth.ts), writes /users/{uid}, and
// returns custom claims so the auth token carries them on first sign-in.
// Rejects (HttpsError) if the email matches no agency or client — the auth user
// is not created.
export const beforeCreateUser = beforeUserCreated(async (event) => {
  const user = event.data;
  const email = user?.email;
  const uid = user?.uid;
  if (!email || !uid) {
    throw new HttpsError("invalid-argument", "Missing email or uid on auth event.");
  }

  const access = resolveAccess(email);
  if (!access) {
    // No match — reject. Throwing here prevents the auth user from being created.
    throw new HttpsError(
      "permission-denied",
      "This email isn't authorized for any client or agency. Contact your administrator.",
    );
  }

  const db = adminDb();
  const now = FieldValue.serverTimestamp();
  const userDoc: Record<string, unknown> = {
    uid,
    email,
    role: access.role,
    createdAt: now,
    lastSeenAt: now,
  };
  if (access.role === "agency") userDoc.agencyId = access.agencyId;
  if (access.role === "client") userDoc.clientRefs = access.clientRefs;

  await db.doc(`users/${uid}`).set(userDoc, { merge: true });
  return { customClaims: buildClaims(access) };
});
