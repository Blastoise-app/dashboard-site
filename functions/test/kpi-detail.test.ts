import assert from "node:assert/strict";
import { parseKpi } from "../src/lib/parse-kpi.js";

// Test: objectives table on one grid, targets on same grid (cross-contamination)
const bothOnSameGrid = [
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
    ["", "Traffic", "GEO: traffic", "100", "April 2026", "GA4"],
    ["KPI", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
    ["Mentions", "AI search mentions", "2%", "5%", "15%", "20%", "goal"],
  ]
];

const result = parseKpi(bothOnSameGrid);

console.log("Detailed objectives dump:");
result.objectives.forEach((obj, i) => {
  console.log(`  [${i}] objective="${obj.objective}", funnel="${obj.funnel}", kpi="${obj.kpi}"`);
});

console.log("\nDetailed targets dump:");
result.targets.forEach((tgt, i) => {
  console.log(`  [${i}] kpi="${tgt.kpi}", description="${tgt.description}"`);
});

// The BUG: rows 3-4 are parsed as objectives because:
// Row 3: ["KPI", "Description", ...] is treated as an objective row
// Row 4: ["Mentions", "AI search mentions", ...] has empty objective but non-empty funnel? no wait...
// Let me check what the row values map to.

// HeaderTable for objectives:
// header row 0: ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"]
// data rows: 1-5 (everything after header)
// Row 1: Business Objective="Support Growth", Funnel="Visibility", KPIs="SEO: keywords"
// Row 2: Business Objective="", Funnel="Traffic", KPIs="GEO: traffic"
// Row 3: Business Objective="KPI", Funnel="Description", KPIs="Baseline"  <- WRONG!
// Row 4: Business Objective="Mentions", Funnel="AI search mentions", KPIs="2%"  <- WRONG!

// The skip condition is: if (!funnel && !kpi && !objective) continue;
// For row 3: funnel="Description" (truthy), so it's included
// For row 4: funnel="AI search mentions" (truthy), so it's included

console.log("\nROOT CAUSE: HeaderTable doesn't know where the table ends!");
console.log("It continues to the end of the grid, parsing unrelated data as rows.");

