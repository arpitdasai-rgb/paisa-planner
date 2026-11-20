/* Paisa Planner · journeys: what's new, start (or replan) the month, catch up after a gap,
   member welcome, install and reminders, feedback, opt-in usage counts, finish updates, more tools.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
const NEWS_V='2026-11-19b';
const SAFE=()=>(FID||'local');

/* ---------- opt-in usage counts: names and a few counts only, never amounts, notes or names ---------- */
const metricsOn=()=>lsGet('paisa-metrics')==='1';
function installId(){let i=lsGet('paisa-install');if(!i){i=uid()+uid();lsSet('paisa-install',i)}return i}
let TRACKQ=[],TRACKT=null;
function track(name,props={}){
  if(!metricsOn()||!CFG.supabaseUrl)return;
  TRACKQ.push({name,props,install:installId(),app_v:NEWS_V,mode:MODE});clearTimeout(TRACKT);TRACKT=setTimeout(flushTrack,1500);
}
function flushTrack(){
  if(!TRACKQ.length||!navigator.onLine)return;const batch=TRACKQ.splice(0,50);
  restInsert('events',batch).catch(()=>{TRACKQ=batch.concat(TRACKQ).slice(0,200)});
}
// insert-only tables (supabase/v5.sql) take rows with the public key; nobody can read them from the app
function restInsert(table,rows){
  return fetch(CFG.supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+table,{method:'POST',headers:{apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+CFG.supabaseAnonKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(rows)})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status)});
}

/* ---------- "Tell us what's confusing" ---------- */
function feedbackFooter(){return['home','budget','plan','transactions','bills','more','prefs','help','habits'].includes(route)?`<p class="fbk"><button class="link small" data-act="feedback">Something confusing? Tell us</button></p>`:''}
function openFeedback(){
  openSheet(`${sheetHead('What was confusing?')}
    <p class="small muted" style="margin-top:0">A sentence is enough. We see which screen you were on, not your money.</p>
    <div class="field"><label for="fb-text">What happened, or what you expected</label><textarea class="input" id="fb-text" rows="4" maxlength="800" autocomplete="off" placeholder="e.g. I couldn’t find where to change my salary day…"></textarea></div>
    <button class="btn primary block" data-act="fbsend">Send to the Paisa team</button>`);
}
async function sendFeedback(el){
  const text=val('fb-text').trim();if(!text){toast('Write a few words first.');return}
  const row={screen:route,text:text.slice(0,800),install:installId(),app_v:NEWS_V};
  el.disabled=true;el.textContent='Sending…';
  try{if(!CFG.supabaseUrl)throw new Error('no server');await restInsert('feedback',[row]);closeSheet();toast('Thanks. The team will read it.');track('feedback_sent',{screen:route})}
  catch(e){const k='paisa-feedback-unsent';let a=[];try{a=JSON.parse(lsGet(k)||'[]')}catch(x){}a.push(row);lsSet(k,JSON.stringify(a.slice(-20)));closeSheet();toast("Couldn't send right now. It's saved and will go next time you're online.")}
}
function resendFeedback(){if(!CFG.supabaseUrl||!navigator.onLine)return;let a=[];try{a=JSON.parse(lsGet('paisa-feedback-unsent')||'[]')}catch(e){}if(!a.length)return;restInsert('feedback',a).then(()=>lsSet('paisa-feedback-unsent',null)).catch(()=>{})}

/* ---------- What's new (existing users, once per release) ---------- */
function whatsNewDue(){return S()&&Object.keys(D.tx).length>0&&lsGet('paisa-news')!==NEWS_V&&route==='home'&&!$('#sheetRoot').innerHTML}
function openWhatsNew(){
  lsSet('paisa-news',NEWS_V);
  const item=(ic,t,s)=>`<div class="wn"><span class="ti">${ui(ic,20)}</span><div><b>${t}</b><p>${s}</p></div></div>`;
  openSheet(`${sheetHead('What’s new in Paisa')}
    ${item('chart','Tabs now follow your routine','<b>Today</b> for the number and what’s due, <b>Month</b> for the plan and bills, <b>Money</b> for accounts and cards.')}
    ${item('budget','Replan in one screen','Last month’s plan carries over. You see what’s free to spend, and tap only the lines that changed.')}
    ${item('gear','A calmer Settings','Family and reminders up top. Everything else is folded away until you need it.')}
    ${item('list','Faster entries','Type “350 swiggy” or paste a bank SMS. Match a bank statement to add what you missed.')}
    ${item('bank','A weekly bank check','Paisa asks once a week if one account matches your bank, so the number stays true.')}
    ${CFG.supabaseUrl?`<label class="check wn-opt"><input type="checkbox" id="wn-metrics" ${metricsOn()?'checked':''}><span class="small">Share anonymous usage counts to help improve Paisa. No amounts, notes or names. Change it any time in Settings.</span></label>`:''}
    ${canAdmin()?'<button class="btn primary block" data-act="wnreplan">Replan this month now</button>':''}
    <button class="btn block" style="margin-top:8px" data-act="wnclose">Got it</button>`);
}
function wnSaveOpt(){const c=$('#wn-metrics');if(c){lsSet('paisa-metrics',c.checked?'1':null);if(c.checked)track('metrics_on',{from:'whatsnew'})}}

/* ---------- Start (or replan) the month: one screen that carries last month forward; 5 steps on request ---------- */
let SM=null;
const startDone=k=>lsGet('paisa-start-'+SAFE()+'-'+k)==='1';
function startCardHTML(k){
  if(!canAdmin()||k!==curKey()||startDone(k)||!S())return'';
  const day=daysBetween(mStart(k),todayISO())+1;if(day>10||k===S().startMonth)return'';
  return`<section class="startcard"><div><b>Start ${mLong(k)}</b><p>Last month’s plan carries over. Check it in one screen and change only what’s different.</p></div><button class="pillbtn" data-act="startmonth">Start</button></section>`;
}
function openStartMonth(k=curKey()){
  if(!canAdmin()){toast('Only the Owner or an Admin can change the plan.');return}
  SM={k,mode:'quick',exp:{},step:1,open:(D.months[k]&&D.months[k].open!=null)?'type':'carry',openAmt:(D.months[k]&&D.months[k].open!=null)?rupees(D.months[k].open):'',draft:{}};smOpen();renderStartMonth();
}
function smSteps(){return['Salary','Starting money','Bills and EMIs','Savings','Free to spend']}
// What the plan would be with the amounts typed so far (nothing is saved until Save plan).
function smPreview(){
  const k=SM.k,m=month(k),P=planParts(m);let d=0;
  for(const [id,v] of Object.entries(SM.draft)){const c=m.cats.find(x=>x.id===id);const a=parseAmt(v);if(!c||isNaN(a)||!['bills','debt','savings'].includes(c.section))continue;d-=Math.max(a,c.actual)-Math.max(c.budget,c.actual)}
  let open=m.open;if(SM.open==='carry')open=SM.carryAmt;else if(SM.open==='bank'){const b=bankStart(k);if(b!=null)open=b}else{const a=parseAmt(SM.openAmt);if(!isNaN(a))open=a}
  d+=open-m.open;const free=P.free+d,daysLeft=daysBetween(todayISO(),mEnd(k))+1;
  return{free,freeLeft:P.freeLeft+d,daysLeft,open};
}
function smHeroHTML(){const v=smPreview();
  return`<p class="label" style="margin:2px 0 0">Free to spend in ${mLong(SM.k)}</p><div class="qp-num num ${v.free<0?'neg':''}">${fmt(v.free)}</div>
    <p class="small muted" style="margin:2px 0 0">${v.free>0?`About <b class="num">${fmt(Math.floor(v.freeLeft/Math.max(1,v.daysLeft)/100)*100)} a day</b> for the ${v.daysLeft} days left.`:'Bills, EMIs and savings are more than the money you have. Lower one below.'}</p>`}
function smRefreshHero(){smRead();const h=$('#qp-hero');if(h)h.innerHTML=smHeroHTML()}
function renderQuickPlan(){
  const k=SM.k,m=month(k),prev=addM(k,-1),v=smPreview();
  const cats=sec=>m.cats.filter(c=>!c.archived&&c.section===sec);
  const val=c=>{const a=SM.draft[c.id]!=null?parseAmt(SM.draft[c.id]):c.budget;return isNaN(a)?c.budget:a};
  const amtRow=c=>`<label class="smrow">${icon(c)}<span class="n">${esc(c.name)}${c.dueDay?`<small>due ${ordinal(c.dueDay)}</small>`:''}</span><span class="rs">₹<input class="input num" inputmode="decimal" data-sm="${c.id}" value="${esc(SM.draft[c.id]!=null?SM.draft[c.id]:rupees(c.budget))}" aria-label="${esc(c.name)} amount"></span></label>`;
  const group=(key,title,L,sub)=>{const open=!!SM.exp[key];const tot=L.reduce((s,c)=>s+val(c),0);
    return`<div class="qp-g"><button class="qp-row" data-act="smexp" data-k="${key}" aria-expanded="${open}"><span class="n"><b>${title}</b><small>${sub}</small></span><b class="num">${fmt(tot)}</b><span class="qp-c">${open?'Done':'Change'}</span></button>
      ${open?`<div class="qp-body">${L.length?L.map(amtRow).join(''):'<p class="small muted">None yet. Add them on the Month page.</p>'}</div>`:''}</div>`};
  const inc=cats('income'),incExp=inc.reduce((s,c)=>s+c.budget,0),incGot=inc.reduce((s,c)=>s+c.actual,0);
  const waiting=inc.filter(c=>c.budget>0&&c.actual<c.budget);
  const bills=[...cats('bills'),...cats('debt')],save=cats('savings');
  const changed=[...bills,...save,...inc].filter(c=>{const was=budgetOf(c,prev);return was!==c.budget}).map(c=>c.name);
  const openLabel=SM.open==='carry'?(k===S().startMonth?'What you had at setup':`Left over from ${mLong(prev)}`):SM.open==='bank'?'What your banks held':'An amount you typed';
  const head=`<div class="sheet-h"><h2>Plan ${mLong(k)}</h2><button class="x" data-act="close" aria-label="Close">${ui('close',20)}</button></div>`;
  const body=`<div id="qp-hero" class="qp-hero" aria-live="polite">${smHeroHTML()}</div>
    <p class="qp-note">${k===S().startMonth?'Your plan from setup':`Same as ${mLong(prev)}`}${changed.length?`, except ${changed.slice(0,3).map(esc).join(', ')}${changed.length>3?` and ${changed.length-3} more`:''}`:''}. Tap a line to change it.</p>
    ${inc.length?`<div class="qp-g"><div class="qp-row static"><span class="n"><b>Salary and income</b><small>${waiting.length?`${fmt(incGot)} of ${fmt(incExp)} in so far`:'All in'}</small></span><b class="num">${fmt(incExp)}</b></div>
      ${waiting.map(c=>`<div class="smrow qp-sub"><span class="n">${esc(c.name)}<small>${c.actual?`${fmt(c.budget-c.actual)} still to come`:`Expected ${fmt(c.budget)}`}</small></span><button class="btn sm" data-act="smincome" data-id="${c.id}">It came in</button></div>`).join('')}</div>`:''}
    <div class="qp-g"><button class="qp-row" data-act="smexp" data-k="open" aria-expanded="${!!SM.exp.open}"><span class="n"><b>Starting money</b><small>${openLabel}</small></span><b class="num">${fmt(v.open)}</b><span class="qp-c">${SM.exp.open?'Done':'Change'}</span></button>
      ${SM.exp.open?`<div class="qp-body">${smOpenOpts()}</div>`:''}</div>
    ${group('bills','Bills and EMIs',bills,bills.length?`${bills.length} every month`:'None yet')}
    ${group('save','Savings',save,save.length?'Set any to 0 to skip this month':'None yet')}`;
  const nav=`<div class="btns snav"><button class="btn" data-act="smsteps">Step by step</button><button class="btn primary grow" data-act="smsave">Save plan</button></div>`;
  openSheet(head+`<div class="sscroll">${body}</div>`+nav);
}
function smOpenOpts(){const k=SM.k,carry=SM.carryAmt,bank=bankStart(k);
  return`<button class="smopt" data-act="smopen" data-k="carry" aria-pressed="${SM.open==='carry'}"><b>${fmt(carry)}</b><span>Left over from ${mLong(addM(k,-1))}</span></button>
      ${bank!=null?`<button class="smopt" data-act="smopen" data-k="bank" aria-pressed="${SM.open==='bank'}"><b>${fmt(bank)}</b><span>What your banks held on ${dShort(mStart(k))}, minus card bills still owed</span></button>`:''}
      <button class="smopt" data-act="smopen" data-k="type" aria-pressed="${SM.open==='type'}"><b>Another amount</b><span>Type what you had</span></button>
      ${SM.open==='type'?`<div class="field" style="margin-top:8px"><label for="sm-open">Money at the start (₹)</label><input class="input num" id="sm-open" inputmode="decimal" value="${esc(SM.openAmt)}" data-smopen></div>`:''}`}
// Save plan: the starting money choice, then any changed amounts (this and future months).
async function smSaveOpen(){const k=SM.k;let open=null;
  if(SM.open==='bank')open=bankStart(k);else if(SM.open==='type'){open=parseAmt(SM.openAmt);if(isNaN(open)){toast('Type the starting amount, or pick one above.');return false}}
  if(open!=null)await store.patch('months',k,['open'],open).catch(()=>{});else if(D.months[k]&&D.months[k].open!=null)await store.patch('months',k,['open'],null).catch(()=>{});
  return true}
function renderStartMonth(){
  if(SM.mode==='quick')return renderQuickPlan();
  const k=SM.k,m=month(k),n=SM.step;
  const head=`<div class="sheet-h"><h2>${n<5?`${mLong(k)} · step ${n} of 4`:'Your plan'}</h2><button class="x" data-act="close" aria-label="Close">${ui('close',20)}</button></div>
    <div class="dsteps" aria-hidden="true">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>`;
  const cats=sec=>m.cats.filter(c=>!c.archived&&c.section===sec);
  const amtRow=c=>`<label class="smrow">${icon(c)}<span class="n">${esc(c.name)}${c.dueDay?`<small>due ${ordinal(c.dueDay)}</small>`:''}</span><span class="rs">₹<input class="input num" inputmode="decimal" data-sm="${c.id}" value="${esc(SM.draft[c.id]!=null?SM.draft[c.id]:rupees(c.budget))}" aria-label="${esc(c.name)} amount"></span></label>`;
  let body='';
  if(n===1){const inc=cats('income');
    body=`<p class="dq">Did your salary come in?</p>${inc.length?inc.map(c=>{const got=c.actual>=c.budget&&c.budget>0;return`<div class="smrow">${icon(c)}<span class="n">${esc(c.name)}<small>${got?`${fmt(c.actual)} received`:c.actual?`${fmt(c.actual)} of ${fmt(c.budget)} received`:`Expected ${fmt(c.budget)}`}</small></span>
      ${got?'<span class="pill p-paid">Received</span>':`<button class="btn sm primary" data-act="smincome" data-id="${c.id}">It came in</button>`}</div>`}).join(''):'<p class="small muted">No income sources yet. Add one on the Month page.</p>'}
      <p class="small muted" style="margin:10px 2px 0">Not in yet? Go on. Paisa counts it once you mark it.</p>`}
  if(n===2){body=`<p class="dq">What did you start ${mLong(k)} with?</p>${smOpenOpts()}`}
  if(n===3){const L=[...cats('bills'),...cats('debt')];
    body=`<p class="dq">Your bills and EMIs</p><p class="small muted" style="margin:-6px 0 10px">The amounts that go out every month. Change any that are different now.</p>${L.length?L.map(amtRow).join(''):'<p class="small muted">None yet.</p>'}`}
  if(n===4){const L=cats('savings');
    body=`<p class="dq">What will you put away?</p><p class="small muted" style="margin:-6px 0 10px">SIPs, RDs and other savings. Set to 0 to skip this month.</p>${L.length?L.map(amtRow).join(''):'<p class="small muted">No savings categories yet.</p>'}`}
  if(n===5){const P=planParts(m),daysLeft=daysBetween(todayISO(),mEnd(k))+1;
    body=`<p class="label" style="margin:4px 0 0">Free to spend in ${mLong(k)}</p><div class="reveal-num num ${P.free<0?'neg':''}">${fmt(P.free)}</div>
      <p class="onb-help" style="margin:4px 0 14px">${P.free>0?`About <b class="num">${fmt(Math.floor(P.freeLeft/Math.max(1,daysLeft)/100)*100)} a day</b> for the ${daysLeft} days left, after bills, EMIs and savings.`:'Bills, EMIs and savings add up to more than the money you have. Lower one of them, or plan for income still to come.'}</p>
      <div class="kv"><span>Money in</span><b class="num">${fmt(P.inAvail)}</b></div><div class="kv"><span>Bills and EMIs</span><b class="num">−${fmt(P.commit).replace('−','')}</b></div><div class="kv"><span>Savings</span><b class="num">−${fmt(P.save).replace('−','')}</b></div>`}
  const nav=n<5?`<div class="btns snav">${n>1?'<button class="btn" data-act="smback">Back</button>':'<button class="btn" data-act="smquick">One screen</button>'}<button class="btn primary grow" data-act="smnext">${n===4?'See my plan':'Next'}</button></div>`
    :`<div class="btns snav"><button class="btn" data-act="smback">Back</button><button class="btn primary grow" data-act="smdone">Done</button></div>`;
  openSheet(head+`<div class="sscroll">${body}</div>`+nav);
}
function smRead(){document.querySelectorAll('[data-sm]').forEach(i=>{SM.draft[i.dataset.sm]=i.value});const o=$('#sm-open');if(o)SM.openAmt=o.value}
async function smApply(){
  // amounts: this and future months, the same way Edit budgets does
  const k=SM.k,writes=[];
  for(const [id,v] of Object.entries(SM.draft)){const amt=parseAmt(v);if(isNaN(amt)||!D.cats[id])continue;const c={...D.cats[id]};const old=budgetOf({...c,id},k);if(amt===old)continue;c.hist=histWith(c,old,amt,k);writes.push(store.set('cats',id,c))}
  SM.draft={};await Promise.allSettled(writes);
}
async function smNext(){
  smRead();
  if(SM.step===2&&!(await smSaveOpen()))return;
  if(SM.step===3||SM.step===4)await smApply();
  SM.step++;renderStartMonth();const sh=$('#sheetRoot .sheet');if(sh)sh.scrollTop=0;
}
function smOpen(){SM.carryAmt=(()=>{const s=S(),k=SM.k;if(k===s.startMonth)return s.opening||0;return month(addM(k,-1)).close})();}

/* ---------- Catch up after a gap ---------- */
function lastEntryAt(){let t=0;for(const x of Object.values(D.tx)){if(!x)continue;if(MODE==='cloud'&&x.by!==ME)continue;if((x.at||0)>t)t=x.at}return t}
function catchupHTML(){
  if(!canWrite()||VM!==curKey())return'';const t=lastEntryAt();if(!t)return'';
  const gap=Math.floor((Date.now()-t)/864e5);if(gap<7||lsGet('paisa-catchup-'+t))return'';
  return`<section class="catchup"><b>Welcome back</b><p>It’s been ${gap} days since your last entry, so left to spend may be missing a few things. Pick whichever is easiest:</p>
    <div class="btns">${acctList().length?'<button class="btn sm primary" data-act="stmmatch">Match a bank statement</button>':''}<button class="btn sm ${acctList().length?'':'primary'}" data-act="catchadd">Add what I remember</button><button class="btn sm" data-act="catchskip" data-k="${t}">Start from today</button></div></section>`;
}

/* ---------- Invited member: a short welcome, once per family ---------- */
function memberWelcome(){
  if(MODE!=='cloud'||IS_OWNER||!FID||lsGet('paisa-welcome-'+FID))return;lsSet('paisa-welcome-'+FID,'1');
  const fam=(S()&&S().name)||'your family budget';
  openSheet(`${sheetHead('Welcome to '+esc(fam))}
    <div class="wn"><span class="ti">${ui('users',20)}</span><div><b>You’re a ${ROLEN[Object.keys(ROLEN).find(r=>ROLEN[r]===ROLE)]||ROLE}</b><p>${esc((ROLEHELP[Object.keys(ROLEN).find(r=>ROLEN[r]===ROLE)]||'').replace(/^Can /,'You can ').replace(/\btheir\b/g,'your'))}${hideInc()?' Income is kept private by the Owner.':''}</p></div></div>
    ${canWrite()?`<div class="wn"><span class="ti">${ui('list',20)}</span><div><b>Add what you spend</b><p>Tap + or type “350 swiggy”. Everyone sees the same left-to-spend number.</p></div></div>`:''}
    <div class="wn"><span class="ti">${ui('bell',20)}</span><div><b>Get it on your home screen</b><p>Then turn on reminders so bills never slip.</p></div></div>
    ${canWrite()?'<button class="btn primary block" data-act="wfirst">Add my first entry</button>':''}
    <button class="btn block" style="margin-top:8px" data-act="installstep">Install and reminders</button>`);
}

/* ---------- After the first entry: install, then reminders ---------- */
function openInstallStep(){
  lsSet('paisa-installstep','1');
  const steps=STANDALONE?'<p class="small" style="margin:0">Paisa is on your home screen. Nice.</p>'
    :INSTALL_EVT?'<button class="btn primary block" data-act="install">Install Paisa</button>'
    :IS_IOS?'<ol class="steps"><li>Tap <b>Share</b> at the bottom of Safari.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open Paisa from your home screen.</li></ol>'
    :'<ol class="steps"><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li></ol>';
  const notif=NOTIF_SUPPORT&&Notification.permission==='default';
  openSheet(`${sheetHead('Keep Paisa one tap away')}
    <p class="small muted" style="margin-top:0">${IS_IOS&&!STANDALONE?'On iPhone, reminders only work once Paisa is on your home screen.':'It opens like an app and works without internet.'}</p>
    ${steps}
    ${notif&&(STANDALONE||!IS_IOS)?'<button class="btn block" style="margin-top:10px" data-act="allownotif">Turn on bill reminders</button>':''}
    ${CFG.supabaseUrl&&!metricsOn()?`<label class="check" style="border:0;margin-top:10px"><input type="checkbox" id="is-metrics"><span class="small">Share anonymous usage counts to help improve Paisa (no amounts or names)</span></label>`:''}
    <button class="btn block" style="margin-top:10px" data-act="installdone">Done</button>`);
}

/* ---------- Owner: database and reminder-service updates still to run ---------- */
let SCHEMA_V=null;
async function checkSchema(){if(MODE!=='cloud'||!SB)return;try{const {data,error}=await SB.rpc('paisa_schema_version');SCHEMA_V=error?0:Number(data)||0}catch(e){SCHEMA_V=0}if(route==='prefs'||route==='home')scheduleRender()}
const updatesDue=()=>MODE==='cloud'&&IS_OWNER&&SCHEMA_V!=null&&SCHEMA_V<5;
function updatesBody(){
  const raw='https://github.com/arpitdasai-rgb/paisa-planner/blob/main/supabase/';
  return`<section class="card"><h2 style="margin-bottom:6px">Finish the database updates</h2>
    <p class="small muted" style="margin:0 0 10px">Your family’s database is missing the latest updates. Until they run, Recently deleted stays on each phone and two people editing the same month can overwrite each other.</p>
    <ol class="steps"><li>Open <b>Supabase → SQL Editor → New query</b>.</li>
      <li>Paste and run each file, in order (each is safe to run again):<br><a href="${raw}v3.sql" target="_blank" rel="noopener">v3.sql</a>, <a href="${raw}v4.sql" target="_blank" rel="noopener">v4.sql</a>, <a href="${raw}v5.sql" target="_blank" rel="noopener">v5.sql</a></li>
      <li>Redeploy the <b>send-reminders</b> function so it uses the shared money rules (see SETUP-SUPABASE.md).</li>
      <li>Come back here and tap Check again.</li></ol>
    <button class="btn primary" data-act="schemacheck">Check again</button></section>`;
}

/* ---------- More tools: useful, but not part of the everyday loop ---------- */
function moreToolsGroup(){
  const nw=hideInc()?null:netWorth().total,loans=Object.values(D.loans).reduce((s,l)=>s+loanOutstanding(l),0),goals=Object.keys(D.goals).length;
  return tgroup('More tools',[trow('goplan','goals','target','Goals',goals?goals+' active':'Save up, yearly payments, clear a loan'),trow('goplan','loans','bank','Loans',loans?fmt(loans)+' still owed':'Payoff dates and interest'),
    nw!=null?trow('goplan','networth','chart','Net worth',fmt(nw)):'',canAdmin()&&MODE==='cloud'?trow('activitysheet','','list','Activity','Who changed what'):'',
    trow('go','reports','report','Yearly report','Month by month')]);
}

/* ---------- glue run after each render ---------- */
function journeysAfterRender(){
  if(route==='home'&&whatsNewDue())setTimeout(()=>{if(whatsNewDue())openWhatsNew()},700);
  resendFeedback();
}
