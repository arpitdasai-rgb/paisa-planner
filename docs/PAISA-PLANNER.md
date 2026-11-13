# Paisa Planner: product, design and engineering map

*Version: paisa-v29 · 13 November 2026 · Owner: Arpit Das*

This document maps everything about Paisa Planner, in this order:
1. **Product:** why it exists, who it's for, what it does.
2. **Design:** the design system and the messaging rules.
3. **Backend:** the database, security and the reminder service.
4. **Frontend:** the app's structure, screens and offline behaviour.
5. **Logic:** the money calculations.
6. **Quality and operations:** testing, deployment, privacy.
7. **The journey:** how the app reached this version, change by change.

It is written for anyone joining the project: a product manager, designer or engineer should be able to find any part of the app from here.

---

## Contents

1. [Product](#1-product)
2. [Information architecture and screens](#2-information-architecture-and-screens)
3. [Design system](#3-design-system)
4. [Messaging system](#4-messaging-system)
5. [Architecture overview](#5-architecture-overview)
6. [Data model](#6-data-model)
7. [Backend: Supabase](#7-backend-supabase)
8. [Reminders: push notifications](#8-reminders-push-notifications)
9. [Frontend engineering](#9-frontend-engineering)
10. [Money logic](#10-money-logic)
11. [Feature reference](#11-feature-reference)
12. [Security and privacy](#12-security-and-privacy)
13. [Quality: how the app is tested](#13-quality-how-the-app-is-tested)
14. [Deploying and operating](#14-deploying-and-operating)
15. [The journey: how we got to this version](#15-the-journey-how-we-got-to-this-version)
16. [Engineering audit (this version)](#16-engineering-audit-this-version)
17. [Known limits and what's next](#17-known-limits-and-whats-next)
18. [Appendix](#18-appendix)

---

## 1. Product

### 1.1 Why it exists

Paisa Planner replaces a personal Excel finance tracker. The spreadsheet's structure worked: five sections (Income, Savings, Bills, Expenses, Debt) with Budget vs Actual. But it failed month to month:
- totals were typed by hand;
- formula bugs went unnoticed (a "Spent %" of −667%);
- every month meant copying a tab;
- nothing warned before a bill was missed.

In the PRD's example month, credit card payments ran ₹40,000 against a ₹20,000 budget and the month closed at −₹300, with no warning at any point.

**Vision (from the PRD):** open the app and see **one number** (left to spend this month) and **one warning** (what needs attention). Add an expense in **under 5 seconds**. Get through month-end with **no manual maths**.

### 1.2 Who it's for

| Persona | Profile | Main need |
|---|---|---|
| Primary (Arpit) | Salaried, Indian metro, one pay cheque, home and personal loans, SIPs, pays by UPI and credit card | Know what's left this month; never miss an EMI; keep cards under budget |
| Planner couple | Two incomes, school fees, insurance | One shared view of family money; plan yearly payments |
| Beginner | First job, no loans | Simple spending awareness and a first savings goal |

### 1.3 Goals and non-goals

**Goals:**
1. Logging faster than not logging (≤5 seconds, ≤3 taps).
2. An always-accurate "left to spend", with automatic carry-forward.
3. No missed bills, EMIs or part-paid cards.
4. Month-by-month trends without setup.
5. The bigger picture: loans, cards, goals, net worth.

**Non-goals:**
- moving money or paying bills from inside the app;
- investment advice, credit scores or lending;
- GST bookkeeping;
- one person in several families.

### 1.4 Product principles (how decisions were made)

1. **One number, one warning.** Home leads with "Left to spend" and the single most urgent action. Everything else is one tap away.
2. **Ask at the moment it's useful.** No setup forms up front. Paisa asks for a bill's due day after the first payment, for loan details after the first EMI, and to invite a partner when spending suggests a shared household.
3. **Calm by default, loud only when it matters.** Colour is reserved for status. Warnings are ranked, capped and can be hidden for the month (§4).
4. **Plain words.** "Money at the start" instead of "opening balance". "Paid out" instead of "outflow".
5. **Never lose data.** Every delete goes to Recently deleted for 30 days, with Undo for 10 seconds. A backup is always one tap away.
6. **Works offline, feels native.** Installable PWA, instant start, no iPhone zoom or bounce, no layout jumps.
7. **Private by design.** Device-only by default. Family data is protected by database-level rules. Only the last 4 digits of an account number are stored.

### 1.5 Where we went beyond the PRD (first-principles rethink, 13 Nov)

The PRD assumed people would type every expense and that a carried-forward balance is good enough. Working from what must be true for the app to be useful at all, we changed five assumptions:

| What must be true | The PRD assumed | What we built instead |
|---|---|---|
| **The number must match the bank**, or people stop trusting it | Money at the start carries over from last month | A **weekly bank check** in Needs you; a gap is logged as missed spending in one tap; the month can **start from what the banks held** (minus card dues) |
| **Typing every expense doesn't last** | Manual entry, with SMS detection on Android only | **Type or paste** on every phone ("350 swiggy" or a bank SMS); **bank statement matching** that adds only what's missing |
| **Rules must survive renaming** | Card bills recognised by their name | Card bills **linked to the card**; one shared copy of the money rules for the app and the reminder service |
| **A family edits at the same time** | One shared record per month | **Field-level merges** on the server (`v4.sql`), so two people's edits both survive |
| **You can't improve what you don't measure** | Success metrics in the PRD, never measured | **Your habits**: the PRD's own targets (5-second entry, 4 days a week, months closed, late payments) worked out from the family's data |

It also reshaped the plan itself: people think in **commitments, savings and free to spend**, not five spreadsheet sections, and in **how often** they do things. So the tabs became **Today / Month / Money / More**.

---

## 2. Information architecture and screens

### 2.1 Navigation

The bottom bar is dark, with a raised centre **+**:

```
 Today   Month   [ + ]   Money   More
```

The tabs follow how often things happen: **Today** (the number, adding entries, what's due), **Month** (the plan and bills), **Money** (accounts, cards, loans, goals, net worth), **More** (search, family, settings, help). Routes keep their original names (`#home`, `#budget`, `#plan`), so links and tests still work.

- **+** opens Add entry from anywhere.
- The bar and **+** hide while the keyboard is open.
- Sub-pages highlight their parent tab: Entries → Today; Bills → Month; Family, Settings, Yearly report, Help and Your habits → More.

### 2.2 Screen map (hash routes)

| Route | Screen | Reached from | Purpose |
|---|---|---|---|
| `#home` | Home | Tab | Left to spend, main action, Needs you, Coming up, charts |
| `#budget` | Month plan | Tab | Money in, commitments, savings and free to spend; Bills summary; categories grouped the same way; Edit budgets, Starting money, How it adds up, Clear month |
| `#plan` | Money | Tab | Bank accounts and cards as a card stack; Money matters tiles: Loans, Goals, Repeats, Net worth, Cards |
| `#more` | More | Tab | Search (entries, categories, features, help); shortcuts; Manage list (Family, Repeats, Cards, Import & export, Settings, Your habits, Help) |
| `#transactions` | Entries | Home → Recent, More | Month's entries with filters, swipe edit/delete, Select mode |
| `#bills` | Bills & EMIs | Month, Today → All bills | Overdue / This week / Later / Done; Paid, Skip |
| `#reports` | Yearly report | Home chart icon, More | Income, outflow, savings rate, month table, export |
| `#family` | Family | More, Settings | People row, invites, roles, activity (cloud); backup (device-only) |
| `#prefs` | Settings | Home gear, More | Tiles: Budget, Security, Data, About, Danger; each opens a sub-page |
| `#help` | Help & FAQ | More, Settings → About, More search | 59 answers in 10 topics with search |
| `#habits` | Your habits | More | The PRD's success measures from the family's own data |
| `#pushsetup` | Reminder setup | Settings (Owner only) | One-time server setup for scheduled reminders |
| `#add` | (deep link) | Notifications, home-screen shortcut | Opens Home with Add entry |

### 2.3 Sheets (bottom pop-ups)

Most actions open a sheet instead of a page:
- Add entry, the month breakdown, category, account, card, statement, loan, goal and asset editors;
- export, import, **Match a bank statement**, Delete data, Start fresh;
- invites, roles, activity, the member menu;
- check balance (with log-the-difference), the month-end wrap and confirm dialogs.

While a sheet is open, the page behind it is `inert`: it can't be tapped, scrolled or focused.

---

## 3. Design system

### 3.1 Visual language

The redesign borrowed patterns (not branding) from premium Indian fintech apps:
- a monochrome palette;
- one hero number per screen;
- pill controls;
- uppercase tracked labels;
- circular icon wells;
- a card stack for accounts and cards;
- generous whitespace.

### 3.2 Tokens (CSS custom properties on `:root`)

| Group | Tokens |
|---|---|
| Surfaces | `--bg #F4F4F2`, `--surface #FFF`, `--sunk #EDEDEA`, `--hero #F1F1EE`, `--line #E3E3DF` |
| Ink | `--ink #121314`, `--muted #6A6D70`, `--accent #111213` (black is the accent) |
| Navigation | `--nav #0D0E0F`, `--nav-ink #8C8F93` |
| Status (the only colour) | `--good #1D7F52`, `--bad #BF3328`, `--warn #9A6411`, plus `-soft` backgrounds |
| Charts | `--c-income`, `--c-savings`, `--c-bills`, `--c-expenses`, `--c-debt` |
| Spacing | `--sp1 4px` … `--sp6 32px` (4/8 grid) |
| Type scale | `--t-cap 12` · `--t-sm 13` · `--t-md 14` · `--t-body 16` · `--t-lg 20` · `--t-xl 24` · `--t-2xl 32` · `--t-hero 44` |
| Touch | `--tap 44px` minimum target |

Dark mode redefines the same tokens under `prefers-color-scheme: dark` (background `#0C0D0E`).

### 3.3 Typography

**Manrope** (variable, weights 200–800) is self-hosted:
- Two `woff2` subsets: Latin, and Latin-ext, which includes ₹.
- The Latin subset is preloaded.
- A metric-matched local fallback (`Manrope Fallback`: Arial with size-adjust and ascent/descent overrides) means text doesn't reflow when the font arrives.
- No request goes to Google.

The font was Inter until 11 Nov; we switched for a warmer, rounder look with the same clarity in numbers.

### 3.4 Components

| Component | Class | Use |
|---|---|---|
| Hero | `.hero3` | Home's left-to-spend block with the pill toggle |
| Pill button | `.pillbtn` | One main action per area |
| Chip | `.chip` (`aria-pressed`) | Choices and filters |
| Segmented control | `.seg` | Two or three exclusive options |
| Tile list | `.tgroup` + `.tcard` + `.trow` | Settings, More → Manage, Delete data |
| Card stack | `.pcard g0–g5` | Wallet accounts and cards, with six gradients |
| Row | `.row` | Entries, bills, categories |
| Sheet | `.scrim` + `.sheet` | All pop-ups |
| Toast | `.toast` | Confirmations with optional Undo; only the button catches taps |
| Eyebrow | `.eyebrow` | Uppercase section labels |
| FAQ | `.faqs` + `details.faq` | Help answers |
| Step bar | `.dsteps` | Multi-step sheets (Delete data) |
| Selection bar | `.selbar` | Entries select mode |

### 3.5 Mobile stability rules

These came from a dedicated iPhone pass:
- Every input is **16px**, so Safari never zooms.
- `overscroll-behavior: none` on the page (no rubber-band drag); `contain` inside sheets.
- Sheets size to `visualViewport` (`--vvh`), so they stay above the keyboard.
- `body.kb` hides the bottom bar while typing.
- Re-renders wait while someone is typing and keep the scroll position.
- Sheets that are already open swap content in place instead of replaying the slide-up.
- Opening a sheet blurs any focused field behind it and makes the page `inert`, so the keyboard can't pop up over the number pad.
- Narrow phones (≤400px, ≤360px) get a short month label ("Nov ’26"), wrapping budget rows and smaller pill text.
- There's no sideways overflow at 320px.

---

## 4. Messaging system

Every in-app prompt is defined once in the `MSG` registry. `needsItems(k)` returns a ranked list.

| Rank | Meaning | Examples | Can be hidden? |
|---|---|---|---|
| 1 | Act now | Overdue bill or EMI | No |
| 2 | To confirm | Repeats due today (salary, SIP) | No |
| 3 | Heads-up | Category at 80%, spending pace, plan above income | Yes, for the month |

**Placement rules on Home:**
1. **Hero:** left to spend, the per-day line, and one main action. That's the most urgent unpaid bill, or "Add expense" when nothing is due.
2. **Needs you:** up to 3 items. It never repeats the hero's action. The badge on "This month" counts the same items.
3. **Coming up:** the next 2 bills.
4. **Setup nudge** (next step): only when nothing is rank 1.
5. **Insight** (e.g. "Eating out is heading 40% above usual"): only when there are no needs and no nudge.
6. Charts are folded under "Where the money went".

**Other messaging rules:**
- **In-the-moment questions:** after saving, Paisa may ask one thing (a due day, loan details, an invite). Each question is asked at most once (`paisa-ask-*`).
- **Toasts** confirm every save. After an everyday expense they show the new per-day amount.
- **First-time tips** (swipe, transfers) show once.

---

## 5. Architecture overview

```
┌──────────────────────── Phone (PWA) ─────────────────────────┐
│ index.html (shell) + css/app.css + js/01–10 (vanilla JS)     │
│ money-core.js: shared money rules (also used by the server)  │
│   store adapter ──► local mode: localStorage 'paisa-local'   │
│                └──► cloud mode: Supabase (cache + outbox)    │
│ sw.js: offline shell, library cache, push display            │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS (supabase-js 2.45.4)
┌───────────────▼──────────────── Supabase (Mumbai) ───────────┐
│ Auth: Google sign-in                                         │
│ Postgres: profiles, families, family_members, invites, docs, │
│           push_subscriptions   + row-level security          │
│ RPC functions: family management, push subscriptions,        │
│           delete my account, patch_doc (field-level merges)  │
│ Realtime: docs + family_members changes                      │
│ Edge Function send-reminders ◄── pg_cron 'paisa-hourly'      │
└───────────────┬──────────────────────────────────────────────┘
                │ Web Push (VAPID)
          Phone notification ──► sw.js ──► opens #bills / #add
```

**Why plain files with no build step:**
- The app started as one file inside an artifact; on 13 Nov it was split into a 2 KB `index.html` shell, `css/app.css` and ten ordered scripts in `js/` (§9.1).
- Any static host works (GitHub Pages today) and there's no toolchain to maintain.
- The scripts are classic scripts loaded with `defer`, so they run in order after the page is parsed and share globals exactly as the single file did.
- **One copy of the money rules** (`supabase/functions/_shared/money-core.js`) is an ES module: the app loads it first (it sets `globalThis.PaisaCore`), and the reminder service imports it. The app and the server can no longer disagree about dates, budgets or whether a bill is paid.

**External code:**
- `@supabase/supabase-js@2.45.4` (jsDelivr), loaded only in family mode;
- `xlsx@0.18.5` (cdnjs), loaded only when importing or exporting Excel.

Both are cached by the service worker after first use.

---

## 6. Data model

All budget data is a set of **collections** of JSON documents, held in memory as `D[col][id]`. In local mode they're saved as one JSON blob. In cloud mode each document is one row of the `docs` table.

| Collection | Key | Fields (amounts in **paise**) |
|---|---|---|
| `settings` | `main` | `name`, `startDay` (1–28), `startMonth` (`YYYY-MM`), `opening`, `household`, `hideIncome`, `owner` |
| `cats` | id | `name`, `section` (income/savings/bills/expenses/debt), `order`, `archived`, `dueDay`, `hist: [{from:'YYYY-MM', amt}]`, `card` (the card this bill pays) |
| `tx` | id | `cat`, `amt`, `date` (`YYYY-MM-DD`), `mode` (UPI/Card/Cash/Net banking/Auto-debit), `note`, `card`, `acct`, `src` (manual/import/recurring/share/statement/reconcile), `rec`, `split`, `secs` (seconds it took to add), `by`, `byName`, `at`, `ub`, `uat` · **transfers:** `type:'xfer'`, `from`, `to` (an account id or `card:<id>`), no `cat` |
| `months` | `YYYY-MM` | `b: {catId: amt}` (one-month budget overrides), `open` (starting-money override) |
| `bills` | `YYYY-MM` | `skip: {catId:true}`, `skipRec: {recId:true}` |
| `loans` | id | `name`, `lender`, `original`, `rate`, `emi`, `outstanding`, `asOf`, `cat` (linked EMI category) |
| `cards` | id | `name`, `bank`, `limit`, `stmtDay`, `dueDay`, `stmts: {YYYY-MM: {amt, paid}}` |
| `goals` | id | `type:'save'` (`target`, `saved`, `monthly`, `date`) · `type:'yearly'` (`amount`, `month`, `saved`) · `type:'loan'` (`loan`, `date`) |
| `accounts` | id | `bank`, `type`, `nick`, `last4`, `isDefault`, `opening`, `asOf`, `createdAt`, `adj`, `checkedAt`, `archived` |
| `recurring` | id | `cat`, `amt`, `day`, `mode`, `acct`, `note`, `active` |
| `assets` | id | `type`, `name`, `value` · **snapshots:** `kind:'snap'`, `month`, `nw` |
| `log` | id | `at`, `user`, `action`, `entity`, `detail` |
| `trash` | id | `at`, `by`, `label`, `n`, `items: [{col, id, data}]` (the before-state, for restore) |

**Conventions:**
- **Paise, not rupees:** integer maths only. `parseAmt('1,234.50')` → `123450`. `fmt()` shows Indian grouping (₹1,23,450).
- **Month key** `keyOf(date)` follows the budget's start day. With a start day of 25, 24 Nov belongs to the "2026-10" month.
- **Budget history:** a category's budget is the latest `hist` entry on or before the month, unless `months[k].b` overrides it for that month. Changing "this and future months" adds a `hist` entry; "this month only" writes an override.

---

## 7. Backend: Supabase

### 7.1 Tables (`supabase/schema.sql`, `push.sql`)

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-in person (name, email, photo), created by a trigger on sign-up |
| `families` | One row per family budget (`owner_id`, `name`) |
| `family_members` | `(family_id, user_id, role)`. A person can be in only one family. |
| `invites` | Gmail invites with `role`, `status`, expiry after 7 days |
| `docs` | `(family_id, col, id)` primary key, `data jsonb`, `deleted` (soft delete so realtime can filter by family), `created_by`, `updated_by`, `updated_at` |
| `push_subscriptions` | `endpoint` (primary key), `user_id`, `p256dh`, `auth`, `prefs jsonb` |

The `col` value is checked against the allowed collections. `v2.sql` and `v3.sql` widen this check as features were added.

### 7.2 Row-level security (who can do what)

| Role | Read | Write |
|---|---|---|
| Owner | Everything in the family | Everything, plus deleting the family |
| Admin | Everything | Everything except ownership and deleting the family |
| Member | Everything (the app hides income when `hideIncome` is on) | Insert `tx`, `bills`, `log`, `trash`. Update `bills`, `log`. Update `tx` and `trash` **only rows they created**. |
| Viewer | Everything | Nothing |

There are no hard deletes from the app: a delete is an upsert with `deleted:true`.

A trigger (`docs_stamp`) always sets `updated_by` and `updated_at` and preserves `created_by`, so nobody can forge authorship. The only exception is the `paisa.reassign` setting, used inside `delete_my_account`.

### 7.3 Database functions (all check the rules on the server)

| Function | What it does |
|---|---|
| `create_family(name)` | Creates the family and makes the caller Owner |
| `invite_member(email, role)` | Owner/Admin invites a Gmail address |
| `accept_invite(id)` | The invited Gmail joins with the invited role |
| `set_member_role`, `remove_member`, `leave_family`, `transfer_ownership` | Family management, with Owner safeguards |
| `delete_family()` | Owner deletes the family; its docs cascade |
| `save_push_subscription`, `delete_push_subscription` | A phone's push address and reminder choices |
| `delete_my_account()` | Removes the sign-in, profile, reminders and membership. Keeps past entries with the family. An Owner with other members must hand over first. |

The `schema.sql` tests covered 41 role scenarios when it was written.

### 7.4 Realtime and sync

- The app subscribes to `docs` and `family_members` changes for its family.
- Writes are **optimistic**: `D` updates first, then `cloudWrite` upserts the row.
- Each document path has its own queue (`enqueue`), so edits to one item stay in order.
- Offline, or on a network error, the operation goes to the **outbox** (`paisa-outbox-<fid>`), which is flushed when the app comes back online or becomes visible.
- If the server refuses a write (wrong role), the app re-fetches that document to undo the change locally and shows a toast.
- **Bulk writes** (`bulkSet`): Delete data and restore upsert up to **1,000 rows per request**. Each request is a single statement, so it either all applies or none of it does.
- **Field-level merges** (`store.patch` → `patch_doc`, from `v4.sql`): a month's budget overrides and starting money, bill marks and card statements change **one field at a time** on the server, inside a row lock, so two people editing the same month both keep their changes. Offline field changes queue individually. Until `v4.sql` is run, the app falls back to whole-record saves.
- **Load only what changed:** opening the app fetches rows with `updated_at` after the last sync (`paisa-sync-<fid>`), including deletions, with a full reload once a week.
- **Cache:** the whole family dataset is cached at `paisa-cloud-<fid>`, so the app opens instantly and works offline.

---

## 8. Reminders: push notifications

| Part | Where |
|---|---|
| Phone registration | Settings → Reminders. The app subscribes with the public VAPID key from `config.js` and calls `save_push_subscription` with the person's preferences. |
| Preferences | `bills` (on by default, hour `billsHour`, default 8), `evening` (opt-in, `eveningHour` 21), `weekly` (opt-in, `weeklyDay` 0 = Sunday, `weeklyHour` 19) |
| Scheduler | `pg_cron` job `paisa-hourly` at `30 * * * *` calls the function with `kind=auto` and an `x-cron-secret` header |
| Sender | Edge Function `send-reminders` (Deno, `web-push@3.6.7`, service role), importing `../_shared/money-core.js` |
| Display | `sw.js` `push` handler; tapping the notification opens `#bills`, `#add` or `#home` |

**What gets sent** (in IST, at each person's chosen hour):
- **Bills:** 3 days before, on the day, and the morning after if still unpaid and not skipped. A card bill counts as paid when money was transferred to **its linked card** that month.
- **Card statements:** an unpaid statement 3 days before its due date, on the day and the morning after; on the statement day, a nudge to add the amount if it isn't in yet.
- All of these rules come from `money-core.js`, the same file the app uses.
- **Evening:** "Spent anything today?", only if the person logged nothing that day.
- **Weekly:** "This week: ₹X spent", with the biggest category.
- **Test:** sent only to the signed-in person, using their sign-in token instead of the cron secret.

Dead push addresses (404/410) are deleted automatically.

**Secrets (in Supabase, never in the repo):** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. Only the public VAPID key is in `config.js`.

**iPhone:** push works only when the app is installed to the home screen (iOS 16.4+). The app and Help explain this.

---

## 9. Frontend engineering

### 9.1 Files and load order

`index.html` is a 2 KB shell: metas, the manifest, the font preload, `css/app.css`, then the scripts in this order:

| File | What's in it |
|---|---|
| `supabase/functions/_shared/money-core.js` (module) | Shared money rules: dates, budget months, budgets over time, bill paid status, card links, card due dates and reminders |
| `js/01-base.js` | Constants, formatting, the store (`set`, `del`, `patch`), money calculations (`month`, `billsFor`, `planParts`, loans, goals), rendering and routing |
| `js/02-flows.js` | First run, category guessing and merchant memory, in-the-moment questions, next step, month-end wrap, icons |
| `js/03-screens.js` | Entries, Month plan, Bills, Yearly report, Money sub-views, Settings sections |
| `js/04-sheets.js` | Add entry (keypad, type or paste, split), editors, goals, import, export, warnings, reminders and their setup page, iPhone viewport |
| `js/05-money.js` | Bank accounts and balances (now and on a date), the weekly check, transfers, repeats, share target, net worth |
| `js/06-shell.js` | Tab bar, Today, the Money card stack, the messages registry, Settings tiles, Family, More |
| `js/07-tools.js` | Delete data, Recently deleted, Start fresh, Your habits, Help & FAQ, bank statement matching |
| `js/08-events.js` | One delegated click handler (`data-act`), inputs, keyboard |
| `js/09-cloud.js` | Supabase sign-in, family, realtime, field merges, incremental sync, outbox, cache |
| `js/10-boot.js` | PWA plumbing, app lock, backup and restore, start-up (runs last) |

### 9.2 Rendering

- Every screen is a function that returns an HTML string. `render()` puts it into `#app`.
- `scheduleRender()` batches changes into one animation frame.
- While a text field in `#app` is focused, renders wait (`RENDER_WAITING`) and run on blur, so typing is never interrupted.
- Scroll position is kept across re-renders.
- Calculations are **memoised** (`memo.m`, `memo.ti`, `memo.bal`, `memo.cats`) and cleared on any data change (`changed()`).
- All user text goes through `esc()` before it enters HTML.

### 9.3 Events

- Every interactive element has `data-act` (plus `data-id` and `data-k`).
- One `document` click listener resolves `e.target.closest('[data-act]')` and switches on the action.
- `input` handles live fields: search, filters, onboarding, Delete data, Help search.
- Adding a feature means adding a `case`, not a listener.

### 9.4 Modes

| `MODE` | When | Storage |
|---|---|---|
| `local` | `config.js` has no Supabase URL | `localStorage['paisa-local']` |
| `signin` | Family mode, not signed in | — |
| `nofamily` | Signed in, no family yet | — (create or join a family) |
| `cloud` | Signed in and in a family | Supabase, plus the cache and outbox |

### 9.5 Offline and install (`sw.js`, `manifest.webmanifest`)

- **Service worker:**
  - App navigations get the cached shell instantly, refreshed in the background.
  - Same-origin files and the two library CDNs use stale-while-revalidate.
  - Supabase traffic is never cached.
  - The cache version (`VERSION`) is bumped on every release.
- **Manifest:**
  - standalone, portrait;
  - shortcuts to Bills and Budget;
  - an **Android share target**: sharing an SMS or UPI text to Paisa prefills an entry. iPhone doesn't support share targets for web apps.

### 9.6 Local storage keys (per device)

| Key | Purpose |
|---|---|
| `paisa-local` | All data in device-only mode |
| `paisa-cloud-<fid>`, `paisa-outbox-<fid>`, `paisa-fid-*` | Family cache, offline outbox, current family |
| `paisa-trash-<fid>` | Recently deleted copies kept on this phone (until `v3.sql` is run) |
| `paisa-pin` | App lock PIN (SHA-256 hash, never the PIN itself) |
| `paisa-lastacct`, `paisa-lastcard` | Defaults for Add entry |
| `paisa-recent-q` | Recent searches on More |
| `paisa-dis-<key>-<month>` | Heads-ups hidden for the month |
| `paisa-ask-*`, `paisa-hint-*` | In-the-moment questions and tips already shown |
| `paisa-wrap-*` | Month-end wrap already seen |
| `paisa-remind*`, `paisa-h-*`, `paisa-d-week`, `paisa-evening`, `paisa-weekly`, `paisa-push-ok`, `paisa-snooze-*` | Reminder preferences and state |
| `paisa-backup-at` | Last backup time |

---

## 10. Money logic

These rules are the product's core promise. They live in one place (the calculations section), and every screen, export and reminder uses them.

### 10.1 A month

`month(k)` returns the figures for budget month `k`:

```
open        = months[k].open  ?? (k == startMonth ? settings.opening : month(k-1).close)
income      = Σ actual of income categories
spent       = Σ actual of savings + bills + expenses + debt
close/left  = open + income − spent
toPay       = Σ max(0, budget − actual) over outflow categories
              (minus a Credit card bill already paid by transfer to a card)
incomeToCome= max(0, income budget − income received)
projected   = open + income + incomeToCome − spent − toPay
per day     = projected ÷ days left in the month   (shown rounded down to ₹100)
```

- Savings and EMIs count as money going out, so "left to spend" is honest.
- Self transfers have no category, so they **never change** left to spend.
- Earlier months are computed iteratively and memoised, so a long history doesn't recurse deeply.

### 10.1a The plan in three parts (Month page)

```
money in        = open + income received + income still to come
commitments     = Σ max(budget, actual) over bills + EMIs      (paid = actual + card transfers)
savings         = Σ max(budget, actual) over savings
free to spend   = money in − commitments − savings
free left       = free to spend − everyday spending so far
```

Everyday categories can have limits, but don't need them: free to spend is the pot.

### 10.1b Starting money from the banks

`bankStart(k)` = Σ each account's balance on the first day of month k − card statements of the previous month still unpaid. If it differs from money at the start by ₹500 or more (and no starting money was set for that month), Needs you offers **Use banks**, which sets `months[k].open` with a field merge.

### 10.2 Dates

- `keyOf(date)`: if the day of the month is before `min(startDay, days in month)`, the date belongs to the previous month.
- `dueDate(cat, k)`: with a start day of 1 (or a due day on or after the start day), the bill falls in the same calendar month. Otherwise it falls in the next one. It's clamped to the month's length.

### 10.3 Bills

`billsFor(k)` covers categories in Bills or Debt with a due day:

| Status | Rule |
|---|---|
| Paid | Any entry in that category this month, **or** for a card bill (`cat.card`), a transfer to that card this month. Budgets with no links at all fall back to a name match ("credit card"). |
| Skipped | `bills[k].skip[catId]` |
| Overdue / Due / Upcoming | By days to the due date: `<0`, `0–3`, `>3` |

### 10.4 Bank balances

```
balance = opening + adj + Σ entries since asOf
          (income +, expense −, transfer to +, transfer from −; card purchases skipped)
```

- Entries logged earlier on the same day the account was added are skipped (`createdAt`), because the typed balance already includes them.
- **Weekly check:** any account not checked for 7 days appears in Needs you ("Does HDFC show ₹X?"). If the bank differs, the gap can be **logged as missed spending or income** (an entry with `src:'reconcile'`, so the budget stays true) or **only corrected** (`adj`, for charges or interest).
- **Balance on a date** (`acctBalanceAt`) uses the same rules for entries before that date.

### 10.5 Credit cards

- Card purchases (mode **Card**) count as spending when they're made.
- Paying the bill is a **Self transfer to the card**, which doesn't count twice.
- A card's editor sets the **budget line that pays it** (`cat.card`). Paying the card with a transfer marks that bill paid and drops it from still-to-pay.
- If someone logs a card bill as an expense while card purchases already exist (last 62 days), Add entry warns them and offers **Pay card instead**, which goes to the linked card.

### 10.6 Loans and goals

- **Payoff:** `loanCalc(P, rate, EMI)` gives the months to repay with `n = −ln(1 − iP/E) / ln(1 + i)` and the interest left. It flags an EMI that's too low to ever repay.
- **Outstanding:** `loanOutstanding` reduces the principal for each EMI logged after `asOf`.
- **Goals:**
  - savings goals show the months needed at the planned monthly amount;
  - yearly payments show the monthly set-aside;
  - loan goals show whether the current EMI meets the date, or the extra needed per month.

### 10.7 Net worth

```
net worth = bank balances + investments − loans outstanding − card dues
```

A snapshot is saved once a month (`assets` with `kind:'snap'`) to draw the trend.

### 10.8 Delete data: balance rules

- **Keep later months (default):**
  - pins the next month's `months[nk].open` to its current value, if it isn't already set;
  - adjusts each affected account's `adj`;
  - only the deleted period changes.
- **Recalculate:** later months and balances update as if the entries never existed.
- **The preview** shows the money impact, e.g. "Left to spend for November goes up by ₹X" or "Every month after Oct starts with ₹Y more".

---

## 11. Feature reference

| Area | What a person can do |
|---|---|
| **First run** | Salary day → income → fixed outgoings as tiles with a live "left for everything else" → household → the reveal. About 60 seconds. |
| **Add entry** | Number pad or **type or paste** ("350 swiggy", a bank SMS; Done saves when the category is certain), Expense / Income / Self transfer, recent categories and one-tap repeats, a category guess (amount, time, merchant memory), date, mode, account or card, note, split across categories, "Repeats every month" |
| **Entries** | Filter by search, category, mode or account. Swipe right to edit, left to delete. Select mode for bulk delete. |
| **Month plan** | Money in, commitments, savings and free to spend; Bills summary; sections with progress, Edit budgets (whole month with a live total), per-category editor (rename, due day, move, archive, delete with move/delete entries), Starting money, Clear data for the month |
| **Bills & EMIs** | Grouped by urgency, Paid (prefilled from repeats), Skip/Undo, reminder settings |
| **Money** | Accounts and cards card stack, weekly check with log-the-difference, Match a bank statement, card ↔ bill link, statements and dues, Pay now, Loans, Goals, Repeats, Net worth |
| **Yearly report** | Income, outflow, savings rate, plan used, monthly table, export |
| **More** | Search across entries, categories, features and help. Shortcuts, Money grid, Manage list. |
| **Family** | Invite by Gmail with a role, pending invites, change role, make Owner, remove, leave, roles explained, activity history |
| **Settings** | Account, Budget setup (start day, first month, starting money, hide income), Reminders, App lock, Install, Import/export/backup, Delete data, Recently deleted, Privacy & terms, Danger zone |
| **Import** | Excel/CSV → detected categories (placed by name, changeable) → month totals → confirm |
| **Export** | Period (month/year/range/all) × format (Excel/CSV/PDF/backup) × sections × filters |
| **Delete data** | What (10 kinds) → period → filters → preview with impact → typed count for 20+ items → Undo → 30-day Recently deleted. Also Start fresh. |
| **Match a bank statement** | Excel/CSV from any Indian bank → lines already logged skipped (same amount and direction within 3 days) → missing ones listed with merchant and category guessed → added in one batch with Undo → balance confirmed when it matches |
| **Your habits** | Time to add an entry, days logged a week, share not typed by hand, months closed cleanly, late payments, accounts checked this week |
| **Help & FAQ** | 59 answers, 10 topics, ranked search with highlights, a button to the feature in each answer |
| **Month-end wrap** | Saved vs plan, where you went over, raise a budget in one tap, next month's number |
| **App lock** | PIN on open |

---

## 12. Security and privacy

- **Device-only by default.** Nothing leaves the phone until someone chooses Google sign-in.
- **Server-enforced roles** (§7.2). The anon key is safe in the app because every table has row-level security. The service-role key exists only inside the Edge Function.
- **Minimal financial data:** only the bank name and the last 4 digits of an account. No card numbers. No bank logins.
- **Authorship can't be faked:** the stamp trigger sets who changed what.
- **Secrets:** the VAPID private key and `CRON_SECRET` live only in Supabase secrets. The cron password is generated in SQL and never typed by hand.
- **HTML escaping:** all user text goes through `esc()`.
- **Delete my account** removes identity data and keeps the family's shared history.
- **Policies:** `privacy.html` and `terms.html`, linked from Settings and More.
- **Region:** Supabase project in Mumbai (South Asia), as the PRD asks.

---

## 13. Quality: how the app is tested

The tests live in the repo (`tests/`) and run on every push with GitHub Actions (`.github/workflows/test.yml`). `npm test` runs the rule and browser tests locally.

| Layer | Command | What it proves |
|---|---|---|
| **Database** | `npm run test:sql` (`tests/sql/run.sh`) | Loads the real `schema.sql`, `push.sql`, `v2.sql`, `v3.sql`, `v4.sql` on Postgres 16 with a small Supabase stand-in, then checks: two edits to one month merge; a member's bill mark merges with the owner's; members can't change budgets; viewers can't change anything; members can save to Recently deleted |
| **Shared money rules** | `npm run test:unit` | 18 checks on `money-core.js`: start days, due dates, budget history and overrides, card links and due dates |
| **Reminder logic** | `npm run test:unit` | 8 checks running the real `send-reminders` logic with the shared rules: linked card bills (renamed, other card), statement reminders, messages |
| **Browser** | `npm run test:e2e` (`tests/run-e2e.mjs`) | Serves the app, builds a realistic seeded budget, runs 16 Playwright suites on an iPhone 13 profile; any thrown error, timeout or page error fails the run |
| **Sweep** | `npm run test:sweep` | Taps every button on every screen and every button in each sheet it opens, from a fresh seeded budget |
| **Layout** | `node tests/e2e/narrow.js`, `audit.js` | No sideways overflow, layout shift, small inputs or squeezed text at 320/375/390px |

Browser suites: `flows` (first run, guessing, questions, wrap), `quick`, `money-v2`, `feat` (entries, accounts, transfers, repeats, split, net worth, import, export, loans, goals), `remind`, `card_states`, `settings-design`, `screens`, `kb` (keyboard and inert page), `logic` (card double count, card paid by transfer, same-day balance), `del` (every Delete data path), `faq`, `qtext` (type or paste), `recon` (weekly check and bank start), `hab` (Your habits), `stm` (statement matching).

**Release checklist:** tests green locally or in CI → bump `sw.js` `VERSION` → commit and push → confirm the Pages deploy.

---

## 14. Deploying and operating

| Task | How |
|---|---|
| **Host** | GitHub Pages from `main` (repo `arpitdasai-rgb/paisa-planner`). Any static HTTPS host works. |
| **Release** | Bump `VERSION` in `sw.js`, then push. Phones update in the background; the next open shows it. |
| **New Supabase project** | `schema.sql` → `v2.sql` → `v3.sql` → `v4.sql` → `push.sql`, then Google sign-in (see `SETUP-SUPABASE.md`) |
| **Existing project** | Run `v4.sql` once (field-level merges) |
| **Reminders setup (once)** | Settings → Reminders → Reminder setup (Owner): create keys, set secrets, deploy `send-reminders`, schedule the hourly job |
| **After editing the Edge Function or `money-core.js`** | Redeploy `send-reminders`. It imports `../_shared/money-core.js`: with the Supabase CLI, `supabase functions deploy send-reminders` bundles it; in the dashboard editor, add `money-core.js` next to `index.ts` and change the import to `./money-core.js` |
| **Health check** | Call the function with `kind=auto` and the cron secret. It returns `{sent, skipped}`. |
| **Google consent screen** | Must be published (In production) so any Gmail can sign in; while in Testing, only listed test users can |

---

## 15. The journey: how we got to this version

All of this happened between 10 and 13 November 2026. Each step below says what changed and **why**.

### Stage 0: PRD to a working app (before git)
- **Input:** a 20-page PRD for replacing the Excel tracker.
- **Built:** a single-file app inside a Claude artifact, using the artifact's shared database (the "remote" storage mode). It had the five sections, Budget vs Actual, entries, bills, carry-forward, charts, import/export, loans, cards and goals.
- **Then a PWA:** a manifest, a service worker and icons, so it installs and works offline. A **device-only** mode was added so it runs on any phone without an account.

### Stage 1: Family sync (10 Nov, `5f6842e` → `a4ffdbd`)
- **Need:** the PRD's family persona; sign in with Gmail.
- **Built:**
  - Supabase (Mumbai) with Google sign-in;
  - `families`, `family_members`, `invites`, `docs`;
  - row-level security for the four roles;
  - family functions;
  - realtime;
  - an offline outbox;
  - a local cache.
- **Setup issues solved:** the Google provider was "not enabled", the redirect URI didn't match, test users were needed, then the consent screen was published.
- **Hosting:** GitHub Pages.

### Stage 2: First redesign (`0c1e6cc`)
- **Why:** the first version showed everything at once.
- **Changed:**
  - a daily spend line and a needs-attention list replaced the ring chart;
  - ledger-style budget rows;
  - Edit budgets mode;
  - swipe on entries;
  - a bills timeline;
  - one accent colour, with colour only for status.

### Stage 3: Intuitive flows (`dbbfe36`)
- **Why:** setup forms made people quit before seeing value. The aim was a premium fintech product feel: intuitive, engaging, minimal.
- **Changed:**
  - a 60-second first run with tiles and a live counter;
  - the category guess and merchant memory;
  - questions asked only at the moment they're useful;
  - one next-step card;
  - the month-end wrap.

### Stage 4: Goals, import, export, font (`661c1d7`)
- **Asked for:** loan payoff goals; a fun, clear import confirmation; "ask what they want to export"; the best font.
- **Built:**
  - Clear-a-loan goals;
  - a step-by-step import check before saving;
  - the export picker (period × format × sections × filters);
  - Inter, self-hosted.

### Stage 5: Alerts and reminders (11 Nov, `38f5e70` → `3f332dd`)
- **Asked for:** proactive warnings when spending exceeds the plan, and reminders.
- **Built:**
  - the plan-above-income banner, spending pace and 80% heads-ups;
  - **scheduled web push** (`push.sql`, the `send-reminders` function, pg_cron).
- **Then:**
  - the Expense/Income switch and a calmer Add entry;
  - **reminder times per person** (the schedule moved to hourly);
  - the Owner's setup link shown in every state;
  - "Send a test" hidden once it has worked.
- **Setup issues solved:** the function was deployed under the wrong slug; a placeholder password was left in the SQL (fixed by generating it in SQL); 401 errors until the secret matched; a health-check query.

### Stage 6: Accounts and the bigger picture (`89e8b7d`)
- **Asked for:** bank selection on entries, self transfer, "do all phases".
- **Built:**
  - bank accounts (last 4 digits only), self transfer, repeats, split;
  - share-to-app (Android);
  - net worth, yearly payments, an insight;
  - privacy and terms;
  - hide income;
  - delete my account (`v2.sql`).

### Stage 7: iPhone stability (`e78ae6f`)
- **Problem reported:** "screens are not stable and need to be scrolled to settle."
- **Fixed:**
  - inputs under 16px made Safari zoom;
  - rubber-band drag;
  - the keyboard covering sheets;
  - sheets re-animating on every tap;
  - re-renders while typing;
  - font swap causing layout shift.
- **Also added:** design foundations (spacing grid, type scale, touch targets).

### Stage 8: Premium redesign (`d01fa98`, `61ac429`)
- **Input:** reference screenshots of a premium fintech app ("take reference and redesign every section"). We used the patterns only, not the brand.
- **Built:**
  - the dark navigation with a raised centre +;
  - the Home hero with a pill switch;
  - the Wallet card stack;
  - the More hub with search;
  - a monochrome palette.

### Stage 9: Messaging system (`afba0bc`)
- **Asked for:** "communications, content, marketing, product, UI/UX and engineering together: plan the messages across the app."
- **Built:** the `MSG` registry, rank and placement rules, caps, hide-for-month, plain wording and first-time-only tips (§4).

### Stage 10: Manrope; Settings, More and Family (`559ab63`)
- **Asked for:** Manrope; a re-plan of More and Family; Settings as tiles with sub-tiles to reduce scrolling.
- **Built:**
  - Manrope;
  - Settings tiles that open focused sub-pages;
  - More with search suggestions;
  - Family with a people row and sheets.

### Stage 11: Fixes from real use (`5a7b650`, `d34071a`, `12ae86c`)
- **iPhone keyboard over the number pad:** a field focused behind the sheet kept the keyboard up. Fixed by blurring it and making the page `inert`.
- **"Check through everything and solve all bugs":** a full button sweep (no crashes) and a logic review found:
  - credit card bills **double-counted**;
  - card bills not marked paid by transfer;
  - new-account balances off by same-day entries;
  - unreadable transfer delete toasts;
  - "of ₹0" budget labels;
  - a badge/list count mismatch;
  - overflow at 320–375px.

  All fixed.

### Stage 12: Delete data (`980f365`)
- **Asked for:** "delete should have options: what, which period, category…"
- **Planned in phases, then built all:** the 4-step sheet, filters, the money-impact preview, keep vs recalculate, the typed count, Undo, **Recently deleted** (`v3.sql`), Start fresh, category delete with move, select mode, and shortcuts.
- **Also fixed:** toasts blocking taps underneath.

### Stage 13: Help & FAQ (`66423a2`)
- **Asked for:** an FAQ with search.
- **Built:** 52 answers in 10 topics with ranked, highlighted search and a button to the feature in each answer. Every answer was checked against the app's real labels.

### Stage 14: Engineering audit and this document (`54921d9`)
See §16.

### Stage 15: First-principles rebuild (13 Nov)
- **Asked for:** "think from first principles; fix, build and redesign everything, even if it means rethinking the PRD."
- **Reasoning:** see §1.5. The app had nearly every PRD feature, but its number rested on manual typing, two sources of truth and name-based rules, and nobody had measured anything.
- **Fixed (foundations):** card bills linked to cards; field-level merges for family edits (`v4.sql`, tested on Postgres); load only what changed; one shared copy of the money rules for the app and server; tests moved into the repo with CI.
- **Built (trust and habit):** type or paste; weekly bank check with log-the-difference; starting money from the banks; bank statement matching; Your habits; card statement reminders.
- **Redesigned:** the Month plan as commitments, savings and free to spend; tabs by cadence (Today, Month, Money, More); More's duplicate Money grid removed; the code split into a shell, a stylesheet and ten ordered scripts.

---

## 16. Engineering audit (this version)

**Method:**
- scanned every declared function and variable for references;
- compared every `data-act` handler with what's rendered;
- checked every CSS class against the markup;
- read the backend SQL, the Edge Function, the service worker, the manifest and the docs;
- then re-ran all tests and the full button sweep.

### 16.1 Removed (redundant)

| What | Why it was redundant |
|---|---|
| The "remote" storage mode: `startRemote`, `resolveRole`, `resolveNames`, `DB`, `USER`, `loadedCols`, `loadTimer`, `nameT`, `render.ready`, the fallback write branches in `store` and `bulkSet`, the boot wait loop | Left over from the first artifact version. GitHub Pages never starts it; device-only and Supabase cover both cases. |
| `summaryCard`, `confirmHTML`, `spentShare` | Replaced by the Home hero, the ranked Needs you list and the money breakdown |
| `exportMonth`, `exportYear`, `monthRows` | Replaced by the export picker (`expTables`) |
| `STARTER`, `ICONS` | Replaced by onboarding tiles and the `GLYPH`/`UI` icon sets |
| `gocards`, `plantab` handlers | Replaced by `goplan` |
| 28 CSS rules for 14 unused classes (`ring`, `cal`, `catrow`, `grid3`, `mrow`, `sec-h`, `tint`, `grp`, `nextstep`, `dev`, `p-over`, `p-skip`, `a-warn`, `a-good`) | Belonged to older layouts |
| Google Fonts hosts in the service worker | Fonts are bundled with the app |

**Result:** about 10 KB less code, with no behaviour change. All 12 suites and the button sweep pass.

### 16.2 Fixed

| Area | Issue | Fix |
|---|---|---|
| Backend | The reminder function didn't know a transfer to a card pays the Credit card bill, so it could send "was due yesterday" for a paid bill | Same rule as the app; tested with sample data |
| Backend | The weekly message assumed every entry has a category | Transfers skipped explicitly |
| Install | The manifest and theme colour still used the pre-redesign blue and grey | Matched to the monochrome tokens (light `#F4F4F2`, dark `#0C0D0E`, theme `#0D0E0F`) |
| Docs | The README and setup guide didn't mention `v2.sql`, `v3.sql` or the reminders, and "Not included yet" listed things that now exist | Rewritten |

### 16.3 Reviewed and kept on purpose

- **One file, no build step:** simple hosting, one cached file, no toolchain. Revisit if the team grows (§17).
- **Layered CSS overrides from successive redesigns:** some selectors are defined more than once (base, then redesign). Merging them is pure risk with no user benefit today. It's a good first task for a CSS refactor with screenshot comparisons.
- **Soft delete on the server** (`deleted:true`): realtime needs it to tell other phones that a row went away.
- **The three SQL update files:** existing projects need them as steps. A fresh project runs all of them in order.

---

## 17. Known limits and what's next

| Limit | Note |
|---|---|
| Bank data without any typing | Needs RBI's Account Aggregator framework through a licensed partner (e.g. Setu, Finvu, OneMoney). It's a business and compliance step, not just code. Statement matching is the bridge until then. |
| iPhone share target | iOS doesn't let web apps receive shares; **Type or paste** covers it |
| iPhone reminders | Need the app installed to the home screen, iOS 16.4+ |
| Invite emails | The app gives you the message to send yourself. Automatic email needs an email service. |
| Server updates to run | `v3.sql` (shared Recently deleted) and `v4.sql` (field merges); redeploy `send-reminders` with `money-core.js` |
| Real-world data | Habits are measured on each phone. Before building more, put 5 families on it for 4 weeks and read their Habits pages. |
| Open choices | Logo direction (two concepts offered) |

**Candidate roadmap (after real usage):**
- Account Aggregator partner for automatic bank data;
- category rules ("always Swiggy → Eating out") editable in Settings;
- shared goals;
- hide or remove features that real usage shows nobody opens.

---

## 18. Appendix

### 18.1 Files

| Path | Lines / size | Role |
|---|---|---|
| `index.html` | 2 KB | Shell: metas, stylesheet, scripts in order |
| `css/app.css` | 46 KB | All styles |
| `js/01-base.js` … `js/10-boot.js` | 340 KB in 10 files | The app (§9.1) |
| `supabase/functions/_shared/money-core.js` | 5 KB | Shared money rules (app and server) |
| `tests/` | — | SQL, unit and browser tests; `run-e2e.mjs` runner |
| `.github/workflows/test.yml` | — | CI on every push |
| `sw.js` | 64 lines | Offline and push |
| `manifest.webmanifest` | — | Install and share target |
| `config.js` | — | Supabase URL, anon key, public VAPID key |
| `supabase/schema.sql` | — | Tables, security, family functions |
| `supabase/push.sql`, `v2.sql`, `v3.sql`, `v4.sql` | — | Updates |
| `supabase/functions/send-reminders/index.ts` | about 160 lines | Reminder sender |
| `privacy.html`, `terms.html` | — | Policies |
| `fonts/`, `icons/` | — | Assets |

### 18.2 Constants

- **Sections:** income · savings ("Savings & Investments") · bills · expenses · debt ("Debt / EMIs"). Outflow = savings + bills + expenses + debt.
- **Payment modes:** UPI, Card, Cash, Net banking, Auto-debit.
- **Account types:** Savings, Salary, Current, Cash, Wallet.
- **Asset types:** Fixed deposit, Recurring deposit, PPF, EPF, NPS, Mutual funds, Stocks, Gold, Property, Other.
- **Recently deleted:** 30 days. **Undo:** 10 seconds. **Typed confirmation:** 20+ items. **Bulk upload:** 1,000 rows per request.

### 18.3 Glossary

| Term | Meaning |
|---|---|
| Left to spend | Money at the start + income received − paid out |
| Per day | What can be spent each day without missing a planned payment |
| Money at the start | Last month's closing, or a set value for the month |
| Repeat | A monthly rule that appears on its day for a one-tap confirm |
| Self transfer | Money between your own accounts or to a card; doesn't change left to spend |
| Heads-up | A rank-3 message that can be hidden for the month |
| Outbox | Changes made offline, waiting to upload |
| Snapshot | A month's net worth saved for the trend |
