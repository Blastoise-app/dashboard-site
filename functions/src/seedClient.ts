// Bootstrap script: create or update a client document from its clients/*.json
// config, so the scheduled ingest (syncSheetsScheduled) can find and sync it.
//
// Usage:
//   npx tsx functions/src/seedClient.ts <clientId> [agencyId] [sheetIdOverride]
// Example:
//   npx tsx functions/src/seedClient.ts neuraltrust
//
// Reads clients/<clientId>.json. agencyId/sheetId come from that file unless
// overridden on the command line. Uses Admin SDK with ADC — run
//   gcloud auth application-default login
// first (the deployer identity; admin writes bypass security rules).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/admin.js";

interface ClientConfig {
  agencyId?: string;
  clientId?: string;
  slug: string;
  name: string;
  title?: string;
  subtitle?: string;
  brand: { name: string; chipBg?: string };
  allowedDomains?: string[];
  sheetId: string;
  tabTitles: {
    roadmap: string;
    geoTracker: string;
    clusters: string;
    kpiObjectives: string;
    performanceProjections?: string;
  };
  expectMinimums?: {
    clusterGroups?: number;
    clusterRows?: number;
    geoKeywords?: number;
    deliverables?: number;
  };
}

async function main() {
  const clientId = process.argv[2];
  if (!clientId) {
    console.error(
      "Usage: npx tsx functions/src/seedClient.ts <clientId> [agencyId] [sheetIdOverride]",
    );
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const configPath = resolve(here, "../../clients", `${clientId}.json`);
  const config = JSON.parse(readFileSync(configPath, "utf8")) as ClientConfig;

  const agencyId = process.argv[3] || config.agencyId;
  const sheetId = process.argv[4] || config.sheetId;
  if (!agencyId) {
    console.error(`No agencyId for ${clientId} (add "agencyId" to ${clientId}.json or pass it).`);
    process.exit(1);
  }
  if (!config.tabTitles) {
    console.error(`${clientId}.json has no "tabTitles" — cannot seed the ingest config.`);
    process.exit(1);
  }

  const db = adminDb();
  const ref = db.doc(`agencies/${agencyId}/clients/${clientId}`);
  const existing = await ref.get();

  const data = {
    id: clientId,
    slug: config.slug,
    name: config.name,
    brand: config.brand,
    allowedDomains: config.allowedDomains ?? [],
    reportTitle: config.title,
    reportSubtitle: config.subtitle,
    dataSources: {
      sheet: {
        id: sheetId,
        status: "unverified" as const,
        tabTitles: config.tabTitles,
        ...(config.expectMinimums ? { expectMinimums: config.expectMinimums } : {}),
      },
      ga4: { status: "unverified" as const, propertyId: "" },
      gsc: { status: "unverified" as const, siteUrl: "" },
    },
    createdBy: "seed",
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  await ref.set(data, { merge: true });

  console.log(
    `${existing.exists ? "↻ Updated" : "✓ Created"} client agencies/${agencyId}/clients/${clientId}` +
      `\n  sheetId:   ${sheetId}` +
      `\n  tabs:      ${Object.values(config.tabTitles).join(", ")}` +
      `\n  domains:   ${(config.allowedDomains ?? []).join(", ") || "(none)"}` +
      `\n\nNext: the hourly syncSheetsScheduled function will pick this up; trigger it now with` +
      `\n  gcloud scheduler jobs run <job> --location=us-central1` +
      `\n(NB: the parent agencies/${agencyId} doc is not required for sync, but seed it via` +
      `\n seedAgency.ts before client sign-in needs to read it.)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
