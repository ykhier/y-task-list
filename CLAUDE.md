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
OPENAI_API_KEY=...          # required for voice input (/api/voice-parse)
```

## Architecture

**WeekFlow** is a Next.js 15 / React 19 weekly planner with three tabs — **calendar**, **tasks**, and **recurring** — backed by Supabase. The app is RTL (Hebrew, `lang="he" dir="rtl"`).

### Data flow

All state lives in hooks composed at the root page ([app/page.tsx](app/page.tsx)):

- `useTasks` — fetches/mutates the `tasks` table, subscribes to Supabase Realtime
- `useEvents` — fetches/mutates the `sessions` table, subscribes to Supabase Realtime
- `useTutorials` — fetches/mutates the `tutorials` table, subscribes to Supabase Realtime; maps tutorials to `CalendarEvent` shape with `source: 'tutorial'`
- `useWeekSync` — composes all three hooks above and enforces sync rules:
  - Adding a task with a `time` → auto-creates a linked calendar event (`source: 'task'`) with `is_recurring` copied from the task
  - Updating a task's `time`/`title`/`date`/`is_recurring` → updates or creates/deletes its linked event (including `is_recurring`)
  - Deleting a task → deletes its linked event via `deleteEventByTaskId`
  - Completing a task → event is hidden client-side (not deleted from DB); CalendarView filters out events whose `task_id` belongs to a completed task
  - **`is_recurring` on task-linked events**: `buildEventsByDay` in `calendar-view-utils.ts` derives `is_recurring` client-side from the corresponding task (handles legacy events created before this field was propagated)
- `usePlannerPage` (`hooks/planner/usePlannerPage.ts`) — page-level hook that wraps `useWeekSync` and owns all modal state (EventModal, TutorialModal), calendar action handlers (drop, click, add-recurring-to-week), and conflict/suggestion logic. `app/page.tsx` only calls this one hook.

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
app/page.tsx          — single-page app root; delegates entirely to usePlannerPage
components/
  calendar/
    CalendarView.tsx            — orchestrates mobile/desktop layouts, selectedDay state
    calendar-view/
      CalendarToolbars.tsx      — desktop toolbar, mobile toolbar, mobile week-nav cards
      CalendarLayouts.tsx       — MobileCalendarLayout + DesktopCalendarLayout
      calendar-view-utils.ts    — buildEventsByDay(events, completedTaskIds, tasks), formatWeekRangeLabel, weekRangePreview
    DayColumn.tsx               — single day column: hour slots + drag & drop
    EventBlock.tsx              — single event block inside DayColumn
    TimeLabelsColumn.tsx        — shared 08:00–23:00 time axis (used by calendar + recurring)
    calendar-constants.ts       — HOUR_HEIGHT / GRID_START_HOUR / HOURS (plain .ts, no React)
  recurring/
    RecurringView.tsx           — orchestrator: computes byDay/chipsByDay, holds selected state
    recurring-view/
      RecurringGrid.tsx         — weekly grid (uses TimeLabelsColumn)
      RecurringEmptyState.tsx
      RecurringTaskDialog.tsx
      recurring-view-utils.ts   — buildPatterns, groupByDay, hhmm
      recurring-view-constants.ts — re-exports calendar-constants + event colors + DAY_LABELS
  layout/
    Navbar.tsx                  — thin shell; delegates to navbar/ sub-components
    navbar/
      NavbarDesktopTabs.tsx
      NavbarMobileDrawer.tsx
      NavbarMobileTabBadge.tsx
      navbar-tabs.tsx
    EventModal.tsx              — add/edit lecture dialog (contains DaySelect, TimeRangeFields, RecurringCheckbox sub-components)
    TutorialModal.tsx
    AnalyticsSummary.tsx
  tasks/
    TaskList.tsx                — thin shell; delegates to task-list/ sub-components
    task-list/
      TaskListHeader.tsx
      TaskListDialogs.tsx
      task-list-constants.ts
      task-list-utils.ts
    TaskItem.tsx, TaskForm.tsx
  providers/          — SupabaseProvider
  ui/                 — shadcn/ui primitives (badge, button, dialog, etc.)
hooks/
  planner/
    usePlannerPage.ts — page-level hook: modal state, conflict detection, calendar/event/tutorial actions
  useWeekSync.ts      — task↔event↔tutorial sync logic
  useTasks.ts         — CRUD + realtime for tasks
  useEvents.ts        — CRUD + realtime for events
  useTutorials.ts     — CRUD + realtime for tutorials; all mutations are optimistic
lib/
  planner/
    page-helpers.ts   — pure helpers: overlaps, hasTimedConflict, getRecurringSuggestion, targetRecurringDate
  supabase/client.ts  — browser Supabase client
  supabase/server.ts  — server Supabase client (SSR)
  date.ts             — date helpers (defaultEndTime, week generation, etc.)
  utils.ts            — cn() tailwind utility
types/index.ts        — Task, CalendarEvent, Tutorial, WeekDay, TabView, TaskFilter, EventSource
```

### Shared calendar primitives

- **`calendar-constants.ts`** — the single source for `HOUR_HEIGHT`, `GRID_START_HOUR`, `HOURS`. Import from here, **never** from `DayColumn` — `DayColumn` is a `'use client'` component and importing it from a plain `.ts` file causes a webpack runtime error (`__webpack_modules__[moduleId] is not a function`).
- **`TimeLabelsColumn`** — shared between `CalendarLayouts` and `RecurringGrid`. Imports constants from `calendar-constants.ts`.
- **`recurring-view-constants.ts`** — re-exports the three grid constants from `calendar-constants.ts` under `RECURRING_*` aliases so `RecurringGrid` doesn't need to know about the calendar folder.

### Recurring tab

`RecurringView` shows a static weekly grid (Sunday–Saturday, 08:00–23:00) of all items flagged `is_recurring`. It deduplicates across weeks by grouping on `title + dayOfWeek + time`, so the same recurring event on multiple dates appears as one block. Tasks without a time appear as chips above the grid. Clicking a block selects it and shows edit/delete actions.

### Mobile layout patterns

Several components have completely separate mobile/desktop layouts via `flex sm:hidden` / `hidden sm:flex`:

- **CalendarView**: Mobile shows a day-picker strip + single `DayColumn`; desktop shows 7-column grid. The mobile week navigation uses two full-width card-style buttons (prev/next week). Both scroll independently via `mobileScrollRef` / `scrollRef`.
- **Navbar**: Mobile renders an active-tab badge + hamburger that opens a slide-in drawer (`translate-x-full` → `translate-x-0`). Desktop renders inline tabs. The drawer locks body scroll and closes on Escape.
- **TaskList**: The `+` button is icon-only on mobile (`hidden sm:inline` on the label); filter pills use `flex-1` so they divide width equally with no overflow.

### RTL gotchas

- **`overflow-x-auto` in RTL** starts the scroll position at the right edge, so the leftmost items (last in DOM order) get clipped. Fix: use `flex-1` on children so no overflow occurs, or use `dir="ltr"` on the scroll container.
- **Drawer slides from the right** (`right-0`, `translate-x-full` → `translate-x-0`) in RTL context.
- **`no-scrollbar`** utility in `globals.css` hides the scrollbar while preserving scroll — used on the mobile day-picker strip.

### TaskForm conflict detection

`findConflict` in `TaskForm.tsx` checks for time overlaps before allowing submit. Important exclusions:
- Events linked to **completed tasks** are skipped (`ev.task_id && completedTaskIds.has(ev.task_id)`)
- Events linked to **the task being edited** are skipped (`ev.task_id === excludeTaskId`) — prevents a task from conflicting with its own linked calendar event
- Completed tasks themselves are skipped in the tasks loop

### Voice input

`EventModal` and `TaskForm` both have a `VoiceInputButton` next to the title field. The flow:

1. `VoiceInputButton` (`components/ui/VoiceInputButton.tsx`) — records via `useVoiceInput`, displays mic/stop/spinner states
2. `useVoiceInput` (`hooks/useVoiceInput.ts`) — manages `MediaRecorder`, POSTs the `webm` blob to `/api/voice-parse`, calls `onParsed(ParsedVoiceInput)`
3. `/api/voice-parse` (`app/api/voice-parse/route.ts`) — primary path: `gpt-4o-audio-preview` (base64 audio → JSON); fallback: Whisper-1 transcription → GPT-4o-mini. Requires `OPENAI_API_KEY` in `.env.local`.

`ParsedVoiceInput` uses `null` for every field not spoken — callers only update state for non-null fields (partial update pattern). The tutorial subfield works the same way.

### Styling

Tailwind CSS v3 + shadcn/ui. Path alias `@/` maps to the project root. Component config in [components.json](components.json).
