"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/ui/PasswordInput";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordMatch =
    password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordMatch) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      setError(
        msg.includes("rate limit") || msg.includes("email rate")
          ? "נסית להירשם יותר מדי פעמים. המתן דקה ונסה שוב"
          : msg.includes("already registered") ||
              msg.includes("already been registered") ||
              msg.includes("user already")
            ? "כתובת האימייל כבר רשומה במערכת"
            : "אירעה שגיאה בהרשמה. נסה שוב",
      );
      setLoading(false);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // Email confirmation required — show success screen instead of redirecting
        setSuccess(true);
      } else {
        router.push("/");
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-green-500 flex items-center justify-center shadow-md shadow-green-200">
              <Check className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">נרשמת בהצלחה!</h1>
            <p className="text-sm text-slate-500">
              החשבון נוצר בהצלחה עבור <strong>{email}</strong>. כעת תוכל להתחבר.
            </p>
            <Button
              className="w-full h-10 mt-2 text-sm font-semibold"
              onClick={() => router.push("/login")}
            >
              עבור להתחברות
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">
                צור חשבון חדש
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                הצטרף ל-WeekFlow בחינם
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                שם מלא
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="שם מלא"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                סיסמא
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="confirm"
                className="text-sm font-medium text-slate-700"
              >
                אימות סיסמא
              </Label>
              <PasswordInput
                id="confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`h-10 ${
                  confirmPassword && !passwordMatch
                    ? "border-red-300 focus-visible:ring-red-400"
                    : passwordMatch
                      ? "border-green-300 focus-visible:ring-green-400"
                      : ""
                }`}
              />
              {confirmPassword && !passwordMatch && (
                <p className="text-xs text-red-500">הסיסמאות לא תואמות</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 mt-1 text-sm font-semibold"
              disabled={loading || (!!confirmPassword && !passwordMatch)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  נרשם...
                </span>
              ) : (
                "צור חשבון"
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            כבר יש לך חשבון?{" "}
            <Link
              href="/login"
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              התחבר
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          WeekFlow © 2026 · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
