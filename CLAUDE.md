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

**WeekFlow** is a Next.js 15 / React 19 weekly planner with three tabs — **calendar**, **tasks**, and **recurring** — backed by Supabase. The app is RTL (Hebrew, `lang="he" dir="rtl"`).

### Data flow

All state lives in hooks composed at the root page ([app/page.tsx](app/page.tsx)):

- `useTasks` — fetches/mutates the `tasks` table, subscribes to Supabase Realtime
- `useEvents` — fetches/mutates the `sessions` table, subscribes to Supabase Realtime
- `useTutorials` — fetches/mutates the `tutorials` table, subscribes to Supabase Realtime; maps tutorials to `CalendarEvent` shape with `source: 'tutorial'`
- `useWeekSync` — composes all three hooks above and enforces sync rules:
  - Adding a task with a `time` → auto-creates a linked calendar event (`source: 'task'`)
  - Updating a task's `time`/`title`/`date` → updates or creates/deletes its linked event
  - Deleting a task → deletes its linked event via `deleteEventByTaskId`
  - Completing a task → event is hidden client-side (not deleted from DB); CalendarView filters out events whose `task_id` belongs to a completed task

### Auth

`SupabaseProvider` wraps the whole app and exposes the current user via `useSupabaseUser()`. It tries a real Supabase session first, then calls `signInAnonymously()` — the actual working auth path. The `/login` and `/signup` routes exist as UI stubs but are not yet wired to Supabase. **Anonymous sign-in must be enabled in Supabase dashboard: Authentication → Providers → Anonymous.** All Supabase queries filter by `user_id` and RLS policies enforce this server-side.

### Database

Schema is in [supabase/schema.sql](supabase/schema.sql). Three tables:
- `tasks` — `time`/`end_time` (HH:MM), `is_recurring` (auto-advances past recurring tasks to current week on fetch)
- `sessions` — calendar events; `source in ('manual','task')`; task-linked rows have `task_id` FK
- `tutorials` — separate event type linked optionally to a session via `session_id` FK

Run the schema SQL in the Supabase dashboard to set up a new project.

Realtime must be enabled in the Supabase dashboard: **Database → Replication → Enable for tasks, sessions, tutorials**.

### Component structure

```
app/page.tsx          — single-page app root; owns all state via useWeekSync
components/
  calendar/           — CalendarView (week grid), DayColumn, EventBlock
  recurring/          — RecurringView: weekly grid deduplicating recurring items by title+day+time pattern
  layout/             — Navbar (tab switcher), EventModal, TutorialModal, AnalyticsSummary
  tasks/              — TaskList, TaskItem, TaskForm
  providers/          — SupabaseProvider
  ui/                 — shadcn/ui primitives (badge, button, dialog, etc.)
hooks/
  useWeekSync.ts      — top-level composition hook (task↔event↔tutorial sync logic)
  useTasks.ts         — CRUD + realtime for tasks
  useEvents.ts        — CRUD + realtime for events
  useTutorials.ts     — CRUD + realtime for tutorials; all mutations are optimistic
lib/
  supabase/client.ts  — browser Supabase client
  supabase/server.ts  — server Supabase client (SSR)
  date.ts             — date helpers (defaultEndTime, week generation, etc.)
  utils.ts            — cn() tailwind utility
types/index.ts        — Task, CalendarEvent, Tutorial, WeekDay, TabView, TaskFilter, EventSource
```

### Recurring tab

`RecurringView` shows a static weekly grid (Sunday–Saturday, 08:00–23:00) of all items flagged `is_recurring`. It deduplicates across weeks by grouping on `title + dayOfWeek + time`, so the same recurring event on multiple dates appears as one block. Tasks without a time appear as chips above the grid. Clicking a block selects it and shows edit/delete actions.

### Styling

Tailwind CSS v3 + shadcn/ui. Path alias `@/` maps to the project root. Component config in [components.json](components.json).
