const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// Multi-step sheets with the iPhone keyboard open (simulated by shrinking the visible area):
// buttons stay at the bottom of the sheet and the focused field is fully visible above them.
const {chromium,devices}=require('playwright');const fs=require('fs');
const seed=fs.readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);localStorage.setItem('paisa-news','2026-11-19');sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL+'#budget');await p.waitForTimeout(500);
// several bills so the list scrolls, like the user's budget
await p.evaluate(()=>{const add=(n,a,d)=>store.set('cats',uid(),{name:n,section:'bills',order:9,archived:false,dueDay:d,hist:[{from:'2000-01',amt:a}]});add('Electricity',200000,10);add('Internet',99900,12);add('Mobile',59900,15);add('Gas',110000,20)});
await p.click('[data-act=startmonth]');await p.click('[data-act=smnext]');await p.click('[data-act=smnext]');await p.waitForTimeout(200);
await p.screenshot({path:OUT+'/sheetkb0.png'});
const ins=await p.$$('[data-sm]');const last=ins[ins.length-1];await last.focus();
await p.evaluate(()=>{const r=document.documentElement;r.style.setProperty('--vvh','420px');r.style.setProperty('--vvt','0px');document.body.classList.add('kb')});
await p.waitForTimeout(700);await p.screenshot({path:OUT+'/sheetkb1.png',clip:{x:0,y:0,width:390,height:440}});
const g=await p.evaluate(()=>{const sh=document.querySelector('#sheetRoot .sheet').getBoundingClientRect(),nav=document.querySelector('.snav').getBoundingClientRect(),f=document.activeElement.getBoundingClientRect();
  return{sheetTop:Math.round(sh.top),sheetBottom:Math.round(sh.bottom),navTop:Math.round(nav.top),navBottom:Math.round(nav.bottom),fieldTop:Math.round(f.top),fieldBottom:Math.round(f.bottom)}});
console.log(JSON.stringify(g));
console.log('buttons at the sheet bottom:',g.sheetBottom-g.navBottom<=40,'| focused field fully visible above the buttons:',g.fieldBottom<=g.navTop&&g.fieldTop>=g.sheetTop,'| sheet inside the visible area:',g.sheetBottom<=420);
if(!(g.sheetBottom-g.navBottom<=40&&g.fieldBottom<=g.navTop&&g.fieldTop>=g.sheetTop&&g.sheetBottom<=420)){console.log('FAILED: layout with keyboard');process.exit(1)}
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
