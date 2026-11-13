// Runs the send-reminders logic (the part between BEGIN/END LOGIC) with the shared money rules.
// node --experimental-strip-types tests/unit/reminders.test.mjs
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(root, 'supabase/functions/send-reminders/index.ts'), 'utf8');
const logic = src.slice(src.indexOf('// ---- BEGIN LOGIC'), src.indexOf('// ---- END LOGIC ----'));
const core = pathToFileURL(path.join(root, 'supabase/functions/_shared/money-core.js')).href;
const tmp = path.join(root, 'tests/unit/.reminders-logic.tmp.ts');
fs.writeFileSync(tmp, `import { addM, addDays, daysBetween, keyOfWith, dueDateWith, budgetAt, billPaidIn, cardReminders } from ${JSON.stringify(core)};\n${logic}\nexport { morningDues, morningMessage, weeklyMessage };\n`);
const { morningDues, morningMessage, weeklyMessage } = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);
let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; console.log('ok ', msg); };

const fam = () => ({ settings: { startDay: 1 }, months: {}, bills: {}, tx: [],
  cats: { rent: { name: 'Rent', section: 'bills', dueDay: 18, hist: [{ from: '2000-01', amt: 3000000 }] },
          axis: { name: 'Axis payment', section: 'debt', dueDay: 18, card: 'k1', hist: [{ from: '2000-01', amt: 2000000 }] } },
  cards: { k1: { name: 'Magnus', stmtDay: 12, dueDay: 14, stmts: {} }, k2: { name: 'Regalia', stmtDay: 5, dueDay: 25, stmts: {} } } });

let f = fam(); let d = morningDues(f, '2026-11-15');
ok(d.map((x) => x.name).join() === 'Rent,Axis payment', 'bills due in 3 days are listed');
f.tx.push({ type: 'xfer', from: 'a1', to: 'card:k2', amt: 100, date: '2026-11-10' });
ok(morningDues(f, '2026-11-15').some((x) => x.name === 'Axis payment'), 'paying a different card does not pay the linked bill');
f.tx.push({ type: 'xfer', from: 'a1', to: 'card:k1', amt: 3043700, date: '2026-11-10' });
ok(!morningDues(f, '2026-11-15').some((x) => x.name === 'Axis payment'), 'transfer to the linked card pays the bill even when renamed');
f = fam(); f.cards.k1.stmts['2026-11'] = { amt: 3043700, paid: 0 };
d = morningDues(f, '2026-11-11');
ok(d.some((x) => x.name === 'Magnus card' && x.when === 'due in 3 days' && x.amt === 3043700), 'unpaid card statement reminded 3 days before its due date');
f.cards.k1.stmts['2026-11'].paid = 3043700;
ok(!morningDues(f, '2026-11-11').some((x) => x.name === 'Magnus card'), 'paid statement is quiet');
f = fam(); d = morningDues(f, '2026-11-12');
ok(d.some((x) => x.name === 'Magnus card' && /statement is out/.test(x.when)), 'statement day nudges to add the amount');
const m = morningMessage(morningDues(fam(), '2026-11-15'));
ok(m && m.title === '2 payments coming up' && m.url === './#bills', 'morning message summarises');
const w = weeklyMessage(fam().cats, [{ type: 'xfer', amt: 5, date: '2026-11-14' }, { cat: 'rent', amt: 100000, date: '2026-11-14' }], '2026-11-15');
ok(w.title === 'This week: ₹1,000 spent', 'weekly message skips transfers');
console.log(`all ${n} reminder checks passed`);
