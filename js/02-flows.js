/* Paisa Planner · first run, category guessing, in-the-moment questions, month-end wrap, icons.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= onboarding: 60-second first run ================= */
// Fixed monthly outgoings offered as tiles. pct = suggested share of income; due = typical due day.
const TILES=[
  {k:'rent',name:'Rent',sec:'bills',pct:.25,due:5},
  {k:'home',name:'Home loan EMI',sec:'debt',pct:.25,due:5},
  {k:'car',name:'Car loan EMI',sec:'debt',pct:.10,due:10},
  {k:'pl',name:'Personal loan EMI',sec:'debt',pct:.08,due:10},
  {k:'cc',name:'Credit card bill',sec:'debt',pct:.15,due:18},
  {k:'sip',name:'SIP / mutual funds',sec:'savings',pct:.10},
  {k:'rd',name:'Recurring deposit',sec:'savings',pct:.05},
  {k:'help',name:'House help',sec:'bills',pct:.03,due:1},
  {k:'school',name:'School fees',sec:'bills',pct:.06,due:10},
  {k:'elec',name:'Electricity',sec:'bills',pct:.02,due:10},
  {k:'net',name:'Mobile & internet',sec:'bills',pct:.012,due:15},
  {k:'ins',name:'Insurance',sec:'bills',pct:.03,due:20},
  {k:'parents',name:'Parents',sec:'expenses',pct:.08}
];
const EVERYDAY=['Groceries','Eating out','Transport & fuel','Shopping','Health','Miscellaneous'];
const INCOME_CHIPS=[50000,75000,100000,150000,200000];
const round500=r=>Math.max(500,Math.round(r/500)*500);
let ONB=null;
function onbIncome(){const v=parseAmt(ONB.income);return isNaN(v)?0:v}
function onbFixed(){return Object.values(ONB.sel).reduce((t,s)=>{const v=parseAmt(s.amt);return t+(isNaN(v)?0:v)},0)}
function onbLeftHTML(){
  const left=onbIncome()-onbFixed();const days=daysBetween(todayISO(),mEndWith(keyOfWith(todayISO(),ONB.startDay),ONB.startDay))+1;
  return `<div class="label">Left for everything else</div><div class="onb-num num ${left<0?'neg':''}">${fmt(left)}</div><div class="small muted">${left>0?`about ${fmt(Math.floor(left/30/100)*100)} a day`:'Your fixed costs are more than your income'}</div>`;
}
function mEndWith(k,s0){const n=addM(k,1);const[y,m]=n.split('-').map(Number);return addDays(ym(y,m)+'-'+pad(Math.min(s0,dim(y,m))),-1)}
function onbDots(n){return `<div class="onb-dots" aria-label="Step ${n} of 4">${[1,2,3,4].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>`}
function onboardingHTML(){
  if(!ONB)ONB={step:1,startDay:1,income:'',sel:{},household:'me',opening:''};
  const o=ONB;const back=o.step>1?`<button class="link" data-act="onb-back">Back</button>`:'<span></span>';
  const shell=(n,body,cta,ok=true)=>`<div class="onb">
    <div class="onb-top">${back}${onbDots(n)}<span></span></div>
    ${body}
    <div class="onb-cta"><button class="btn primary block" data-act="${cta.a}" ${ok?'':'disabled'}>${cta.l}</button>${cta.sub||''}</div></div>`;
  if(o.step===1)return shell(1,`
    <h1 class="onb-q">When does your salary land?</h1>
    <p class="onb-help">Your month will run from salary to salary.</p>
    <div class="onb-chips">${[[1,'1st'],[5,'5th'],[7,'7th'],[25,'25th']].map(([d,l])=>`<button class="ochip" data-act="onb-sd" data-k="${d}" aria-pressed="${o.startDay===d}">${l}</button>`).join('')}
      <label class="ochip ochip-sel ${[1,5,7,25].includes(o.startDay)?'':'on'}">Other <select id="onb-sd" aria-label="Other salary day">${Array.from({length:28},(_,i)=>`<option value="${i+1}" ${o.startDay===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label></div>
    <p class="small muted" style="margin-top:18px">Not salaried? Pick 1st.</p>`,{a:'onb-go',l:'Next'});
  if(o.step===2)return shell(2,`
    <h1 class="onb-q">Roughly how much comes in each month?</h1>
    <p class="onb-help">Take-home, after tax. A round number is fine.</p>
    <div class="onb-amt"><span>₹</span><input id="onb-inc" class="num" inputmode="numeric" data-onb="income" value="${esc(o.income)}" placeholder="0" aria-label="Monthly income" autocomplete="off"></div>
    <div class="onb-chips">${INCOME_CHIPS.map(v=>`<button class="ochip" data-act="onb-inc" data-k="${v}" aria-pressed="${onbIncome()===v*100}">${fmtShort(v*100)}</button>`).join('')}</div>`,{a:'onb-go',l:'Next'},onbIncome()>0);
  if(o.step===3){
    const inc=onbIncome();
    return shell(3,`
    <div class="onb-live" id="onb-left">${onbLeftHTML()}</div>
    <h1 class="onb-q" style="margin-top:6px">What goes out every month, no matter what?</h1>
    <p class="onb-help">Tap what applies. Change any amount.</p>
    <div class="tiles">${TILES.map(t=>{const s=o.sel[t.k];const c={name:t.name,section:t.sec};
      return `<div class="tile ${s?'on':''}"><button class="tile-tap" data-act="onb-tile" data-k="${t.k}" aria-pressed="${!!s}">${icon(c)}<span>${t.name}</span></button>${s?`<label class="tile-amt">₹<input class="num" inputmode="numeric" data-onbtile="${t.k}" value="${esc(s.amt)}" aria-label="${t.name} amount"></label>`:''}</div>`}).join('')}</div>`,
    {a:'onb-go',l:Object.keys(o.sel).length?'Next':'Nothing fixed, skip'});
  }
  if(o.step===4)return shell(4,`
    <h1 class="onb-q">Who else spends from this money?</h1>
    <p class="onb-help">You can invite them later. No forms now.</p>
    <div class="onb-stack">${[['me','Just me'],['partner','Me and my partner'],['family','The whole family']].map(([k,l])=>`<button class="ochip wide" data-act="onb-hh" data-k="${k}" aria-pressed="${o.household===k}">${l}</button>`).join('')}</div>`,{a:'onb-go',l:'Show me my number'});
  const left=onbIncome()-onbFixed();
  return `<div class="onb onb-reveal">
    <div class="onb-top"><button class="link" data-act="onb-back">Back</button><span></span><span></span></div>
    <p class="label" style="margin:0">Your month</p>
    <div class="reveal-num num ${left<0?'neg':''}">${fmt(left)}</div>
    <h1 class="onb-q" style="margin-top:4px">${left>0?`is yours to spend each month.`:`more goes out than comes in.`}</h1>
    <p class="onb-help">${left>0?`That's about <b class="num">${fmt(Math.floor(left/30/100)*100)} a day</b> after rent, EMIs and savings. Log your first spend to see it move.`:`You can adjust any amount on the Budget tab.`}</p>
    <div class="field" style="margin-top:22px"><label for="onb-open">What's in your main account today? <span class="muted">(optional)</span></label>
      <div class="onb-amt sm"><span>₹</span><input id="onb-open" class="num" inputmode="numeric" data-onb="opening" value="${esc(ONB.opening)}" placeholder="0" autocomplete="off"></div>
      <p class="small muted" style="margin:6px 0 0">Leave it empty to start at zero. You can change it later.</p></div>
    <div class="onb-cta"><button class="btn primary block" data-act="onb-create">Start my budget</button></div></div>`;
}
async function finishOnboarding(){
  const o=ONB;const sd0=o.startDay||1;const startMonth=keyOfWith(todayISO(),sd0);
  const inc=onbIncome(),fixed=onbFixed();
  const writes=[];let order=0;const cat=(name,sec,amt,due)=>{const id=uid()+(order);writes.push(store.set('cats',id,{name,section:sec,order:order++,archived:false,dueDay:due||null,hist:[{from:'2000-01',amt}]}))};
  cat('Salary','income',inc,null);
  TILES.forEach(t=>{const s=o.sel[t.k];if(!s)return;const v=parseAmt(s.amt);cat(t.name==='Parents'?'Family support':t.name,t.sec,isNaN(v)?0:v,t.due)});
  // everyday spending starts without budgets: nothing is "over" until the user chooses a limit
  EVERYDAY.forEach(n=>cat(n,'expenses',0,null));
  await Promise.all(writes).catch(()=>{});
  const salId=Object.keys(D.cats).find(id=>D.cats[id].name==='Salary'&&D.cats[id].section==='income');
  if(salId&&inc>0)await store.set('recurring',uid(),{cat:salId,amt:inc,day:sd0,mode:'Net banking',acct:'',note:'',active:true}).catch(()=>{});
  const opening=parseAmt(o.opening);
  await store.set('settings','main',{name:(typeof FAMNAME!=='undefined'&&FAMNAME)||'Our family budget',startDay:sd0,startMonth,opening:isNaN(opening)?0:opening,household:o.household,createdAt:Date.now(),owner:ME||'local'}).catch(()=>{});
  log('created','budget',`${fmt(inc)} income, ${fmt(fixed)} fixed`);
  ONB=null;
  toast('Your budget is ready. Tap + to log your first spend.');
}
function keyOfWith(ds,s0){const[y,m,d]=ds.split('-').map(Number);return d<Math.min(s0,dim(y,m))?addM(ym(y,m),-1):ym(y,m)}

/* ================= smart quick add ================= */
// Category guess: remembered merchant first, then what the user usually logs at this amount and time of day.
function merchantMemory(){
  if(memo.merch)return memo.merch;const mm={};
  Object.values(D.tx).sort((a,b)=>(a.at||0)-(b.at||0)).forEach(t=>{const n=(t.note||'').trim();if(n&&D.cats[t.cat]&&!D.cats[t.cat].archived)mm[n.toLowerCase()]={cat:t.cat,note:n,mode:t.mode,card:t.card||''}});
  return memo.merch=mm;
}
function guessCat(amt,note){
  if(note){const m=merchantMemory()[note.trim().toLowerCase()];if(m)return m.cat}
  if(!(amt>0))return null;
  const hr=new Date().getHours();const since=Date.now()-120*864e5;const score={};
  Object.values(D.tx).forEach(t=>{const c=D.cats[t.cat];if(!c||c.archived||c.section==='income'||(t.at||0)<since||t.src==='import')return;
    const r=t.amt/amt;if(r<.6||r>1.6)return;const th=new Date(t.at).getHours();const dh=Math.min(Math.abs(th-hr),24-Math.abs(th-hr));
    score[t.cat]=(score[t.cat]||0)+(dh<=2?2:1)+(r>.85&&r<1.15?1:0)});
  let best=null,bs=2;for(const k in score)if(score[k]>bs){bs=score[k];best=k}
  return best;
}
// "₹X a day for N days" after the payments already planned (same figure as the Home screen)
function dailyLine(){
  const k=curKey(),m=month(k),days=daysBetween(todayISO(),mEnd(k))+1;
  if(m.projected<=0)return `Planned payments now exceed what's left by ${fmt(-m.projected)}.`;
  return `${fmt(Math.floor(m.projected/days/100)*100)} a day left for ${days} day${days===1?'':'s'}.`;
}

/* ================= questions asked in the moment ================= */
const asked=k=>lsGet('paisa-ask-'+k)==='1';
const markAsked=k=>lsSet('paisa-ask-'+k,'1');
const LOANLIKE=/loan|emi/i;
const RATE_GUESS=n=>/home|house/i.test(n)?8.5:/car|vehicle|bike/i.test(n)?9.5:/personal/i.test(n)?12:/education/i.test(n)?10:10;
function afterSaveAsk(tx){
  const c=D.cats[tx.cat];if(!c)return;const cid=tx.cat;
  // 1. a bill or EMI without a due day
  if(canAdmin()&&(c.section==='bills'||c.section==='debt')&&!c.dueDay&&!asked('due-'+cid)){
    markAsked('due-'+cid);const d=Number(tx.date.slice(8));
    return openSheet(`${sheetHead('Same day every month?')}<p class="small" style="margin-top:0">Does <b>${esc(c.name)}</b> go out on the same date each month? I'll remind you 3 days before.</p>
      <div class="btns"><button class="btn primary" data-act="setdue" data-id="${cid}" data-k="${d}">Yes, the ${d}${['th','st','nd','rd'][(d%10<4&&Math.floor(d/10)!==1)?d%10:0]}</button><button class="btn" data-act="duepick" data-id="${cid}">Another day</button><button class="btn" data-act="close">Not fixed</button></div>`);
  }
  // 2. a loan EMI with no loan details yet: offer the payoff reveal
  if(canAdmin()&&c.section==='debt'&&LOANLIKE.test(c.name)&&!isCardBill(c)&&!Object.values(D.loans).some(l=>l.cat===cid)&&!asked('loan-'+cid)){
    markAsked('loan-'+cid);return openLoanAsk(cid,tx.amt);
  }
  // 3. paid by card twice, but no card added
  if(canAdmin()&&tx.mode==='Card'&&!Object.keys(D.cards).length&&!asked('card')&&Object.values(D.tx).filter(t=>t.mode==='Card').length>=2){
    markAsked('card');
    return openSheet(`${sheetHead('Which card was that?')}<p class="small" style="margin-top:0">Add your credit card once and I'll warn you before a part-payment starts costing 36–42% interest.</p><div class="btns"><button class="btn primary" data-act="editcard">Add card</button><button class="btn" data-act="close">Not now</button></div>`);
  }
  // 4. a shared spend went over budget: suggest bringing in whoever else buys it
  const m=month(keyOf(tx.date));const mc=m.cats.find(x=>x.id===cid);
  if(MODE==='cloud'&&canAdmin()&&MEMBERS.length<2&&S()&&S().household&&S().household!=='me'&&mc&&mc.budget>0&&mc.left<0&&!asked('invite')){
    markAsked('invite');
    return openSheet(`${sheetHead('Does someone else buy this too?')}<p class="small" style="margin-top:0"><b>${esc(c.name)}</b> just went over budget. If ${S().household==='partner'?'your partner':'someone in the family'} also pays for it, invite them so their spends count.</p><div class="btns"><button class="btn primary" data-act="goinvite">Invite</button><button class="btn" data-act="close">Not now</button></div>`);
  }
}
function openLoanAsk(cid,emi){
  const c=D.cats[cid];
  openSheet(`${sheetHead('See when this loan ends?')}<p class="small" style="margin-top:0">Tell me what's left on <b>${esc(c.name)}</b> and I'll work out the payoff date and the interest still to pay.</p>
    <div class="two"><div class="field"><label for="la-out">Amount still owed (₹)</label><input class="input num" id="la-out" inputmode="numeric" placeholder="e.g. 3500000" autofocus></div>
    <div class="field"><label for="la-rate">Interest (% a year)</label><input class="input num" id="la-rate" inputmode="decimal" value="${RATE_GUESS(c.name)}"></div></div>
    <div class="field"><label for="la-emi">EMI (₹)</label><input class="input num" id="la-emi" inputmode="numeric" value="${emi?rupees(emi):rupees(budgetOf({...c,id:cid},curKey()))}"></div>
    <button class="btn primary block" data-act="loanreveal" data-id="${cid}">Show my payoff date</button>`);
}
function loanReveal(cid){
  const P=amtOrNull('la-out'),rate=parseFloat(val('la-rate'))||0,E=amtOrNull('la-emi')||0;
  if(!(P>0)){toast('Enter how much is still owed.');return}
  const c=D.cats[cid];const r=loanCalc(P,rate,E);
  store.set('loans',uid(),{name:c.name.replace(/\s*EMI$/i,''),lender:'',original:P,rate,emi:E,outstanding:P,cat:cid,asOf:todayISO()}).then(()=>log('added','loan',c.name)).catch(()=>{});
  if(r.err){openSheet(`${sheetHead('Loan saved')}<p class="small" style="margin-top:0">${esc(r.err)}. Check the EMI and interest on the Plan tab.</p><button class="btn block" data-act="close">OK</button>`);return}
  const y=Math.floor(r.n/12),mo=r.n%12;
  openSheet(`${sheetHead(esc(c.name.replace(/\s*EMI$/i,'')))}<p class="label" style="margin:0">Debt-free in</p>
    <div class="reveal-num num" style="font-size:40px">${y?y+' yr ':''}${mo?mo+' mo':''}</div>
    <p class="small" style="margin:4px 0 14px">That's <b>${mLong(addM(curKey(),r.n))} ${addM(curKey(),r.n).slice(0,4)}</b>, with <b class="num">${fmt(r.interest)}</b> of interest still to pay.</p>
    <p class="small muted" style="margin:0 0 14px">Each EMI you mark paid moves this closer. Try a prepayment on the Plan tab to see how much sooner you could finish.</p>
    <div class="btns"><button class="btn primary" data-act="close">Got it</button><button class="btn" data-act="goloans">Open loans</button></div>`);
}
function openDueDates(){
  const cs=catsAll().filter(c=>!c.archived&&(c.section==='bills'||c.section==='debt')&&!c.dueDay);
  openSheet(`${sheetHead('Add due dates')}<p class="small" style="margin-top:0">Enter the day of the month each one goes out. Leave a box empty if it changes.</p>
    ${cs.map(c=>`<label class="erow">${icon(c)}<span class="n">${esc(c.name)}</span><span class="rs">Day<input class="input num" style="width:70px" inputmode="numeric" data-due="${c.id}" placeholder="–"></span></label>`).join('')}
    <button class="btn primary block" style="margin-top:12px" data-act="savedues">Save due dates</button>`);
}
async function saveDues(){
  let n=0;const ws=[];
  document.querySelectorAll('[data-due]').forEach(inp=>{const d=parseInt(inp.value,10);if(d>=1&&d<=31){const id=inp.dataset.due;ws.push(store.set('cats',id,{...D.cats[id],dueDay:d}));n++}});
  closeSheet();await Promise.allSettled(ws);
  if(n){log('set','due dates',n+' bills');toast(`Saved ${n} due date${n===1?'':'s'}. Reminders will follow them.`)}
}

/* ================= next step card ================= */
function snoozed(k){const v=Number(lsGet('paisa-snooze-'+k)||0);return v>Date.now()}
function nextStep(){
  const k=curKey(),m=month(k);
  const steps=[];
  if(canAdmin()&&!acctList().length)steps.push({k:'acct',t:'Add your bank account so balances match your bank app.',b:'Add account',a:'editacct'});
  const sal=catsAll().find(c=>c.section==='income'&&!c.archived&&/salary/i.test(c.name));
  if(canAdmin()&&sal&&!recForCat(sal.id))steps.push({k:'salrep',t:'Make your salary appear by itself every month.',b:'Set up',a:'editrec',kk:sal.id,amt:budgetOf(sal,k),day:sd()});
  const stale=acctList().find(a=>!a.checkedAt||daysBetween(a.checkedAt,todayISO())>=30);
  if(canWrite()&&!(txIndex()[k]||{list:[]}).list.length)steps.push({k:'first',t:'Log your first spend and watch your daily number move.',b:'Add a spend',a:'fab'});
  const noDue=catsAll().filter(c=>!c.archived&&(c.section==='bills'||c.section==='debt')&&!c.dueDay);
  if(canAdmin()&&noDue.length)steps.push({k:'due',t:`Add due dates for ${noDue.length===1?esc(noDue[0].name):noDue.length+' bills and EMIs'} so nothing slips.`,b:'Add dates',a:'duedates',meta:'30 sec'});
  if(NOTIF_SUPPORT&&Notification.permission==='default')steps.push({k:'notif',t:'Get a heads-up 3 days before each bill is due.',b:'Turn on',a:'allownotif'});
  const loanCat=catsAll().find(c=>!c.archived&&c.section==='debt'&&LOANLIKE.test(c.name)&&!isCardBill(c)&&!Object.values(D.loans).some(l=>l.cat===c.id));
  if(canAdmin()&&loanCat)steps.push({k:'loan-'+loanCat.id,t:`See the date your ${esc(loanCat.name.replace(/\s*EMI$/i,''))} ends.`,b:'Show me',a:'loanask',id:loanCat.id});
  const hh=S()&&S().household;
  if(MODE==='cloud'&&canAdmin()&&hh&&hh!=='me'&&MEMBERS.length<2)steps.push({k:'invite',t:`Invite ${hh==='partner'?'your partner':'your family'} so their spends count too.`,b:'Invite',a:'goinvite'});
  // three months of savings in a row, no goal yet
  const last3=[1,2,3].map(i=>addM(k,-i)).filter(x=>txIndex()[x]);
  if(canAdmin()&&last3.length===3&&!Object.keys(D.goals).length){const tot=last3.reduce((t,x)=>t+month(x).sec.savings.a,0);if(last3.every(x=>month(x).sec.savings.a>0))steps.push({k:'goal',t:`You've saved ${fmt(tot)} since ${mLong(last3[2])}. Give it a goal?`,b:'Make a goal',a:'editgoal'})}
  return steps.find(s=>!snoozed(s.k))||null;
}

/* ================= month-end wrap ================= */
let WRAP=null;
function wrapDue(){
  const s=S();if(!s)return null;const k=curKey(),prev=addM(k,-1);
  if(prev<s.startMonth||!txIndex()[prev])return null;
  if(lsGet('paisa-wrap-'+(FID||'local'))===k)return null;
  return prev;
}
function openWrap(prev){
  const m=month(prev),k=curKey();const saved=m.sec.savings.a;
  const yr=prev.slice(0,4);const best=saved>0&&Object.keys(txIndex()).filter(x=>x.startsWith(yr)&&x<prev).every(x=>month(x).sec.savings.a<saved);
  const over=m.cats.filter(c=>OUT.includes(c.section)&&c.budget>0&&c.left<0).sort((a,b)=>a.left-b.left)[0];
  const nm=month(k);const days=daysBetween(todayISO(),mEnd(k))+1;
  const spendable=nm.open+nm.sec.income.b-nm.planned;
  WRAP={step:WRAP&&WRAP.prev===prev?WRAP.step:1,prev};
  const cards=[
    `<p class="label" style="margin:0">${mLong(prev)}</p><div class="reveal-num num" style="font-size:40px">${fmt(saved)}</div><p class="onb-q" style="font-size:20px;margin:0 0 6px">saved and invested${best?', your best month this year':''}.</p><p class="small muted" style="margin:0">The month closed at <b class="num ${m.close<0?'over':''}">${fmt(m.close)}</b>.</p>`,
    over?`<p class="label" style="margin:0">One to look at</p><p class="onb-q" style="font-size:22px;margin:4px 0 8px">${esc(over.name)} ran ${fmt(-over.left)} over.</p><p class="small muted" style="margin:0 0 14px">Raise the budget to match, or keep it and aim lower this month.</p>${canAdmin()?`<div class="btns"><button class="btn primary" data-act="wrapraise" data-id="${over.id}" data-k="${over.actual}">Raise to ${fmt(over.actual)}</button><button class="btn" data-act="wrapnext">Keep ${fmt(over.budget)}</button></div>`:''}`
        :`<p class="label" style="margin:0">Budgets</p><p class="onb-q" style="font-size:22px;margin:4px 0 8px">Every category stayed within budget.</p><p class="small muted" style="margin:0">Same plan again this month.</p>`,
    `<p class="label" style="margin:0">${mLong(k)} is ready</p><div class="reveal-num num" style="font-size:40px">${fmt(Math.max(0,spendable))}</div><p class="onb-q" style="font-size:20px;margin:0 0 6px">to spend after your plan, about ${fmt(Math.floor(Math.max(0,spendable)/days/100)*100)} a day.</p>`
  ];
  const last=WRAP.step===3;
  openSheetW(`<div class="sheet-h"><div class="onb-dots">${[1,2,3].map(i=>`<i class="${i<=WRAP.step?'on':''}"></i>`).join('')}</div><button class="x" data-act="wrapclose" aria-label="Close">×</button></div>
    <div class="wrapcard">${cards[WRAP.step-1]}</div>
    ${WRAP.step===2&&over&&canAdmin()?'':`<button class="btn primary block" style="margin-top:18px" data-act="${last?'wrapclose':'wrapnext'}">${last?'Start '+mLong(k):'Next'}</button>`}`);
}
function openSheetW(h){openSheet(h,{onClose:()=>{if(WRAP)lsSet('paisa-wrap-'+(FID||'local'),curKey());WRAP=null}})}
function closeWrap(){if(WRAP)lsSet('paisa-wrap-'+(FID||'local'),curKey());WRAP=null;closeSheet()}
async function wrapRaise(id,amt){
  const c={...D.cats[id]};const k=curKey();const old=budgetOf({...c,id},k);
  c.hist=histWith(c,old,Number(amt),k);await store.set('cats',id,c).catch(()=>{});
  log('changed','budget',`${c.name} to ${fmt(Number(amt))} from ${mLabel(k)}`);
  toast(`${c.name} is now ${fmt(Number(amt))} a month.`);WRAP.step=3;openWrap(WRAP.prev);
}

/* ================= category icons ================= */
const GLYPH={
  wallet:'<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M3 7l12-3v3"/><circle cx="16.5" cy="13.5" r="1.1"/>',
  piggy:'<path d="M5 11a7 6 0 0 1 13-2l2-1v4l-1 1a6 6 0 0 1-3 4v2h-3v-1.5h-3V19H7v-2.5A6 6 0 0 1 5 11z"/><circle cx="15" cy="10.5" r=".7"/>',
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  cart:'<path d="M3 4h2l2.5 11h10l2-8H6.5"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
  food:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M16 21V3c-2 1-3 4-3 7h3"/>',
  car:'<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r=".7"/><circle cx="16.5" cy="13" r=".7"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  gift:'<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1-3-5-4-5-1.5S10 9 12 9zm0 0c1-3 5-4 5-1.5S14 9 12 9z"/>',
  bank:'<path d="M3 9l9-5 9 5"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
  card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.1"/>'
};
const GLYPH_RULES=[
  [/credit card/,'card'],[/emi|loan/,'bank'],[/salary|income|bonus|freelance/,'wallet'],
  [/sip|mutual|invest|stock|recurring|deposit|\brd\b|\bfd\b|ppf|nps|emergency|saving|gold/,'piggy'],
  [/\brent\b|house|maid|help|maintenance|society/,'home'],[/electric|power|gas|water/,'bolt'],
  [/mobile|internet|phone|wifi|broadband|dth|ott|subscription/,'phone'],[/grocer|vegetable|milk|kirana/,'cart'],
  [/eat|food|swiggy|zomato|restaurant|dining|coffee/,'food'],[/transport|fuel|petrol|cab|uber|ola|travel|metro|car|bike/,'car'],
  [/shop|cloth|amazon|flipkart/,'bag'],[/health|medic|doctor|pharma|insurance|gym/,'heart'],
  [/family|parent|gift|support|donation/,'gift'],[/school|fee|education|tuition|book|course/,'book']
];
const SEC_GLYPH={income:'wallet',savings:'piggy',bills:'receipt',expenses:'tag',debt:'bank'};
function glyphFor(c){const n=(c&&c.name||'').toLowerCase();for(const[re,g]of GLYPH_RULES)if(re.test(n))return g;return SEC_GLYPH[c&&c.section]||'tag'}
function icon(c){return `<span class="cib" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GLYPH[glyphFor(c)]}</svg></span>`}
const CHEV='<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/* ================= friendly dates ================= */
const WEEKDAY=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function relDay(ds){
  const d=daysBetween(todayISO(),ds);
  if(d===0)return'today';if(d===1)return'tomorrow';if(d===-1)return'yesterday';
  if(d>1&&d<7)return WEEKDAY[new Date(ds+'T00:00').getDay()];
  if(d<-1&&d>-7)return(-d)+' days ago';
  return'on '+dShort(ds);
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
