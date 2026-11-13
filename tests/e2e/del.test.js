const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const U=URL;const S=OUT+'/';const log=(...a)=>console.log(...a);
const ev=f=>p.evaluate(f);const ntx=()=>ev(()=>Object.keys(D.tx).length);const sheet=async()=>(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ');
await p.goto(U+'#home');await p.waitForTimeout(500);
// last month: 3 entries + a later month exists (current); one paid from HDFC
await ev(()=>{const k=addM(curKey(),-1);const d=mStart(k);const c=n=>Object.keys(D.cats).find(x=>D.cats[x].name===n);const a=acctList()[0].id;
  [['Eating out',80000,'Zomato'],['Groceries',300000,'DMart'],['Shopping',150000,'Myntra']].forEach(([n,amt,note],i)=>store.set('tx','lm'+i,{cat:c(n),amt,date:d,mode:'UPI',acct:a,note,at:Date.now()-9e9,by:'local'}));
  const s=S();store.set('settings','main',{...s,startMonth:k});});
await p.waitForTimeout(300);
log('start: entries',await ntx(),'| this month opens at',await ev(()=>fmt(month(curKey()).open)),'| HDFC',await ev(()=>fmt(acctBalance(acctList()[0].id))));
// 1. from Settings
await p.goto(U+'#prefs');await p.waitForTimeout(300);await p.click('[data-act=deldata]');await p.waitForTimeout(200);
log('1 step 1 types:',(await p.$$eval('[data-act=delwhat]',e=>e.map(x=>x.innerText.split('\n')[0]))).join(', '));await p.screenshot({path:S+'d1.png'});
await p.click('[data-act=delnext]');await p.click('[data-act=delper][data-k=last]');log('  last month:',await p.textContent('#del-count'));await p.screenshot({path:S+'d2.png'});
await p.click('[data-act=delnext]');await p.click('.chip[data-act=delcat]:has-text("Eating out")');await p.click('.chip[data-act=delcat]:has-text("Shopping")');log('  2 categories:',await p.textContent('#del-count'));
await p.click('[data-act=delmore]');await p.fill('#del-min','1000');log('  min ₹1,000:',await p.textContent('#del-count'));await p.fill('#del-min','');await p.screenshot({path:S+'d3.png'});
await p.click('[data-act=delnext]');await p.waitForTimeout(200);log('  preview:',(await sheet()).slice(0,330));await p.screenshot({path:S+'d4.png'});
await p.click('[data-act=delgo]');await p.waitForTimeout(400);
log('  after: entries',await ntx(),'| this month opens at',await ev(()=>fmt(month(curKey()).open)),'| HDFC',await ev(()=>fmt(acctBalance(acctList()[0].id))),'| toast:',await p.textContent('.toast'));
// 2. Recently deleted + restore
await p.goto(U+'#prefs');await p.waitForTimeout(300);log('2 tile:',(await p.textContent('[data-act=prefsec][data-k=trash]')).replace(/\s+/g,' '));
await p.click('[data-act=prefsec][data-k=trash]');await p.waitForTimeout(200);await p.screenshot({path:S+'d5.png'});
await p.click('[data-act=trashrestore]');await p.waitForTimeout(400);log('  restored: entries',await ntx(),'| opens at',await ev(()=>fmt(month(curKey()).open)),'| HDFC',await ev(()=>fmt(acctBalance(acctList()[0].id))),'| trash left',await ev(()=>Object.keys(trashAll()).length));
// 3. recalculate mode
await ev(()=>openDelete({what:{entries:true},period:'last',step:3}));await p.waitForTimeout(200);await p.uncheck('#del-keep');await p.waitForTimeout(200);log('3 recalc preview:',(await p.textContent('.dimpact')).replace(/\s+/g,' '));
await p.click('[data-act=delgo]');await p.waitForTimeout(300);log('  this month opens at',await ev(()=>fmt(month(curKey()).open)),'| HDFC',await ev(()=>fmt(acctBalance(acctList()[0].id))));
await p.click('.toast [data-act], .toast button').catch(()=>{});await p.waitForTimeout(400);log('  undo -> entries',await ntx());
// 4. big delete needs the count typed
await ev(()=>{const c=Object.keys(D.cats).find(x=>D.cats[x].name==='Miscellaneous');for(let i=0;i<25;i++)store.set('tx','bulk'+i,{cat:c,amt:10000,date:todayISO(),mode:'Cash',note:'test '+i,src:'import',at:Date.now(),by:'local'})});
await ev(()=>openDelete({what:{entries:true},period:'this',f:{src:'import'},step:3}));await p.waitForTimeout(200);
log('4 big: button disabled?',await p.$eval('#del-go',e=>e.disabled));await p.fill('#del-type','25');log('  after typing 25:',await p.$eval('#del-go',e=>e.disabled));await p.click('#del-go');await p.waitForTimeout(400);log('  entries now',await ntx());
// 5. select mode on Entries
await p.goto(U+'#transactions');await p.waitForTimeout(400);await p.click('[data-act=selstart]');await p.click('.swipe >> nth=0 >> [data-act=edittx]');await p.click('.swipe >> nth=1 >> [data-act=edittx]');
log('5 bar:',(await p.textContent('.selbar')).replace(/\s+/g,' '));await p.screenshot({path:S+'d6.png'});
await p.click('[data-act=seldel]');await p.waitForTimeout(200);log('  sheet:',(await sheet()).slice(0,120));await p.click('[data-act=delgo]');await p.waitForTimeout(400);log('  entries now',await ntx(),'| select mode off:',!(await p.$('.selbar')));
// 6. category delete: move
await p.goto(U+'#budget');await p.waitForTimeout(300);
const gid=await ev(()=>Object.keys(D.cats).find(x=>D.cats[x].name==='Groceries'));const gN=await p.evaluate(id=>Object.values(D.tx).filter(t=>t.cat===id).length,gid);
await p.evaluate(id=>openCat(id),gid);await p.waitForTimeout(300);log('  gid',gid,await p.$$eval('#sheetRoot [data-act]',e=>e.map(x=>x.dataset.act).join(',')));await p.screenshot({path:S+'dbg4.png'});await p.click('[data-act=catdel]');await p.waitForTimeout(200);log('6 category sheet:',(await sheet()).slice(0,140));
await p.selectOption('#cd-to',{label:'Shopping'});await p.click('[data-act=catdelgo]');await p.waitForTimeout(400);
log('  Groceries gone:',await p.evaluate(id=>!D.cats[id],gid),'| moved',gN,'→ Shopping now has',await ev(()=>{const s=Object.keys(D.cats).find(x=>D.cats[x].name==='Shopping');return Object.values(D.tx).filter(t=>t.cat===s).length}),'| toast:',await p.textContent('.toast'));
// 7. clear this month from Budget opens on the period step
await p.$eval('[data-act=clearmonth]',e=>e.click());await p.waitForTimeout(200);log('7 clear month opens with:',await p.$eval('[data-act=delper][aria-pressed=true]',e=>e.textContent),'|',await p.textContent('#del-count'));await p.click('[data-act=close]');
// 8. account: delete with entries opens filtered
await p.goto(U+'#plan');await p.waitForTimeout(300);await ev(()=>openAccount(acctList()[1].id));await p.waitForTimeout(200);await p.click('[data-act=acctdel]');await p.waitForTimeout(200);log('8 account delete:',await p.textContent('#del-count'));await p.click('[data-act=close]');
// 9. start fresh
await p.goto(U+'#prefs');await p.waitForTimeout(200);await p.click('[data-act=deldata]');await p.click('[data-act=delfresh]');await p.waitForTimeout(200);await p.screenshot({path:S+'d7.png'});
log('9 fresh button disabled:',await p.$eval('#fr-go',e=>e.disabled));await p.fill('#fr-type','fresh');await p.fill('#fr-open','50000');await p.click('#fr-go');await p.waitForTimeout(500);
log('  after: entries',await ntx(),'| cats',await ev(()=>Object.keys(D.cats).length),'| accounts',await ev(()=>Object.keys(D.accounts).length),'| left',await ev(()=>fmt(month(curKey()).left)),'| starts',await ev(()=>S().startMonth));
await p.goto(U+'#prefs');await p.waitForTimeout(200);await p.click('[data-act=prefsec][data-k=trash]');await p.waitForTimeout(200);log('  recently deleted rows:',await p.$$eval('.trow.static',e=>e.length));
await p.click('[data-act=trashrestore] >> nth=0');await p.waitForTimeout(500);log('  undo fresh -> entries',await ntx(),'| accounts',await ev(()=>Object.keys(D.accounts).length),'| starts',await ev(()=>S().startMonth));
// 10. reload keeps trash (local mode)
await p.reload();await p.waitForTimeout(500);log('10 trash after reload:',await ev(()=>Object.keys(trashAll()).length),'| in backup:',await ev(()=>'trash' in {...D,trash:{}}));
// 11. member rules
log('11 member may delete:',await ev(()=>{ROLE='Member';const r=DEL_TYPES.filter(([k])=>delAllowed(k)).map(x=>x[0]);ROLE='Owner';return r.join(',')}));
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
