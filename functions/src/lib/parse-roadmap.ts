import type { Roadmap, RoadmapDeliverable } from "@shared/types.js";
import { cell, normalizeStatus, type Row } from "./util.js";

export function parseRoadmap(rows: Row[]): Roadmap {
  // Row 0: title. Row 1: credits line. Row 2: client priorities. Row 4: column headers.
  const intro = cell(rows[2], 0);
  const months: Roadmap["months"] = [];
  let cur: Roadmap["months"][number] | null = null;

  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    const a = cell(r, 0);
    const bCredits = cell(r, 1);
    const c = cell(r, 2);

    if (/^MONTH\s+\d+/i.test(a)) {
      if (cur) months.push(cur);
      cur = { label: a, totalCredits: 0, deliverables: [] };
      continue;
    }

    if (/MONTH\s+\d+\s*Total/i.test(c)) {
      if (cur) cur.totalCredits = parseInt(bCredits, 10) || 0;
      continue;
    }

    if (!cur) continue;

    const type = c;
    const title = cell(r, 4);
    if (!type && !title) continue;

    const credits = parseInt(bCredits, 10) || 0;
    const keyword = cell(r, 3);
    const rationale = cell(r, 5);
    const description = cell(r, 6);
    const searchVolume = cell(r, 7);
    const statusRaw = cell(r, 8);

    const deliverable: RoadmapDeliverable = {
      credits,
      type,
      keyword,
      title,
      rationale,
      description,
      searchVolume,
      status: normalizeStatus(statusRaw),
      statusRaw,
    };
    cur.deliverables.push(deliverable);
  }
  if (cur) months.push(cur);

  return { intro, months };
}
