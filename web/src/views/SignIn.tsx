import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/auth/AuthProvider";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, claims } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Bounce to the right shell.
  if (user && claims?.role) {
    const dest = roleHome(claims.role);
    return <RedirectTo path={(location.state as { from?: string })?.from || dest} navigate={navigate} />;
  }

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      // onIdTokenChanged in AuthProvider will fire; the role-based redirect happens
      // on the next render via the user/claims branch above.
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        if (e.code === "auth/popup-closed-by-user") {
          setError("Sign-in cancelled.");
        } else if (e.message?.includes("permission-denied") || e.message?.includes("isn't authorized")) {
          setError("This email isn't authorized for any client or agency. Contact your administrator.");
        } else {
          setError(e.message ?? "Sign-in failed.");
        }
      } else {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-1)] font-[var(--font-sans)] p-6">
      <div className="rounded-xl border border-[var(--edge-2)] bg-[var(--bg-card)] p-8 max-w-md w-full">
        <h1 className="font-[var(--font-display)] text-2xl mb-2">Sign in</h1>
        <p className="text-[var(--ink-2)] text-sm mb-6">
          Use your work Google account. Access is granted by email domain.
        </p>
        <button
          onClick={handleSignIn}
          disabled={submitting}
          className="w-full rounded-md border border-[var(--edge-2)] px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Signing in…" : "Continue with Google"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-[var(--red)]">{error}</p>
        )}
      </div>
    </div>
  );
}

function RedirectTo({ path, navigate }: { path: string; navigate: ReturnType<typeof useNavigate> }) {
  // Effect-free redirect via useEffect indirection isn't necessary — Router supports it.
  setTimeout(() => navigate(path, { replace: true }), 0);
  return null;
}

function roleHome(role: string): string {
  if (role === "platform_admin") return "/admin";
  if (role === "agency") return "/agency";
  if (role === "client") return "/agency";
  return "/agency";
}
