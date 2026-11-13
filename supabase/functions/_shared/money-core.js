// Paisa Planner · money rules shared by the app (browser) and the send-reminders function (Deno).
// One copy only: dates, budget months, budgets over time, bill status and credit-card bill links.
// Pure functions, amounts in paise, dates as 'YYYY-MM-DD', budget months as 'YYYY-MM'.
// The app loads this file as a module (it sets globalThis.PaisaCore); the function imports it.

export const pad = (n) => String(n).padStart(2, '0');
export const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const ym = (y, m) => y + '-' + pad(m);
export function addM(k, n) { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return ym(y, m); }
export function addDays(ds, n) { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

// Which budget month a date belongs to. With a start day of 25, 24 Nov is in the '2026-10' month.
export function keyOfWith(ds, sd) { const [y, m, d] = ds.split('-').map(Number); return d < Math.min(sd, dim(y, m)) ? addM(ym(y, m), -1) : ym(y, m); }
export function mStartWith(k, sd) { const [y, m] = k.split('-').map(Number); return ym(y, m) + '-' + pad(Math.min(sd, dim(y, m))); }
// A bill's due date in budget month k: same calendar month if its day is on/after the start day, else the next one.
export function dueDateWith(k, day, sd) {
  const [y, m] = k.split('-').map(Number);
  if (sd === 1 || day >= sd) return ym(y, m) + '-' + pad(Math.min(day, dim(y, m)));
  const n = addM(k, 1); const [y2, m2] = n.split('-').map(Number); return n + '-' + pad(Math.min(day, dim(y2, m2)));
}
// A category's budget in month k: a one-month override, else the latest history entry on or before k.
export function budgetAt(c, id, k, months) {
  const ov = months && months[k] && months[k].b && months[k].b[id]; if (ov != null) return ov;
  const h = (c.hist || []).slice().sort((a, b) => a.from.localeCompare(b.from)); let v = h.length ? h[0].amt : 0;
  for (const e of h) if (e.from <= k) v = e.amt; return v;
}

// Credit-card bills. A category that pays a card has cat.card = <card id>.
// Older budgets with no links at all fall back to a name match ('credit card'), shown as '*'.
export function cardOfCat(c, cats, cards) {
  if (!c) return null;
  if (c.card) return cards && cards[c.card] ? c.card : null;
  const anyLinked = Object.values(cats || {}).some((x) => x && x.card);
  return !anyLinked && /credit card/i.test(c.name || '') ? '*' : null;
}
// Money moved to the card(s) a bill category pays, in a list of entries.
export function paidToCard(c, cats, cards, list) {
  const k = cardOfCat(c, cats, cards); if (!k) return 0;
  return list.filter((x) => x && x.type === 'xfer' && String(x.to || '').startsWith('card:') && (k === '*' || x.to === 'card:' + k)).reduce((s, x) => s + x.amt, 0);
}
// Is bill category id paid in budget month k? Any entry in it, or (for a card bill) a transfer to its card.
export function billPaidIn({ id, c, k, sd, tx, cats, cards }) {
  const inMonth = tx.filter((t) => t && t.date && keyOfWith(t.date, sd) === k);
  return inMonth.some((t) => t.cat === id) || paidToCard(c, cats, cards, inMonth) > 0;
}

// Card statements: a statement saved for budget month k is due on the card's due day,
// in the same calendar month when the due day comes after the statement day, otherwise the next.
export function cardDueDate(card, k) {
  if (!card || !card.dueDay) return null;
  const [y, m] = k.split('-').map(Number); const sameMonth = !card.stmtDay || card.dueDay > card.stmtDay;
  const n = sameMonth ? k : addM(k, 1); const [y2, m2] = n.split('-').map(Number);
  return n + '-' + pad(Math.min(card.dueDay, dim(y2, m2)));
}
// What a phone should hear about cards today: an unpaid statement due in 3 days, today or yesterday,
// and on the statement day a nudge to add the amount if it isn't in yet.
export function cardReminders(cards, today, sd) {
  const out = []; const cur = keyOfWith(today, sd);
  for (const [id, c] of Object.entries(cards || {})) {
    if (!c) continue;
    for (const k of [addM(cur, -1), cur]) {
      const st = c.stmts && c.stmts[k]; if (!st || !st.amt || (st.paid || 0) >= st.amt) continue;
      const due = cardDueDate(c, k); if (!due) continue; const dd = daysBetween(today, due);
      if (dd === 3 || dd === 0 || dd === -1) out.push({ id, name: c.name + ' card', amt: st.amt - (st.paid || 0), dd, when: dd === 3 ? 'due in 3 days' : dd === 0 ? 'due today' : 'was due yesterday' });
    }
    const [y, m, d] = today.split('-').map(Number);
    if (c.stmtDay && d === Math.min(c.stmtDay, dim(y, m)) && !(c.stmts && c.stmts[cur])) out.push({ id, name: c.name + ' card', amt: 0, dd: 99, when: 'statement is out: add the amount' });
  }
  return out;
}

const PaisaCore = { pad, dim, ym, addM, addDays, daysBetween, keyOfWith, mStartWith, dueDateWith, budgetAt, cardOfCat, paidToCard, billPaidIn, cardDueDate, cardReminders };
globalThis.PaisaCore = PaisaCore;
export default PaisaCore;
