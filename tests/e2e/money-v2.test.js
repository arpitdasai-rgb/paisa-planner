const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7'],acceptDownloads:true});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.route('**/xlsx.full.min.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(XLSX_JS,'utf8')}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|Failed to load/.test(m.text())&&errs.push(m.text()));
await p.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:undefined})});
const U=URL;const S=OUT+'/';const log=(...a)=>console.log(...a);
const key=async s=>{for(const ch of s)await p.click(`[data-act=key][data-k="${ch}"]`)};
const txt=async sel=>(await p.textContent(sel)).replace(/\s+/g,' ').trim();
// first run (salary 1,00,000 lands on the 1st)
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="100000"]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-tile][data-k=rent]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');await p.waitForTimeout(300);
log('1 To confirm on Home:',await p.$eval('.sect:has(h2:text("To confirm"))',e=>e.textContent.replace(/\s+/g,' ').trim()).catch(()=>'none'));
await p.click('[data-act=recok]');await p.waitForTimeout(300);log('  after Confirm, still listed?',!!(await p.$('[data-act=recok]')),'| left to spend:',await txt('.hero2 .big'));
// accounts
await p.goto(U+'#plan');await p.waitForSelector('[data-act=editacct]');
await p.click('[data-act=editacct] >> nth=0');await p.selectOption('#ac-bank','HDFC Bank');await p.fill('#ac-last4','4821');await p.fill('#ac-bal','50000');await p.click('[data-act=saveacct]');await p.waitForTimeout(200);
await p.click('[data-act=waddmenu] >> nth=0');await p.click('.sheet [data-act=editacct]');await p.selectOption('#ac-bank','Other');await p.fill('#ac-other','Wallet cash');await p.click('[data-act=actype][data-k=Cash]');await p.fill('#ac-bal','2000');await p.click('#ac-def');await p.click('#ac-def');await p.click('[data-act=saveacct]');await p.waitForTimeout(200);
log('2 wallet cards:',(await p.$$eval('.pcard',e=>e.map(x=>x.querySelector('.pc-bank').textContent+' '+x.querySelector('.pc-amt').textContent))).join(' | '));
// expense from default account
await p.goto(U+'#home');const before=await txt('.hero2 .big');
await p.click('#fab');await key('500');await p.click('.chip[data-act=qcat]:has-text("Groceries")');log('3 entry line shows account:',await txt('.qmeta'));await p.click('[data-act=qsave]');await p.waitForTimeout(300);
// self transfer HDFC -> cash
await p.click('#fab');await p.click('[data-act=qtype][data-k=xfer]');await key('1000');await p.click('[data-act=qto] >> nth=0');log('4 transfer button:',await txt('[data-act=qsave]'));
await p.screenshot({path:S+'v2-transfer.png'});await p.click('[data-act=qsave]');await p.waitForTimeout(300);
const afterXfer=await txt('.hero2 .big');log('  left to spend before/after transfer:',before,'->',afterXfer,'(only the ₹500 expense should change it)');
await p.goto(U+'#plan');await p.waitForSelector('.pcard');log('  balances:',(await p.$$eval('.pcard',e=>e.map(x=>x.querySelector('.pc-bank').textContent+' '+x.querySelector('.pc-amt').textContent))).join(' | '));
// balance check
await p.click('[data-act=checkacct] >> nth=0');await p.fill('#ck-bal','48000');await p.click('[data-act=checkfix]');await p.waitForTimeout(150);await p.click('[data-act=checkadj]').catch(()=>{});await p.waitForTimeout(300);log('5 after balance check:',await p.$eval('.cstack .pc-amt',e=>e.textContent));
// split
await p.goto(U+'#home');await p.click('#fab');await key('1000');await p.click('[data-act=qmore]');await p.click('[data-act=spliton]');
const cats=await p.$$eval('[data-split-cat="0"] option',o=>o.map(x=>[x.value,x.textContent]));const g=cats.find(c=>c[1]==='Groceries')[0],e=cats.find(c=>c[1]==='Eating out')[0];
await p.selectOption('[data-split-cat="0"]',g);await p.fill('[data-split-amt="0"]','600');await p.selectOption('[data-split-cat="1"]',e);await p.fill('[data-split-amt="1"]','300');
log('6 split remaining:',await txt('#split-left'),'| save disabled:',await p.$eval('[data-act=qsave]',b=>b.disabled));
await p.fill('[data-split-amt="1"]','400');log('  after fixing:',await txt('#split-left'));await p.click('[data-act=qsave]');await p.waitForTimeout(300);
// repeat from an entry
await p.click('#fab');await key('5000');await p.click('[data-act=qall]');await p.click('.chip[data-act=qcat]:has-text("Rent")');await p.click('[data-act=qmore]');await p.check('#q-repeat');await p.click('[data-act=qsave]');await p.waitForTimeout(300);log('7 repeat toast:',await txt('.toast'));
// entries list
await p.goto(U+'#transactions');await p.waitForSelector('.swipe');log('8 entries:',(await p.$$eval('.swipe .row',e=>e.map(x=>x.querySelector('.t').textContent+' ['+x.querySelector('.s').textContent.replace(/\s+/g,' ')+'] '+x.querySelector('.amt').textContent))).join(' | '));
await p.selectOption('#f-acct',{index:2});await p.waitForTimeout(100);log('  filter by cash account:',(await p.$$eval('.swipe .row .t',e=>e.map(x=>x.textContent))).join(', '));
// plan: repeats, net worth, yearly
await p.goto(U+'#plan');await p.click('.mtile[data-k=recurring]');log('9 repeats:',(await p.$$eval('.sect .row',e=>e.map(x=>x.querySelector('.t').textContent+' '+x.querySelector('.s').textContent.replace(/\s+/g,' ')))).join(' | '));
await p.click('[data-act=goplan][data-k=accounts]');await p.click('.mtile[data-k=networth]');await p.click('[data-act=editasset]');await p.selectOption('#as-type','Fixed deposit');await p.fill('#as-name','SBI FD');await p.fill('#as-val','100000');await p.click('[data-act=saveasset]');await p.waitForTimeout(300);
log('10 net worth:',(await txt('.bsum')),'|',(await p.$$eval('.sect:first-of-type .kv',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()))).join(' · '));
await p.screenshot({path:S+'v2-networth.png',fullPage:true});
await p.click('[data-act=goplan][data-k=accounts]');await p.click('.mtile[data-k=goals]');await p.click('[data-act=newgoal][data-k=yearly]');await p.fill('#g-name','Car insurance');await p.fill('#g-amt','24000');await p.selectOption('#g-mon','3');await p.click('[data-act=savegoal]');await p.waitForTimeout(200);
log('11 yearly payment:',(await p.$$eval('.sect',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>t.includes('Car insurance'))))[0]);
// export with accounts + net worth
await p.goto(U+'#prefs');await p.click('[data-act=prefsec][data-k=data]');await p.click('[data-act=exp-month]');await p.click('[data-act=expinc][data-k=accounts]');await p.click('[data-act=expinc][data-k=networth]');
const dl=p.waitForEvent('download',{timeout:15000});await p.click('[data-act=expgo]');const d=await dl;await d.saveAs(S+'v2.xlsx');const X=require(XLSX_NODE);const wb=X.readFile(S+'v2.xlsx');
log('12 export sheets:',wb.SheetNames.join(', '),'| entries header:',X.utils.sheet_to_json(wb.Sheets['Entries'],{header:1})[0].join(','));
log('   transfer row:',JSON.stringify(X.utils.sheet_to_json(wb.Sheets['Entries'],{header:1}).find(r=>r[1]==='Self transfer')));
// share an SMS to the app
await p.goto(U+'?text='+encodeURIComponent('Rs.450.00 debited from A/c XX4821 to SWIGGY on 11-11-26. UPI Ref 6315'));await p.waitForSelector('.keypad',{timeout:8000}).catch(()=>{});
log('13 shared SMS ->',await txt('#q-amt').catch(()=>'no sheet'),'|',await txt('.qmeta').catch(()=>''),'| url now:',await p.evaluate(()=>location.search||'(cleaned)'));
// privacy page
await p.goto(U+'privacy.html');log('14 privacy page:',await txt('h1'));
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
