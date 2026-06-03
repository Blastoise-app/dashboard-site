// Ingest orchestrator: turn a client's live Google Sheet into a validated
// ParsedSnapshot. This is the IO-bearing layer that sits between the keyless
// Sheets client (sheets-io) and the pure validate gate (snapshot.ts):
//
//   fetch tabs → mint _rowId on GEO Tracker (roadmap is read-only) →
//   re-fetch (to pick up freshly minted ids) → parse 4 sections → assemble.
//
// The scheduled function (syncSheets) calls this, then runs validateSnapshot
// and writes Firestore. Kept separate from snapshot.ts so that file stays pure
// (unit-testable without network).
import type { ParsedSnapshot } from "./snapshot.js";
import type { SheetTabTitles } from "../../../shared/types.js";
import { detectHeaderRow } from "./header-table.js";
import { ensureRowIds, fetchSheetTabs } from "./sheets-io.js";
import { parseRoadmapStatus } from "./parse-roadmap-status.js";
import { parseClustersStacked } from "./parse-clusters-stacked.js";
import { parseGeoTrackerHeader, GEO_REQUIRED_HEADERS } from "./parse-geo-tracker-header.js";
import { parseKpi } from "./parse-kpi.js";

export interface BuildSnapshotConfig {
  sheetId: string;
  tabTitles: SheetTabTitles;
  title: string;
  subtitle: string;
}

export interface BuildSnapshotResult {
  snapshot: ParsedSnapshot;
  minted: { geo: number };
}

/**
 * Build a ParsedSnapshot from the live sheet. Mints `_rowId` on the GEO Tracker
 * tab only (idempotent — a second run mints 0); the roadmap is read-only (a live
 * IMPORTRANGE mirror — see step 2). `dryRunNoWrite` reports what minting WOULD
 * do without touching the sheet (GEO rows then carry no rowIds, so validate with
 * `requireRowIds:false`).
 */
export async function buildSnapshot(
  cfg: BuildSnapshotConfig,
  opts: { dryRunNoWrite?: boolean } = {},
): Promise<BuildSnapshotResult> {
  const { sheetId, tabTitles } = cfg;
  const dryRunNoWrite = opts.dryRunNoWrite ?? false;

  const titles = [
    tabTitles.roadmap,
    tabTitles.clusters,
    tabTitles.geoTracker,
    tabTitles.kpiObjectives,
    ...(tabTitles.performanceProjections ? [tabTitles.performanceProjections] : []),
  ];

  // 1. Initial fetch — header detection needs the grids in hand.
  let grids = await fetchSheetTabs(sheetId, titles);

  // 2. Mint _rowId on the GEO Tracker ONLY. The roadmap is intentionally
  //    read-only: that tab is a live IMPORTRANGE mirror of an upstream master
  //    doc — its whole grid is spill output and fully protected — so a _rowId
  //    column there is impossible to write and would be unstable anyway (the ids
  //    wouldn't track upstream row reorders). Roadmap rows are joined by natural
  //    key (Phase 4); here they simply carry no rowId.
  //
  //    Locate the GEO header the way the parser does, so ensureRowIds can
  //    cross-check the index it independently re-detects on its own write-read
  //    (a mismatch => a row moved between reads => fail closed, mint nothing).
  const gHdr = detectHeaderRow(grids.get(tabTitles.geoTracker) ?? [], GEO_REQUIRED_HEADERS);
  if (gHdr < 0) {
    throw new Error(`geo tab "${tabTitles.geoTracker}": header row not found (mint aborted)`);
  }
  const mg = await ensureRowIds(sheetId, tabTitles.geoTracker, GEO_REQUIRED_HEADERS, {
    dryRunNoWrite,
    expectHeaderRow: gHdr,
  });

  // 3. Re-fetch only when ids were actually minted, so the parsed GEO rows pick
  //    up the new _rowId column. (Dry runs never write, so never re-fetch.)
  if (!dryRunNoWrite && mg.minted > 0) {
    grids = await fetchSheetTabs(sheetId, titles);
  }

  const g = (t?: string) => (t ? (grids.get(t) ?? []) : []);

  const snapshot: ParsedSnapshot = {
    title: cfg.title,
    subtitle: cfg.subtitle,
    roadmap: parseRoadmapStatus(g(tabTitles.roadmap)),
    clusters: parseClustersStacked(g(tabTitles.clusters)),
    geoTracker: parseGeoTrackerHeader(g(tabTitles.geoTracker)),
    kpi: parseKpi([g(tabTitles.kpiObjectives), g(tabTitles.performanceProjections)]),
  };

  return { snapshot, minted: { geo: mg.minted } };
}
