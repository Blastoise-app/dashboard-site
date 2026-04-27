import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onIdTokenChanged,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export type Role = "platform_admin" | "agency" | "client";

export interface Claims {
  role?: Role;
  agencyId?: string;
  clientAgencies?: string[];
  clientKeys?: string[];
}

interface AuthState {
  user: User | null;
  claims: Claims | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setClaims(null);
        setLoading(false);
        return;
      }
      // Force refresh the first time after sign-in so the blocking trigger's
      // freshly-set custom claims show up immediately.
      const tokenResult = await u.getIdTokenResult(true);
      setClaims(tokenResult.claims as Claims);
      setLoading(false);
    });
  }, []);

  const refreshClaims = async () => {
    if (!auth.currentUser) return;
    const tokenResult = await auth.currentUser.getIdTokenResult(true);
    setClaims(tokenResult.claims as Claims);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, claims, loading, signOut, refreshClaims }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
