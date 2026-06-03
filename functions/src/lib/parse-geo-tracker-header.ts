// Parser for NeuralTrust's "GEO Tracker" tab — a keyword × lever coverage
// matrix with a two-row header: a band row (SEO | GEO Levers, merged) above the
// lever-name row (Keyword/prompt, SV, Page, Listicle, Backlinks, Guest Post
// Listicle, Listicle Inclusion, Reddit Thread on SERP, Reddit Thread
// influencing LLMs, Linkedin Pulse Article, Wikipedia).
//
// Each lever's group (SEO vs GEO) comes from the band row above it; because the
// band cells are merged (value only in the first column), we fall back to "the
// first SEO_LEVER_COUNT levers are SEO" for blank band cells. Lever ids are
// derived from the labels (camelCase) so coverage maps key off the same ids.
import type {
  CoverageStatus,
  GeoTracker,
  GeoTrackerKeyword,
  GeoTrackerLever,
} from "../../../shared/types.js";
import {
  detectHeaderRow,
  norm,
  normStatus,
  parseSv,
  svDisplay,
  toCamel,
  type Grid,
} from "./header-table.js";

const SEO_LEVER_COUNT = 3;

// Lever headers that uniquely identify the GEO Tracker's lever-name row.
// Exported so the ingest orchestrator locates the same row for _rowId minting.
export const GEO_REQUIRED_HEADERS = ["Page", "Backlinks", "Wikipedia"];

export function parseGeoTrackerHeader(grid: Grid): GeoTracker {
  const headerRow = detectHeaderRow(grid, GEO_REQUIRED_HEADERS);
  if (headerRow < 0) {
    throw new Error("GEO Tracker: could not locate lever header row (Page/Backlinks/Wikipedia)");
  }
  const header = grid[headerRow] ?? [];
  const bandRow = headerRow > 0 ? (grid[headerRow - 1] ?? []) : [];

  // Info columns: keyword + search volume.
  let kwCol = -1;
  let svCol = -1;
  header.forEach((c, i) => {
    const h = norm(c);
    if (kwCol < 0 && h.includes("keyword")) kwCol = i;
    else if (svCol < 0 && (h === "sv" || h.includes("search volume"))) svCol = i;
  });
  if (kwCol < 0) throw new Error("GEO Tracker: no keyword column");
  if (svCol < 0) svCol = kwCol + 1;

  const ridCol = header.findIndex((c) => norm(c) === "_rowid" || norm(c) === "rowid");

  // Lever columns: every column (other than info/rowId) with a non-empty header.
  const levers: GeoTrackerLever[] = [];
  const leverCols: Array<{ id: string; col: number }> = [];
  let seen = 0;
  for (let c = 0; c < header.length; c++) {
    if (c === kwCol || c === svCol || c === ridCol) continue;
    const label = String(header[c] ?? "").trim();
    if (!label) continue;
    const band = norm(bandRow[c]);
    let group: "SEO" | "GEO";
    if (band.includes("seo")) group = "SEO";
    else if (band.includes("geo")) group = "GEO";
    else group = seen < SEO_LEVER_COUNT ? "SEO" : "GEO";
    const id = toCamel(label);
    levers.push({ id, label, group });
    leverCols.push({ id, col: c });
    seen++;
  }

  const keywords: GeoTrackerKeyword[] = [];
  for (let r = headerRow + 1; r < grid.length; r++) {
    const kw = String(grid[r]?.[kwCol] ?? "").trim();
    if (!kw) continue;
    const sv = parseSv(String(grid[r][svCol] ?? "").trim());
    const coverage: Record<string, CoverageStatus> = {};
    for (const { id, col } of leverCols) {
      coverage[id] = normStatus(String(grid[r][col] ?? "").trim());
    }
    const rowId = ridCol >= 0 ? String(grid[r][ridCol] ?? "").trim() : "";
    keywords.push({
      keyword: kw,
      svDisplay: svDisplay(sv),
      sv,
      coverage,
      rowId: rowId || undefined,
    });
  }

  return { levers, keywords };
}
