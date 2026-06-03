import type {
  Brand,
  Overview,
  Clusters,
  GeoTracker,
  Roadmap,
  KpiReport,
  ContentReviewItem,
} from "@shared/types";
import ideogramData from "@/fixtures/ideogram.json";
import neuraltrustData from "@/fixtures/neuraltrust.json";

// NOTE (Phase 2): the SPA no longer renders these fixtures at runtime — the
// dashboard reads live Firestore (see useClientStrategy / strategyDoc). The
// bundled JSON below is kept only as a DEV SEED SOURCE for sheet-less clients:
// functions/src/seedClientFromFixture.ts splits a fixture into a Client +
// SheetSnapshot doc (e.g. ideogram). `StrategyDoc` remains the canonical
// rendered shape — assembleStrategyDoc returns it from the two Firestore docs:
//   - /agencies/{a}/clients/{c}                 → Client
//   - /agencies/{a}/clients/{c}/sheetSnapshots/strategy → SheetSnapshot
export interface StrategyDoc {
  slug: string;
  title: string;
  subtitle: string;
  brand: Brand;
  lastUpdated: string;
  // Optional — clients without a narrative tab (e.g. NeuralTrust) omit this.
  overview?: Overview;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
  // Temporary KPI "Reporting" view, pending the GA4/GSC API integration.
  kpi?: KpiReport;
  // Drafts/outlines awaiting client sign-off. When absent, the Content Review
  // section derives items from in-review roadmap deliverables that have docs.
  contentReview?: ContentReviewItem[];
}

export const fixtures: Record<string, StrategyDoc> = {
  ideogram: ideogramData as StrategyDoc,
  neuraltrust: neuraltrustData as StrategyDoc,
};

export function getFixture(slug: string): StrategyDoc | undefined {
  return fixtures[slug];
}

export function listFixtures(): StrategyDoc[] {
  return Object.values(fixtures);
}
