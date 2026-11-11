# Paisa Planner (PWA)

A mobile-first monthly budget for Indian families: one number for what's left to spend, bills and EMIs that never slip, and an entry logged in seconds. Installable, offline-first, and free.

- **Device-only mode** (`config.js` empty): no sign-in, data stays on the phone. Move it with Settings → Data → Back up.
- **Family mode** (Supabase URL and key in `config.js`): Google sign-in, one shared budget per family, roles, invites by Gmail, live sync, offline edits that upload when back online, scheduled push reminders. Setup steps: **SETUP-SUPABASE.md**.

The full product, design and engineering map, plus the history of how the app got here, is in **docs/PAISA-PLANNER.md**.

## Files
| Path | What it is |
|---|---|
| `index.html` | The whole app: styles, logic and screens (vanilla JS, no build step) |
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
| `supabase/functions/send-reminders/` | Edge Function that sends bill, evening and weekly reminders |
| `SETUP-SUPABASE.md` | Step-by-step Supabase and Google sign-in setup |

## Host it (any static HTTPS host works)
- **GitHub Pages:** Settings → Pages → deploy from branch `main` (this is how it runs today)
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop
- **Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080

The service worker needs HTTPS (or localhost). Opening `index.html` directly as a file runs the app without offline support or install.

## Updating
Change files, then bump `VERSION` in `sw.js` (for example `paisa-v24`). Installed apps fetch the new version in the background; closing and reopening the app shows it.
