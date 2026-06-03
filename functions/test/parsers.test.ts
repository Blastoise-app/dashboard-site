// Offline unit + parity tests for the NeuralTrust sheet parsers.
//
// Inputs are reconstructed grids that faithfully mirror the live sheet layout
// (reverse-chronological months, packed "SV, KD" cells, n/a credits, horizontal
// cluster blocks, two-row GEO header with merged band cells, two KPI tables).
// They exercise every tricky path; full-count parity against all 53 cluster
// rows / 20 geo keywords / 19 deliverables is confirmed by the live read
// (devSync.ts) once the sheet is shared with the service account.
//
// Run:  npx tsx functions/test/parsers.test.ts
import assert from "node:assert/strict";
import { parseRoadmapStatus } from "../src/lib/parse-roadmap-status.js";
import { parseClustersStacked } from "../src/lib/parse-clusters-stacked.js";
import { parseGeoTrackerHeader } from "../src/lib/parse-geo-tracker-header.js";
import { parseKpi } from "../src/lib/parse-kpi.js";
import { validateSnapshot, snapshotCounts, type ParsedSnapshot } from "../src/lib/snapshot.js";
import {
  parseSv,
  splitSvKd,
  parseCredits,
  parseKd,
  toCamel,
  normStatus,
} from "../src/lib/header-table.js";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---- value helpers -----------------------------------------------------
console.log("value helpers");
check("parseSv handles commas, K/M, n/a", () => {
  assert.equal(parseSv("13,200"), 13200);
  assert.equal(parseSv("2.8K"), 2800);
  assert.equal(parseSv("990"), 990);
  assert.equal(parseSv("n/a"), 0);
  assert.equal(parseSv(""), 0);
});
check("splitSvKd splits packed SV/KD, preserving thousands commas", () => {
  assert.deepEqual(splitSvKd("990, 57"), { svRaw: "990", kdRaw: "57" });
  assert.deepEqual(splitSvKd("2800"), { svRaw: "2800", kdRaw: "" });
  assert.deepEqual(splitSvKd(""), { svRaw: "", kdRaw: "" });
  // thousands separator must stay with the SV, not be mistaken for a KD split
  assert.deepEqual(splitSvKd("13,200, 65"), { svRaw: "13,200", kdRaw: "65" });
  assert.deepEqual(splitSvKd("13,200"), { svRaw: "13,200", kdRaw: "" });
  assert.deepEqual(splitSvKd("1900, 63"), { svRaw: "1900", kdRaw: "63" });
});
check("parseCredits maps n/a -> null", () => {
  assert.equal(parseCredits("2"), 2);
  assert.equal(parseCredits("n/a"), null);
  assert.equal(parseCredits(""), null);
});
check("parseKd maps n/a -> 0", () => {
  assert.equal(parseKd("57"), 57);
  assert.equal(parseKd("n/a"), 0);
});
check("toCamel ids", () => {
  assert.equal(toCamel("Guest Post Listicle"), "guestPostListicle");
  assert.equal(toCamel("Reddit Thread on SERP"), "redditThreadOnSerp");
  assert.equal(toCamel("Wikipedia"), "wikipedia");
});
check("normStatus buckets", () => {
  assert.equal(normStatus("Ready to Start"), "proposed");
  assert.equal(normStatus("Drafting in Progress"), "inProgress");
  assert.equal(normStatus("Client Reviewing Draft"), "inProgress");
  assert.equal(normStatus("Link in Progress"), "inProgress");
  assert.equal(normStatus("Not done/optimized"), "notDone");
  assert.equal(normStatus("Proposed"), "proposed");
  assert.equal(normStatus("Live"), "done");
  assert.equal(normStatus(""), "notDone");
});

// ---- roadmap status ----------------------------------------------------
console.log("parseRoadmapStatus");
const roadmapGrid: string[][] = [
  ["Monthly Reporting Excel Sheet"],
  ["Total Credit Count -->", "12"],
  ["", "Credits", "Type", "Keyword", "Doc Link", "SV", "Existing Link", "Status", "Content Reviewed?", "Who Reviewed & When", "As Of", "Reasoning/Intent"],
  ["July 26", "2", "New Blog", "agentic AI security solutions", "", "90", "", "Ready to Start", "", "", "5/6", "secondary kywd"],
  ["", "1", "New Blog", "ai safety software", "", "100", "", "Ready to Start", "", "", "5/6", "prio keyword"],
  ["", "n/a", "Project", "Manual outreach campaign", "", "", "", "Ready to Start", "", "", "5/6", ""],
  ["June 26", "2", "New Blog", "ai cybersecurity tools", "https://doc/june1", "730, 49", "", "Client Reviewing Outline", "", "", "5/6", "prio kywd"],
  ["", "1", "Backlink", "ai security companies", "", "990, 57", "https://neuraltrust.ai/", "Ready to Start", "", "", "5/6", "backlink"],
  ["May 26", "2", "New Blog", "ai security companies and vendors", "https://doc/may1", "990, 57", "", "Client Reviewing Draft", "", "", "5/11", "priority kwd"],
  ["", "1", "Page Refresh", "agentic ai security software", "https://doc/may2", "590, 59", "https://neuraltrust.ai/ai-agent-security", "Drafting in Progress", "", "", "5/6", "top priority"],
];
const roadmap = parseRoadmapStatus(roadmapGrid);
check("months sorted chronologically + relabeled", () => {
  assert.equal(roadmap.months.length, 3);
  assert.equal(roadmap.months[0].label, "MONTH 1 — May 2026");
  assert.equal(roadmap.months[1].label, "MONTH 2 — June 2026");
  assert.equal(roadmap.months[2].label, "MONTH 3 — July 2026");
});
check("totalCredits per month (n/a -> 0)", () => {
  assert.equal(roadmap.months[0].totalCredits, 3); // May 2+1
  assert.equal(roadmap.months[1].totalCredits, 3); // June 2+1
  assert.equal(roadmap.months[2].totalCredits, 3); // July 2+1+0
});
check("packed SV split to searchVolume, links + status mapped", () => {
  const may = roadmap.months[0].deliverables;
  assert.equal(may[0].searchVolume, "990"); // "990, 57" -> 990
  assert.equal(may[0].docLink, "https://doc/may1");
  assert.equal(may[0].status, "inProgress"); // Client Reviewing Draft
  assert.equal(may[0].statusRaw, "Client Reviewing Draft");
  assert.equal(may[1].existingLink, "https://neuraltrust.ai/ai-agent-security");
  assert.equal(may[1].searchVolume, "590");
  const july = roadmap.months[2].deliverables;
  assert.equal(july.length, 3);
  assert.equal(july[2].credits, 0); // n/a Project
  assert.equal(july[2].type, "Project");
});

// ---- clusters (horizontal blocks) --------------------------------------
console.log("parseClustersStacked");
const clustersGrid: string[][] = [
  ["AI Compliance (6)", "", "", "", "Core — AI Security & Governance (30)", "", ""],
  ["Keyword", "Search Volume", "Keyword Difficulty", "", "Keyword", "Search Volume", "Keyword Difficulty"],
  ["ai compliance solution", "1,600", "50", "", "AI security", "13200", "65"],
  ["ai compliance tools", "590", "26", "", "ai governance tools", "2800", "21"],
  ["", "", "", "", "enterprise AI governance platform", "20", "n/a"],
];
const clusters = parseClustersStacked(clustersGrid);
check("two named groups, correct row counts", () => {
  assert.equal(clusters.groups.length, 2);
  assert.equal(clusters.groups[0].name, "AI Compliance");
  assert.equal(clusters.groups[0].rows.length, 2);
  assert.equal(clusters.groups[1].name, "Core — AI Security & Governance");
  assert.equal(clusters.groups[1].rows.length, 3);
});
check("group names strip only the trailing (N) count, keep mid-string parens", () => {
  const g = parseClustersStacked([
    ["Runtime security (GAF) - Prio (6)"],
    ["Keyword", "Search Volume", "Keyword Difficulty"],
    ["ai firewall software", "1,900", "63"],
  ]);
  assert.equal(g.groups[0].name, "Runtime security (GAF) - Prio");
});
check("sv/kd parsed, svDisplay normalized to thousands format, n/a kd -> 0", () => {
  const gov = clusters.groups[1].rows[1];
  assert.equal(gov.keyword, "ai governance tools");
  assert.equal(gov.sv, 2800);
  assert.equal(gov.svDisplay, "2,800"); // bare "2800" in sheet -> formatted
  assert.equal(gov.kd, 21);
  assert.equal(clusters.groups[1].rows[0].svDisplay, "13,200"); // bare "13200" -> "13,200"
  assert.equal(clusters.groups[1].rows[2].kd, 0); // n/a
  assert.equal(clusters.groups[1].rows[0].cpc, undefined); // no CPC tracked
});

// ---- geo tracker (two-row header, merged band) -------------------------
console.log("parseGeoTrackerHeader");
const geoGrid: string[][] = [
  ["", "", "SEO", "", "", "GEO Levers", ""],
  ["Keyword/prompt", "SV", "Page", "Listicle", "Backlinks", "Guest Post Listicle", "Wikipedia"],
  ["ai security software", "590", "Proposed", "Proposed", "Proposed", "Not done/optimized", ""],
  ["ai governance tools", "2800", "Not done/optimized", "Proposed", "Proposed", "Not done/optimized", ""],
];
const geo = parseGeoTrackerHeader(geoGrid);
check("levers grouped SEO/GEO (band + fallback)", () => {
  assert.equal(geo.levers.length, 5);
  const byId = Object.fromEntries(geo.levers.map((l) => [l.id, l.group]));
  assert.equal(byId.page, "SEO");
  assert.equal(byId.listicle, "SEO");
  assert.equal(byId.backlinks, "SEO");
  assert.equal(byId.guestPostListicle, "GEO");
  assert.equal(byId.wikipedia, "GEO");
});
check("coverage mapping + sv", () => {
  assert.equal(geo.keywords.length, 2);
  const k0 = geo.keywords[0];
  assert.equal(k0.sv, 590);
  assert.equal(k0.svDisplay, "590");
  assert.equal(k0.coverage.page, "proposed");
  assert.equal(k0.coverage.guestPostListicle, "notDone"); // Not done/optimized
  assert.equal(k0.coverage.wikipedia, "notDone"); // empty
  assert.equal(geo.keywords[1].coverage.page, "notDone");
  assert.equal(geo.keywords[1].svDisplay, "2,800");
});

// ---- kpi (two tables) --------------------------------------------------
console.log("parseKpi");
const kpiObjGrid: string[][] = [
  ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
  ["Support Organic Revenue Growth", "Visibility", "SEO: Target keywords on page 1", "0", "April 2026", "Semrush/GSC"],
  ["", "Visibility", "GEO: Share of Voice", "1.80%", "April 2026", "Athena"],
];
const kpiTgtGrid: string[][] = [
  ["KPI", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
  ["Organic Traffic", "Organic traffic clicks", "4.5K/month", "7,000 (+55%)", "10,000 (+43%)", "15,000 (+50%)", "aggressive"],
];
const kpi = parseKpi([kpiObjGrid, kpiTgtGrid]);
check("objectives incl. blank continuation, targets m3/m12", () => {
  assert.equal(kpi.objectives.length, 2);
  assert.notEqual(kpi.objectives[0].objective, "");
  assert.equal(kpi.objectives[1].objective, ""); // continuation row
  assert.equal(kpi.objectives[1].funnel, "Visibility");
  assert.equal(kpi.objectives[0].tool, "Semrush/GSC");
  assert.equal(kpi.targets.length, 1);
  assert.equal(kpi.targets[0].m3, "7,000 (+55%)");
  assert.equal(kpi.targets[0].m12, "15,000 (+50%)");
});

// ---- validateSnapshot (the write gate) ---------------------------------
console.log("validateSnapshot");
const snap: ParsedSnapshot = {
  title: "NeuralTrust — AI Security SEO & GEO Strategy",
  subtitle: "Search Everywhere Optimization Roadmap",
  clusters,
  geoTracker: geo,
  roadmap,
  kpi,
};
check("valid snapshot (rowIds not required) -> no problems", () => {
  assert.deepEqual(validateSnapshot(snap, { requireRowIds: false }), []);
});
check("totalCredits mismatch is caught", () => {
  const broken: ParsedSnapshot = {
    ...snap,
    roadmap: {
      ...roadmap,
      months: roadmap.months.map((m, i) =>
        i === 0 ? { ...m, totalCredits: 999 } : m,
      ),
    },
  };
  const problems = validateSnapshot(broken, { requireRowIds: false });
  assert.ok(problems.some((p) => p.includes("totalCredits")), problems.join("; "));
});
check("requireRowIds flags missing rowIds", () => {
  const problems = validateSnapshot(snap, { requireRowIds: true });
  assert.ok(problems.some((p) => p.includes("missing rowId")), problems.join("; "));
});
check("expect minimums catch a catastrophic shortfall", () => {
  const problems = validateSnapshot(snap, { requireRowIds: false, expect: { minClusterRows: 100 } });
  assert.ok(problems.some((p) => p.includes("rows <")), problems.join("; "));
});
check("snapshotCounts", () => {
  const c = snapshotCounts(snap);
  assert.equal(c.roadmapMonths, 3);
  assert.equal(c.geoKeywords, 2);
  assert.equal(c.clusterGroups, 2);
});

console.log(`\n✓ all ${passed} parser checks passed`);
