const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// The Bahi design behaviour: pace ribbon, count-up, one-time petals, reduced motion, gullak mark.
const {chromium,devices}=require('playwright');const fs=require('fs');const assert=require('assert');
const seed=fs.readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const errs=[];const log=(...a)=>console.log(...a);
const open=async(opts={})=>{const ctx=await b.newContext({...devices['iPhone 13'],...opts});
  await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
  await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
  await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
  const p=await ctx.newPage();p.setDefaultTimeout(6000);p.on('pageerror',e=>errs.push(e.message));await p.goto(URL+'#home');await p.waitForTimeout(500);return{ctx,p}};
let {ctx,p}=await open();
// pace ribbon reflects the same numbers as the plan
const pace=await p.evaluate(()=>{const P=planParts(month(curKey()));const el=document.querySelector('.pace');return{shown:!!el,label:el&&el.getAttribute('aria-label'),pct:Math.round(P.everyday/P.free*100),fill:el&&document.querySelector('.pace-fill').style.width}});
log('pace:',JSON.stringify(pace));assert(pace.shown&&pace.fill===pace.pct+'%'&&pace.label.includes(pace.pct+' percent'),'pace ribbon matches the plan');
// count-up: after a new entry the number animates and settles on the exact value
await p.click('#fab');for(const ch of '1000')await p.click(`[data-act=key][data-k="${ch}"]`);await p.click('.chip[data-act=qcat] >> nth=0');await p.click('[data-act=qsave]');
await p.waitForTimeout(80);const mid=await p.textContent('.hero3 .big');await p.waitForTimeout(900);const end=await p.textContent('.hero3 .big');const want=await p.evaluate(()=>fmt(month(curKey()).left));
log('count-up: mid',mid,'→ end',end,'(want',want+')');assert(end===want,'number settles on the exact value');
// petals: mark every bill paid; they fall once, with a toast
if(await p.$('.sheet'))await p.click('[data-act=close]').catch(()=>{});
await p.evaluate(()=>{const k=curKey();billsFor(k).forEach((x,i)=>store.set('tx','pb'+i,{cat:x.id,amt:x.budget||100,date:todayISO(),mode:'UPI',note:'',at:Date.now(),by:'local'}))});
await p.goto(URL+'#more');await p.goto(URL+'#home');await p.waitForTimeout(400);
const first=await p.evaluate(()=>document.querySelectorAll('.petals .petal').length);const toast=await p.textContent('.toast').catch(()=>'');
await p.goto(URL+'#more');await p.goto(URL+'#home');await p.waitForTimeout(300);const again=await p.evaluate(()=>document.querySelectorAll('.petals').length);
log('petals first visit:',first,'| toast:',toast,'| on the next visit:',again);assert(first>0&&/Every bill/.test(toast),'petals and toast when all bills are done');
await ctx.close();
// reduced motion: no petals, no count-up, toast still says it
({ctx,p}=await open({reducedMotion:'reduce'}));
await p.evaluate(()=>{const k=curKey();billsFor(k).forEach((x,i)=>store.set('tx','pb'+i,{cat:x.id,amt:x.budget||100,date:todayISO(),mode:'UPI',note:'',at:Date.now(),by:'local'}))});
await p.goto(URL+'#more');await p.goto(URL+'#home');await p.waitForTimeout(400);
const rm=await p.evaluate(()=>document.querySelectorAll('.petals').length);const rmToast=await p.textContent('.toast').catch(()=>'');
log('reduced motion: petals',rm,'| toast:',rmToast);assert(rm===0&&/Every bill/.test(rmToast),'reduced motion keeps the message, drops the movement');
// fonts and mark
const f=await p.evaluate(async()=>{await document.fonts.ready;return{hero:getComputedStyle(document.querySelector('.hero3 .big')).fontFamily.split(',')[0],loaded:document.fonts.check('600 40px Fraunces','₹1,23,456')}});
log('hero font:',f.hero,'| Fraunces loaded with ₹:',f.loaded);assert(f.loaded,'Fraunces loads and covers ₹');
await ctx.close();
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})().catch(e=>{console.log('FAILED:',e.message);process.exit(1)});
