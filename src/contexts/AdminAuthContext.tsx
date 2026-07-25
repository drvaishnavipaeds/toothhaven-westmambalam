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
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminByPhone = async (phone: string) => {
    const { data, error } = await supabase.functions.invoke("check-admin", {
      body: { phone },
    });
    if (error) return false;
    return !!data?.authorized;
  };

  const checkAdminByEmail = async (email: string) => {
    const { data, error } = await supabase.functions.invoke("check-admin", {
      body: { email },
    });
    if (error) return false;
    return !!data?.authorized;
  };

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const admin = await checkAdmin(currentUser);
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const admin = await checkAdmin(currentUser);
        setIsAdmin(admin);
      }
      setIsLoading(false);
    });

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
    const admin = await checkAdminByEmail(email);
    if (!admin) return { error: "This email is not authorized as admin." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, isLoading, signInWithPhone, verifyOtp, signInWithEmail, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};
