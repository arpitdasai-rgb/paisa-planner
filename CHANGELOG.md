# What changed

Grouped by the kind of change, newest work last within each group. Dates are 2026. For the reasons behind each stage, see `docs/PAISA-PLANNER.md` §15; for what's planned next, see `docs/PRODUCT-PLAN.md`.

## Added

**Core (10 Nov)**
- Monthly budget in five sections with budget vs actual; entries; bills and EMIs with due dates; carry-forward between months; yearly report; Excel import with a step-by-step check; export picker (Excel, CSV, PDF, backup).
- Installable app (PWA) that works offline; device-only mode with no sign-in.
- Family mode: Google sign-in, one shared budget, roles (Owner, Admin, Member, Viewer), invites by Gmail, live sync, offline outbox (Supabase, Mumbai).
- 60-second first run; category guessing and merchant memory; questions asked at the moment they're useful; month-end wrap.
- Loans with payoff dates; goals (save up, yearly payment, clear a loan).

**Staying on track (11 Nov)**
- Warnings: plan above income, spending pace, 80% of a category.
- Scheduled push reminders: bills, evening nudge, weekly summary, at each person's chosen time.
- Bank accounts (last 4 digits only), self transfers, repeats, split entries, share an SMS to the app (Android), net worth, privacy policy and terms, hide income from members, delete my account.
- One ranked "Needs you" list with placement rules.
- Delete data (choose what, which period, which entries) with a money-impact preview, Undo and 30-day Recently deleted; Start fresh; select mode on Entries.
- Help & FAQ with search (now 60 answers).

**Trust and habit (13 Nov)**
- Card bills linked to their card.
- Type or paste entries ("350 swiggy" or a bank SMS), on every phone.
- Weekly bank check that can log a missed amount; starting money from the banks.
- Bank statement matching (adds only what's missing).
- Your habits page (the PRD's own success measures).
- Card statement reminders.
- Pace ribbon on Today; the number counts to its new value; petals when every bill is done.

**Engineering (11–13 Nov)**
- One shared copy of the money rules for the app and the reminder service.
- Family edits merge field by field (`supabase/v4.sql`); the app loads only what changed.
- Tests in the repo (database on Postgres, money rules, reminder logic, 19 browser suites, an every-button sweep, accessibility) running on every push.

**Docs**
- `docs/PAISA-PLANNER.md` (product, design and engineering map), `docs/PRODUCT-PLAN.md` (this replan), this file.

## Changed

- **Look:** three redesigns. The first was a calm list layout; the second was a monochrome premium style with a dark nav and a centre add button; the third and current one is **Bahi** (paper and ink, Fraunces numbers, marigold accent, gullak icon). Fonts went Inter → Manrope → Manrope plus Fraunces.
- **Navigation:** Home/Budget/Wallet/More → **Today/Month/Money/More**. Bills now belongs to Month.
- **Month page:** from five spreadsheet sections to **money in, commitments, savings and free to spend**.
- **Settings:** from one long page to tiles with sub-pages. More and Family were rebuilt.
- **Add entry:** an Expense/Income/Self transfer switch, a calmer layout, type or paste, and Done saves only when the category is certain.
- **Reminders:** fixed times became each person's own times, run hourly.
- **Wording:** plain words throughout ("Money at the start", "Paid out", "Free to spend"); sentence-case labels instead of tracked capitals (19 Nov).
- **Code:** one 350 KB file → a 2 KB shell, a stylesheet and ten ordered scripts (no build step).
- **Accessibility (13 and 19 Nov):** correct roles on switches; spoken labels match visible text; keyboard-reachable table; ink focus ring with marigold halo; skip-to-content button; every text colour at AA contrast.
- **Icons (19 Nov):** SVG instead of text characters.

## Removed

- The original "remote" storage mode from the first artifact version, and seven unused functions, two dead actions and 28 unused style rules (engineering audit, 11 Nov).
- More's duplicate Money grid (13 Nov).
- The old blue app icon and blue policy-page colours (13 Nov).
- "· You" on every entry when you're the only person (19 Nov).
- Trailing "›" on text links, and the ruled lines behind the Today number (19 Nov).
- Google Fonts requests (fonts ship with the app).

## Fixed (notable)

- Credit card spending counted twice when the bill was also logged as an expense; card bills paid by transfer still showing overdue (11 Nov), including in server reminders (11 Nov) and after renaming (13 Nov).
- iPhone: zoom on tap, rubber-band bounce, keyboard over the number pad and over sheets.
- New account balances off by entries from the same day; 320px layouts overflowing; toasts blocking taps; dark text on a dark card colour (19 Nov).

## 20 Nov: simpler flows (one-screen replan, calmer Settings, one thing at a time)

**Changed**
- **Replan is one screen.** "Plan November" shows free to spend, with last month's plan carried over and the lines that changed named. Tap **Change** on starting money, bills or savings to edit just that; the number updates as you type. **Save plan** is always visible. The 5-step walkthrough is still there behind **Step by step**.
- **Settings has three groups:** Your family, Reminders, and **Everything else** (folded away: help, backup, app lock, privacy, delete). The choice to keep it open is remembered.
- **Today shows one thing at a time:** catch-up or the month's start card, never both; the next-step nudge hides while either shows; "Needs you" shows the most urgent one or two with "Show N more".
- **Card and transfer features appear only when they apply:** "Self transfer" needs two accounts or cards; the Credit cards tile and row appear once a card exists (add one from Money → + Add).
- What's new and the replan FAQ answer describe the new flows. App version `paisa-v35`.

**Fixed**
- **Reminder schedule timing out.** Supabase's scheduler gave up after 5 seconds, and a cold start plus the work took just over that, so since about 20:30 on 19 Nov no hourly run finished. The live job now waits up to 30 seconds (first run after the fix: 200 OK). The schedule the app gives Owners in Reminder setup includes the longer wait too.

**Tests**
- Updated journeys (one-screen plan, live preview, step-by-step and back, save), sheet-with-keyboard, delete, statement match, feature and money suites for the new layout. `ONLY=feat,del npm run test:e2e` runs chosen suites.

## 19 Nov: journeys for new, existing and invited users

**Added**
- **Try it first:** use Paisa on the phone without signing in; "Sign in to share" in Settings copies it into a family budget later.
- **What's new:** shown once to existing users after an update, with a button to replan.
- **Start / Replan the month:** 5 steps (salary in?, starting money, bills and EMIs, savings, then free to spend). Offered on Today in a month's first 10 days, and always on the Month page.
- **Catch up:** after 7+ days without an entry, a no-guilt card: match a statement, add what you remember, or start from today (opens a bank check).
- **Member welcome:** an invited person's role in plain words, a first entry, then install and reminders.
- **First run:** setup opens "Log one thing you spent today", then "Keep Paisa one tap away" (install steps for their phone and reminders).
- **Feedback:** "Something confusing? Tell us" on main screens and in Settings; the note and screen name go to the team.
- **Opt-in usage counts:** off by default; anonymous counts only. The privacy policy has a new section.
- **Owner "Finish database updates"** in Settings when the database is behind (`v5.sql` adds the version check).
- **Nudges:** "Link [card] to its bill"; an "Add entry" home-screen shortcut.

**Changed**
- Setup is 3 questions; the household question moved to the invite moment.
- New owners skip the budget-name form (rename later).
- The weekly bank check asks about one account a week.
- Money keeps the everyday tiles (Repeats, Credit cards).
- **More tools** (in More) now holds goals, loans, net worth, activity and the yearly report.
- Delete data shows entries first, with other kinds behind "More kinds of data".

**Fixed after real use (iPhone)**
- Replan and Delete data with the keyboard open: the Back/Next bar floated mid-sheet and the page showed through. The sheet now has a fixed header, a scrolling middle and buttons at the bottom, so they sit right above the keyboard. A focused field scrolls into view, and the whole screen stays dimmed behind the sheet.

**Removed from the everyday screens**
- The spending insight card on Today.
- Loans, goals and net worth tiles on Money (now in More tools).
- Activity on the Family page (now in More tools).

## Database updates applied to the live project (paisa-planner)

| File | Applied | How |
|---|---|---|
| `schema.sql`, `push.sql`, `v2.sql`, `v3.sql` | Before 19 Nov | By hand in the SQL Editor |
| `v4.sql` (field-by-field merges) | 19 Nov 2026 | Supabase connector, recorded as migration `v4_field_merges` |
| `v5.sql` (usage counts, feedback, version check) | 19 Nov 2026 | Supabase connector, recorded as migration `v5_counts_feedback_version` |
| `v6.sql` (security hardening from the advisors) | 19 Nov 2026 | Supabase connector, recorded as migration `v6_security_hardening` |
| `send-reminders` function (uses the shared `money-core.js`, card statement reminders) | 19 Nov 2026 | Supabase connector, version 3, JWT check off (it checks its own cron secret) |
| Reminder schedule (`paisa-hourly`): wait up to 30 s instead of 5 s | 20 Nov 2026 | Supabase connector, `cron.alter_job`; secret left unchanged |

Checked after applying: signed-out callers can no longer run any family function; signed-in people still can; the sign-up helper can't be called; anyone can send feedback or counts but nobody can read them through the app. Security advisors left with three expected notes: signed-in people can run the family functions (that's how the app works; each checks who's calling), `pg_net` sits in the public schema (moving it risks the reminder schedule), and leaked-password protection (not used: sign-in is Google only).

## Proposed, not built (19 Nov replan)

- **P0:** opt-in anonymous measurement, a "Tell us what's confusing" button, and a "More tools" group for unproven features (net worth, goals, loan maths, insight card, activity history, advanced delete).
- **Then:** a 4-week pilot with 5 families; keep, cut or build based on what they do.
- **P1 if the pilot supports it:** Play Store listing, custom domain, welcome screen. **Later:** Account Aggregator bank data, a paid family plan test.
