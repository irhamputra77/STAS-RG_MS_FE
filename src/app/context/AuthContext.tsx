import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "mahasiswa" | "operator" | "dosen";

export interface AuthUser {
  name: string;
  id: string;
  role: UserRole;
  initials: string;
  prodi?: string;
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
  const logout = () => {
    setUser(null);
    localStorage.removeItem("stas_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
