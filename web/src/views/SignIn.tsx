// TODO Phase 1: real Firebase Auth Google sign-in.
// For now this is a placeholder.
export default function SignIn() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-1)] font-[var(--font-sans)]">
      <div className="rounded-xl border border-[var(--edge-2)] bg-[var(--bg-card)] p-8 max-w-md w-full">
        <h1 className="font-[var(--font-display)] text-2xl mb-2">Sign in</h1>
        <p className="text-[var(--ink-2)] text-sm mb-6">
          Google sign-in not yet wired. Set up the Firebase project, then this
          screen renders the real flow.
        </p>
        <button
          disabled
          className="w-full rounded-md border border-[var(--edge-2)] px-4 py-2 text-sm opacity-60 cursor-not-allowed"
        >
          Sign in with Google (stubbed)
        </button>
      </div>
    </div>
  );
}
