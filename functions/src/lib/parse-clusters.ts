import type { Clusters, ClusterRow } from "@shared/types.js";
import { cell, parseSv, parseCpc, type Row } from "./util.js";

// Row 0 has group names at columns 0, 5, 10 (separated by blank columns).
// Row 1 has sub-headers (Keyword, Search Volume, KD, CPC) for each group.
// Rows 2+ have data.
const GROUP_START_COLS = [0, 5, 10] as const;

export function parseClusters(rows: Row[]): Clusters {
  const groups = GROUP_START_COLS.map((startCol) => {
    const name = cell(rows[0], startCol);
    const rowsOut: ClusterRow[] = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const keyword = cell(r, startCol);
      if (!keyword) continue;
      const svDisplay = cell(r, startCol + 1);
      const kdDisplay = cell(r, startCol + 2);
      const cpcDisplay = cell(r, startCol + 3);
      rowsOut.push({
        keyword,
        svDisplay,
        sv: parseSv(svDisplay),
        kd: parseInt(kdDisplay, 10) || 0,
        cpc: parseCpc(cpcDisplay),
        cpcDisplay,
      });
    }
    return { name, rows: rowsOut };
  }).filter((g) => g.name && g.rows.length);

  return { groups };
}
