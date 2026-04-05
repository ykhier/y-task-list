"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const AUTH_PATHS = ["/login", "/signup", "/verify-otp"];
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

const UserContext = createContext<User | null>(null);
const AdminContext = createContext<boolean>(false);
const SignOutContext = createContext<() => Promise<void>>(async () => {});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const otpSendingRef = useRef(false);
  const initialResolvedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    return data?.is_admin ?? false;
  };

  const resolveSession = async (options?: { keepVisibleContent?: boolean }) => {
    if (!options?.keepVisibleContent) {
      setLoading(true);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const nextUser = session?.user ?? null;
    setUser(nextUser);

    if (nextUser) {
      const admin = await fetchIsAdmin(nextUser.id);
      setIsAdmin(admin);
    } else {
      setIsAdmin(false);
    }

    initialResolvedRef.current = true;
    setLoading(false);
  };

  useEffect(() => {
    void resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialResolvedRef.current) return;

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        const admin = await fetchIsAdmin(nextUser.id);
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    const refreshSessionOnResume = () => {
      if (document.visibilityState === "visible") {
        void resolveSession({ keepVisibleContent: true });
      }
    };

    window.addEventListener("focus", refreshSessionOnResume);
    window.addEventListener("pageshow", refreshSessionOnResume);
    document.addEventListener("visibilitychange", refreshSessionOnResume);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshSessionOnResume);
      window.removeEventListener("pageshow", refreshSessionOnResume);
      document.removeEventListener("visibilitychange", refreshSessionOnResume);
    };
  }, [supabase]);

  useEffect(() => {
    if (loading) return;

    if (!user && !AUTH_PATHS.includes(pathname)) {
      router.push("/login");
      return;
    }

    if (user && user.email === ADMIN_EMAIL && !AUTH_PATHS.includes(pathname)) {
      const otpVerified =
        typeof window !== "undefined" &&
        localStorage.getItem("otp_verified") === user.id;

      if (!otpVerified && !otpSendingRef.current) {
        otpSendingRef.current = true;
        void supabase.auth.signOut().then(() => {
          window.location.href = "/login";
        });
        return;
      }
    }

    if (user && !isAdmin && pathname.startsWith("/admin")) {
      router.push("/");
    }
  }, [loading, user, isAdmin, pathname, router, supabase]);

  const signOut = async () => {
    otpSendingRef.current = true;
    if (typeof window !== "undefined") {
      localStorage.removeItem("otp_verified");
    }
    void supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading && !initialResolvedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">{"\u05de\u05ea\u05d7\u05d1\u05e8..."}</p>
        </div>
      </div>
    );
  }

  return (
    <SignOutContext.Provider value={signOut}>
      <AdminContext.Provider value={isAdmin}>
        <UserContext.Provider value={user}>{children}</UserContext.Provider>
      </AdminContext.Provider>
    </SignOutContext.Provider>
  );
}

export const useSupabaseUser = () => useContext(UserContext);
export const useIsAdmin = () => useContext(AdminContext);
export const useSupabaseAuth = () => ({
  user: useContext(UserContext),
  signOut: useContext(SignOutContext),
});
