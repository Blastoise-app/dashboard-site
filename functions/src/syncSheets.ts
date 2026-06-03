// Scheduled ingest: hourly, pull every configured client's Google Sheet through
// the parsers, validate (FAIL CLOSED), and write a SheetSnapshot to Firestore.
// The function runs AS the ingest service account (keyless — no key file); see
// sheets-io for how the spreadsheets-scoped token is minted.
//
// Source of truth split: the snapshot doc is fully overwritten on each run and
// is read-only to clients; per-row review state lives elsewhere (Phase 4).
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/admin.js";
import { buildSnapshot } from "./lib/ingest.js";
import { snapshotCounts, validateSnapshot, type ValidateOptions } from "./lib/snapshot.js";
import type { Client, SheetExpectMinimums } from "../../shared/types.js";

const INGEST_SA = "sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com";

function mapExpect(e?: SheetExpectMinimums): ValidateOptions["expect"] {
  if (!e) return undefined;
  return {
    minClusterGroups: e.clusterGroups,
    minClusterRows: e.clusterRows,
    minGeoKeywords: e.geoKeywords,
    minDeliverables: e.deliverables,
  };
}

/**
 * Sync one client. Returns a short status string for logging. Never throws —
 * a fetch/parse/validation failure records `status:'error'` + `lastError` on the
 * client's sheet connection WITHOUT overwriting the last-good snapshot.
 */
export async function syncClient(
  ref: FirebaseFirestore.DocumentReference,
  client: Client,
): Promise<string> {
  const label = `${ref.parent.parent?.id ?? "?"}/${ref.id}`;
  const sheet = client.dataSources?.sheet;
  if (!sheet?.id || !sheet.tabTitles) return `${label}: skipped (no sheet config)`;

  try {
    const { snapshot, minted } = await buildSnapshot({
      sheetId: sheet.id,
      tabTitles: sheet.tabTitles,
      title: client.reportTitle ?? client.name ?? "",
      subtitle: client.reportSubtitle ?? "",
    });

    const problems = validateSnapshot(snapshot, {
      requireRowIds: true,
      expect: mapExpect(sheet.expectMinimums),
    });
    if (problems.length > 0) {
      logger.error(`syncSheets ${label}: validation failed — snapshot NOT written`, { problems });
      await ref.set(
        { dataSources: { sheet: { status: "error", lastError: problems.slice(0, 5).join("; ") } } },
        { merge: true },
      );
      return `${label}: ERROR (${problems.length} validation problem(s))`;
    }

    // Full overwrite — the snapshot is derived + disposable; any manual edit is
    // intentionally clobbered.
    await ref.collection("sheetSnapshots").doc("strategy").set({
      ...snapshot,
      syncedAt: FieldValue.serverTimestamp(),
    });
    await ref.set(
      {
        lastFetchedAt: FieldValue.serverTimestamp(),
        dataSources: {
          sheet: {
            status: "ok",
            verifiedAt: FieldValue.serverTimestamp(),
            lastError: FieldValue.delete(),
          },
        },
      },
      { merge: true },
    );

    const c = snapshotCounts(snapshot);
    logger.info(`syncSheets ${label}: ok`, { minted, counts: c });
    return `${label}: ok (${c.clusterRows} clusters / ${c.geoKeywords} geo / ${c.roadmapDeliverables} deliverables; minted geo ${minted.geo})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`syncSheets ${label}: ${msg}`);
    // Record the failure without clobbering the snapshot. Best-effort — if even
    // this write fails, swallow it (the next run retries the whole client).
    await ref
      .set({ dataSources: { sheet: { status: "error", lastError: msg } } }, { merge: true })
      .catch(() => {});
    return `${label}: ERROR (${msg})`;
  }
}

export const syncSheetsScheduled = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Etc/UTC",
    serviceAccount: INGEST_SA,
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async () => {
    const db = adminDb();
    // Enumerate every client across every agency; filter to those with a sheet
    // configured. (Collection-group read; admin SDK bypasses security rules.)
    const snap = await db.collectionGroup("clients").get();
    const targets = snap.docs.filter((d) => {
      const sheet = (d.data() as Client)?.dataSources?.sheet;
      return !!sheet?.id && !!sheet.tabTitles;
    });
    logger.info(`syncSheets: ${targets.length} client(s) with a sheet configured`);

    // Serial — at this scale (≤ a handful of clients hourly) it keeps the Sheets
    // API call rate trivially low and the logs readable.
    const results: string[] = [];
    for (const d of targets) {
      results.push(await syncClient(d.ref, d.data() as Client));
    }
    logger.info(`syncSheets: done\n${results.join("\n")}`);
  },
);
