// Read-test / dry-run for the NeuralTrust sheet ingest. READ-ONLY: it never
// writes to the sheet (no rowId minting). Lists the workbook's real tab titles,
// fuzzy-matches the sections, parses each, and prints counts + the validation
// gate so we can confirm the keyless read end-to-end the moment the sheet is
// shared with the service account.
//
// Run (keyless, impersonating the ingest SA):
//   gcloud auth application-default login \
//     --impersonate-service-account=sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com
//   npx tsx functions/src/devSync.ts [spreadsheetId]
import { ensureRowIds, fetchSheetTabs, listTabTitles } from "./lib/sheets-io.js";
import { parseRoadmapStatus } from "./lib/parse-roadmap-status.js";
import { parseClustersStacked } from "./lib/parse-clusters-stacked.js";
import { parseGeoTrackerHeader, GEO_REQUIRED_HEADERS } from "./lib/parse-geo-tracker-header.js";
import { parseKpi } from "./lib/parse-kpi.js";
import { snapshotCounts, validateSnapshot, type ParsedSnapshot } from "./lib/snapshot.js";

const DEFAULT_SHEET = "1Ye47tP_PXUNQz-3m-nY_08dvBF3cCI6ilZ7C-dDqJ3o";

function pick(titles: string[], re: RegExp, not?: RegExp): string | undefined {
  return titles.find((t) => re.test(t) && (!not || !not.test(t)));
}

async function main() {
  const spreadsheetId = process.argv.slice(2).find((a) => !a.startsWith("--")) || DEFAULT_SHEET;
  console.log(`\nReading workbook ${spreadsheetId} as the ingest service account…\n`);

  const titles = await listTabTitles(spreadsheetId);
  console.log(`Tabs found (${titles.length}):`);
  titles.forEach((t) => console.log(`  • ${t}`));

  const map = {
    roadmap: pick(titles, /roadmap status/i) ?? pick(titles, /roadmap/i, /brainstorm/i),
    clusters: pick(titles, /cluster/i),
    geo: pick(titles, /geo/i),
    kpi: pick(titles, /kpi/i) ?? pick(titles, /tracker/i, /geo/i),
    perf: pick(titles, /performance|projection/i),
  };
  console.log(`\nMatched sections:`);
  console.log(`  roadmap  → ${map.roadmap ?? "(none)"}`);
  console.log(`  clusters → ${map.clusters ?? "(none)"}`);
  console.log(`  geo      → ${map.geo ?? "(none)"}`);
  console.log(`  kpi      → ${map.kpi ?? "(none)"}`);
  console.log(`  perf     → ${map.perf ?? "(none)"}`);

  const wanted = [map.roadmap, map.clusters, map.geo, map.kpi, map.perf].filter(
    (t): t is string => !!t,
  );
  const grids = await fetchSheetTabs(spreadsheetId, wanted);
  const grid = (t?: string) => (t ? (grids.get(t) ?? []) : []);

  const snap: ParsedSnapshot = {
    title: "NeuralTrust — AI Security SEO & GEO Strategy",
    subtitle: "Search Everywhere Optimization Roadmap · Prepared by Growth Marketing Pro",
    roadmap: parseRoadmapStatus(grid(map.roadmap)),
    clusters: parseClustersStacked(grid(map.clusters)),
    geoTracker: parseGeoTrackerHeader(grid(map.geo)),
    kpi: parseKpi([grid(map.kpi), grid(map.perf)]),
  };

  const c = snapshotCounts(snap);
  console.log(`\nParsed counts:`);
  console.log(`  cluster groups:        ${c.clusterGroups}`);
  console.log(`  cluster rows:          ${c.clusterRows}   (expected ~53)`);
  console.log(`  geo keywords:          ${c.geoKeywords}   (expected ~20)`);
  console.log(`  roadmap months:        ${c.roadmapMonths}`);
  console.log(`  roadmap deliverables:  ${c.roadmapDeliverables}   (expected ~19)`);
  console.log(`  kpi objectives:        ${c.kpiObjectives}   (expected ~11)`);
  console.log(`  kpi targets:           ${c.kpiTargets}   (expected ~3)`);

  console.log(`\nRoadmap months (sorted): ${snap.roadmap.months.map((m) => m.label).join(" | ")}`);
  console.log(`Cluster groups: ${snap.clusters.groups.map((g) => `${g.name} [${g.rows.length} kw]`).join(", ")}`);
  console.log(`GEO levers: ${snap.geoTracker.levers.map((l) => `${l.label}[${l.group}]`).join(", ")}`);

  // Spot-check actual values (not just counts) — guards against headers that
  // matched structurally but read the wrong column (sv=0/kd=0 across the board).
  const g0 = snap.clusters.groups[0];
  if (g0?.rows[0]) {
    const r = g0.rows[0];
    console.log(`\nSample cluster [${g0.name}]: "${r.keyword}" sv=${r.sv} (${r.svDisplay}) kd=${r.kd}`);
  }
  const k0 = snap.geoTracker.keywords[0];
  if (k0) console.log(`Sample GEO kw: "${k0.keyword}" sv=${k0.sv} coverage=${JSON.stringify(k0.coverage)}`);
  const d0 = snap.roadmap.months[0].deliverables[0];
  if (d0) {
    console.log(`Sample deliverable: ${d0.type} "${d0.keyword}" sv="${d0.searchVolume}" status=${d0.status}(${d0.statusRaw}) doc=${d0.docLink ? "yes" : "no"}`);
  }

  // Optional: show what _rowId minting WOULD touch, without writing (safe).
  if (process.argv.includes("--mint-dry-run")) {
    console.log(`\n--- GEO rowId minting DRY RUN (no writes; roadmap is read-only) ---`);
    const targets: Array<[string | undefined, string[]]> = [
      [map.geo, GEO_REQUIRED_HEADERS],
    ];
    for (const [title, required] of targets) {
      if (!title) continue;
      try {
        const res = await ensureRowIds(spreadsheetId, title, required, { dryRunNoWrite: true });
        console.log(
          `  ${title}: header at row ${res.headerRow}; would mint ${res.minted} _rowId(s) into column ${res.column}`,
        );
      } catch (e) {
        console.log(`  ${title}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const problems = validateSnapshot(snap, {
    requireRowIds: false,
    expect: { minClusterGroups: 4, minClusterRows: 40, minGeoKeywords: 15, minDeliverables: 15 },
  });
  if (problems.length === 0) {
    console.log(`\n✓ validateSnapshot: clean (read path proven; rowId minting not run)`);
  } else {
    console.log(`\n✗ validateSnapshot found ${problems.length} problem(s):`);
    problems.forEach((p) => console.log(`  - ${p}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\ndevSync failed:", err?.message ?? err);
  if (/permission|403|not found|404/i.test(String(err?.message ?? ""))) {
    console.error(
      "\nHint: the sheet must be shared (Editor) with sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com,\n" +
        "and you must be authenticated via ADC impersonation (see the header of this file).",
    );
  }
  process.exitCode = 1;
});
