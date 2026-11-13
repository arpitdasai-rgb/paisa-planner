/* Paisa Planner · screens: entries, month plan, bills, yearly report, older Wallet views, settings.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= HOME ================= */
let ATT_ALL=false;
function moneyBar(m,isCur){
  const spent=m.spent,plan=isCur||VM>curKey()?m.toPay:0,free=m.available+(isCur?m.incomeToCome:0)-spent-plan;
  const total=Math.max(1,spent+plan+Math.max(0,free));
  const seg=(v,cls)=>v>0?`<i class="${cls}" style="width:${v/total*100}%"></i>`:'';
  return `<div class="mbar" role="img" aria-label="Spent ${fmt(spent)}, planned ${fmt(plan)}, ${free<0?'short '+fmt(-free):'free '+fmt(free)}">${seg(spent,'b-spent')}${seg(plan,'b-plan')}${seg(free,'b-free')}</div>
  <div class="mlegend small"><span><i class="b-spent"></i>Spent <b class="num">${fmt(spent)}</b></span>${plan?`<span><i class="b-plan"></i>Planned <b class="num">${fmt(plan)}</b></span>`:''}<span>${free<0?`<i class="b-short"></i>Short <b class="num over">${fmt(-free)}</b>`:`<i class="b-free"></i>Free <b class="num">${fmt(free)}</b>`}</span></div>`;
}
function bvaChart(m){
  const rows=SECTIONS.map(s=>({k:s.k,n:s.n,b:m.sec[s.k].b,a:m.sec[s.k].a}));
  const max=Math.max(1,...rows.map(r=>Math.max(r.b,r.a)));
  return rows.map(r=>{const over=r.k!=='income'&&r.b>0&&r.a>r.b;return `<div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>${r.n}</span><span class="num">${over?`<span class="over">${fmt(r.a-r.b)} over</span> · `:''}${r.b?`${fmt(r.a)} <span class="muted">of ${fmt(r.b)}</span>`:`${fmt(r.a)} <span class="muted">spent</span>`}</span></div>
    <div class="pbar" style="margin-top:5px"><i style="width:${r.a/max*100}%;background:${over?'var(--bad)':r.k==='income'?'var(--good)':'var(--ink)'}"></i><span class="tick" style="left:calc(${r.b/max*100}% - 1px)"></span></div></div>`}).join('')+`<div class="legend"><span><span class="sw" style="background:var(--ink)"></span>Actual</span><span><span class="sw" style="width:2px;background:var(--muted)"></span>Plan</span></div>`;
}
function donut(m){
  const parts=OUT.map(k=>({k,n:SECN[k],v:m.sec[k].a})).filter(p=>p.v>0);
  const tot=parts.reduce((t,p)=>t+p.v,0);
  if(!tot)return `<p class="small muted" style="margin:0 0 8px">Nothing spent in ${mLong(VM)} yet.</p>`;
  const r=44,c=2*Math.PI*r;let off=0;
  const segs=parts.map(p=>{const len=p.v/tot*c;const s=`<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--c-${p.k})" stroke-width="16" stroke-dasharray="${Math.max(0,len-2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;off+=len;return s}).join('');
  return `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 120 120" width="112" height="112" role="img" aria-label="Spend split">${segs}<text x="60" y="57" text-anchor="middle" font-size="10" fill="var(--muted)">Total</text><text x="60" y="72" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="700" font-size="14" fill="var(--ink)">${fmtShort(tot)}</text></svg>
  <div style="flex:1;min-width:170px">${parts.map(p=>`<div class="kv small"><span><span class="sw" style="display:inline-block;background:var(--c-${p.k});margin-right:7px"></span>${p.n}</span><span class="num">${fmt(p.v)} <span class="muted">${Math.round(p.v/tot*100)}%</span></span></div>`).join('')}</div></div>`;
}
function expBars(m){
  const cs=m.cats.filter(c=>c.section==='expenses'&&(c.actual>0||c.budget>0)).sort((a,b)=>b.actual-a.actual).slice(0,8);
  if(!cs.length)return `<p class="small muted">Add Everyday spending categories on the Month tab.</p>`;
  const max=Math.max(1,...cs.map(c=>Math.max(c.actual,c.budget)));
  return cs.map(c=>{const over=c.budget>0&&c.actual>c.budget;return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:13px;gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span><span class="num">${over?`<span class="over">${fmt(c.actual-c.budget)} over</span> · `:''}${fmt(c.actual)}</span></div>
  <div class="pbar"><i style="width:${c.actual/max*100}%;background:${over?'var(--bad)':'var(--accent)'}"></i><span class="tick" style="left:calc(${c.budget/max*100}% - 1px)"></span></div></div>`}).join('')+`<div class="legend"><span><span class="sw" style="background:var(--accent)"></span>Spent</span><span><span class="sw" style="width:2px;background:var(--muted)"></span>Budget</span></div>`;
}

/* ================= TRANSACTIONS ================= */
function txView(){
  const cats=catsAll();
  return topbar('Entries')+`<div class="stack">
  <div class="filters">
    <input class="input" style="grid-column:1/-1" id="f-q" type="search" placeholder="Search note, category or amount" value="${esc(F.q)}" data-filter="q" aria-label="Search entries">
    <select class="input" id="f-cat" data-filter="cat" aria-label="Category"><option value="">All categories</option>${SECTIONS.map(s=>`<optgroup label="${s.n}">${cats.filter(c=>c.section===s.k).map(c=>`<option value="${c.id}" ${F.cat===c.id?'selected':''}>${esc(c.name)}${c.archived?' (archived)':''}</option>`).join('')}</optgroup>`).join('')}</select>
    <select class="input" id="f-mode" data-filter="mode" aria-label="Payment mode"><option value="">All modes</option>${MODES.map(x=>`<option ${F.mode===x?'selected':''}>${x}</option>`).join('')}</select>
    ${acctList().length?`<select class="input" style="grid-column:1/-1" id="f-acct" data-filter="acct" aria-label="Account"><option value="">All accounts</option>${acctList().map(a=>`<option value="${a.id}" ${F.acct===a.id?'selected':''}>${esc(acctLabel(a))}</option>`).join('')}</select>`:''}
  </div>
  <div id="txlist"></div></div>${selBar()}`;
}
function renderTxList(){
  const el=$('#txlist');if(!el)return;
  const m=month(VM);const q=F.q.trim().toLowerCase();
  const isInc=t=>!isXfer(t)&&D.cats[t.cat]&&D.cats[t.cat].section==='income';
  let list=m.list.filter(t=>(!F.cat||t.cat===F.cat)&&(!F.mode||t.mode===F.mode)&&(!F.acct||t.acct===F.acct||t.from===F.acct||t.to===F.acct)&&(!hideInc()||!isInc(t)));
  if(q){const qa=parseAmt(q);list=list.filter(t=>{const c=D.cats[t.cat];return (t.note||'').toLowerCase().includes(q)||(c&&c.name.toLowerCase().includes(q))||(isXfer(t)&&(acctName(t.from)+' '+acctName(t.to)).toLowerCase().includes(q))||(!isNaN(qa)&&qa>0&&Math.abs(t.amt-qa)<100)})}
  if(!list.length){el.innerHTML=`<p class="empty-state">${m.list.length?'No entries match these filters.':`Nothing logged in ${mLong(VM)} yet.${canWrite()?'<br>Tap + to add your first entry.':''}`}</p>`;return}
  const tot=list.reduce((s,x)=>s+(isInc(x)||isXfer(x)?0:x.amt),0);
  const days={};list.forEach(t=>{const d=days[t.date]||(days[t.date]={out:0,inc:0,items:[]});d.items.push(t);if(isXfer(t))return;if(isInc(t))d.inc+=t.amt;else d.out+=t.amt});
  const touch=matchMedia('(pointer:coarse)').matches;
  let h=`<div class="small muted" style="padding:0 2px 4px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span>${list.length} entr${list.length===1?'y':'ies'} · ${fmt(tot)} out</span>${canWrite()&&!SEL?'<button class="link small" data-act="selstart">Select</button>':''}</div>`;
  for(const ds of Object.keys(days)){
    const d=days[ds];
    h+=`<div class="dayh"><span>${dLabel(ds)}</span><span class="num">${d.out?fmt(d.out)+' out':''}${d.out&&d.inc?' · ':''}${d.inc?'+'+fmt(d.inc)+' in':''}</span></div>`;
    d.items.forEach(t=>{const can=canEditTx(t);let ic,title,sub,amtH;
      if(isXfer(t)){ic=icon({name:'bank',section:'debt'});title=t.note||'Self transfer';sub=`${esc(acctName(t.from))} → ${esc(acctName(t.to))} · ${esc(who(t.by))}`;amtH=`<div class="amt num muted">${fmt(t.amt)}</div>`}
      else{const c=D.cats[t.cat];const inc=isInc(t);ic=icon(c||{section:'expenses'});title=t.note||(c?c.name:'Unknown category');
        sub=`${t.note&&c?esc(c.name)+' · ':''}${esc(t.mode||'')}${t.acct?' · '+esc(acctName(t.acct)):''}${t.split?' · split':''}${t.rec?' · repeat':''} · ${esc(who(t.by))}${t.src==='import'?' · imported':''}`;
        amtH=`<div class="amt num" style="${inc?'color:var(--good)':''}">${inc?'+':''}${fmt(t.amt)}</div>`}
      h+=`<div class="swipe ${SEL&&SEL.has(t.id)?'picked':''} ${SEL?'selecting':''}" data-id="${t.id}" data-can="${can?1:0}"><div class="swipe-bg"><span class="sw-edit">Edit</span><span class="sw-del">${can?'Delete':''}</span></div>
      <button class="rowbtn swipe-fg" data-act="edittx" data-id="${t.id}"><div class="row">${ic}<div class="grow"><div class="t">${esc(title)}</div><div class="s">${sub}</div></div>${amtH}${can?CHEV:''}</div></button></div>`});
  }
  if(touch&&canWrite()&&!lsGet('paisa-hint-swipe')){h+=`<p class="small muted" style="text-align:center;margin:14px 0 0">Tip: swipe an entry left to delete it, or right to edit it.</p>`}
  el.innerHTML=h;
}
/* swipe to edit / delete */
let SW=null,SWIPED=false;
document.addEventListener('pointerdown',e=>{const fg=e.target.closest('.swipe-fg');if(!fg||e.pointerType==='mouse'||SEL)return;SW={fg,x:e.clientX,y:e.clientY,dx:0,lock:null}});
document.addEventListener('pointermove',e=>{if(!SW)return;const dx=e.clientX-SW.x,dy=e.clientY-SW.y;
  if(SW.lock===null){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;SW.lock=Math.abs(dx)>Math.abs(dy)?'x':'y'}
  if(SW.lock!=='x'){SW=null;return}
  const can=SW.fg.parentElement.dataset.can==='1';SW.dx=can?dx:Math.max(0,Math.min(dx,0));
  SW.fg.style.transition='none';SW.fg.style.transform=`translateX(${SW.dx}px)`;SW.fg.parentElement.classList.toggle('to-del',SW.dx<0);});
const swipeEnd=()=>{if(!SW)return;const{fg,dx}=SW;SW=null;const id=fg.parentElement.dataset.id;fg.style.transition='';
  if(Math.abs(dx)>8){SWIPED=true;lsSet('paisa-hint-swipe','1')}
  if(dx<-90&&fg.parentElement.dataset.can==='1'){fg.style.transform='translateX(-100%)';setTimeout(()=>deleteTx(id),160)}
  else if(dx>90){fg.style.transform='';openEditTx(id)}
  else fg.style.transform='';
  setTimeout(()=>{SWIPED=false},350);};
document.addEventListener('pointerup',swipeEnd);document.addEventListener('pointercancel',swipeEnd);
function deleteTx(id){
  const old=D.tx[id];if(!old)return;const c=D.cats[old.cat];
  delCommit({dels:[{col:'tx',id}],label:`${fmt(old.amt)} · ${isXfer(old)?acctName(old.from)+' → '+acctName(old.to):(old.note||(c?c.name:'entry'))}`});
}
function openEditTx(id){
  const t=D.tx[id];if(!t)return;
  if(!canEditTx(t)){openSheet(`${sheetHead('Entry')}<div class="kv"><span>${esc((D.cats[t.cat]||{}).name||'')}</span><b class="num">${fmt(t.amt)}</b></div><div class="kv"><span>Date</span><span>${dLabel(t.date)}</span></div><div class="kv"><span>Paid by</span><span>${esc(t.mode)}</span></div>${t.note?`<div class="kv"><span>Note</span><span>${esc(t.note)}</span></div>`:''}<div class="kv"><span>Added by</span><span>${esc(who(t.by))}</span></div><p class="small muted">Only the person who added this, an Admin or the Owner can change it.</p>`);return}
  QA={...t,id,amt:String(t.amt/100),all:false,more:false,type:isXfer(t)?'xfer':D.cats[t.cat]&&D.cats[t.cat].section==='income'?'in':'out'};renderQuick();
}

/* ================= BUDGET ================= */
let BEDIT=false,BDRAFT={},BSCOPE='future';
function budgetRow(c,k){
  const inc=c.section==='income';const over=!inc&&c.budget>0&&c.left<0;
  const pct=c.budget>0?clamp(c.actual/c.budget,0,1):(c.actual>0?1:0);
  const col=over?'var(--bad)':inc?'var(--good)':(c.section==='expenses'&&pct>.85)?'var(--warn)':'var(--ink)';
  let right;
  if(!c.budget&&!c.actual)right=`<span class="muted">No budget set</span>`;
  else if(inc)right=`${fmt(c.actual)} <span class="muted">of ${fmt(c.budget)}</span>`;
  else if(!c.budget)right=`${fmt(c.actual)} <span class="muted">spent · no limit</span>`;
  else if(over)right=`<span class="over">${fmt(-c.left)} over</span> <span class="muted">of ${fmt(c.budget)}</span>`;
  else right=`${fmt(c.left)} left <span class="muted">of ${fmt(c.budget)}</span>`;
  const tag=canAdmin()?'button':'div';
  return `<${tag} class="brow" ${canAdmin()?`data-act="editcat" data-id="${c.id}"`:''}><div class="brow-top">${icon(c)}<span class="n">${esc(c.name)}${c.archived?' <span class="small muted">archived</span>':''}${c.dueDay?` <span class="small muted">· due ${c.dueDay}</span>`:''}</span><span class="v num small">${right}</span>${canAdmin()?CHEV:''}</div><div class="pbar slim"><i style="width:${pct*100}%;background:${col}"></i></div></${tag}>`;
}
function budgetView(){
  const m=month(VM);
  if(BEDIT)return budgetEditView(m);
  const ov=D.months[VM]&&D.months[VM].open!=null;
  const P=planParts(m);const bl=billsFor(VM),bPaid=bl.filter(b=>b.st==='paid'||b.st==='skip').length,bDue=bl.filter(b=>b.st==='overdue').length;
  const bar=(a,b,tone='')=>`<div class="pbar"><i class="${tone}" style="width:${b>0?Math.min(100,Math.round(a/b*100)):0}%"></i></div>`;
  return topbar('Month plan')+`<div class="stack">
  ${planBannerHTML(VM)}
  <section class="plan3">
    ${hideInc()?'':`<div class="p3"><div class="p3h"><span>Money in</span><b class="num">${fmt(P.inAvail)}</b></div><div class="p3s">${fmt(m.open)} at the start${ov?' (set)':''} + ${fmt(m.income)} received${m.incomeToCome?` · ${fmt(m.incomeToCome)} to come`:''}</div></div>`}
    <div class="p3"><div class="p3h"><span>Commitments</span><b class="num">${fmt(P.commit)}</b></div>${bar(P.commitPaid,P.commit)}<div class="p3s">Bills and EMIs · ${fmt(P.commitPaid)} paid, ${fmt(Math.max(0,P.commit-P.commitPaid))} to go</div></div>
    <div class="p3"><div class="p3h"><span>Savings</span><b class="num">${fmt(P.save)}</b></div>${bar(P.saveDone,P.save,'good')}<div class="p3s">${fmt(P.saveDone)} put away${P.save>P.saveDone?`, ${fmt(P.save-P.saveDone)} to go`:''}</div></div>
    <div class="p3 free"><div class="p3h"><span>Free to spend</span><b class="num ${P.free<0?'over':''}">${fmt(P.free)}</b></div>${bar(P.everyday,P.free>0?P.free:1,P.everyday>P.free?'bad':'')}<div class="p3s">${fmt(P.everyday)} spent on everyday things · <b class="${P.freeLeft<0?'over':''}">${fmt(P.freeLeft)} left</b></div></div>
    <div class="btns" style="margin-top:4px">${canAdmin()?'<button class="btn primary sm" data-act="bedit">Edit budgets</button><button class="btn sm" data-act="editopen">Starting money</button>':''}<button class="btn sm" data-act="breakdown">How it adds up</button></div>
  </section>
  ${bl.length?`<a class="trow billsrow" href="#bills"><span class="ti">${ui('receipt',20)}</span><span class="tt"><b>Bills & EMIs</b><small>${bPaid} of ${bl.length} done${bDue?` · <span class="over">${bDue} overdue</span>`:''}</small></span>${CHEV}</a>`:''}
  ${[['income','','Money in'],['bills','Commitments','Bills'],['debt','','EMIs & loans'],['savings','','Savings'],['expenses','','Everyday spending']].filter(([k])=>!(hideInc()&&k==='income')).map(([k,grp,label])=>{const s={...SECTIONS.find(x=>x.k===k),n:label};const cs=m.cats.filter(c=>c.section===s.k);const st=m.sec[s.k];const over=s.k!=='income'&&st.b>0&&st.a>st.b;
    return `${grp?`<div class="eyebrow grp2">${grp}</div>`:''}<section class="sect"><div class="sect-head"><h2>${s.n}</h2><span class="small num">${over?`<span class="over">${fmt(st.a-st.b)} over</span> · `:''}${st.b?`${fmt(st.a)} <span class="muted">of ${fmt(st.b)}</span>`:`${fmt(st.a)} <span class="muted">${s.k==='income'?'received':'spent'}</span>`}</span></div>
    ${cs.map(c=>budgetRow(c,VM)).join('')||`<p class="small muted" style="margin:4px 0">No categories yet.</p>`}
    ${canAdmin()?`<button class="link small" data-act="addcat" data-sec="${s.k}" style="padding:8px 0 4px">+ Add ${s.k==='income'?'an income source':s.k==='debt'?'a loan or EMI':'a category'}</button>`:''}
    </section>`}).join('')}
  ${canAdmin()?`<button class="link small" data-act="clearmonth" style="padding:0 2px">Clear data for ${mLong(VM)}…</button>`:''}
  ${canAdmin()?`<p class="small muted" style="margin:0 2px">Everyday categories don't need limits: free to spend is what's left after commitments and savings. Tap a category to rename it, set a due day, a limit, move or archive it.</p>`:''}
  </div>`;
}
function budgetEditView(m){
  return topbar('Edit budgets · '+mLabel(VM),{month:false})+`<div class="stack">
  <section class="bedit-bar">
    <div class="flabel" style="margin-bottom:6px">Apply changes to</div>
    <div class="seg" role="group" aria-label="Apply changes to"><button data-act="bscope" data-k="month" aria-pressed="${BSCOPE==='month'}">${mLabel(VM)} only</button><button data-act="bscope" data-k="future" aria-pressed="${BSCOPE==='future'}">${mLabel(VM)} and after</button></div>
    <div id="bsum" class="small" style="margin-top:10px">${bsumHTML(m)}</div>
    <div class="btns" style="margin-top:10px"><button class="btn primary" data-act="bsave">Save budgets</button><button class="btn" data-act="bcancel">Cancel</button></div>
  </section>
  ${SECTIONS.map(s=>{const cs=m.cats.filter(c=>c.section===s.k&&!c.archived);if(!cs.length)return'';
    return `<section class="sect"><h2 style="margin-bottom:6px">${s.n}</h2>${cs.map(c=>`<label class="erow">${icon(c)}<span class="n">${esc(c.name)}<span class="small muted">${c.actual?' · '+fmt(c.actual)+(s.k==='income'?' received':' spent'):''}</span></span><span class="rs">₹<input class="input num" inputmode="decimal" data-bedit="${c.id}" value="${esc(BDRAFT[c.id]??rupees(c.budget))}" aria-label="${esc(c.name)} budget"></span></label>`).join('')}</section>`}).join('')}
  </div>`;
}
function draftBudget(c){const v=BDRAFT[c.id];if(v==null)return c.budget;const p=parseAmt(v);return isNaN(p)?0:p}
function bsumHTML(m){
  const inc=m.cats.filter(c=>c.section==='income'&&!c.archived).reduce((t,c)=>t+draftBudget(c),0);
  const out=m.cats.filter(c=>OUT.includes(c.section)&&!c.archived).reduce((t,c)=>t+draftBudget(c),0);
  const diff=m.open+inc-out;
  return `Income <b class="num">${fmt(inc)}</b> · Planned out <b class="num">${fmt(out)}</b><br>${diff>=0?`<span style="color:var(--good)">Leaves <b class="num">${fmt(diff)}</b> unplanned, including the opening balance.</span>`:`<span class="over">Plans <b class="num">${fmt(-diff)}</b> more than you'll have.</span>`}`;
}
function histWith(c,old,amt,k){
  let h=(c.hist||[]).filter(x=>x.from<k);
  if(!h.length){const prev=(c.hist||[]).slice().sort((a,b)=>a.from.localeCompare(b.from));if(prev.length&&prev[0].from<k)h.push({from:prev[0].from,amt:old})}
  h.push({from:k,amt});return h;
}
async function saveBudgets(){
  const mdoc=JSON.parse(JSON.stringify(D.months[VM]||{}));let mChanged=false,n=0;const writes=[];
  for(const id of Object.keys(BDRAFT)){
    const amt=parseAmt(BDRAFT[id]);if(isNaN(amt)||!D.cats[id])continue;
    const c={...D.cats[id]};const old=budgetOf({...c,id},VM);
    if(amt===old&&!(BSCOPE==='future'&&mdoc.b&&mdoc.b[id]!=null))continue;
    n++;
    if(BSCOPE==='month')writes.push(store.patch('months',VM,['b',id],amt));
    else{c.hist=histWith(c,old,amt,VM);writes.push(store.set('cats',id,c));if(mdoc.b&&mdoc.b[id]!=null)writes.push(store.patch('months',VM,['b',id],null))}
  }
  BEDIT=false;BDRAFT={};render();
  if(!n){toast('No budgets changed.');return}
  await Promise.allSettled(writes);
  log('changed','budgets',`${n} categor${n===1?'y':'ies'} (${BSCOPE==='month'?mLabel(VM)+' only':'from '+mLabel(VM)})`);
  toast(`Updated ${n} budget${n===1?'':'s'}.`);
}

/* ================= BILLS ================= */
function billsView(){
  const bl=billsFor(VM),t=todayISO();
  const groups=[['Overdue',[]],['This week',[]],['Later this month',[]],['Done',[]]];
  bl.forEach(b=>{if(b.st==='paid'||b.st==='skip')groups[3][1].push(b);else if(b.st==='overdue')groups[0][1].push(b);else if(daysBetween(t,b.due)<7)groups[1][1].push(b);else groups[2][1].push(b)});
  const paid=bl.filter(b=>b.st==='paid').length;
  const toGo=bl.filter(b=>b.st!=='paid'&&b.st!=='skip').reduce((s,b)=>s+b.budget,0);
  const row=b=>{
    let sub;
    if(b.st==='paid')sub=`Paid ${fmt(b.actual)}`;else if(b.st==='skip')sub='Skipped this month';
    else if(b.st==='overdue')sub=`Was due ${relDay(b.due)}`;else{const r=relDay(b.due);sub=`Goes out ${r}${r.startsWith('on ')?'':' · '+dShort(b.due)}`}
    const acts=!canWrite()||b.st==='paid'?'':b.st==='skip'?`<button class="btn sm" data-act="unskip" data-id="${b.id}">Undo</button>`:`<button class="btn sm ${b.st==='overdue'?'primary':''}" data-act="paybill" data-id="${b.id}">Paid</button><button class="btn sm" data-act="skip" data-id="${b.id}">Skip</button>`;
    return `<div class="row ${b.st==='paid'||b.st==='skip'?'done':''}">${icon(b)}<div class="grow"><div class="t">${esc(b.name)}</div><div class="s ${b.st==='overdue'?'over':''}">${sub}</div>${acts?`<div class="btns bacts">${acts}</div>`:''}</div><div class="amt num" style="align-self:flex-start;margin-top:2px">${fmt(b.st==='paid'?b.actual:b.budget)}</div></div>`;
  };
  return topbar('Bills & EMIs',{back:'home'})+`<div class="stack">
  <p class="heroline" style="margin:0">${bl.length?`${paid} of ${bl.length} paid. <b class="num">${fmt(toGo)}</b> still to go out in ${mLong(VM)}.`:'Give Bills or Debt categories a due day on the Budget tab to track them here.'}</p>
  ${groups.slice(0,3).filter(g=>g[1].length).map(([n,items])=>`<section class="sect"><h2 style="margin-bottom:4px;${n==='Overdue'?'color:var(--bad)!important':''}">${n}</h2>${items.map(row).join('')}</section>`).join('')}
  ${groups[3][1].length?`<details class="more"><summary>Done · ${groups[3][1].length} ${CHEV}</summary>${groups[3][1].map(row).join('')}</details>`:''}
  <button class="link small" data-act="prefsec" data-k="reminders">Reminder settings ›</button>
  </div>`;
}

/* ================= REPORTS ================= */
function reportsView(){
  if(hideInc())return topbar('Yearly report',{month:false,back:'home'})+'<p class="empty-state">The family Owner has hidden income and yearly reports for your role.</p>';
  if(!reportYear)reportYear=Number(curKey().slice(0,4));
  const keys=Array.from({length:12},(_,i)=>ym(reportYear,i+1));
  const ti=txIndex();const s=S();
  const rows=keys.filter(k=>k>=s.startMonth&&k<=curKey()||ti[k]).map(k=>{const m=month(k);return{k,m,has:!!ti[k],inc:m.sec.income.a,sav:m.sec.savings.a,be:m.sec.bills.a+m.sec.expenses.a,emi:m.sec.debt.a,close:m.close}});
  const withData=rows.filter(r=>r.has);
  const sum=f=>withData.reduce((t,r)=>t+f(r),0);
  const inc=sum(r=>r.inc),sav=sum(r=>r.sav);
  const plan=sum(r=>r.m.planned),used=sum(r=>r.m.spent);
  const max=Math.max(1,...rows.map(r=>Math.max(r.inc,r.sav+r.be+r.emi)));
  const W=340,H=150,bw=W/12;
  const chart=`<svg class="chart" viewBox="0 0 ${W} ${H+20}" width="100%" role="img" aria-label="Income and outflow by month">
    ${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-f*H*0.92}" y2="${H-f*H*0.92}" stroke="var(--line)" stroke-width="1"/>`).join('')}
    ${keys.map((k,i)=>{const r=rows.find(x=>x.k===k);const x=i*bw;let out='';
      if(r){const hi=r.inc/max*H*.92;const ho=(r.sav+r.be+r.emi)/max*H*.92;
        out=`<rect x="${x+bw*.14}" y="${H-hi}" width="${bw*.32}" height="${hi}" rx="2" fill="var(--c-income)"/><rect x="${x+bw*.5}" y="${H-ho}" width="${bw*.32}" height="${ho}" rx="2" fill="var(--c-debt)" opacity=".85"/>`}
      return out+`<text x="${x+bw/2}" y="${H+14}" text-anchor="middle">${MON[i][0]}</text>`}).join('')}
    <text x="2" y="${H-H*.92-3}">${fmtShort(max)}</text></svg>`;
  return topbar('Yearly report',{month:false,back:'home'})+`<div class="stack">
  <div class="mswitch" style="align-self:flex-start"><button data-act="yprev" aria-label="Previous year">‹</button><span class="num">${reportYear}</span><button data-act="ynext" aria-label="Next year">›</button></div>
  <section class="card" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:left">
    <div><div class="label">Income</div><div class="num" style="font-weight:700;font-size:17px">${fmtShort(inc)}</div></div>
    <div><div class="label">Savings rate</div><div class="num" style="font-weight:700;font-size:17px">${inc?Math.round(sav/inc*100)+'%':'–'}</div></div>
    <div><div class="label">Plan used</div><div class="num ${used>plan&&plan?'over':''}" style="font-weight:700;font-size:17px">${plan?Math.round(used/plan*100)+'%':'–'}</div></div>
  </section>
  <section class="card">${chart}<div class="legend"><span><span class="sw" style="background:var(--c-income)"></span>Income</span><span><span class="sw" style="background:var(--c-debt)"></span>Total outflow</span></div></section>
  <section class="card" style="padding-inline:12px"><div class="tablewrap"><table>
    <thead><tr><th>Month</th><th>Income</th><th>Savings</th><th>Bills+Exp</th><th>EMIs</th><th>Closing</th><th>Save %</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${MON[Number(r.k.slice(5))-1]}${r.has?'':' <span class="muted">·</span>'}</td><td>${fmtShort(r.inc)}</td><td>${fmtShort(r.sav)}</td><td>${fmtShort(r.be)}</td><td>${fmtShort(r.emi)}</td><td class="${r.close<0?'over':''}">${fmtShort(r.close)}</td><td>${r.inc?Math.round(r.sav/r.inc*100)+'%':'–'}</td></tr>`).join('')||`<tr><td colspan="7" class="muted" style="text-align:left">No months in ${reportYear}.</td></tr>`}</tbody>
    ${withData.length?`<tfoot><tr><td>Total</td><td>${fmtShort(inc)}</td><td>${fmtShort(sav)}</td><td>${fmtShort(sum(r=>r.be))}</td><td>${fmtShort(sum(r=>r.emi))}</td><td></td><td>${inc?Math.round(sav/inc*100)+'%':'–'}</td></tr></tfoot>`:''}
  </table></div><p class="small muted" style="margin:8px 0 0">Totals and % of plan count only months with entries (marked without a dot).</p></section>
  ${canAdmin()?`<section class="card"><h2 style="margin-bottom:6px">Export</h2><p class="small muted" style="margin:0 0 10px">Excel, CSV, a PDF report or a full backup. Pick the period and what to include.</p><button class="btn primary" data-act="exp-year">Export ${reportYear}…</button></section>`:''}
  </div>`;
}

/* ================= PLAN ================= */
function planView(){
  if(planTab==='accounts')return walletView();
  const tabs=[['accounts','Accounts'],['loans','Loans'],['cards','Cards'],['goals','Goals'],['recurring','Repeats'],...(hideInc()?[]:[['networth','Net worth']])];
  let body='';
  if(planTab==='networth'&&hideInc())planTab='accounts';
  if(planTab==='accounts')body=accountsBody();
  else if(planTab==='recurring')body=recBody();
  else if(planTab==='networth')body=nwBody();
  else if(planTab==='loans'){
    const ls=Object.entries(D.loans);
    const totOut=ls.reduce((t,[,l])=>t+loanOutstanding(l),0);
    body=`${ls.length?`<div class="small muted" style="padding:0 4px">Total outstanding <b class="num" style="color:var(--ink)">${fmt(totOut)}</b></div>`:''}
    ${ls.map(([id,l])=>{const P=loanOutstanding(l);const c=loanCalc(P,l.rate||0,l.emi||0);const paidPct=l.original?clamp(1-P/l.original,0,1):0;
      return `<section class="card"><div class="card-head"><div><h2>${esc(l.name)}</h2><div class="small muted">${esc(l.lender||'')}${l.rate?' · '+l.rate+'% a year':''}</div></div>${canAdmin()?`<button class="btn sm" data-act="editloan" data-id="${id}">Edit</button>`:''}</div>
      <div class="bar"><i style="width:${paidPct*100}%;background:var(--good)"></i></div><div class="small muted" style="margin:4px 0 8px">${Math.round(paidPct*100)}% repaid</div>
      <div class="kv"><span>Outstanding (estimate)</span><b class="num">${fmt(P)}</b></div>
      <div class="kv"><span>EMI</span><b class="num">${fmt(l.emi)}</b></div>
      ${c.err?`<div class="alert a-bad" style="margin-top:8px"><span class="dot"></span><span>${c.err}</span></div>`:`
      <div class="kv"><span>Months left</span><b class="num">${c.n} (${Math.floor(c.n/12)}y ${c.n%12}m)</b></div>
      <div class="kv"><span>Payoff</span><b>${mLabel(addM(curKey(),c.n))}</b></div>
      <div class="kv"><span>Interest still to pay</span><b class="num">${fmt(c.interest)}</b></div>
      <details style="margin-top:8px"><summary class="link" style="cursor:pointer">Prepay what-if</summary>
        <div class="field" style="margin-top:8px"><label for="pp-${id}">Lump sum (₹)</label><input class="input num" id="pp-${id}" inputmode="decimal" data-prepay="${id}" placeholder="e.g. 200000"></div><div class="small" id="ppo-${id}"></div></details>`}
      ${l.cat?`<div class="small muted" style="margin-top:6px">Linked to ${esc((D.cats[l.cat]||{}).name||'EMI category')}: each EMI you mark paid lowers the estimate.</div>`:''}
      </section>`}).join('')||`<div class="card empty-state">Add your home, personal or family loans to see months left, payoff date and interest still to pay.</div>`}
    ${canAdmin()?`<button class="btn block" data-act="editloan">+ Add loan</button>`:''}`;
  }else if(planTab==='cards'){
    const cs=Object.entries(D.cards);
    body=cs.map(([id,cd])=>{const st=(cd.stmts||{})[VM];const s=cardStatus(st);const used=st&&cd.limit?st.amt/cd.limit:0;
      const spend=(month(VM).list||[]).filter(t=>t.mode==='Card'&&t.card===id).reduce((a,t)=>a+t.amt,0);
      return `<section class="card"><div class="card-head"><div><h2>${esc(cd.name)}</h2><div class="small muted">${esc(cd.bank||'')} · statement day ${cd.stmtDay||'–'} · due day ${cd.dueDay||'–'}</div></div>${canAdmin()?`<button class="btn sm" data-act="editcard" data-id="${id}">Edit</button>`:''}</div>
      <div class="kv"><span>Limit</span><b class="num">${fmt(cd.limit)}</b></div>
      <div class="kv"><span>${mLabel(VM)} statement</span><b class="num">${st?fmt(st.amt):'Not added'}</b></div>
      ${st?`<div class="kv"><span>Paid</span><b class="num">${fmt(st.paid||0)} <span class="pill ${s==='full'?'p-paid':s==='part'?'p-overdue':'p-due'}">${s==='full'?'Paid in full':s==='part'?'Part paid':'Not paid'}</span></b></div>
      <div class="kv"><span>Limit used</span><b class="num ${used>.3?'over':''}">${Math.round(used*100)}%${used>.3?' · above 30%':''}</b></div>`:''}
      ${s==='part'?`<div class="alert a-bad" style="margin-top:8px"><span class="dot"></span><span>Interest of 36–42% a year applies to the unpaid ${fmt(st.amt-st.paid)}. Pay it in full if you can.</span></div>`:''}
      <div class="kv"><span>Card spend logged this month</span><b class="num">${fmt(spend)}</b></div>
      ${canAdmin()?`<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="stmt" data-id="${id}">${st?'Update':'Add'} statement</button></div>`:''}
      </section>`}).join('')||`<div class="card empty-state">Add a credit card to track statements, part payments and limit used.</div>`;
    if(canAdmin())body+=`<button class="btn block" data-act="editcard">+ Add credit card</button>`;
  }else{
    body=goalsBody();
  }
  const titles={loans:'Loans',cards:'Credit cards',goals:'Goals',recurring:'Repeats',networth:'Net worth'};
  return `<header class="topbar"><button class="x" data-act="goplan" data-k="accounts" aria-label="Back to Money">‹</button><h1>${titles[planTab]||'Money'}</h1>${planTab==='cards'?monthSwitch():''}</header>${stale?'<div class="banner" style="margin-bottom:12px">Can\'t reach your data right now. Figures may be out of date.</div>':''}<div class="stack">${body}</div>`;
}

/* ================= FAMILY ================= */

/* ================= PREFS ================= */
function prefsView(){
  const s=S();const hasPin=!!lsGet('paisa-pin');
  const SEC={account:`  ${MODE==='cloud'?`<section class="card"><h2 style="margin-bottom:10px">Account</h2><div class="row" style="padding-top:0"><div class="avatar">${esc((MYNAME||EMAIL||'?')[0].toUpperCase())}</div><div class="grow"><div class="t">${esc(MYNAME)}</div><div class="s">${esc(EMAIL)} · signed in with Google</div></div></div><div class="btns"><button class="btn" data-act="signout">Sign out</button><button class="btn danger" data-act="delaccount">Delete my account</button></div></section>`:''}
`,budget:`  ${canAdmin()?`<section class="card"><h2 style="margin-bottom:10px">Budget</h2>
    <div class="field"><label for="p-name">Name</label><input class="input" id="p-name" value="${esc(s.name)}"></div>
    <div class="two"><div class="field"><label for="p-sd">Month starts on day</label><select class="input" id="p-sd">${Array.from({length:28},(_,i)=>`<option ${i+1===s.startDay?'selected':''}>${i+1}</option>`).join('')}</select></div>
    <div class="field"><label for="p-sm">First month</label><input class="input" id="p-sm" type="month" value="${s.startMonth}"></div></div>
    <div class="field"><label for="p-op">Money in your account when you started (₹)</label><input class="input num" id="p-op" inputmode="decimal" value="${rupees(s.opening)}"></div>
    ${MODE==='cloud'?`<label class="check" style="border:0"><input type="checkbox" id="p-hideinc" ${s.hideIncome?'checked':''}><span class="small">Hide income, net worth and yearly reports from Members and Viewers</span></label>`:''}
    <button class="btn primary" data-act="saveprefs">Save</button></section>`:''}
`,install:`  <section class="card"><h2 style="margin-bottom:6px">Install the app</h2>
    ${STANDALONE?'<p class="small muted" style="margin:0">Installed. Paisa Planner opens from your home screen and works offline.</p>':INSTALL_EVT?'<p class="small muted" style="margin:0 0 10px">Add Paisa Planner to your home screen. It opens full screen and works offline.</p><button class="btn primary" data-act="install">Install app</button>':IS_IOS?'<p class="small muted" style="margin:0">On iPhone: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>.</p>':'<p class="small muted" style="margin:0">Use your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>'}
  </section>
`,reminders:`  ${remindersCardHTML()}
`,lock:`  <section class="card"><h2 style="margin-bottom:6px">App lock</h2><p class="small muted" style="margin:0 0 10px">A 4-digit PIN on this device. The app locks when opened and after 5 minutes in the background.</p>
    <div class="btns"><button class="btn" data-act="setpin">${hasPin?'Change PIN':'Set PIN'}</button>${hasPin?'<button class="btn danger" data-act="clearpin">Remove PIN</button>':''}</div></section>
`,data:`  ${canAdmin()?`<section class="card"><h2 style="margin-bottom:6px">Import from Excel</h2><p class="small muted" style="margin:0 0 10px">Bring in your tracker: a <b>Budget</b> sheet (Section, Category, Budget, Due day) and an <b>Expense Log</b> sheet (Date, Category, Amount, Mode, Note). You'll see a preview before anything is saved.</p>
    <div class="btns"><label class="btn" for="imp-file" style="display:inline-block">Choose .xlsx or .csv</label><input id="imp-file" type="file" accept=".xlsx,.xls,.csv" hidden><button class="btn" data-act="template">Download template</button></div></section>
  <section class="card"><h2 style="margin-bottom:6px">Export</h2><p class="small muted" style="margin:0 0 10px">Excel, CSV, a PDF report or a full backup. Pick the period and what to include.</p><button class="btn primary" data-act="exp-month">Choose what to export…</button></section>`:''}
  <section class="card"><h2 style="margin-bottom:6px">Back up and restore</h2>
    <p class="small muted" style="margin:0 0 10px">${MODE==='cloud'?'Your budget syncs to your family\'s database. Back up saves a copy you can keep.':'Your data lives only on this device. Save a backup file regularly, and use it to move to a new phone.'}${lsGet('paisa-backup-at')?' Last backup: '+new Date(Number(lsGet('paisa-backup-at'))).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+'.':''}</p>
    <div class="btns"><button class="btn" data-act="backup">Back up</button>${MODE==='cloud'?'':'<label class="btn" for="restore-file" style="display:inline-block">Restore…</label><input id="restore-file" type="file" accept=".json,application/json" hidden>'}</div>
  </section>
`,trash:`${trashBody()}`,about:`<div class="tcard"><a class="trow" href="privacy.html"><span class="ti">${ui('shield',20)}</span><span class="tt"><b>Privacy policy</b><small>What we store, where, and who can see it</small></span>${CHEV}</a><a class="trow" href="terms.html"><span class="ti">${ui('report',20)}</span><span class="tt"><b>Terms of use</b><small>The rules for using Paisa</small></span>${CHEV}</a></div>
  <p class="small muted" style="margin:0 4px">Amounts are stored in paise and shown with Indian grouping. ${MODE==='cloud'?'Your budget is stored in your family\'s Supabase database and only family members can read it.':'Your data is stored on this device and never sent anywhere.'}</p>
  <p class="small" style="margin:0 4px"><a href="privacy.html">Privacy policy</a> · <a href="terms.html">Terms</a></p>
`,danger:`  ${IS_OWNER?`<section class="card"><h2 style="margin-bottom:6px">${MODE==='cloud'?'Delete family budget':'Delete all data'}</h2><p class="small muted" style="margin:0 0 10px">${MODE==='cloud'?'Deletes the family, its members and every category, entry, loan, card and goal from the database for everyone. Back up first if you might need it.':'Removes every category, entry, loan, card, goal and the activity log from this device. Back up first if you might need it.'}</p><button class="btn danger" data-act="wipe">Delete everything…</button></section>`:''}
`};
  if(PREFSEC&&SEC[PREFSEC]&&SEC[PREFSEC].trim())return `<header class="topbar"><button class="x" data-act="prefback" aria-label="Back to Settings">‹</button><h1>${PREF_TITLES[PREFSEC]}</h1></header><div class="stack subpage">${SEC[PREFSEC]}</div>`;
  PREFSEC=null;
  return topbar('Settings',{month:false,back:'more'})+`<div class="stack">${prefTiles(s,hasPin)}</div>`;
}
