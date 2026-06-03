import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useAgencyClients, resolveAgencyId } from "@/lib/useClientStrategy";

// Lists the agency's real clients live from Firestore. Route-guarded to
// agency/platform_admin, so the collection list query is permitted by the rules.
export default function AgencyHome() {
  const { claims } = useAuth();
  const agencyId = resolveAgencyId(claims);
  const { clients, loading, error } = useAgencyClients(agencyId);

  return (
    <div className="min-h-screen p-10 text-[var(--ink-1)] bg-[var(--bg-page)]">
      <header className="mb-10">
        <h1 className="font-[var(--font-display)] text-4xl mb-2">Growth Marketing Pro</h1>
        <p className="text-[var(--ink-2)]">Clients</p>
      </header>

      {loading && <p className="text-[var(--ink-2)]">Loading clients…</p>}

      {error && (
        <p className="text-[var(--ink-2)]">
          Couldn't load clients ({error.code}). Try refreshing.
        </p>
      )}

      {!loading && !error && clients.length === 0 && (
        <p className="text-[var(--ink-2)]">No clients yet.</p>
      )}

      {!loading && !error && clients.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <li
              key={c.slug}
              className="rounded-lg border border-[var(--edge-1)] bg-[var(--bg-card)] hover:border-[var(--red-line)] transition-colors"
            >
              <Link to={`/agency/clients/${c.slug}`} className="block p-6 no-underline">
                <div className="text-xs uppercase tracking-widest text-[var(--red)] mb-2">
                  {c.brandName}
                </div>
                <div className="font-[var(--font-display)] text-xl text-[var(--ink-0)] mb-2">
                  {c.title}
                </div>
                <div className="text-sm text-[var(--ink-2)]">{c.subtitle}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
