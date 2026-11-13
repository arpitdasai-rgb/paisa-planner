const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();
for(const scheme of ['light','dark']){
const ctx=await b.newContext({...devices['iPhone 13'],colorScheme:scheme});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;const S=OUT+'/';const log=(...a)=>console.log(...a);
if(scheme==='dark'){await p.goto(U+'#help');await p.waitForTimeout(400);await p.fill('#help-q','iphone reminders');await p.waitForTimeout(200);await p.screenshot({path:S+'h-dark.png'});console.log('dark',errs.length?errs:'ok');await ctx.close();continue}
await p.goto(U+'#more');await p.waitForTimeout(400);log('1 More has Help row:',!!(await p.$('[data-act=go][data-k=help]')));
await p.click('[data-act=go][data-k=help]');await p.waitForTimeout(300);
log('  page:',await p.textContent('#app h1'),'| questions:',await p.$$eval('.faq',e=>e.length),'| topics:',await p.$$eval('[data-act=helptopic]',e=>e.length),'| tab:',await p.$eval('.tabs [aria-current=page]',e=>e.textContent.trim()).catch(()=>'?'));
await p.screenshot({path:S+'h-all.png'});
for(const q of ['reminder iphone','import wrong file','delete category','credit card twice','start day 25','undo','hide salary','offline','xyzzy']){await p.fill('#help-q',q);await p.waitForTimeout(150);
  const r=await p.$$eval('.faq summary',e=>e.slice(0,2).map(x=>x.textContent.trim()));log(`2 "${q}" →`,r.length?r.join(' | '):(await p.textContent('#helpres')).replace(/\s+/g,' ').slice(0,60))}
await p.fill('#help-q','reminders iphone');await p.waitForTimeout(150);log('  focus kept while typing:',await p.evaluate(()=>document.activeElement.id));await p.screenshot({path:S+'h-search.png'});
await p.fill('#help-q','');await p.click('[data-act=helptopic][data-k=wallet]');await p.waitForTimeout(200);log('3 Wallet topic:',await p.$$eval('.faq',e=>e.length),'questions');
await p.click('.faq summary >> nth=1');await p.waitForTimeout(200);await p.screenshot({path:S+'h-open.png'});
const btn=await p.$('.faq[open] [data-act]');log('  answer button:',await btn.textContent());await btn.click();await p.waitForTimeout(300);log('  → went to',await p.evaluate(()=>location.hash),await p.textContent('#app h1').catch(()=>''));
// every answer button goes somewhere without errors
const acts=await p.evaluate(()=>FAQ.filter(f=>f[4]).map(f=>f[4]));let ok=0;
for(const [l,a,k] of acts){if(a==='link'){ok++;continue}await p.goto(U+'#help');await p.waitForTimeout(150);await p.evaluate(([a,k])=>{const b=document.createElement('button');b.dataset.act=a;b.dataset.k=k;document.getElementById('app').appendChild(b);b.click()},[a,k]);await p.waitForTimeout(200);await p.evaluate(()=>{const s=document.getElementById('sheetRoot');s.innerHTML='';document.getElementById('app').inert=false;document.getElementById('tabs').inert=false});ok++}
log('4 answer buttons tried:',ok,'of',acts.length);
await p.goto(U+'#more');await p.waitForTimeout(300);await p.fill('#m-q','backup');await p.waitForTimeout(200);log('5 More search help hits:',await p.$$eval('[data-act=helpopen]',e=>e.map(x=>x.textContent.trim()).join(' | ')));
await p.click('[data-act=helpopen] >> nth=0');await p.waitForTimeout(300);log('  opens help with query:',await p.inputValue('#help-q'),'|',await p.$$eval('.faq',e=>e.length),'answers');
await p.goto(U+'#prefs');await p.waitForTimeout(200);log('6 Settings has Help:',!!(await p.$('#app [data-act=go][data-k=help]')));
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await ctx.close()}
await b.close()})();
