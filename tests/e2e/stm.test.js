const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
const {chromium,devices}=require('playwright');const fs=require('fs');
const seed=fs.readFileSync(OUT+'/seed.json','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
await ctx.route('**/xlsx.full.min.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(XLSX_JS,'utf8')}));
await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
const p=await ctx.newPage();p.setDefaultTimeout(6000);const errs=[];p.on('pageerror',e=>errs.push(e.message));const U=URL;const log=(...a)=>console.log(...a);
await p.goto(U+'#home');await p.waitForTimeout(500);
// the seeded entries are on the seed day; build a statement around it
const day=await p.evaluate(()=>Object.values(D.tx).find(t=>t.note==='Swiggy').date);const [y,m,d]=day.split('-');const fmtD=n=>{const dt=new Date(+y,+m-1,+d+n);return pad2(dt.getDate())+'/'+pad2(dt.getMonth()+1)+'/'+String(dt.getFullYear()).slice(2)};function pad2(n){return String(n).padStart(2,'0')}
const bal0=await p.evaluate(()=>acctBalance(acctList().find(a=>a.bank==='HDFC Bank').id)/100);
const csv=['HDFC BANK Ltd. Statement of account','','Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance',
 `${fmtD(0)},UPI-SWIGGY-swiggy@ybl-YESB0000001-4123-PAYMENT,4123,${fmtD(0)},350.00,,`,
 `${fmtD(1)},UPI-BIGBASKET-bigbasket@hdfcbank-HDFC0000001-4124-ORDER,4124,${fmtD(1)},"2,400.00",,`,
 `${fmtD(0)},UPI/DR/4125/UBER INDIA/UTIB/uber@axisbank/Ride,4125,${fmtD(0)},1200.00,,`,
 `${fmtD(-1)},POS 4321XXXXXX1234 AMAZON PAY INDIA,4126,${fmtD(-1)},890.00,,`,
 `${fmtD(0)},UPI-ZOMATO-zomato@okicici-ICIC0000001-4127-FOOD,4127,${fmtD(0)},499.00,,`,
 `${fmtD(0)},UPI-BLINKIT-blinkit@ybl-YESB0000001-4128-GROC,4128,${fmtD(0)},640.00,,`,
 `${fmtD(0)},NEFT CR-ACME CORP-REFUND,4129,${fmtD(0)},,1500.00,${(bal0-499-640+1500).toFixed(2)}`].join('\n');
fs.writeFileSync(OUT+'/hdfc.csv',csv);

await p.goto(U+'#prefs');await p.waitForTimeout(200);await p.click('[data-act=stmmatch]');await p.waitForTimeout(200);
await p.setInputFiles('#stm-file',OUT+'/hdfc.csv');await p.waitForSelector('.dsum',{timeout:10000});await p.waitForTimeout(200);
log('review:',(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ').slice(0,300));
log('missing rows:',await p.$$eval('.stmrow',e=>e.map(x=>x.querySelector('.t').textContent+' → '+x.querySelector('select').selectedOptions[0].textContent+' '+x.querySelector('b').textContent)).then(a=>a.join(' | ')));
await p.screenshot({path:OUT+'/stm1.png'});
const n0=await p.evaluate(()=>Object.keys(D.tx).length);
await p.click('[data-act=stmsave]');await p.waitForTimeout(400);
log('added:',await p.evaluate(()=>Object.keys(D.tx).length)-n0,'| toast:',await p.textContent('.toast'));
log('HDFC balance now',await p.evaluate(()=>fmt(acctBalance(acctList().find(a=>a.bank==='HDFC Bank').id))),'| expected',(bal0-499-640+1500).toFixed(0));
// running the same statement again finds nothing new
await p.evaluate(()=>{document.getElementById('toastRoot').innerHTML=''});await p.evaluate(()=>openStmMatch());await p.setInputFiles('#stm-file',OUT+'/hdfc.csv');await p.waitForSelector('.dsum',{timeout:10000});
log('second run:',(await p.textContent('#sheetRoot .sheet')).replace(/\s+/g,' ').slice(0,160));
log('merchants:',JSON.stringify(await p.evaluate(()=>['UPI/DR/412345/SWIGGY/YESB/swiggy@ybl/Payment','POS 4321XXXX1234 AMAZON PAY INDIA','NEFT CR-ACME CORP-REFUND','ACH D- TP ACH ICICIPRU-1234','IMPS-4123-RAHUL SHARMA-HDFC-XXXX1234'].map(stmMerchant))));
log('dates:',JSON.stringify(await p.evaluate(()=>['12/11/26','12-11-2026','2026-11-12','12 Nov 2026','12-Nov-26',46338].map(stmDate))));
log(errs.length?'ERRORS:\n'+errs.join('\n'):'no page errors');await b.close()})();
