# StudyFlow — Architecture Blueprint

> Distilled version of the full plan. Use this as a living doc.

---

## 1. Goals

StudyFlow is a **personal learning operating system**, not an LMS. It must handle:

- Any hierarchy depth (module → lesson → quiz → assignment → custom type).
- Any source (Programming Hero, university, Udemy, Coursera, YouTube, books, docs).
- A coherent feature surface (tasks, sessions, notes, bookmarks, goals, habits, revisions).
- Future team workspaces (owner / admin / member).

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Frontend | Next.js 15 App Router · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · TanStack Query · RHF · Zod |
| Backend | Node 20+ · Express 5 · TypeScript |
| DB | PostgreSQL (Neon) |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | Better Auth (email/password + Google + email verification + forgot password) |
| Uploads | UploadThing |
| Validation | Zod (shared) |
| Cache | Redis (optional; in-memory fallback) |
| Logging | Pino + pino-http + pino-pretty |
| Package mgr | pnpm + Turborepo |

---

## 3. Repository layout

```
apps/
  web/        Next.js 15 (RSC + Server Actions + REST passthrough)
  api/        Express 5 REST API (Better Auth mount + feature modules)
packages/
  db/         Drizzle schema + client + migrations + seed
  auth/       Better Auth (single source, mounted on both apps)
  shared/     Zod DTOs, enums, constants, types
  config/     Shared tsconfig / eslint presets
tooling/      Helper scripts
```

---

## 4. Data flow

```
Browser → Next.js (RSC / actions / TanStack Query)
            ├─ Drizzle directly (RSC fetch, no HTTP)
            ├─ /api/auth/[...all]   → Better Auth via packages/auth
            └─ /api/v1/*             → Express API (apps/api)
                                          ├─ Zod middleware
                                          ├─ Pino logging
                                          ├─ Rate limit
                                          ├─ requireAuth (Better Auth getSession)
                                          └─ Drizzle repos → Postgres
```

**One DB**, **one auth instance**. Two HTTP surfaces (web for browser, api for mobile/SDK).

---

## 5. Database design

22 tables, UUID PKs, soft-delete + `created_at/updated_at`, partial indexes ignore soft-deleted rows. Key domains:

- **Auth**: `users`, `sessions`, `accounts`, `verifications` (canonical Better Auth)
- **Courses**: `courses`, `course_hierarchy` (self-referencing, `ltree` path column, depth-check ≤ 12), `course_progress`
- **Tasks**: `tasks` (status / priority / type / recurrence), `task_assignees`
- **Sessions & reminders**: `study_sessions`, `reminders`
- **Content**: `notes`, `bookmarks`, `resources`, `attachments` (polymorphic)
- **Goals & habits**: `goals`, `habits`, `habit_logs`, `revisions`
- **System**: `tags`, `taggables` (polymorphic many-to-many), `activity_logs`, `notifications`, `settings`, `analytics_snapshots`, `workspaces`, `workspace_members`

`course_hierarchy.path` is a materialized `text` path kept in sync by trigger. With Neon we can opt-in to `ltree` for GiST subtree searches.

---

## 6. Auth flow

1. `packages/auth` constructs **one** `auth = betterAuth({...})` using `drizzleAdapter`.
2. Web mounts it via `toNextJsHandler(auth)` at `app/api/auth/[...all]/route.ts`.
3. API mounts the **same** auth via `auth.handler` (Web `Request`-compatible) at `/api/auth/*`.
4. Email verification + forgot password enabled; Google OAuth optional.
5. Sessions: 30-day rolling, `HttpOnly` + `Secure` + `SameSite=Lax`.
6. Route guards:
   - Web: `middleware.ts` checks cookie on `(app)/*` paths.
   - API: `requireAuth` middleware reads session via `auth.api.getSession({ headers })`.

---

## 7. API conventions

- Base: `/api`. Versioned under `/api/v1`.
- Plural nouns; nested hierarchy: `/courses/:id/hierarchy`.
- Filter via query: `?status=active&q=react`.
- Cursor pagination: `?cursor=…&limit=20`, response `{ data, nextCursor }`.
- Errors: `{ error: { code, message, details? } }` — codes match `AppError` subclasses.

### Modules (one each)
`auth` (Better Auth mount), `users`, `courses`, `hierarchy`, `tasks`, `sessions`, `notes`, `bookmarks`, `resources`, `goals`, `habits`, `revisions`, `tags`, `reminders`, `notifications`, `attachments`, `analytics`, `search`.

Each module = `*.routes.ts` + `*.controller.ts` + `*.service.ts` + `*.repo.ts` + `*.dto.ts`.

---

## 8. Frontend architecture

### Routing
- `(public)` (or `/`) — marketing.
- `(auth)` — login / register / forgot / verify.
- `(app)` — protected shell (`sidebar` + `topbar` + `main`).

### Providers (root order)
1. `ThemeProvider` (next-themes) — sets `.dark` for Tailwind.
2. `QueryProvider` — TanStack Query.
3. `Toaster` — sonner.
4. `AuthHydration` — when needed.

### Read/write patterns
- **Initial render**: Server Component fetches via Drizzle.
- **Page-bound mutation**: Server Action.
- **Reused mutation** / **optimistic**: TanStack Query → `/api/v1`.

### Theming
Tailwind v4 `@theme` in `globals.css`. CSS variables per token; `data-theme` toggles dark. Accent color is a runtime CSS var from user settings.

### Motion
A small `motion-presets.ts` (Framer Motion) reused across pages — `pageTransition`, `stagger`, `fadeInUp`.

---

## 9. Component architecture

- `components/ui/*` — shadcn primitives (button, card, input, label, dropdown-menu, avatar, separator).
- `components/layout/*` — `Sidebar`, `Topbar`, `ThemeToggle`, `UserMenu`, `CommandPalette`.
- `components/data/*` — `StudyChart`, future `DataTable`, `Heatmap`.
- `components/feedback/*` — `EmptyMini`, `ComingSoon`, `Skeleton`.
- `components/motion/*` — Framer wrappers.

---

## 10. UI pages

Public: `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`.

App:
`/dashboard`, `/courses`, `/courses/[id]`, `/tasks`, `/calendar`, `/notes`, `/goals`, `/habits`, `/bookmarks`, `/analytics`, `/focus`, `/settings`, `/search`, `/inbox`.

---

## 11. Security architecture

- HTTPS-only cookies; `BETTER_AUTH_SECRET` ≥ 32 bytes.
- CSRF: same-site cookies + Better Auth.
- Rate limit: global + per-route (`/auth`, `/uploads`).
- Zod on every external boundary.
- Drizzle → parameterised SQL only.
- UploadThing: mime whitelist + size limits.
- Authorization: every controller checks `req.user.id === owner_id`.
- Secrets in env, never bundled. Pino redacts `*.password`, `*.token`.

---

## 12. Performance plan

- Server Components first; `prefetchQuery` for client handoff.
- Streaming + Suspense on heavy pages (dashboard).
- Recharts with server-side aggregation (≤ 30 points).
- `React.cache` for per-request dedupe.
- Cursor pagination everywhere.
- Optional Redis cache for `analytics_snapshots`.

---

## 13. Deployment

- **web** → Vercel (`pnpm --filter web build`, output `.next`).
- **api** → Railway / Fly / Render (`pnpm --filter api build`, start `node apps/api/dist/server.js`).
- **db** → Neon (pooled URL for API; direct URL for migrations).
- **migrations** → `pnpm db:migrate` in a release job.

---

## 14. Feature roadmap (in order)

1. Courses CRUD + templates + duplicate + archive.
2. Dynamic hierarchy (drag-drop, progress rollups).
3. Tasks (CRUD, recurring, board view).
4. Study sessions + Pomodoro + Focus mode.
5. Calendar views.
6. Notes (TipTap, Markdown, attachments).
7. Bookmarks & resources.
8. Goals (daily/weekly/monthly).
9. Habits + heatmap.
10. Revisions (SRS-style).
11. Tags + global search.
12. Notifications.
13. Analytics snapshots + charts.
14. Achievements / XP / levels.
15. Import / Export.
16. Command palette + keyboard shortcuts.
17. PWA / offline.
18. Workspaces / team sharing.

---

## 15. Non-goals (today)

- Marketing pages (we have one placeholder hero).
- Real-time multi-device sync (out of scope, would need WebSocket / Pusher).
- Native mobile apps.

These can ship later without architectural changes.