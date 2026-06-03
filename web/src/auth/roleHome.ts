import type { Claims, Role } from "./AuthProvider";

// The correct landing route for a signed-in user. A CLIENT's home is their own
// dashboard (/agency/clients/<slug>) — NOT /agency, which 403s a client. Shared
// by the "/" index redirect, SignIn, and any in-app "home" link so they can't
// drift apart (the drift was a confirmed go-live lockout — see Phase 3 review).
export function roleHome(role: Role | undefined, claims?: Claims | null): string {
  // A platform admin's useful landing is the client list at /agency (admin can
  // access it, with the switcher). /admin is a future stub (agencies list +
  // add-agency form), so don't strand the admin there — they can still reach it
  // by direct URL.
  if (role === "platform_admin") return "/agency";
  if (role === "agency") return "/agency";
  if (role === "client") {
    // clientKeys look like "gmp/neuraltrust"; the second segment is the slug.
    const clientId = claims?.clientKeys?.[0]?.split("/")[1];
    if (clientId) return `/agency/clients/${clientId}`;
  }
  // Degenerate: unknown role, or a client whose claims carry no resolvable slug
  // (shouldn't happen — buildClaims always emits role + clientKeys together).
  // Fall back to /agency, a TERMINAL 403 page. Deliberately not /signin: SignIn
  // calls roleHome to pick its post-login dest, so a /signin fallback could
  // self-redirect in a loop. A 403 is a dead-end but never loops.
  return "/agency";
}

// Can a user of this role actually load `path`? Used to reject a stale `from`
// redirect that would otherwise bounce the user to a page their role can't open
// (e.g. a client deep-linked through /agency → 403). Mirrors router.tsx guards.
export function canAccess(role: Role | undefined, path: string): boolean {
  if (role === "platform_admin") return true;
  if (role === "agency") return path === "/agency" || path.startsWith("/agency/clients/");
  if (role === "client") return path.startsWith("/agency/clients/");
  return false;
}
