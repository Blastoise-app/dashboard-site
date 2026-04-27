import type { Agency, Role } from "../../../shared/types.js";

export const PLATFORM_ADMIN_EMAILS = ["thomas@blastoise.app"];

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase();
}

export function isPlatformAdminEmail(email: string): boolean {
  return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}

export function matchAgencyByDomain(
  email: string,
  agencies: Array<Pick<Agency, "id" | "emailDomains">>,
): { agencyId: string } | null {
  const domain = emailDomain(email);
  if (!domain) return null;
  for (const a of agencies) {
    if (a.emailDomains?.some((d) => d.toLowerCase() === domain)) {
      return { agencyId: a.id };
    }
  }
  return null;
}

export interface ClientMatch {
  agencyId: string;
  clientId: string;
}

export function matchClientsByDomain(
  email: string,
  clients: Array<{ id: string; agencyId: string; allowedDomains: string[] }>,
): ClientMatch[] {
  const domain = emailDomain(email);
  if (!domain) return [];
  return clients
    .filter((c) => c.allowedDomains?.some((d) => d.toLowerCase() === domain))
    .map((c) => ({ agencyId: c.agencyId, clientId: c.id }));
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
