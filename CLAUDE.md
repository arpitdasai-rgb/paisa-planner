# Paisa Planner

Mobile-first monthly budget PWA for Indian families: one "left to spend" number, bills and EMIs that never slip, entries logged in seconds. Offline-first, installable, free.

## Read first
- `docs/PAISA-PLANNER.md`: the full product, design and engineering map (900 lines). Read the section you need, not the whole file: §2 screens, §3 design system, §5 architecture, §6 data model, §7 Supabase, §9 frontend, §10 money logic, §12 security, §13 testing, §14 deploying.
- `docs/PRODUCT-PLAN.md`: current ranked product plan. `CHANGELOG.md`: what changed.

## Stack
- Plain HTML/CSS/JS, **no build step**: the repo root is the site. Scripts load in order: `js/01-base.js` … `js/10-boot.js` (classic scripts, not modules).
- Supabase (Postgres + RLS + Edge Functions) for family mode; device-only mode when `config.js` is empty.
- Money rules shared by app and reminder service: `supabase/functions/_shared/money-core.js`.
- Hosted on GitHub Pages from `main`.

## Commands
- Run: `python3 -m http.server 8080` then http://localhost:8080
- Test: `npm install` once, then `npm test` (unit + browser); `npm run test:sweep` (every button); `npm run test:sql` (needs Postgres)
- CI: `.github/workflows/test.yml` runs on every push

## Rules
- **Every user-visible change: bump `VERSION` in `sw.js`** (e.g. `paisa-v31` → `paisa-v32`), or installed apps won't update.
- Money logic changes go in `money-core.js` and need a unit test.
- Schema changes go in a new `supabase/vN.sql`; never edit an applied migration. Keep row-level security on every table.
- `config.js` holds only public keys (anon key, VAPID public key). **Never** put the service_role key or any secret in the repo.
- Follow the design tokens in the last `:root` block of `css/app.css`; mobile stability rules in docs §3.5.
- Plain, friendly copy for Indian families; ₹ and Indian number format (lakh, crore).
- After meaningful changes, update `CHANGELOG.md` and the relevant section of `docs/PAISA-PLANNER.md`.
