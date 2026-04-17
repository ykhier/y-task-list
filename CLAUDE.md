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
    SettingsModal.tsx           — daily-digest toggle; reads/writes /api/settings/notification
    AnalyticsSummary.tsx
  materials/
    MaterialsView.tsx             — course-grouped list of all tutorials + manual events; entry point to MaterialsPanel
    MaterialsPanel.tsx            — slide-in sheet: upload zone, file list, summary, research sub-panels
    materials/
      MaterialUploadZone.tsx, MaterialFileList.tsx
      MaterialSummaryPanel.tsx, MaterialResearchPanel.tsx
      materials-panel-constants.ts, materials-panel-utils.ts
  admin/
    AdminUsersClient.tsx        — client-side user management table (toggle admin, delete)
app/admin/page.tsx              — SSR admin page; redirects non-admins; uses createAdminClient()
  tasks/
    TaskList.tsx                — thin shell; delegates to task-list/ sub-components
    task-list/
      TaskListHeader.tsx
      TaskListDialogs.tsx
      TaskStats.tsx             — 4-card stats grid (total, done, scheduled time, completion %)
      task-stats-utils.ts       — getTaskStatsSummary(), formatMinutesLabel()
      task-list-constants.ts
      task-list-utils.ts
    TaskItem.tsx, TaskForm.tsx
  providers/          — SupabaseProvider
  ui/
    Spinner.tsx       — two variants: `svg` (default, SVG arc spinner) and `ring` (CSS border spinner); accepts `className` for sizing (default `h-4 w-4`)
    VoiceInputButton.tsx
    CountdownTimer.tsx — imperative ref component (`CountdownTimerHandle.reset(minutes?)`) used on `/verify-otp`; turns red at ≤10 s
    PasswordInput.tsx  — text input with show/hide toggle; used on login/signup
    PasswordStrength.tsx — visual password strength bar; used on signup
    hebrew-select.tsx  — RTL-aware wrappers (`HebrewSelectTrigger`, `HebrewSelectContent`, `HebrewSelectItem`) around shadcn Select; fixes chevron position and text alignment for RTL. Use these instead of the raw shadcn primitives whenever a Select appears in Hebrew UI.
    DatePickerField.tsx — RTL-aware date picker (shadcn Calendar + Popover, Hebrew locale via `date-fns/locale/he`). Accepts/returns `YYYY-MM-DD` strings via `fromDateStr`/`toDateStr` from `lib/date.ts`. On mobile renders full-width to avoid RTL clipping. Used in TaskForm and EventModal.
    (+ shadcn/ui primitives: badge, button, calendar, dialog, popover, etc.)
hooks/
  planner/
    usePlannerPage.ts — page-level hook: modal state, conflict detection, calendar/event/tutorial actions
  useWeekSync.ts      — task↔event↔tutorial sync logic
  useTasks.ts         — CRUD + realtime for tasks
  useEvents.ts        — CRUD + realtime for events
  useTutorials.ts     — CRUD + realtime for tutorials; all mutations are optimistic
  useVoiceInput.ts    — manages MediaRecorder, POSTs webm blob to /api/voice-parse, calls onParsed(ParsedVoiceInput)
  useMaterials.ts     — file list CRUD + 3-second polling while embedding_status=’processing’
  useSummarize.ts     — SSE consumer for /api/materials/summarize; accumulates chunk events
  useResearchAgent.ts — SSE consumer for /api/materials/research; fills steps[] + results[]
lib/
  planner/
    page-helpers.ts   — pure helpers: overlaps, hasTimedConflict, getRecurringSuggestion, targetRecurringDate
  materials/
    embedder.ts         — runEmbeddingPipeline (PDF/DOCX → chunks → pgvector); buildVectorStore
    rag-chain.ts        — buildSummarizeChain (full-context chain: 3-phase Hebrew prompt — internal mapping → writing rules → structured output; 9-section study document)
    research-agent.ts   — streamResearchAgent (LangGraph ReAct + Tavily; yields step/chunk/done events)
    materials-constants.ts — MAX_FILE_BYTES, CHUNK_SIZE, CHUNK_OVERLAP, EMBEDDING_MODEL
    materials-utils.ts  — validateFile, buildStoragePath, formatFileSize
    summary-document.ts — `renderSummaryBodyHtml` (Markdown→HTML for in-panel display) + `buildSummaryDocumentHtml` (full RTL print document for PDF download). Supports: headings, unordered/ordered lists, blockquotes (`> `), horizontal rules (`---`), tables, bold (`**`), italic (`*`), and `**Label:**` bold-label paragraphs (get `.bold-label` CSS class for spacing). Add new Markdown constructs here — never in the component.
  supabase/client.ts  — browser Supabase client
  supabase/server.ts  — server Supabase client (SSR)
  supabase/admin.ts   — createAdminClient() using SUPABASE_SERVICE_ROLE_KEY (server-only)
  email/
    mailer.ts         — Gmail SMTP via Nodemailer
    digest-data.ts    — fetches tomorrow’s tasks/events per user
    digest-template.ts — builds the RTL Hebrew digest HTML
  date.ts             — date helpers (defaultEndTime, week generation, etc.)
  utils.ts            — cn() tailwind utility
types/index.ts        — Task, CalendarEvent, Tutorial, WeekDay, TabView, TaskFilter, EventSource, TutorialMaterial, EmbeddingStatus, ResearchResult, AgentStep
types/database.types.ts — generated Supabase DB types; regenerate with `npx supabase gen types typescript --project-id <id>` after schema changes
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

`EventModal` uses `DatePickerField` — a real date picker (not a day-of-week selector). The initial date defaults to `initialDate` (when adding) or `editEvent.date` (when editing). Voice input can still return a `dayIndex`, which is converted to the next occurrence of that weekday via `nextOccurrenceOfDay(dayIndex)` before populating the picker.

### Voice input

`EventModal` and `TaskForm` both have a `VoiceInputButton` next to the title field. The flow:

1. `VoiceInputButton` (`components/ui/VoiceInputButton.tsx`) — records via `useVoiceInput`, displays mic/stop/spinner states
2. `useVoiceInput` (`hooks/useVoiceInput.ts`) — manages `MediaRecorder`, POSTs the `webm` blob to `/api/voice-parse`, calls `onParsed(ParsedVoiceInput)`
3. `/api/voice-parse` (`app/api/voice-parse/route.ts`) — primary path: `gpt-4o-audio-preview` (base64 audio → JSON); fallback: Whisper-1 transcription → GPT-4o-mini. Requires `OPENAI_API_KEY` in `.env.local`.

`ParsedVoiceInput` uses `null` for every field not spoken — callers only update state for non-null fields (partial update pattern). The tutorial subfield works the same way.

All voice API calls are traced in **LangSmith** (`LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT` in `.env.local`). The route uses `wrapOpenAI` (automatic OpenAI call tracing) and `traceable` (wraps the full parse function with `metadata: { user: <email> }` so each trace shows which user triggered it).

### Study materials (AI-powered)

The **materials** tab lets users attach files to tutorials and get AI summaries + web research. It is built on LangChain.js / LangGraph and uses `pgvector` for semantic search.

**DB tables** (see `supabase/schema.sql`):
- `tutorial_materials` — file metadata; `embedding_status in ('pending','processing','done','error')`. `tutorial_id` is a FK to `tutorials` — only tutorial-sourced events can have files uploaded (regular session/manual events cannot due to this FK constraint).
- `material_chunks` — pgvector rows; `embedding vector(1536)`; queried via the `match_material_chunks` RPC function.

**Storage bucket:** `materials` (private). Path convention: `materials/{user_id}/{tutorial_id}/{material_id}.pdf`.

> **Known issue:** The `MaterialResearchPanel` conclusion/summary section (`סיכום`) at the end of a research run is not yet rendering correctly — the final aggregated output from the ReAct agent is dropped. The per-step streaming and individual chunk events work; only the final conclusion display is broken.

**Upload flow** (`app/api/materials/upload/route.ts`):
1. Validate file → insert `tutorial_materials` row with `status='pending'`
2. Upload buffer to Storage
3. **Return immediately** with `{ embeddingStatus: 'processing' }` — embedding runs via Next.js 15's `after()` in the background
4. Background: `runEmbeddingPipeline()` in `lib/materials/embedder.ts` → PDFLoader / DOCX parser → `RecursiveCharacterTextSplitter` → batch-insert vectors into `material_chunks` → update status to `done` or `error`

**Polling:** `useMaterials.ts` polls `GET /api/materials?tutorialId=` every 3 seconds while any material has `status='processing'`, then stops automatically.

**Manual re-embed endpoint:** `POST /api/materials/embed` accepts `{ materialId }` and re-runs `runEmbeddingPipeline` for an existing material. Used to retry failed embeddings without re-uploading the file. Requires the file to already exist in Storage.

**AI features:**
- **Summarize** (`app/api/materials/summarize/route.ts` + `hooks/useSummarize.ts`) — Full-context chain via `lib/materials/rag-chain.ts`: fetches **all** `material_chunks` for the `tutorialId` (ordered by `material_id`, `chunk_index`), formats them with `formatFullContext`, and streams a rich 9-section Hebrew study document. Uses `createAdminClient()` to bypass RLS when reading chunks. Output renders in-panel via `renderSummaryBodyHtml` from `lib/materials/summary-document.ts`, and can be downloaded as a print-formatted PDF (hidden iframe + `window.print()`).
- **Research agent** (`app/api/materials/research/route.ts` + `hooks/useResearchAgent.ts`) — LangGraph ReAct agent via `lib/materials/research-agent.ts` using `TavilySearchResults`. Requires `TAVILY_API_KEY`. Streams `{ type: 'step' }` (tool use) and `{ type: 'chunk' }` (answer text) events. Output includes 2 Hebrew + 2 English YouTube videos, academic paper links (direct to paper, not author profile), and articles categorized by content language.
- Both SSE routes fall back to the `sessions` table if the `tutorialId` is not found in `tutorials` — so research/summarize works for regular calendar events too.

**UI components:**
- `MaterialsView.tsx` — groups all tutorials + manual events by course name (extracts course name via `parseTutorialTitle`, strips "הרצאת"/"הרצאה" prefixes). Shows "קורס {name}" headers.
- `MaterialsPanel.tsx` — slide-in sheet (desktop: right `w-[420px]`; mobile: bottom sheet). Orchestrates upload, file list, summary, and research sub-panels.
- `MaterialResearchPanel.tsx` — per-line direction detection: if a line contains any Hebrew char it renders RTL, otherwise LTR (avoids English links/titles appearing right-aligned).

**LangSmith tracing:** Zero config needed — LangChain auto-instruments all chains and agents via the existing env vars.

### Rendering and performance standards

Every page transition, tab switch, and re-render must be implemented at production quality — no flicker, no layout thrash, no unnecessary network waterfalls.

#### Tab switching

Tabs are rendered with conditional JSX (`activeTab === 'x' && <Component />`) inside containers that are always mounted (`h-full overflow-hidden`). This means:

- Components unmount on tab switch and remount on return. Do **not** depend on in-memory state surviving a tab switch — persist anything important to refs, sessionStorage, or server state.
- Because tasks use `sessionStorage` caching (`weekflow.tasks.<userId>`), returning to the tasks tab feels instant — the cached data is displayed immediately while a background re-fetch runs silently. **Never show a loading spinner on background re-fetches when data is already present.**

#### Stale-while-revalidate pattern (requestIdRef)

All data-fetching hooks (`useTasks`, `useEvents`, `useTutorials`) guard async responses with a `requestIdRef` counter. Increment before each fetch, check the counter after `await` — if it changed, discard the result. This prevents stale responses from overwriting newer data on rapid tab switches or focus events.

```ts
const requestId = ++requestIdRef.current;
const data = await fetchSomething();
if (requestId !== requestIdRef.current) return; // stale — discard
```

Always apply this pattern to any new async fetch inside a hook or component. Never apply state updates from a fetch without checking for staleness first.

#### Optimistic updates

Mutations in `useTutorials` (and similar patterns elsewhere) apply the change to local state **before** the network call returns. The pattern:

1. Update local state immediately (optimistic)
2. Fire the async mutation
3. On error: roll back to previous state and surface an error message
4. On success: reconcile with the server response (replace the optimistic item with the real one)

Use this pattern for any user-triggered mutation where the success rate is high and the cost of a momentary incorrect state is low.

#### Avoiding unnecessary re-renders

- Hooks that close over stable refs (e.g., `supabase` client) should be in `useEffect` dep arrays — but do **not** add inner functions defined in the component body unless they are wrapped in `useCallback`. Without `useCallback`, adding the function as a dep causes the effect to re-run every render. When the function is stable but ESLint still warns, use `// eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why.
- Pure computation that derives display data from props/state (e.g., `buildEventsByDay`, `buildPatterns`) must be kept outside the render path or wrapped in `useMemo` if the input arrays are large.
- Components should receive only the slices of state they render. Pass derived values, not raw store objects, whenever the child doesn't need the full parent state.

#### Background refresh without flicker

Hooks re-fetch on `focus`, `visibilitychange`, `pageshow`, and `online` events. These must always be **background fetches** — they must not reset the loading spinner or clear visible content. The guard is: only call `setLoading(true)` when no data is currently available.

```ts
const isBackgroundRefresh = tasks.length > 0;
if (!isBackgroundRefresh) setLoading(true);
```

New hooks should replicate this pattern exactly. A user returning to a tab should never see a blank screen or spinner if they already had data.

#### Layout and scroll

- The root layout (`h-[100dvh] overflow-hidden`) prevents any body scroll. Each tab's content area manages its own scroll with `overflow-y-auto` or `overflow-hidden` and explicit heights.
- `overflow-x-auto` in RTL context starts scroll at the **right** edge — leftmost items get clipped. Fix with `flex-1` on children or `dir="ltr"` on the scroll container (see RTL gotchas).
- Pixel-based calendar grid uses `HOUR_HEIGHT = 60` — any element positioned in the grid must use `top = timeToOffset(time)` and `height = timeRangeToHeight(start, end)`. Never hardcode pixel values — import from `calendar-constants.ts`.

### Styling

Tailwind CSS v3 + shadcn/ui. Path alias `@/` maps to the project root. Component config in [components.json](components.json).
