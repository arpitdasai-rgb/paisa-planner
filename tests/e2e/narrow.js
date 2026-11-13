const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// finds elements that stick out of the screen at narrow widths
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();
for(const w of [320,375]){
const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:w,height:640}});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(3000);const U=URL;
const check=async name=>{const r=await p.evaluate(W=>{const out=[];document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return;const r=e.getBoundingClientRect();if(!r.width)return;
  let a=e.parentElement,clip=false;while(a&&a!==document.body){const st=getComputedStyle(a);if(/(auto|scroll|hidden)/.test(st.overflowX)){const ar=a.getBoundingClientRect();if(ar.right<=W+1){clip=true;break}}a=a.parentElement}
  if(!clip&&(r.right>W+1||r.left<-1))out.push((e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:e.tagName)+' '+Math.round(r.left)+'→'+Math.round(r.right)+' "'+(e.innerText||'').trim().slice(0,24).replace(/\s+/g,' ')+'"')});
  // words squeezed one per line: tall narrow text blocks
  const sq=[];document.querySelectorAll('.t,.n,.s,h1,.nt').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.width<70&&(e.innerText||'').length>8)sq.push((e.className||e.tagName)+' w'+Math.round(r.width)+' "'+e.innerText.slice(0,20)+'"')});
  const trunc=[...document.querySelectorAll('h1')].filter(h=>h.scrollWidth>h.clientWidth+1).map(h=>'h1 truncated "'+h.innerText+'"');
  return {over:[...new Set(out)].slice(0,8),sq:sq.slice(0,6),trunc}},w);
 if(r.over.length||r.sq.length||r.trunc.length)console.log(w,name,JSON.stringify(r,null,1))};
for(const r of ['home','transactions','budget','bills','plan','more','family','prefs','reports']){await p.goto(U+'#'+r);await p.waitForTimeout(400);await check(r)}
await p.goto(U+'#plan');await p.waitForTimeout(300);for(const k of ['cards','loans','goals','networth','recurring','accounts']){await p.click(`[data-act=goplan][data-k=${k}]`).catch(()=>{});await p.waitForTimeout(250);await check('plan/'+k);await p.goto(U+'#plan');await p.waitForTimeout(200)}
await p.goto(U+'#home');await p.waitForTimeout(300);await p.click('#fab');await p.waitForTimeout(300);await check('add sheet');
await p.click('[data-act=qtype][data-k=xfer]');await p.waitForTimeout(200);await check('xfer sheet');await p.click('[data-act=close]');
await p.click('[data-act=breakdown]').catch(()=>{});await p.waitForTimeout(300);await check('breakdown');
await ctx.close()}
console.log('done');await b.close()})();
