// Read-side glue between the two Firestore documents that compose a client's
// dashboard and the flat `StrategyDoc` the views render:
//   - /agencies/{a}/clients/{c}                          → Client   (presentation/config)
//   - /agencies/{a}/clients/{c}/sheetSnapshots/strategy  → SheetSnapshot (the data)
// `assembleStrategyDoc` is the exact inverse of functions/src/seedClientFromFixture.ts.
import type { Client, SheetSnapshot } from "@shared/types";
import type { StrategyDoc } from "@/lib/fixtures";

export function clientDocPath(agencyId: string, clientId: string): string {
  return `agencies/${agencyId}/clients/${clientId}`;
}

export function strategySnapshotPath(agencyId: string, clientId: string): string {
  return `agencies/${agencyId}/clients/${clientId}/sheetSnapshots/strategy`;
}

// Firestore Timestamp → ISO string. Handles both the SDK `Timestamp` instance
// (has `.toDate()`) and the plain `{ seconds, nanoseconds }` shape (e.g. after a
// JSON round-trip). Returns "" when absent so the freshness badge degrades to "—".
export function tsToIso(ts: unknown): string {
  if (!ts) return "";
  const maybe = ts as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
  if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
  if (typeof maybe.seconds === "number") {
    const ms = typeof maybe.nanoseconds === "number" ? Math.floor(maybe.nanoseconds / 1e6) : 0;
    return new Date(maybe.seconds * 1000 + ms).toISOString();
  }
  return "";
}

// Compose the rendered StrategyDoc from its two source docs. Title/subtitle come
// from the snapshot (the sync copies them off the Client doc), with the Client
// doc as fallback. `contentReview` is intentionally omitted — the snapshot never
// carries it; StrategyView derives review items from the roadmap.
export function assembleStrategyDoc(client: Client, snap: SheetSnapshot): StrategyDoc {
  return {
    slug: client.slug,
    title: snap.title || client.reportTitle || client.name || "",
    subtitle: snap.subtitle || client.reportSubtitle || "",
    brand: client.brand,
    lastUpdated: tsToIso(snap.syncedAt),
    overview: snap.overview,
    clusters: snap.clusters,
    geoTracker: snap.geoTracker,
    roadmap: snap.roadmap,
    kpi: snap.kpi,
  };
}

// Lightweight client-card / switcher row. Derived from the Client doc alone (no
// snapshot read) so the agency list stays a single collection query.
export interface ClientListItem {
  slug: string;
  title: string;
  subtitle: string;
  brandName: string;
}

export function toClientListItem(client: Client, id: string): ClientListItem {
  return {
    slug: client.slug || id,
    title: client.reportTitle || client.name || id,
    subtitle: client.reportSubtitle || "",
    brandName: client.brand?.name || "",
  };
}
