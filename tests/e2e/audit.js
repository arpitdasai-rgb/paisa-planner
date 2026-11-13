const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// Stability audit on an emulated iPhone: sideways overflow, zoom-on-focus inputs, small tap targets, layout shift.
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
const p=await ctx.newPage();
await p.addInitScript(()=>{window.__cls=0;window.__shifts=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__cls+=e.value;window.__shifts.push({v:+e.value.toFixed(3),src:(e.sources||[]).map(s=>s.node&&(s.node.className||s.node.nodeName)).slice(0,3)})}}}).observe({type:'layout-shift',buffered:true})}catch(e){}});
const U=URL;
await p.goto(U);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="100000"]');await p.click('[data-act=onb-go]');for(const k of['rent','home','help'])await p.click(`[data-act=onb-tile][data-k=${k}]`);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
// a little data so screens are realistic
const key=async s=>{for(const ch of s)await p.click(`[data-act=key][data-k="${ch}"]`)};
for(const [a,c] of [['350','Eating out'],['2400','Groceries'],['1200','Transport']]){await p.click('#fab');await key(a);if(!await p.$(`.chip[data-act=qcat]:has-text("${c}")`))await p.click('[data-act=qall]');await p.click(`.chip[data-act=qcat]:has-text("${c}") >> nth=0`);await p.click('[data-act=qsave]');await p.waitForTimeout(150);if(await p.$('.sheet'))await p.click('[data-act=close]').catch(()=>{})}
const screens=['home','transactions','budget','bills','plan','more','family','prefs','reports'];
const report={};
for(const s of screens){
  await p.goto(U+'#'+s);await p.reload();await p.waitForTimeout(900);
  report[s]=await p.evaluate(()=>{
    const vw=document.documentElement.clientWidth;const over=[];
    document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width&&(r.right>vw+1||r.left<-1)){const cs=getComputedStyle(el);let p=el.parentElement,clipped=false;while(p&&p!==document.body){const ps=getComputedStyle(p);if(/(auto|scroll|hidden)/.test(ps.overflowX)){clipped=true;break}p=p.parentElement}if(!clipped&&cs.position!=='fixed')over.push((el.className||el.nodeName).toString().slice(0,40)+' →'+Math.round(r.right))}});
    const smallInputs=[...document.querySelectorAll('input:not([type=checkbox]):not([type=file]),select,textarea')].filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>(e.id||e.className)+':'+getComputedStyle(e).fontSize);
    const smallTaps=[...document.querySelectorAll('button,a,[data-act],label.check,select')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width&&(r.height<40||r.width<40)}).map(e=>((e.dataset&&e.dataset.act)||e.textContent.trim().slice(0,14))+' '+Math.round(e.getBoundingClientRect().width)+'×'+Math.round(e.getBoundingClientRect().height));
    return{pageWiderThanScreen:document.documentElement.scrollWidth>vw,scrollWidth:document.documentElement.scrollWidth,vw,overflowing:[...new Set(over)].slice(0,6),smallInputs:[...new Set(smallInputs)].slice(0,8),smallTaps:[...new Set(smallTaps)].slice(0,10),cls:+window.__cls.toFixed(3),shifts:window.__shifts.slice(0,4)};
  });
}
// the entry sheet (most used screen)
await p.goto(U+'#home');await p.waitForTimeout(400);await p.click('#fab');await p.click('[data-act=qmore]');await p.waitForTimeout(300);
report['add-entry']=await p.evaluate(()=>({smallInputs:[...document.querySelectorAll('.sheet input:not([type=checkbox]),.sheet select')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id+':'+getComputedStyle(e).fontSize),sheetHeight:Math.round(document.querySelector('.sheet').getBoundingClientRect().height),viewport:innerHeight}));
console.log(JSON.stringify(report,null,1));await b.close()})();
