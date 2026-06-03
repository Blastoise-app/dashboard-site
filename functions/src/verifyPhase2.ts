// One-off Phase 2 verification: read every client under gmp + its strategy
// snapshot the way the SPA does, and confirm assembleStrategyDoc would produce
// a renderable doc. Read-only.
//   GOOGLE_CLOUD_PROJECT=marketing-dashboard-site npx tsx functions/src/verifyPhase2.ts
import { adminDb } from "./lib/admin.js";

function tsToIso(ts: any): string {
  if (!ts) return "(none)";
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts.seconds === "number") {
    const ms = typeof ts.nanoseconds === "number" ? Math.floor(ts.nanoseconds / 1e6) : 0;
    return new Date(ts.seconds * 1000 + ms).toISOString();
  }
  return "(unknown)";
}

async function main() {
  const db = adminDb();
  const clients = await db.collection("agencies/gmp/clients").get();
  console.log(`gmp has ${clients.size} client(s):\n`);
  for (const c of clients.docs) {
    const d = c.data() as any;
    const snapDoc = await c.ref.collection("sheetSnapshots").doc("strategy").get();
    const s = snapDoc.exists ? (snapDoc.data() as any) : null;
    console.log(`• ${c.id}`);
    console.log(`    slug:        ${d.slug}`);
    console.log(`    brand:       ${d.brand?.name}`);
    console.log(`    reportTitle: ${d.reportTitle}`);
    console.log(`    sheet cfg:   ${d.dataSources?.sheet?.id ? "yes (" + d.dataSources.sheet.id.slice(0, 8) + "…)" : "none (sheet-less)"}`);
    if (!s) {
      console.log(`    snapshot:    MISSING ⚠️`);
    } else {
      console.log(
        `    snapshot:    title="${s.title}" | clusters=${s.clusters?.groups?.length ?? 0}g ` +
          `${(s.clusters?.groups ?? []).reduce((n: number, g: any) => n + (g.rows?.length ?? 0), 0)}rows | ` +
          `geo=${s.geoTracker?.keywords?.length ?? 0}kw | ` +
          `roadmap=${s.roadmap?.months?.length ?? 0}mo ` +
          `${(s.roadmap?.months ?? []).reduce((n: number, m: any) => n + (m.deliverables?.length ?? 0), 0)}deliv | ` +
          `kpi=${s.kpi ? "yes" : "no"} | overview=${s.overview ? "yes" : "no"}`,
      );
      console.log(`    lastUpdated: ${tsToIso(s.syncedAt)}`);
      const geoWithRow = (s.geoTracker?.keywords ?? []).filter((k: any) => k.rowId).length;
      console.log(`    geo rowIds:  ${geoWithRow}/${s.geoTracker?.keywords?.length ?? 0}`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
