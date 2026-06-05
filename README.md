# FleetOps — Modern Fleet Management

A modern, professional fleet management SaaS inspired by Uber's operations dashboard.
Built with Next.js 16, Tailwind v4, Framer Motion, Recharts, and Mapbox on the frontend,
backed by a JWT-authenticated Express API with role-based access control.

## Quick start (Phase 2 — full stack)

You need **two terminals**.

**Terminal 1 — backend:**
```bash
cd backend
npm install
npm run dev
# → http://localhost:4000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Open http://localhost:3000 and use either demo account (credentials are pre-filled on the login page):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fleetops.io` | `password123` |
| Driver | `driver@fleetops.io` | `password123` |

There's also a **"Skip the form — sign me in as demo"** button that calls `/api/auth/demo-login` for one-click access.

The topbar has an Admin/Driver toggle that re-issues a token for the other role on the fly, so you can flip without logging out.

## Project layout

```
FleetPilot/
├── frontend/                 Next.js 16 · React Query · Tailwind v4 · Framer Motion · Recharts · Mapbox · Sonner
└── backend/                  Express · JWT · bcrypt · zod (in-memory store, no DB required)
```

## Backend

The backend uses a **simple in-memory store** seeded on every boot — no MongoDB install needed for testing. Data resets on restart.

**Endpoints (all `/api/*`):**

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | — | Email + password login → `{ token, user }` |
| POST | `/auth/demo-login` | — | One-shot token for `{ role: "admin" \| "driver" }` |
| GET | `/auth/me` | any | Current user from bearer token |
| GET | `/drivers` | any | List drivers |
| GET | `/drivers/me` | driver | Current driver record |
| GET/PATCH/DELETE | `/drivers/:id` | admin (writes) | CRUD |
| POST | `/drivers/me/location` | driver | Update own lat/lng |
| GET | `/shifts` | any | Admin: all; Driver: own |
| POST/PATCH/DELETE | `/shifts/:id?` | admin | CRUD |
| POST | `/shifts/:id/respond` | driver | Accept/decline pending |
| POST | `/shifts/:id/clock-in` \| `/clock-out` | driver | Clock in/out |
| GET | `/events` | any | List events |
| POST | `/events` | admin | Create event |
| PATCH | `/events/:id` | admin | Update event |
| DELETE | `/events/:id` | admin | Delete event |
| POST | `/events/:id/rsvp` | any | RSVP |
| GET | `/alerts` | any | Role-scoped list |
| PATCH | `/alerts/:id/read` | any | Mark read/unread |
| DELETE | `/alerts/:id` | any (own) | Delete |
| GET | `/stats/dashboard` | admin | KPI + recent activity |
| GET | `/stats/reports` | admin | Charts data |

**Validation:** the events endpoint validates with `zod` and returns a structured 400 with `details` if any field is missing.

**RBAC:** middleware `requireRole(...)` blocks unauthorized writes. A driver attempting `POST /events` gets a `403`.

## Frontend

- **Auth** — JWT stored in `localStorage` (`fleetops:token`), bearer-injected by the `api()` client, restored on page load via `/auth/me`. Dashboard layout redirects to `/login` when unauthenticated.
- **Data layer** — `@tanstack/react-query` with typed hooks in [`src/lib/queries.ts`](frontend/src/lib/queries.ts). Mutations invalidate their parent query so the UI stays in sync.
- **Toasts** — `sonner` notifies on every mutation success/failure.

**Pages**

| Route | Role | Highlights |
| --- | --- | --- |
| `/login` | — | Role-tabbed sign-in, demo button, password toggle |
| `/dashboard` | both | Admin: KPIs + fleet activity chart + recent activity + on-shift list. Driver: clock-in/out, active shift, alerts |
| `/events` | both | Cards grid + detail modal. **Admin:** create / edit / delete (form with validation + confirm). **Driver:** RSVP |
| `/alerts` | both | Tabbed list, mark-all-read, per-row mark-read & delete (real backend mutations) |
| `/drivers` | admin | Table with filters, search, slide-out detail drawer |
| `/live-map` | admin | Mapbox map with driver markers (placeholder if no token) |
| `/shift-reports` | admin | Line + bar + pie charts, top performers, KPIs |
| `/shifts` | driver | Calendar strip, Upcoming/History/Pending tabs, accept/decline + clock in/out |
| `/profile` | driver | Editable info, license card, documents |

**Optional — real Mapbox tiles**

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

## Design system

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#F4A300` | Uber-style accent — buttons, active nav, highlights |
| `--sidebar` | `#0F172A` | Dark left sidebar |
| `--background` | `#F8FAFC` | Page background |
| `--surface` | `#FFFFFF` | Cards, modals |
| `--foreground` | `#0F172A` | Primary text |
| `--muted` | `#64748B` | Secondary text |
| Font | Inter (via `next/font/google`) | All UI |

Cards: 16px rounded corners, soft layered shadows, 200ms hover lift. Entry animations use Framer Motion with `[0.22, 1, 0.36, 1]` easing.

## What's next (Phase 3 — production-ready)

1. Swap the in-memory store for MongoDB — restore the Mongoose models from git history
2. Refresh tokens + secure cookie storage
3. WebSocket / SSE for live driver location updates
4. Backend tests (Vitest)
5. Docker compose for one-command deploy
