// Parser for NeuralTrust's "Clusters" tab — several keyword tables laid out
// side by side (horizontal blocks), each with its own group-name label above a
// "Keyword / Search Volume / Keyword Difficulty" header. No CPC column.
//
// Geometry assumption (verified against the live sheet structure): one header
// row with repeated "Keyword" cells, one per block; the block's group name sits
// in the row directly above its first column (a merged label cell). Columns are
// located by NAME within each block's column span — never hardcoded indices.
import type { Clusters, ClusterRow } from "../../../shared/types.js";
import { norm, parseKd, parseSv, svDisplay, type Grid } from "./header-table.js";

export function parseClustersStacked(grid: Grid): Clusters {
  // Header row = first row (scanning the top) containing a "keyword" cell.
  let headerRow = -1;
  for (let r = 0; r < Math.min(8, grid.length); r++) {
    if ((grid[r] ?? []).some((c) => norm(c) === "keyword")) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) throw new Error("Clusters: no 'Keyword' header row found");

  const header = grid[headerRow] ?? [];
  const labelRow = headerRow > 0 ? (grid[headerRow - 1] ?? []) : [];

  // Each "keyword" header cell starts a block.
  const starts: number[] = [];
  header.forEach((c, i) => {
    if (norm(c) === "keyword") starts.push(i);
  });

  const groups = starts.map((start, bi) => {
    const end = bi + 1 < starts.length ? starts[bi + 1] : header.length;

    let svCol = -1;
    let kdCol = -1;
    let cpcCol = -1;
    for (let c = start + 1; c < end; c++) {
      const h = norm(header[c]);
      if (svCol < 0 && (h === "sv" || h === "search volume" || h.includes("volume"))) svCol = c;
      else if (kdCol < 0 && (h === "kd" || h.includes("difficulty"))) kdCol = c;
      else if (cpcCol < 0 && h.includes("cpc")) cpcCol = c;
    }

    // Strip only a TRAILING " (N)" keyword count — the UI already shows the
    // count as a pill, so it would otherwise display twice. Mid-string parens
    // (e.g. "(GAF)") and the rest of the label are kept verbatim.
    const name =
      String(labelRow[start] ?? "")
        .trim()
        .replace(/\s*\(\d+\)\s*$/, "")
        .trim() || `Cluster ${bi + 1}`;
    const rows: ClusterRow[] = [];
    for (let r = headerRow + 1; r < grid.length; r++) {
      const kw = String(grid[r]?.[start] ?? "").trim();
      if (!kw) continue;
      const svStr = svCol >= 0 ? String(grid[r][svCol] ?? "").trim() : "";
      const kdStr = kdCol >= 0 ? String(grid[r][kdCol] ?? "").trim() : "";
      const sv = parseSv(svStr);
      const row: ClusterRow = {
        keyword: kw,
        // Normalize to thousands format ("13,200") regardless of how the sheet
        // formats the cell ("13200" or "13,200") — matches GEO/roadmap display.
        svDisplay: svDisplay(sv),
        sv,
        kd: parseKd(kdStr),
      };
      if (cpcCol >= 0) {
        const cpcStr = String(grid[r][cpcCol] ?? "").trim();
        if (cpcStr) {
          row.cpcDisplay = cpcStr;
          row.cpc = parseSv(cpcStr);
        }
      }
      rows.push(row);
    }
    return { name, rows };
  });

  return { groups: groups.filter((g) => g.rows.length > 0) };
}
