/* Paisa Planner · navigation, Today, Money card stack, messages, Settings, Family, More.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= redesign: navigation, Home, Wallet, More ================= */
const NAVI={
  home:'<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  budget:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9 9.5V20"/>',
  plan:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M15.5 15h2.5"/><path d="M6 6V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  more:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>'
};
const UI={
  chart:'<path d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5l1.6 2.2 2.7-.5.6 2.7 2.4 1.3-1.1 2.5 1.1 2.5-2.4 1.3-.6 2.7-2.7-.5L12 20.5l-1.6-2.2-2.7.5-.6-2.7-2.4-1.3 1.1-2.5-1.1-2.5 2.4-1.3.6-2.7 2.7.5z"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',users:'<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.5"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5M14.5 14.6c2.8-.6 5.6.6 6.5 4.4"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  budget:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9 9.5V20"/>',report:'<path d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>',
  bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',download:'<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',shield:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  repeat:'<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
  bank:'<path d="M3 9l9-5 9 5"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  backup:'<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4 4 0 0 1 0 10z"/><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5"/>',doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>'
};
const ui=(n,s=22)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[n]||NAVI[n]||''}</svg>`;

function renderTabs(){
  const cur=route==='transactions'?'home':route==='bills'?'budget':['family','prefs','reports','pushsetup','help','habits'].includes(route)?'more':route;
  const item=([k,n])=>`<a href="#${k}" ${cur===k?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAVI[k]}</svg><span>${n}</span></a>`;
  $('#tabs').innerHTML='<nav>'+[['home','Today'],['budget','Month']].map(item).join('')+'<span class="navgap" aria-hidden="true"></span>'+[['plan','Money'],['more','More']].map(item).join('')+'</nav>';
}

/* ---- Today: pace, count-up, petals ---- */
// How far through the month you are, against how much of the free-to-spend money is used.
function paceHTML(m){
  const P=planParts(m);if(!(P.free>0))return'';
  const total=daysBetween(mStart(VM),mEnd(VM))+1,day=clamp(daysBetween(mStart(VM),todayISO())+1,1,total),time=day/total,used=P.everyday/P.free;
  const ahead=P.everyday-P.free*time;const tone=used>1?'over':ahead>P.free*.08?'fast':'';
  const note=used>1?`<span class="over">${fmt(P.everyday-P.free)} past free money</span>`:tone?`<span class="fast">${fmt(Math.round(ahead/10000)*10000)} ahead of pace</span>`:'<span>On pace</span>';
  return`<div class="pace" role="img" aria-label="Day ${day} of ${total}. ${Math.round(used*100)} percent of free money used. ${tone==='over'?'Over':tone?'Ahead of pace':'On pace'}.">
    <div class="pace-track"><div class="pace-fill ${tone}" style="width:${Math.min(100,Math.round(used*100))}%"></div><div class="pace-now" style="left:${Math.round(time*100)}%"></div></div>
    <div class="pace-lbl"><span>Day <b>${day}</b> of ${total} · <b>${Math.round(used*100)}%</b> of free money used</span>${note}</div></div>`;
}
// The number counts to its new value when it changes (not on first view, not with reduced motion).
let HERO_LAST=null;
function heroCount(){
  const el=document.querySelector('.hero3 .big');if(!el)return;const to=month(VM).left,key=VM;
  const from=HERO_LAST&&HERO_LAST.k===key?HERO_LAST.v:null;HERO_LAST={k:key,v:to};
  if(from==null||from===to||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const t0=performance.now(),D0=520;const step=t=>{const f=Math.min(1,(t-t0)/D0),e=1-Math.pow(1-f,3);el.textContent=fmt(Math.round((from+(to-from)*e)/100)*100);if(f<1)requestAnimationFrame(step);else el.textContent=fmt(to)};
  requestAnimationFrame(step);
}
// Marigold petals, once, when every bill and EMI of the month is paid or skipped.
function petalsIfDone(){
  const k=curKey();if(VM!==k)return;const bl=billsFor(k);if(bl.length<2||!bl.every(b=>b.st==='paid'||b.st==='skip'))return;
  const key='paisa-petals-'+(FID||'local')+'-'+k;if(lsGet(key))return;lsSet(key,'1');
  setTimeout(()=>toast(`Every bill for ${mLong(k)} is done. ${bl.length} out of ${bl.length}.`),300);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=document.createElement('div');box.className='petals';box.setAttribute('aria-hidden','true');
  for(let i=0;i<26;i++){const p=document.createElement('i');p.className='petal';p.style.left=Math.round(Math.random()*100)+'%';p.style.animationDelay=(Math.random()*.6).toFixed(2)+'s';p.style.setProperty('--dx',Math.round(Math.random()*120-60)+'px');p.style.setProperty('--r',Math.round(Math.random()*540-270)+'deg');box.appendChild(p)}
  document.body.appendChild(box);setTimeout(()=>box.remove(),3200);
}
/* ---- Home ---- */
let HVIEW='spend';
function homeView(){
  const m=month(VM),isCur=VM===curKey(),t=todayISO();
  const daysLeft=isCur?daysBetween(t,mEnd(VM))+1:0;const free=m.projected;const waitInc=isCur&&m.incomeToCome>0;
  let line;
  if(isCur){
    line=free>0&&daysLeft>0?`${waitInc?`Once ${fmt(m.incomeToCome)} arrives, that's`:"That's"} <b class="num">${fmt(Math.floor(free/daysLeft/100)*100)} a day</b> for ${daysLeft} day${daysLeft===1?'':'s'}, after planned payments`
      :free<=0?`Planned payments are ${fmt(-free)} more than what's left`:'';
  }else if(VM<curKey())line=`${mLong(VM)} closed at <b class="num ${m.close<0?'over':''}">${fmt(m.close)}</b>`;
  else line=`${mLong(VM)} hasn't started yet`;
  const needs=attentionItems(VM);
  const bills=billsFor(VM);const urgent=bills.find(b=>b.st==='overdue')||bills.find(b=>b.st==='due');
  const cta=!canWrite()?'':urgent?`<button class="pillbtn" data-act="paybill" data-id="${urgent.id}">Mark ${esc(urgent.name)} paid</button>`:`<button class="pillbtn" data-act="fab">Add expense</button>`;
  const dues=bills.filter(b=>b.st==='due'||b.st==='up').slice(0,2);
  const skipKey=urgent&&canWrite()?'bill.overdue:'+urgent.id:null;const badgeN=needs.filter(n=>n.key!==skipKey).length;
  const hero=`<section class="hero2 hero3" aria-label="Left to spend">
    <div class="hbar"><a class="ibtn" href="#reports" aria-label="Yearly report">${ui('chart')}</a>
      <div class="ptoggle" role="group" aria-label="Show"><button data-act="hview" data-k="spend" aria-pressed="${HVIEW==='spend'}">This month${badgeN?`<i class="badge">${badgeN}</i>`:''}</button><button data-act="hview" data-k="recent" aria-pressed="${HVIEW==='recent'}">Recent</button></div>
      <a class="ibtn" href="#prefs" aria-label="Settings">${ui('gear')}</a></div>
    <div class="heyebrow"><button class="ar" data-act="mprev" aria-label="Previous month">‹</button><span>Left to spend · ${isCur?(daysLeft+' day'+(daysLeft===1?'':'s')+' to go'):mLabel(VM)}</span><button class="ar" data-act="mnext" aria-label="Next month">›</button></div>
    <button class="bigbtn" data-act="breakdown" aria-label="${fmt(m.left)} left to spend. See how it adds up"><span class="big num ${m.left<0&&!waitInc?'neg':''}">${fmt(m.left)}</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    <p class="heroline">${line}${waitInc&&m.left<=0?'. Below zero only because that income isn\'t logged yet':''}</p>
    ${isCur?paceHTML(m):''}
    ${cta}
    ${isCur&&!needs.some(n=>n.rank===1)?nextStepHTML():''}
  </section>`;
  if(HVIEW==='recent'){
    const list=Object.entries(D.tx).map(([id,x])=>({...x,id})).filter(x=>x&&x.date&&(!hideInc()||isXfer(x)||!(D.cats[x.cat]&&D.cats[x.cat].section==='income'))).sort((a,b)=>b.date.localeCompare(a.date)||(b.at||0)-(a.at||0)).slice(0,15);
    return `<div class="home">${topbar(S().name)}${hero}<section class="sect"><div class="sect-head"><h2>Recent</h2><a class="link small" href="#transactions">View all ›</a></div>
      ${list.map(x=>{if(isXfer(x))return `<button class="rowbtn" data-act="edittx" data-id="${x.id}"><div class="row">${icon({name:'bank',section:'debt'})}<div class="grow"><div class="t">${esc(x.note||'Self transfer')}</div><div class="s">${dShort(x.date)} · ${esc(acctName(x.from))} → ${esc(acctName(x.to))}</div></div><div class="amt num muted">${fmt(x.amt)}</div></div></button>`;
        const c=D.cats[x.cat];const inc=c&&c.section==='income';return `<button class="rowbtn" data-act="edittx" data-id="${x.id}"><div class="row">${icon(c||{section:'expenses'})}<div class="grow"><div class="t">${esc(x.note||(c?c.name:''))}</div><div class="s">${dShort(x.date)}${x.note&&c?' · '+esc(c.name):''} · ${esc(x.mode||'')}</div></div><div class="amt num" style="${inc?'color:var(--good)':''}">${inc?'+':''}${fmt(x.amt)}</div></div></button>`}).join('')||'<p class="empty-state">Nothing logged yet. Tap + to add your first entry.</p>'}
      </section></div>`;
  }
  return `<div class="home">${topbar(S().name)}${hero}<div class="stack">
  ${attentionHTML(VM,skipKey)}
  ${isCur&&!needs.length&&!nextStep()?insightHTML(VM):''}
  <section class="sect"><div class="sect-head"><h2>Coming up</h2><a class="link small" href="#bills">All bills ›</a></div>
    ${dues.length?dues.map(b=>`<div class="row">${icon(b)}<div class="grow"><div class="t">${esc(b.name)}</div><div class="s">Goes out ${relDay(b.due)}</div></div><div class="amt num">${fmt(b.budget)}</div>${canWrite()?`<button class="btn sm" data-act="paybill" data-id="${b.id}">Paid</button>`:''}</div>`).join('')
      :`<p class="small muted" style="margin:4px 0 8px">Nothing else is due ${isCur?'this month':'in '+mLong(VM)}.</p>`}
  </section>
  <details class="more" id="home-more" ${lsGet('paisa-home-more')==='1'?'open':''}><summary>Where the money went ${CHEV}</summary>
  <section class="sect"><div class="sect-head"><h2>Plan vs actual</h2><a class="link small" href="#reports">Yearly report ›</a></div>${bvaChart(m)}</section>
  <section class="sect"><h2 style="margin-bottom:10px">Split by section</h2>${donut(m)}</section>
  <section class="sect"><h2 style="margin-bottom:10px">Everyday spending</h2>${expBars(m)}</section>
  </details></div></div>`;
}
function nextStepHTML(){
  const s=nextStep();if(!s)return'';
  return `<div class="nudge"><button class="nudge-main" data-act="${s.a}" ${s.id?`data-id="${s.id}"`:''} ${s.kk?`data-k="${s.kk}" data-amt="${s.amt||''}" data-day="${s.day||''}"`:''}><span>${s.t}</span>${CHEV}</button><button class="nudge-x" data-act="snooze" data-k="${s.k}" aria-label="Not now">×</button></div>`;
}

/* ---- Wallet: accounts and cards as a stack ---- */
let WSEL=null,WFILTER='all';
const GRADS=6;
const gradOf=id=>{let h=0;for(const ch of String(id))h=(h*31+ch.charCodeAt(0))>>>0;return'g'+(h%GRADS)};
function walletItems(){
  const L=acctList().map(a=>({key:'acct:'+a.id,kind:'acct',id:a.id,a}));
  const C=Object.entries(D.cards).map(([id,c])=>({key:'card:'+id,kind:'card',id,c}));
  return WFILTER==='acct'?L:WFILTER==='card'?C:[...L,...C];
}
function cardState(id){
  const c=D.cards[id];const k=curKey();const st=(c.stmts||{})[k]||(c.stmts||{})[addM(k,-1)];
  const stK=(c.stmts||{})[k]?k:addM(k,-1);const due=st?Math.max(0,(st.amt||0)-(st.paid||0)):0;const dueOn=st&&c.dueDay?PaisaCore.cardDueDate(c,stK):c.dueDay?dueDateFn(c.dueDay):null;
  const s=cardStatus(st);let label;
  if(!st)label='No statement yet';else if(s==='full')label='Paid in full';else{const dd=dueOn?daysBetween(todayISO(),dueOn):null;label=dd==null?'Due':dd<0?'Overdue':dd===0?'Due today':`Due in ${dd} day${dd===1?'':'s'}`}
  return{st,due,label,full:s==='full'};
}
function dueDateFn(day){const k=curKey();let d=dueDate({dueDay:day},k);if(d<todayISO())d=dueDate({dueDay:day},addM(k,1));return d}
function pcardHTML(it,sel){
  if(it.kind==='acct'){const a=it.a,bal=acctBalance(a.id);
    return `<button class="pcard ${gradOf(a.id)} ${sel?'sel':''}" data-act="wpick" data-id="${it.key}">
      <span class="pc-row"><span class="pc-bank">${esc(a.bank||'Bank')}</span><span class="pc-amt num">${fmt(bal)}</span></span>
      <span class="pc-row pc-sub"><span>${esc((a.type||'Savings').toUpperCase())}${a.last4?' ·· '+esc(a.last4):''}</span><span>${bal<0?'Overdrawn':'Balance'}</span></span>
      <span class="pc-chip" aria-hidden="true"></span>
      <span class="pc-row pc-foot"><span class="pc-name">${esc((a.nick||MYNAME||'').toUpperCase())}</span>${sel&&canAdmin()?'<span class="pc-act" data-act="checkacct" data-id="'+a.id+'">Check balance</span>':''}</span></button>`}
  const c=it.c,s=cardState(it.id);
  return `<button class="pcard ${gradOf(it.id)} ${sel?'sel':''}" data-act="wpick" data-id="${it.key}">
    <span class="pc-row"><span class="pc-bank">${esc(c.bank||c.name)}</span><span class="pc-amt num">${s.st?(s.full?'<span class="ok">✓</span> ':'')+fmt(s.full?s.st.amt:s.due):'—'}</span></span>
    <span class="pc-row pc-sub"><span>${esc(c.name.toUpperCase())}</span><span>${esc(s.label.toUpperCase())}</span></span>
    <span class="pc-chip" aria-hidden="true"></span>
    <span class="pc-row pc-foot"><span class="pc-name">CREDIT CARD</span>${sel&&s.due>0&&canWrite()?`<span class="pc-act" data-act="wpay" data-id="${it.id}">Pay now</span>`:''}</span></button>`;
}
function walletView(){
  const items=walletItems();const all=[...acctList(),...Object.keys(D.cards)];
  if(!WSEL||!items.some(i=>i.key===WSEL))WSEL=items[0]?items[0].key:null;
  const sel=items.find(i=>i.key===WSEL);const rest=items.filter(i=>i.key!==WSEL);
  const tot=acctList().reduce((s,a)=>s+acctBalance(a.id),0),dues=cardDues();
  const nw=hideInc()?null:netWorth().total;const loans=Object.values(D.loans).reduce((s,l)=>s+loanOutstanding(l),0);
  const goals=Object.keys(D.goals).length,reps=recList().length;
  const tile=(k,label,val)=>`<button class="mtile" data-act="goplan" data-k="${k}"><span class="mt-l">${label}</span><span class="mt-v">${val} ›</span></button>`;
  return `<header class="topbar"><h1>Money</h1>${canAdmin()?'<button class="btn sm" data-act="waddmenu">+ Add</button>':''}</header>
  <section class="wsum"><div class="eyebrow">In ${acctList().length} account${acctList().length===1?'':'s'}</div><div class="bigc num">${fmt(tot)}</div>${dues?`<div class="small muted">Card dues ${fmt(dues)}</div>`:''}</section>
  ${items.length?`<div class="cstrip" role="group" aria-label="Accounts and cards">
    <button class="cs-all" data-act="wfilter" data-k="${WFILTER==='all'?'acct':WFILTER==='acct'?'card':'all'}" aria-label="${WFILTER==='all'?'All':WFILTER==='acct'?'Banks':'Cards'} (${items.length}), tap to filter">${WFILTER==='all'?'All':WFILTER==='acct'?'Banks':'Cards'} (${items.length})</button>
    ${items.map(i=>`<button class="cs-thumb ${gradOf(i.id)}" data-act="wpick" data-id="${i.key}" aria-pressed="${i.key===WSEL}" aria-label="${esc(i.kind==='acct'?acctLabel(i.a):i.c.name)}"><span>${esc(((i.kind==='acct'?i.a.bank:i.c.bank||i.c.name)||'').slice(0,1))}</span></button>`).join('')}
    ${canAdmin()?'<button class="cs-add" data-act="waddmenu" aria-label="Add account or card">+</button>':''}</div>
  <div class="cstack">${sel?pcardHTML(sel,true):''}</div>
  ${sel?`<div class="center"><button class="btn sm ghostpill" data-act="wdetail" data-id="${sel.key}">View details ›</button></div>`:''}
  ${rest.length?`<div class="peeks">${rest.map(i=>pcardHTML(i,false)).join('')}</div>`:''}`
  :`<section class="empty-wallet"><p class="heroline" style="text-align:center;margin:0 auto 14px">Add your bank accounts and credit cards to see balances, dues and where money moves.</p>${canAdmin()?'<div class="center"><button class="pillbtn" data-act="editacct">Add bank account</button></div>':''}</section>`}
  <section class="sect"><h2 style="margin-bottom:10px">Money matters</h2><div class="mtiles">
    ${tile('loans','Loans',loans?fmt(loans)+' left':'Add')}${tile('goals','Goals',goals?goals+' active':'Set one')}${tile('recurring','Repeats',reps?reps+' monthly':'Add')}${nw!=null?tile('networth','Net worth',fmt(nw)):''}${tile('cards','Credit cards',Object.keys(D.cards).length||'Add')}
  </div></section>`;
}
function openWalletDetail(key){
  const [kind,id]=key.split(':');
  if(kind==='acct'){const a=acctById(id);const bal=acctBalance(id);
    const recent=Object.entries(D.tx).map(([tid,t])=>({...t,id:tid})).filter(t=>t.acct===id||t.from===id||t.to===id).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,6);
    return openSheet(`${sheetHead(esc(acctLabel(a)))}<div class="center" style="margin:-4px 0 12px"><div class="eyebrow">${esc(a.bank)} · ${esc(a.type||'Savings')}</div><div class="bigc num">${fmt(bal)}</div>${a.checkedAt?`<div class="small muted">Checked ${dShort(a.checkedAt)}</div>`:''}</div>
      <div class="btns" style="justify-content:center;margin-bottom:12px">${canWrite()?`<button class="btn sm" data-act="wxfer" data-id="${id}">Move money</button>`:''}${canAdmin()?`<button class="btn sm" data-act="checkacct" data-id="${id}">Check balance</button><button class="btn sm" data-act="editacct" data-id="${id}">Edit</button>`:''}</div>
      <div class="eyebrow" style="margin:6px 0 2px">Recent</div>${recent.map(t=>{if(isXfer(t))return `<div class="row"><div class="grow"><div class="t">${esc(t.note||'Self transfer')}</div><div class="s">${dShort(t.date)} · ${esc(acctName(t.from))} → ${esc(acctName(t.to))}</div></div><div class="amt num ${t.to===id?'':'muted'}">${t.to===id?'+':'−'}${fmt(t.amt)}</div></div>`;const c=D.cats[t.cat]||{};const inc=c.section==='income';return `<div class="row"><div class="grow"><div class="t">${esc(t.note||c.name||'')}</div><div class="s">${dShort(t.date)} · ${esc(c.name||'')}</div></div><div class="amt num" style="${inc?'color:var(--good)':''}">${inc?'+':'−'}${fmt(t.amt)}</div></div>`}).join('')||'<p class="small muted">No entries from this account yet.</p>'}`)}
  const c=D.cards[id];const s=cardState(id);const used=s.st&&c.limit?s.st.amt/c.limit:0;
  openSheet(`${sheetHead(esc(c.name))}<div class="center" style="margin:-4px 0 12px"><div class="eyebrow">${esc(c.bank||'Credit card')} · ${esc(s.label)}</div><div class="bigc num">${s.st?fmt(s.full?s.st.amt:s.due):'—'}</div>${s.st?`<div class="small muted">Statement ${fmt(s.st.amt)} · paid ${fmt(s.st.paid||0)}</div>`:''}</div>
    ${c.limit?`<div class="kv"><span>Limit used</span><b class="num ${used>.3?'over':''}">${Math.round(used*100)}% of ${fmt(c.limit)}</b></div>`:''}
    ${c.dueDay?`<div class="kv"><span>Due on</span><b>${ordinal(c.dueDay)} of the month</b></div>`:''}
    ${s.st&&cardStatus(s.st)==='part'?`<div class="alert a-bad" style="margin-top:8px"><span class="dot"></span><span>Interest of 36–42% a year applies to the unpaid ${fmt(s.due)}.</span></div>`:''}
    <div class="btns" style="justify-content:center;margin-top:14px">${s.due>0&&canWrite()?`<button class="btn primary" data-act="wpay" data-id="${id}">Pay ${fmt(s.due)}</button>`:''}${canAdmin()?`<button class="btn sm" data-act="stmt" data-id="${id}">${s.st?'Update':'Add'} statement</button><button class="btn sm" data-act="editcard" data-id="${id}">Edit</button>`:''}</div>`);
}

/* ---- More: search and everything else ---- */
const FEATURES=[['Bills & EMIs','go','bills','receipt'],['Budget','go','budget','budget'],['Entries','go','transactions','list'],['Yearly report','go','reports','report'],['Family','go','family','users'],['Settings','go','prefs','gear'],
  ['Bank accounts','goplan','accounts','bank'],['Credit cards','goplan','cards','card'],['Loans','goplan','loans','bank'],['Goals','goplan','goals','target'],['Repeats','goplan','recurring','repeat'],['Net worth','goplan','networth','chart'],
  ['Export','exp-month','','download'],['Import from Excel','prefsec','data','upload'],['Reminders','prefsec','reminders','bell'],['App lock','prefsec','lock','lock'],['Back up','prefsec','data','backup'],['Match bank statement','stmmatch','','bank'],['Delete data','deldata','','shield'],['Help & FAQ','go','help','doc'],['Your habits','go','habits','chart'],['Recently deleted','prefsec','trash','backup'],['Install the app','prefsec','install','download'],['Budget setup','prefsec','budget','budget'],['Privacy policy','link','privacy.html','shield'],['Terms','link','terms.html','doc']];
const recentQ=()=>{try{return JSON.parse(lsGet('paisa-recent-q')||'[]')}catch(e){return[]}};
function featBtn([n,a,k,ic],cls='chip'){return a==='link'?`<a class="${cls}" href="${k}">${ui(ic,18)}<span>${n}</span></a>`:`<button class="${cls}" data-act="${a}" ${k?`data-k="${k}"`:''}>${ui(ic,18)}<span>${n}</span></button>`}
function moreSearch(q){
  const box=$('#mresults'),home=$('#mhome');if(!box)return;q=q.trim().toLowerCase();
  if(!q){box.innerHTML='';if(home)home.hidden=false;return}if(home)home.hidden=true;
  if(/bills? due|upcoming|this week/.test(q)){box.innerHTML=`<section class="sect nob"><span class="eyebrow">Due this week</span>${billsFor(curKey()).filter(b=>b.st==='due'||b.st==='overdue'||(b.st==='up'&&daysBetween(todayISO(),b.due)<7)).map(b=>`<div class="row">${icon(b)}<div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${b.label}</div></div><div class="amt num">${fmt(b.budget)}</div></div>`).join('')||'<p class="small muted">Nothing due this week.</p>'}</section>`;return}
  const feats=FEATURES.filter(f=>f[0].toLowerCase().includes(q));
  const cats=catsAll().filter(c=>!c.archived&&c.name.toLowerCase().includes(q)).slice(0,5);
  const ents=Object.entries(D.tx).map(([id,t])=>({...t,id})).filter(t=>{const c=D.cats[t.cat];return (t.note||'').toLowerCase().includes(q)||(c&&c.name.toLowerCase().includes(q))}).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  box.innerHTML=(feats.length?`<section class="sect nob"><span class="eyebrow">Go to</span><div class="chips" style="margin-top:10px">${feats.map(f=>featBtn(f)).join('')}</div></section>`:'')
    +(cats.length?`<section class="sect nob"><span class="eyebrow">Categories</span>${cats.map(c=>{const m=month(curKey()).cats.find(x=>x.id===c.id);return `<button class="rowbtn" data-act="catentries" data-id="${c.id}"><div class="row">${icon(c)}<div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${SECN[c.section]}</div></div><div class="amt num">${m?fmt(m.actual):''}</div>${CHEV}</div></button>`}).join('')}</section>`:'')
    +(ents.length?`<section class="sect nob"><span class="eyebrow">Entries</span>${ents.map(t=>{const c=D.cats[t.cat]||{};return `<button class="rowbtn" data-act="edittx" data-id="${t.id}"><div class="row">${icon(c.name?c:{section:'expenses'})}<div class="grow"><div class="t">${esc(t.note||c.name||'')}</div><div class="s">${dShort(t.date)} · ${esc(c.name||'')}</div></div><div class="amt num">${fmt(t.amt)}</div></div></button>`}).join('')}</section>`:'')
    +((h=>h.length?`<section class="sect nob"><span class="eyebrow">Help</span>${h.map(i=>`<button class="rowbtn" data-act="helpopen" data-k="${esc(q)}"><div class="row"><span class="ti" style="width:36px;height:36px">${ui('doc',18)}</span><div class="grow"><div class="t">${esc(FAQ[i][1])}</div></div>${CHEV}</div></button>`).join('')}</section>`:'')(helpHits(q)))
    ||`<p class="empty-state">Nothing matches "${esc(q)}".</p>`;
}
function saveRecentQ(q){q=q.trim();if(q.length<2)return;const a=recentQ().filter(x=>x.toLowerCase()!==q.toLowerCase());a.unshift(q);lsSet('paisa-recent-q',JSON.stringify(a.slice(0,6)))}

/* ================= messages: one registry for every in-app prompt =================
   Each message: rank (1 act now · 2 to confirm · 3 heads-up), slot, and how it reads:
   title = the fact (subject first, under ~6 words) · detail = amount · when · action = one verb.
   Screens never decide what to show on their own; they ask needsItems() for a ranked list. */
const MSG={
  'bill.overdue':{rank:1,tone:'bad',make:b=>({title:`${b.name} was due ${relDay(b.due)}`,detail:`${fmt(b.budget)} · not marked paid`,act:canWrite()?{a:'paybill',id:b.id,l:'Mark paid'}:null})},
  'month.short': {rank:1,tone:'bad',make:m=>({title:`${fmt(-m.projected)} short this month`,detail:'Once planned payments go out',act:{a:'go',k:'budget',l:'Review'}})},
  'month.over':  {rank:1,tone:'bad',make:m=>({title:`Spent ${fmt(-m.left)} more than you had`,detail:'This month so far',act:{a:'go',k:'transactions',l:'See entries'}})},
  'card.part':   {rank:1,tone:'bad',make:([id,cd,st])=>({title:`${cd.name} bill part-paid`,detail:`Interest on ${fmt(st.amt-(st.paid||0))}`,act:canWrite()?{a:'wpay',id,l:'Pay'}:null})},
  'repeat.due':  {rank:2,tone:'cat',make:r=>({title:r.note||r.c.name,detail:`${r.c.section==='income'?'+':''}${fmt(r.amt)} · ${r.c.section==='income'?'usually arrives':'usually goes out'} ${relDay(r.date)}`,act:canWrite()?{a:'recok',id:r.id,l:'Confirm'}:null,alt:canWrite()?{a:'recskip',id:r.id,l:'Skip'}:null,cat:r.c})},
  'acct.check':  {rank:2,tone:'muted',make:a=>({title:`Does ${acctLabel(a)} show ${fmt(acctBalance(a.id))}?`,detail:'Weekly bank check · keeps left to spend true',act:{a:'checkacct',id:a.id,l:'Check'}})},
  'month.start': {rank:3,tone:'muted',dismiss:'month',make:([bank,open])=>({title:`Your banks say you began with ${fmt(bank)}`,detail:`Paisa has ${fmt(open)} as money at the start`,act:canAdmin()?{a:'useopenbank',l:'Use banks'}:null})},
  'cat.over':    {rank:3,tone:'warn',dismiss:'month',make:c=>({title:`${c.name} is ${fmt(-c.left)} over`,detail:`Budget ${fmt(c.budget)}`,act:canAdmin()?{a:'editcat',id:c.id,l:'Adjust'}:{a:'catentries',id:c.id,l:'See entries'}})},
  'cat.pace':    {rank:3,tone:'warn',dismiss:'month',make:([c,over])=>({title:`${c.name} heading ${fmt(over)} over`,detail:`At this pace · budget ${fmt(c.budget)}`,act:canAdmin()?{a:'editcat',id:c.id,l:'Adjust'}:{a:'catentries',id:c.id,l:'See entries'}})},
  'cat.near':    {rank:3,tone:'warn',dismiss:'month',make:([c,days])=>({title:`${fmt(c.left)} left in ${c.name}`,detail:`For ${days} more day${days===1?'':'s'}`,act:{a:'catentries',id:c.id,l:'See entries'}})},
  'card.limit':  {rank:3,tone:'muted',dismiss:'month',make:([id,cd,pct])=>({title:`${cd.name} at ${pct}% of its limit`,detail:'Under 30% is healthier for your credit score',act:{a:'wdetail',id:'card:'+id,l:'Open'}})}
};
const dismissed=(key,k)=>lsGet('paisa-dis-'+key+'-'+k)==='1';
function needsItems(k){
  const m=month(k),isCur=k===curKey(),out=[];
  const add=(type,data,key)=>{const d=MSG[type];if(d.dismiss&&dismissed(key,k))return;out.push({type,key,rank:d.rank,tone:d.tone,dismiss:!!d.dismiss,...d.make(data)})};
  billsFor(k).filter(b=>b.st==='overdue').forEach(b=>add('bill.overdue',b,'bill.overdue:'+b.id));
  if(isCur&&m.projected<0)add('month.short',m,'month.short');
  else if(m.left<0&&!(isCur&&m.incomeToCome>0))add('month.over',m,'month.over');
  Object.entries(D.cards).forEach(([id,cd])=>{const st=cd.stmts&&cd.stmts[k];if(cardStatus(st)==='part')add('card.part',[id,cd,st],'card.part:'+id);
    if(st&&cd.limit&&st.amt/cd.limit>.3)add('card.limit',[id,cd,Math.round(st.amt/cd.limit*100)],'card.limit:'+id)});
  recDue(k).forEach(r=>add('repeat.due',r,'repeat.due:'+r.id));
  if(isCur&&canAdmin()){const due=acctList().filter(a=>!a.checkedAt||daysBetween(a.checkedAt,todayISO())>=7).sort((x,y)=>(x.checkedAt||'').localeCompare(y.checkedAt||''))[0];if(due)add('acct.check',due,'acct.check:'+due.id);
    const bs=bankStart(k);if(bs!=null&&Math.abs(bs-m.open)>=50000&&!(D.months[k]&&D.months[k].open!=null))add('month.start',[bs,m.open],'month.start')}
  m.cats.filter(c=>OUT.includes(c.section)&&c.budget>0&&c.left<0).sort((a,b)=>a.left-b.left).forEach(c=>add('cat.over',c,'cat.over:'+c.id));
  if(isCur){const total=daysBetween(mStart(k),mEnd(k))+1,gone=daysBetween(mStart(k),todayISO())+1,f=clamp(gone/total,0,1),left=total-gone;
    if(f<.92)m.cats.filter(c=>c.section==='expenses'&&c.budget>0&&c.actual>0&&c.left>=0).forEach(c=>{const used=c.actual/c.budget;
      if(used>=.6&&used>f+.15){const proj=Math.round(c.actual/f);if(proj>c.budget){add('cat.pace',[c,Math.round((proj-c.budget)/10000)*10000],'cat.pace:'+c.id);return}}
      if(used>=.8)add('cat.near',[c,left],'cat.near:'+c.id)})}
  return out.sort((a,b)=>a.rank-b.rank);
}
// kept for older callers (Home badge, tests)
function attentionItems(k){return needsItems(k)}
function attentionHTML(k,skip){
  const items=needsItems(k).filter(i=>i.key!==skip);
  if(!items.length)return `<p class="calm"><span class="dot" style="color:var(--good)"></span>Nothing needs you. Bills and budgets are on track.</p>`;
  const shown=ATT_ALL?items:items.slice(0,3);
  const lead=i=>i.cat?icon(i.cat):`<span class="dot" style="color:var(--${i.tone==='bad'?'bad':i.tone==='warn'?'warn':'muted'})"></span>`;
  return `<section class="attn" aria-label="Needs you"><div class="attn-h">Needs you · ${items.length}</div>
    ${shown.map(i=>`<div class="attn-item">${lead(i)}<div class="grow"><div class="nt">${esc(i.title)}</div><div class="nd">${esc(i.detail)}</div></div>
      <div class="nacts">${i.alt?`<button class="link small" data-act="${i.alt.a}" data-id="${i.alt.id}">${i.alt.l}</button>`:''}${i.act?`<button class="btn sm ${i.rank===1||i.rank===2?'primary':''}" data-act="${i.act.a}" ${i.act.id?`data-id="${i.act.id}"`:''} ${i.act.k?`data-k="${i.act.k}"`:''}>${i.act.l}</button>`:''}${i.dismiss?`<button class="x sm" data-act="dismsg" data-k="${esc(i.key)}" aria-label="Hide until next month">×</button>`:''}</div></div>`).join('')}
    ${items.length>3?`<button class="link small" data-act="attall" style="padding:8px 0">${ATT_ALL?'Show fewer':'Show all '+items.length}</button>`:''}</section>`;
}

/* ================= Settings: tiles → sub-pages ================= */
let PREFSEC=null,PREF_KEEP=false;
const PREF_TITLES={trash:'Recently deleted',account:'Account',budget:'Budget setup',reminders:'Reminders',lock:'App lock',install:'Install the app',data:'Import, export & backup',about:'Privacy & terms',danger:'Danger zone'};
function trow(act,k,ic,title,sub,extra=''){return `<button class="trow" data-act="${act}" ${k?`data-k="${k}"`:''} ${extra}><span class="ti">${ui(ic,20)}</span><span class="tt"><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span>${CHEV}</button>`}
function tgroup(label,rows){rows=rows.filter(Boolean);return rows.length?`<section class="tgroup">${label?`<div class="eyebrow">${label}</div>`:''}<div class="tcard">${rows.join('')}</div></section>`:''}
function prefTiles(s,hasPin){
  const perm=NOTIF_SUPPORT?Notification.permission:'unsupported',p=pushPrefs();
  const remSub=perm==='granted'?(p.bills?`On · bills at ${hourLabel(p.billsHour)}`:'Off'):perm==='denied'?'Blocked in phone settings':perm==='unsupported'?'Not available here':'Off';
  const famSub=MODE==='cloud'?`${MEMBERS.length||1} member${MEMBERS.length===1?'':'s'} · you're ${ROLE}`:'Only on this device';
  return `${MODE==='cloud'?`<button class="profile" data-act="prefsec" data-k="account"><div class="avatar lg">${esc((MYNAME||EMAIL||'?')[0].toUpperCase())}</div><span class="tt"><b>${esc(MYNAME)}</b><small>${esc(EMAIL)}</small></span>${CHEV}</button>`
    :`<div class="profile"><div class="avatar lg">₹</div><span class="tt"><b>${esc(s.name)}</b><small>Saved on this device</small></span></div>`}
  ${tgroup('Budget',[canAdmin()&&trow('prefsec','budget','budget','Budget setup',`${esc(s.name)} · month starts on the ${ordinal(s.startDay||1)}`),
    trow('go','family','users','Family & sharing',famSub),
    trow('prefsec','reminders','bell','Reminders',remSub)])}
  ${tgroup('Security',[trow('prefsec','lock','lock','App lock',hasPin?'On · 4-digit PIN':'Off'),
    trow('prefsec','install','download','Install the app',STANDALONE?'Installed':'Add to home screen')])}
  ${tgroup('Data',[canAdmin()?trow('prefsec','data','upload','Import, export & backup','Excel, CSV, PDF report, backup file'):trow('prefsec','data','backup','Back up','Save a copy of your data'),canWrite()&&acctList().length?trow('stmmatch','','bank','Match a bank statement','Add what you missed, skip what you logged'):'',canWrite()?trow('deldata','','shield','Delete data','Choose what, which period, which category'):'',trow('prefsec','trash','backup','Recently deleted',(n=>n?n+' item'+(n>1?'s':'')+' you can restore':'Restore anything deleted in the last 30 days')(Object.keys(trashAll()).length))])}
  ${tgroup('About',[trow('go','help','doc','Help & FAQ','Search answers to common questions'),trow('prefsec','about','shield','Privacy & terms','What we store and your choices'),IS_OWNER&&CLOUD&&!CFG.vapidPublicKey?trow('go','pushsetup','bell','Reminder setup','One-time, for the Owner'):''])}
  ${IS_OWNER?`<section class="tgroup"><div class="tcard"><button class="trow danger" data-act="prefsec" data-k="danger"><span class="ti">${ui('shield',20)}</span><span class="tt"><b>${MODE==='cloud'?'Delete family budget':'Delete all data'}</b><small>Can't be undone</small></span>${CHEV}</button></div></section>`:''}`;
}

/* ================= Family ================= */
const ROLE_ROWS=[['See budgets and entries',1,1,1,1],['Add expenses and income',1,1,1,0],['Edit their own entries',1,1,1,0],["Edit anyone's entries",1,1,0,0],['Mark bills paid',1,1,1,0],['Change budgets and due dates',1,1,0,0],['Manage accounts, loans, goals',1,1,0,0],['Invite and remove people',1,1,0,0],['Delete the family',1,0,0,0]];
function rolesSheet(){openSheet(`${sheetHead('What each role can do')}<div class="tablewrap" tabindex="0" role="region" aria-label="Month by month table"><table><thead><tr><th></th><th>Owner</th><th>Admin</th><th>Member</th><th>Viewer</th></tr></thead><tbody>${ROLE_ROWS.map(r=>`<tr><td style="white-space:normal;min-width:130px">${r[0]}</td>${r.slice(1).map(v=>`<td style="text-align:center">${v?'✓':'<span class="muted">–</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}
function activitySheet(){const logs=Object.values(D.log).sort((a,b)=>b.at-a.at).slice(0,50);openSheet(`${sheetHead('Activity')}${logs.map(l=>`<div class="row"><div class="grow"><div class="small"><b>${esc(who(l.user))}</b> ${esc(l.action)} ${esc(l.entity)}${l.detail?': '+esc(l.detail):''}</div><div class="s">${new Date(l.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</div></div></div>`).join('')||'<p class="small muted">No changes yet.</p>'}`)}
function inviteSheet(){
  openSheet(`${sheetHead('Invite by Gmail')}
    <div class="field"><label for="inv-email">Their Gmail address</label><input class="input" id="inv-email" type="email" inputmode="email" autocomplete="off" placeholder="name@gmail.com" autofocus></div>
    <div class="flabel" style="margin-bottom:6px">They can</div>
    <div class="seg" role="group" aria-label="Role">${['admin','member','viewer'].map(r=>`<button data-act="invrole" data-k="${r}" aria-pressed="${INVROLE===r}">${ROLEN[r]}</button>`).join('')}</div>
    <p class="small muted" id="inv-help" style="margin:8px 0 14px">${ROLEHELP[INVROLE]}</p>
    <button class="pillbtn block" data-act="invite">Send invite</button>`);
}
function familyCloudView(){
  const order={owner:0,admin:1,member:2,viewer:3};
  const ms=MEMBERS.slice().sort((a,b)=>order[a.role]-order[b.role]||(a.name||'').localeCompare(b.name||''));
  const av=m=>`<span class="avatar xl">${m.avatar?`<img src="${esc(m.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${m.avatar?'':esc((m.name||m.email||'?')[0].toUpperCase())}</span>`;
  return topbar('Family',{month:false,back:'more'})+`<div class="stack">
  <section class="wsum"><div class="eyebrow">${esc(S()?S().name:'Family budget')}</div><div class="bigc">${MEMBERS.length||1} <span class="muted" style="font-size:20px;font-weight:600">of 8 members</span></div><div class="small muted">You're the ${ROLE}</div></section>
  <div class="people">${ms.map(m=>`<button class="person" data-act="memmenu" data-id="${m.id}">${av(m)}<span class="pn">${esc((m.id===ME?'You':(m.name||m.email).split(' ')[0]))}</span><span class="pr">${ROLEN[m.role]}</span></button>`).join('')}
    ${canAdmin()&&MEMBERS.length<8?`<button class="person" data-act="invsheet"><span class="avatar xl add">+</span><span class="pn">Invite</span><span class="pr">by Gmail</span></button>`:''}</div>
  ${INVITES.length?tgroup('Waiting to join',INVITES.map(i=>`<div class="trow static"><span class="ti">${ui('users',20)}</span><span class="tt"><b>${esc(i.email)}</b><small>${ROLEN[i.role]} · expires ${new Date(i.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small></span><button class="btn sm" data-act="copyinv" data-email="${esc(i.email)}" data-role="${i.role}">Message</button><button class="x sm" data-act="revokeinv" data-id="${i.id}" aria-label="Revoke invite">×</button></div>`)):''}
  ${tgroup('',[trow('rolessheet','','shield','What each role can do','Owner, Admin, Member, Viewer'),canAdmin()&&trow('activitysheet','','list','Activity','Who changed what'),trow('prefsec','reminders','bell','Reminders','For everyone on their own phone')])}
  ${IS_OWNER?'<p class="small muted center" style="margin:0">To leave, first make an Admin the Owner: tap them above.</p>':'<button class="btn danger block" data-act="leave">Leave family</button>'}
  </div>`;
}
function familyView(){
  return topbar('Family',{month:false,back:'more'})+`<div class="stack">
  <section class="wsum"><div class="eyebrow">${esc(S().name)}</div><div class="bigc">Just you</div><div class="small muted">This budget is saved on this device</div></section>
  <p class="heroline center" style="margin:0 auto">Sharing with family by Gmail needs family sync (Supabase). To move to another phone, back up here and restore there.</p>
  ${tgroup('',[trow('prefsec','data','backup','Back up and restore','Move your budget to another phone'),trow('rolessheet','','shield','What each role can do','When family sync is on')])}
  </div>`;
}
function memberMenu(uid){
  const m=MEMBERS.find(x=>x.id===uid);if(!m)return;const self=uid===ME;
  const canManage=canAdmin()&&!self&&m.role!=='owner';
  openSheet(`${sheetHead(esc(self?'You':(m.name||m.email)))}<p class="small muted" style="margin-top:0">${esc(m.email)} · ${ROLEN[m.role]}</p>
    ${canManage?`<div class="flabel" style="margin-bottom:6px">Role</div><div class="seg" role="group" style="margin-bottom:8px">${['admin','member','viewer'].map(r=>`<button data-act="setrole" data-id="${uid}" data-k="${r}" aria-pressed="${m.role===r}">${ROLEN[r]}</button>`).join('')}</div><p class="small muted" style="margin:0 0 14px">${ROLEHELP[m.role]||''}</p>`:`<p class="small" style="margin:0 0 12px">${ROLEHELP[m.role]||'Can do everything, including deleting the family.'}</p>`}
    ${IS_OWNER&&!self?(m.role==='admin'?`<button class="btn block" data-act="makeowner" data-id="${uid}">Make Owner</button>`:'<p class="small muted">To make them the Owner, change their role to Admin first.</p>'):''}
    ${canManage?`<button class="btn danger block" style="margin-top:8px" data-act="removemem" data-id="${uid}">Remove from family</button>`:''}`);
}

/* ================= More ================= */
function moreView(){
  const rq=recentQ();
  const circle=([n,a,k,ic])=>`<button class="circ" data-act="${a}" data-k="${k}"><span class="circ-i">${ui(ic,26)}</span><span class="circ-l">${n}</span></button>`;
  return `<div class="msearchwrap"><div class="more-top"><label class="msearch">${ui('search',20)}<input id="m-q" type="search" placeholder='Search "rent" or "Swiggy"' data-msearch autocomplete="off" aria-label="Search entries, categories and settings"></label><a class="ibtn lg" href="#family" aria-label="Family">${ui('users',24)}</a></div>
    <div class="msuggest">${rq.length?`<div class="eyebrow">Recent</div><div class="hscroll" style="margin:8px 0 12px">${rq.map(q=>`<button class="chip qchip" data-act="mq" data-k="${esc(q)}">${esc(q)}</button>`).join('')}</div>`:''}<div class="eyebrow">Try</div><div class="hscroll" style="margin-top:8px">${['bills due this week','eating out','salary','rent'].map(q=>`<button class="chip outline" data-act="mq" data-k="${q}">${q}</button>`).join('')}</div></div></div>
  <div id="mresults"></div>
  <div id="mhome">
  <section class="sect nob"><div class="circles">${[FEATURES[0],FEATURES[1],FEATURES[2],FEATURES[3]].map(circle).join('')}</div></section>
  ${tgroup('Manage',[trow('go','family','users','Family & sharing',MODE==='cloud'?`${MEMBERS.length||1} member${MEMBERS.length===1?'':'s'}`:'Only on this device'),
    trow('goplan','recurring','repeat','Repeats',`${recList().length} every month`),
    trow('goplan','cards','card','Credit cards',Object.keys(D.cards).length?Object.keys(D.cards).length+' added':'Track statements and dues'),
    trow('prefsec','data','upload','Import & export','Excel, CSV, PDF, backup'),
    trow('go','prefs','gear','Settings','Reminders, app lock, budget setup'),
    trow('go','habits','chart','Your habits','Logging speed, days logged, bills on time'),
    trow('go','help','doc','Help & FAQ','Answers to common questions')])}
  <p class="small center muted" style="margin:6px 0 0"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>
  </div>`;
}
