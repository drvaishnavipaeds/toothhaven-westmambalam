import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminAuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const CACHE_PREFIX = "th_admin_check:";

const readCache = (key: string): boolean | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    return raw === null ? null : raw === "1";
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: boolean) => {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // De-duplicates concurrent/repeat admin checks for the same identifier.
  const inflight = React.useRef<Map<string, Promise<boolean>>>(new Map());

  const checkIdentifier = (payload: { phone?: string; email?: string }) => {
    const key = payload.phone ? `p:${payload.phone}` : `e:${payload.email}`;
    const cached = readCache(key);
    if (cached !== null) return Promise.resolve(cached);
    const existing = inflight.current.get(key);
    if (existing) return existing;
    const req = supabase.functions
      .invoke("check-admin", { body: payload })
      .then(({ data, error }) => {
        const ok = !error && !!data?.authorized;
        // Only cache positive results: a transient failure must not lock the user out.
        if (!error && ok) writeCache(key, true);
        return ok;
      })
      .catch(() => false)
      .finally(() => inflight.current.delete(key));
    inflight.current.set(key, req);
    return req;
  };

  const checkAdminByPhone = (phone: string) => checkIdentifier({ phone });
  const checkAdminByEmail = (email: string) => checkIdentifier({ email });

  const checkAdmin = async (currentUser: User) => {
    const metaPhone = (currentUser.user_metadata as any)?.admin_phone as string | undefined;
    if (metaPhone) {
      return await checkAdminByPhone(metaPhone);
    }
    if (currentUser.phone) {
      return await checkAdminByPhone(currentUser.phone);
    }
    if (currentUser.email && !currentUser.email.endsWith("@toothhaven.internal")) {
      return await checkAdminByEmail(currentUser.email);
    }
    return false;
  };

  useEffect(() => {
    let lastUserId: string | null | undefined;

    const applySession = async (session: { user: User } | null) => {
      const currentUser = session?.user ?? null;
      // Skip redundant re-checks for the same user (initial getSession + auth events).
      if (currentUser?.id && currentUser.id === lastUserId) {
        setIsLoading(false);
        return;
      }
      lastUserId = currentUser?.id ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setIsAdmin(await checkAdmin(currentUser));
      setIsLoading(false);

    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: calling other Supabase APIs synchronously inside this callback
      // deadlocks the auth client and the admin check never resolves.
      setTimeout(() => { void applySession(session as any); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session as any));

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = async (phone: string) => {
    const { data, error } = await supabase.functions.invoke("admin-phone-otp", {
      body: { action: "send", phone },
    });
    if (error) {
      const msg = (data as any)?.error || error.message || "Failed to send OTP";
      return { error: msg };
    }
    if ((data as any)?.error) return { error: (data as any).error };
    return { error: null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { data, error } = await supabase.functions.invoke("admin-phone-otp", {
      body: { action: "verify", phone, code: token },
    });
    if (error) {
      const msg = (data as any)?.error || error.message || "Verification failed";
      return { error: msg };
    }
    const payload = data as { ok?: boolean; token_hash?: string; email?: string; error?: string };
    if (!payload?.ok || !payload.token_hash) {
      return { error: payload?.error || "Verification failed" };
    }
    const { error: sessErr } = await supabase.auth.verifyOtp({
      token_hash: payload.token_hash,
      type: "magiclink",
    });
    if (sessErr) return { error: sessErr.message };
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    // Run the authorization check in parallel with the password sign-in
    // instead of serially, so login isn't gated on an edge-function round trip.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const admin = await checkAdminByEmail(email);
    if (!admin) {
      await supabase.auth.signOut();
      return { error: "This email is not authorized as admin." };
    }
    setIsAdmin(true);
    setIsLoading(false);
    return { error: null };
  };


  const sendEmailOtp = async (email: string) => {
    const admin = await checkAdminByEmail(email);
    if (!admin) return { error: "This email is not authorized as admin." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { error: error.message };
    return { error: null };
  };

  const sendPasswordReset = async (email: string) => {
    const admin = await checkAdminByEmail(email);
    if (!admin) return { error: "This email is not authorized as admin." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, isLoading, signInWithPhone, verifyOtp, signInWithEmail, sendEmailOtp, verifyEmailOtp, sendPasswordReset, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};
