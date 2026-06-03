// One-time-ish refresh: pull the LIVE NeuralTrust sheet through the new parsers,
// assemble the dashboard's StrategyDoc, validate it (fail closed), and write the
// bundled fixture web/src/fixtures/neuraltrust.json. This makes the current
// (pre-Firestore) dashboard accurate to the live sheet without any deploy.
// Superseded by the Firestore sync (Phase 1); the assemble logic carries forward.
//
// Run (keyless, impersonating the ingest SA):
//   TOKEN=$(gcloud auth print-access-token \
//     --impersonate-service-account=sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com \
//     --scopes=https://www.googleapis.com/auth/spreadsheets)
//   SHEETS_ACCESS_TOKEN="$TOKEN" npx tsx src/refreshFixture.ts
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Clusters, GeoTracker, KpiReport, Roadmap } from "../../shared/types.js";
import { fetchSheetTabs } from "./lib/sheets-io.js";
import { parseRoadmapStatus } from "./lib/parse-roadmap-status.js";
import { parseClustersStacked } from "./lib/parse-clusters-stacked.js";
import { parseGeoTrackerHeader } from "./lib/parse-geo-tracker-header.js";
import { parseKpi } from "./lib/parse-kpi.js";
import { snapshotCounts, validateSnapshot, type ParsedSnapshot } from "./lib/snapshot.js";

const SHEET_ID = "1Ye47tP_PXUNQz-3m-nY_08dvBF3cCI6ilZ7C-dDqJ3o";

// Exact tab titles (confirmed via devSync listTabTitles).
const TABS = {
  roadmap: "Roadmap Status",
  clusters: "Clusters",
  geo: "GEO Tracker",
  kpiObjectives: "KPI Tracker",
  perf: "Performance Projections",
};

interface FixtureDoc {
  slug: string;
  title: string;
  subtitle: string;
  brand: { name: string; chipBg: string };
  lastUpdated: string;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
  kpi: KpiReport;
}

async function main() {
  const token = process.env.SHEETS_ACCESS_TOKEN;
  if (!token) {
    console.error("Set SHEETS_ACCESS_TOKEN (gcloud impersonation token) — see file header.");
    process.exitCode = 1;
    return;
  }

  const titles = [TABS.roadmap, TABS.clusters, TABS.geo, TABS.kpiObjectives, TABS.perf];
  const grids = await fetchSheetTabs(SHEET_ID, titles);
  const g = (t: string) => grids.get(t) ?? [];

  const snap: ParsedSnapshot = {
    title: "NeuralTrust — AI Security SEO & GEO Strategy",
    subtitle: "Search Everywhere Optimization Roadmap · Prepared by Growth Marketing Pro",
    roadmap: parseRoadmapStatus(g(TABS.roadmap)),
    clusters: parseClustersStacked(g(TABS.clusters)),
    geoTracker: parseGeoTrackerHeader(g(TABS.geo)),
    kpi: parseKpi([g(TABS.kpiObjectives), g(TABS.perf)]),
  };

  const problems = validateSnapshot(snap, {
    requireRowIds: false,
    expect: { minClusterGroups: 4, minClusterRows: 40, minGeoKeywords: 15, minDeliverables: 15 },
  });
  if (problems.length > 0) {
    console.error("Refused to write — validation failed:");
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exitCode = 1;
    return;
  }

  const doc: FixtureDoc = {
    slug: "neuraltrust",
    title: snap.title,
    subtitle: snap.subtitle,
    brand: { name: "Growth Marketing Pro", chipBg: "#151D29" },
    lastUpdated: new Date().toISOString().slice(0, 10),
    clusters: snap.clusters,
    geoTracker: snap.geoTracker,
    roadmap: snap.roadmap,
    kpi: snap.kpi as KpiReport,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(here, "../../web/src/fixtures/neuraltrust.json");
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");

  const c = snapshotCounts(snap);
  console.log(
    `Wrote ${c.clusterRows} cluster rows / ${c.geoKeywords} geo keywords / ` +
      `${c.roadmapDeliverables} deliverables / ${c.kpiObjectives} kpi objectives`,
  );
  console.log(`Cluster groups: ${snap.clusters.groups.map((x) => x.name).join(", ")}`);
  console.log(`→ ${out}`);
}

main().catch((err) => {
  console.error("refreshFixture failed:", err?.message ?? err);
  process.exitCode = 1;
});
