const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// Render the Reminders card in each state by stubbing what the browser reports
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{Object.defineProperty(window,'Notification',{value:{permission:'granted',requestPermission:async()=>'granted'},configurable:true})});
await p.goto(URL);await p.click('[data-act=onb-go]');await p.click('[data-act=onb-inc][data-k="100000"]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-go]');await p.click('[data-act=onb-create]');await p.waitForSelector('.hero2');
const card=async()=>p.evaluate(()=>{const c=[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('Reminders'));return c.textContent.replace(/\s+/g,' ').trim()});
await p.goto(URL+'#prefs');await p.click('[data-act=prefsec][data-k=reminders]');await p.waitForTimeout(300);console.log('on-open reminders, never tested ->',(await card()).includes('Send a test')?'shows Send a test':'no test button');
await p.click('[data-act=testnotif]');await p.waitForTimeout(500);console.log('after one test ->',(await card()).includes('Send a test')?'still shows Send a test':'test button gone');
// scheduled-reminder states, rendered directly
const states=await p.evaluate(()=>{const out={};const S=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,v);
  const run=()=>{const d=document.createElement('div');d.innerHTML=remindersCardHTML();return d.textContent.replace(/\s+/g,' ').trim()};
  window.__f=remindersCardHTML.toString();
  return null});
console.log(errs.length?'ERRORS: '+errs.join(' | '):'no page errors');await b.close()})();
