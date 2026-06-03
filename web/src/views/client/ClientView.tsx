import type { ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useClientStrategy, useAgencyClients, resolveAgencyId } from "@/lib/useClientStrategy";
import StrategyView from "./strategy/StrategyView";

// Single-scroll client microsite, rendered live from Firestore. Everything
// (strategy, roadmap, reporting, content review) is a section in one scrolling
// page with the TOC sidebar — no tabs. The agency/admin client switcher lives in
// the Topbar; its options come from the agency-clients listener (only opened for
// agency/admin, whose rules permit the collection list query).
export default function ClientView() {
  const { slug = "" } = useParams();
  const { claims } = useAuth();
  const agencyId = resolveAgencyId(claims, slug);

  const { doc, loading, error, notFound, snapshotMissing } = useClientStrategy(agencyId, slug);

  const canSwitch = claims?.role === "agency" || claims?.role === "platform_admin";
  const { clients } = useAgencyClients(canSwitch ? agencyId : undefined);

  if (loading) {
    return <Centered>Loading…</Centered>;
  }

  if (error) {
    return (
      <Centered>
        <p className="mb-4">
          {error.code === "permission-denied"
            ? "You don't have access to this client."
            : `Couldn't load this client (${error.code}).`}
        </p>
        <BackLink />
      </Centered>
    );
  }

  if (notFound) {
    return (
      <Centered>
        <p className="mb-4">Client not found: {slug}</p>
        <BackLink />
      </Centered>
    );
  }

  if (snapshotMissing || !doc) {
    return (
      <Centered>
        <p className="mb-4">No data has synced yet for {slug}. Check back after the next sync.</p>
        <BackLink />
      </Centered>
    );
  }

  return <StrategyView doc={doc} clients={clients} />;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-2)]">
      <div className="text-center">{children}</div>
    </div>
  );
}

function BackLink() {
  const { claims } = useAuth();
  // "Back to clients" only makes sense for agency/admin, who have a client list
  // at /agency. A client has no list to go back to, and /agency 403s them — so
  // render nothing rather than a dead-end link.
  if (claims?.role === "client") return null;
  return (
    <Link to="/agency" className="text-[var(--red)] underline">
      Back to clients
    </Link>
  );
}
