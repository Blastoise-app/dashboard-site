// Ops tool: run the sync ONCE locally, exercising the exact same syncClient the
// deployed scheduled function uses. Faithful because the deployed function runs
// AS the sheets-ingest SA, and local ADC impersonates that same SA — same
// identity, same permissions, same code. Writes the real Firestore snapshot.
//
//   GOOGLE_CLOUD_PROJECT=marketing-dashboard-site npx tsx functions/src/runSyncOnce.ts
import { adminDb } from "./lib/admin.js";
import { syncClient } from "./syncSheets.js";
import type { Client } from "../../shared/types.js";

async function main() {
  const db = adminDb();
  const snap = await db.collectionGroup("clients").get();
  const targets = snap.docs.filter((d) => {
    const sheet = (d.data() as Client)?.dataSources?.sheet;
    return !!sheet?.id && !!sheet.tabTitles;
  });
  console.log(`runSyncOnce: ${targets.length} client(s) with a sheet configured`);
  for (const d of targets) {
    const result = await syncClient(d.ref, d.data() as Client);
    console.log("  →", result);
  }
}

main().catch((err) => {
  console.error("runSyncOnce failed:", err?.message ?? err);
  process.exitCode = 1;
});
