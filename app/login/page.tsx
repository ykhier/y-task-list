"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/ui/PasswordInput";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: signInData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      const msg = authError.message.toLowerCase();
      const code = (authError as { code?: string }).code ?? "";
      const isUnconfirmed =
        msg.includes("email not confirmed") ||
        msg.includes("email_not_confirmed") ||
        code === "email_not_confirmed";

      setError(
        isUnconfirmed
          ? "יש לאמת את האימייל לפני ההתחברות. בדוק את תיבת הדואר שלך."
          : "אימייל או סיסמה שגויים"
      );
      setLoading(false);
      return;
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
    const accessToken = signInData.session?.access_token;

    if (email.toLowerCase() === adminEmail.toLowerCase() && accessToken) {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "שגיאה בשליחת קוד אימות");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      sessionStorage.setItem("otp_token", accessToken);
      sessionStorage.setItem("otp_user_id", signInData.user!.id);
      router.push("/verify-otp");
      return;
    }

    router.push("/");
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
              <CalendarDays className="h-6 w-6 text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">WeekFlow</h1>
              <p className="mt-1 text-sm text-slate-500">
                ניהול לו״ז חכם לסטודנטים ולשגרה עמוסה
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                סיסמה
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
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
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  מתחבר...
                </span>
              ) : (
                "התחבר"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            אין לך חשבון?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-500 hover:text-blue-600"
            >
              הירשם בחינם
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          WeekFlow © 2026 · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
