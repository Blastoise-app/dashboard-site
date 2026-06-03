import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useAgencyClients, resolveAgencyId } from "@/lib/useClientStrategy";

// Lists the agency's real clients live from Firestore. Route-guarded to
// agency/platform_admin, so the collection list query is permitted by the rules.
export default function AgencyHome() {
  const { claims } = useAuth();
  const agencyId = resolveAgencyId(claims);
  const { clients, loading, error } = useAgencyClients(agencyId);

  const ready = !loading && !error;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--ink-1)]">
      <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
        <header className="mb-12 border-b border-[var(--edge-1)] pb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--red)]">
            Growth Marketing Pro
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--ink-0)]">
            Clients
          </h1>
          {ready && clients.length > 0 && (
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              {clients.length} {clients.length === 1 ? "client" : "clients"} · choose one to open its dashboard
            </p>
          )}
        </header>

        {loading && <p className="text-[var(--ink-2)]">Loading clients…</p>}

        {error && (
          <p className="text-[var(--ink-2)]">
            Couldn't load clients ({error.code}). Try refreshing.
          </p>
        )}

        {ready && clients.length === 0 && (
          <p className="text-[var(--ink-2)]">No clients yet.</p>
        )}

        {ready && clients.length > 0 && (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {clients.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/agency/clients/${c.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-[var(--edge-1)] bg-[var(--bg-card)] p-7 no-underline transition-colors hover:border-[var(--red-line)]"
                >
                  {c.brandName && (
                    <div className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.15em] text-[var(--red)]">
                      {c.brandName}
                    </div>
                  )}
                  <div className="mb-2 font-[family-name:var(--font-display)] text-2xl leading-snug text-[var(--ink-0)]">
                    {c.title}
                  </div>
                  {c.subtitle && (
                    <div className="text-sm leading-relaxed text-[var(--ink-2)]">
                      {c.subtitle}
                    </div>
                  )}
                  <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-[var(--ink-2)] transition-colors group-hover:text-[var(--red)]">
                    Open dashboard <span aria-hidden="true">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
