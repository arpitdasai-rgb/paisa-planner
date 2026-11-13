# Paisa Planner (PWA)

A mobile-first monthly budget for Indian families: one number for what's left to spend, bills and EMIs that never slip, and an entry logged in seconds. Installable, offline-first, and free.

- **Device-only mode** (`config.js` empty): no sign-in, data stays on the phone. Move it with Settings → Data → Back up.
- **Family mode** (Supabase URL and key in `config.js`): Google sign-in, one shared budget per family, roles, invites by Gmail, live sync, offline edits that upload when back online, scheduled push reminders. Setup steps: **SETUP-SUPABASE.md**.

The full product, design and engineering map, plus the history of how the app got here, is in **docs/PAISA-PLANNER.md**.

## Files
| Path | What it is |
|---|---|
| `index.html` | Shell: loads the stylesheet and scripts in order (no build step) |
| `css/app.css` | All styles |
| `js/01-base.js` … `js/10-boot.js` | The app, in ten ordered classic scripts (see docs/PAISA-PLANNER.md §9.1) |
| `supabase/functions/_shared/money-core.js` | Money rules shared by the app and the reminder service |
| `config.js` | Supabase URL, anon key and public reminder key (leave empty for device-only mode) |
| `sw.js` | Service worker: offline app shell, cached libraries, push notifications |
| `manifest.webmanifest` | Install name, icons, colours, shortcuts, Android share target |
| `fonts/` | Manrope (self-hosted, OFL licence) |
| `icons/` | App icons (192, 512, maskable, Apple touch, SVG) |
| `privacy.html`, `terms.html` | Privacy policy and terms |
| `supabase/schema.sql` | Tables, row-level security and family functions (run first) |
| `supabase/push.sql` | Phone push addresses for reminders |
| `supabase/v2.sql` | Bank accounts, repeats, net worth, delete my account |
| `supabase/v3.sql` | Recently deleted shared across the family |
| `supabase/v4.sql` | Family edits merge field by field instead of overwriting |
| `supabase/functions/send-reminders/` | Edge Function that sends bill, evening and weekly reminders |
| `SETUP-SUPABASE.md` | Step-by-step Supabase and Google sign-in setup |
| `tests/` | SQL, unit and browser tests; run on every push by `.github/workflows/test.yml` |

## Host it (any static HTTPS host works)
- **GitHub Pages:** Settings → Pages → deploy from branch `main` (this is how it runs today)
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop
- **Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080

The service worker needs HTTPS (or localhost). Opening `index.html` directly as a file runs the app without offline support or install.

## Testing
- `npm install` then `npm test` (unit + browser), `npm run test:sweep` (every button), `npm run test:sql` (needs a Postgres; see `tests/sql/run.sh`).

## Updating
Change files, then bump `VERSION` in `sw.js` (for example `paisa-v24`). Installed apps fetch the new version in the background; closing and reopening the app shows it.
