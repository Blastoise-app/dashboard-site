import type { CoverageStatus, GeoTracker, GeoTrackerLever } from "@shared/types.js";
import { cell, parseSv, parseCpc, normalizeStatus, type Row } from "./util.js";

// First N levers (after KEYWORD INFO columns) are SEO; the rest are GEO.
const SEO_LEVER_COUNT = 3;

interface LeverWithCol extends GeoTrackerLever {
  col: number;
}

export function parseGeoTracker(rows: Row[]): GeoTracker {
  // Row 0: title. Row 1: group headers. Row 2: column headers. Rows 3+: data.
  const header = rows[2] || [];
  const leverLabels: Array<{ col: number; label: string }> = [];
  for (let c = 3; c < header.length; c++) {
    const label = cell(header, c);
    if (!label) continue;
    leverLabels.push({ col: c, label });
  }

  const levers: LeverWithCol[] = leverLabels.map((l, idx) => ({
    id: toCamel(l.label),
    label: l.label,
    col: l.col,
    group: idx < SEO_LEVER_COUNT ? "SEO" : "GEO",
  }));

  const keywords = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const keyword = cell(r, 0);
    if (!keyword) continue;
    const svDisplay = cell(r, 1);
    const cpcDisplay = cell(r, 2);
    const coverage: Record<string, CoverageStatus> = {};
    for (const lever of levers) {
      coverage[lever.id] = normalizeStatus(cell(r, lever.col));
    }
    keywords.push({
      keyword,
      svDisplay,
      sv: parseSv(svDisplay),
      cpcDisplay,
      cpc: parseCpc(cpcDisplay),
      coverage,
    });
  }

  // Sort keywords by SV desc so the hero matrix reads top-down by priority.
  keywords.sort((a, b) => b.sv - a.sv);

  return {
    levers: levers.map(({ col: _col, ...rest }) => rest),
    keywords,
  };
}

function toCamel(s: string): string {
  const words = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");
}
