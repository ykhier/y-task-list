# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured.

## Environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**WeekFlow** is a Next.js 15 / React 19 weekly planner with a calendar + tasks + analytics UI backed by Supabase. The app is RTL (Hebrew, `lang="he" dir="rtl"`).

### Data flow

All state lives in three custom hooks composed at the root page ([app/page.tsx](app/page.tsx)):

- `useTasks` — fetches/mutates the `tasks` table, subscribes to Supabase Realtime
- `useEvents` — fetches/mutates the `sessions` table, subscribes to Supabase Realtime
- `useWeekSync` — composes the two hooks above and enforces sync rules:
  - Adding a task with a `time` → auto-creates a linked calendar event (`source: 'task'`)
  - Updating a task's `time`/`title`/`date` → updates or creates/deletes its linked event
  - Deleting a task → deletes its linked event via `deleteEventByTaskId`
  - Completing a task → event is hidden client-side (not deleted from DB); CalendarView filters out events whose `task_id` belongs to a completed task

### Auth

`SupabaseProvider` wraps the whole app and exposes the current user via `useSupabaseUser()`. There is no login flow: it tries a real Supabase session first, then calls `signInAnonymously()`. **Anonymous sign-in must be enabled in Supabase dashboard: Authentication → Providers → Anonymous.** All Supabase queries filter by `user_id` and RLS policies enforce this server-side.

### Database

Schema is in [supabase/schema.sql](supabase/schema.sql). Two tables: `tasks` and `sessions`. Sessions linked to tasks have `source = 'task'` and a non-null `task_id` FK. Tutorials are stored as separate rows with `source = 'manual'`. Run the schema SQL in the Supabase dashboard to set up a new project.

Realtime must be enabled in the Supabase dashboard: **Database → Replication → Enable for tasks, sessions**.

### Component structure

```
app/page.tsx          — single-page app root; owns all state via useWeekSync
components/
  calendar/           — CalendarView (week grid), DayColumn, EventBlock
  layout/             — Navbar (tab switcher), EventModal, AnalyticsSummary
  tasks/              — TaskList, TaskItem, TaskForm
  providers/          — SupabaseProvider
  ui/                 — shadcn/ui primitives (badge, button, dialog, etc.)
hooks/
  useWeekSync.ts      — top-level composition hook (task↔event sync logic)
  useTasks.ts         — CRUD + realtime for tasks
  useEvents.ts        — CRUD + realtime for events
lib/
  supabase/client.ts  — browser Supabase client
  supabase/server.ts  — server Supabase client (SSR)
  date.ts             — date helpers (defaultEndTime, week generation, etc.)
  utils.ts            — cn() tailwind utility
types/index.ts        — Task, CalendarEvent, WeekDay, TabView, TaskFilter
```

### Styling

Tailwind CSS v3 + shadcn/ui. Path alias `@/` maps to the project root. Component config in [components.json](components.json).
