# WeekFlow 📅
 
**A modern weekly planner built with Next.js and Supabase**
 
🔗 **Live Demo:** [https://y-task-list.vercel.app/](https://y-task-list.vercel.app/)
 
---
 
## Overview
 
WeekFlow is a full-stack weekly planner application built with Next.js 15 and React 19, backed by Supabase. It features three main tabs — **Calendar**, **Tasks**, and **Recurring** — and is fully designed for RTL (Hebrew) users. The app supports voice input, real-time sync, daily email digests, admin 2FA, and a mobile-first responsive layout.
 
---
 
## Features
 
- **Calendar view** — Drag-and-drop weekly grid with event creation, editing, and conflict detection
- **Task management** — Full CRUD with scheduling, recurring tasks, and completion tracking
- **Recurring events** — Dedicated view showing all recurring items deduped across weeks
- **Voice input** — Record and auto-parse event/task details using OpenAI GPT-4o
- **Real-time sync** — Supabase Realtime subscriptions on tasks, events, and tutorials
- **Daily digest** — RTL Hebrew email digest sent via Gmail SMTP (Nodemailer) on a Vercel cron
- **Admin 2FA** — OTP-based second factor for admin users via email (Resend or console fallback)
- **Mobile layout** — Bottom sheet dialogs, day-picker strip, hamburger drawer, safe-area support
- **RTL support** — Full right-to-left Hebrew layout (`lang="he" dir="rtl"`)
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Framework | Next.js 15 / React 19 |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth + Admin OTP (2FA) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Voice | OpenAI GPT-4o Audio / Whisper-1 |
| Email | Nodemailer (Gmail SMTP) + Resend |
| Tracing | LangSmith (optional) |
| Deployment | Vercel |
 
---
 
## Getting Started
 
### 1. Clone the repository
 
```bash
git clone https://github.com/your-username/weekflow.git
cd weekflow
npm install
```
 
### 2. Configure environment variables
 
Copy the example file and fill in your credentials:
 
```bash
cp .env.local.example .env.local
```
 
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin OTP routes |
| `OPENAI_API_KEY` | Required for voice input |
| `RESEND_API_KEY` | Optional — OTP emails fall back to console without it |
| `CRON_SECRET` | Required for `/api/cron/daily-digest` |
| `GMAIL_USER` | Gmail address for digest emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not account password) |
| `LANGCHAIN_TRACING_V2` | Optional — enables LangSmith tracing |
| `LANGCHAIN_API_KEY` | Required if tracing is enabled |
| `LANGCHAIN_PROJECT` | LangSmith project name |
 
### 3. Set up the database
 
Run the schema SQL in your Supabase dashboard:
 
```
supabase/schema.sql
```
 
Then enable Realtime in **Database → Replication** for the `tasks`, `sessions`, and `tutorials` tables.
 
### 4. Run the development server
 
```bash
npm run dev
```
 
---
 
## Available Commands
 
```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```
 
---
 
## Architecture
 
### Data Flow
 
All state is composed at the root page (`app/page.tsx`) via a single hook `usePlannerPage`, which wraps `useWeekSync`. The sync layer coordinates three data hooks:
 
- **`useTasks`** — tasks table, Realtime subscription, sessionStorage caching, stale-request guard
- **`useEvents`** — sessions table, Realtime subscription, stale-request guard
- **`useTutorials`** — tutorials table, Realtime subscription, optimistic mutations
 
Adding a task with a time automatically creates a linked calendar event. Updating or deleting a task propagates to its linked event. Completing a task hides its event client-side without deleting it from the database.
 
### Auth Flow
 
- Standard users log in via email/password and are redirected to `/`
- Admin users (`profiles.is_admin = true`) go through an additional OTP step at `/verify-otp`
- `SupabaseProvider` guards all routes and signs out admins who haven't completed OTP verification
- `middleware.ts` refreshes the session cookie on every request for correct SSR auth
 
### Daily Digest Cron
 
Scheduled at `40 18 * * *` UTC (≈ 22:00 Israel time) via `vercel.json`. Fetches tomorrow's tasks and events for all opted-in users and sends a styled RTL Hebrew email via Gmail SMTP.
 
---
 
## Project Structure
 
```
app/                    # Next.js app router pages and API routes
components/
  calendar/             # CalendarView, DayColumn, EventBlock, TimeLabelsColumn
  recurring/            # RecurringView and weekly recurring grid
  tasks/                # TaskList, TaskItem, TaskForm
  layout/               # Navbar, EventModal, TutorialModal, SettingsModal
  admin/                # AdminUsersClient
  ui/                   # Shared primitives (Spinner, VoiceInputButton, DatePickerField…)
  providers/            # SupabaseProvider
hooks/
  planner/              # usePlannerPage (page-level orchestration)
  useWeekSync.ts        # Task ↔ event ↔ tutorial sync
  useTasks.ts
  useEvents.ts
  useTutorials.ts
lib/
  planner/              # Pure helpers (conflict detection, suggestions)
  supabase/             # Browser, server, and admin Supabase clients
  email/                # Mailer, digest data fetcher, digest HTML template
  date.ts               # Date utilities
types/index.ts          # Shared TypeScript types
supabase/schema.sql     # Full database schema
```
 
---
 
## Database Schema
 
Five main tables:
 
- **`tasks`** — scheduled and recurring tasks with `HH:MM` time fields
- **`sessions`** — calendar events; task-linked rows carry a `task_id` FK
- **`tutorials`** — optional tutorial events linked to sessions
- **`profiles`** — per-user settings: admin flag, digest preferences, notification hour
- **`otp_codes`** — admin 2FA codes with 1-minute TTL
 
> **Note:** PostgreSQL stores `time` columns as `HH:MM:SS`. All time comparisons must use `.slice(0, 5)` to normalize — never compare raw DB time strings directly.
 
---
 
## Key Design Decisions
 
- **Stale-while-revalidate** — All fetches are guarded by a `requestIdRef` counter; stale responses are silently discarded
- **Optimistic updates** — Mutations apply immediately to local state and roll back on error
- **Background refresh** — Re-fetches on focus/visibility events never show a spinner when data is already loaded
- **RTL-first** — All layouts, scrolling behavior, and modal animations are designed for right-to-left Hebrew
 
---
 
## Developed by
 
**YOSEF KHIER**
 
