import { Link } from "react-router-dom";
import { listFixtures } from "@/lib/fixtures";

// TODO Phase 3: list real clients from Firestore + Add Client wizard.
// For now: list dev fixtures so we can navigate into the strategy view.
export default function AgencyHome() {
  const clients = listFixtures();
  return (
    <div className="min-h-screen p-10 text-[var(--ink-1)] bg-[var(--bg-page)]">
      <header className="mb-10">
        <h1 className="font-[var(--font-display)] text-4xl mb-2">
          Growth Marketing Pro
        </h1>
        <p className="text-[var(--ink-2)]">
          Clients (dev fixtures — Firestore wiring in Phase 3).
        </p>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <li
            key={c.slug}
            className="rounded-lg border border-[var(--edge-1)] bg-[var(--bg-card)] hover:border-[var(--red-line)] transition-colors"
          >
            <Link
              to={`/agency/clients/${c.slug}`}
              className="block p-6 no-underline"
            >
              <div className="text-xs uppercase tracking-widest text-[var(--red)] mb-2">
                {c.brand.name}
              </div>
              <div className="font-[var(--font-display)] text-xl text-[var(--ink-0)] mb-2">
                {c.title}
              </div>
              <div className="text-sm text-[var(--ink-2)]">{c.subtitle}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
