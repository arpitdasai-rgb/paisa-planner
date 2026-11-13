const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;const log=(...a)=>console.log(...a);
await p.goto(U+'#home');await p.waitForTimeout(500);
// 1. a card purchase, then paying the card bill as an expense -> warning
await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem('paisa-local'));const cid=Object.keys(o.cats).find(k=>o.cats[k].name==='Shopping');o.tx.cp={cat:cid,amt:120000,date:new Date().toISOString().slice(0,10),mode:'Card',card:Object.keys(o.cards)[0],note:'Myntra',at:Date.now(),by:'local'};
  const cc=Object.keys(o.cats).find(k=>/credit card/i.test(o.cats[k].name));if(!cc){o.cats.ccb={name:'Credit card bill',section:'debt',order:9,archived:false,dueDay:18,hist:[{from:'2000-01',amt:2000000}]}}localStorage.setItem('paisa-local',JSON.stringify(o))});
await p.reload();await p.waitForTimeout(500);
await p.click('#fab');for(const ch of '30437')await p.click(`[data-act=key][data-k="${ch}"]`);
if(!await p.$('.chip[data-act=qcat]:has-text("Credit card")'))await p.click('[data-act=qall]');await p.click('.chip[data-act=qcat]:has-text("Credit card") >> nth=0');
log('1 double-count warning:',await p.isVisible('[data-act=qpaycard]'));
await p.click('[data-act=qpaycard]');await p.waitForTimeout(200);log('  switched to:',await p.$eval('[data-act=qtype][aria-pressed=true]',e=>e.textContent),'| to:',await p.$eval('[data-act=qto][aria-pressed=true]',e=>e.textContent).catch(()=>'none'));
await p.click('[data-act=qsave]');await p.waitForTimeout(400);await p.click('[data-act=close]').catch(()=>{});
await p.goto(U+'#bills');await p.waitForTimeout(400);
log('  card bill status:',await p.evaluate(()=>billsFor(VM).filter(b=>/credit card/i.test(b.name)).map(b=>b.name+' '+b.st+' '+b.actual/100)));
// 2. delete a transfer -> readable message
await p.goto(U+'#transactions');await p.waitForTimeout(400);await p.click('.row:has-text("Self transfer") >> nth=0').catch(async()=>{await p.click('text=Self transfer >> nth=0')});await p.waitForTimeout(300);
await p.click('[data-act=qdel]');await p.waitForTimeout(200);log('2 transfer delete toast:',await p.textContent('.toast'));
// 3. account added after entries the same day keeps the typed balance
await p.evaluate(()=>{const t=document.getElementById('toastRoot');if(t)t.innerHTML=''});await p.goto(U+'#plan');await p.waitForTimeout(300);await p.click('[data-act=waddmenu]');await p.click('[data-act=editacct]');await p.selectOption('#ac-bank','ICICI Bank');await p.fill('#ac-bal','10000');await p.click('[data-act=saveacct]');await p.waitForTimeout(300);
const before=await p.evaluate(()=>{const id=Object.keys(D.accounts).find(k=>D.accounts[k].bank==='ICICI Bank');return acctBalance(id)/100});
await p.evaluate(()=>{const id=Object.keys(D.accounts).find(k=>D.accounts[k].bank==='ICICI Bank');const c=Object.keys(D.cats).find(k=>D.cats[k].name==='Groceries');store.set('tx','old1',{cat:c,amt:50000,date:todayISO(),mode:'UPI',acct:id,at:Date.now()-3600e3,by:'local'});store.set('tx','new1',{cat:c,amt:20000,date:todayISO(),mode:'UPI',acct:id,at:Date.now()+5,by:'local'})});
const after=await p.evaluate(()=>{const id=Object.keys(D.accounts).find(k=>D.accounts[k].bank==='ICICI Bank');return acctBalance(id)/100});
log('3 new account ₹',before,'→ after an older same-day entry (ignored) and a newer one (₹200):',after);
// 4. export rows for transfers
const rows=await p.evaluate(()=>expTables?null:null);
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
