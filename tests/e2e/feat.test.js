const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7'],acceptDownloads:true});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.route('**/xlsx.full.min.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(XLSX_JS,'utf8')}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|Failed to load/.test(m.text())&&errs.push(m.text()));
// no share sheet in this test, so files download directly
await p.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:undefined})});
const U=URL;const S=OUT+'/';const log=(...a)=>console.log(...a);
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="150000"]');await p.click('[data-act=onb-go]');
for(const k of ['rent','home'])await p.click(`[data-act=onb-tile][data-k=${k}]`);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
log('font in use:',await p.evaluate(()=>getComputedStyle(document.querySelector('.hero2 .big')).fontFamily),'| loaded:',await p.evaluate(async()=>{await document.fonts.ready;return document.fonts.check('700 40px Inter')}));
// loan + clear-a-loan goal
await p.goto(U+'#plan');await p.click('[data-act=goplan][data-k=loans]');await p.click('[data-act=editloan]');await p.fill('#l-name','Home loan');await p.fill('#l-orig','4000000');await p.fill('#l-rate','8.5');await p.fill('#l-emi','37500');await p.fill('#l-out','3200000');await p.click('[data-act=saveloan]');
await p.click('[data-act=goplan][data-k=accounts]');await p.click('.mtile[data-k=goals]');await p.click('[data-act=newgoal][data-k=loan]');await p.fill('#g-d','2032-12');await p.click('[data-act=savegoal]');await p.waitForTimeout(200);
log('loan goal card:',(await p.textContent('.sect')).replace(/\s+/g,' ').trim());
await p.click('[data-act=newgoal][data-k=save]');await p.fill('#g-name','Goa trip');await p.fill('#g-t','60000');await p.fill('#g-s','12000');await p.fill('#g-m','8000');await p.click('[data-act=savegoal]');await p.waitForTimeout(150);
await p.screenshot({path:S+'g-goals.png',fullPage:true});
// export picker
await p.goto(U+'#prefs');await p.click('[data-act=prefsec][data-k=data]');await p.click('[data-act=exp-month]');await p.waitForSelector('#exp-sum');log('export default:',await p.textContent('#exp-sum'));
await p.click('[data-act=expper][data-k=all]');await p.click('[data-act=expinc][data-k=loans]');await p.click('[data-act=expinc][data-k=goals]');log('after picking Everything + loans + goals:',await p.textContent('#exp-sum'));
await p.screenshot({path:S+'g-export.png'});
let dl=p.waitForEvent('download',{timeout:15000}).catch(e=>null);await p.click('[data-act=expgo]');let d=await dl;
if(d){const f=S+'out.xlsx';await d.saveAs(f);const X=require(XLSX_NODE);const wb=X.readFile(f);log('Excel download:',d.suggestedFilename(),'| sheets:',wb.SheetNames.join(', '));}else log('Excel download: none (library blocked?)', await p.textContent('.toast').catch(()=>''));
await p.click('[data-act=exp-month]');await p.click('[data-act=expfmt][data-k=csv]');log('CSV note shown:',!!(await p.$('text=CSV holds one table')));
dl=p.waitForEvent('download',{timeout:8000}).catch(()=>null);await p.click('[data-act=expgo]');d=await dl;if(d){const f=S+'out.csv';await d.saveAs(f);log('CSV download:',d.suggestedFilename(),'| first line:',fs.readFileSync(f,'utf8').split('\n')[0].replace('﻿',''))}
// import check, using a CSV like the old tracker
const csv='Date,Category,Amount,Mode,Note\n2026-08-03,Salary,120000,Net banking,\n2026-08-05,Rent,25000,UPI,\n2026-08-09,Kirana store,3200,UPI,\n2026-08-15,SIP,15000,Auto-debit,\n2026-09-03,Salary,120000,Net banking,\n2026-09-06,Kirana store,2800,UPI,\n2026-09-20,Car loan EMI,12000,Auto-debit,\nbad row,,,,\n';
fs.writeFileSync(S+'old.csv',csv);
await p.reload();await p.goto(U+'#prefs');await p.click('[data-act=prefsec][data-k=data]');await p.waitForSelector('#imp-file',{state:'attached'});await p.setInputFiles('#imp-file',S+'old.csv');await p.waitForSelector('.sheet .reveal-num',{timeout:15000}).catch(()=>{});
log('import intro:',(await p.textContent('.sheet').catch(()=>'no sheet')).replace(/\s+/g,' ').slice(0,200));
await p.screenshot({path:S+'g-imp1.png'});await p.click('[data-act=impnext]');
log('import categories step:',(await p.$$eval('[data-impsec]',e=>e.map(s=>s.dataset.impsec+'→'+s.value))).join(', '));
await p.screenshot({path:S+'g-imp2.png'});await p.click('[data-act=impnext]');
log('month card:',(await p.textContent('.sheet')).replace(/\s+/g,' ').slice(0,170));await p.screenshot({path:S+'g-imp3.png'});
await p.click('[data-act=impskipm]');log('after leaving out Aug, next:',(await p.textContent('.sheet h2')).trim());await p.click('[data-act=impnext]');
log('final:',(await p.textContent('.sheet')).replace(/\s+/g,' ').slice(0,200));
await p.click('[data-act=doimport]');await p.waitForSelector('text=entries imported.',{timeout:15000});log('done:',(await p.textContent('.sheet')).replace(/\s+/g,' ').slice(0,80));
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
