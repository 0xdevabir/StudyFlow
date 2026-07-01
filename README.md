# StudyFlow

> Your personal learning operating system.

StudyFlow is a production-ready SaaS for organising **every** type of learning in one place — university courses, bootcamps, YouTube playlists, books, docs, custom roadmaps. It is **not** another LMS; it is a personal command centre for the way you actually learn.

---

## Highlights

- **Unlimited dynamic hierarchy** — model Programming Hero's *Module → Lesson*, a university's *Semester → Week → Lecture*, a book's *Chapter*, or anything in between.
- **Tasks, sessions, notes, bookmarks, goals, habits, revisions** — one timeline, all linked.
- **Beautiful by default** — Apple-level polish, dark mode, motion, command palette.
- **Production-grade stack** — Next.js 15 + React 19, Express, Drizzle ORM, PostgreSQL (Neon), Better Auth (email/password + Google), Tailwind v4, shadcn/ui.

---

## Monorepo structure

```
StudyFlow/
├── apps/
│   ├── web/          Next.js 15 frontend (App Router, React 19)
│   └── api/          Express REST API (TypeScript, Pino, Zod)
├── packages/
│   ├── db/           Drizzle schema, client, migrations, seed
│   ├── auth/         Better Auth (single source of truth)
│   ├── shared/       Zod DTOs, enums, types, constants
│   └── config/       Shared tsconfig / eslint presets
├── turbo.json        Turborepo pipeline
├── pnpm-workspace.yaml
└── .env.example      Documented environment variables
```

---

## Quickstart

> Requires **Node 20+** and **pnpm 9+**.

```bash
# 1. Install
pnpm install

# 2. Set up env (edit .env, then load it for the shell)
cp .env.example .env

# 3. Generate a strong auth secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Paste it into .env as BETTER_AUTH_SECRET
# Set DATABASE_URL (Neon or local Postgres)

# 4. Push schema and seed
pnpm db:push
pnpm db:seed

# 5. Run everything in parallel
pnpm dev
#   → web  http://localhost:3000
#   → api  http://localhost:4000
```

Open <http://localhost:3000> and sign up. To try Google login, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the Google Cloud Console (Authorized redirect URI: `${BETTER_AUTH_URL}/api/auth/callback/google`).

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start web (`:3000`) and API (`:4000`) in parallel via Turbo. |
| `pnpm build` | Production build of every workspace. |
| `pnpm lint` | ESLint across the monorepo. |
| `pnpm typecheck` | `tsc --noEmit` for every workspace. |
| `pnpm db:generate` | Generate SQL migration from Drizzle schema. |
| `pnpm db:push` | Push schema directly to the database (dev). |
| `pnpm db:migrate` | Apply generated migrations (CI / prod). |
| `pnpm db:seed` | Insert a demo user + sample course. |
| `pnpm db:studio` | Launch Drizzle Studio. |
| `pnpm format` | Prettier write. |

---

## How it fits together

```
Browser ── HTTPS ──▶ Next.js (apps/web)
                       │
                       ├── Server Components → Drizzle → Postgres (Neon)
                       ├── Server Actions   → Express API → Postgres
                       └── /api/auth/*      → Better Auth (Express mount, same DB)
                                            │
                                            ▼
                                       Redis (optional cache / rate-limit)
```

- **Better Auth** lives in `packages/auth` and is mounted on both apps (`/api/auth/*`).
- **Drizzle ORM** lives in `packages/db` and is imported by API and RSC.
- **DTOs / enums** live in `packages/shared` so the API and forms stay in sync.

---

## Roadmap

The project is built feature-by-feature. The current scope is the **foundation** + **Courses**:

✅ Monorepo, tooling, configs
✅ Complete Drizzle schema (all 22 tables) and migrations
✅ Better Auth (email/password + Google, email verification)
✅ Express API skeleton (Pino, Zod, rate limit, error handler)
✅ Next.js shell — sidebar, topbar, theme toggle, command palette trigger
✅ Real auth pages (login / register / forgot / verify)
✅ Real dashboard with seeded data, study chart, recent courses, upcoming tasks
✅ **Courses CRUD** — create, edit, archive, duplicate, delete. Filter by status/priority/text.
✅ **Dynamic hierarchy** — unbounded depth, drag-to-reorder, drop-into-child, inline add/rename/delete. Per-course stats (nodes, tasks, study minutes).
🚧 Next: Tasks (CRUD + board view), Sessions + Pomodoro, Calendar

**Next slices** (in order):
1. ~~Courses CRUD + templates + duplicate + archive~~ ✅
2. ~~Dynamic hierarchy (drag-and-drop, progress rollups)~~ ✅
3. Tasks (CRUD, recurring, board view) — **next**
4. Study sessions + Pomodoro + Focus mode
5. Calendar views
6. Notes (TipTap, Markdown, attachments)
7. Bookmarks & resources
8. Goals + Habits + Heatmap
9. Revisions (SRS-style)
10. Tags + global search
11. Notifications
12. Analytics snapshots + charts
13. Achievements / XP / levels
14. Import/Export (CSV, JSON)
15. Command palette + keyboard shortcuts
16. PWA / offline
17. Workspaces & team sharing

See [`STUDYFLOW_ARCHITECTURE.md`](./STUDYFLOW_ARCHITECTURE.md) for the full architectural blueprint.

---

## Deployment

- **web** → Vercel (Next.js). Set env: `NEXT_PUBLIC_API_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- **api** → Railway / Fly / Render (Node). Set env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `PORT`, `LOG_LEVEL`. Start command: `node apps/api/dist/server.js`.
- **db** → Neon. One DB per environment. Run migrations with `pnpm db:migrate` in a release job before deploying the API.

---

## License

UNLICENSED — personal/educational build. Add a license of your choice before public release.