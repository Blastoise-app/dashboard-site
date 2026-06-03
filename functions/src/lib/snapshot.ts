// Compose + validate a strategy snapshot from parsed sheet sections. This is
// the write gate: validateSnapshot returns a list of problems, and the ingest
// pipeline refuses to overwrite the last-good Firestore snapshot when the list
// is non-empty (fail closed). Pure — no Sheets/Firestore IO lives here.
import type {
  Clusters,
  CoverageStatus,
  GeoTracker,
  KpiReport,
  Roadmap,
} from "../../../shared/types.js";

export interface ParsedSnapshot {
  title: string;
  subtitle: string;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
  kpi?: KpiReport;
}

export interface SnapshotCounts {
  clusterGroups: number;
  clusterRows: number;
  geoKeywords: number;
  roadmapMonths: number;
  roadmapDeliverables: number;
  kpiObjectives: number;
  kpiTargets: number;
}

export function snapshotCounts(s: ParsedSnapshot): SnapshotCounts {
  return {
    clusterGroups: s.clusters.groups.length,
    clusterRows: s.clusters.groups.reduce((n, g) => n + g.rows.length, 0),
    geoKeywords: s.geoTracker.keywords.length,
    roadmapMonths: s.roadmap.months.length,
    roadmapDeliverables: s.roadmap.months.reduce((n, m) => n + m.deliverables.length, 0),
    kpiObjectives: s.kpi?.objectives.length ?? 0,
    kpiTargets: s.kpi?.targets.length ?? 0,
  };
}

const VALID_STATUSES: readonly CoverageStatus[] = ["notDone", "proposed", "inProgress", "done"];

export interface ValidateOptions {
  // Enforce that every GEO keyword carries a non-empty rowId. True in the
  // deployed pipeline (after ensureRowIds mints them on the GEO Tracker); false
  // for offline parser tests against a grid that hasn't been minted yet. The
  // roadmap is deliberately exempt — it's a read-only IMPORTRANGE mirror that
  // can't carry a minted id (joined by natural key in Phase 4).
  requireRowIds?: boolean;
  // Optional per-client baselines. A large shortfall fails closed — catches a
  // parser that captured only part of the data on an unexpected layout (e.g.
  // clusters parsed as 1 group instead of ~5). Multi-tenant-safe: supplied by
  // the per-client ingest config, not hardcoded here.
  expect?: {
    minClusterGroups?: number;
    minClusterRows?: number;
    minGeoKeywords?: number;
    minDeliverables?: number;
  };
}

export function validateSnapshot(s: ParsedSnapshot, opts: ValidateOptions = {}): string[] {
  const { requireRowIds = true, expect } = opts;
  const problems: string[] = [];
  const valid = new Set<CoverageStatus>(VALID_STATUSES);

  if (!s.clusters.groups.some((g) => g.rows.length > 0)) problems.push("no cluster rows");
  if (s.geoTracker.keywords.length === 0) problems.push("no geo keywords");
  if (!s.roadmap.months.some((m) => m.deliverables.length > 0)) {
    problems.push("no roadmap deliverables");
  }

  for (const m of s.roadmap.months) {
    const sum = m.deliverables.reduce((n, d) => n + (d.credits || 0), 0);
    if (m.totalCredits !== sum) {
      problems.push(
        `roadmap month "${m.label}": totalCredits ${m.totalCredits} != deliverable sum ${sum}`,
      );
    }
    for (const d of m.deliverables) {
      if (!valid.has(d.status)) {
        problems.push(`roadmap "${d.keyword}": invalid status "${d.status}"`);
      }
      // No rowId check on roadmap deliverables — read-only IMPORTRANGE mirror.
    }
  }

  if (requireRowIds) {
    for (const k of s.geoTracker.keywords) {
      if (!k.rowId) problems.push(`geo "${k.keyword}": missing rowId`);
    }
  }

  // KPI sanity (only when present — KPI is optional).
  if (s.kpi) {
    if (s.kpi.objectives.length > 0 && !s.kpi.objectives.some((o) => o.objective.trim())) {
      problems.push("kpi: objectives present but none carries a Business Objective");
    }
    for (const tg of s.kpi.targets) {
      if (!tg.kpi.trim()) problems.push("kpi: a target row has no KPI name");
    }
  }

  // Baseline minimums — fail closed on a large shortfall.
  if (expect) {
    const c = snapshotCounts(s);
    if (expect.minClusterGroups != null && c.clusterGroups < expect.minClusterGroups) {
      problems.push(
        `clusters: ${c.clusterGroups} groups < expected ${expect.minClusterGroups} (parser/layout shortfall?)`,
      );
    }
    if (expect.minClusterRows != null && c.clusterRows < expect.minClusterRows) {
      problems.push(`clusters: ${c.clusterRows} rows < expected ${expect.minClusterRows}`);
    }
    if (expect.minGeoKeywords != null && c.geoKeywords < expect.minGeoKeywords) {
      problems.push(`geo: ${c.geoKeywords} keywords < expected ${expect.minGeoKeywords}`);
    }
    if (expect.minDeliverables != null && c.roadmapDeliverables < expect.minDeliverables) {
      problems.push(`roadmap: ${c.roadmapDeliverables} deliverables < expected ${expect.minDeliverables}`);
    }
  }

  return problems;
}
