/* Paisa Planner · tools: delete data, Recently deleted, habits, help, bank statement matching.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= delete data (choose what, which period, narrow down, preview) ================= */
// [key, label, hint, icon, tied to dates?]
const DEL_TYPES=[
  ['entries','Entries','Expenses, income and self transfers','list',true],
  ['budgets','One-month budgets','Budget changes made for a single month','budget',true],
  ['bills','Bill marks','Paid and skipped marks on bills','receipt',true],
  ['repeats','Repeats','Monthly salary, SIP and rent rules','repeat',false],
  ['cards','Credit cards','Cards, or just their statements for a period','card',true],
  ['loans','Loans','Loan details and payoff plans','bank',false],
  ['goals','Goals','Savings and payoff goals','target',false],
  ['accounts','Bank accounts','Accounts and their balances','bank',false],
  ['assets','Net worth','Investments, or just monthly snapshots for a period','chart',true],
  ['log','Activity history','Who added or changed what','doc',true]];
const DEL_PERIODS=[['this','This month'],['last','Last month'],['month','Pick a month'],['3m','Last 3 months'],['fy','Financial year'],['range','Date range'],['all','Everything']];
const DEL_SRC=[['','Any way'],['import','Imported'],['manual','Typed in'],['recurring','From repeats']];
let DEL=null;
function delAllowed(k){if(ROLE==='Viewer')return false;if(ROLE==='Member')return k==='entries';return true}
function openDelete(preset={}){
  if(!canWrite()){toast("Your role can't delete data.");return}
  const k=curKey();
  DEL={step:0,what:{entries:true},period:'this',month:k,fy:Number(k.slice(5))>=4?Number(k.slice(0,4)):Number(k.slice(0,4))-1,from:mStart(k),to:todayISO(),
    f:{cats:[],kinds:['out','in','xfer'],acct:'',mode:'',who:'',src:'',min:'',max:'',q:''},pick:{},keep:true,typed:'',ids:null,...preset};
  if(preset.f)DEL.f={...{cats:[],kinds:['out','in','xfer'],acct:'',mode:'',who:'',src:'',min:'',max:'',q:''},...preset.f};
  renderDelete();
}
function delRange(){
  const D0=DEL,k=curKey();
  switch(D0.period){
    case 'this':return[mStart(k),mEnd(k)];
    case 'last':return[mStart(addM(k,-1)),mEnd(addM(k,-1))];
    case 'month':return[mStart(D0.month),mEnd(D0.month)];
    case '3m':return[mStart(addM(k,-2)),mEnd(k)];
    case 'fy':return[D0.fy+'-04-01',(D0.fy+1)+'-03-31'];
    case 'range':return[D0.from<=D0.to?D0.from:D0.to,D0.from<=D0.to?D0.to:D0.from];
    default:return['0000-01-01','9999-12-31'];
  }
}
function delPeriodLabel(){
  const D0=DEL,k=curKey();
  if(D0.ids)return'';
  switch(D0.period){case 'this':return mLong(k)+' '+k.slice(0,4);case 'last':return mLong(addM(k,-1))+' '+addM(k,-1).slice(0,4);case 'month':return mLong(D0.month)+' '+D0.month.slice(0,4);
    case '3m':return mLabel(addM(k,-2))+' to '+mLabel(k);case 'fy':return'FY '+D0.fy+'–'+String(D0.fy+1).slice(2);case 'range':{const[a,b]=delRange();return dShort(a)+' '+a.slice(0,4)+' to '+dShort(b)+' '+b.slice(0,4)}default:return'all time'}
}
function delKeysIn(a,b){const all=new Set([...Object.keys(D.months),...Object.keys(D.bills),...Object.keys(txIndex())]);return[...all].filter(k=>/^\d{4}-\d\d$/.test(k)&&mEnd(k)>=a&&mStart(k)<=b)}
const delDated=()=>DEL_TYPES.some(([k,,,,d])=>d&&DEL.what[k]);
const delPicky=()=>['repeats','loans','goals','accounts'].some(k=>DEL.what[k])||(DEL.period==='all'&&(DEL.what.cards||DEL.what.assets));
function delSteps(){if(DEL.ids)return[3];const s=[0];if(delDated())s.push(1);if(DEL.what.entries||delPicky())s.push(2);s.push(3);return s}
function delPickList(k){
  if(k==='repeats')return recList().map(r=>[r.id,(r.note||D.cats[r.cat].name)+' · '+fmt(r.amt)]);
  if(k==='loans')return Object.entries(D.loans).map(([id,l])=>[id,l.name||'Loan']);
  if(k==='goals')return Object.entries(D.goals).map(([id,g])=>[id,g.name||'Goal']);
  if(k==='accounts')return acctList(true).map(a=>[a.id,acctLabel(a)]);
  if(k==='cards')return Object.entries(D.cards).map(([id,c])=>[id,c.name+' card']);
  if(k==='assets')return Object.entries(D.assets).filter(([,a])=>a.kind!=='snap').map(([id,a])=>[id,a.name||a.type]);
  return[];
}
const delPicked=(k,id)=>!DEL.pick[k]||DEL.pick[k].includes(id);
// entries that match the period and filters (and the person's role)
function delEntries(){
  const F0=DEL.f;let L=Object.entries(D.tx).filter(([,t])=>t&&t.date).map(([id,t])=>({...t,id}));
  if(DEL.ids){const s=new Set(DEL.ids);return L.filter(t=>s.has(t.id)&&canEditTx(t))}
  const[a,b]=delRange();L=L.filter(t=>t.date>=a&&t.date<=b&&canEditTx(t));
  const kind=t=>isXfer(t)?'xfer':D.cats[t.cat]&&D.cats[t.cat].section==='income'?'in':'out';
  if(hideInc())L=L.filter(t=>kind(t)!=='in');
  L=L.filter(t=>F0.kinds.includes(kind(t)));
  if(F0.cats.length)L=L.filter(t=>F0.cats.includes(t.cat));
  if(F0.acct)L=L.filter(t=>t.acct===F0.acct||t.from===F0.acct||t.to===F0.acct||(F0.acct.startsWith('card:')&&t.mode==='Card'&&t.card===F0.acct.slice(5)));
  if(F0.mode)L=L.filter(t=>t.mode===F0.mode);
  if(F0.who)L=L.filter(t=>(t.by||'local')===F0.who);
  if(F0.src)L=L.filter(t=>(t.src||'manual')===F0.src);
  const mn=parseAmt(F0.min),mx=parseAmt(F0.max);if(mn>0)L=L.filter(t=>t.amt>=mn);if(mx>0)L=L.filter(t=>t.amt<=mx);
  const q=F0.q.trim().toLowerCase();if(q)L=L.filter(t=>(t.note||'').toLowerCase().includes(q));
  return L.sort((x,y)=>y.date.localeCompare(x.date));
}
// what deleting would remove (dels) and change (patches), with a plain summary
function delPlan(){
  const dels=[],P={},lines=[];const[a,b]=delRange();const all=DEL.period==='all'&&!DEL.ids;
  const patch=(col,id,fn)=>{const cur=P[col+'/'+id]?P[col+'/'+id].data:(D[col][id]?JSON.parse(JSON.stringify(D[col][id])):null);P[col+'/'+id]={col,id,data:fn(cur)}};
  const W=DEL.ids?{entries:true}:DEL.what;let ents=[];
  if(W.entries){ents=delEntries();ents.forEach(t=>dels.push({col:'tx',id:t.id}));
    if(ents.length){const isIn=t=>!isXfer(t)&&D.cats[t.cat]&&D.cats[t.cat].section==='income';const out=ents.filter(t=>!isXfer(t)&&!isIn(t)).reduce((s,t)=>s+t.amt,0),inn=ents.filter(isIn).reduce((s,t)=>s+t.amt,0),xf=ents.filter(isXfer).length;
      lines.push(`${ents.length.toLocaleString('en-IN')} entr${ents.length===1?'y':'ies'}`+[out?` · ${fmt(out)} out`:'',inn?` · ${fmt(inn)} in`:'',xf?` · ${xf} transfer${xf>1?'s':''}`:''].join(''))}}
  if(W.budgets){let n=0;delKeysIn(a,b).forEach(k=>{const m=D.months[k];if(m&&m.b&&Object.keys(m.b).length){n++;patch('months',k,cur=>{const o={...cur};delete o.b;return o})}});if(n)lines.push(`One-month budgets in ${n} month${n>1?'s':''}`)}
  if(W.bills){const ks=delKeysIn(a,b).filter(k=>D.bills[k]);ks.forEach(k=>dels.push({col:'bills',id:k}));if(ks.length)lines.push(`Bill marks in ${ks.length} month${ks.length>1?'s':''}`)}
  for(const k of ['repeats','loans','goals','accounts']){if(!W[k])continue;const col={repeats:'recurring',loans:'loans',goals:'goals',accounts:'accounts'}[k];
    const ids=delPickList(k).map(x=>x[0]).filter(id=>delPicked(k,id));ids.forEach(id=>dels.push({col,id}));
    if(ids.length)lines.push(`${ids.length} ${{repeats:'repeat',loans:'loan',goals:'goal',accounts:'bank account'}[k]}${ids.length>1?'s':''}`)}
  if(W.cards){if(all){const ids=delPickList('cards').map(x=>x[0]).filter(id=>delPicked('cards',id));ids.forEach(id=>dels.push({col:'cards',id}));if(ids.length)lines.push(`${ids.length} credit card${ids.length>1?'s':''}`)}
    else{let n=0;Object.entries(D.cards).forEach(([id,c])=>{const ks=Object.keys(c.stmts||{}).filter(k=>mEnd(k)>=a&&mStart(k)<=b);if(ks.length){n+=ks.length;patch('cards',id,cur=>{const o={...cur,stmts:{...cur.stmts}};ks.forEach(k=>delete o.stmts[k]);return o})}});if(n)lines.push(`${n} card statement${n>1?'s':''}`)}}
  if(W.assets){const snaps=Object.entries(D.assets).filter(([,x])=>x.kind==='snap'&&(all||(mEnd(x.month)>=a&&mStart(x.month)<=b))).map(([id])=>id);snaps.forEach(id=>dels.push({col:'assets',id}));
    let n=0;if(all){const ids=delPickList('assets').map(x=>x[0]).filter(id=>delPicked('assets',id));n=ids.length;ids.forEach(id=>dels.push({col:'assets',id}))}
    if(n||snaps.length)lines.push([n?`${n} investment${n>1?'s':''}`:'',snaps.length?`${snaps.length} net worth snapshot${snaps.length>1?'s':''}`:''].filter(Boolean).join(' and '))}
  if(W.log){const ids=Object.entries(D.log).filter(([,l])=>{const d=iso(new Date(l.at||0));return d>=a&&d<=b}).map(([id])=>id);ids.forEach(id=>dels.push({col:'log',id}));if(ids.length)lines.push(`${ids.length} activity line${ids.length>1?'s':''}`)}
  // money impact of the entries
  const sign=t=>isXfer(t)?0:D.cats[t.cat]&&D.cats[t.cat].section==='income'?-t.amt:t.amt;   // + means left-to-spend goes up
  const ck=curKey();const cur=ents.filter(t=>keyOf(t.date)===ck).reduce((s,t)=>s+sign(t),0);const tot=ents.reduce((s,t)=>s+sign(t),0);
  const lastK=ents.length||W.budgets?keyOf(DEL.ids?ents.reduce((m,t)=>t.date>m?t.date:m,'0000-01-01'):(b>'9000'?todayISO():b)):null;
  const nk=lastK?addM(lastK,1):null;const later=!!(nk&&nk<=ck&&S()&&nk>S().startMonth&&(ents.length||W.budgets));
  // keep later months: pin the next month's starting money, and keep bank balances where they are
  if(later&&DEL.keep&&tot){const open=month(nk).open;if(!(D.months[nk]&&D.months[nk].open!=null))patch('months',nk,c=>({...(c||{}),open}))}
  const acctFx={};ents.forEach(t=>{const bump=(id,v)=>{const ac=D.accounts[id];if(!ac||t.date<(ac.asOf||'0000'))return;if(t.date===ac.asOf&&ac.createdAt&&(t.at||0)<ac.createdAt)return;acctFx[id]=(acctFx[id]||0)+v};
    if(isXfer(t)){if(t.to)bump(t.to,-t.amt);if(t.from)bump(t.from,t.amt);return}
    if(t.mode==='Card'||!t.acct||!D.cats[t.cat])return;bump(t.acct,D.cats[t.cat].section==='income'?-t.amt:t.amt)});
  const deletingAcct=new Set(dels.filter(d=>d.col==='accounts').map(d=>d.id));
  if(later&&DEL.keep)Object.entries(acctFx).forEach(([id,v])=>{if(v&&!deletingAcct.has(id))patch('accounts',id,c=>({...c,adj:(c.adj||0)-v}))});
  const impact=[];
  if(cur)impact.push(`Left to spend for ${mLong(ck)} goes ${cur>0?'up':'down'} by ${fmt(Math.abs(cur))}.`);
  if(later&&tot)impact.push(DEL.keep?`Months after ${mLabel(lastK)} and bank balances stay as they are.`:`Every month after ${mLabel(lastK)} starts with ${fmt(Math.abs(tot))} ${tot>0?'more':'less'}.`);
  if(!(later&&DEL.keep))Object.entries(acctFx).forEach(([id,v])=>{if(v&&!deletingAcct.has(id))impact.push(`${acctName(id)} balance goes ${v>0?'up':'down'} by ${fmt(Math.abs(v))}.`)});
  // a deleted bank account's entries stay; say so
  if(deletingAcct.size&&!W.entries)impact.push('Entries made from deleted accounts stay, marked "Removed account".');
  return{dels,patches:Object.values(P).filter(p=>!dels.some(d=>d.col===p.col&&d.id===p.id)),lines,impact,ents,later,tot};
}
function delCountLine(){const p=delPlan();return p.lines.length?p.lines.join(' · '):'Nothing matches yet.'}
function renderDelete(){
  const st=delSteps();if(!st.includes(DEL.step))DEL.step=st[0];const i=st.indexOf(DEL.step);
  const chip=(act,k,on,l,extra='')=>`<button class="chip" data-act="${act}" data-k="${k}" aria-pressed="${on}" ${extra}>${l}</button>`;
  const head=`<div class="sheet-h"><h2>${DEL.ids?'Delete selected':'Delete data'}</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
    ${st.length>1?`<div class="dsteps" aria-label="Step ${i+1} of ${st.length}">${st.map((s,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div>`:''}`;
  let body='';
  if(DEL.step===0){
    const types=DEL_TYPES.filter(([k])=>delAllowed(k));
    body=`<p class="dq">What do you want to delete?</p>
    <div class="tcard">${types.map(([k,l,h,ic])=>`<button class="trow" data-act="delwhat" data-k="${k}" aria-pressed="${!!DEL.what[k]}"><span class="ti">${ui(ic,20)}</span><span class="tt"><b>${l}</b><small>${h}</small></span><span class="tick" aria-hidden="true"></span></button>`).join('')}</div>
    ${canAdmin()?`<button class="trow danger" style="border:1px solid var(--line);border-radius:18px;margin-top:10px" data-act="delfresh"><span class="ti">${ui('repeat',20)}</span><span class="tt"><b>Start fresh</b><small>Clear all money data, keep categories, budgets and family</small></span>${CHEV}</button>`:''}
    ${ROLE==='Member'?'<p class="small muted" style="margin:10px 2px 0">As a Member you can delete entries you added yourself.</p>':''}
    ${canAdmin()?'<p class="small muted" style="margin:10px 2px 0">To delete a category, open it on the Month tab.</p>':''}`;
  }
  if(DEL.step===1){
    const years=[...new Set([DEL.fy,...Object.keys(txIndex()).map(k=>Number(k.slice(5))>=4?Number(k.slice(0,4)):Number(k.slice(0,4))-1)])].sort((x,y)=>y-x);
    body=`<p class="dq">Which period?</p>
    <div class="chips" style="margin-bottom:12px">${DEL_PERIODS.map(([k,l])=>chip('delper',k,DEL.period===k,l)).join('')}</div>
    ${DEL.period==='month'?`<input class="input" type="month" id="del-m" value="${DEL.month}" data-delf style="margin-bottom:12px">`:''}
    ${DEL.period==='fy'?`<select class="input" id="del-fy" data-delf style="margin-bottom:12px">${years.map(y=>`<option value="${y}" ${DEL.fy===y?'selected':''}>April ${y} – March ${y+1}</option>`).join('')}</select>`:''}
    ${DEL.period==='range'?`<div class="two" style="margin-bottom:6px"><div class="field"><label for="del-from">From</label><input class="input" type="date" id="del-from" value="${DEL.from}" data-delf></div><div class="field"><label for="del-to">To</label><input class="input" type="date" id="del-to" value="${DEL.to}" data-delf></div></div>`:''}
    ${DEL.period!=='all'&&!DEL.what.entries&&DEL.what.cards?'<p class="small muted" style="margin:0 0 8px">For a period, only card statements are deleted. Pick Everything to delete whole cards.</p>':''}
    ${delPicky()&&DEL.period!=='all'&&['repeats','loans','goals','accounts'].some(k=>DEL.what[k])?'<p class="small muted" style="margin:0 0 8px">Repeats, loans, goals and accounts aren\'t tied to dates. You\'ll pick them next.</p>':''}
    <p class="small" id="del-count" style="color:var(--muted);margin:8px 0 0">${delPeriodLabel()} · ${delCountLine()}</p>`;
  }
  if(DEL.step===2){
    const[a,b]=delRange();const F0=DEL.f;
    const inPeriod=Object.values(D.tx).filter(t=>t&&t.date>=a&&t.date<=b&&canEditTx(t));
    const cc={};inPeriod.forEach(t=>{if(t.cat&&D.cats[t.cat])cc[t.cat]=(cc[t.cat]||0)+1});
    const people=[...new Set(inPeriod.map(t=>t.by||'local'))];
    const accts=[...acctList(true).map(x=>[x.id,acctLabel(x)]),...Object.entries(D.cards).map(([id,c])=>['card:'+id,c.name+' card'])];
    body=`${DEL.what.entries?`<p class="dq">Which entries?</p>
      <div class="chips" style="margin-bottom:12px">${[['out','Expenses'],...(hideInc()?[]:[['in','Income']]),['xfer','Self transfers']].map(([k,l])=>chip('delkind',k,F0.kinds.includes(k),l)).join('')}</div>
      ${Object.keys(cc).length?`<div class="flabel" style="margin-bottom:6px">Categories <span class="muted">· none picked means all</span></div>
      <div class="chips" style="margin-bottom:12px;max-height:132px;overflow:auto">${catsAll().filter(c=>cc[c.id]).map(c=>chip('delcat',c.id,F0.cats.includes(c.id),`${esc(c.name)} <span class="muted">${cc[c.id]}</span>`)).join('')}</div>`:''}
      <div class="flabel" style="margin-bottom:6px">How it was added</div>
      <div class="chips" style="margin-bottom:12px">${DEL_SRC.map(([k,l])=>chip('delsrc',k,F0.src===k,l)).join('')}</div>
      <button class="link small" data-act="delmore" style="padding:0 0 10px">${DEL.more?'Fewer filters':'More filters: account, payment mode, person, amount, note'}</button>
      ${DEL.more?`<div class="filters" style="margin-bottom:12px">
        ${accts.length?`<select class="input" id="del-acct" data-delf style="grid-column:1/-1" aria-label="Account or card"><option value="">Any account or card</option>${accts.map(([id,l])=>`<option value="${id}" ${F0.acct===id?'selected':''}>${esc(l)}</option>`).join('')}</select>`:''}
        <select class="input" id="del-mode" data-delf aria-label="Payment mode" ${people.length>1?'':'style="grid-column:1/-1"'}><option value="">Any payment mode</option>${MODES.map(x=>`<option ${F0.mode===x?'selected':''}>${x}</option>`).join('')}</select>
        ${people.length>1?`<select class="input" id="del-who" data-delf aria-label="Added by"><option value="">Anyone</option>${people.map(p=>`<option value="${esc(p)}" ${F0.who===p?'selected':''}>${esc(who(p))}</option>`).join('')}</select>`:''}
        <input class="input num" id="del-min" data-delf inputmode="decimal" placeholder="Min ₹" value="${esc(F0.min)}" aria-label="Minimum amount">
        <input class="input num" id="del-max" data-delf inputmode="decimal" placeholder="Max ₹" value="${esc(F0.max)}" aria-label="Maximum amount">
        <input class="input" id="del-q" data-delf style="grid-column:1/-1" placeholder="Note contains, e.g. Swiggy" value="${esc(F0.q)}" aria-label="Note contains"></div>`:''}`:''}
      ${[...['repeats','loans','goals','accounts'],...(DEL.period==='all'?['cards','assets']:[])].filter(k=>DEL.what[k]).map(k=>{const L=delPickList(k);const name=DEL_TYPES.find(x=>x[0]===k)[1];
        return `<div class="flabel" style="margin:6px 0 6px">${name}</div>${L.length?`<div class="chips" style="margin-bottom:12px">${L.map(([id,l])=>chip('delpick',k,delPicked(k,id),esc(l),`data-id="${id}"`)).join('')}</div>`:'<p class="small muted" style="margin:0 0 12px">None added.</p>'}`}).join('')}
      <p class="small" id="del-count" style="color:var(--muted);margin:4px 0 0">${delPeriodLabel()} · ${delCountLine()}</p>`;
  }
  if(DEL.step===3){
    const p=delPlan();const n=p.dels.length+(p.lines.length&&!p.dels.length?1:0);
    const big=p.dels.length>=20;
    body=p.lines.length?`<p class="dq">${DEL.ids?'Delete these?':'Ready to delete'}</p>
      <div class="dsum">${p.lines.map(l=>`<div>${esc(l)}</div>`).join('')}${DEL.ids?'':`<div class="small muted">${esc(delPeriodLabel())}</div>`}</div>
      ${p.ents.length?`<div class="dsample">${p.ents.slice(0,5).map(t=>`<div class="kv"><span>${dShort(t.date)} · ${esc(isXfer(t)?acctName(t.from)+' → '+acctName(t.to):(t.note||(D.cats[t.cat]||{}).name||''))}</span><b class="num">${fmt(t.amt)}</b></div>`).join('')}${p.ents.length>5?`<div class="small muted" style="padding-top:6px">and ${p.ents.length-5} more</div>`:''}</div>`:''}
      ${p.impact.length?`<div class="dimpact">${p.impact.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}
      ${p.later&&p.tot?`<label class="check" style="border:0;margin:4px 0 6px"><input type="checkbox" id="del-keep" ${DEL.keep?'checked':''} data-act="delkeep"><span class="small">Keep later months and bank balances as they are</span></label>`:''}
      <button class="btn block" data-act="delbackup" style="margin:6px 0 10px">${ui('download',18)} Download a backup first</button>
      ${big?`<div class="field"><label for="del-type">Type <b>${p.dels.length}</b> to confirm</label><input class="input num" id="del-type" inputmode="numeric" autocomplete="off" value="${esc(DEL.typed)}" data-delf></div>`:''}
      <button class="btn danger block" id="del-go" data-act="delgo" ${big&&DEL.typed!==String(p.dels.length)?'disabled':''}>Delete ${p.dels.length?p.dels.length.toLocaleString('en-IN')+' item'+(p.dels.length===1?'':'s'):'now'}</button>
      <p class="small muted" style="text-align:center;margin:8px 0 0">You can restore it from Recently deleted for 30 days.</p>`
      :`<p class="dq">Nothing to delete</p><p class="small muted">Nothing matches what you picked. Go back and change the period or filters.</p>`;
  }
  const nav=DEL.step===3?(i>0?`<button class="btn block" style="margin-top:10px" data-act="delback">Back</button>`:'')
    :`<div class="btns dnav">${i>0?'<button class="btn" data-act="delback">Back</button>':''}<button class="btn primary grow" data-act="delnext" ${DEL.step===0&&!Object.values(DEL.what).some(Boolean)?'disabled':''}>Next</button></div>`;
  openSheet(head+body+nav);
}
function delRead(){
  const g=id=>{const e=$('#'+id);return e?e.value:null};const F0=DEL.f;
  if(g('del-m'))DEL.month=g('del-m');if(g('del-fy'))DEL.fy=Number(g('del-fy'));if(g('del-from'))DEL.from=g('del-from');if(g('del-to'))DEL.to=g('del-to');
  for(const k of ['acct','mode','who','min','max','q'])if(g('del-'+k)!==null)F0[k]=g('del-'+k);
  if(g('del-type')!==null)DEL.typed=g('del-type').trim();
  const kp=$('#del-keep');if(kp)DEL.keep=kp.checked;
}
function delLive(){
  delRead();const c=$('#del-count');if(c)c.textContent=delPeriodLabel()+' · '+delCountLine();
  const go=$('#del-go');if(go&&$('#del-type')){const n=delPlan().dels.length;go.disabled=DEL.typed!==String(n)}
}
function delLabel(p){return p.lines.join(', ')+(DEL.ids?'':' · '+delPeriodLabel())}
async function delGo(){
  delRead();const p=delPlan();if(!p.dels.length&&!p.patches.length)return;
  if(p.dels.length>=20&&DEL.typed!==String(p.dels.length))return;
  closeSheet();const label=delLabel(p);
  await delCommit({dels:p.dels,patches:p.patches,label});
  if(SEL){SEL=null;render()}
}
/* one place that deletes: saves a copy to Recently deleted, writes in batches, offers Undo */
async function delCommit({dels,patches=[],label}){
  const before=[];
  dels.forEach(d=>{const cur=D[d.col][d.id];if(cur!==undefined)before.push({col:d.col,id:d.id,data:cur})});
  patches.forEach(x=>before.push({col:x.col,id:x.id,data:D[x.col][x.id]===undefined?null:D[x.col][x.id]}));
  const ops=[...dels.map(d=>({col:d.col,id:d.id,data:null})),...patches.map(x=>({col:x.col,id:x.id,data:x.data}))];
  const tid='t'+uid();
  try{await bulkSet(ops)}catch(e){writeErr(e);return}
  trashSave(tid,{at:Date.now(),by:ME||'local',label,n:dels.length,items:before});
  log('deleted','data',label);
  toast(`Deleted ${label}.`,{action:'Undo',ms:10000,fn:()=>restoreTrash(tid)});
}
// many writes at once: one upload per 1,000 items, queued if offline
async function bulkSet(ops){
  if(!ops.length)return;
  ops.forEach(o=>{const n={...D[o.col]};if(o.data==null)delete n[o.id];else n[o.id]=o.data;D[o.col]=n});
  if(MODE==='local'){saveLocal();changed();return}
  cacheSoon();changed();
  const rows=ops.map(o=>({family_id:FID,col:o.col,id:o.id,data:o.data,deleted:o.data==null}));
  for(let i=0;i<rows.length;i+=1000){
    const chunk=rows.slice(i,i+1000);const q=()=>chunk.forEach(r=>queueOut({col:r.col,id:r.id,data:r.data,deleted:r.deleted}));
    if(!navigator.onLine){q();continue}
    const {error}=await SB.from('docs').upsert(chunk,{onConflict:'family_id,col,id'});
    if(error){if(isNetErr(error)){q();continue}chunk.forEach(r=>refetchDoc(r.col,r.id));throw{code:error.code==='42501'?'invalid_argument':'server',message:errMsg(error)}}
  }
}
/* ---- Recently deleted (30 days) ---- */
const TRASH_DAYS=30;
const trashLKey=()=>'paisa-trash-'+(FID||'local');
function trashLocal(){try{return JSON.parse(lsGet(trashLKey())||'{}')}catch(e){return{}}}
function trashAll(){return{...trashLocal(),...(D.trash||{})}}
function trashSave(id,obj){
  if(MODE==='cloud'){
    D.trash={...D.trash,[id]:obj};cacheSoon();
    pushDoc({col:'trash',id,data:obj,deleted:false}).catch(()=>{   // database not updated for it yet: keep the copy on this phone
      const n={...D.trash};delete n[id];D.trash=n;const L=trashLocal();L[id]=obj;try{localStorage.setItem(trashLKey(),JSON.stringify(L))}catch(e){}scheduleRender()});
    return}
  store.set('trash',id,obj).catch(()=>{});
}
function trashDrop(id){
  const L=trashLocal();if(L[id]){delete L[id];try{localStorage.setItem(trashLKey(),JSON.stringify(L))}catch(e){}}
  if(D.trash&&D.trash[id]){if(MODE==='cloud'){const n={...D.trash};delete n[id];D.trash=n;cacheSoon();pushDoc({col:'trash',id,data:null,deleted:true}).catch(()=>{});scheduleRender()}else store.del('trash',id).catch(()=>{})}
}
function trashPrune(){const cut=Date.now()-TRASH_DAYS*864e5;Object.entries(trashAll()).forEach(([id,t])=>{if((t.at||0)<cut&&(canAdmin()||t.by===ME))trashDrop(id)})}
async function restoreTrash(id){
  const t=trashAll()[id];if(!t){toast('That was already restored or removed.');return}
  const ops=(t.items||[]).map(x=>({col:x.col,id:x.id,data:x.data}));
  try{await bulkSet(ops)}catch(e){writeErr(e);return}
  trashDrop(id);log('restored','data',t.label);toast(`Restored ${t.label}.`);
}
function trashBody(){
  trashPrune();
  const L=Object.entries(trashAll()).filter(([,t])=>canAdmin()||t.by===ME).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  if(!L.length)return`<section class="card"><p class="small muted" style="margin:0">Nothing deleted in the last ${TRASH_DAYS} days. Anything you delete stays here for ${TRASH_DAYS} days so you can bring it back.</p></section>`;
  return`<p class="small muted" style="margin:0 2px">Deleted items stay here for ${TRASH_DAYS} days, then go for good.</p>
  <div class="tcard">${L.map(([id,t])=>{const left=Math.max(1,TRASH_DAYS-Math.floor((Date.now()-t.at)/864e5));
    return`<div class="trow static"><span class="ti">${ui('backup',20)}</span><span class="tt"><b>${esc(t.label)}</b><small>${new Date(t.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} · ${esc(who(t.by))} · ${left} day${left>1?'s':''} left</small></span>
      <span class="nacts"><button class="pillbtn sm" data-act="trashrestore" data-id="${id}">Restore</button><button class="x sm" data-act="trashdrop" data-id="${id}" aria-label="Delete for good">×</button></span></div>`}).join('')}</div>`;
}
/* ---- Start fresh ---- */
function openFresh(){
  const left=month(curKey()).left;
  openSheet(`${sheetHead('Start fresh?')}<p class="small" style="margin-top:0">Clears every entry, bill mark, repeat, card, loan, goal, bank account, investment and the activity history. <b>Categories, budgets and family stay.</b> Your budget restarts in ${mLong(curKey())}.</p>
    <div class="field"><label for="fr-open">Money you have right now (₹)</label><input class="input num" id="fr-open" inputmode="decimal" value="${rupees(Math.max(0,left))}"></div>
    <button class="btn block" data-act="delbackup" style="margin:0 0 10px">${ui('download',18)} Download a backup first</button>
    <div class="field"><label for="fr-type">Type <b>FRESH</b> to confirm</label><input class="input" id="fr-type" autocomplete="off" autocapitalize="characters" data-frtype></div>
    <button class="btn danger block" id="fr-go" data-act="freshgo" disabled>Start fresh</button>`);
}
async function freshGo(){
  const open=amtOrNull('fr-open');if(open==null){toast('Enter the money you have now, or 0.');return}
  const dels=[];['tx','months','bills','recurring','loans','cards','goals','accounts','assets','log'].forEach(col=>Object.keys(D[col]).forEach(id=>dels.push({col,id})));
  const s=S();const patches=[{col:'settings',id:'main',data:{...s,startMonth:curKey(),opening:open}}];
  closeSheet();await delCommit({dels,patches,label:'Start fresh ('+dels.length+' items)'});
}
/* ---- delete a category: move its entries or delete them too ---- */
function openCatDelete(id){
  const c=catById(id);if(!c)return;const n=Object.values(D.tx).filter(t=>t.cat===id).length;
  const others=catsAll().filter(x=>x.id!==id&&!x.archived&&(x.section==='income')===(c.section==='income')).sort((a,b)=>(b.section===c.section)-(a.section===c.section));
  openSheet(`${sheetHead('Delete '+esc(c.name)+'?')}
    ${n?`<p class="small" style="margin-top:0">${n} entr${n===1?'y uses':'ies use'} this category. What should happen to ${n===1?'it':'them'}?</p>
    <div class="seg" role="group" style="margin-bottom:12px"><button data-act="catdelmode" data-k="move" aria-pressed="true">Move ${n===1?'it':'them'}</button><button data-act="catdelmode" data-k="del" aria-pressed="false">Delete ${n===1?'it':'them'} too</button></div>
    <div class="field" id="cd-movewrap"><label for="cd-to">Move to</label><select class="input" id="cd-to">${others.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>`
    :'<p class="small" style="margin-top:0">No entries use it. Its budget and any repeat for it go too.</p>'}
    <button class="btn danger block" data-act="catdelgo" data-id="${id}">Delete category</button>
    <p class="small muted" style="text-align:center;margin:8px 0 0">You can restore it from Recently deleted for 30 days.</p>`);
  CATDEL='move';
}
let CATDEL='move';
async function catDelGo(id){
  const c=D.cats[id];if(!c)return;const tx=Object.entries(D.tx).filter(([,t])=>t.cat===id);
  const to=$('#cd-to')?$('#cd-to').value:'';if(tx.length&&CATDEL==='move'&&!to){toast('Pick a category to move them to.');return}
  const dels=[{col:'cats',id}],patches=[];
  if(tx.length){if(CATDEL==='del')tx.forEach(([tid])=>dels.push({col:'tx',id:tid}));else tx.forEach(([tid,t])=>patches.push({col:'tx',id:tid,data:{...t,cat:to,ub:ME||'local',uat:Date.now()}}))}
  recList().filter(r=>r.cat===id).forEach(r=>dels.push({col:'recurring',id:r.id}));
  Object.entries(D.loans).filter(([,l])=>l.cat===id).forEach(([lid,l])=>patches.push({col:'loans',id:lid,data:{...l,cat:''}}));
  closeSheet();
  await delCommit({dels,patches,label:`${c.name} category${tx.length?CATDEL==='del'?` and ${tx.length} entr${tx.length===1?'y':'ies'}`:` (${tx.length} moved to ${D.cats[to]?D.cats[to].name:''})`:''}`});
}
/* ---- select mode on Entries ---- */
let SEL=null;
function selBar(){
  if(!SEL||route!=='transactions')return'';
  return`<div class="selbar" role="toolbar" aria-label="Selected entries"><button class="link" data-act="selcancel">Cancel</button><b>${SEL.size} selected</b><button class="link" data-act="selall">All shown</button><button class="btn danger sm" data-act="seldel" ${SEL.size?'':'disabled'}>Delete</button></div>`;
}
/* ================= Habits: the PRD's own success measures, from the family's data ================= */
function habitStats(){
  const t=todayISO(),tx=Object.values(D.tx).filter(x=>x&&x.date);
  const mine=tx.filter(x=>MODE!=='cloud'||x.by===ME);
  const secs=mine.filter(x=>typeof x.secs==='number'&&x.secs>0&&x.secs<300).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,30).map(x=>x.secs).sort((a,b)=>a-b);
  const median=secs.length?secs[Math.floor(secs.length/2)]:null;
  const from=addDays(t,-27);const days=new Set(mine.filter(x=>x.at).map(x=>iso(new Date(x.at))).filter(d=>d>=from&&d<=t));
  const perWeek=Math.round(days.size/4*10)/10;
  const s=S();const closed=[1,2,3].map(n=>addM(curKey(),-n)).filter(k=>s&&k>=s.startMonth);
  const done=closed.filter(k=>billsFor(k).every(b=>b.st==='paid'||b.st==='skip'));
  let late=0,billN=0;closed.forEach(k=>billsFor(k).forEach(b=>{billN++;if(b.st==='skip')return;const paid=(txIndex()[k]||{list:[]}).list.filter(x=>x.cat===b.id).map(x=>x.date).sort()[0];if(!paid||daysBetween(b.due,paid)>3)late++}));
  const missedPerMonth=closed.length?Math.round(late/closed.length*10)/10:null;
  const L=acctList();const checked=L.filter(a=>a.checkedAt&&daysBetween(a.checkedAt,t)<=7).length;
  const recent=tx.filter(x=>x.date>=from&&!isXfer(x));const src={manual:0,quick:0,import:0,recurring:0,other:0};
  recent.forEach(x=>{const k=x.src==='manual'||!x.src?'manual':x.src==='share'?'quick':x.src==='import'?'import':x.src==='recurring'?'recurring':'other';src[k]++});
  return{median,secsN:secs.length,perWeek,daysN:days.size,closed:closed.length,done:done.length,missedPerMonth,late,billN,accts:L.length,checked,src,recentN:recent.length};
}
function habitsView(){
  const h=habitStats();
  const row=(title,val,target,ok,note)=>`<div class="hab"><div class="grow"><div class="hab-t">${title}</div><div class="hab-n">${note}</div></div><div class="hab-v ${ok==null?'':ok?'good':'warn'}">${val}<span>${target}</span></div></div>`;
  return topbar('Your habits',{month:false,back:'more'})+`<div class="stack">
  <p class="heroline" style="margin:0">The few habits that keep left to spend true. Worked out on this phone from your own entries; nothing is sent anywhere.</p>
  <section class="tgroup"><div class="eyebrow">Logging</div><div class="tcard habs">
    ${row('Time to add an entry',h.median==null?'—':h.median+'s','goal 5s',h.median==null?null:h.median<=5,h.secsN?`Middle of your last ${h.secsN>1?h.secsN+" entries":"entry"}. Try "Type or paste" or one-tap repeats to go faster.`:'Shows after your next few entries.')}
    ${row('Days you logged',h.perWeek+' a week','goal 4',h.daysN?h.perWeek>=4:null,`${h.daysN} of the last 28 days.${h.perWeek<4?' The evening reminder helps: Settings → Reminders.':''}`)}
    ${row('Entries that weren\'t typed by hand',h.recentN?Math.round((h.src.quick+h.src.import+h.src.recurring)/h.recentN*100)+'%':'—','more is easier',null,h.recentN?`Last 28 days: ${h.src.manual} on the keypad, ${h.src.quick} typed or pasted, ${h.src.recurring} from repeats, ${h.src.import} imported.`:'No entries in the last 28 days.')}
  </div></section>
  <section class="tgroup"><div class="eyebrow">Bills and months</div><div class="tcard habs">
    ${row('Months closed cleanly',h.closed?`${h.done} of ${h.closed}`:'—','all bills done',h.closed?h.done===h.closed:null,h.closed?'Every bill and EMI marked paid or skipped.':'Shows after your first full month.')}
    ${row('Late or missed payments',h.missedPerMonth==null?'—':h.missedPerMonth+' a month','goal 0',h.missedPerMonth==null?null:h.missedPerMonth<.2,h.closed?`${h.late} of ${h.billN} bills in the last ${h.closed} month${h.closed>1?'s':''} were paid more than 3 days late or not marked.`:'Shows after your first full month.')}
  </div></section>
  ${h.accts?`<section class="tgroup"><div class="eyebrow">Trust</div><div class="tcard habs">
    ${row('Bank accounts checked this week',`${h.checked} of ${h.accts}`,'all',h.checked===h.accts,'A weekly check keeps left to spend matching your bank.')}
  </div></section>`:''}
  </div>`;
}
/* ================= Help & FAQ ================= */
// [topic, question, answer (simple HTML), extra search words, [button label, data-act, data-k]]
const FAQ_TOPICS=[['start','Getting started','home'],['add','Adding entries','list'],['budget','Month plan','budget'],['bills','Bills & reminders','bell'],['wallet','Money: accounts, cards, loans','card'],['family','Family & sharing','users'],['data','Import, export & backup','upload'],['delete','Deleting & restoring','backup'],['privacy','Privacy & security','shield'],['app','App & troubleshooting','gear']];
const FAQ=[
 ['start','What does "Left to spend" mean?','It is the money you started the month with, plus income received, minus everything paid out so far. Tap the big number on Home to see exactly how it adds up.','left to spend balance home number how calculated',['See how it adds up','breakdown','']],
 ['start','How is the "a day" amount worked out?','Paisa takes what\'s left, adds income still to come, subtracts bills, EMIs and budgets you haven\'t paid yet, then divides by the days left in the month. It\'s what you can spend each day without missing a planned payment.','per day daily amount safe to spend',null],
 ['start','What should I do first?','Log what you spend with the <b>+</b> button, mark bills paid when they go out, and check Home once a day. Paisa shows what needs you under <b>Needs you</b>, so you don\'t have to look everywhere.','first steps begin setup tutorial',['Add an entry','fab','']],
 ['start','What does "Needs you" show?','Only things that need an action: overdue bills, budgets that have gone over, and repeats waiting for a tap. Heads-ups you don\'t need can be hidden for the month with ×.','needs you attention alerts warnings red dot badge',null],
 ['start','What is the monthly wrap?','At the start of a new month Paisa shows a short summary of last month: what you saved, where you went over, and a one-tap way to raise a budget that was too low.','wrap summary last month recap',null],
 ['start','What is "Your habits"?','A page in More that shows the few habits that keep your number true: how fast you add entries (goal 5 seconds), how many days a week you log (goal 4), months closed with every bill done, and late payments. It\'s worked out on your phone from your own entries.','habits progress stats speed days logged',['Your habits','go','habits']],

 ['add','How do I add an expense or income?','Tap <b>+</b>, type the amount on the keypad and pick a category. Switch between <b>Expense</b>, <b>Income</b> and <b>Self transfer</b> at the top. Tap the line under the categories to change the date, payment mode, account or note.','add entry log spend record salary',['Add an entry','fab','']],
 ['add','How do I edit or delete an entry?','Open <b>Entries</b> and tap the entry to edit it. On a phone you can also swipe it right to edit, or left to delete. Deleted entries can be restored from Recently deleted for 30 days.','edit change fix wrong mistake swipe remove',['Open Entries','go','transactions']],
 ['add','Why does Paisa pick a category for me?','It remembers the category you used for the same amount, time of day or note (like "Swiggy"). The guess is only a suggestion. Tap another category to change it.','guess auto category suggestion merchant memory',null],
 ['add','How do I split one payment across categories?','In Add entry, open the details line under the categories and tap <b>Split across categories</b>. Add each part. The parts must add up to the total before you can save.','split multiple categories one bill',null],
 ['add','Can I type an entry instead of using the keypad?','Yes. In Add entry tap <b>Type or paste instead</b> and write something like "350 swiggy", "salary 150000" or "2.5k rent", or paste a bank SMS. If Paisa is sure of the category, Done saves it straight away; if it\'s only a guess, check it and tap Save.','type text paste sms quick fast keyboard words',null],
 ['add','What is a Self transfer?','Money moved between your own accounts, like salary account to savings, or paying your credit card. It changes account balances but not what\'s left to spend.','self transfer move money between accounts own',null],
 ['add','How do I record a credit card bill without counting it twice?','If you log card purchases as expenses, pay the card bill as a <b>Self transfer</b> to the card, not as an expense. Paisa warns you if you try, with a one-tap <b>Pay card instead</b>, and marks the Credit card bill paid.','credit card bill payment double count twice',null],
 ['add','How do I make an entry repeat every month?','In Add entry, open the details and tick <b>Repeats every month</b>. On that day each month it appears on Home for a one-tap confirm. Manage repeats in Money → Repeats.','repeat recurring monthly salary sip rent automatic',['Open Repeats','goplan','recurring']],
 ['add','Can I share an SMS or UPI message to Paisa?','On Android, after installing the app, use your phone\'s Share button and pick Paisa. It reads the amount and merchant for you. iPhone doesn\'t let web apps receive shares, so copy the amount instead.','share sms upi message android iphone',null],

 ['budget','How do I change my budgets?','Open <b>Month</b> and tap <b>Edit budgets</b> to plan the whole month at once, or tap a category to change just that one. You can apply a change to one month only, or to this and future months.','change budget limit plan amount',['Open Month','go','budget']],
 ['budget','My month starts on salary day, not the 1st. Can I change that?','Yes. In Settings → Budget setup, set <b>Month starts on day</b> (for example 25). Every screen, report and export follows it.','start day month salary date 25th cycle',['Budget setup','prefsec','budget']],
 ['budget','What is "Money at the start" and how do I correct it?','It is what you had when the month began, carried over from last month. If it doesn\'t match your bank, open Month and tap <b>Starting money</b> to set it for that month.','opening balance starting money carry over correct',['Open Month','go','budget']],
 ['budget','How do I add, rename, archive or delete a category?','On Month, tap <b>+ Add a category</b> under a section, or tap a category to rename it, set a due day or archive it. <b>Delete</b> lets you move its entries to another category or delete them too.','category add rename archive remove delete move',['Open Month','go','budget']],
 ['budget','What are the sections Income, Savings, Bills, Expenses and Debt?','They group your categories. Savings and Debt/EMIs count as money going out, so "left to spend" stays honest. Bills and Debt can have due days for reminders.','sections savings debt emi expenses bills income',null],
 ['budget','What do Commitments, Savings and Free to spend mean?','<b>Commitments</b> are bills and EMIs that go out every month. <b>Savings</b> is what you plan to put away. <b>Free to spend</b> is what\'s left of the money you have after both, for everyday things. Everyday categories don\'t need limits: watch the free-to-spend number instead.','commitments savings free to spend plan month three parts',['Open Month','go','budget']],
 ['budget','Why does Paisa suggest a different "money at the start"?','If you\'ve added bank accounts, Paisa compares what your banks held when the month began (minus card bills still owed) with the figure carried over. If they differ, Needs you offers <b>Use banks</b> so the month starts from the real amount.','money at the start banks different suggestion use banks opening',null],
 ['budget','Where can I see the whole year?','Tap the chart icon at the top left of Home for the Yearly report: income, outflow, savings rate and month-by-month totals. You can export it from there.','year yearly report annual savings rate chart',['Yearly report','go','reports']],

 ['bills','How do I track a bill or EMI?','Give a Bills or Debt category a due day on the Month tab. It then appears in Bills & EMIs with its status, and on Home when it\'s due or overdue. Tap <b>Paid</b> when it goes out.','bill emi due date track rent electricity',['Bills & EMIs','go','bills']],
 ['bills','How do I skip a bill this month?','In Bills & EMIs tap <b>Skip</b> next to it. It won\'t count as overdue and you can undo it any time that month.','skip bill not this month',['Bills & EMIs','go','bills']],
 ['bills','How do reminders work?','Turn them on in Settings → Reminders. You can get bill reminders before due dates, an evening nudge to log the day\'s spending, and a weekly summary, each at a time you choose.','reminder notification push alert time',['Reminders','prefsec','reminders']],
 ['bills','Reminders don\'t work on my iPhone. Why?','On iPhone, notifications only work when Paisa is installed: open it in Safari, tap Share → <b>Add to Home Screen</b>, open it from the home screen, then turn on reminders. You need iOS 16.4 or later.','iphone ios notification not working safari home screen',['Install the app','prefsec','install']],
 ['bills','Reminders say "Blocked in phone settings".','Notifications were turned off for Paisa in your phone or browser settings. Turn them back on there (on iPhone: Settings → Notifications → Paisa), then reopen the app.','blocked denied notification permission',['Reminders','prefsec','reminders']],

 ['wallet','How do I add my bank account?','Money → <b>+ Add</b> → Bank account. Pick the bank and type the balance your bank app shows today. Only the last 4 digits are kept, never the full account number.','bank account add savings salary',['Open Money','go','plan']],
 ['wallet','My account balance doesn\'t match the bank. What do I do?','Open the account and tap <b>Check balance</b>. If it differs, type what your bank shows and Paisa adjusts. Small gaps usually mean an entry wasn\'t logged.','balance wrong mismatch check correct',['Open Money','go','plan']],
 ['wallet','Why does Paisa ask "Does HDFC show ₹X?" every week?','A quick weekly check keeps left to spend true. If the bank shows less, tap Next and log the difference as the spending you missed (it goes into your budget), or only correct the balance for things like bank charges.','weekly check balance ask question does show',null],
 ['wallet','How do I link a credit card to its bill?','Open the card in Money and pick <b>Budget line that pays this card</b>. Then paying the card with a self transfer marks that bill paid, even if you rename it, and Paisa warns if a payment would count spending twice.','link card bill budget line pays credit card',['Credit cards','goplan','cards']],
 ['wallet','How do I track a credit card?','Money → <b>+ Add</b> → Credit card, with the statement and due days. Each month tap <b>Add statement</b> with the amount, and Paisa shows the due date and what\'s unpaid.','credit card statement due limit',['Credit cards','goplan','cards']],
 ['wallet','How do loans and payoff dates work?','Add a loan with what\'s still owed, the interest rate and the EMI. Paisa works out when it ends and the interest left, and updates as you log EMIs.','loan emi payoff interest home personal',['Loans','goplan','loans']],
 ['wallet','What kinds of goals can I set?','Savings goals (a target by a date), yearly payments like insurance (it tells you what to set aside each month), and loan payoff goals (pay off by a date).','goal save target insurance yearly payoff',['Goals','goplan','goals']],
 ['wallet','What is Net worth?','Your bank balances plus investments (FDs, mutual funds, PPF, gold…) minus loans and card dues. Update investment values when they change. Paisa saves a snapshot each month so you can see the trend.','net worth investments assets fd mutual fund',['Net worth','goplan','networth']],

 ['family','How do I share the budget with my family?','Sign in with Google, then open Family and tap the <b>+</b> circle to invite someone by their Gmail address. They sign in with that Gmail and accept. Everyone sees the same budget live.','share family invite partner spouse gmail',['Open Family','go','family']],
 ['family','What can each role do?','<b>Owner</b>: everything, including deleting the budget. <b>Admin</b>: manage budgets, categories and members. <b>Member</b>: add entries and edit or delete their own. <b>Viewer</b>: look only.','role owner admin member viewer permissions',['Open Family','go','family']],
 ['family','Can I hide our income from members?','Yes. In Settings → Budget setup the Owner can turn on <b>Hide income, net worth and yearly reports from Members and Viewers</b>. They still see spending and budgets.','hide income salary private member',['Budget setup','prefsec','budget']],
 ['family','Someone wants their own budget, not ours.','Ask them to open the app link and sign in with their own Gmail without accepting your invite. They get a separate, private budget.','own separate budget brother friend',null],
 ['family','How do I change a role, remove someone, or leave?','In Family, tap a person to change their role or remove them. To hand over the budget, make someone else the Owner first. Anyone can leave from the bottom of the Family page.','remove member leave family change role owner transfer',['Open Family','go','family']],

 ['data','How do I import from Excel?','Settings → Import, export & backup → Import. Pick an Excel or CSV file with date, category and amount columns. Paisa shows what it found and asks you to confirm before adding anything.','import excel csv sheet upload old data',['Import & export','prefsec','data']],
 ['data','How do I match my bank statement?','Download a statement (Excel or CSV) from your bank, then Settings → Data → <b>Match a bank statement</b>, or open the account in Money. Paisa skips what you already logged (same amount within 3 days), lists only what\'s missing with categories guessed, and adds them in one tap.','bank statement match reconcile missing csv excel download',['Match a statement','stmmatch','']],
 ['data','What can I export?','Excel (several sheets), CSV (entries only), a PDF report, or a full backup file. Pick a month, a year, a date range or everything, and filter by category, payment mode or person.','export excel csv pdf report download',['Export','exp-month','']],
 ['data','How do I back up and move to a new phone?','Settings → Import, export & backup → Back up saves one file with everything. On the new phone, open the same section and restore it. With Google sign-in your data syncs automatically, so no file is needed.','backup restore new phone move transfer',['Back up','prefsec','data']],

 ['delete','How do I delete entries for a period or category?','Settings → Data → <b>Delete data</b>. Choose what (entries, budgets, bill marks, cards…), which period, and narrow it down by category, account, person, amount or how it was added. You see a preview before anything is deleted.','delete remove clear period category bulk many',['Delete data','deldata','']],
 ['delete','I imported the wrong file. How do I undo it?','Delete data → Entries → pick the period → under "How it was added" choose <b>Imported</b>. Only imported entries are removed.','wrong import undo remove imported',['Delete data','deldata','']],
 ['delete','Can I get deleted data back?','Yes, for 30 days. Settings → Data → <b>Recently deleted</b> lists every delete; tap Restore. Right after deleting you can also tap Undo.','restore undo recover deleted trash bin',['Recently deleted','prefsec','trash']],
 ['delete','Will deleting old entries change this month\'s numbers?','Not by default. "Keep later months and bank balances as they are" is on, so only the period you delete changes. Turn it off to recalculate every month after it.','balance change later months recalculate carry',null],
 ['delete','How do I select several entries and delete them?','Open Entries, tap <b>Select</b>, tick the entries (or <b>All shown</b>) and tap Delete.','select multiple entries bulk',['Open Entries','go','transactions']],
 ['delete','How do I start over?','Delete data → <b>Start fresh</b> clears every entry, bill mark, card, loan, goal, account and investment, but keeps your categories, budgets and family. It can be restored from Recently deleted for 30 days.','start fresh reset clear everything over',['Delete data','deldata','']],

 ['privacy','Where is my data stored?','Without sign-in, only on this phone. With Google sign-in, in your family\'s private database, which only your family members can read. Amounts are stored exactly, in paise.','data stored where cloud privacy safe',['Privacy policy','link','privacy.html']],
 ['privacy','Do you store my bank account number?','No. Only the bank name and the last 4 digits, so you can tell accounts apart.','account number bank details safe',null],
 ['privacy','How do I lock the app?','Settings → App lock. Set a PIN and Paisa asks for it each time it opens.','lock pin password secure',['App lock','prefsec','lock']],
 ['privacy','How do I delete my account?','Settings → Account → Delete my account. If you own a family with other members, make someone else the Owner first. Your past entries stay with the family under your name.','delete account remove me sign out',['Account','prefsec','account']],

 ['app','How do I install Paisa on my phone?','Android (Chrome): menu → <b>Install app</b>. iPhone (Safari): Share → <b>Add to Home Screen</b>. It then opens full screen like any app and works offline.','install home screen app download android iphone',['Install the app','prefsec','install']],
 ['app','Does it work without internet?','Yes. Entries you add offline are saved on the phone and sync automatically when you\'re back online.','offline no internet sync',null],
 ['app','I don\'t see the latest changes. How do I update?','Close Paisa fully (swipe it away) and open it again. If it still looks old, do it once more: the first open loads the update in the background.','update latest version old refresh',null],
 ['app','Is Paisa free?','Yes. There\'s nothing to buy and no ads.','free cost price paid',null],
];
let HELPQ='',HELPT='';
function faqNorm(s){return String(s).toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9₹ ]+/g,' ')}
function faqFind(q,topic){
  const words=faqNorm(q).split(/\s+/).filter(w=>w.length>1&&!['how','do','i','the','my','to','a','is','can','what','does','and','of','in','an','it','for'].includes(w));
  return FAQ.map((f,i)=>{const[t,qq,a,tags]=f;if(topic&&t!==topic)return null;if(!words.length)return{i,s:0};
    const Q=faqNorm(qq),A=faqNorm(a),T=faqNorm(tags);let s=0;
    for(const w of words){const stem=w.length>4?w.replace(/(ing|ed|es|s)$/,''):w;let hit=0;if(Q.includes(stem))hit=3;else if(T.includes(stem))hit=2;else if(A.includes(stem))hit=1;if(!hit)return null;s+=hit}
    return{i,s}}).filter(Boolean).sort((x,y)=>y.s-x.s);
}
function faqMark(html,q){
  const words=faqNorm(q).split(/\s+/).filter(w=>w.length>2);if(!words.length)return html;
  return html.replace(/(^|>)([^<]+)/g,(m,a,txt)=>a+words.reduce((s,w)=>s.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>'),txt));
}
function faqItem(i,open){
  const[t,q,a,,act]=FAQ[i];
  const btn=act?(act[1]==='link'?`<a class="pillbtn sm" href="${act[2]}">${act[0]} ›</a>`:`<button class="pillbtn sm" data-act="${act[1]}" data-k="${act[2]}">${act[0]} ›</button>`):'';
  return`<details class="faq" ${open?'open':''}><summary><span>${faqMark(esc(q),HELPQ)}</span>${CHEV}</summary><div class="fa"><p>${faqMark(a,HELPQ)}</p>${btn}</div></details>`;
}
function helpView(){
  return topbar('Help & FAQ',{month:false,back:'more'})+`<div class="stack">
  <label class="msearch">${ui('search',20)}<input id="help-q" type="search" placeholder="Search, e.g. reminders, import, delete" value="${esc(HELPQ)}" data-helpq autocomplete="off" aria-label="Search help"></label>
  <div class="hscroll" style="margin-top:-4px">${[['','All'],...FAQ_TOPICS.map(([k,l])=>[k,l])].map(([k,l])=>`<button class="chip ${HELPT===k?'':'outline'}" data-act="helptopic" data-k="${k}" aria-pressed="${HELPT===k}">${l}</button>`).join('')}</div>
  <div id="helpres">${helpResults()}</div></div>`;
}
function helpResults(){
  const q=HELPQ.trim();
  if(q){const r=faqFind(q,HELPT);
    if(!r.length)return`<div class="empty-state" style="padding:28px 8px"><p style="margin:0 0 6px"><b>No answers for "${esc(q)}"</b></p><p class="small muted" style="margin:0 0 14px">Try a shorter word, like "bill", "card" or "family".</p><div class="chips" style="justify-content:center">${['reminders','import','delete','family','balance'].map(w=>`<button class="chip outline" data-act="helpq" data-k="${w}">${w}</button>`).join('')}</div></div>`;
    return`<p class="small muted" style="margin:0 2px 8px">${r.length} answer${r.length>1?'s':''}</p><div class="faqs">${r.map((x,j)=>faqItem(x.i,j===0&&r.length<=3)).join('')}</div>`}
  const topics=FAQ_TOPICS.filter(([k])=>!HELPT||k===HELPT);
  return topics.map(([k,l,ic])=>`<section class="tgroup"><div class="eyebrow">${l}</div><div class="faqs">${FAQ.map((f,i)=>f[0]===k?faqItem(i,false):'').join('')}</div></section>`).join('')
    +`<p class="small muted center" style="margin:6px 0 0">Still stuck? Ask your family Owner, or check <a href="privacy.html">Privacy</a> and <a href="terms.html">Terms</a>.</p>`;
}
function helpRefresh(){const r=$('#helpres');if(r)r.innerHTML=helpResults()}
// the More search shows the best help answers too
function helpHits(q){return faqFind(q,'').slice(0,3).map(x=>x.i)}
/* ================= Match a bank statement: add what's missing, skip what's already logged ================= */
let STM=null;
function openStmMatch(acct){
  if(!canWrite()){toast("Your role can't add entries.");return}
  const L=acctList();if(!L.length){toast('Add your bank account first, in Money.');return}
  STM={step:'pick',acct:acct&&D.accounts[acct]?acct:defaultAcct()||L[0].id};renderStm();
}
function stmDate(v){
  if(v instanceof Date&&!isNaN(v))return iso(v);
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}
  const s=String(v||'').trim();let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);
  if((m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))){const y=m[3].length===2?2000+(+m[3]):+m[3];const d=+m[1],mo=+m[2];if(mo>=1&&mo<=12&&d>=1&&d<=31)return y+'-'+pad(mo)+'-'+pad(d)}
  if((m=s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[A-Za-z]*[\s\-\/,]+(\d{2,4})/))){const mo=MON.findIndex(x=>x.toLowerCase()===m[2].toLowerCase())+1;const y=m[3].length===2?2000+(+m[3]):+m[3];if(mo)return y+'-'+pad(mo)+'-'+pad(+m[1])}
  return null;
}
function stmAmt(v){if(typeof v==='number')return Math.round(Math.abs(v)*100);const s=String(v||'').replace(/[₹,\s]|inr|rs\.?/gi,'').replace(/(cr|dr)$/i,'');const n=parseFloat(s);return isFinite(n)?Math.round(Math.abs(n)*100):0}
const STM_STOP=/^(upi|dr|cr|imps|neft|rtgs|pos|atm|p2a|p2m|payment|paid|transfer|trf|to|by|from|ref|txn|ach|nach|ecs|mmt|bil|onl|inb|vps|ybl|okaxis|okhdfcbank|okicici|oksbi|paytm|axl|ibl|apl|upi ref|purchase|debit|credit|card|ending|india|pvt|ltd|limited|the|and|via|online)$/i;
function stmMerchant(desc){
  const s=String(desc||'');const vpa=s.match(/([a-z0-9._-]{3,})@[a-z]+/i);
  const toks=s.split(/[\/|\-:*#]+|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  for(const tk of toks){if(/^[A-Z]{4}0/.test(tk))continue;   // bank branch codes (IFSC)
    const w=tk.replace(/[^A-Za-z&' ]+/g,' ').split(/\s+/).filter(x=>x.length>2&&!STM_STOP.test(x)&&!/^x+$/i.test(x)).join(' ');
    if(w.length<3)continue;return w.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).slice(0,28)}
  return vpa?vpa[1].replace(/[._-]+/g,' ').replace(/\d+/g,'').trim().replace(/\b\w/g,c=>c.toUpperCase()):'';
}
const STM_KEYS=[[/swiggy|zomato|domino|mcdonald|kfc|pizza|cafe|restaurant|starbucks|eatsure/i,/eat|food|dining|restaurant/i],[/bigbasket|blinkit|zepto|dmart|grofers|jiomart|grocery|supermarket|more retail|instamart/i,/grocer/i],
  [/uber|ola|rapido|petrol|fuel|hpcl|bpcl|iocl|indian oil|shell|metro|irctc|fastag/i,/transport|fuel|travel|commute/i],[/amazon|flipkart|myntra|ajio|nykaa|meesho|tata cliq/i,/shop/i],
  [/apollo|pharm|medplus|1mg|hospital|clinic|diagnostic|netmeds/i,/health|medical/i],[/netflix|hotstar|spotify|prime|youtube|jio|airtel|vodafone|vi |bsnl|electric|bescom|tata power|gas|water|broadband/i,/bill|utilit|phone|internet|subscri|electric/i],
  [/salary|sal cr|payroll/i,/salary|income/i],[/interest/i,/interest|income/i]];
function stmGuessCat(r){
  const inc=r.dir==='in';const pool=catsAll().filter(c=>!c.archived&&(inc?c.section==='income':c.section!=='income'));
  const g=guessCat(r.amt,r.merchant);if(g&&pool.some(c=>c.id===g))return g;
  for(const [re,catRe] of STM_KEYS)if(re.test(r.desc)){const c=pool.find(c=>catRe.test(c.name));if(c)return c.id}
  if(inc&&!/salary|sal cr|payroll/i.test(r.desc)){const c=pool.find(c=>/other|misc|refund|interest|cashback/i.test(c.name))||pool.find(c=>!/salary/i.test(c.name));if(c)return c.id}
  return(pool.find(c=>/misc|other/i.test(c.name))||pool.find(c=>c.section==='expenses')||pool[0]||{}).id||'';
}
async function stmRead(file){
  let X;try{X=await loadXLSX()}catch(e){toast("Couldn't load the reader. Check your connection.");return null}
  let wb;try{wb=/\.csv$/i.test(file.name)?X.read(await file.text(),{type:'string',raw:true}):X.read(await file.arrayBuffer(),{cellDates:true})}catch(e){toast("Couldn't read that file. Download the statement as Excel or CSV.");return null}
  for(const name of wb.SheetNames){
    const rows=X.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:''});
    const hi=rows.findIndex(r=>r.some(c=>/date/i.test(String(c)))&&r.some(c=>/withdraw|debit|dr\b|amount/i.test(String(c))));if(hi<0)continue;
    const H=rows[hi].map(c=>String(c).trim().toLowerCase());const f=re=>H.findIndex(h=>re.test(h));
    const ci={date:[/^(txn|tran|transaction)\.?\s*date/,/^date/,/date/].map(f).find(i=>i>=0),desc:f(/narration|description|particular|details|remark/),dr:f(/withdraw|debit|^dr\b|dr amount/),cr:f(/deposit|credit|^cr\b|cr amount/),amt:f(/^amount|txn amount|transaction amount/),type:f(/dr\s*\/\s*cr|cr\s*\/\s*dr|^type$/),bal:f(/balance/)};
    const out=[];let closing=null,lastDate=null;
    for(const r of rows.slice(hi+1)){const date=stmDate(r[ci.date]);if(!date)continue;
      let dr=ci.dr>=0?stmAmt(r[ci.dr]):0,cr=ci.cr>=0?stmAmt(r[ci.cr]):0;
      if(!dr&&!cr&&ci.amt>=0){const v=r[ci.amt];const a=stmAmt(v);const t=ci.type>=0?String(r[ci.type]):String(v);if(/cr/i.test(t)&&!/dr/i.test(t))cr=a;else if(typeof v==='number'&&v>0&&ci.type<0)cr=a;else dr=a}
      if(!dr&&!cr)continue;const desc=String(ci.desc>=0?r[ci.desc]:'').replace(/\s+/g,' ').trim();
      out.push({date,desc,dir:dr?'out':'in',amt:dr||cr,merchant:stmMerchant(desc)});
      if(ci.bal>=0&&String(r[ci.bal]).trim()!==''){closing=stmAmt(r[ci.bal]);lastDate=date}}
    if(out.length)return{rows:out,closing,lastDate};
  }
  toast("Couldn't find the transactions in that file. It needs Date and Withdrawal/Deposit (or Amount) columns.");return null;
}
// pair each statement line with an entry already in Paisa: same amount, same direction, within 3 days
function stmMatch(rows,acct){
  const used=new Set();const pool=Object.entries(D.tx).map(([id,t])=>({...t,id}));
  const dirOf=t=>isXfer(t)?(t.from===acct?'out':t.to===acct?'in':null):(D.cats[t.cat]&&D.cats[t.cat].section==='income'?'in':'out');
  rows.forEach(r=>{let best=null,bd=9;
    for(const t of pool){if(used.has(t.id)||t.amt!==r.amt||dirOf(t)!==r.dir)continue;if(!isXfer(t)&&t.acct&&t.acct!==acct)continue;if(!isXfer(t)&&t.mode==='Card')continue;
      const d=Math.abs(daysBetween(t.date,r.date));if(d<=3&&(d<bd||(d===bd&&t.acct===acct))){best=t;bd=d}}
    if(best){used.add(best.id);r.match=best.id}else{r.match=null;r.cat=stmGuessCat(r);r.on=true}});
  return rows;
}
function renderStm(){
  const S0=STM;const L=acctList();
  if(S0.step==='pick')return openSheet(`${sheetHead('Match a bank statement')}
    <p class="small" style="margin-top:0">Download a statement from your bank app or net banking (Excel or CSV). Paisa skips what you already logged and lists only what's missing.</p>
    <div class="field"><label for="stm-acct">Which account is it for?</label><select class="input" id="stm-acct">${L.map(a=>`<option value="${a.id}" ${a.id===S0.acct?'selected':''}>${esc(acctLabel(a))}</option>`).join('')}</select></div>
    <label class="btn primary block" for="stm-file" style="display:flex;justify-content:center;align-items:center;gap:8px">${ui('upload',18)} Choose statement file</label>
    <input type="file" id="stm-file" accept=".csv,.xls,.xlsx" hidden>
    <p class="small muted" style="margin:10px 2px 0">Read on this phone only. The file isn't uploaded or kept.</p>`);
  const R=S0.rows,miss=R.filter(r=>!r.match),on=miss.filter(r=>r.on),a=acctById(S0.acct);
  const from=R.reduce((m,r)=>r.date<m?r.date:m,'9999'),to=R.reduce((m,r)=>r.date>m?r.date:m,'0000');
  const outCats=catsAll().filter(c=>!c.archived&&c.section!=='income'),inCats=catsAll().filter(c=>!c.archived&&c.section==='income');
  const before=a&&a.asOf?miss.filter(r=>r.date<a.asOf).length:0;
  const paisaThen=S0.lastDate?acctBalanceAt(S0.acct,addDays(S0.lastDate,1)):null;
  openSheet(`${sheetHead('Statement check')}
    <div class="dsum"><div>${R.length} lines · ${dShort(from)} to ${dShort(to)}</div><div class="small muted" style="font-weight:500">${esc(acctLabel(a))}</div></div>
    <div class="kv"><span>Already in Paisa</span><b class="num">${R.length-miss.length}</b></div>
    <div class="kv"><span>Missing from Paisa</span><b class="num ${miss.length?'over':''}">${miss.length}</b></div>
    ${S0.closing!=null&&paisaThen!=null?`<div class="kv"><span>Bank balance on ${dShort(S0.lastDate)}</span><b class="num">${fmt(S0.closing)}</b></div><div class="kv"><span>Paisa had</span><b class="num">${fmt(paisaThen)}</b></div>`:''}
    ${miss.length?`<p class="dq" style="font-size:17px;margin:16px 0 8px">Add the missing ${miss.length>1?miss.length+' entries':'entry'}?</p>
    ${before?`<p class="small muted" style="margin:-4px 0 8px">${before} ${before>1?'are':'is'} from before you added this account; they count in the budget but not the balance.</p>`:''}
    <div class="stmlist">${miss.map((r,i)=>{const idx=R.indexOf(r);const cats=r.dir==='in'?inCats:outCats;return`<div class="stmrow ${r.on?'':'off'}">
      <button class="stmtick" data-act="stmtoggle" data-i="${idx}" aria-pressed="${!!r.on}" aria-label="Include"></button>
      <div class="grow"><div class="t">${esc(r.merchant||r.desc.slice(0,28)||'Bank entry')}</div><div class="s">${dShort(r.date)} · ${esc(r.desc.slice(0,48))}</div>
      <select class="input tsel" data-stmcat="${idx}" aria-label="Category">${cats.map(c=>`<option value="${c.id}" ${c.id===r.cat?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
      <b class="num ${r.dir==='in'?'':''}" style="${r.dir==='in'?'color:var(--good)':''}">${r.dir==='in'?'+':''}${fmt(r.amt)}</b></div>`}).join('')}</div>
    <button class="btn primary block" style="margin-top:12px" data-act="stmsave" ${on.length?'':'disabled'}>Add ${on.length} entr${on.length===1?'y':'ies'}</button>`
    :`<p class="small" style="margin:14px 0 0">Everything on this statement is already in Paisa. Nice.</p><button class="btn primary block" style="margin-top:12px" data-act="close">Done</button>`}`);
}
async function stmLoad(file){
  STM.acct=$('#stm-acct')?$('#stm-acct').value:STM.acct;const r=await stmRead(file);if(!r)return;
  STM={...STM,step:'review',rows:stmMatch(r.rows,STM.acct),closing:r.closing,lastDate:r.lastDate};renderStm();
}
async function stmSave(){
  const S0=STM;document.querySelectorAll('[data-stmcat]').forEach(s=>{S0.rows[+s.dataset.stmcat].cat=s.value});
  const add=S0.rows.filter(r=>!r.match&&r.on&&r.cat&&D.cats[r.cat]);if(!add.length)return;const now=Date.now();
  const ops=add.map((r,i)=>({col:'tx',id:uid()+i,data:{byName:MYNAME||'',cat:r.cat,amt:r.amt,date:r.date,mode:/upi/i.test(r.desc)?'UPI':'Net banking',note:r.merchant||r.desc.slice(0,40),card:'',acct:S0.acct,src:'statement',by:ME||'local',at:now,ub:ME||'local',uat:now}}));
  closeSheet();try{await bulkSet(ops)}catch(e){writeErr(e);return}
  const ids=ops.map(o=>o.id);log('added','statement entries',`${add.length} from ${acctName(S0.acct)}`);
  const ok=S0.closing!=null&&S0.lastDate&&acctBalanceAt(S0.acct,addDays(S0.lastDate,1))===S0.closing;
  if(ok&&S0.lastDate>=addDays(todayISO(),-2))store.set('accounts',S0.acct,{...D.accounts[S0.acct],checkedAt:todayISO()}).catch(()=>{});
  toast(`Added ${add.length} entr${add.length===1?'y':'ies'} from the statement.${ok?' Balance matches the bank.':''}`,{action:'Undo',ms:10000,fn:()=>bulkSet(ids.map(id=>({col:'tx',id,data:null}))).catch(()=>{})});
  STM=null;
}
