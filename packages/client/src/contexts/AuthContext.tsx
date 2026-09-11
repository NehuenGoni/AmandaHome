import type { User } from "@amanda/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAccessToken, setAuthFailureHandler } from "@/lib/apiClient";
import * as authApi from "@/lib/authApi";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  acceptInvite: (input: authApi.AcceptInviteInput) => Promise<void>;
  /** Actualiza el usuario en memoria tras una respuesta del backend (editar perfil, direcciones). */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken(null);
      setUser(null);
    });

    let cancelled = false;

    // Al montar, intentamos recuperar la sesión con la cookie de refresh
    // httpOnly; si no hay cookie o expiró, simplemente quedamos deslogueados.
    (async () => {
      try {
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);
        const { user: me } = await authApi.getMe();
        if (!cancelled) setUser(me);
      } catch {
        setAccessToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (input: authApi.RegisterInput) => {
    const data = await authApi.register(input);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const acceptInvite = useCallback(async (input: authApi.AcceptInviteInput) => {
    const data = await authApi.acceptInvite(input);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, logout, acceptInvite, setUser }),
    [user, isLoading, login, register, logout, acceptInvite],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
