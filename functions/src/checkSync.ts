// Ops check: read the deployed sync's output from Firestore and report health.
// Reads the client doc + its strategy snapshot, prints counts, rowId coverage,
// freshness, and the sheet connection status. Read-only.
//
//   GOOGLE_CLOUD_PROJECT=marketing-dashboard-site \
//     npx tsx functions/src/checkSync.ts [agencyId] [clientId]
import { adminDb } from "./lib/admin.js";
import type { Client, SheetSnapshot } from "../../shared/types.js";

function tsToIso(ts: unknown): string {
  if (!ts) return "(none)";
  const t = ts as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000).toISOString();
  return String(ts);
}

async function main() {
  const agencyId = process.argv[2] || "gmp";
  const clientId = process.argv[3] || "neuraltrust";
  const db = adminDb();

  const clientRef = db.doc(`agencies/${agencyId}/clients/${clientId}`);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) {
    console.log(`✗ client agencies/${agencyId}/clients/${clientId} does not exist`);
    process.exitCode = 1;
    return;
  }
  const client = clientSnap.data() as Client;
  const sheet = client.dataSources?.sheet;
  console.log(`Client agencies/${agencyId}/clients/${clientId}`);
  console.log(`  sheet.status:   ${sheet?.status ?? "(none)"}`);
  console.log(`  sheet.lastError:${sheet?.lastError ? " " + sheet.lastError : " (none)"}`);
  console.log(`  verifiedAt:     ${tsToIso(sheet?.verifiedAt)}`);
  console.log(`  lastFetchedAt:  ${tsToIso(client.lastFetchedAt)}`);

  const snapRef = clientRef.collection("sheetSnapshots").doc("strategy");
  const snapDoc = await snapRef.get();
  if (!snapDoc.exists) {
    console.log(`\n✗ snapshot sheetSnapshots/strategy NOT present yet`);
    process.exitCode = 1;
    return;
  }
  const s = snapDoc.data() as SheetSnapshot;
  const clusterRows = s.clusters.groups.reduce((n, g) => n + g.rows.length, 0);
  const deliverables = s.roadmap.months.flatMap((m) => m.deliverables);
  const dWithRow = deliverables.filter((d) => d.rowId).length;
  const kWithRow = s.geoTracker.keywords.filter((k) => k.rowId).length;

  console.log(`\nSnapshot sheetSnapshots/strategy`);
  console.log(`  syncedAt:       ${tsToIso(s.syncedAt)}`);
  console.log(`  title:          ${s.title}`);
  console.log(`  clusters:       ${s.clusters.groups.length} groups / ${clusterRows} rows`);
  console.log(`  geoKeywords:    ${s.geoTracker.keywords.length} (rowId: ${kWithRow}/${s.geoTracker.keywords.length})`);
  console.log(`  roadmap:        ${s.roadmap.months.length} months / ${deliverables.length} deliverables (rowId: ${dWithRow}/${deliverables.length} — read-only, none expected)`);
  console.log(`  kpi:            ${s.kpi?.objectives.length ?? 0} objectives / ${s.kpi?.targets.length ?? 0} targets`);
  console.log(`  months:         ${s.roadmap.months.map((m) => m.label).join(" | ")}`);

  // Print a few sample GEO rowIds so a second run can be compared for
  // idempotency. (Roadmap is read-only — no rowIds to compare.)
  const sampleK = s.geoTracker.keywords.slice(0, 4).map((k) => `${k.keyword}=${k.rowId}`);
  console.log(`  sample geo rowIds:  ${sampleK.join("  ")}`);

  // Health gate keys off GEO rowId coverage only — roadmap deliverables never
  // carry a minted rowId (read-only IMPORTRANGE mirror).
  const geoRowIdsComplete = kWithRow === s.geoTracker.keywords.length;
  console.log(`\n${geoRowIdsComplete && sheet?.status === "ok" ? "✓ healthy" : "⚠ check above"}`);
}

main().catch((err) => {
  console.error("checkSync failed:", err?.message ?? err);
  process.exitCode = 1;
});
