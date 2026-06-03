// Header-driven, index-free parsing primitives for Google Sheet grids.
//
// A "grid" is string[][] — rows of cells, as returned by the Sheets API
// (values.batchGet). Parsers address columns by NORMALIZED HEADER NAME, never
// by numeric index, so a human can reorder or insert columns without breaking
// ingest. Missing required columns fail closed (throw) rather than silently
// reading the wrong column.
import type { CoverageStatus } from "../../../shared/types.js";

export type Grid = string[][];

/** Normalize a header/cell for matching: trim, lowercase, collapse whitespace. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Find the header row: the first row (within the first `scan` rows) whose
 * normalized cells include every required header name. Returns -1 if none.
 */
export function detectHeaderRow(grid: Grid, required: string[], scan = 8): number {
  const want = required.map(norm);
  const limit = Math.min(scan, grid.length);
  for (let r = 0; r < limit; r++) {
    const cells = (grid[r] ?? []).map(norm);
    if (want.every((w) => cells.includes(w))) return r;
  }
  return -1;
}

/**
 * Header-indexed view of a grid. Columns are addressed by name (case/space
 * -insensitive) with optional aliases; data rows are everything below the
 * header row.
 */
export class HeaderTable {
  private index = new Map<string, number>();
  readonly headerRow: number;
  readonly rows: Grid;

  constructor(grid: Grid, headerRow: number) {
    this.headerRow = headerRow;
    const header = grid[headerRow] ?? [];
    header.forEach((cell, i) => {
      const key = norm(cell);
      if (key && !this.index.has(key)) this.index.set(key, i);
    });
    this.rows = grid.slice(headerRow + 1);
  }

  /** Column index for the first matching name/alias, or -1. */
  colIndex(...names: string[]): number {
    for (const n of names) {
      const i = this.index.get(norm(n));
      if (i != null) return i;
    }
    return -1;
  }

  /** Required column index; throws a descriptive error if absent (fail closed). */
  col(...names: string[]): number {
    const i = this.colIndex(...names);
    if (i < 0) {
      throw new Error(
        `Missing required column "${names[0]}" (aliases: ${names.join(", ")}; ` +
          `headers present: ${[...this.index.keys()].join(" | ")})`,
      );
    }
    return i;
  }

  /** Trimmed cell value at (row, first matching named column); '' if absent. */
  get(row: string[], ...names: string[]): string {
    const i = this.colIndex(...names);
    if (i < 0) return "";
    return String(row[i] ?? "").trim();
  }

  /** All header names, in column order (for diagnostics). */
  headers(): string[] {
    return [...this.index.keys()];
  }
}

// ---- value helpers -----------------------------------------------------

/** "13,200" / "2.8K" / "990" → number; "" / "n/a" / non-numeric → 0. */
export function parseSv(s: unknown): number {
  if (s == null) return 0;
  const t = String(s).replace(/,/g, "").trim();
  if (!t || /^n\/?a$/i.test(t)) return 0;
  const m = /^([\d.]+)\s*([KMkm])?$/.exec(t);
  if (!m) return parseFloat(t) || 0;
  const n = parseFloat(m[1]);
  const suf = (m[2] || "").toUpperCase();
  return n * (suf === "M" ? 1e6 : suf === "K" ? 1e3 : 1);
}

/** number → "1,600" (en-US thousands); 0 → "". */
export function svDisplay(n: number): string {
  return n ? Number(n).toLocaleString("en-US") : "";
}

/**
 * Roadmap "SV" cells often pack "SV, KD" together (e.g. "990, 57", "13,200, 65").
 * The SV/KD separator is a comma FOLLOWED BY WHITESPACE; a bare comma with no
 * following space is a thousands separator and stays part of the SV ("13,200").
 * KD is a short trailing number (1-3 digits). Either part may be empty.
 */
export function splitSvKd(cell: string): { svRaw: string; kdRaw: string } {
  const s = String(cell ?? "").trim();
  const m = /^(.*\d),\s+(\d{1,3})$/.exec(s);
  if (m) return { svRaw: m[1].trim(), kdRaw: m[2].trim() };
  return { svRaw: s, kdRaw: "" };
}

/** Credit cell → integer; "n/a" / "" / non-numeric → null. */
export function parseCredits(s: unknown): number | null {
  const t = String(s ?? "").trim();
  if (!t || /^n\/?a$/i.test(t)) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

/** Keyword-difficulty cell → integer; "n/a" / "" → 0. */
export function parseKd(s: unknown): number {
  const t = String(s ?? "").trim();
  if (!t || /^n\/?a$/i.test(t)) return 0;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
}

/** "Reddit Thread on SERP" → "redditThreadOnSerp". */
export function toCamel(label: string): string {
  const words = String(label ?? "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Human status text → coarse CoverageStatus (the color bucket). The verbatim
 * status string is preserved separately as `statusRaw`. Also used for GEO
 * coverage cells ("Not done/optimized" → notDone, "Proposed" → proposed).
 */
export function normStatus(s: string): CoverageStatus {
  const l = String(s || "").toLowerCase();
  if (l.includes("not done")) return "notDone";
  if (l.includes("proposed") || l.includes("ready")) return "proposed";
  if (
    l.includes("progress") ||
    l.includes("started") ||
    l.includes("drafting") ||
    l.includes("writing") ||
    l.includes("reviewing")
  )
    return "inProgress";
  if (
    l.includes("done") ||
    l.includes("complete") ||
    l.includes("live") ||
    l.includes("publish")
  )
    return "done";
  return "notDone";
}
