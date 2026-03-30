-- ============================================================
-- WeekFlow — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── MIGRATION: rename events → sessions (run if upgrading) ──
-- ALTER TABLE public.events RENAME TO sessions;

-- ── TASKS ────────────────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  date         date not null,
  time         time,
  end_time     time,
  is_recurring boolean not null default false,
  is_completed boolean not null default false,
  created_at   timestamptz not null default now()
);

-- SESSIONS (lectures + tutorials) ──────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  source       text not null check (source in ('manual', 'task')) default 'manual',
  task_id      uuid references public.tasks(id) on delete cascade,
  color        text default 'blue',
  is_recurring boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── TUTORIALS (linked to sessions) ──────────────────────────
create table if not exists public.tutorials (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete cascade,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  color        text default 'orange',
  is_recurring boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists tasks_user_date           on public.tasks(user_id, date);
create index if not exists tasks_user_recurring      on public.tasks(user_id, is_recurring) where is_recurring = true;
create index if not exists sessions_user_date        on public.sessions(user_id, date);
create index if not exists sessions_user_recurring   on public.sessions(user_id, is_recurring) where is_recurring = true;
create index if not exists sessions_task_id          on public.sessions(task_id);
create index if not exists tutorials_user_date       on public.tutorials(user_id, date);
create index if not exists tutorials_user_recurring  on public.tutorials(user_id, is_recurring) where is_recurring = true;
create index if not exists tutorials_session         on public.tutorials(session_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table public.tasks      enable row level security;
alter table public.sessions   enable row level security;
alter table public.tutorials  enable row level security;

create policy "tasks: own rows"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions: own rows"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tutorials: own rows"
  on public.tutorials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── MIGRATION: add is_recurring (run if upgrading) ──────────
-- ALTER TABLE public.sessions  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
-- ALTER TABLE public.tutorials ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

-- ── REALTIME ─────────────────────────────────────────────────
-- Enable realtime in Supabase dashboard:
-- Database → Replication → Enable for tasks, sessions, tutorials
