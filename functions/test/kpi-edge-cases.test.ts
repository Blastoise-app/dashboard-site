import assert from "node:assert/strict";
import { parseKpi } from "../src/lib/parse-kpi.js";

console.log("KPI edge cases");

// Test: objectives table on one grid, targets on same grid (cross-contamination)
console.log("Test 1: both tables on same grid");
const bothOnSameGrid = [
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
    ["", "Traffic", "GEO: traffic", "100", "April 2026", "GA4"],
    ["KPI", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
    ["Mentions", "AI search mentions", "2%", "5%", "15%", "20%", "goal"],
  ]
];

const result1 = parseKpi(bothOnSameGrid);
console.log(`  objectives: ${result1.objectives.length} (expect 2)`);
console.log(`  targets: ${result1.targets.length} (expect 1)`);
// BUG POTENTIAL: if the grid contains both headers, first match wins.
// The "Funnel" row appears first, so objectives are captured.
// Then "Description" + "Notes" should find targets — but they appear AFTER objectives data.
// The key question: does HeaderTable.rows skip to after the header row, or does it see the
// misaligned "KPI" row as a data row of the objectives table?

console.log("\nTest 2: objectives table with Description column");
const objWithDesc = [
  [
    ["Business Objective", "Description", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "some desc", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
    ["", "another", "Traffic", "GEO: traffic", "100", "April 2026", "GA4"],
  ]
];

const result2 = parseKpi(objWithDesc);
console.log(`  objectives: ${result2.objectives.length} (expect 2)`);
console.log(`  targets: ${result2.targets.length} (expect 0, objectives table has Description col)`);
// CRITICAL: detectHeaderRow looks for ["Description", "Notes"] = BOTH required.
// The objectives table has Description but NOT Notes, so targets should not match.

console.log("\nTest 3: targets table has KPIs (plural) not KPI");
const targetsAsKpis = [
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
  ],
  [
    ["KPIs", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
    ["Mentions", "AI search mentions", "2%", "5%", "15%", "20%", "goal"],
  ]
];

const result3 = parseKpi(targetsAsKpis);
console.log(`  objectives: ${result3.objectives.length} (expect 1)`);
console.log(`  targets: ${result3.targets.length} (expect 1, "KPIs" is alias)`);

console.log("\nTest 4: targets table only (no objectives grid)");
const targetsOnly = [
  [],
  [
    ["KPI", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
    ["Mentions", "AI search mentions", "2%", "5%", "15%", "20%", "goal"],
  ]
];

const result4 = parseKpi(targetsOnly);
console.log(`  objectives: ${result4.objectives.length} (expect 0)`);
console.log(`  targets: ${result4.targets.length} (expect 1)`);

console.log("\nTest 5: both tables in wrong order");
const wrongOrder = [
  [
    ["KPI", "Description", "Baseline", "Month 3", "Month 6", "Month 12", "Notes"],
    ["Mentions", "AI search mentions", "2%", "5%", "15%", "20%", "goal"],
  ],
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
  ]
];

const result5 = parseKpi(wrongOrder);
console.log(`  objectives: ${result5.objectives.length} (expect 1, should find in 2nd grid)`);
console.log(`  targets: ${result5.targets.length} (expect 1, should find in 1st grid)`);

console.log("\nTest 6: objectives table on both grids (only first captured)");
const objOnBoth = [
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Support Growth", "Visibility", "SEO: keywords", "0", "April 2026", "Semrush"],
  ],
  [
    ["Business Objective", "Funnel", "KPIs", "Baseline", "Date", "Tracking Tool"],
    ["Different Obj", "Traffic", "GEO: traffic", "100", "April 2026", "GA4"],
  ]
];

const result6 = parseKpi(objOnBoth);
console.log(`  objectives: ${result6.objectives.length} (expect 1, 2nd grid ignored)`);
console.log(`  targets: ${result6.targets.length} (expect 0)`);
// The "objectives.length === 0" check ensures only the first match is captured.
