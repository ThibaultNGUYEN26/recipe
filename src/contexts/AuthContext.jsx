import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async ({ clearOnError = false } = {}) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, { credentials: "include" });
      if (res.status === 401) {
        if (clearOnError) setUser(null);
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser({ clearOnError: true })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const authenticatedUserId = user?.id;
  const avatarPending = Boolean(user?.avatarPending);

  useEffect(() => {
    if (!authenticatedUserId) return undefined;
    const refresh = () => refreshUser().catch(() => {});
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = avatarPending ? window.setInterval(refresh, 5000) : undefined;
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) window.clearInterval(timer);
    };
  }, [authenticatedUserId, avatarPending, refreshUser]);

  async function login(identifier, password) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    return data.user;
  }

  async function register(email, password, name, username) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name, username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }

  function updateUser(updates) {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
