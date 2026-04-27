import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/admin.js";
import {
  buildClaims,
  isPlatformAdminEmail,
  matchAgencyByDomain,
  type ClientMatch,
} from "./lib/auth.js";

// Blocking trigger that runs on every Google sign-up. Determines the user's
// role from email + domain, writes /users/{uid}, and returns custom claims so
// the auth token carries them on first sign-in. Rejects (HttpsError) if no
// agency or client matches the email domain — the auth user is not created.
export const beforeCreateUser = beforeUserCreated(async (event) => {
  const user = event.data;
  const email = user?.email;
  const uid = user?.uid;
  if (!email || !uid) {
    throw new HttpsError("invalid-argument", "Missing email or uid on auth event.");
  }

  const db = adminDb();
  const now = FieldValue.serverTimestamp();

  // Platform admin: hardcoded allowlist, takes precedence.
  if (isPlatformAdminEmail(email)) {
    const claims = buildClaims({ role: "platform_admin" });
    await db.doc(`users/${uid}`).set(
      {
        uid,
        email,
        role: "platform_admin",
        createdAt: now,
        lastSeenAt: now,
      },
      { merge: true },
    );
    return { customClaims: claims };
  }

  // Agency match: scan all agencies for emailDomains containing the user's domain.
  const agenciesSnap = await db.collection("agencies").get();
  const agencies = agenciesSnap.docs.map((d) => ({
    id: d.id,
    emailDomains: (d.data().emailDomains ?? []) as string[],
  }));
  const agencyMatch = matchAgencyByDomain(email, agencies);
  if (agencyMatch) {
    const claims = buildClaims({ role: "agency", agencyId: agencyMatch.agencyId });
    await db.doc(`users/${uid}`).set(
      {
        uid,
        email,
        role: "agency",
        agencyId: agencyMatch.agencyId,
        createdAt: now,
        lastSeenAt: now,
      },
      { merge: true },
    );
    return { customClaims: claims };
  }

  // Client match: collection-group query against allowedDomains.
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const clientsSnap = await db
    .collectionGroup("clients")
    .where("allowedDomains", "array-contains", domain)
    .get();
  const matches: ClientMatch[] = clientsSnap.docs.map((d) => ({
    agencyId: d.ref.parent.parent!.id,
    clientId: d.id,
  }));
  if (matches.length > 0) {
    const claims = buildClaims({ role: "client", clientRefs: matches });
    await db.doc(`users/${uid}`).set(
      {
        uid,
        email,
        role: "client",
        clientRefs: matches,
        createdAt: now,
        lastSeenAt: now,
      },
      { merge: true },
    );
    return { customClaims: claims };
  }

  // No match — reject. Throwing an HttpsError prevents the auth user from being created.
  throw new HttpsError(
    "permission-denied",
    "This email isn't authorized for any client or agency. Contact your administrator.",
  );
});
