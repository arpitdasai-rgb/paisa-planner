const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// Taps every visible button on each screen (and every button inside the sheet it opens), from a fresh seeded state each time.
const {chromium,devices}=require('playwright');
const seed=require('fs').readFileSync(OUT+'/seed.json','utf8');
const ROUTES=(process.argv[2]||'home,transactions,budget,bills,plan,more,family,prefs,reports').split(',');
const DARK=process.argv[3]==='dark';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13'],colorScheme:DARK?'dark':'light'});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const U=URL;const found=new Map();
const p=await ctx.newPage();let cur='';p.on('dialog',d=>d.accept().catch(()=>{}));
p.on('pageerror',e=>{const k=e.message;if(!found.has(k))found.set(k,cur)});
p.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load|net::/.test(m.text())){const k='console: '+m.text();if(!found.has(k))found.set(k,cur)}});
p.on('popup',pp=>pp.close().catch(()=>{}));
const fresh=async r=>{await p.evaluate(()=>sessionStorage.removeItem('seeded')).catch(()=>{});await p.goto(U+'#'+r);await p.reload();await p.waitForTimeout(350)};
const sig=n=>[n.dataset.act,n.dataset.k||'',n.dataset.id||''].join('|');
const list=async sel=>p.$$eval(sel,els=>els.filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed').map(e=>({s:[e.dataset.act,e.dataset.k||'',e.dataset.id||''].join('|'),act:e.dataset.act,t:(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,30)})));
const find=async(sel,s)=>{for(const e of await p.$$(sel)){if(!await e.isVisible())continue;if(await e.evaluate(n=>[n.dataset.act,n.dataset.k||'',n.dataset.id||''].join('|'))===s)return e}};
const SKIP=['close','scrim','exp-print'];
let clicks=0;
for(const r of ROUTES){await fresh(r);
  const L=[...new Map((await list('[data-act]')).map(x=>[x.s,x])).values()];
  for(const x of L){cur=`${r} > ${x.s} "${x.t}"`;
    await fresh(r);const el=await find('[data-act]',x.s);if(!el)continue;
    await el.click({timeout:2000}).catch(()=>{});clicks++;await p.waitForTimeout(250);
    if(await p.$('#sheetRoot .sheet')){
      const S=[...new Map((await list('#sheetRoot [data-act]')).map(y=>[y.s,y])).values()].filter(y=>!SKIP.includes(y.act)).slice(0,16);
      for(const y of S){cur=`${r} > ${x.s} > sheet ${y.s} "${y.t}"`;
        await fresh(r);const e1=await find('[data-act]',x.s);if(!e1)continue;await e1.click({timeout:2000}).catch(()=>{});await p.waitForTimeout(200);
        const e2=await find('#sheetRoot [data-act]',y.s);if(e2){await e2.click({timeout:2000}).catch(()=>{});clicks++;await p.waitForTimeout(250)}}}
  }}
console.log('clicks',clicks);for(const [m,w] of found)console.log('BUG',m,'\n    at',w);if(!found.size)console.log('no errors');await b.close()})();
