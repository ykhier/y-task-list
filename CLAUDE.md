# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code organization principles

- **Never dump all new code into a single file.** Every feature must be split into focused, single-responsibility files from the start.
- Follow the existing folder conventions: orchestrator component in the feature folder, sub-components in a `feature-name/` sub-folder, pure helpers in a `*-utils.ts` file, constants in a `*-constants.ts` file, custom hooks in `hooks/`.
- A component file should contain exactly one exported component. Local sub-components that are only used inside that file are the only exception, and only when they are small (< ~30 lines) and purely presentational.
- Extract logic into hooks (`hooks/`) and pure functions (`lib/` or `*-utils.ts`) — components should read state and render, not contain business logic.
- If a new component needs shared primitives (constants, types, utilities) with existing components, place them in the existing shared file rather than duplicating.

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
SUPABASE_SERVICE_ROLE_KEY=...   # required for admin OTP routes (/api/send-otp, /api/verify-otp)
OPENAI_API_KEY=...              # required for voice input (/api/voice-parse)
RESEND_API_KEY=...              # optional — OTP emails fall back to console.log without it
CRON_SECRET=...                 # required for /api/cron/daily-digest (verified via Authorization: Bearer header)
GMAIL_USER=...                  # required for daily digest emails (Gmail SMTP via Nodemailer)
GMAIL_APP_PASSWORD=...          # Gmail App Password (not account password) for SMTP auth
LANGCHAIN_TRACING_V2=true       # optional — enables LangSmith tracing for voice API calls
LANGCHAIN_API_KEY=...           # required if tracing enabled
LANGCHAIN_PROJECT=...           # LangSmith project name
TAVILY_API_KEY=...              # required for the AI research agent (/api/materials/research)
```

## Architecture

**WeekFlow** is a Next.js 15 / React 19 weekly planner with three tabs — **calendar**, **tasks**, and **recurring** — backed by Supabase. The app is RTL (Hebrew, `lang="he" dir="rtl"`).

### Data flow

All state lives in hooks composed at the root page ([app/page.tsx](app/page.tsx)):

- `useTasks` — fetches/mutates the `tasks` table, subscribes to Supabase Realtime. Uses in-memory + `sessionStorage` caching (key `weekflow.tasks.<userId>`) to avoid flicker on re-mount. Each fetch is guarded by a `requestIdRef` counter (stale responses are dropped) and a 12-second timeout. Re-fetches on window focus/`visibilitychange`/`pageshow` as a background fetch (does not show spinner if data is already loaded).
- `useEvents` — fetches/mutates the `sessions` table, subscribes to Supabase Realtime. Same `requestIdRef` + 12-second timeout pattern as `useTasks` (no caching layer).
- `useTutorials` — fetches/mutates the `tutorials` table, subscribes to Supabase Realtime; maps tutorials to `CalendarEvent` shape with `source: 'tutorial'`
- `useWeekSync` — composes all three hooks above and enforces sync rules:
  - Adding a task with a `time` → auto-creates a linked calendar event (`source: 'task'`) with `is_recurring` copied from the task
  - Updating a task's `time`/`title`/`date`/`is_recurring` → updates or creates/deletes its linked event (including `is_recurring`)
  - Deleting a task → deletes its linked event via `deleteEventByTaskId`
  - Completing a task → event is hidden client-side (not deleted from DB); CalendarView filters out events whose `task_id` belongs to a completed task
  - **`is_recurring` on task-linked events**: `buildEventsByDay` in `calendar-view-utils.ts` derives `is_recurring` client-side from the corresponding task (handles legacy events created before this field was propagated)
- `usePlannerPage` (`hooks/planner/usePlannerPage.ts`) — page-level hook that wraps `useWeekSync` and owns all modal state (EventModal, TutorialModal), calendar action handlers (drop, click, add-recurring-to-week), and conflict/suggestion logic. `app/page.tsx` only calls this one hook.

### Auth

`SupabaseProvider` wraps the whole app, resolves the session via `getSession()` on mount, and guards all routes. Public paths are `AUTH_PATHS = ['/login', '/signup', '/verify-otp']`. Exposes two hooks:

- `useSupabaseUser()` — returns the current `User | null`
- `useSupabaseAuth()` — returns `{ user, signOut }` (used by Navbar for the logout button)

`/login` calls `supabase.auth.signInWithPassword`. For non-admin users it redirects to `/`. `/signup` calls `supabase.auth.signUp` then immediately calls `signInWithPassword` and redirects to `/`. `components/auth/AuthLayout.tsx` is a shared card/background wrapper available for future auth pages. All Supabase queries filter by `user_id` and RLS policies enforce this server-side.

**Admin 2FA (OTP) flow:** Users with `profiles.is_admin = true` require a 6-digit OTP after password login:

1. `/login` — after successful `signInWithPassword`, checks `profiles.is_admin`; if true, calls `POST /api/send-otp` with `Authorization: Bearer <accessToken>` (from `signInData.session`), stores the token in `sessionStorage` as `otp_token`, then redirects to `/verify-otp`
2. `/verify-otp` — reads `otp_token` from `sessionStorage`, starts a 60-second countdown immediately, sends `POST /api/verify-otp` with Bearer token + code; on success sets `sessionStorage.otp_verified = user.id` and redirects to `/`
3. `SupabaseProvider` route guard: admin users without `otp_verified` in sessionStorage are signed out and sent to `/login`; this guard is skipped on all `AUTH_PATHS` to allow the login → verify-otp flow to complete
4. API routes use `createAdminClient()` (service role key) with `adminClient.auth.getUser(token)` to verify the Bearer token — **`SUPABASE_SERVICE_ROLE_KEY` is required**
5. OTP codes stored in `otp_codes` table (1-minute expiry); emails sent via Resend if `RESEND_API_KEY` is set, otherwise logged to console

`middleware.ts` runs on every request (excluding static assets) and calls `supabase.auth.getUser()` to refresh the session cookie — required for SSR auth to work correctly with `@supabase/ssr`. Routes under `/api/cron/` are excluded from the auth redirect so the cron job can be called without a session.

**Supabase dashboard settings:** In Authentication → Providers → Email, disable "Confirm email" if you don't want users to verify their email before logging in. The `/auth/callback` route handles the verification code exchange if email confirmation is enabled.

### Database

Schema is in [supabase/schema.sql](supabase/schema.sql). Five tables:

- `tasks` — `time`/`end_time` (HH:MM), `is_recurring` (auto-advances past recurring tasks to current week on fetch)
- `sessions` — calendar events; `source in ('manual','task')`; task-linked rows have `task_id` FK

> **DB time format gotcha:** PostgreSQL stores `time` columns as `HH:MM:SS` (with seconds). Frontend forms produce `HH:MM`. `overlaps()` in `lib/planner/page-helpers.ts` normalizes all inputs with `.slice(0, 5)` — never compare raw DB time strings directly, as `"10:00" < "10:00:00"` is `true` in JS, causing false overlap detection.

- `tutorials` — separate event type linked optionally to a session via `session_id` FK
- `profiles` — one row per user; `is_admin boolean NOT NULL DEFAULT false`; `full_name`; `email`; `digest_enabled boolean`; `notification_hour int` (0–23, Israel time) — used by the daily digest cron
- `otp_codes` — admin 2FA codes: `user_id`, `code` (6 digits), `expires_at` (1-minute TTL); old codes are deleted before inserting a new one

Run the schema SQL in the Supabase dashboard to set up a new project.

Realtime must be enabled in the Supabase dashboard: **Database → Replication → Enable for tasks, sessions, tutorials**.

### Daily digest cron

`vercel.json` schedules `GET /api/cron/daily-digest` at `40 18 * * *` UTC (= 21:40 Israel time, UTC+3). Vercel adds ~20 min execution delay, so emails arrive at ~22:00 Israel time. The route:

- Authenticates via `Authorization: Bearer <CRON_SECRET>` header (Vercel crons send this automatically)
- Queries `profiles` for users with `digest_enabled = true`
- Fetches tomorrow's `sessions` and `tasks` for each user, builds an RTL Hebrew email, and sends via Gmail SMTP (Nodemailer, `lib/email/mailer.ts`). RTL layout requires inline `direction:rtl; text-align:right` on `<body>` and all inner cells — Gmail ignores the HTML `dir` attribute alone

`/api/cron/` routes are excluded from the auth middleware redirect so they can run without a user session.

### Key files

- `app/page.tsx` — root; calls only `usePlannerPage`, renders nothing else
- `hooks/planner/usePlannerPage.ts` — all modal state + calendar action handlers
- `hooks/useWeekSync.ts` — task↔event↔tutorial sync logic
- `lib/planner/page-helpers.ts` — `overlaps`, `hasTimedConflict`, `getRecurringSuggestion`
- `lib/materials/` — `embedder.ts`, `rag-chain.ts`, `research-agent.ts`, `summary-document.ts`
- `components/ui/hebrew-select.tsx` — **use instead of raw shadcn Select in all Hebrew UI** (RTL chevron/alignment fix)
- `components/ui/DatePickerField.tsx` — RTL date picker; accepts/returns `YYYY-MM-DD`; use in any form with a date field
- `types/database.types.ts` — regenerate with `npx supabase gen types typescript --project-id <id>` after schema changes

### Shared calendar primitives

Import grid constants (`HOUR_HEIGHT`, `GRID_START_HOUR`, `HOURS`) from `calendar-constants.ts` **only** — never from `DayColumn`. `DayColumn` is `'use client'` and importing it from a plain `.ts` file causes a webpack runtime error.

### Recurring tab

`RecurringView` shows a static weekly grid (Sunday–Saturday, 08:00–23:00) of all items flagged `is_recurring`. It deduplicates across weeks by grouping on `title + dayOfWeek + time`, so the same recurring event on multiple dates appears as one block. Tasks without a time appear as chips above the grid. Clicking a block selects it and shows edit/delete actions.

### Mobile layout patterns

Several components have completely separate mobile/desktop layouts via `flex sm:hidden` / `hidden sm:flex`:

- **CalendarView**: Mobile shows a day-picker strip + single `DayColumn`; desktop shows 7-column grid. The mobile week navigation uses two full-width card-style buttons (prev/next week). Both scroll independently via `mobileScrollRef` / `scrollRef`.
- **Navbar**: Mobile renders an active-tab badge + hamburger that opens a slide-in drawer (`translate-x-full` → `translate-x-0`). Desktop renders inline tabs. The drawer locks body scroll and closes on Escape.
- **TaskList**: The `+` button is icon-only on mobile (`hidden sm:inline` on the label); filter pills use `flex-1` so they divide width equally with no overflow.
- **Dialogs**: On mobile (`< sm`) all `Dialog`/`DialogContent` render as a **bottom sheet** — `inset-x-0 bottom-0 rounded-t-2xl`, slides in from the bottom with a drag handle. On desktop they revert to the standard centered modal with zoom animation. Any `max-w-*` override on `DialogContent` should be prefixed with `sm:` (e.g. `sm:max-w-md`) so it doesn't constrain the full-width bottom sheet on mobile.

### Safe area (iPhone notch / Dynamic Island)

The app uses `viewport-fit=cover` (set in the `viewport` export in `app/layout.tsx`), so content can fill the full screen edge-to-edge. Safe areas are handled explicitly:

- **Top**: `app/page.tsx` renders `<div className="flex-shrink-0 bg-white h-[env(safe-area-inset-top,0px)]" />` above the navbar to fill the notch/Dynamic Island area with the navbar background color.
- **Bottom**: The bottom sheet dialog uses the `pb-safe-area-or-6` utility (`padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px))`) defined in `globals.css` — ensures content clears the home indicator while keeping at least 24 px of padding on all devices.

### RTL gotchas

- **`overflow-x-auto` in RTL** starts the scroll position at the right edge, so the leftmost items (last in DOM order) get clipped. Fix: use `flex-1` on children so no overflow occurs, or use `dir="ltr"` on the scroll container.
- **Drawer slides from the right** (`right-0`, `translate-x-full` → `translate-x-0`) in RTL context.
- **`no-scrollbar`** utility in `globals.css` hides the scrollbar while preserving scroll — used on the mobile day-picker strip.

### TaskForm conflict detection

`findConflict` in `TaskForm.tsx` checks for time overlaps before allowing submit. Important exclusions:

- Events linked to **completed tasks** are skipped (`ev.task_id && completedTaskIds.has(ev.task_id)`)
- Events linked to **the task being edited** are skipped (`ev.task_id === excludeTaskId`) — prevents a task from conflicting with its own linked calendar event
- Completed tasks themselves are skipped in the tasks loop

### EventModal date picker

Uses `DatePickerField` (real date, not day-of-week). Voice input may return a `dayIndex` — convert via `nextOccurrenceOfDay(dayIndex)` before populating the picker.

### Voice input

`VoiceInputButton` → `useVoiceInput` → `POST /api/voice-parse` → `gpt-4o-audio-preview` (fallback: Whisper + GPT-4o-mini). Returns `ParsedVoiceInput` where unspoken fields are `null` — callers update only non-null fields. All calls traced via LangSmith (`wrapOpenAI` + `traceable`).

### Study materials (AI-powered)

The **materials** tab lets users attach files to tutorials and get AI summaries + web research. It is built on LangChain.js / LangGraph and uses `pgvector` for semantic search.

**DB tables** (see `supabase/schema.sql`):
- `tutorial_materials` — file metadata; `embedding_status in ('pending','processing','done','error')`. `tutorial_id` is a FK to `tutorials` — only tutorial-sourced events can have files uploaded (regular session/manual events cannot due to this FK constraint).
- `material_chunks` — pgvector rows; `embedding vector(1536)`; queried via the `match_material_chunks` RPC function.

**Storage bucket:** `materials` (private). Path convention: `{user_id}/{tutorial_id}/{material_id}{ext}` where `ext` is the actual file extension (`.pdf`, `.docx`, `.pptx`, `.txt`).

**Upload flow** (`app/api/materials/upload/route.ts`):
1. Validate file → insert `tutorial_materials` row with `status='pending'`
2. Upload buffer to Storage
3. **Return immediately** with `{ embeddingStatus: 'processing' }` — embedding runs via Next.js 15's `after()` in the background
4. Background: `runEmbeddingPipeline()` in `lib/materials/embedder.ts` → PDFLoader / DOCX (`mammoth`) / PPTX (`pptx-parser`) / TXT parser → `RecursiveCharacterTextSplitter` → batch-insert vectors into `material_chunks` → update status to `done` or `error`

**Polling:** `useMaterials.ts` polls `GET /api/materials?tutorialId=` every 3 seconds while any material has `status='processing'`, then stops automatically.

**Manual re-embed endpoint:** `POST /api/materials/embed` accepts `{ materialId }` and re-runs `runEmbeddingPipeline` for an existing material. Used to retry failed embeddings without re-uploading the file. Requires the file to already exist in Storage.

**Signed URL endpoint:** `GET /api/materials/signed-url?materialId=` — verifies the requesting user owns the material (compares `material.user_id` against the session user), then returns a 5-minute signed URL via `adminClient.storage.from('materials').createSignedUrl(...)`. Used by `MaterialFileList`'s `onView` handler to open private files without exposing storage credentials.

**AI features:**
- **Summarize** (`app/api/materials/summarize/route.ts` + `hooks/useSummarize.ts`) — Full-context chain via `lib/materials/rag-chain.ts`: fetches **all** `material_chunks` for the `tutorialId` (ordered by `material_id`, `chunk_index`), formats them with `formatFullContext`, and streams a rich Hebrew study document. Uses `createAdminClient()` to bypass RLS when reading chunks. Output renders in-panel via `renderSummaryBodyHtml` from `lib/materials/summary-document.ts`, and can be downloaded as a print-formatted PDF (hidden iframe + `window.print()`). The study document sections: overview, topic map, full explanation, key terms, practical examples (optional), algorithms/processes (optional), cross-file connections (optional), study highlights, and self-review Q&A (each question followed immediately by a detailed answer).
- **Research agent** (`app/api/materials/research/route.ts` + `hooks/useResearchAgent.ts`) — LangGraph ReAct agent via `lib/materials/research-agent.ts`. Two tools: `tavily_search` (web search) and `validate_url` (checks URL liveness — YouTube via oEmbed, others via HTTP + soft-404 body scan; agent must validate every URL before including it). Requires `TAVILY_API_KEY`. Streams `{ type: 'step' }` (tool use), `{ type: 'chunk' }` (answer text), `{ type: 'done' }` events. Search prioritizes the **tutorial title** as the main topic; uploaded document content is secondary context only. Output includes 2 Hebrew + 2 English YouTube videos, academic paper links (direct to paper, not author profile), and articles categorized by content language.
- Both SSE routes fall back to the `sessions` table if the `tutorialId` is not found in `tutorials` — so research/summarize works for regular calendar events too.

**UI components:**
- `MaterialsView.tsx` — groups all tutorials + manual events by course name (extracts course name via `parseTutorialTitle`, strips "הרצאת"/"הרצאה" prefixes). Shows "קורס {name}" headers.
- `MaterialsPanel.tsx` — slide-in sheet (desktop: right `w-[420px]`; mobile: bottom sheet). Orchestrates upload, file list, summary, and research sub-panels.
- `MaterialResearchPanel.tsx` — per-line direction detection: if a line contains any Hebrew char it renders RTL, otherwise LTR (avoids English links/titles appearing right-aligned).

**LangSmith tracing:** Zero config needed — LangChain auto-instruments all chains and agents via the existing env vars.

### Rendering and performance rules

- **Tab switching**: tabs use `activeTab === 'x' && <Component />` — components unmount on switch. Don't rely on in-memory state surviving a tab switch.
- **Never show a spinner on background re-fetches** when data is already present. The guard: `if (!isBackgroundRefresh) setLoading(true)`.
- **New async fetches must guard against stale responses** using the `requestIdRef` counter pattern already in `useTasks`/`useEvents`/`useTutorials` — copy it exactly.
- **New mutations should be optimistic** (update state → fire request → rollback on error) as in `useTutorials`.
- **Calendar grid**: never hardcode pixel values. Use `timeToOffset` / `timeRangeToHeight` from `lib/date.ts` and `HOUR_HEIGHT` from `calendar-constants.ts`.
- Root layout is `h-[100dvh] overflow-hidden` — each tab manages its own scroll.

### Styling

Tailwind CSS v3 + shadcn/ui. Path alias `@/` maps to the project root. Component config in [components.json](components.json).
