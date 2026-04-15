import { cell, parseSv, parseCpc } from './util.mjs';

export function parseClusters(rows) {
  // Row 0 has group names at columns 0, 5, 10 (separated by blank columns).
  // Row 1 has sub-headers (Keyword, Search Volume, KD, CPC) for each group.
  // Rows 2+ have data.
  const groupStartCols = [0, 5, 10];

  const groups = groupStartCols.map((startCol) => {
    const name = cell(rows[0], startCol);
    const rowsOut = [];
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
        cpcDisplay
      });
    }
    return { name, rows: rowsOut };
  }).filter((g) => g.name && g.rows.length);

  return { groups };
}
