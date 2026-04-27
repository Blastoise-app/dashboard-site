import type {
  Brand,
  Overview,
  Clusters,
  GeoTracker,
  Roadmap,
} from "@shared/types";
import ideogramData from "@/fixtures/ideogram.json";

// Combined "client + strategy snapshot" shape used for dev rendering.
// In production these become two separate Firestore documents:
//   - /agencies/{a}/clients/{c}                 → Client
//   - /agencies/{a}/clients/{c}/sheetSnapshots/strategy → SheetSnapshot
export interface StrategyDoc {
  slug: string;
  title: string;
  subtitle: string;
  brand: Brand;
  lastUpdated: string;
  overview: Overview;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
}

export const fixtures: Record<string, StrategyDoc> = {
  ideogram: ideogramData as StrategyDoc,
};

export function getFixture(slug: string): StrategyDoc | undefined {
  return fixtures[slug];
}

export function listFixtures(): StrategyDoc[] {
  return Object.values(fixtures);
}
