const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// builds a realistic budget and saves localStorage to seed.json
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="150000"]');await p.click('[data-act=onb-go]');for(const k of['rent','home','sip','help'])await p.click(`[data-act=onb-tile][data-k=${k}]`);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.fill('#onb-open','40000');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
const key=async s=>{for(const ch of s)await p.click(`[data-act=key][data-k="${ch}"]`)};
await p.click('[data-act=recok]').catch(()=>{});
await p.goto(U+'#plan');await p.waitForTimeout(300);
for(const [bank,l4,bal,typ] of [['HDFC Bank','4821','82000','Salary'],['SBI','1123','26500','Savings']]){await p.click('[data-act=editacct] >> nth=0').catch(async()=>{await p.click('[data-act=waddmenu]');await p.click('[data-act=editacct]')});await p.selectOption('#ac-bank',bank);await p.click(`[data-act=actype][data-k=${typ}]`);await p.fill('#ac-last4',l4);await p.fill('#ac-bal',bal);await p.click('[data-act=saveacct]');await p.waitForTimeout(200)}
await p.click('[data-act=waddmenu]');await p.click('[data-act=editcard]');await p.fill('#k-name','Magnus');await p.fill('#k-bank','Axis Bank');await p.fill('#k-limit','300000');await p.fill('#k-sd','12');await p.fill('#k-dd','14');await p.click('[data-act=savecard]');await p.waitForTimeout(200);
await p.click('[data-act=goplan][data-k=cards]');await p.click('[data-act=stmt]');await p.fill('#s-amt','30437');await p.fill('#s-paid','0');await p.click('[data-act=savestmt]');await p.waitForTimeout(200);
for(const [a,c,n] of [['350','Eating out','Swiggy'],['2400','Groceries','BigBasket'],['1200','Transport','Uber'],['890','Shopping','Amazon']]){await p.goto(U+'#home');await p.click('#fab');await key(a);await p.click(`.chip[data-act=qcat]:has-text("${c}") >> nth=0`).catch(async()=>{await p.click('[data-act=qall]');await p.click(`.chip[data-act=qcat]:has-text("${c}") >> nth=0`)});await p.click('[data-act=qmore]');await p.fill('#q-note',n);await p.click('[data-act=qsave]');await p.waitForTimeout(250);if(await p.$('.sheet'))await p.click('[data-act=close]').catch(()=>{})}
// a transfer and an income
await p.goto(U+'#home');await p.click('#fab');await p.click('[data-act=qtype][data-k=xfer]');await key('5000');await p.click('[data-act=qfrom] >> nth=0');await p.click('[data-act=qto] >> nth=0');await p.click('[data-act=qsave]');await p.waitForTimeout(300);if(await p.$('.sheet'))await p.click('[data-act=close]').catch(()=>{});
await p.waitForTimeout(1500);
const ls=await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))));
require('fs').writeFileSync(OUT+'/seed.json',ls);console.log('seeded',ls.length,'bytes',errs.length?errs:'');await b.close()})();
