"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Menu, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const userDropRef = useRef<HTMLDivElement>(null);
  const { signOut } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const user = useSupabaseUser();
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email ?? "";
  const router = useRouter();

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

  return (
    <>
      <nav className="flex items-center h-14 border-b border-slate-100 bg-white px-3 sm:px-4 gap-1 flex-shrink-0">
        <div className="flex items-center gap-2 me-3 sm:me-6 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm font-semibold text-slate-800 tracking-tight">
            WeekFlow
          </span>
        </div>

        <NavbarDesktopTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          isAdmin={isAdmin}
          onAdminClick={() => router.push("/admin")}
        />
        <NavbarMobileTabBadge activeTab={activeTab} />

        {/* Desktop user dropdown */}
        <div
          className="hidden sm:block relative flex-shrink-0"
          ref={userDropRef}
        >
          <button
            onClick={() => setUserDropOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-colors duration-150 cursor-pointer"
          >
            {fullName && (
              <span className="text-sm text-slate-700 font-medium max-w-[120px] truncate">
                {fullName}
              </span>
            )}
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white leading-none">
                {(fullName ?? email).charAt(0).toUpperCase()}
              </span>
            </div>
          </button>

          {userDropOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {fullName && (
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {fullName}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 truncate">{email}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
                  <span className="text-sm font-bold text-white leading-none">
                    {(fullName ?? email).charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div className="p-2 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setUserDropOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150 cursor-pointer font-medium"
                >
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
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
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer font-medium group"
                >
                  <div className="h-7 w-7 rounded-lg bg-slate-100 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors duration-150">
                    <LogOut className="h-3.5 w-3.5 text-slate-500 group-hover:text-red-500 transition-colors duration-150" />
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
          className="sm:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-150 cursor-pointer flex-shrink-0"
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
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
