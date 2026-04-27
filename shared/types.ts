// Shared types between /web (frontend) and /functions (Cloud Functions).
// Imported by both. Source of truth for Firestore document shapes.

export type Role = "platform_admin" | "agency" | "client";

// Portable timestamp shape. Firestore's client and admin SDKs each export
// their own Timestamp class; both are structurally compatible with this.
// Code that creates Timestamps imports from the appropriate Firebase SDK
// at the boundary; intermediate code just passes them through.
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Brand {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  chipBg?: string;
}

// ---- Top-level documents -----------------------------------------------

export interface Agency {
  id: string;
  name: string;
  slug: string;
  emailDomains: string[];
  customDomain?: string;
  brand: Brand;
  ownerEmail: string;
  plan: "starter" | "pro";
  createdAt: Timestamp;
}

export interface ConnectionStatus {
  status: "ok" | "error" | "unverified";
  verifiedAt?: Timestamp;
  lastError?: string;
}

export interface SheetConnection extends ConnectionStatus {
  id: string;
  sheetTitle?: string;
  detectedTabs?: string[];
}

export interface Ga4Connection extends ConnectionStatus {
  propertyId: string;
  propertyName?: string;
  accountName?: string;
}

export interface GscConnection extends ConnectionStatus {
  siteUrl: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  brand: Brand;
  allowedDomains: string[];
  dataSources: {
    sheet: SheetConnection;
    ga4: Ga4Connection;
    gsc: GscConnection;
  };
  createdBy: string;
  createdAt: Timestamp;
  lastFetchedAt?: Timestamp;
}

// ---- Per-client subcollections -----------------------------------------

export interface MonthlyReport {
  id: string;
  generatedAt: Timestamp;
  ga4: Ga4Snapshot;
  gsc: GscSnapshot;
}

export interface Ga4Snapshot {
  sessions: number;
  users: number;
  newUsers: number;
  topPages: Array<{ path: string; sessions: number; users: number }>;
  bySource: Array<{ channel: string; sessions: number }>;
}

export interface GscSnapshot {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

// ---- Strategy doc (carries forward existing data.json shape) -----------

export type CoverageStatus = "notDone" | "proposed" | "inProgress" | "done";

export type OverviewSection =
  | { kind: "prose"; title: string; body: string }
  | {
      kind: "approach";
      title: string;
      intro: string;
      bullets: Array<{ title: string; body: string }>;
    }
  | {
      kind: "creditSystem";
      title: string;
      intro: string;
      rows: Array<{ deliverable: string; credits: string; what: string }>;
    }
  | {
      kind: "monthSummaries";
      title: string;
      months: Array<{ label: string; bullets: string[] }>;
    }
  | {
      kind: "navigation";
      title: string;
      items: Array<{ name: string; description: string }>;
    };

export interface Overview {
  headline: string;
  subheadline: string;
  sections: OverviewSection[];
  footer: string;
}

export interface ClusterRow {
  keyword: string;
  svDisplay: string;
  sv: number;
  kd: number;
  cpc: number;
  cpcDisplay: string;
}

export interface Clusters {
  groups: Array<{ name: string; rows: ClusterRow[] }>;
}

export interface GeoTrackerLever {
  id: string;
  label: string;
  group: "SEO" | "GEO";
}

export interface GeoTrackerKeyword {
  keyword: string;
  svDisplay: string;
  sv: number;
  cpcDisplay: string;
  cpc: number;
  coverage: Record<string, CoverageStatus>;
}

export interface GeoTracker {
  levers: GeoTrackerLever[];
  keywords: GeoTrackerKeyword[];
}

export interface RoadmapDeliverable {
  credits: number;
  type: string;
  keyword: string;
  title: string;
  rationale: string;
  description: string;
  searchVolume: string;
  status: CoverageStatus;
  statusRaw: string;
}

export interface Roadmap {
  intro: string;
  months: Array<{
    label: string;
    totalCredits: number;
    deliverables: RoadmapDeliverable[];
  }>;
}

// Strategy doc snapshot stored at /agencies/{a}/clients/{c}/sheetSnapshots/strategy.
// Carries forward the data.json shape produced by scripts/lib/parse-*.mjs.
export interface SheetSnapshot {
  overview: Overview;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
  syncedAt: Timestamp;
}

// ---- Users + audit -----------------------------------------------------

export interface UserDoc {
  uid: string;
  email: string;
  role: Role;
  agencyId?: string;
  clientRefs?: Array<{ agencyId: string; clientId: string }>;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
}

export interface AuditEvent {
  id: string;
  uid: string;
  action: string;
  target: { agencyId?: string; clientId?: string };
  ts: Timestamp;
}
