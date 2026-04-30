import React, { createContext, useContext, useState, ReactNode } from "react";
import { apiPost } from "../lib/api";

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
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("stas_user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

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

  React.useEffect(() => {
    const onAuthExpired = () => clearLocalSession();
    window.addEventListener("stas:auth-expired", onAuthExpired);
    return () => window.removeEventListener("stas:auth-expired", onAuthExpired);
  }, [clearLocalSession]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
