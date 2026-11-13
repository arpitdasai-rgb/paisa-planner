const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});
await ctx.grantPermissions(['notifications'],{origin:new (require('url').URL)(URL).origin});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:"",vapidPublicKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|Failed to load/.test(m.text())&&errs.push(m.text()));
const U=URL;const S=OUT+'/';const log=(...a)=>console.log(...a);
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="100000"]');await p.click('[data-act=onb-go]');
await p.click('[data-act=onb-tile][data-k=rent]');await p.fill('[data-onbtile=rent]','90000');await p.click('[data-act=onb-tile][data-k=home]');await p.fill('[data-onbtile=home]','30000');
await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
// give two everyday categories a limit, then spend fast
await p.goto(U+'#budget');await p.waitForSelector('.planwarn');log('Budget banner:',(await p.textContent('.planwarn')).replace(/\s+/g,' ').trim());
await p.click('[data-act=bedit]');const ids=await p.$$eval('[data-bedit]',e=>e.map(x=>[x.dataset.bedit,x.closest('.erow').querySelector('.n').firstChild.textContent.trim()]));
const id=n=>ids.find(x=>x[1]===n)[0];
await p.fill(`[data-bedit="${id('Eating out')}"]`,'4000');await p.fill(`[data-bedit="${id('Groceries')}"]`,'10000');await p.click('[data-act=bsave]');await p.waitForTimeout(200);
async function add(amt,cat){await p.click('#fab');for(const ch of amt)await p.click(`[data-act=key][data-k="${ch}"]`);if(!await p.$(`.chip[data-act=qcat]:has-text("${cat}")`))await p.click('[data-act=qall]');await p.click(`.chip[data-act=qcat]:has-text("${cat}") >> nth=0`);await p.click('[data-act=qsave]');await p.waitForTimeout(250);if(await p.$('.sheet'))await p.click('[data-act=close]').catch(()=>{})}
await add('3500','Eating out');await add('5000','Groceries');
await p.goto(U+'#home');await p.waitForSelector('.attn');if(await p.$('[data-act=attall]'))await p.click('[data-act=attall]');log('Needs-you list:\n  '+(await p.$$eval('.attn-item',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()))).join('\n  '));
await p.screenshot({path:S+'r-home.png',fullPage:true});
// reminders card (no scheduled reminders configured here)
await p.goto(U+'#prefs');await p.click('[data-act=prefsec][data-k=reminders]');await p.waitForTimeout(400);log('permission in page:',await p.evaluate(()=>Notification.permission),'| Reminders card:',(await p.evaluate(()=>[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('Reminders')).textContent)).replace(/\s+/g,' ').trim().slice(0,220));
// evening nudge link opens quick add
await p.goto(U+'#add');await p.waitForTimeout(900);log('#add opens quick add:',!!(await p.$('.keypad')),'| hash now:',await p.evaluate(()=>location.hash));
await p.click('[data-act=close]');
// setup page: generate keys, check the cron SQL
await p.goto(U+'#pushsetup');await p.waitForSelector('[data-act=psgen]');await p.waitForTimeout(500);
log('setup page loaded files:',(await p.$eval('#ps-sql',e=>e.value.length).catch(()=>0))>100,(await p.$eval('#ps-fn',e=>e.value.length).catch(()=>0))>1000);
await p.click('[data-act=psgen]');await p.waitForSelector('#ps-pub');
const keys={pub:await p.$eval('#ps-pub',e=>e.value),priv:await p.$eval('#ps-priv',e=>e.value),sec:await p.$eval('#ps-sec',e=>e.value)};
fs.writeFileSync(S+'keys.json',JSON.stringify(keys));
log('key lengths: public',keys.pub.length,'private',keys.priv.length,'secret',keys.sec.length,'| cron SQL has secret:',(await p.$eval('#ps-cron',e=>e.value)).includes(keys.sec));
await p.screenshot({path:S+'r-setup.png',fullPage:true});
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
