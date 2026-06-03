// Live Firestore subscriptions powering the client dashboard + agency list.
// Replaces the bundled fixtures: the SPA now renders whatever the hourly sync
// (or a seed) has written to Firestore, updating in place when syncedAt bumps.
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, type FirestoreError } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client, SheetSnapshot } from "@shared/types";
import type { Claims } from "@/auth/AuthProvider";
import type { StrategyDoc } from "@/lib/fixtures";
import {
  assembleStrategyDoc,
  clientDocPath,
  strategySnapshotPath,
  toClientListItem,
  type ClientListItem,
} from "@/lib/strategyDoc";

// MVP: only one agency exists, so a platform_admin (who isn't scoped to an
// agency by claims) defaults here. TODO: real cross-agency resolution — scan
// /agencies or store the agencyId alongside the slug — when a 2nd agency lands.
const DEFAULT_AGENCY_ID = "gmp";

// Which agency owns the data this user is looking at. Agency users carry their
// agencyId on the claim; clients derive it from their clientKeys ("agency/client");
// admins fall back to the single agency until cross-agency lookup exists.
export function resolveAgencyId(claims: Claims | null, slug?: string): string | undefined {
  if (!claims?.role) return undefined;
  if (claims.role === "agency") return claims.agencyId;
  if (claims.role === "client") {
    const keys = claims.clientKeys ?? [];
    const match = slug ? keys.find((k) => k.split("/")[1] === slug) : undefined;
    return (match ?? keys[0])?.split("/")[0];
  }
  // platform_admin
  return claims.agencyId ?? DEFAULT_AGENCY_ID;
}

export interface ClientStrategyState {
  doc: StrategyDoc | null;
  loading: boolean;
  error: FirestoreError | null;
  notFound: boolean; // Client doc absent
  snapshotMissing: boolean; // Client exists but no synced snapshot yet
}

interface Seen<T> {
  seen: boolean;
  data: T | null;
}

const UNSEEN = { seen: false, data: null } as const;

// Subscribe to the Client doc + its strategy snapshot. Assembles the StrategyDoc
// only after BOTH listeners have fired once, so we never flash "not found"
// before the snapshot lands. A listener error (e.g. permission-denied when a
// client probes another client's path) surfaces in `error`.
export function useClientStrategy(
  agencyId: string | undefined,
  slug: string | undefined,
): ClientStrategyState {
  const [client, setClient] = useState<Seen<Client>>(UNSEEN);
  const [snap, setSnap] = useState<Seen<SheetSnapshot>>(UNSEEN);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // Reset first — so stale data can't leak across slugs, and so the hook is
    // truly cleared if disabled (agencyId/slug undefined) rather than retaining
    // the previous target's docs.
    setClient(UNSEEN);
    setSnap(UNSEEN);
    setError(null);
    if (!agencyId || !slug) return;

    const unsubClient = onSnapshot(
      doc(db, clientDocPath(agencyId, slug)),
      (d) => setClient({ seen: true, data: d.exists() ? (d.data() as Client) : null }),
      (e) => setError(e),
    );
    const unsubSnap = onSnapshot(
      doc(db, strategySnapshotPath(agencyId, slug)),
      (d) => setSnap({ seen: true, data: d.exists() ? (d.data() as SheetSnapshot) : null }),
      (e) => setError(e),
    );
    return () => {
      unsubClient();
      unsubSnap();
    };
  }, [agencyId, slug]);

  return useMemo<ClientStrategyState>(() => {
    const base = { doc: null, error: null, notFound: false, snapshotMissing: false };
    if (error) return { ...base, loading: false, error };
    if (!agencyId || !slug) return { ...base, loading: true };
    if (!client.seen || !snap.seen) return { ...base, loading: true };
    if (!client.data) return { ...base, loading: false, notFound: true };
    if (!snap.data) return { ...base, loading: false, snapshotMissing: true };
    return { ...base, loading: false, doc: assembleStrategyDoc(client.data, snap.data) };
  }, [agencyId, slug, client, snap, error]);
}

export interface AgencyClientsState {
  clients: ClientListItem[];
  loading: boolean;
  error: FirestoreError | null;
}

// List the clients under an agency (for AgencyHome + the Topbar switcher). Pass
// `undefined` to disable — important for `client`-role users, whose security
// rules forbid the collection *list* query (isClientOf needs a specific
// clientId), so we must not open this listener for them.
export function useAgencyClients(agencyId: string | undefined): AgencyClientsState {
  const [state, setState] = useState<{
    clients: ClientListItem[];
    seen: boolean;
    error: FirestoreError | null;
  }>({ clients: [], seen: false, error: null });

  useEffect(() => {
    // Reset first so a transition to disabled (undefined agencyId) clears any
    // prior agency's clients instead of returning them stale.
    setState({ clients: [], seen: false, error: null });
    if (!agencyId) return;
    const unsub = onSnapshot(
      collection(db, `agencies/${agencyId}/clients`),
      (qs) =>
        setState({
          clients: qs.docs.map((d) => toClientListItem(d.data() as Client, d.id)),
          seen: true,
          error: null,
        }),
      (e) => setState({ clients: [], seen: true, error: e }),
    );
    return () => unsub();
  }, [agencyId]);

  return {
    clients: state.clients,
    loading: !!agencyId && !state.seen,
    error: state.error,
  };
}
