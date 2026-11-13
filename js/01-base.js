/* Paisa Planner · base: constants, formatting, store, money calculations, rendering.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= constants ================= */
const SECTIONS=[
  {k:'income',n:'Income'},{k:'savings',n:'Savings & Investments'},{k:'bills',n:'Bills'},
  {k:'expenses',n:'Expenses'},{k:'debt',n:'Debt / EMIs'}];
const SECN=Object.fromEntries(SECTIONS.map(s=>[s.k,s.n]));
const OUT=['savings','bills','expenses','debt'];
const MODES=['UPI','Card','Cash','Net banking','Auto-debit'];
const COLS=['settings','cats','tx','months','bills','loans','cards','goals','log','accounts','recurring','assets','trash'];
const ROUTES=['home','transactions','budget','plan','more','family','bills','reports','prefs','pushsetup','help','habits'];

/* ================= utils ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const INR=new Intl.NumberFormat('en-IN',{maximumFractionDigits:0});
function fmt(p,o={}){const v=Math.round((p||0)/100);const s=INR.format(Math.abs(v));if(v<0)return '−₹'+s;return (o.plus&&v>0?'+':'')+'₹'+s}
function fmtShort(p){const v=Math.abs((p||0)/100);let s;if(v>=1e7)s=(v/1e7).toFixed(v>=1e8?0:1)+'Cr';else if(v>=1e5)s=(v/1e5).toFixed(v>=1e6?0:1)+'L';else if(v>=1e3)s=(v/1e3).toFixed(v>=1e4?0:1)+'k';else s=String(Math.round(v));return (p<0?'−':'')+'₹'+s.replace('.0','')}
function parseAmt(s){if(s==null)return NaN;s=String(s).replace(/[₹,\s]/g,'');if(s==='')return NaN;const n=Number(s);return isFinite(n)?Math.round(n*100):NaN}
const rupees=p=>p==null?'':String(Math.round(p)/100);
// date and budget rules shared with the reminder service: supabase/functions/_shared/money-core.js
const {pad,dim,ym,addM,addDays,daysBetween}=PaisaCore;
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
const todayISO=()=>iso(new Date());
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mLabel(k){const[y,m]=k.split('-').map(Number);return MON[m-1]+' '+y}
function mLong(k){const[y,m]=k.split('-').map(Number);return MONL[m-1]}
function dLabel(ds){const[y,m,d]=ds.split('-').map(Number);const dt=new Date(y,m-1,d);return dt.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
function dShort(ds){const[y,m,d]=ds.split('-').map(Number);return d+' '+MON[m-1]}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};

/* ================= store ================= */
const D={};COLS.forEach(c=>D[c]={});
let ME=null,MODE='loading',ROLE='Owner',IS_OWNER=true;
let stale=false;
const NAMES={};
const queues={};
function enqueue(path,fn){const p=(queues[path]||Promise.resolve()).then(fn,fn);queues[path]=p.catch(()=>{});return p}
function writeErr(e){
  const c=e&&e.code;
  if(c==='invalid_argument')toast("Your role can't change this. Ask the family Owner or an Admin.");
  else if(c==='server'&&/docs_col_check/.test(e.message||''))toast('The database needs a one-time update for this. Owner: run supabase/v2.sql in Supabase.');
  else if(c==='server')toast(e.message||"Couldn't save.");
  else if(c==='quota_exceeded')toast('Storage is full. Delete old entries to add new ones.');
  else if(c==='revoked')toast('Your access to this budget was removed.');
  else toast("Couldn't save. Check your connection and try again.");
}
// set one field inside a record (path of keys); null removes it
function setDeep(o,path,v){const r=o&&typeof o==='object'?o:{};let cur=r;for(let i=0;i<path.length-1;i++){const k=path[i];if(!cur[k]||typeof cur[k]!=='object')cur[k]={};cur=cur[k]}const last=path[path.length-1];if(v==null)delete cur[last];else cur[last]=v;return r}
const store={
  // one field of a shared record (a month's budgets, bill marks, card statements): family edits merge instead of overwriting each other
  patch(col,id,path,value){
    const next=setDeep(D[col][id]?JSON.parse(JSON.stringify(D[col][id])):{},path,value);
    if(MODE==='local'){D[col]={...D[col],[id]:next};saveLocal();changed();return Promise.resolve()}
    D[col]={...D[col],[id]:next};cacheSoon();changed();
    return cloudPatch({col,id,path,value:value==null?null:value,patch:true}).catch(e=>{writeErr(e);throw e});
  },
  set(col,id,obj){
    if(MODE==='local'){D[col]={...D[col],[id]:obj};saveLocal();changed();return Promise.resolve()}
    if(MODE==='cloud'){D[col]={...D[col],[id]:obj};cacheSoon();changed();return cloudWrite({col,id,data:obj,deleted:false}).catch(e=>{writeErr(e);throw e})}
  },
  del(col,id){
    if(MODE==='local'){const n={...D[col]};delete n[id];D[col]=n;saveLocal();changed();return Promise.resolve()}
    if(MODE==='cloud'){const n={...D[col]};delete n[id];D[col]=n;cacheSoon();changed();return cloudWrite({col,id,data:null,deleted:true}).catch(e=>{writeErr(e);throw e})}
  }
};
function saveLocal(){try{localStorage.setItem('paisa-local',JSON.stringify(D))}catch(e){toast('This device is out of storage for the app. Back up, then delete old entries.')}}
function log(action,entity,detail){
  const id=uid();
  store.set('log',id,{at:Date.now(),user:ME||'local',action,entity,detail:String(detail||'').slice(0,160)}).catch(()=>{});
}

/* ================= calculations (single source of truth) ================= */
let memo={};
function changed(){memo={};scheduleRender()}
const S=()=>D.settings.main||null;
const sd=()=>(S()&&S().startDay)||1;
const keyOf=ds=>PaisaCore.keyOfWith(ds,sd());
const mStart=k=>PaisaCore.mStartWith(k,sd());
function mEnd(k){return addDays(mStart(addM(k,1)),-1)}
const curKey=()=>keyOf(todayISO());
function catsAll(){
  if(memo.cats)return memo.cats;
  const order=Object.fromEntries(SECTIONS.map((s,i)=>[s.k,i]));
  return memo.cats=Object.entries(D.cats).map(([id,c])=>({...c,id})).sort((a,b)=>(order[a.section]-order[b.section])||((a.order||0)-(b.order||0))||a.name.localeCompare(b.name));
}
const catById=id=>D.cats[id]?{...D.cats[id],id}:null;
function txIndex(){
  if(memo.ti)return memo.ti;
  const ti={};
  for(const[id,t]of Object.entries(D.tx)){
    if(!t||!t.date)continue;
    const k=keyOf(t.date);const e=ti[k]||(ti[k]={list:[],byCat:{}});
    e.list.push({...t,id});e.byCat[t.cat]=(e.byCat[t.cat]||0)+(t.amt||0);
  }
  for(const k in ti)ti[k].list.sort((a,b)=>b.date.localeCompare(a.date)||(b.at||0)-(a.at||0));
  return memo.ti=ti;
}
const budgetOf=(c,k)=>PaisaCore.budgetAt(c,c.id,k,D.months);
function opening(k){
  const s=S();if(!s)return 0;
  const ov=D.months[k]&&D.months[k].open;
  if(ov!=null)return ov;
  if(k<s.startMonth)return 0;
  if(k===s.startMonth)return s.opening||0;
  return month(addM(k,-1)).close;
}
// A card bill is a category linked to a card (cat.card). Older budgets with no links fall back to the name, once.
function cardLinks(){if(memo.cl)return memo.cl;const m={};Object.entries(D.cats).forEach(([id,c])=>{if(c&&c.card)m[id]=c.card});return memo.cl=m}
const cardOfCat=c=>PaisaCore.cardOfCat(c,D.cats,D.cards);
const isCardBill=c=>!!cardOfCat(c);
const paidToCard=(c,list)=>PaisaCore.paidToCard(c,D.cats,D.cards,list);
function month(k){
  memo.m=memo.m||{};
  if(memo.m[k])return memo.m[k];
  // compute earlier months iteratively first (avoids deep recursion)
  const s=S();
  if(s&&k>s.startMonth&&!memo.m[addM(k,-1)]){let p=s.startMonth;while(p<k){month(p);p=addM(p,1)}}
  const ti=txIndex()[k]||{list:[],byCat:{}};
  const cats=catsAll().filter(c=>!c.archived||ti.byCat[c.id]).map(c=>{
    const budget=budgetOf(c,k),actual=ti.byCat[c.id]||0;
    return{...c,budget,actual,left:budget-actual};
  });
  const sec={};SECTIONS.forEach(x=>sec[x.k]={b:0,a:0});
  cats.forEach(c=>{if(sec[c.section]){sec[c.section].b+=c.budget;sec[c.section].a+=c.actual}});
  const open=opening(k);
  const income=sec.income.a;
  const spent=OUT.reduce((t,x)=>t+sec[x].a,0);
  const planned=OUT.reduce((t,x)=>t+sec[x].b,0);
  const close=open+income-spent;
  // still to pay = budget not yet used on outflow categories
  // a card bill already paid by transfer to its card isn't still to pay (the purchases are counted as spent)
  const toPay=cats.filter(c=>OUT.includes(c.section)).reduce((t,c)=>t+Math.max(0,isCardBill(c)?c.left-paidToCard(c,ti.list):c.left),0);
  const incomeToCome=Math.max(0,sec.income.b-sec.income.a);
  return memo.m[k]={key:k,cats,sec,open,income,spent,planned,close,toPay,incomeToCome,list:ti.list,
    available:open+income,left:open+income-spent,projected:open+income+incomeToCome-spent-toPay};
}
// Commitments (bills + EMIs), savings, and what's free for everyday spending
function planParts(m){
  const by=k=>m.cats.filter(c=>c.section===k);const planOf=cs=>cs.reduce((s,c)=>s+Math.max(c.budget,c.actual),0);const done=cs=>cs.reduce((s,c)=>s+c.actual,0);
  const commitCats=[...by('bills'),...by('debt')];const commit=planOf(commitCats),commitPaid=Math.min(commit,done(commitCats)+commitCats.reduce((s,c)=>s+(isCardBill(c)?paidToCard(c,m.list):0),0));
  const save=planOf(by('savings')),saveDone=done(by('savings'));const inAvail=m.open+m.income+m.incomeToCome;
  const free=inAvail-commit-save,everyday=done(by('expenses'));
  return{inAvail,commit,commitPaid,save,saveDone,free,everyday,freeLeft:free-everyday};
}
const dueDate=(c,k)=>PaisaCore.dueDateWith(k,c.dueDay,sd());
function billsFor(k){
  const m=month(k),t=todayISO(),skip=(D.bills[k]&&D.bills[k].skip)||{};
  return m.cats.filter(c=>(c.section==='bills'||c.section==='debt')&&c.dueDay&&!c.archived).map(c=>{
    const due=dueDate(c,k);let st,label;
    const viaCard=paidToCard(c,m.list);
    if(c.actual>0||viaCard>0){st='paid';label='Paid';if(!c.actual)return{...c,actual:viaCard,due,st,label}}
    else if(skip[c.id]){st='skip';label='Skipped'}
    else{const dd=daysBetween(t,due);
      if(dd<0){st='overdue';label='Overdue '+(-dd)+'d'}
      else if(dd===0){st='due';label='Due today'}
      else if(dd<=3){st='due';label='Due in '+dd+'d'}
      else{st='up';label='Upcoming'}}
    return{...c,due,st,label};
  }).sort((a,b)=>a.due.localeCompare(b.due));
}
function loanCalc(P,annual,E){
  const i=annual/100/12;
  if(P<=0)return{n:0,interest:0};
  if(E<=0)return{err:'Add the EMI amount'};
  if(i===0){const n=Math.ceil(P/E);return{n,interest:Math.max(0,E*n-P)}}
  if(E<=i*P)return{err:'EMI too low to repay'};
  const n=Math.ceil(-Math.log(1-i*P/E)/Math.log(1+i));
  return{n,interest:Math.max(0,E*n-P)};
}
function loanOutstanding(l){
  // each EMI recorded after the "as of" date reduces the estimate
  let P=l.outstanding||0;const i=(l.rate||0)/100/12;
  if(!l.cat)return P;
  const paid=Object.values(D.tx).filter(t=>t.cat===l.cat&&t.date>(l.asOf||'')).length;
  for(let n=0;n<paid&&P>0;n++)P=Math.max(0,P-Math.max(0,(l.emi||0)-Math.round(P*i)));
  return P;
}
function cardStatus(st){if(!st||!st.amt)return null;const p=st.paid||0;if(p>=st.amt)return'full';if(p>0)return'part';return'none'}
function goalCalc(g){
  const prog=g.target>0?clamp((g.saved||0)/g.target,0,1):0;
  const rem=Math.max(0,(g.target||0)-(g.saved||0));
  const n=rem===0?0:(g.monthly>0?Math.ceil(rem/g.monthly):Infinity);
  let on=null;
  if(g.date&&isFinite(n)){on=addM(curKey(),n)<=g.date.slice(0,7)}else if(g.date)on=false;
  return{prog,n,on};
}
function chainKeys(){const s=S();if(!s)return[];const out=[];let k=s.startMonth;const last=[curKey(),...Object.keys(txIndex())].sort().pop();while(k<=last&&out.length<240){out.push(k);k=addM(k,1)}return out}

/* ================= permissions ================= */
const canWrite=()=>ROLE!=='Viewer';
const canAdmin=()=>ROLE==='Owner'||ROLE==='Admin';
const canEditTx=t=>canAdmin()||(ROLE==='Member'&&t.by===ME);
const who=id=>!id||id==='local'?'You':(id===ME?'You':(NAMES[id]||(MODE==='cloud'?'Former member':'Family member')));

/* ================= view state ================= */
let VM=null; // viewed month key
let route='home';
let planTab='accounts';
let F={cat:'',mode:'',q:''};
let reportYear=null;

/* ================= render plumbing ================= */
let rq=false,RENDER_WAITING=false;
const typing=()=>{const a=document.activeElement;return!!(a&&a.closest&&a.closest('#app')&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))};
// a sync from another phone shouldn't redraw the screen under someone's fingers
function scheduleRender(){if(typing()){RENDER_WAITING=true;return}if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;render()})}
document.addEventListener('focusout',()=>setTimeout(()=>{if(RENDER_WAITING&&!typing()){RENDER_WAITING=false;scheduleRender()}},0));
let LAST_ROUTE=null;
let PLAN_KEEP=false;
function setRoute(){let h=location.hash.slice(1);if(h!=='transactions')SEL=null;if(h!=='prefs'||!PREF_KEEP)PREFSEC=PREF_KEEP?PREFSEC:null;if(h==='add'){h='home';history.replaceState(null,'','#home');setTimeout(()=>{if(S()&&canWrite()&&!$('#sheetRoot').innerHTML)openQuick()},500)}route=ROUTES.includes(h)?h:'home';if(route==='plan'&&!PLAN_KEEP)planTab='accounts';PLAN_KEEP=false;PREF_KEEP=false;if(route!=='budget'){BEDIT=false;BDRAFT={}}window.scrollTo(0,0);render()}
window.addEventListener('hashchange',setRoute);

function render(){
  const app=$('#app');
  if(MODE==='loading'||MODE==='signin'||MODE==='nofamily'){return}
  if(MODE==='cloud'&&!DOCS_READY){$('#tabs').hidden=true;$('#fab').hidden=true;app.innerHTML='<div class="stack" aria-busy="true" aria-label="Loading your family budget" style="padding-top:72px"><div class="skel" style="height:14px;width:30%"></div><div class="skel" style="height:44px;width:60%"></div><div class="skel" style="height:40px"></div><div class="skel" style="height:12px"></div><div class="skel" style="height:140px;margin-top:16px"></div><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div></div>';return}
  if(!S()){
    $('#tabs').hidden=true;$('#fab').hidden=true;
    app.innerHTML=canAdmin()?onboardingHTML():`<div class="empty-state" style="padding-top:22vh"><div class="mark" style="margin:0 auto 14px">₹</div><h2>Budget not set up yet</h2><p>The family Owner needs to finish setup first. This page updates by itself once they do.</p></div>`;
    return;
  }
  if(!VM)VM=curKey();
  $('#tabs').hidden=false;$('#fab').hidden=!canWrite();
  renderTabs();
  const v={home:homeView,transactions:txView,budget:budgetView,plan:planView,family:MODE==='cloud'?familyCloudView:familyView,pushsetup:pushSetupView,more:moreView,bills:billsView,reports:reportsView,prefs:prefsView,help:helpView,habits:habitsView}[route]||homeView;
  const keepY=LAST_ROUTE===route?window.scrollY:0;
  app.innerHTML=v();
  if(LAST_ROUTE===route&&keepY)window.scrollTo(0,keepY);LAST_ROUTE=route;
  if(route==='transactions')renderTxList();
  if(SHARED&&!render.shareDone&&S()&&(MODE!=='cloud'||DOCS_READY)){render.shareDone=true;try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}setTimeout(openShared,400)}
  if(route==='home'&&!render.wrapTried&&(MODE!=='cloud'||DOCS_READY)){render.wrapTried=true;const pw=wrapDue();if(pw)setTimeout(()=>{if(!$('#sheetRoot').innerHTML&&route==='home')openWrap(pw)},800)}
}
function topbar(title,{month:showM=true,back=null}={}){
  return `<header class="topbar">${back?`<a class="x" href="#${back}" aria-label="Back" style="display:grid;place-items:center;text-decoration:none;color:inherit">‹</a>`:''}<h1>${esc(title)}</h1>${showM?monthSwitch():''}</header>${stale?`<div class="banner" style="margin-bottom:12px">Can't reach your data right now. Figures may be out of date.</div>`:''}${OFFLINE?`<div class="banner" style="margin-bottom:12px">You're offline. Everything still works and is saved on this device.</div>`:''}${PENDING&&MODE==='cloud'?`<div class="banner" style="margin-bottom:12px">${PENDING} change${PENDING>1?'s':''} waiting to sync. ${OFFLINE?'They will upload when you are back online.':'Uploading…'}</div>`:''}${UPDATE?`<div class="banner" style="margin-bottom:12px;display:flex;gap:10px;align-items:center"><span style="flex:1">A new version of the app is ready.</span><button class="btn sm primary" data-act="reload">Update</button></div>`:''}`;
}
function monthSwitch(){return `<div class="mswitch"><button data-act="mprev" aria-label="Previous month">‹</button><span class="num"><b class="ml">${mLabel(VM)}</b><b class="ms">${MON[+VM.slice(5)-1]} ’${VM.slice(2,4)}</b></span><button data-act="mnext" aria-label="Next month">›</button></div>`}
