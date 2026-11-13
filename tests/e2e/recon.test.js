const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;const log=(...a)=>console.log(...a);
await p.goto(U+'#home');await p.waitForTimeout(500);
// accounts were added 40 days ago and checked 8 days ago
await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem('paisa-local'));const old=addDays(todayISO(),-40),chk=addDays(todayISO(),-8);Object.values(o.accounts).forEach(a=>{a.asOf=old;a.createdAt=0;a.checkedAt=chk});localStorage.setItem('paisa-local',JSON.stringify(o))});
await p.reload();await p.waitForTimeout(500);
const needs=await p.evaluate(()=>needsItems(curKey()).map(n=>n.type+': '+n.title));log('needs:',needs.join(' | '));
const hdfc=await p.evaluate(()=>acctList().find(a=>a.bank==='HDFC Bank').id);const bal=await p.evaluate(id=>acctBalance(id),hdfc);
await p.evaluate(id=>openCheck(id),hdfc);await p.fill('#ck-bal',String(bal/100-1200));await p.click('[data-act=checkfix]');await p.waitForTimeout(200);
log('diff sheet:',(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ').slice(0,190));await p.screenshot({path:OUT+'/rc1.png'});
const left0=await p.evaluate(()=>month(curKey()).left);
await p.click('[data-act=checklog]');await p.waitForTimeout(300);
log('after log: bank now',await p.evaluate(id=>fmt(acctBalance(id)),hdfc),'| left to spend moved by',await p.evaluate(l=>fmt(month(curKey()).left-l),left0),'| toast:',await p.textContent('.toast'));
log('weekly check gone for HDFC:',!(await p.evaluate(id=>needsItems(curKey()).some(n=>n.key==='acct.check:'+id),hdfc)));
// starting money from banks
log('bank start:',await p.evaluate(()=>{const b=bankStart(curKey());return b==null?'n/a':fmt(b)}),'| plan start:',await p.evaluate(()=>fmt(month(curKey()).open)));
const ms=await p.evaluate(()=>needsItems(curKey()).find(n=>n.type==='month.start'));log('month.start message:',ms?ms.title+' / '+ms.detail:'none');
if(ms){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.act='useopenbank';document.getElementById('app').appendChild(b);b.click()});await p.waitForTimeout(300);log('  after Use banks: start',await p.evaluate(()=>fmt(month(curKey()).open)),'| message gone:',!(await p.evaluate(()=>needsItems(curKey()).some(n=>n.type==='month.start'))))}
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
