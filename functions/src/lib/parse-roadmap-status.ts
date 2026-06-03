// Parser for NeuralTrust's "Roadmap Status" tab — the live Monthly Reporting
// layout (distinct from the no-status "Roadmap Brainstorm" block).
//
// Columns (matched by NAME, never index): the leftmost column carries the
// month label on the first row of each block (e.g. "July 26") and is blank on
// continuation rows; then Credits, Type, Keyword, Doc Link, SV, Existing Link,
// Status, Content Reviewed?, Who Reviewed & When, As Of, Reasoning/Intent,
// Live Link. The sheet lists months reverse-chronologically (July, June, May),
// so we sort chronologically and relabel "MONTH n — <Month> <Year>".
import type { Roadmap, RoadmapDeliverable } from "../../../shared/types.js";
import {
  HeaderTable,
  detectHeaderRow,
  normStatus,
  parseCredits,
  parseSv,
  splitSvKd,
  svDisplay,
  type Grid,
} from "./header-table.js";

// Headers that uniquely identify this tab's header row. Exported so the ingest
// orchestrator can locate the same row for _rowId minting (ensureRowIds) that
// the parser uses — no duplicated literals.
export const ROADMAP_REQUIRED_HEADERS = ["Credits", "Type", "Keyword", "Status"];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

interface MonthAcc {
  rawLabel: string;
  deliverables: RoadmapDeliverable[];
  totalCredits: number;
}

export function parseRoadmapStatus(grid: Grid): Roadmap {
  const headerRow = detectHeaderRow(grid, ROADMAP_REQUIRED_HEADERS);
  if (headerRow < 0) {
    throw new Error("Roadmap Status: could not locate header row (Credits/Type/Keyword/Status)");
  }
  const t = new HeaderTable(grid, headerRow);

  // The month label lives in the leftmost column, which has no header text.
  // Use column 0 directly (the only positional read in the parser, and only
  // because spreadsheet section labels are inherently positional).
  const MONTH_COL = 0;

  const months: MonthAcc[] = [];
  let current: MonthAcc | null = null;

  for (const row of t.rows) {
    const monthLabel = String(row[MONTH_COL] ?? "").trim();
    const type = t.get(row, "Type");
    const keyword = t.get(row, "Keyword");

    if (monthLabel) {
      current = { rawLabel: monthLabel, deliverables: [], totalCredits: 0 };
      months.push(current);
    }
    // Skip separator/empty rows (no deliverable content).
    if (!type && !keyword) continue;
    if (!current) continue; // content before any month label — ignore

    const credits = parseCredits(t.get(row, "Credits"));
    const { svRaw } = splitSvKd(t.get(row, "SV", "Search Volume"));
    const statusRaw = t.get(row, "Status");
    const docLink = t.get(row, "Doc Link", "Doc");
    const existingLink = t.get(row, "Existing Link", "Existing URL", "Live URL");
    const why = t.get(row, "Reasoning/Intent", "Reasoning", "Detail/Comments", "Notes");
    const asOf = t.get(row, "As Of", "Date");
    const rowId = t.get(row, "_rowId", "rowId");

    const deliverable: RoadmapDeliverable = {
      credits: credits ?? 0,
      type,
      keyword,
      title: keyword,
      rationale: "",
      description: why,
      searchVolume: svRaw ? svDisplay(parseSv(svRaw)) : "",
      status: normStatus(statusRaw),
      statusRaw,
      docLink: docLink || undefined,
      existingLink: existingLink || undefined,
      asOf: asOf || undefined,
      rowId: rowId || undefined,
    };
    current.deliverables.push(deliverable);
    current.totalCredits += credits ?? 0;
  }

  // Sort chronologically (sheet order is reverse-chronological) and relabel.
  const ordered = months
    .map((m) => ({ m, key: monthSortKey(m.rawLabel) }))
    .sort((a, b) => a.key.sort - b.key.sort);

  return {
    intro:
      "Live publishing roadmap across the engagement — every deliverable with its current production status and supporting docs.",
    months: ordered.map(({ m, key }, i) => ({
      label: monthLabel(i, m.rawLabel, key),
      totalCredits: m.totalCredits,
      deliverables: m.deliverables,
    })),
  };
}

interface MonthKey {
  sort: number;
  monthIndex: number;
  year: number;
}

// Parse "July 26" / "May 2026" / "Month 3" → a sortable key.
function monthSortKey(rawLabel: string): MonthKey {
  const l = rawLabel.toLowerCase();
  const monthIndex = MONTHS.findIndex(
    (m) => l.includes(m) || l.includes(m.slice(0, 3)),
  );
  let year = 0;
  const y4 = /\b(20\d{2})\b/.exec(rawLabel);
  const y2 = /\b(\d{2})\b/.exec(rawLabel);
  if (y4) year = parseInt(y4[1], 10);
  else if (y2) year = 2000 + parseInt(y2[1], 10);

  if (monthIndex >= 0) return { sort: year * 12 + monthIndex, monthIndex, year };

  const mn = /month\s+(\d+)/i.exec(rawLabel);
  if (mn) return { sort: parseInt(mn[1], 10), monthIndex: -1, year: 0 };

  return { sort: Number.MAX_SAFE_INTEGER, monthIndex: -1, year: 0 };
}

function monthLabel(i: number, rawLabel: string, key: MonthKey): string {
  if (key.monthIndex >= 0 && key.year) {
    const name = MONTHS[key.monthIndex];
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    return `MONTH ${i + 1} — ${cap} ${key.year}`;
  }
  return rawLabel;
}
