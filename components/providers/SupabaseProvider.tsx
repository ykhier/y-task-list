"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const AUTH_PATHS = ["/login", "/signup", "/verify-otp"];
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
const ADMIN_CACHE_PREFIX = "weekflow_admin_status:";
const SIGN_OUT_TIMEOUT_MS = 4000;

const UserContext = createContext<User | null>(null);
const AdminContext = createContext<boolean>(false);
const SignOutContext = createContext<() => Promise<void>>(async () => {});

function getAdminCacheKey(userId: string) {
  return `${ADMIN_CACHE_PREFIX}${userId}`;
}

function readCachedAdminStatus(userId: string): boolean | null {
  if (typeof window === "undefined") return null;

  const value = window.sessionStorage.getItem(getAdminCacheKey(userId));
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function writeCachedAdminStatus(userId: string, isAdmin: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(getAdminCacheKey(userId), String(isAdmin));
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const otpSendingRef = useRef(false);
  const initialResolvedRef = useRef(false);
  const sessionRequestIdRef = useRef(0);
  const adminRequestIdRef = useRef(0);
  const lastAdminUserIdRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const applyAdminStatus = (userId: string, nextIsAdmin: boolean) => {
    lastAdminUserIdRef.current = userId;
    setIsAdmin(nextIsAdmin);
    writeCachedAdminStatus(userId, nextIsAdmin);
  };

  const clearAdminStatus = () => {
    lastAdminUserIdRef.current = null;
    setIsAdmin(false);
  };

  const clearClientAuthState = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("otp_verified");
      sessionStorage.removeItem("otp_token");
      sessionStorage.removeItem("otp_user_id");
      sessionStorage.removeItem("otp_initial_send_pending");

      const keysToRemove: string[] = [];
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const key = sessionStorage.key(index);
        if (key?.startsWith(ADMIN_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }

    sessionRequestIdRef.current += 1;
    adminRequestIdRef.current += 1;
    otpSendingRef.current = true;
    initialResolvedRef.current = true;
    setUser(null);
    clearAdminStatus();
    setLoading(false);
  };

  const fetchIsAdmin = async (
    userId: string,
    options?: { allowCachedValue?: boolean }
  ): Promise<boolean> => {
    const requestId = ++adminRequestIdRef.current;
    const cachedValue = options?.allowCachedValue
      ? readCachedAdminStatus(userId)
      : null;

    if (cachedValue !== null) {
      applyAdminStatus(userId, cachedValue);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (requestId !== adminRequestIdRef.current) {
      return cachedValue ?? false;
    }

    if (error) {
      if (cachedValue !== null) {
        return cachedValue;
      }

      if (lastAdminUserIdRef.current !== userId) {
        setIsAdmin(false);
      }

      return false;
    }

    const nextIsAdmin = data?.is_admin ?? false;
    applyAdminStatus(userId, nextIsAdmin);
    return nextIsAdmin;
  };

  const resolveSession = async (options?: { keepVisibleContent?: boolean }) => {
    const requestId = ++sessionRequestIdRef.current;

    if (!options?.keepVisibleContent) {
      setLoading(true);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (requestId !== sessionRequestIdRef.current) {
      return;
    }

    const nextUser = session?.user ?? null;
    setUser(nextUser);

    if (nextUser) {
      const cachedValue = readCachedAdminStatus(nextUser.id);

      if (cachedValue !== null) {
        applyAdminStatus(nextUser.id, cachedValue);
      }

      await fetchIsAdmin(nextUser.id, { allowCachedValue: true });
    } else {
      clearAdminStatus();
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
        const cachedValue = readCachedAdminStatus(nextUser.id);

        if (cachedValue !== null) {
          applyAdminStatus(nextUser.id, cachedValue);
        }

        await fetchIsAdmin(nextUser.id, { allowCachedValue: true });
      } else {
        clearAdminStatus();
      }

      setLoading(false);
    });

    const refreshSessionOnResume = () => {
      if (document.visibilityState === "visible") {
        void resolveSession({ keepVisibleContent: true });
      }
    };

    const refreshSessionWhenOnline = () => {
      void resolveSession({ keepVisibleContent: true });
    };

    window.addEventListener("focus", refreshSessionOnResume);
    window.addEventListener("pageshow", refreshSessionOnResume);
    window.addEventListener("online", refreshSessionWhenOnline);
    document.addEventListener("visibilitychange", refreshSessionOnResume);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshSessionOnResume);
      window.removeEventListener("pageshow", refreshSessionOnResume);
      window.removeEventListener("online", refreshSessionWhenOnline);
      document.removeEventListener("visibilitychange", refreshSessionOnResume);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        clearClientAuthState();
        void supabase.auth.signOut({ scope: "local" }).finally(() => {
          window.location.replace("/login");
        });
        return;
      }
    }

    if (user && !isAdmin && pathname.startsWith("/admin")) {
      router.push("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin, pathname, router, supabase]);

  const signOut = async () => {
    clearClientAuthState();
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((resolve) => window.setTimeout(resolve, SIGN_OUT_TIMEOUT_MS)),
      ]);
    } finally {
      window.location.replace("/login");
    }
  };

  if (loading && !initialResolvedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">מתחבר...</p>
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
