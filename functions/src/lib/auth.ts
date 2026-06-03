import type { Role } from "../../../shared/types.js";

export const PLATFORM_ADMIN_EMAILS = ["thomas@blastoise.app"];

// Hardcoded access allowlist. Adding/removing access is a one-file edit + a
// `firebase deploy --only functions`. Replaces the old per-sign-in Firestore
// lookup (scan `agencies`, collection-group query `clients`) so we no longer
// have to hand-seed Firestore docs before someone can sign in.
//
// AGENCY_DOMAINS — agency users see ALL clients under their agency.
export const AGENCY_DOMAINS: Record<string, string> = {
  "growthmarketingpro.com": "gmp",
};

// CLIENT_DOMAINS — client company domain (or a specific email) → the client
// record(s) they may see. Keys are matched case-insensitively against both the
// email's domain and the full email. Fill in as real clients onboard.
export const CLIENT_DOMAINS: Record<string, ClientMatch[]> = {
  // Phase 3 (2026-06-03): NeuralTrust live. Anyone @neuraltrust.ai → the
  // neuraltrust dashboard under gmp, route-restricted to that slug.
  "neuraltrust.ai": [{ agencyId: "gmp", clientId: "neuraltrust" }],
};

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase();
}

export function isPlatformAdminEmail(email: string): boolean {
  return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface ClientMatch {
  agencyId: string;
  clientId: string;
}

export type AccessResolution =
  | { role: "platform_admin" }
  | { role: "agency"; agencyId: string }
  | { role: "client"; clientRefs: ClientMatch[] };

// Resolve a user's access from the hardcoded allowlist. Precedence:
// platform admin → agency domain → client domain/email → null (reject).
export function resolveAccess(email: string): AccessResolution | null {
  if (isPlatformAdminEmail(email)) return { role: "platform_admin" };

  const domain = emailDomain(email);
  if (!domain) return null;

  const agencyId = AGENCY_DOMAINS[domain];
  if (agencyId) return { role: "agency", agencyId };

  const clientRefs = CLIENT_DOMAINS[domain] ?? CLIENT_DOMAINS[email.toLowerCase()];
  if (clientRefs && clientRefs.length > 0) return { role: "client", clientRefs };

  return null;
}

// Custom claims emitted into the Firebase auth token. Security rules read these.
export type Claims =
  | { role: "platform_admin" }
  | { role: "agency"; agencyId: string }
  | { role: "client"; clientAgencies: string[]; clientKeys: string[] };

export function buildClaims(args: {
  role: Role;
  agencyId?: string;
  clientRefs?: ClientMatch[];
}): Claims {
  if (args.role === "platform_admin") return { role: "platform_admin" };
  if (args.role === "agency") {
    if (!args.agencyId) throw new Error("agency role requires agencyId");
    return { role: "agency", agencyId: args.agencyId };
  }
  const refs = args.clientRefs ?? [];
  return {
    role: "client",
    clientAgencies: Array.from(new Set(refs.map((r) => r.agencyId))),
    clientKeys: refs.map((r) => `${r.agencyId}/${r.clientId}`),
  };
}
