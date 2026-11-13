const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;const S=OUT+'/';
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="150000"]');await p.click('[data-act=onb-go]');for(const k of['rent','sip'])await p.click(`[data-act=onb-tile][data-k=${k}]`);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.fill('#onb-open','40000');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
const h=async()=>p.evaluate(()=>document.documentElement.scrollHeight);
await p.goto(U+'#prefs');await p.waitForTimeout(400);
const rows=await p.$$eval('#app .trow',e=>e.map(x=>(x.dataset.k||x.dataset.act)+': '+x.innerText.replace(/\s+/g,' ').trim()));console.log('Settings tiles:\n  '+rows.join('\n  '));console.log('settings height',await h());
await p.screenshot({path:S+'s-settings.png',fullPage:true});
for(const k of ['account','budget','reminders','lock','install','data','about','danger']){const el=await p.$(`[data-act=prefsec][data-k=${k}]`);if(!el){console.log('  (no tile)',k);continue}await el.click();await p.waitForTimeout(200);const t=await p.textContent('#app h1');const n=await p.$$eval('#app section.card,#app .card',e=>e.length);console.log(' ',k,'->',t,'| cards',n,'| height',await h());if(k==='data')await p.screenshot({path:S+'s-data.png'});if(k==='reminders')await p.screenshot({path:S+'s-rem.png'});await p.click('[data-act=prefback]');await p.waitForTimeout(150)}
await p.goto(U+'#more');await p.waitForTimeout(400);console.log('more height',await h());await p.screenshot({path:S+'s-more.png',fullPage:true});
await p.click('#m-q');await p.waitForTimeout(200);console.log('suggest visible:',await p.isVisible('.msuggest'));await p.screenshot({path:S+'s-more-focus.png'});
await p.fill('#m-q','lock');await p.waitForTimeout(200);console.log('search lock ->',(await p.textContent('#app')).includes('App lock'));
const hit=await p.$('[data-act=prefsec][data-k=lock]');if(hit){await hit.click();await p.waitForTimeout(300);console.log('opened from search:',location=await p.evaluate(()=>location.hash),await p.textContent('#app h1'))}
await p.goto(U+'#family');await p.waitForTimeout(400);console.log('family height',await h());await p.screenshot({path:S+'s-family.png',fullPage:true});
await p.goto(U+'#bills');await p.waitForTimeout(300);const rl=await p.$('[data-act=prefsec][data-k=reminders]');if(rl){await rl.click();await p.waitForTimeout(300);console.log('bills link ->',await p.evaluate(()=>location.hash),await p.textContent('#app h1'))}
await p.goto(U+'#home');await p.goto(U+'#prefs');await p.waitForTimeout(200);console.log('fresh visit lands on tiles:',!!(await p.$('#app .tcard')));
await p.emulateMedia({colorScheme:'dark'});await p.screenshot({path:S+'s-settings-dark.png'});
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
