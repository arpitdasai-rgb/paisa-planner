// Paisa Planner · send-reminders (Supabase Edge Function)
// Sends push notifications to family members' phones, even when the app is closed.
//   kind=morning  8:00 am IST  bills and EMIs due in 3 days, due today, or missed yesterday
//   kind=evening  9:00 pm IST  "Spent anything today?" if the person logged nothing (opt-in)
//   kind=weekly   Sunday 7 pm  this week's spending in one line (opt-in)
//   kind=auto     run every hour; each person gets reminders at the times they chose in Settings
//   kind=test     sent from the app's Settings to the signed-in person only
// Scheduled kinds need the x-cron-secret header; "test" needs the person's sign-in token.
// Secrets to set in Supabase: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

// ---- BEGIN LOGIC (pure functions, tested outside Supabase) ----
const pad = (n: number) => String(n).padStart(2, "0");
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const ym = (y: number, m: number) => `${y}-${pad(m)}`;
function addM(k: string, n: number) { let [y, m] = k.split("-").map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return ym(y, m); }
function addDays(ds: string, n: number) { const d = new Date(ds + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
function istNow(now = Date.now()) { return new Date(now + 330 * 60000); }          // India is UTC+5:30
function istToday(now = Date.now()) { return istNow(now).toISOString().slice(0, 10); }
function keyOf(ds: string, sd: number) { const [y, m, d] = ds.split("-").map(Number); return d < Math.min(sd, dim(y, m)) ? addM(ym(y, m), -1) : ym(y, m); }
function dueDate(k: string, day: number, sd: number) {
  const [y, m] = k.split("-").map(Number);
  if (sd === 1 || day >= sd) return `${ym(y, m)}-${pad(Math.min(day, dim(y, m)))}`;
  const n = addM(k, 1); const [y2, m2] = n.split("-").map(Number); return `${n}-${pad(Math.min(day, dim(y2, m2)))}`;
}
const inr = (p: number) => "₹" + Math.round(Math.abs(p) / 100).toLocaleString("en-IN");
type Cat = { name: string; section: string; dueDay?: number | null; archived?: boolean; hist?: { from: string; amt: number }[] };
type Tx = { cat: string; amt: number; date: string };
function budgetOf(c: Cat, id: string, k: string, months: Record<string, any>) {
  const ov = months[k]?.b?.[id]; if (ov != null) return ov;
  const h = (c.hist || []).slice().sort((a, b) => a.from.localeCompare(b.from)); let v = h.length ? h[0].amt : 0;
  for (const e of h) if (e.from <= k) v = e.amt; return v;
}
// Which bills deserve a nudge this morning: 3 days before, on the day, and the morning after if still unpaid.
function morningDues(fam: { settings: any; cats: Record<string, Cat>; tx: Tx[]; bills: Record<string, any>; months: Record<string, any> }, today: string) {
  const sd = fam.settings?.startDay || 1; const out: { name: string; when: string; amt: number; dd: number }[] = [];
  // a bill due early next month or late last month can matter today, so check three months
  for (const k of [addM(keyOf(today, sd), -1), keyOf(today, sd), addM(keyOf(today, sd), 1)]) {
    for (const [id, c] of Object.entries(fam.cats)) {
      if (c.archived || !c.dueDay || (c.section !== "bills" && c.section !== "debt")) continue;
      const due = dueDate(k, c.dueDay, sd); const dd = daysBetween(today, due);
      if (dd !== 3 && dd !== 0 && dd !== -1) continue;
      const paid = fam.tx.some((t) => t.cat === id && keyOf(t.date, sd) === k);
      const skipped = !!fam.bills[k]?.skip?.[id];
      if (paid || skipped) continue;
      out.push({ name: c.name, amt: budgetOf(c, id, k, fam.months), dd, when: dd === 3 ? "due in 3 days" : dd === 0 ? "due today" : "was due yesterday" });
    }
  }
  return out.sort((a, b) => a.dd - b.dd);
}
function morningMessage(dues: { name: string; when: string; amt: number; dd: number }[]) {
  if (!dues.length) return null;
  const missed = dues.filter((d) => d.dd === -1);
  const title = dues.length === 1 ? `${dues[0].name} ${dues[0].when}` : missed.length ? `${missed.length} payment${missed.length > 1 ? "s" : ""} missed, ${dues.length - missed.length} coming up` : `${dues.length} payments coming up`;
  const body = dues.slice(0, 4).map((d) => `${d.name} · ${inr(d.amt)} · ${d.when}`).join("\n");
  return { title, body, url: "./#bills", tag: "paisa-bills" };
}
function weeklyMessage(cats: Record<string, Cat>, tx: Tx[], today: string) {
  const from = addDays(today, -6); const week = tx.filter((t) => t.date >= from && t.date <= today && cats[t.cat] && cats[t.cat].section !== "income");
  if (!week.length) return { title: "Your week in money", body: "Nothing logged this week. Add what you spent to keep your daily number honest.", url: "./#add", tag: "paisa-weekly" };
  const total = week.reduce((s, t) => s + t.amt, 0); const by: Record<string, number> = {};
  week.forEach((t) => { by[cats[t.cat].name] = (by[cats[t.cat].name] || 0) + t.amt; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return { title: `This week: ${inr(total)} spent`, body: `${week.length} entries. Biggest: ${top[0]} ${inr(top[1])}.`, url: "./#home", tag: "paisa-weekly" };
}
// ---- END LOGIC ----

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:reminders@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  } catch (e) { return json({ error: "VAPID keys missing or invalid: " + (e as Error).message }, 500); }
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let body: any = {}; try { body = await req.json(); } catch (_) { /* empty body */ }
  const kind = new URL(req.url).searchParams.get("kind") || body.kind || "auto";
  const nowIst = istNow(); const hour = nowIst.getUTCHours(); const dow = nowIst.getUTCDay();

  // who may call: the schedule (secret header) or a signed-in person testing their own phone
  let onlyUser: string | null = null;
  if (kind === "test") {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return json({ error: "Sign in to send a test." }, 401);
    onlyUser = data.user.id;
  } else if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "Not allowed." }, 401);
  }

  let q = db.from("push_subscriptions").select("endpoint,user_id,p256dh,auth,prefs");
  if (onlyUser) q = q.eq("user_id", onlyUser);
  const { data: subs, error: subErr } = await q;
  if (subErr) return json({ error: subErr.message }, 500);
  if (!subs?.length) return json({ sent: 0, note: "No phones have reminders turned on." });

  const today = istToday();
  const send = async (s: any, msg: any) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" }); return 1; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); return 0; }
  };

  if (kind === "test") {
    let n = 0; for (const s of subs) n += await send(s, { title: "Reminders are on", body: "You'll hear about bills 3 days before they're due, on the day, and the morning after if unpaid.", url: "./#bills", tag: "paisa-test" });
    return json({ sent: n });
  }

  // family for each person
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: mem } = await db.from("family_members").select("user_id,family_id").in("user_id", userIds);
  const famOf: Record<string, string> = {}; (mem || []).forEach((m) => { famOf[m.user_id] = m.family_id; });
  const famIds = [...new Set(Object.values(famOf))];

  // load what each family needs: settings, categories, months, bill skips, and recent entries
  const since = addDays(today, -75);
  const fams: Record<string, any> = {}; famIds.forEach((f) => { fams[f] = { settings: null, cats: {}, months: {}, bills: {}, tx: [], txRaw: [] }; });
  for (let from = 0; famIds.length; from += 1000) {
    const { data, error } = await db.from("docs").select("family_id,col,id,data,created_by,updated_at").in("family_id", famIds).eq("deleted", false).in("col", ["settings", "cats", "months", "bills"]).range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    for (const r of data) { const f = fams[r.family_id]; if (r.col === "settings") f.settings = r.data; else f[r.col][r.id] = r.data; }
    if (data.length < 1000) break;
  }
  for (let from = 0; famIds.length; from += 1000) {
    const { data, error } = await db.from("docs").select("family_id,data,created_by,updated_at").in("family_id", famIds).eq("deleted", false).eq("col", "tx").gte("data->>date", since).range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    for (const r of data) { fams[r.family_id].tx.push(r.data); fams[r.family_id].txRaw.push(r); }
    if (data.length < 1000) break;
  }

  let sent = 0, skipped = 0;
  const startOfTodayUtc = new Date(Date.parse(today + "T00:00:00Z") - 330 * 60000).toISOString();
  for (const s of subs) {
    const f = fams[famOf[s.user_id]]; const prefs = s.prefs || {};
    if (!f || !f.settings) { skipped++; continue; }
    // which reminders are due for this person right now (fixed kinds, or their own chosen hours when kind=auto)
    const at = (h: unknown, def: number) => (typeof h === "number" && h >= 0 && h <= 23 ? h : def);
    const wantBills = prefs.bills !== false && (kind === "morning" || (kind === "auto" && hour === at(prefs.billsHour, 8)));
    const wantEvening = !!prefs.evening && (kind === "evening" || (kind === "auto" && hour === at(prefs.eveningHour, 21)));
    const wantWeekly = !!prefs.weekly && (kind === "weekly" || (kind === "auto" && dow === at(prefs.weeklyDay, 0) && hour === at(prefs.weeklyHour, 19)));
    const msgs: any[] = [];
    if (wantBills) { const m = morningMessage(morningDues(f, today)); if (m) msgs.push(m); }
    if (wantEvening) {
      const loggedToday = f.txRaw.some((r: any) => r.created_by === s.user_id && r.updated_at >= startOfTodayUtc);
      if (!loggedToday) msgs.push({ title: "Spent anything today?", body: "Tap to log it. It takes a few seconds and keeps your daily number right.", url: "./#add", tag: "paisa-evening" });
    }
    if (wantWeekly) msgs.push(weeklyMessage(f.cats, f.tx, today));
    if (!msgs.length) { skipped++; continue; }
    for (const m of msgs) sent += await send(s, m);
  }
  return json({ kind, sent, skipped });
});
