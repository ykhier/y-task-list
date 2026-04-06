"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function getTomorrowDayName() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return DAYS_HE[tomorrow.getDay()];
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SaveState = "idle" | "saving" | "saved";

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Fetch eagerly on mount so data is ready before the user opens the modal
  useEffect(() => {
    fetch("/api/settings/notification")
      .then((r) => r.json())
      .then((d) => setEnabled(d.digest_enabled ?? false))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaveState("saving");
    await fetch("/api/settings/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest_enabled: enabled }),
    });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-blue-600" />
            </div>
            הגדרות
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-1">
            {/* Daily digest toggle */}
            <div
              className={cn(
                "rounded-2xl border transition-colors duration-200",
                enabled
                  ? "border-blue-200 bg-blue-50/50"
                  : "border-slate-100 bg-slate-50/50",
              )}
            >
              <button
                onClick={() => setEnabled((v) => !v)}
                className="w-full flex items-center gap-4 p-4 cursor-pointer text-right"
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200",
                    enabled ? "bg-blue-100" : "bg-slate-100",
                  )}
                >
                  {enabled ? (
                    <Bell
                      className="h-4.5 w-4.5 text-blue-600"
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <BellOff
                      className="h-4.5 w-4.5 text-slate-400"
                      style={{ width: 18, height: 18 }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      enabled ? "text-blue-900" : "text-slate-700",
                    )}
                  >
                    לו״ז יומי למייל
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      enabled ? "text-blue-600/70" : "text-slate-400",
                    )}
                  >
                    {enabled
                      ? "פעיל - תקבל סיכום כל יום בשעה 22:00"
                      : "כבוי — לחץ להפעלה"}
                  </p>
                </div>
                {/* Toggle pill */}
                <div
                  className={cn(
                    "flex-shrink-0 relative w-11 h-6 rounded-full transition-colors duration-200",
                    enabled ? "bg-blue-500" : "bg-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200",
                      enabled ? "right-0.5" : "left-0.5",
                    )}
                  />
                </div>
              </button>
            </div>

            {/* Email preview pill */}
            {enabled && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  המייל יישלח בשעה 22:00 (שעון ישראל)
                </p>
                <p className="text-sm text-slate-700 font-medium">
                  הלו״ז שלך למחר - יום {getTomorrowDayName()} 📅
                </p>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                saveState === "saved"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200",
                saveState === "saving" && "opacity-70 cursor-not-allowed",
              )}
            >
              {saveState === "saving" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {saveState === "saved" && <CheckCircle2 className="h-4 w-4" />}
              {saveState === "idle" && "שמור הגדרות"}
              {saveState === "saving" && "שומר..."}
              {saveState === "saved" && "נשמר!"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
