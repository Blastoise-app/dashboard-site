import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type Role } from "./AuthProvider";

interface Props {
  children: ReactNode;
  requireRole?: Role | Role[];
}

// Wraps a route. Redirects to /signin if not authenticated; renders a 403 if
// the user is signed in but lacks the required role.
export default function RouteGuard({ children, requireRole }: Props) {
  const { user, claims, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SplashState message="Loading…" />;
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (!claims?.role) {
    // Trigger ran but claim hasn't propagated yet, OR something went wrong.
    return (
      <SplashState
        message="Setting up your account… If this hangs, sign out and try again."
      />
    );
  }

  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
    // Platform admin always has access.
    if (claims.role !== "platform_admin" && !allowed.includes(claims.role)) {
      return <ForbiddenState role={claims.role} required={allowed} />;
    }
  }

  return <>{children}</>;
}

function SplashState({ message }: { message: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-2)] font-[var(--font-sans)] text-sm">
      {message}
    </div>
  );
}

function ForbiddenState({ role, required }: { role: Role; required: Role[] }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-1)] font-[var(--font-sans)] p-6">
      <div className="max-w-md text-center">
        <h1 className="font-[var(--font-display)] text-2xl mb-3">Not authorized</h1>
        <p className="text-[var(--ink-2)] text-sm">
          Your account ({role}) doesn't have access to this page. Required:{" "}
          {required.join(", ")}.
        </p>
      </div>
    </div>
  );
}
