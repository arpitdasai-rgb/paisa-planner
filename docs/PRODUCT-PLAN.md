# Paisa Planner: product replan

*19 November 2026 · Owner: Arpit Das · Status: proposal, nothing below is built unless marked "Done"*

## The recommendation in one paragraph

Stop adding features. Paisa already does more than the PRD asked for, but **nobody outside the team has used it for a single week**, so we don't know which of its ~20 features matter. For the next 4 weeks, run the app as a **pilot with 5 real families** (your brother's first). Add only three things: a way to measure whether people come back, a one-tap way to tell us what confused them, and a smaller app that shows the core loop and puts everything else behind "More tools". Then keep, cut or build based on what those families actually do.

---

## 1. Frame

| | |
|---|---|
| **User and job** | A salaried Indian family, usually one person running the money, with EMIs and a credit card. *When the month starts, I want to know what's safe to spend each day and never miss an EMI, so the month doesn't end short.* |
| **Outcome** | The family trusts one number all month and pays every bill on time. Metric: families who log at least 4 days a week and whose number was checked against the bank in the last 14 days (§6). |
| **Riskiest assumption** | **Families keep logging after week 3.** Every budgeting app's real enemy is the habit fading, not missing features. |
| **Stage fit** | Pre-launch with zero users: the right work is learning, not building. |

## 2. Strategy

- **Vision:** every Indian family knows what it can safely spend today, without spreadsheets or anxiety.
- **Beachhead (who first):** salaried households in metro and tier-1 cities where one person manages the family's money, with at least one EMI (home or personal loan) and a credit card, who track it today in Excel, a notes app or not at all. This is the PRD's primary persona, and you are one, which gives us easy access and honest feedback.
- **Positioning:** *For salaried Indian families juggling EMIs and cards, Paisa is a shared monthly ledger that tells you what's safe to spend each day. Unlike expense trackers that only sort last month's spending, Paisa plans the month ahead, keeps the number true against your bank, and keeps your data private.*
- **How we win:** forward-looking (pace, bills ahead), trust (weekly bank check, statement matching), family sharing with roles, and privacy (device-only by default, no SMS reading).
- **Money:** free during the pilot. A paid family plan is a later test, not a plan (see open questions; maths → startup-finance).
- **Red team, the strongest case against:**
  - Bank and UPI apps already show spending charts, and Account Aggregator-based apps can pull transactions automatically. Our answer has to be the forward plan and the family, not the charts.
  - A web app on GitHub Pages is hard to find and install, especially on iPhone.
  - Manual logging may lose to automatic tracking no matter how fast it is.

## 3. Discovery: opportunity tree

**Desired outcome:** families still logging in week 4 (§6).

| Opportunity (the user's words) | Solutions already built | Cheapest test in the pilot |
|---|---|---|
| "I forget to log, then the number is wrong and I give up." | Type or paste, repeats, evening reminder, statement matching | Watch days logged per week in Habits; ask in week 2 why they skipped days |
| "I don't trust the number." | Weekly bank check, starting money from banks | Count bank checks that match vs need a fix |
| "I miss EMIs and card due dates." | Bills, reminders, card statement reminders | On-time bill rate per family |
| "My spouse spends and I don't know." | Family sharing, roles | How many pilot families invite a second person, and whether they log |
| "I end the month short and don't know why." | Pace ribbon, month plan, wrap | Ask at month-end: did you change anything because of the pace ribbon? |

## 4. Assumptions (riskiest first)

| Risk | Assumption | Confidence | Test |
|---|---|---|---|
| Value | Families keep logging past week 3 | Low | 5-family pilot, 4 weeks |
| Value | A second family member will log too | Low | Invites accepted and used in the pilot |
| Go-to-market | People will install a web app from a link | Low | Of the families sent the link, how many install and finish setup |
| Usability | First run plus the first entry takes under 2 minutes | Medium | Time it with each pilot family (watch, don't help) |
| Feasibility | Indian bank statement formats parse well | Medium | Ask each pilot family for one real statement (they keep it; it's read on the phone) |
| Ethics | Showing "ahead of pace" helps rather than shames | Medium | Ask how it made them feel |
| Viability | Someone would pay for a family plan | Unknown | Later: a fake-door "Family plan" button after week 4 |

## 5. Keep, park, add

The rule: **with no usage data, nothing is deleted.** Unproven features are *parked*: moved behind one "More tools" entry so the main app shows only the core loop, then brought back or removed based on pilot data.

| Verdict | What | Why |
|---|---|---|
| **Keep, front and centre** | Today (number, pace, Needs you), Add entry (keypad, type or paste), Month plan, Bills and reminders, weekly bank check, family sharing, Help | The core loop: plan → log → check → pay |
| **Keep, quieter** | Statement matching, Entries search and select, Recently deleted, export and backup, yearly report, month-end wrap | Useful, but not daily |
| **Park behind "More tools"** | Net worth and investments, goals (save, yearly payment, loan payoff), loans payoff maths, the spending insight card, activity history, the 10-kind Delete data screen (keep entries and Start fresh visible) | No evidence anyone needs them yet; they make the app look bigger than the job |
| **Add, P0 (before the pilot)** | 1. **Measurement, opt-in, private:** a few anonymous events (§7) saved to our own Supabase, never a third party. 2. **"Tell us what's confusing"** button on every screen, sending a short note plus the screen name. 3. **More tools** grouping (above). | Without these the pilot teaches us nothing |
| **Add, P1 (if the pilot says so)** | Play Store listing via a Trusted Web Activity (an Android app wrapper for the same web app); a custom domain; a welcome screen for device-only first run | Install friction and trust |
| **Later** | Automatic bank data via an Account Aggregator partner (→ fintech-advisor); a paid family plan test | Big, regulated, or premature |

**Non-goals (and why):**
- **Credit offers or lending of any kind.** It conflicts with the job (not ending the month short) and with user trust.
- **Reading SMS automatically.** Play Store rules restrict it, and it's a privacy cost; paste and statement matching cover the need.
- **Investment advice.** Out of scope and regulated.
- **Business or GST books.** A different user.

## 6. Metrics

- **North Star (one number):** **Trusted weekly families.** Families with at least one member logging on 4 or more days that week, and at least one bank check matched (or fixed) in the last 14 days. It measures the habit *and* the trust, which together are the product's promise.
- **Activation (the first value moment), within 7 days of setup:**
  - month plan set;
  - at least 5 entries on 3 or more days;
  - at least 1 bill marked paid or 1 bank check done.

  Target: 4 of 5 pilot families.
- **Input metrics we can move weekly:**
  - median seconds to add an entry (goal: 5);
  - share of entries not typed on the keypad;
  - share of active families with a second member logging;
  - bank checks done per family per week;
  - reminder-to-entry rate (an entry within 2 hours of an evening nudge).
- **Guardrails, so we don't "win" the wrong way:**
  - late or missed bills per family per month (goal: under 0.2, the PRD target);
  - reminder opt-outs;
  - "Tell us what's confusing" notes per family;
  - error and failed-sync rate.
- **Pilot success (decide before starting):**
  - At least 3 of 5 families are trusted weekly families in week 4: **persevere**.
  - 1–2 of 5: **change the capture approach** (faster logging, or statement-first).
  - 0 of 5: **rethink**.

## 7. Instrumentation (P0)

Anonymous, opt-in on the Settings → Privacy row, counts only, no amounts or notes.

| Event | When | Properties |
|---|---|---|
| `setup_done` | Onboarding finished | household type, start day |
| `entry_added` | Any entry saved | method (keypad, text, paste, repeat, statement), seconds taken |
| `bank_check` | Check completed | result (matched, logged gap, adjusted) |
| `bill_paid` | Bill marked paid | days early or late |
| `reminder_opened` | Notification tapped | kind |
| `invite_accepted` | Second member joins | role |
| `feedback_sent` | "Tell us what's confusing" | screen |
| `screen_view` | Route change | route |

## 8. Pilot plan (the next 4 weeks)

1. **Week 0:** build the three P0 additions; write a 1-page guide; recruit 5 beachhead families (your brother + 4); sit with each for setup and time it.
2. **Weeks 1–4:** no new features. A weekly 10-minute call per family (script → customer-discovery). A weekly scorecard: North Star, activation, inputs, guardrails.
3. **End of week 4:** keep, cut or build, using §6's decision rule. Then write the next PRD.

**Pre-mortem (it's February and the pilot failed — why?):**
- **Tigers (real risks):**
  - logging stopped in week 2 → evening reminder on by default for the pilot, plus the weekly call;
  - iPhone users never installed, so no reminders → set up installs together on the first call;
  - setup took too long → watch it and fix the slowest step first.
- **Paper tigers:** Supabase limits or cost at 5 families (tiny); the design isn't finished (it's good enough to learn).
- **Elephants:**
  - Is Paisa the startup, or a side project next to the card, gold and marketplace idea?
  - If it's the startup, how does a budgeting app lead to revenue?

  Both decide what "success" means and are yours to answer.

## Assumptions and open questions

- **Paisa's role.** Is it the startup, or a wedge into a larger fintech? *(You.)*
- **The 5 pilot families.** Who are they, and are they in the beachhead? *(You.)*
- **Paying.** Would a family pay, and how much? Test after the pilot. *(startup-finance)*
- **Play Store.** A Trusted Web Activity needs a Google Play developer account and a custom domain. *(You and engineering.)*
- **Account Aggregator.** Licensing route and partner cost. *(fintech-advisor)*
- **Pilot data.** Is DPDP-compliant consent for usage events covered by the current privacy policy, or does it need an update? *(Legal; the policy should say so before the events go live.)*

*Deliberately left out: pricing maths, a full PRD for "More tools", and a go-to-market plan beyond the pilot. Ask for any of them.*

---

## 9. What to change, by user and by flow (19 Nov)

**Frame**
- **Users:** a new family opening the link for the first time; you and other existing users who've lived through three redesigns; a family member who was invited.
- **Outcome:** more families reach the first value moment and keep logging. Metrics: activation rate and trusted weekly families (§6).
- **Riskiest assumption:** most drop-off happens before people see value (the sign-in wall, setup forms) and at the month boundary, not inside the core screens.
- **Stage fit:** these are the changes that decide whether the 5-family pilot teaches us anything. Everything else waits.

### Recommendation

Make **12 changes**, ranked below, plus the three P0 additions in §5 (measurement, feedback button, More tools). Five are needed before the pilot. The two biggest are both about the first five minutes:
- let a new person **try Paisa before signing in**;
- **welcome an invited family member** properly.

### By user

**New user (has the link, never opened it)**

| # | What they hit today | Change | Priority |
|---|---|---|---|
| 1 | Google sign-in before seeing anything | **"Try it first"** on the sign-in screen: device-only mode on the same link. "Turn on family sharing" later copies everything across (the copy already exists in Create family). | P0 |
| 2 | A "budget name" form, then 4 setup steps, then the number | Skip the name form (default "Our family budget", editable later). Setup becomes 3 questions: salary day, income, fixed payments. The household question moves to the invite moment. | P1 |
| 3 | Anyone not on Google's test-user list can't sign in, if the consent screen is still in Testing | Confirm it's published (In production). Not code; it blocks the pilot. | P0 (you) |
| 4 | Reveal, then an empty Today | After the reveal, open Add entry straight away: "Log one thing you spent today." The first entry is part of activation. | P1 |
| 5 | Install and reminders found later, by accident | After the first entry, one install step written for their phone (Safari: Share → Add to Home Screen; Chrome: Install), then turn on bill reminders. | P1 |

**Invited family member**

| # | What they hit today | Change | Priority |
|---|---|---|---|
| 6 | They join and land in someone else's budget with no explanation, no reminders and the app not installed | A 3-card welcome: who invited them and their role in plain words ("You can add entries and edit your own; income is hidden"); log your first spend; install and turn on reminders. | P0 (a second person logging is a key assumption) |

**Existing user (you, already set up)**

| # | What they hit today | Change | Priority |
|---|---|---|---|
| 7 | Tabs renamed, a new Month page and new features, with no notice | A one-time "What's new" sheet after an update (3 lines, linked to Help). | P0 (cheap) |
| 8 | Database updates (`v3.sql`, `v4.sql`) and the reminder-service redeploy still pending; the app quietly falls back | An Owner-only "Finish updates" row in Settings that appears only when the app detects the fallback, with the exact steps | P1 |
| 9 | Card bills still matched by name | One Needs-you heads-up: "Link Magnus to its bill so payments mark it paid." | P1 |
| 10 | The weekly bank check asks about every account at once after the update | One account per week, oldest first | P1 (quick) |

### By flow

| Flow | Today | Change | Priority |
|---|---|---|---|
| **Daily: log** | Strong: keypad, type or paste, repeats | Add an "Add entry" home-screen shortcut (long-press the icon). Keep the rest. | P1 (cheap) |
| **Weekly: check** | Bank check in Needs you; weekly push summary | No change before the pilot. If checks get skipped, merge them into one "Sunday check": the week's summary, accounts and next week's bills. | After pilot |
| **Monthly: salary day** | Pieces scattered: wrap card, "Use banks" heads-up, plan banner, repeats to confirm | **11. A "Start [month]" flow:** confirm salary arrived → starting money from banks → review commitments → set savings → see free to spend. Replaces the scattered pieces. The month boundary is where the habit is won or lost. | P1 (biggest change) |
| **Returning after a gap** (7+ days without an entry) | Today shows stale numbers and a long Needs-you list | **12. A no-guilt "Catch up" card:** match a bank statement, add what you remember, or "start fresh from today" (marks the gap, keeps the plan). Aimed straight at the riskiest assumption. | P1 |

### Ranked (ICE: impact × confidence × ease, 1–10 each)

| Rank | Change | I | C | E | Score |
|---|---|---|---|---|---|
| 1 | #3 Confirm Google sign-in is published | 9 | 9 | 10 | 810 |
| 2 | #1 Try it first (no sign-in) | 9 | 8 | 7 | 504 |
| 3 | #7 What's new sheet | 5 | 8 | 9 | 360 |
| 4 | #6 Member welcome | 8 | 6 | 7 | 336 |
| 5 | #4 First entry right after setup | 6 | 7 | 8 | 336 |
| 6 | #10 Stagger bank checks | 4 | 8 | 9 | 288 |
| 7 | #5 Install and reminders step | 6 | 6 | 7 | 252 |
| 8 | #12 Catch-up card | 8 | 5 | 6 | 240 |
| 9 | #9 Link-your-card heads-up | 4 | 7 | 8 | 224 |
| 10 | #11 Start-the-month flow | 9 | 6 | 4 | 216 |
| 11 | #2 Shorter setup | 6 | 6 | 6 | 216 |
| 12 | #8 Finish-updates row | 4 | 7 | 6 | 168 |

ICE favours cheap items. #11 and #12 score lower only because they take more work, but they carry the highest impact on the riskiest assumption, which is why they lead the "Next" list.

**Order to build:**
- **Now, before the pilot:** #3 (you), #1, #7, #6, plus §5's measurement, feedback button and More tools.
- **During week 1, cheap:** #4, #5, #10.
- **Next, if the pilot confirms the problem:** #11 Start the month, #12 Catch up, #2 shorter setup.
- **Later:** #8, #9, the Sunday check.

**Key trade-off:** "Try it first" means some people never create an account, so we can't see them in family-level metrics. We accept that: a person who never starts is worse than a person we can't count. The opt-in usage counts still work in device-only mode.

**Not doing now:**
- A tutorial or slideshow (people skip them; we teach at the moment of need instead).
- Gamification or streaks (they reward opening the app, not a true number).
- A redesign of the core screens (the design-craft pass just finished).
- Social login beyond Google (no evidence anyone needs it).

### Open questions
- **Is the Google consent screen published (In production)?** *(You, in Google Cloud.)*
- **Should device-only users be able to try reminders?** Push needs an account today. *(Engineering: possible with an anonymous subscription, but it's a privacy decision for you.)*
- **Which 5 families, and does each have one person who runs the money?** *(You.)*
