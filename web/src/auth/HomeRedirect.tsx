import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { roleHome } from "./roleHome";

// Role-aware landing for the bare "/" route. The old index redirect sent
// everyone to /agency, which 403s a client — the most likely first-visit path
// (bookmark / shared link to the bare domain) dead-ended a legitimate client on
// "Not authorized". Now: not signed in → /signin; otherwise → the role's home.
export default function HomeRedirect() {
  const { user, claims, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-2)] font-[var(--font-sans)] text-sm">
        Loading…
      </div>
    );
  }
  if (!user || !claims?.role) return <Navigate to="/signin" replace />;
  return <Navigate to={roleHome(claims.role, claims)} replace />;
}
