import { cn } from "@/lib/utils";
import type { TabView } from "@/types";
import { NAVBAR_TABS } from "./navbar-tabs";

interface NavbarMobileTabBadgeProps {
  activeTab: TabView;
}

export default function NavbarMobileTabBadge({
  activeTab,
}: NavbarMobileTabBadgeProps) {
  const activeTabConfig = NAVBAR_TABS.find((tab) => tab.value === activeTab);

  if (!activeTabConfig) return null;

  return (
    <div className="flex sm:hidden items-center flex-1 min-w-0 gap-2">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
          activeTabConfig.iconBg,
        )}
      >
        <activeTabConfig.Icon
          className={cn("h-3.5 w-3.5 flex-shrink-0", activeTabConfig.iconColor)}
        />
        <span
          className={cn("text-xs font-semibold", activeTabConfig.iconColor)}
        >
          {activeTabConfig.label}
        </span>
      </div>
    </div>
  );
}
