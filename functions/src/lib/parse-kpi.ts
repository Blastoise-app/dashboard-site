// Parser for NeuralTrust's KPI reporting — two tables that live on separate
// tabs ("KPI Tracker" = objectives, "Performance Projections" = targets). Pass
// the grids for both; this locates each table by its distinguishing headers
// wherever it appears, so tab boundaries don't have to be exact.
//
//   objectives: Business Objective | Funnel | KPIs | Baseline | Date | Tracking Tool
//   targets:    KPI | Description | Baseline | Month 3 | Month 6 | Month 12 | Notes
import type { KpiObjective, KpiReport, KpiTarget } from "../../../shared/types.js";
import { HeaderTable, detectHeaderRow, type Grid } from "./header-table.js";

export function parseKpi(grids: Grid[]): KpiReport {
  const objectives: KpiObjective[] = [];
  const targets: KpiTarget[] = [];

  for (const grid of grids) {
    const objRow = detectHeaderRow(grid, ["Funnel"]);
    if (objRow >= 0 && objectives.length === 0) {
      const t = new HeaderTable(grid, objRow);
      for (const row of t.rows) {
        const funnel = t.get(row, "Funnel");
        const kpi = t.get(row, "KPIs", "KPI");
        const objective = t.get(row, "Business Objective", "Objective");
        if (!funnel && !kpi && !objective) continue;
        objectives.push({
          objective,
          funnel,
          kpi,
          baseline: t.get(row, "Baseline"),
          date: t.get(row, "Date"),
          tool: t.get(row, "Tracking Tool", "Tool"),
        });
      }
    }

    const tgtRow = detectHeaderRow(grid, ["KPI", "Description", "Notes"]);
    if (tgtRow >= 0 && targets.length === 0) {
      const t = new HeaderTable(grid, tgtRow);
      for (const row of t.rows) {
        const kpi = t.get(row, "KPI", "KPIs");
        const description = t.get(row, "Description");
        if (!kpi && !description) continue;
        targets.push({
          kpi,
          description,
          baseline: t.get(row, "Baseline"),
          m3: t.get(row, "Month 3", "M3"),
          m6: t.get(row, "Month 6", "M6"),
          m12: t.get(row, "Month 12", "M12"),
          notes: t.get(row, "Notes"),
        });
      }
    }
  }

  return { objectives, targets };
}
