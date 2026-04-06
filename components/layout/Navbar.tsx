"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Menu, LogOut, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import NavbarDesktopTabs from "./navbar/NavbarDesktopTabs";
import NavbarMobileDrawer from "./navbar/NavbarMobileDrawer";
import NavbarMobileTabBadge from "./navbar/NavbarMobileTabBadge";
import SettingsModal from "./SettingsModal";
import {
  useSupabaseAuth,
  useIsAdmin,
  useSupabaseUser,
} from "@/components/providers/SupabaseProvider";
import type { TabView } from "@/types";

interface NavbarProps {
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminNavigationPending, setAdminNavigationPending] = useState(false);
  const [, startAdminNavigation] = useTransition();
  const userDropRef = useRef<HTMLDivElement>(null);
  const { signOut } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const user = useSupabaseUser();
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email ?? "";
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAdmin) return;
    router.prefetch("/admin");
  }, [isAdmin, router]);

  useEffect(() => {
    if (pathname === "/admin") {
      setAdminNavigationPending(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!userDropOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        userDropRef.current &&
        !userDropRef.current.contains(e.target as Node)
      ) {
        setUserDropOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserDropOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [userDropOpen]);

  const handleTabChange = (tab: TabView) => {
    onTabChange(tab);
    setMenuOpen(false);
  };

  const handleAdminNavigation = () => {
    if (adminNavigationPending || pathname === "/admin") return;
    setAdminNavigationPending(true);
    startAdminNavigation(() => {
      router.push("/admin");
    });
  };

  return (
    <>
      <nav className="flex h-14 flex-shrink-0 items-center gap-1 border-b border-slate-100 bg-white px-3 sm:px-4">
        <div className="me-3 flex flex-shrink-0 items-center gap-2 sm:me-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight text-slate-800 sm:block">
            WeekFlow
          </span>
        </div>

        <NavbarDesktopTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          isAdmin={isAdmin}
          adminNavigationPending={adminNavigationPending}
          onAdminClick={handleAdminNavigation}
        />
        <NavbarMobileTabBadge activeTab={activeTab} />

        <div
          className="relative hidden flex-shrink-0 sm:block"
          ref={userDropRef}
        >
          <button
            onClick={() => setUserDropOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 transition-colors duration-150 hover:border-slate-200 hover:bg-slate-100"
          >
            {fullName && (
              <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                {fullName}
              </span>
            )}
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
              <span className="text-[10px] font-bold leading-none text-white">
                {(fullName ?? email).charAt(0).toUpperCase()}
              </span>
            </div>
          </button>

          {userDropOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                <div className="min-w-0 flex-1">
                  {fullName && (
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {fullName}
                    </p>
                  )}
                  <p className="truncate text-xs text-slate-400">{email}</p>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
                  <span className="text-sm font-bold leading-none text-white">
                    {(fullName ?? email).charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 p-2">
                <button
                  onClick={() => {
                    setUserDropOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-medium text-slate-700">הגדרות</p>
                  </div>
                </button>

                <div className="mx-2 my-1 h-px bg-slate-100" />

                <button
                  onClick={() => {
                    setUserDropOpen(false);
                    signOut();
                  }}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors duration-150 group-hover:bg-red-100">
                    <LogOut className="h-3.5 w-3.5 text-slate-500 transition-colors duration-150 group-hover:text-red-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-medium">התנתק</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-10 min-h-[44px] w-10 min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-slate-100 sm:hidden"
          aria-label="פתח תפריט"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      <NavbarMobileDrawer
        activeTab={activeTab}
        menuOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onTabChange={handleTabChange}
        onSignOut={signOut}
        onSettingsOpen={() => {
          setMenuOpen(false);
          setSettingsOpen(true);
        }}
        isAdmin={isAdmin}
        fullName={fullName}
        adminNavigationPending={adminNavigationPending}
        onAdminClick={handleAdminNavigation}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
