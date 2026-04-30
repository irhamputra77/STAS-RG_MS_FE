import React, { createContext, useContext, useState, ReactNode } from "react";
import { apiGet, apiPost } from "../lib/api";

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
  // Optimistic: pakai cache localStorage untuk render awal supaya tidak flicker login screen.
  // Tetapi BUKAN source of truth — diverifikasi ulang ke backend di useEffect.
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("stas_user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [hydrated, setHydrated] = useState(false);

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem("stas_user", JSON.stringify(u));
  };

  const clearLocalSession = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem("stas_user");
  }, []);

  const logout = () => {
    void apiPost("/auth/logout").catch(() => {});
    clearLocalSession();
  };

  // Validasi sesi ke backend saat mount.
  // Server mengembalikan role/identitas dari JWT yang sudah diverifikasi —
  // ini override apapun yang ada di localStorage (mencegah privilege escalation
  // via edit DevTools → localStorage.stas_user.role).
  React.useEffect(() => {
    let cancelled = false;

    apiGet<{ user: AuthUser }>("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const verified = res?.user;
        if (verified) {
          setUser(verified);
          localStorage.setItem("stas_user", JSON.stringify(verified));
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

    return () => { cancelled = true; };
  }, [clearLocalSession]);

  React.useEffect(() => {
    const onAuthExpired = () => clearLocalSession();
    window.addEventListener("stas:auth-expired", onAuthExpired);
    return () => window.removeEventListener("stas:auth-expired", onAuthExpired);
  }, [clearLocalSession]);

  return (
    <AuthContext.Provider value={{ user, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
