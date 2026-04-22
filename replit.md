# شركة سنك — Sink Inventory

Arabic (RTL) inventory management system for a car-parts company.
Dark navy theme, Noto Kufi Arabic font, right-side sidebar, full role-based access.

## Stack
- pnpm monorepo
- Backend: Express + drizzle-orm + node-postgres + express-session
- Frontend: React + Vite + TanStack Query + wouter + shadcn/ui + Tailwind + Recharts + xlsx
- DB: Replit PostgreSQL (DATABASE_URL)

## Artifacts
- `artifacts/api-server` — Express API (port from `PORT`, base `/api`)
- `artifacts/snk-inventory` — React frontend mounted at `/`
- `artifacts/mockup-sandbox` — design sandbox (unused for production app)

## Features
- Auth: login/logout/me, change username/password — express-session, custom hash (no bcrypt)
- Roles: `admin` (full), `user` (locked to assigned warehouse), `auditor` (read-only)
- Products: CRUD + search + Excel import/export (xlsx)
- Movements: in/out per warehouse, auto-updates product stock, reverse on delete
- Invoices: multi-line, auto-deducts stock, generates print HTML
- Warehouses: admin-only CRUD
- Users: admin-only CRUD with role + assigned warehouse
- Settings: company info + currency
- Logs: append-only audit trail
- Reports: sales / stock / profit with date filtering, charts, Excel export, print
- Dashboard: stats grid, top products bar chart, recent movements

## Default Accounts (seeded on first run)
- admin / admin123
- user / user123 (assigned to المخزن الرئيسي)
- auditor / auditor123

## Key files
- `lib/db/src/schema/index.ts` — drizzle schema
- `lib/api-spec/openapi.yaml` — OpenAPI spec (codegen target)
- `lib/api-zod/src/index.ts` — must remain `export * from "./generated/api"` only
- `artifacts/api-server/src/lib/{session,auth}.ts` — session + auth helpers
- `artifacts/api-server/src/routes/*` — all route handlers
- `artifacts/api-server/src/seed.ts` — seeds initial data idempotently
- `artifacts/snk-inventory/src/lib/{api,app-context}.tsx` — client + global state

## Constraints
- `RECORD_LIMIT = 999` total records (products + movements + invoices)
- Non-admin users with an assigned warehouse have it forced server-side
