const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// The user journeys: new user (3-question setup → first entry → install step), existing user (what's new → replan),
// returning after a gap (catch-up), weekly bank check pacing, card-link nudge, More tools, feedback and opt-in counts,
// and "Try it first" on a signed-in deployment.
const {chromium,devices}=require('playwright');const fs=require('fs');const assert=require('assert');
const seed=fs.readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const errs=[];const log=(...a)=>console.log(...a);
const sent={events:[],feedback:[]};
const open=async({seeded=true,cloud=false,pre=null}={})=>{const ctx=await b.newContext({...devices['iPhone 13']});
  await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:cloud?'window.PAISA_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseAnonKey:"anon"};':'window.PAISA_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseAnonKey:"anon"};window.__LOCAL=1;'}));
  await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
  await ctx.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};'}));
  await ctx.route('https://x.supabase.co/rest/v1/**',async r=>{const t=r.request().url().split('/rest/v1/')[1];try{sent[t].push(...JSON.parse(r.request().postData()||'[]'))}catch(e){}r.fulfill({status:201,body:''})});
  if(seeded)await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
  if(pre)await ctx.addInitScript(pre);
  const p=await ctx.newPage();p.setDefaultTimeout(6000);p.on('pageerror',e=>errs.push(e.message));return{ctx,p}};
// a deployment with Supabase configured starts at sign-in unless "Try it first" was chosen; tests run in try mode
const tryMode=()=>{try{localStorage.setItem('paisa-try','1');localStorage.removeItem('paisa-news')}catch(e){}};

// 1. new user: try it first from the sign-in screen
let {ctx,p}=await open({seeded:false,cloud:true});
await p.goto(URL);await p.waitForSelector('.signin');const tryBtn=await p.textContent('[data-act=trytry]');log('1 sign-in offers:',tryBtn.trim());
await p.click('[data-act=trytry]');await p.waitForSelector('.onb-q');log('  after Try it first:',(await p.textContent('.onb-q')).trim(),'| dots:',await p.$$eval('.onb-dots i',e=>e.length));
assert(/Try it first/.test(tryBtn),'sign-in offers try it first');
// 3 questions then the reveal
await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="150000"]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-tile][data-k=rent]');await p.click('[data-act=onb-go]');
const reveal=!!(await p.$('[data-act=onb-create]'));log('  reveal after 3 questions:',reveal);assert(reveal,'setup is 3 questions');
await p.click('[data-act=onb-create]');await p.waitForSelector('#sheetRoot .sheet',{timeout:4000});log('  first entry opens:',(await p.textContent('#sheetRoot h2')).trim());
for(const ch of '120')await p.click(`[data-act=key][data-k="${ch}"]`);await p.click('.chip[data-act=qcat] >> nth=0');await p.click('[data-act=qsave]');
await p.waitForSelector('#sheetRoot .sheet',{timeout:4000});const inst=(await p.textContent('#sheetRoot h2')).trim();log('  then:',inst);assert(/one tap away/.test(inst),'install step after first entry');
await p.check('#is-metrics');await p.click('[data-act=installdone]');await p.waitForTimeout(300);
await p.goto(URL+'#more');await p.waitForTimeout(2000);log('  opt-in counts sent:',sent.events.map(e=>e.name).join(', '),'| any amounts in them:',JSON.stringify(sent.events).includes('12000'));
assert(sent.events.some(e=>e.name==='metrics_on'),'opt-in sends a count');assert(!JSON.stringify(sent.events).match(/"amt"|12000|Groceries/),'no amounts or names in counts');
log('  whats-new shown to a brand-new user:',!!(await p.$('.wn')));await ctx.close();

// 2. existing user: what's new, then replan
({ctx,p}=await open({pre:tryMode}));sent.events.length=0;
await p.goto(URL+'#home');await p.waitForSelector('.wn',{timeout:5000});log('2 existing user sees:',(await p.textContent('#sheetRoot h2')).trim());
const evBefore=sent.events.length;
await p.click('[data-act=wnreplan]');await p.waitForSelector('.dq');log('  replan step 1:',(await p.textContent('.dq')).trim());
await p.click('[data-act=smnext]');log('  step 2:',(await p.textContent('.dq')).trim(),'| options:',await p.$$eval('.smopt b',e=>e.map(x=>x.textContent).join(' / ')));
await p.click('[data-act=smopen][data-k=type]');await p.fill('#sm-open','50000');await p.click('[data-act=smnext]');
log('  step 3:',(await p.textContent('.dq')).trim(),'| rows:',await p.$$eval('[data-sm]',e=>e.length));
const rentId=await p.evaluate(()=>Object.keys(D.cats).find(k=>D.cats[k].name==='Rent'));await p.fill(`[data-sm="${rentId}"]`,'40000');await p.click('[data-act=smnext]');
log('  step 4:',(await p.textContent('.dq')).trim());await p.click('[data-act=smnext]');
const plan=(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ');log('  result:',plan.slice(0,160));
await p.click('[data-act=smdone]');await p.waitForTimeout(300);
const after=await p.evaluate(()=>({open:month(curKey()).open,rent:budgetOf({...D.cats[Object.keys(D.cats).find(k=>D.cats[k].name==='Rent')],id:Object.keys(D.cats).find(k=>D.cats[k].name==='Rent')},curKey())}));
log('  saved: starting money',after.open/100,'| rent',after.rent/100);assert(after.open===5000000&&after.rent===4000000,'replan saves starting money and bills');
log('  counts sent while switched off:',sent.events.length-evBefore);assert(sent.events.length===evBefore,'nothing is sent unless switched on');
// Month page has Replan; More has More tools; Money keeps everyday tiles
await p.goto(URL+'#budget');await p.waitForTimeout(300);log('  Month has Replan:',!!(await p.$('[data-act=startmonth]')));
await p.goto(URL+'#more');await p.waitForTimeout(300);log('  More tools:',await p.$$eval('.tgroup',g=>{const x=g.find(e=>/More tools/.test(e.textContent));return x?[...x.querySelectorAll('.tt b')].map(b=>b.textContent).join(', '):'missing'}));
await p.goto(URL+'#plan');await p.waitForTimeout(300);log('  Money tiles:',await p.$$eval('.mt-l',e=>e.map(x=>x.textContent).join(', ')));
// feedback
await p.goto(URL+'#home');await p.waitForTimeout(300);await p.click('[data-act=feedback]');await p.fill('#fb-text','I could not find the salary day');await p.click('[data-act=fbsend]');await p.waitForTimeout(500);
log('  feedback received:',JSON.stringify(sent.feedback[0]||{}).slice(0,120));assert(sent.feedback.length===1&&sent.feedback[0].screen==='home','feedback reaches the team with the screen');
await ctx.close();

// 3. returning after a gap; weekly check pacing; card link nudge
({ctx,p}=await open({pre:()=>{try{localStorage.setItem('paisa-try','1');localStorage.setItem('paisa-news','2026-11-19')}catch(e){}}}));
await p.goto(URL+'#home');await p.waitForTimeout(400);
await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem('paisa-local'));const old=Date.now()-10*864e5;Object.values(o.tx).forEach(t=>t.at=old);const ids=Object.keys(o.accounts);o.accounts[ids[0]].checkedAt=addDays(todayISO(),-2);o.accounts[ids[1]].checkedAt=addDays(todayISO(),-20);localStorage.setItem('paisa-local',JSON.stringify(o))});
await p.reload();await p.waitForTimeout(500);
log('3 catch-up card:',(await p.textContent('.catchup').catch(()=>'none')).replace(/\s+/g,' ').slice(0,110));
const needs=await p.evaluate(()=>needsItems(curKey()).map(n=>n.type));log('  bank check while another account was checked 2 days ago:',needs.includes('acct.check')?'shown (wrong)':'held for the week');
assert(!needs.includes('acct.check'),'one bank check a week');log('  card link nudge:',needs.includes('card.link'));
await p.click('[data-act=catchskip]');await p.waitForTimeout(400);log('  Start from today opens:',(await p.textContent('#sheetRoot h2').catch(()=>'nothing')).trim(),'| card gone:',!(await p.$('.catchup')));
await ctx.close();

// 4. member welcome renders for a member (simulated)
({ctx,p}=await open({pre:()=>{try{localStorage.setItem('paisa-try','1');localStorage.setItem('paisa-news','2026-11-19')}catch(e){}}}));
await p.goto(URL+'#home');await p.waitForTimeout(400);
await p.evaluate(()=>{MODE='cloud';FID='fam1';IS_OWNER=false;ROLE='Member';memberWelcome()});await p.waitForTimeout(200);
log('4 member welcome:',(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ').slice(0,150));
assert(/Welcome to/.test(await p.textContent('#sheetRoot h2')),'member welcome shows');await ctx.close();

log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})().catch(e=>{console.log('FAILED:',e.message);process.exit(1)});
