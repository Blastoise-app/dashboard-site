import type { CoverageStatus } from "@shared/types.js";

export type Row = string[];

export function parseSv(s: string | null | undefined): number {
  if (s == null) return 0;
  const t = String(s).replace(/,/g, "").trim();
  if (!t) return 0;
  const m = /^([\d.]+)\s*([KMkm])?$/.exec(t);
  if (!m) return parseFloat(t) || 0;
  const n = parseFloat(m[1]);
  const suffix = (m[2] || "").toUpperCase();
  const mult = suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
  return n * mult;
}

export function parseCpc(s: string | null | undefined): number {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[^\d.]/g, "")) || 0;
}

export function normalizeStatus(s: string | null | undefined): CoverageStatus {
  if (!s) return "notDone";
  const l = String(s).toLowerCase();
  if (l.includes("not done")) return "notDone";
  if (l.includes("proposed") || l.includes("ready")) return "proposed";
  if (l.includes("in progress") || l.includes("started") || l.includes("drafting")) return "inProgress";
  if (l.includes("done") || l.includes("complete") || l.includes("live") || l.includes("published")) return "done";
  return "notDone";
}

export function nonEmpty(row: Row | undefined): boolean {
  if (!row) return false;
  return row.some((c) => c != null && String(c).trim() !== "");
}

export function cell(row: Row | undefined, i: number): string {
  return row && row[i] != null ? String(row[i]).trim() : "";
}
