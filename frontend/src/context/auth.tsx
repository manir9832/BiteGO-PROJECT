import React, { createContext, useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { api, clearTokens, getAccess, getRefresh, saveTokens, setOnLogout } from "@/src/api";

export type User = {
  id: string;
  phone?: string;
  name?: string | null;
  email?: string | null;
  role: string;
  profile_complete?: boolean;
};

type AuthCtx = {
  user: User | null;
  booting: boolean;
  loginWithTokens: (a: string, r: string, u: User) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const logout = async () => {
    const r = await getRefresh();
    if (r) { try { await api.post("/auth/logout", { refresh_token: r }, false); } catch {} }
    await clearTokens();
    setUser(null);
    router.replace("/(auth)/login");
  };

  useEffect(() => {
    setOnLogout(() => { setUser(null); router.replace("/(auth)/login"); });
    (async () => {
      const token = await getAccess();
      if (token) {
        try {
          const { user } = await api.get<{ user: User }>("/auth/me");
          setUser(user);
        } catch { await clearTokens(); }
      }
      setBooting(false);
    })();
  }, []);

  const loginWithTokens = async (a: string, r: string, u: User) => {
    await saveTokens(a, r);
    setUser(u);
  };

  const refreshUser = async () => {
    try { const { user } = await api.get<{ user: User }>("/auth/me"); setUser(user); } catch {}
  };

  return (
    <Ctx.Provider value={{ user, booting, loginWithTokens, refreshUser, logout }}>
      {children}
    </Ctx.Provider>
  );
}
