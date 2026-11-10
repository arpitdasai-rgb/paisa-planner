# Paisa Planner (PWA)

Installable, offline-first version of the monthly finance tracker.

- **Device-only mode** (default, `config.js` empty): no sign-in, data stays on the phone. Use Settings → Back up / Restore to move it.
- **Family mode** (Supabase URL and key in `config.js`): Google sign-in, one shared budget per family, roles, invites by Gmail, live sync, offline edits that upload when back online. Setup steps: **SETUP-SUPABASE.md**.

## Files
- `index.html`: the whole app
- `config.js`: your Supabase URL and anon key (leave empty for device-only mode)
- `supabase/schema.sql`: database tables, row-level security and family functions (run once in Supabase)
- `SETUP-SUPABASE.md`: step-by-step Supabase and Google sign-in setup
- `manifest.webmanifest`: install name, icons, colours, shortcuts
- `sw.js`: service worker (offline cache, reminder taps open the Bills screen)
- `icons/`: app icons (192, 512, maskable, Apple touch, SVG)

## Host it (any static HTTPS host works)
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop
- **GitHub Pages:** push the folder to a repo, then Settings → Pages → deploy from branch
- **Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080

The service worker needs HTTPS (or localhost). Opening `index.html` directly as a file runs the app without offline support or install.

## Updating
Change files, then bump `VERSION` in `sw.js` (e.g. `paisa-v2`). Open apps show an "Update" banner.
