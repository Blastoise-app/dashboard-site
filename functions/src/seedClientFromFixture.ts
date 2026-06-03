// Seed a fixture-only client (NO live sheet) into Firestore by splitting a flat
// web StrategyDoc fixture into the two docs the dashboard reads — the exact
// inverse of web/src/lib/strategyDoc.ts#assembleStrategyDoc:
//   - /agencies/{a}/clients/{c}                          → Client (presentation/config)
//   - /agencies/{a}/clients/{c}/sheetSnapshots/strategy  → SheetSnapshot (data)
//
// Use this ONLY for demo/sheet-less clients (e.g. ideogram) so they appear in
// the agency list and render. Sheet-backed clients (e.g. neuraltrust) use
// seedClient.ts for the Client doc; their snapshot is written by the live sync.
//
// Usage (Admin SDK + ADC — run `gcloud auth application-default login` first):
//   npx tsx functions/src/seedClientFromFixture.ts <agencyId> <fixtureSlug>
//   npx tsx functions/src/seedClientFromFixture.ts gmp ideogram
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/admin.js";
import type {
  Brand,
  Overview,
  Clusters,
  GeoTracker,
  Roadmap,
  KpiReport,
} from "../../shared/types.js";

// The subset of the flat web fixture (web/src/fixtures/*.json) that gets SEEDED
// into Firestore. Kept local — the web `StrategyDoc` pulls in Vite-only JSON
// imports we can't compile here. It intentionally OMITS `contentReview`: the
// SheetSnapshot never carries it (StrategyView derives review items from the
// roadmap at read time), so this type must track SheetSnapshot (shared/types.ts),
// NOT the bundle-only StrategyDoc. Don't add fields the snapshot shouldn't hold.
interface FixtureDoc {
  slug: string;
  title: string;
  subtitle: string;
  brand: Brand;
  lastUpdated?: string;
  overview?: Overview;
  clusters?: Clusters;
  geoTracker?: GeoTracker;
  roadmap?: Roadmap;
  kpi?: KpiReport;
}

async function main() {
  const agencyId = process.argv[2];
  const slug = process.argv[3];
  if (!agencyId || !slug) {
    console.error("Usage: npx tsx functions/src/seedClientFromFixture.ts <agencyId> <fixtureSlug>");
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const fixturePath = resolve(here, "../../web/src/fixtures", `${slug}.json`);
  const doc = JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureDoc;

  const db = adminDb();
  const clientRef = db.doc(`agencies/${agencyId}/clients/${slug}`);
  const existing = await clientRef.get();

  // --- Client doc (presentation/config half) ---
  const clientData = {
    id: slug,
    slug: doc.slug || slug,
    name: shortName(doc.title) || slug,
    brand: doc.brand,
    allowedDomains: [] as string[],
    reportTitle: doc.title,
    reportSubtitle: doc.subtitle,
    // Sheet-less: an empty, unverified sheet connection keeps the shape uniform
    // and ensures the hourly sync skips it (no id/tabTitles → skipped).
    dataSources: {
      sheet: { id: "", status: "unverified" as const },
      ga4: { status: "unverified" as const, propertyId: "" },
      gsc: { status: "unverified" as const, siteUrl: "" },
    },
    createdBy: "seedFromFixture",
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  // --- SheetSnapshot doc (data half) ---
  // syncedAt derives from the fixture's ISO lastUpdated so the freshness badge
  // shows a real date; falls back to now if the fixture lacks one.
  const syncedAt = doc.lastUpdated
    ? Timestamp.fromDate(new Date(doc.lastUpdated))
    : FieldValue.serverTimestamp();
  const snapshot = {
    title: doc.title ?? "",
    subtitle: doc.subtitle ?? "",
    ...(doc.overview ? { overview: doc.overview } : {}),
    clusters: doc.clusters ?? { groups: [] },
    geoTracker: doc.geoTracker ?? { levers: [], keywords: [] },
    roadmap: doc.roadmap ?? { intro: "", months: [] },
    ...(doc.kpi ? { kpi: doc.kpi } : {}),
    syncedAt,
  };

  await clientRef.set(clientData, { merge: true });
  await clientRef.collection("sheetSnapshots").doc("strategy").set(snapshot);

  console.log(
    `${existing.exists ? "↻ Updated" : "✓ Created"} client agencies/${agencyId}/clients/${slug}` +
      `\n  from fixture: web/src/fixtures/${slug}.json` +
      `\n  title:        ${doc.title}` +
      `\n  sections:     ${doc.clusters?.groups?.length ?? 0} cluster groups / ` +
      `${doc.geoTracker?.keywords?.length ?? 0} geo kw / ${doc.roadmap?.months?.length ?? 0} months` +
      `${doc.kpi ? " / kpi" : ""}` +
      `\n  syncedAt:     ${doc.lastUpdated ?? "(now)"}` +
      `\n\nIt will now appear in the agency list + render from Firestore. Note: this is a` +
      `\nsheet-less seed; the hourly sync ignores it (no sheet config).`,
  );
}

function shortName(title: string): string {
  return (title || "").split("—")[0].trim();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
