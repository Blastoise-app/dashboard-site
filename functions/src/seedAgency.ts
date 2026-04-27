// Bootstrap script: create or update an agency document directly.
// Usage:
//   npx tsx functions/src/seedAgency.ts <slug> <ownerEmail> [emailDomain1,emailDomain2]
// Example:
//   npx tsx functions/src/seedAgency.ts growth-marketing-pro hailey@growthmarketingpro.com growthmarketingpro.com
//
// Uses Firebase Admin SDK with application-default credentials (set
// GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login`
// followed by `firebase use --add` to pick the project).

import { adminDb } from "./lib/admin.js";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const slug = process.argv[2];
  const ownerEmail = process.argv[3];
  const domainsArg = process.argv[4];

  if (!slug || !ownerEmail) {
    console.error(
      "Usage: npx tsx functions/src/seedAgency.ts <slug> <ownerEmail> [domain1,domain2]",
    );
    process.exit(1);
  }

  const emailDomains = domainsArg
    ? domainsArg.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean)
    : [ownerEmail.split("@")[1].toLowerCase()];

  const db = adminDb();
  const ref = db.doc(`agencies/${slug}`);
  const existing = await ref.get();

  const data = {
    id: slug,
    slug,
    name: deriveNameFromSlug(slug),
    emailDomains,
    ownerEmail,
    plan: "starter" as const,
    brand: { name: deriveNameFromSlug(slug) },
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  await ref.set(data, { merge: true });

  console.log(
    `${existing.exists ? "↻ Updated" : "✓ Created"} agency ${slug}` +
      `\n  ownerEmail:    ${ownerEmail}` +
      `\n  emailDomains:  ${emailDomains.join(", ")}`,
  );
}

function deriveNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
