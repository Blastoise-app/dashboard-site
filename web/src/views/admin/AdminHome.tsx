import { Link } from "react-router-dom";

// TODO (future phase): list of agencies + add-agency form. Not part of Phase 2
// (which wired the client dashboard to live Firestore). Until that exists, this
// page links out to the client dashboards so a platform admin who lands here
// (e.g. via a direct /admin URL) is never stranded on a dead-end.
export default function AdminHome() {
  return (
    <div className="min-h-screen p-10 text-[var(--ink-1)] bg-[var(--bg-page)]">
      <h1 className="font-[var(--font-display)] text-3xl mb-4">Platform admin</h1>
      <p className="text-[var(--ink-2)] mb-6 max-w-prose">
        Agencies list + add-agency form go here. Stubbed — planned for a later phase.
      </p>
      <Link
        to="/agency"
        className="inline-flex items-center gap-1.5 text-[var(--red)] font-medium no-underline hover:underline"
      >
        View client dashboards <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
