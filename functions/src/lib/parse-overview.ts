import type { Overview, OverviewSection } from "@shared/types.js";
import { cell, nonEmpty, type Row } from "./util.js";

export function parseOverview(rows: Row[]): Overview {
  const headline = cell(rows[0], 0);
  const subheadline = cell(rows[1], 0);

  const sections: OverviewSection[] = [];
  let footer = "";
  let i = 2;

  while (i < rows.length) {
    const row = rows[i];
    if (!nonEmpty(row)) {
      i++;
      continue;
    }

    const a = cell(row, 0);

    if (/^Questions\?/i.test(a)) {
      footer = a;
      i++;
      continue;
    }

    const isHeader = a && !row.slice(1).some((c) => c && String(c).trim());
    if (!isHeader) {
      i++;
      continue;
    }

    const title = a;
    i++;

    if (/THE OPPORTUNITY/i.test(title)) {
      sections.push({ kind: "prose", title, body: cell(rows[i], 0) });
      i++;
      continue;
    }

    if (/OUR APPROACH/i.test(title)) {
      const intro = cell(rows[i], 0);
      i++;
      const bullets: Array<{ title: string; body: string }> = [];
      while (i < rows.length) {
        const r = rows[i];
        if (!nonEmpty(r)) {
          i++;
          continue;
        }
        if (cell(r, 0)) break;
        const bTitle = cell(r, 1);
        const bBody = cell(r, 3);
        if (bTitle) bullets.push({ title: bTitle, body: bBody });
        i++;
      }
      sections.push({ kind: "approach", title, intro, bullets });
      continue;
    }

    if (/HOW THE CREDIT SYSTEM/i.test(title)) {
      const intro = cell(rows[i], 0);
      i++;
      while (i < rows.length && !/Deliverable/i.test(cell(rows[i], 1))) i++;
      i++; // skip header row
      const creditRows: Array<{ deliverable: string; credits: string; what: string }> = [];
      while (i < rows.length) {
        const r = rows[i];
        if (!nonEmpty(r)) {
          i++;
          continue;
        }
        if (cell(r, 0)) break;
        const deliverable = cell(r, 1);
        const credits = cell(r, 3);
        const what = cell(r, 4);
        if (deliverable) creditRows.push({ deliverable, credits, what });
        i++;
      }
      sections.push({ kind: "creditSystem", title, intro, rows: creditRows });
      continue;
    }

    if (/STRATEGIC ALLOCATION/i.test(title)) {
      sections.push({ kind: "prose", title, body: cell(rows[i], 0) });
      i++;
      continue;
    }

    if (/MONTH-BY-MONTH SUMMARY/i.test(title)) {
      const months: Array<{ label: string; bullets: string[] }> = [];
      while (i < rows.length) {
        const r = rows[i];
        if (!nonEmpty(r)) {
          i++;
          continue;
        }
        const line = cell(r, 0);
        if (!line) break;
        const mMatch = /^MONTH\s+\d+/i.exec(line);
        if (!mMatch) break;
        i++;
        const bulletsLine = cell(rows[i], 0);
        const bullets = bulletsLine.split("·").map((s) => s.trim()).filter(Boolean);
        months.push({ label: line, bullets });
        i++;
      }
      sections.push({ kind: "monthSummaries", title, months });
      continue;
    }

    if (/HOW TO NAVIGATE/i.test(title)) {
      const items: Array<{ name: string; description: string }> = [];
      while (i < rows.length) {
        const r = rows[i];
        if (!nonEmpty(r)) {
          i++;
          continue;
        }
        if (cell(r, 0)) break;
        const name = cell(r, 1);
        const description = cell(r, 2);
        if (name) items.push({ name, description });
        i++;
      }
      sections.push({ kind: "navigation", title, items });
      continue;
    }

    // Fallback: unknown section, capture following row as prose
    sections.push({ kind: "prose", title, body: cell(rows[i], 0) });
    i++;
  }

  return { headline, subheadline, sections, footer };
}
