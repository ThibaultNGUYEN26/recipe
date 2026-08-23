import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, setCsrfToken } from "../lib/apiFetch";

const API = import.meta.env.VITE_API_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async ({ clearOnError = false } = {}) => {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        credentials: "include",
      });
      if (res.status === 401) {
        if (clearOnError) {
          setCsrfToken(null);
          setUser(null);
        }
        return null;
      }
      if (!res.ok) {
        if (clearOnError) {
          setCsrfToken(null);
          setUser(null);
        }
        return null;
      }
      const data = await res.json();
      setCsrfToken(data.csrfToken ?? null);
      setUser(data.user);
      return data.user;
    } catch {
      if (clearOnError) {
        setCsrfToken(null);
        setUser(null);
      }
      return null;
    }
  }, []);

  const acceptNewSession = useCallback(async (data) => {
    setCsrfToken(data.csrfToken ?? null);
    const restoredUser = await refreshUser({ clearOnError: true });
    if (!restoredUser) {
      throw new Error("Sign-in succeeded, but this browser blocked the session cookie. Allow cookies for Savor and try again.");
    }
    return restoredUser;
  }, [refreshUser]);

  useEffect(() => {
    // Remove JWTs saved by versions prior to cookie-only authentication.
    localStorage.removeItem("savor_token");
    refreshUser({ clearOnError: true })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const clearInvalidSession = () => {
      setCsrfToken(null);
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", clearInvalidSession);
    return () => window.removeEventListener("auth:unauthorized", clearInvalidSession);
  }, []);

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
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return acceptNewSession(data);
  }

  async function register(email, password, name, username) {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name, username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return acceptNewSession(data);
  }

  async function loginWithGoogle(credential) {
    const res = await fetch(`${API}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Google sign-in failed");
    return acceptNewSession(data);
  }

  async function logout() {
    const response = await apiFetch("/api/auth/logout", {
      method: "POST",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not sign out. Please try again.");
    }
    setCsrfToken(null);
    setUser(null);
  }

  function updateUser(updates) {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
