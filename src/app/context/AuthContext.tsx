import React, { createContext, ReactNode, useContext, useState } from "react";
import { apiGet, apiPost, setStoredUser } from "../lib/api";

export type UserRole = "mahasiswa" | "operator" | "dosen";

export interface AuthUser {
  name: string;
  id: string;
  role: UserRole;
  initials: string;
  prodi?: string;
  tipe?: "Riset" | "Magang" | string;
}

interface AuthContextValue {
  user: AuthUser | null;
  hydrated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  hydrated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const login = (nextUser: AuthUser) => {
    setUser(nextUser);
    setStoredUser(nextUser);
  };

  const clearLocalSession = React.useCallback(() => {
    try {
      localStorage.clear();
    } catch (e) {
      // ignore
    }
    setUser(null);
    setStoredUser(null);
  }, []);

  const logout = () => {
    void apiPost("/auth/logout").catch(() => {});
    // notify other tabs/windows and current window to clear session
    try {
      localStorage.setItem("stas:auth-expired", String(Date.now()));
    } catch (e) {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("stas:auth-expired"));
    clearLocalSession();
  };

  React.useEffect(() => {
    let cancelled = false;

    apiGet<{ user: AuthUser }>("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const verified = res?.user;
        if (verified) {
          setUser(verified);
          setStoredUser(verified);
        } else {
          clearLocalSession();
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearLocalSession();
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clearLocalSession]);

  React.useEffect(() => {
    const onAuthExpired = () => clearLocalSession();
    const onStorage = (e: StorageEvent) => {
      // if another tab signalled auth expired, or localStorage was cleared
      if (e.key === "stas:auth-expired" || e.key === null) {
        clearLocalSession();
      }
    };

    window.addEventListener("stas:auth-expired", onAuthExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("stas:auth-expired", onAuthExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, [clearLocalSession]);

  return (
    <AuthContext.Provider value={{ user, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

