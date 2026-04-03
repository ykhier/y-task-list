"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/Spinner";

export default function VerifyOtpPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startTimer = (seconds = 60) => {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (timeLeft === 0) {
      router.push("/login");
    }
  }, [timeLeft, router]);

  // Start countdown immediately — OTP was already sent by the login page
  useEffect(() => {
    startTimer(60);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("otp_token");
  };

  const handleResend = async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setResending(true);
    setError(null);

    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "שגיאה בשליחת הקוד");
    } else {
      startTimer(60);
    }
    setResending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      const userId = sessionStorage.getItem("otp_user_id");
      if (userId) localStorage.setItem("otp_verified", userId);
      sessionStorage.removeItem("otp_token");
      sessionStorage.removeItem("otp_user_id");
      if (timerRef.current) clearInterval(timerRef.current);
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data.error ?? "קוד שגוי");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">
                אימות דו-שלבי
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                הקוד נשלח לאימייל שלך
              </p>
              <div
                className={`text-2xl font-bold mt-2 tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-blue-500"}`}
              >
                {fmt(timeLeft)}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="code"
                className="text-sm font-medium text-slate-700"
              >
                קוד אימות (6 ספרות)
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                className="h-14 text-center text-2xl tracking-[0.4em] font-bold"
                dir="ltr"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 mt-1 text-sm font-semibold"
              disabled={loading || code.length !== 6 || timeLeft === 0}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  מאמת...
                </span>
              ) : (
                "אמת כניסה"
              )}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || timeLeft > 0}
              className="text-sm text-blue-500 hover:text-blue-600 text-center disabled:opacity-40 transition-opacity"
            >
              {resending ? "שולח..." : "שלח קוד מחדש"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          WeekFlow © 2026 · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
