-- ============================================================
-- WeekFlow — Admin Schema Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- OTP codes table (for admin 2FA)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — accessed only via service role key

-- Set your first admin (replace with your user's UUID from auth.users)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-uuid-here';
