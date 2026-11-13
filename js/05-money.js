/* Paisa Planner · money: bank accounts, transfers, repeats, split, share, net worth.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= v2: bank accounts, self transfer, recurring, split, share, net worth ================= */
const BANKS=['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra Bank','Bank of Baroda','Punjab National Bank','Canara Bank','Union Bank of India','IDFC FIRST Bank','IndusInd Bank','Yes Bank','Federal Bank','AU Small Finance Bank','Bank of India','Indian Bank','Central Bank of India','IDBI Bank','RBL Bank','Paytm Payments Bank','Airtel Payments Bank','Other'];
const ACCT_TYPES=['Savings','Salary','Current','Cash','Wallet'];
const ASSET_TYPES=['Fixed deposit','Recurring deposit','PPF','EPF','NPS','Mutual funds','Stocks','Gold','Property','Other'];
const isXfer=t=>t&&t.type==='xfer';
const hideInc=()=>!!(S()&&S().hideIncome&&(ROLE==='Member'||ROLE==='Viewer'));
function acctList(all){return Object.entries(D.accounts||{}).map(([id,a])=>({...a,id})).filter(a=>all||!a.archived).sort((a,b)=>(b.isDefault?1:0)-(a.isDefault?1:0)||(a.bank||'').localeCompare(b.bank||''))}
function acctLabel(a){if(!a)return'';return (a.nick||a.bank||'Account')+(a.last4?' ••'+a.last4:'')}
const acctById=id=>id&&D.accounts&&D.accounts[id]?{...D.accounts[id],id}:null;
function acctName(id){if(!id)return'';if(String(id).startsWith('card:')){const c=D.cards[id.slice(5)];return c?c.name+' card':'Card'}const a=acctById(id);return a?acctLabel(a):'Removed account'}
function defaultAcct(mode){
  const L=acctList();if(!L.length)return'';
  if(mode==='Cash'){const c=L.find(a=>a.type==='Cash');if(c)return c.id}
  const last=lsGet('paisa-lastacct');if(last&&L.some(a=>a.id===last))return last;
  return(L.find(a=>a.isDefault)||L[0]).id;
}
// balance = what was there on the "as of" day + adjustments from balance checks + every entry since
function acctBalance(id){
  memo.bal=memo.bal||{};if(memo.bal[id]!=null)return memo.bal[id];
  const a=D.accounts[id];if(!a)return 0;let b=(a.opening||0)+(a.adj||0);const since=a.asOf||'0000-00-00';
  for(const t of Object.values(D.tx)){
    if(!t||t.date<since)continue;
    if(t.date===since&&a.createdAt&&(t.at||0)<a.createdAt)continue;
    if(isXfer(t)){if(t.to===id)b+=t.amt;if(t.from===id)b-=t.amt;continue}
    if(t.acct!==id||t.mode==='Card')continue;
    const c=D.cats[t.cat];if(!c)continue;b+=c.section==='income'?t.amt:-t.amt;
  }
  return memo.bal[id]=b;
}

function acctBalanceAt(id,date){
  const a=D.accounts[id];if(!a)return 0;if(a.asOf&&date<a.asOf)return null;let b=(a.opening||0)+(a.checkedAt&&a.checkedAt<date?(a.adj||0):0);const since=a.asOf||'0000-00-00';
  for(const t of Object.values(D.tx)){if(!t||t.date<since||t.date>=date)continue;if(t.date===since&&a.createdAt&&(t.at||0)<a.createdAt)continue;
    if(isXfer(t)){if(t.to===id)b+=t.amt;if(t.from===id)b-=t.amt;continue}
    if(t.acct!==id||t.mode==='Card')continue;const c=D.cats[t.cat];if(!c)continue;b+=c.section==='income'?t.amt:-t.amt}
  return b;
}
// What the banks held when month k began, minus what was still owed on cards: the month's real starting money
function bankStart(k){
  const L=acctList();if(!L.length)return null;const d=mStart(k);let s=0;
  for(const a of L){const v=acctBalanceAt(a.id,d);if(v==null)return null;s+=v}
  const pk=addM(k,-1);Object.values(D.cards).forEach(c=>{const st=c.stmts&&c.stmts[pk];if(st)s-=Math.max(0,(st.amt||0)-(st.paid||0))});
  return s;
}
/* ---- accounts screen ---- */
function accountsBody(){
  const L=acctList();const tot=L.reduce((s,a)=>s+acctBalance(a.id),0);
  if(!L.length)return `<p class="heroline" style="margin:0">Add your bank accounts to see each balance and pick the account on every entry. Only the bank and last 4 digits are kept, never the full number.</p>${canAdmin()?'<button class="btn primary block" data-act="editacct">+ Add bank account</button>':''}`;
  return `<section class="bsum"><div class="label">Across ${L.length} account${L.length>1?'s':''}</div><div class="num" style="font-weight:700;font-size:28px;letter-spacing:-.02em">${fmt(tot)}</div></section>
  <section class="sect">${L.map(a=>{const bal=acctBalance(a.id);return `<div class="row">${icon({name:a.type==='Cash'?'cash':'bank',section:'debt'})}<div class="grow"><div class="t">${esc(acctLabel(a))}${a.isDefault?' <span class="pill p-up">Default</span>':''}</div><div class="s">${esc(a.bank||'')} · ${esc(a.type||'Savings')}${a.checkedAt?' · checked '+dShort(a.checkedAt):''}</div></div><div class="amt num ${bal<0?'over':''}">${fmt(bal)}</div>${canAdmin()?`<button class="btn sm" data-act="checkacct" data-id="${a.id}">Check</button><button class="x sm" data-act="editacct" data-id="${a.id}" aria-label="Edit ${esc(acctLabel(a))}">✎</button>`:''}</div>`}).join('')}</section>
  ${canAdmin()?'<button class="btn block" data-act="editacct">+ Add bank account</button>':''}
  <p class="small muted" style="margin:0 2px">Balances count entries since each account was added. Moving money between your own accounts? Use <b>Self transfer</b> in Add entry.</p>`;
}
function openAccount(id){
  const a=id?acctById(id):{bank:'',type:'Savings',nick:'',last4:'',isDefault:!acctList().length};
  const bal=id?acctBalance(id):null;const known=BANKS.includes(a.bank);
  openSheet(`${sheetHead(id?'Edit account':'Add bank account')}
    <div class="field"><label for="ac-bank">Bank</label><select class="input" id="ac-bank">${BANKS.map(b=>`<option ${a.bank===b||(!known&&b==='Other'&&a.bank)?'selected':''}>${b}</option>`).join('')}</select></div>
    <div class="field" id="ac-other-wrap" ${known||!a.bank?'hidden':''}><label for="ac-other">Bank name</label><input class="input" id="ac-other" value="${known?'':esc(a.bank)}"></div>
    <div class="flabel" style="margin-bottom:6px">Type</div><div class="chips" style="margin-bottom:12px">${ACCT_TYPES.map(x=>`<button class="chip" data-act="actype" data-k="${x}" aria-pressed="${(a.type||'Savings')===x}">${x}</button>`).join('')}</div>
    <div class="two"><div class="field"><label for="ac-last4">Last 4 digits</label><input class="input num" id="ac-last4" inputmode="numeric" maxlength="4" value="${esc(a.last4||'')}" placeholder="4821"></div>
    <div class="field"><label for="ac-nick">Nickname <span class="muted">(optional)</span></label><input class="input" id="ac-nick" value="${esc(a.nick||'')}" placeholder="Salary account"></div></div>
    <div class="field"><label for="ac-bal">Balance today (₹)</label><input class="input num" id="ac-bal" inputmode="decimal" value="${bal!=null?rupees(bal):''}" placeholder="What your bank app shows"></div>
    <label class="check" style="border:0"><input type="checkbox" id="ac-def" ${a.isDefault?'checked':''}><span class="small">Use this account by default</span></label>
    <p class="small muted" style="margin:4px 0 12px">Only the last 4 digits are stored, never the full account number.</p>
    <button class="btn primary block" data-act="saveacct" data-id="${id||''}">Save</button>
    ${id?`<button class="btn block" style="margin-top:8px" data-act="stmmatch" data-id="${id}">Match a bank statement…</button>`:''}
    ${id?`<button class="btn block" style="margin-top:8px" data-act="acctdel" data-id="${id}">Delete account and its entries…</button>`:''}
    ${id?`<button class="btn danger block" style="margin-top:8px" data-act="archacct" data-id="${id}">Remove account</button>`:''}`);
  ACTYPE=a.type||'Savings';
}
let ACTYPE='Savings';
async function saveAccount(id){
  let bank=val('ac-bank');if(bank==='Other')bank=val('ac-other').trim()||'Other bank';
  const last4=val('ac-last4').replace(/\D/g,'');if(last4&&last4.length!==4){toast('Enter exactly 4 digits, or leave it empty.');return}
  const bal=amtOrNull('ac-bal');const def=$('#ac-def').checked;
  const writes=[];
  if(def)acctList().forEach(x=>{if(x.id!==id&&x.isDefault){const o={...D.accounts[x.id],isDefault:false};writes.push(store.set('accounts',x.id,o))}});
  let o;
  if(id){o={...D.accounts[id],bank,type:ACTYPE,nick:val('ac-nick').trim(),last4,isDefault:def};if(bal!=null){const cur=acctBalance(id);if(bal!==cur){o.adj=(o.adj||0)+(bal-cur);o.checkedAt=todayISO()}}}
  else o={bank,type:ACTYPE,nick:val('ac-nick').trim(),last4,isDefault:def,opening:bal||0,asOf:todayISO(),createdAt:Date.now(),adj:0,checkedAt:todayISO(),archived:false};
  const nid=id||uid();closeSheet();writes.push(store.set('accounts',nid,o));
  await Promise.allSettled(writes);log(id?'edited':'added','account',acctLabel(o));toast(id?'Account saved.':'Account added. Pick it on your next entry.');
}
function openCheck(id){
  const a=acctById(id);const bal=acctBalance(id);
  openSheet(`${sheetHead('Check balance')}<p class="onb-q" style="font-size:20px;margin:0 0 6px">Does ${esc(acctLabel(a))} show ${fmt(bal)}?</p><p class="small muted" style="margin:0 0 14px">Open your bank app and compare. Small differences are normal if something wasn't logged.</p>
    <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="checkyes" data-id="${id}">Yes, it matches</button></div>
    <div class="field"><label for="ck-bal">No, it shows (₹)</label><input class="input num" id="ck-bal" inputmode="decimal" placeholder="${rupees(bal)}"></div>
    <button class="btn block" data-act="checkfix" data-id="${id}">Next</button>`);
}
function openCheckDiff(id,v){
  const a=acctById(id),cur=acctBalance(id),d=v-cur;const out=d<0;
  const cats=catsAll().filter(c=>!c.archived&&(out?c.section==='expenses':c.section==='income'));const def=(cats.find(c=>/misc/i.test(c.name))||cats[0]||{}).id;
  openSheet(`${sheetHead('Bank shows '+fmt(v))}<p class="small" style="margin-top:0">Paisa has ${fmt(cur)} for ${esc(acctLabel(a))}, so ${fmt(Math.abs(d))} ${out?'went out':'came in'} without an entry.</p>
    ${cats.length?`<div class="field"><label for="ck-cat">Log it as ${out?'spending':'income'} in</label><select class="input" id="ck-cat">${cats.map(c=>`<option value="${c.id}" ${c.id===def?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <button class="btn primary block" data-act="checklog" data-id="${id}" data-k="${v}">Log ${fmt(Math.abs(d))} ${out?'spent':'received'}</button>
    <p class="small muted" style="margin:6px 2px 12px">Best when you know money moved but didn't log it: your budget and left to spend stay true.</p>`:''}
    <button class="btn block" data-act="checkadj" data-id="${id}" data-k="${v}">Only correct the balance</button>
    <p class="small muted" style="margin:6px 2px 0">For bank charges or interest you don't want in the budget.</p>`);
}

/* ---- recurring entries ---- */
function recList(){return Object.entries(D.recurring||{}).map(([id,r])=>({...r,id})).filter(r=>D.cats[r.cat])}
function recDue(k){
  if(k!==curKey())return[];const t=todayISO();const skip=(D.bills[k]&&D.bills[k].skipRec)||{};const list=(txIndex()[k]||{list:[]}).list;
  return recList().filter(r=>r.active!==false).map(r=>{const c=D.cats[r.cat];return{...r,c,date:dueDate({dueDay:r.day||1},k)}})
    .filter(r=>!((r.c.section==='bills'||r.c.section==='debt')&&r.c.dueDay))        // bills use the Bills list instead
    .filter(r=>r.date<=t&&!skip[r.id]&&!list.some(x=>x.rec===r.id||(x.cat===r.cat&&r.c.section==='income'&&x.amt===r.amt)))
    .sort((a,b)=>a.date.localeCompare(b.date));
}
function recForCat(cat){return recList().find(r=>r.cat===cat&&r.active!==false)}
function confirmRec(id){
  const r=D.recurring[id];if(!r||!D.cats[r.cat])return;const k=curKey();const date=dueDate({dueDay:r.day||1},k);const now=Date.now();
  const obj={byName:MYNAME||'',cat:r.cat,amt:r.amt,date,mode:r.mode||'Net banking',note:r.note||'',card:'',acct:r.acct||'',rec:id,src:'recurring',by:ME||'local',at:now,ub:ME||'local',uat:now};
  const tid=uid();store.set('tx',tid,obj).then(()=>log('confirmed','repeat',`${D.cats[r.cat].name} ${fmt(r.amt)}`)).catch(()=>{});
  toast(`Added ${fmt(r.amt)} · ${D.cats[r.cat].name}.`,{action:'Undo',ms:5000,fn:()=>store.del('tx',tid).catch(()=>{})});
}
function recBody(){
  const L=recList();
  return `<p class="heroline" style="margin:0">Salary, SIPs, rent and EMIs that happen every month. They appear on Home on their day for a one-tap confirm, and fill in the amount when you mark a bill paid.</p>
  ${L.length?`<section class="sect">${L.map(r=>{const c=D.cats[r.cat];return `<div class="row">${icon(c)}<div class="grow"><div class="t">${esc(r.note||c.name)}${r.active===false?' <span class="pill p-up">Paused</span>':''}</div><div class="s">Every month on the ${r.day||1}${['th','st','nd','rd'][((r.day||1)%10<4&&Math.floor((r.day||1)/10)!==1)?(r.day||1)%10:0]} · ${esc(r.mode||'')}${r.acct?' · '+esc(acctName(r.acct)):''}</div></div><div class="amt num">${fmt(r.amt)}</div>${canAdmin()?`<button class="x sm" data-act="editrec" data-id="${r.id}" aria-label="Edit">✎</button>`:''}</div>`}).join('')}</section>`:''}
  ${canAdmin()?'<button class="btn block" data-act="editrec">+ Add a repeat</button>':''}`;
}
let RECTYPE='out';
function openRec(id,pre={}){
  const r=id?{...D.recurring[id]}:{cat:'',amt:null,day:1,mode:'UPI',acct:defaultAcct(),note:'',active:true,...pre};
  if(!id&&pre.cat&&D.cats[pre.cat])RECTYPE=D.cats[pre.cat].section==='income'?'in':'out';else if(id)RECTYPE=D.cats[r.cat]&&D.cats[r.cat].section==='income'?'in':'out';
  const cats=catsAll().filter(c=>!c.archived&&(RECTYPE==='in'?c.section==='income':c.section!=='income'));
  const accts=acctList();
  openSheet(`${sheetHead(id?'Edit repeat':'New repeat')}
    ${id?'':`<div class="seg" role="group" style="margin-bottom:12px"><button data-act="rectype" data-k="out" aria-pressed="${RECTYPE==='out'}">Expense</button><button data-act="rectype" data-k="in" aria-pressed="${RECTYPE==='in'}">Income</button></div>`}
    <div class="field"><label for="rc-cat">Category</label><select class="input" id="rc-cat">${cats.map(c=>`<option value="${c.id}" ${r.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="two"><div class="field"><label for="rc-amt">Amount (₹)</label><input class="input num" id="rc-amt" inputmode="decimal" value="${rupees(r.amt)}"></div>
    <div class="field"><label for="rc-day">Day of the month</label><input class="input num" id="rc-day" inputmode="numeric" value="${r.day||1}"></div></div>
    <div class="two"><div class="field"><label for="rc-mode">${RECTYPE==='in'?'Received by':'Paid by'}</label><select class="input" id="rc-mode">${(RECTYPE==='in'?MODES.filter(x=>x!=='Card'):MODES).map(x=>`<option ${r.mode===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="rc-acct">Account</label><select class="input" id="rc-acct"><option value="">Not set</option>${accts.map(a=>`<option value="${a.id}" ${r.acct===a.id?'selected':''}>${esc(acctLabel(a))}</option>`).join('')}</select></div></div>
    <div class="field"><label for="rc-note">Name <span class="muted">(optional)</span></label><input class="input" id="rc-note" value="${esc(r.note||'')}" placeholder="e.g. Axis SIP"></div>
    ${id?`<label class="check" style="border:0"><input type="checkbox" id="rc-on" ${r.active!==false?'checked':''}><span class="small">Active</span></label>`:''}
    <button class="btn primary block" style="margin-top:8px" data-act="saverec" data-id="${id||''}">Save</button>
    ${id?`<button class="btn danger block" style="margin-top:8px" data-act="delrec" data-id="${id}">Delete repeat</button>`:''}`);
}
function saveRec(id){
  const cat=val('rc-cat');const amt=amtOrNull('rc-amt');const day=parseInt(val('rc-day'),10);
  if(!cat){toast('Pick a category.');return}if(!(amt>0)){toast('Enter the usual amount.');return}if(!(day>=1&&day<=31)){toast('Day must be between 1 and 31.');return}
  const o={cat,amt,day,mode:val('rc-mode'),acct:val('rc-acct'),note:val('rc-note').trim(),active:id?$('#rc-on').checked:true};
  closeSheet();store.set('recurring',id||uid(),o).then(()=>log(id?'edited':'added','repeat',D.cats[cat].name+' '+fmt(amt))).catch(()=>{});
  toast(id?'Repeat saved.':'Repeat added. It will appear on Home on the '+ordinal(day)+'.');
}

/* ---- share an SMS or payment message to Paisa (Android) ---- */
const SHARED=(()=>{try{const q=new URLSearchParams(location.search);const t=[q.get('title'),q.get('text'),q.get('url')].filter(Boolean).join(' ').trim();return t||null}catch(e){return null}})();
function parseShared(s){
  const out={};const txt=s.replace(/\s+/g,' ');
  const m=txt.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i)||txt.match(/(?:debited|credited|paid|sent|received|spent)\s+(?:by|with|for|of)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if(m)out.amt=String(parseFloat(m[1].replace(/,/g,'')));
  if(/credited|received|deposited|refund/i.test(txt)&&!/debited/i.test(txt))out.type='in';else out.type='out';
  const card=txt.match(/card\s*(?:no\.?|ending|xx|\*+)?\s*[x*]*\s*(\d{4})/i);if(card&&out.type==='out'){out.mode='Card';const cid=Object.entries(D.cards).find(([i,c])=>(c.name||'').includes(card[1]));if(cid)out.card=cid[0]}
  const ac=txt.match(/(?:a\/c|acct|account|ac)\s*(?:no\.?)?\s*[x*]*\s*(\d{3,4})/i);if(ac){const a=acctList().find(x=>x.last4&&x.last4.endsWith(ac[1].slice(-4)));if(a)out.acct=a.id}
  const vpa=txt.match(/([a-z0-9._-]{3,})@[a-z]{2,}/i);
  const to=txt.match(/(?:\bto\b|\bat\b|\btowards\b|\bfrom\b)\s+([A-Za-z][A-Za-z0-9&.' -]{1,28}?)(?=\s+(?:on|via|using|ref|upi|for|a\/c|avl|bal)\b|[.,;]|$)/i);
  if(to)out.note=to[1].trim();else if(vpa)out.note=vpa[1].replace(/[._-]+/g,' ').replace(/\d+/g,'').trim();
  if(out.note)out.note=out.note.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).slice(0,40);
  if(/upi/i.test(txt)&&!out.mode)out.mode='UPI';
  return out;
}
function openShared(){
  if(!SHARED||!S()||!canWrite())return;const p=parseShared(SHARED);
  openQuick({type:p.type,amt:p.amt||'',note:p.note||'',mode:p.mode||(p.type==='in'?'Net banking':'UPI'),card:p.card||'',acct:p.acct||defaultAcct(p.mode),more:!p.amt});
  if(p.note&&p.type==='out'){const mm=merchantMemory()[p.note.toLowerCase()];if(mm){QA.cat=mm.cat;QA.guessed=true;renderQuick()}}
  toast(p.amt?'Filled in from the message you shared. Check and save.':"Couldn't find an amount in that message. Type it in.");
}

/* ---- net worth ---- */
function cardDues(){const k=curKey();return Object.values(D.cards).reduce((s,c)=>{const st=(c.stmts||{})[k]||(c.stmts||{})[addM(k,-1)];return s+(st?Math.max(0,(st.amt||0)-(st.paid||0)):0)},0)}
function assetList(){return Object.entries(D.assets||{}).filter(([id,a])=>a.kind!=='snap').map(([id,a])=>({...a,id}))}
function netWorth(){
  const acc=acctList().reduce((s,a)=>s+acctBalance(a.id),0),ast=assetList().reduce((s,a)=>s+(a.value||0),0);
  const loans=Object.values(D.loans).reduce((s,l)=>s+loanOutstanding(l),0),cards=cardDues();
  return{acc,ast,loans,cards,total:acc+ast-loans-cards};
}
function nwBody(){
  const n=netWorth();const snaps=Object.entries(D.assets||{}).filter(([id,a])=>a.kind==='snap').map(([id,a])=>a).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
  const prev=snaps.filter(s=>s.month<curKey()).pop();
  return `<section class="bsum"><div class="label">Net worth</div><div class="num" style="font-weight:700;font-size:30px;letter-spacing:-.02em;${n.total<0?'color:var(--bad)':''}">${fmt(n.total)}</div>
    ${prev?`<div class="small ${n.total>=prev.nw?'':'over'}" style="${n.total>=prev.nw?'color:var(--good)':''}">${n.total>=prev.nw?'Up':'Down'} ${fmt(Math.abs(n.total-prev.nw))} since ${mLong(prev.month)}</div>`:'<div class="small muted">What you own minus what you owe.</div>'}</section>
  <section class="sect"><div class="kv"><span>Bank and cash</span><b class="num">${fmt(n.acc)}</b></div><div class="kv"><span>Savings and investments</span><b class="num">${fmt(n.ast)}</b></div>
    <div class="kv"><span>Loans still owed</span><b class="num">−${fmt(n.loans).replace('−','')}</b></div><div class="kv"><span>Credit card dues</span><b class="num">−${fmt(n.cards).replace('−','')}</b></div></section>
  <section class="sect"><div class="sect-head"><h2>Investments and assets</h2></div>
    ${assetList().map(a=>`<div class="row">${icon({name:/gold/i.test(a.type)?'gold':'invest',section:'savings'})}<div class="grow"><div class="t">${esc(a.name||a.type)}</div><div class="s">${esc(a.type)}${a.asOf?' · updated '+dShort(a.asOf):''}</div></div><div class="amt num">${fmt(a.value)}</div>${canAdmin()?`<button class="x sm" data-act="editasset" data-id="${a.id}" aria-label="Edit">✎</button>`:''}</div>`).join('')||'<p class="small muted" style="margin:4px 0">Add FDs, PPF, EPF, mutual funds, gold or property. Update the values every few months.</p>'}
    ${canAdmin()?'<button class="btn block" style="margin-top:8px" data-act="editasset">+ Add investment or asset</button>':''}</section>
  ${snaps.length>1?`<section class="sect"><h2 style="margin-bottom:6px">Last ${snaps.length} months</h2>${snaps.map(s=>`<div class="kv small"><span>${mLabel(s.month)}</span><span class="num">${fmt(s.nw)}</span></div>`).join('')}</section>`:''}`;
}
function ensureSnapshot(){if(!canAdmin())return;const k=curKey(),id='snap-'+k;const n=netWorth().total;const cur=D.assets&&D.assets[id];if(cur&&cur.nw===n)return;store.set('assets',id,{kind:'snap',month:k,nw:n}).catch(()=>{})}
function openAsset(id){
  const a=id?{...D.assets[id]}:{type:'Fixed deposit',name:'',value:null};
  openSheet(`${sheetHead(id?'Update value':'Add investment or asset')}
    <div class="field"><label for="as-type">Type</label><select class="input" id="as-type">${ASSET_TYPES.map(x=>`<option ${a.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="as-name">Name <span class="muted">(optional)</span></label><input class="input" id="as-name" value="${esc(a.name||'')}" placeholder="e.g. SBI FD, Parag Parikh fund"></div>
    <div class="field"><label for="as-val">Value today (₹)</label><input class="input num" id="as-val" inputmode="decimal" value="${rupees(a.value)}"></div>
    <button class="btn primary block" data-act="saveasset" data-id="${id||''}">Save</button>
    ${id?`<button class="btn danger block" style="margin-top:8px" data-act="delasset" data-id="${id}">Remove</button>`:''}`);
}

/* ---- yearly payments (insurance, school fees, taxes): monthly set-aside ---- */
function yearlyCalc(g){
  const now=curKey();const[cy,cm]=now.split('-').map(Number);let due=ym(cy,g.month||cm);if(due<now)due=ym(cy+1,g.month||cm);
  const[dy,dm]=due.split('-').map(Number);const months=Math.max(1,(dy-cy)*12+(dm-cm));
  const left=Math.max(0,(g.amount||0)-(g.saved||0));return{due,months,monthly:Math.ceil(left/months/100)*100,prog:g.amount?clamp((g.saved||0)/g.amount,0,1):0};
}

/* ---- one insight on Home ---- */
function insightHTML(k){
  if(k!==curKey())return'';const total=daysBetween(mStart(k),mEnd(k))+1,gone=daysBetween(mStart(k),todayISO())+1;if(gone<7)return'';
  const f=gone/total;const prev=[1,2,3].map(i=>addM(k,-i)).filter(x=>txIndex()[x]);if(prev.length<2)return'';
  const m=month(k);let best=null;
  m.cats.filter(c=>c.section==='expenses').forEach(c=>{const avg=prev.reduce((s,x)=>s+((txIndex()[x].byCat[c.id])||0),0)/prev.length;if(avg<100000)return;const proj=c.actual/f;const d=proj/avg-1;if(d>=.3&&proj-avg>=100000&&(!best||d>best.d))best={c,avg,proj,d}});
  if(best&&!dismissed('ins:'+best.c.id,k))return `<div class="insight"><span class="grow"><b>${esc(best.c.name)}</b> is heading ${Math.round(best.d*100)}% above your usual ${fmt(Math.round(best.avg/10000)*10000)}.</span><button class="x sm" data-act="dismsg" data-k="ins:${best.c.id}" aria-label="Hide">×</button></div>`;
  const avgAll=prev.reduce((s,x)=>s+month(x).sec.expenses.a,0)/prev.length;const projAll=m.sec.expenses.a/f;
  if(avgAll>0&&projAll<avgAll*.85&&!dismissed('ins:good',k))return `<div class="insight good"><span class="grow">Everyday spending is ${Math.round((1-projAll/avgAll)*100)}% below your usual. Nice.</span><button class="x sm" data-act="dismsg" data-k="ins:good" aria-label="Hide">×</button></div>`;
  return'';
}
