"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/Spinner";
import CountdownTimer, {
  type CountdownTimerHandle,
} from "@/components/ui/CountdownTimer";

export default function VerifyOtpPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sendingInitialCode, setSendingInitialCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const timerRef = useRef<CountdownTimerHandle>(null);
  const hasTriggeredInitialSendRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const router = useRouter();

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("otp_token");
  };

  const sendCode = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return false;
      }

      if (!options?.silent) {
        setResending(true);
      }

      setError(null);

      try {
        const res = await fetch("/api/send-otp", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "שגיאה בשליחת הקוד");
          return false;
        }

        timerRef.current?.reset(5);
        return true;
      } finally {
        if (!options?.silent) {
          setResending(false);
        }
      }
    },
    [router]
  );

  const verifyCode = useCallback(
    async (nextCode: string) => {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: nextCode }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "קוד שגוי");
          return false;
        }

        const userId = sessionStorage.getItem("otp_user_id");
        if (userId) {
          localStorage.setItem("otp_verified", userId);
        }

        sessionStorage.removeItem("otp_token");
        sessionStorage.removeItem("otp_user_id");
        sessionStorage.removeItem("otp_initial_send_pending");

        router.replace("/");
        router.refresh();
        return true;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  useEffect(() => {
    if (hasTriggeredInitialSendRef.current) return;
    hasTriggeredInitialSendRef.current = true;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const shouldSendInitially =
      sessionStorage.getItem("otp_initial_send_pending") === "true";

    if (!shouldSendInitially) {
      setSendingInitialCode(false);
      return;
    }

    void sendCode({ silent: true }).finally(() => {
      sessionStorage.removeItem("otp_initial_send_pending");
      setSendingInitialCode(false);
    });
  }, [router, sendCode]);

  useEffect(() => {
    if (code.length !== 6 || sendingInitialCode || loading || timeLeft === 0) {
      if (code.length < 6) {
        autoSubmitAttemptedRef.current = false;
      }
      return;
    }

    if (autoSubmitAttemptedRef.current) return;
    autoSubmitAttemptedRef.current = true;
    void verifyCode(code);
  }, [code, loading, sendingInitialCode, timeLeft, verifyCode]);

  const handleResend = async () => {
    const sent = await sendCode();
    if (sent) {
      setError(null);
      autoSubmitAttemptedRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyCode(code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-md shadow-blue-200">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">
                אימות דו-שלבי
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {sendingInitialCode
                  ? "שולחים עכשיו את קוד האימות למייל שלך"
                  : "הקוד נשלח לאימייל שלך"}
              </p>
              <div className="mt-2">
                <CountdownTimer
                  ref={timerRef}
                  minutes={5}
                  onTick={setTimeLeft}
                  onExpire={() => router.push("/login")}
                />
              </div>
            </div>
          </div>

          {sendingInitialCode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600">
                <Spinner className="h-4 w-4" />
              </div>
              <div className="text-right">
                <p className="font-medium">מכינים את קוד הכניסה</p>
                <p className="text-xs text-blue-600/80">
                  בדרך כלל זה מגיע תוך כמה שניות
                </p>
              </div>
            </div>
          )}

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
                className="h-14 text-center text-2xl font-bold tracking-[0.4em]"
                dir="ltr"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="mt-1 h-10 w-full text-sm font-semibold"
              disabled={
                loading || sendingInitialCode || code.length !== 6 || timeLeft === 0
              }
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
              disabled={resending || sendingInitialCode}
              className="text-center text-sm text-blue-500 transition-opacity hover:text-blue-600 disabled:opacity-40"
            >
              {resending ? "שולח..." : "שלח קוד מחדש"}
            </button>

            <div className="border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/login")}
              >
                להתחברות
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          WeekFlow © 2026 · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
