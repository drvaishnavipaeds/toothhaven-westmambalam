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
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminByPhone = async (phone: string) => {
    const { data } = await supabase.rpc("is_admin_identifier", { _phone: phone, _email: null });
    return !!data;
  };

  const checkAdminByEmail = async (email: string) => {
    const { data } = await supabase.rpc("is_admin_identifier", { _phone: null, _email: email });
    return !!data;
  };

  const checkAdmin = async (currentUser: User) => {
    if (currentUser.phone) {
      return await checkAdminByPhone(currentUser.phone);
    }
    if (currentUser.email) {
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
    const admin = await checkAdminByPhone(phone);
    if (!admin) return { error: "This phone number is not authorized as admin." };
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return { error: error.message };
    return { error: null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) return { error: error.message };
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
