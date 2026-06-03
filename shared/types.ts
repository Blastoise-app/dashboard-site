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

// Exact tab titles the ingest reads (by NAME, not gid). KPI spans two tabs.
export interface SheetTabTitles {
  roadmap: string;
  geoTracker: string;
  clusters: string;
  kpiObjectives: string;
  performanceProjections?: string;
}

// Per-client minimum-count baselines for the validate gate. A large shortfall
// fails closed — catches a parser that captured only part of the data on an
// unexpected layout (e.g. clusters parsed as 1 group instead of ~5). Stored on
// the client's sheet config so it is multi-tenant-safe (not hardcoded in code).
export interface SheetExpectMinimums {
  clusterGroups?: number;
  clusterRows?: number;
  geoKeywords?: number;
  deliverables?: number;
}

export interface SheetConnection extends ConnectionStatus {
  id: string;
  sheetTitle?: string;
  detectedTabs?: string[];
  tabTitles?: SheetTabTitles;
  expectMinimums?: SheetExpectMinimums;
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
  // Strategy-doc title/subtitle. They are presentation config (not in the sheet
  // grid), so they live on the Client doc; the sync copies them onto each
  // SheetSnapshot, and assembleStrategyDoc reads them back from the snapshot.
  reportTitle?: string;
  reportSubtitle?: string;
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
  // CPC is optional — some client sheets (e.g. NeuralTrust) track only SV + KD.
  cpc?: number;
  cpcDisplay?: string;
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
  // Optional — some client sheets (e.g. NeuralTrust) don't track CPC.
  cpcDisplay?: string;
  cpc?: number;
  coverage: Record<string, CoverageStatus>;
  // Opaque stable id minted into the sheet's hidden _rowId column; the join key
  // for review state. Absent until ensureRowIds has run against the sheet.
  rowId?: string;
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
  // Present on status-tracked roadmaps (e.g. NeuralTrust's live reporting tab).
  // When any deliverable carries these, the timeline renders per-deliverable
  // cards with status badges + links instead of grouping by type.
  docLink?: string;
  existingLink?: string;
  asOf?: string;
  // Opaque stable id minted into the sheet's hidden _rowId column; the join key
  // for content-review state. Absent until ensureRowIds has run against the sheet.
  rowId?: string;
}

// ---- KPI / reporting (temporary, pre-GA4/GSC-API) -----------------------

export interface KpiObjective {
  objective: string; // Business Objective (blank on continuation rows)
  funnel: string; // Visibility | Traffic | Conversions + Revenue
  kpi: string;
  baseline: string;
  date: string;
  tool: string;
}

export interface KpiTarget {
  kpi: string;
  description: string;
  baseline: string;
  m3: string;
  m6: string;
  m12: string;
  notes: string;
}

export interface KpiReport {
  objectives: KpiObjective[];
  targets: KpiTarget[];
}

// ---- Content review (drafts/outlines awaiting client sign-off) ----------

export interface ContentReviewItem {
  id: string;
  title: string;
  type: string; // roadmap deliverable type — drives accent color
  kind: string; // Outline | Draft | Script | Snippet | Document
  keyword?: string;
  docUrl: string;
  // Optional ISO (yyyy-mm-dd) date used to show a relative "due" pill.
  dueBy?: string;
  isNew?: boolean;
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
  // Title + subtitle come from the sheet (assembled into StrategyDoc at read
  // time alongside the Client doc's slug/brand).
  title: string;
  subtitle: string;
  // Overview is optional — clients onboarded without a narrative tab (e.g.
  // NeuralTrust) carry only the data sections below.
  overview?: Overview;
  clusters: Clusters;
  geoTracker: GeoTracker;
  roadmap: Roadmap;
  kpi?: KpiReport;
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
