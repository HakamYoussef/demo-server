"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import { apiFetch } from "../lib/api";
const AuthContext = createContext();
export const useAuthContext = () => useContext(AuthContext);
export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const toast = useToast();
  const clearSession = useCallback(() => {
    setUserId(null); setExpiresAt(null); setIsAdmin(false);
    try { for (const key of ["authToken", "authId", "userInfo"]) localStorage.removeItem(key); } catch {}
  }, []);
  const login = (id, expiry, admin = false) => {
    setUserId(id); setExpiresAt(expiry); setIsAdmin(admin === true);
  };
  useEffect(() => {
    let active = true;
    clearSession();
    window.addEventListener("session-expired", clearSession);
    apiFetch("/api/users/me").then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (active) { setUserId(data.user._id); setExpiresAt(data.expiresAt); setIsAdmin(data.user.isAdmin === true); }
    }).catch(() => {}).finally(() => { if (active) setIsAuthLoading(false); });
    return () => { active = false; window.removeEventListener("session-expired", clearSession); };
  }, [clearSession]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(clearSession, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, clearSession]);
  const logout = async () => {
    clearSession();
    try {
      const response = await apiFetch("/api/users/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error("Logout failed");
      toast({ title: "You have successfully logged out", status: "success", duration: 5000, isClosable: true });
    } catch {
      toast({ title: "Session closed locally", description: "Server logout could not be confirmed. The session expires within 15 minutes.", status: "warning", duration: 5000, isClosable: true });
    }
  };
  // token is a readiness flag for existing views; no bearer token is exposed to JavaScript.
  return <AuthContext.Provider value={{ userId, token: userId ? "session" : null, isAdmin, isAuthLoading, login, logout }}>{children}</AuthContext.Provider>;
};
