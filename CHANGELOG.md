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

## Proposed, not built (19 Nov replan)

- **P0:** opt-in anonymous measurement, a "Tell us what's confusing" button, and a "More tools" group for unproven features (net worth, goals, loan maths, insight card, activity history, advanced delete).
- **Then:** a 4-week pilot with 5 families; keep, cut or build based on what they do.
- **P1 if the pilot supports it:** Play Store listing, custom domain, welcome screen. **Later:** Account Aggregator bank data, a paid family plan test.
