/* Paisa Planner · sheets: add entry, editors, goals, import, export, warnings, reminders, iPhone viewport.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= sheets ================= */
let sheetClose=null;
function openSheet(html,{onClose}={}){
  const ex=$('#sheetRoot .sheet');
  // already open: swap the content in place (no replayed animation, scroll kept)
  if(ex){const y=ex.scrollTop;ex.innerHTML=html;ex.scrollTop=y}
  else $('#sheetRoot').innerHTML=`<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  sheetClose=onClose||null;
  // a field left focused on the page behind keeps the iPhone keyboard up and scrolls the page under the sheet
  const a=document.activeElement;if(a&&a!==document.body&&!$('#sheetRoot').contains(a)&&a.blur)a.blur();
  for(const id of ['app','tabs']){const n=document.getElementById(id);if(n)n.inert=true}
  const f=$('#sheetRoot [autofocus]');if(f)f.focus();
}
function closeSheet(){$('#sheetRoot').innerHTML='';for(const id of ['app','tabs']){const n=document.getElementById(id);if(n)n.inert=false}const c=sheetClose;sheetClose=null;QA=null;if(c)c()}
const sheetHead=t=>`<div class="sheet-h"><h2>${t}</h2><button class="x" data-act="close" aria-label="Close">×</button></div>`;

/* ---- Quick add ---- */
let QA=null;
function recentCats(){
  const seen=new Set(),out=[];
  Object.values(D.tx).sort((a,b)=>(b.at||0)-(a.at||0)).forEach(t=>{if(!seen.has(t.cat)&&D.cats[t.cat]&&!D.cats[t.cat].archived){seen.add(t.cat);out.push(t.cat)}});
  return out;
}
function recentRepeats(){
  const seen=new Set(),out=[];
  Object.values(D.tx).sort((a,b)=>(b.at||0)-(a.at||0)).some(t=>{const c=D.cats[t.cat];if(!c||c.archived||c.section==='income')return false;
    const key=t.cat+'|'+t.amt+'|'+(t.note||'').toLowerCase();if(seen.has(key))return false;seen.add(key);
    out.push({cat:t.cat,amt:t.amt,note:t.note||'',mode:t.mode||'UPI',card:t.card||'',label:t.note||c.name});return out.length>=6});
  return out;
}
function defaultCard(){const ids=Object.keys(D.cards);if(!ids.length)return'';const last=lsGet('paisa-lastcard');return ids.includes(last)?last:(ids.length===1?ids[0]:'')}
function openQuick(pre={}){
  const k=keyOf(todayISO());
  QA={amt:'',cat:null,date:VM===k?todayISO():mStart(VM),mode:'UPI',note:'',card:'',all:false,more:false,...pre};
  QA.type=QA.cat&&D.cats[QA.cat]&&D.cats[QA.cat].section==='income'?'in':(pre.type||'out');
  if(QA.type==='xfer'){if(!QA.from)QA.from=defaultAcct()}else if(!('acct' in pre))QA.acct=defaultAcct(QA.mode);
  renderQuick();
  QA.t0=performance.now();
}
function qSync(){if(!QA)return;const n=$('#q-note'),d=$('#q-date');if(n)QA.note=n.value.trim();if(d&&d.value)QA.date=d.value}
function lastIncomeCat(){const t=Object.values(D.tx).filter(x=>D.cats[x.cat]&&D.cats[x.cat].section==='income'&&!D.cats[x.cat].archived).sort((a,b)=>(b.at||0)-(a.at||0))[0];if(t)return t.cat;const c=catsAll().find(x=>x.section==='income'&&!x.archived);return c?c.id:null}
function renderQuick(){
  if(!QA)return;
  const editing=!!QA.id;const inc=QA.type==='in';const xf=QA.type==='xfer';
  if(!editing&&!inc&&!xf&&QA.amt&&(!QA.cat||QA.guessed)){const g=guessCat(parseAmt(QA.amt),QA.note);if(g){QA.cat=g;QA.guessed=true}}
  const cats=catsAll().filter(c=>!c.archived&&(inc?c.section==='income':c.section!=='income'));
  let top;
  if(inc)top=cats.map(c=>c.id);
  else{const rec=recentCats().filter(id=>D.cats[id].section!=='income');top=[...rec,...cats.filter(c=>c.section==='expenses').map(c=>c.id)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,8)}
  if(QA.cat&&!xf&&!top.includes(QA.cat))top.unshift(QA.cat);
  const chip=id=>{const c=D.cats[id];return c?`<button class="chip" data-act="qcat" data-id="${id}" aria-pressed="${QA.cat===id}"><svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[glyphFor(c)]}</svg>${esc(c.name)}</button>`:''};
  const reps=!editing&&!inc&&!xf&&!QA.amt?recentRepeats().slice(0,5):[];QA.reps=reps;
  const cardsL=Object.entries(D.cards);const accts=acctList();
  const t=todayISO();const dl=QA.date===t?'Today':QA.date===addDays(t,-1)?'Yesterday':dShort(QA.date);
  const cardName=QA.mode==='Card'&&QA.card&&D.cards[QA.card]?' · '+esc(D.cards[QA.card].name):'';
  const acctBit=!xf&&QA.mode!=='Card'&&QA.acct?' · '+esc(acctName(QA.acct)):'';
  const amtTxt=QA.amt?INR.format(Number(QA.amt.split('.')[0]))+(QA.amt.includes('.')?'.'+QA.amt.split('.')[1]:''):'0';
  const types=hideInc()?[['out','Expense'],['xfer','Self transfer']]:[['out','Expense'],['in','Income'],['xfer','Self transfer']];
  const head=QA.title||editing
    ?`<div class="sheet-h"><h2>${editing?(xf?'Edit transfer':'Edit entry'):esc(QA.title)}</h2><button class="x" data-act="close" aria-label="Close">×</button></div>`
    :`<div class="sheet-h"><div class="seg qtype" role="group" aria-label="Entry type">${types.map(([k,l])=>`<button data-act="qtype" data-k="${k}" aria-pressed="${QA.type===k}">${l}</button>`).join('')}</div><button class="x" data-act="close" aria-label="Close">×</button></div>`;
  const keypad=`<div class="keypad">${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(x=>`<button data-act="key" data-k="${x}" aria-label="${x==='⌫'?'Delete digit':x}">${x}</button>`).join('')}</div>`;
  const amtDisp=`<div class="amtdisp num ${QA.amt?'':'empty'} ${inc?'is-in':''}" id="q-amt">${inc&&QA.amt?'+':''}₹${amtTxt}</div>`;
  const meta=`<button class="qmeta" data-act="qmore" aria-expanded="${!!QA.more}"><span>${dl}${xf?'':' · '+QA.mode+cardName+acctBit} · ${QA.note?esc(QA.note):'<span class="muted">Add a note</span>'}</span>${CHEV}</button>`;
  const dateNote=`<div class="two"><div class="field"><label for="q-date">Date</label><input class="input" type="date" id="q-date" value="${QA.date}"></div>
      <div class="field"><label for="q-note">Note</label><input class="input" id="q-note" value="${esc(QA.note)}" placeholder="${xf?'e.g. Move to savings':inc?'e.g. November salary':'e.g. Swiggy'}" list="merchants" autocomplete="off"><datalist id="merchants">${Object.values(merchantMemory()).slice(-60).reverse().map(m=>`<option value="${esc(m.note)}"></option>`).join('')}</datalist></div></div>`;
  let body;
  if(xf){
    const targets=[...accts.map(a=>[a.id,acctLabel(a)]),...cardsL.map(([id,c])=>['card:'+id,'Pay '+c.name+' card'])];
    body=accts.length<1?`<p class="small" style="margin:0 0 10px">Add your bank accounts first, then move money between them here.</p>${canAdmin()?'<button class="btn primary block" data-act="editacct">Add bank account</button>':''}`:`
      ${amtDisp}${keypad}
      <div class="flabel" style="margin-bottom:6px">From</div><div class="hscroll">${accts.map(a=>`<button class="chip" data-act="qfrom" data-id="${a.id}" aria-pressed="${QA.from===a.id}">${esc(acctLabel(a))}</button>`).join('')}</div>
      <div class="flabel" style="margin-bottom:6px">To</div><div class="hscroll">${targets.filter(([id])=>id!==QA.from).map(([id,l])=>`<button class="chip" data-act="qto" data-id="${id}" aria-pressed="${QA.to===id}">${esc(l)}</button>`).join('')}</div>
      ${meta}${QA.more?`<div class="qdetails">${dateNote}</div>`:''}
      ${lsGet('paisa-hint-xfer')?'':('<p class="small muted" style="margin:10px 0 0">Moves money between your own accounts, so what\'s left to spend doesn\'t change. For an FD, RD or SIP, log an Expense under Savings instead.</p>')}
      <button class="btn primary block" style="margin-top:12px" data-act="qsave" ${(!QA.amt||!QA.from||!QA.to)?'disabled':''}>Save transfer${QA.from&&QA.to?' · '+esc(acctName(QA.from))+' → '+esc(acctName(QA.to)):''}</button>`;
  }else{
    const splitSum=(QA.split||[]).reduce((s,r)=>{const v=parseAmt(r.amt);return s+(isNaN(v)?0:v)},0);const total=parseAmt(QA.amt)||0;
    body=`${QA.text?`<div class="qtext"><input class="input" id="q-text" data-qtext autocomplete="off" enterkeyhint="done" placeholder='e.g. "350 swiggy" or paste a bank SMS' value="${esc(QA.qtext||'')}" aria-label="Type or paste an entry">
      <div class="btns" style="margin-top:8px">${navigator.clipboard&&navigator.clipboard.readText?'<button class="btn sm" data-act="qpaste">Paste SMS</button>':''}<button class="btn sm" data-act="qtextoff">Use keypad</button></div>
      <p class="small muted" id="q-text-hint" style="margin:8px 2px 0">${qtextHint()}</p></div>`
      :(editing?'':`<button class="link small qtextbtn" data-act="qtexton">Type or paste instead</button>`)}
    ${amtDisp}
    ${reps.length?`<div class="hscroll">${reps.map((r,i)=>`<button class="chip ghost" data-act="qrep" data-i="${i}">${esc(r.label)} <b class="num">${fmt(r.amt)}</b></button>`).join('')}</div>`:''}
    ${QA.text?'':keypad}
    ${QA.split?`<div class="splitbox"><div class="flabel" style="margin-bottom:6px">Split ${QA.amt?fmt(total):''} across categories</div>
      ${QA.split.map((r,i)=>`<div class="srow"><select class="input" data-split-cat="${i}" aria-label="Category ${i+1}">${cats.map(c=>`<option value="${c.id}" ${r.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><input class="input num" inputmode="decimal" data-split-amt="${i}" value="${esc(r.amt)}" placeholder="₹"><button class="x sm" data-act="splitdel" data-k="${i}" aria-label="Remove">×</button></div>`).join('')}
      <div class="btns" style="justify-content:space-between;align-items:center"><button class="link small" data-act="splitadd">+ Add category</button><span class="small ${splitSum===total?'':'over'}" id="split-left">${splitSum===total?'Adds up':(total-splitSum>0?fmt(total-splitSum)+' left to assign':fmt(splitSum-total)+' too much')}</span></div>
      <button class="link small" data-act="splitoff">Don't split</button></div>`
    :`<div class="hscroll">${top.map(chip).join('')}${!inc&&cats.length>top.length?`<button class="chip ghost" data-act="qall">${QA.all?'Less':'More'}</button>`:''}</div>
    ${QA.all&&!inc?SECTIONS.filter(s=>s.k!=='income').map(s=>{const cs=cats.filter(c=>c.section===s.k&&!top.includes(c.id));return cs.length?`<div class="small muted" style="margin:6px 0 4px;font-weight:600">${s.n}</div><div class="chips">${cs.map(c=>chip(c.id)).join('')}</div>`:''}).join(''):''}`}
    ${meta}
    ${QA.more?`<div class="qdetails">${dateNote}
      <div class="flabel" style="margin-bottom:6px">${inc?'Received by':'Paid by'}</div>
      <div class="chips" style="margin-bottom:8px">${(inc?MODES.filter(x=>x!=='Card'):MODES).map(x=>`<button class="chip" data-act="qmode" data-k="${x}" aria-pressed="${QA.mode===x}">${x}</button>`).join('')}</div>
      ${QA.mode==='Card'&&cardsL.length?`<div class="chips" style="margin-bottom:8px">${cardsL.map(([id,c])=>`<button class="chip" data-act="qcard" data-id="${id}" aria-pressed="${QA.card===id}">${esc(c.name)}</button>`).join('')}</div>`:''}
      ${QA.mode!=='Card'&&accts.length?`<div class="flabel" style="margin-bottom:6px">${inc?'Into account':'From account'}</div><div class="chips" style="margin-bottom:8px">${accts.map(a=>`<button class="chip" data-act="qacct" data-id="${a.id}" aria-pressed="${QA.acct===a.id}">${esc(acctLabel(a))}</button>`).join('')}</div>`:''}
      <div class="btns" style="margin-top:4px">${!inc&&!editing&&!QA.split?'<button class="link small" data-act="spliton">Split across categories</button>':''}
      ${canAdmin()&&!editing&&!QA.split?`<label class="check" style="border:0;padding:0"><input type="checkbox" id="q-repeat" ${QA.repeat?'checked':''}><span class="small">Repeats every month</span></label>`:''}</div>
    </div>`:''}
    <button class="btn primary block" style="margin-top:14px" data-act="qsave" ${(!QA.amt||(!QA.split&&!QA.cat)||(QA.split&&splitSum!==total))?'disabled':''}>${editing?'Save changes':inc?'Save income':QA.split?'Save split':'Save expense'}${QA.amt&&QA.cat&&!QA.split?' · '+esc(D.cats[QA.cat].name):''}</button>
    ${QA.guessed&&QA.cat&&!editing&&!QA.split?'<p class="small muted" style="text-align:center;margin:6px 0 0">Category picked from your past entries. Tap another to change it.</p>':''}
    ${ccDouble(QA)?`<div class="insight" style="margin-top:10px"><span class="grow small">You already log card purchases as expenses, so paying the card bill here counts them twice.</span><button class="pillbtn" data-act="qpaycard">Pay card instead</button></div>`:''}`;
  }
  openSheet(`${head}${body}
    ${editing&&canEditTx(QA)?`<button class="btn danger block" style="margin-top:8px" data-act="qdel">Delete ${xf?'transfer':'entry'}</button>`:''}
    ${editing&&QA.by?`<p class="small muted" style="text-align:center;margin:10px 0 0">Added by ${esc(who(QA.by))}${QA.ub&&QA.ub!==QA.by?' · last changed by '+esc(who(QA.ub)):''}${QA.at?' · '+new Date(QA.uat||QA.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):''}</p>`:''}
  `);
}
// paying a card bill as an expense double-counts purchases already logged with mode Card
function ccDouble(q){if(!q||q.type==='xfer'||q.split||!q.cat||!isCardBill(D.cats[q.cat]))return false;
  const from=addDays(todayISO(),-62);return Object.values(D.tx).some(t=>t&&t.mode==='Card'&&!isXfer(t)&&t.date>=from)}
/* ---- type or paste: "350 swiggy", "salary 150000", "2.5k rent", or a whole bank SMS ---- */
function parseQuick(s){
  s=String(s||'').trim();if(!s)return{};
  if(s.length>45||/debited|credited|a\/c|acct|upi ref|avl bal|txn/i.test(s)){const o=parseShared(s);o.sms=true;return o}
  const m=s.match(/(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(k|l|lakh|lac)?\b/i);const out={};
  if(m){let v=parseFloat(m[1].replace(/,/g,''));const u=(m[2]||'').toLowerCase();if(u==='k')v*=1e3;else if(u)v*=1e5;out.amt=String(Math.round(v*100)/100);s=(s.slice(0,m.index)+' '+s.slice(m.index+m[0].length)).trim()}
  s=s.replace(/^(on|for|at|to)\s+/i,'').replace(/\s+/g,' ').trim();
  if(/^(salary|income|received|got|refund|bonus)\b/i.test(s))out.type='in';
  // a category named in the text wins; otherwise the rest is the note
  const lc=s.toLowerCase();const cat=catsAll().filter(c=>!c.archived).find(c=>lc&&(lc===c.name.toLowerCase()||lc.includes(c.name.toLowerCase())));
  if(cat){out.cat=cat.id;if(cat.section==='income')out.type='in';const rest=s.replace(new RegExp(cat.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'').trim();if(rest)out.note=rest}
  else if(s)out.note=s.replace(/\b\w/g,c=>c.toUpperCase()).slice(0,40);
  return out;
}
function qtextResolve(){const o=parseQuick(QA.qtext);if(!o.amt)return o;if(o.cat){o.sure=true;return o}
  const mm=o.note&&merchantMemory()[o.note.trim().toLowerCase()];const g=mm?mm.cat:guessCat(parseAmt(o.amt),o.note);
  if(g&&D.cats[g]&&(o.type!=='in')===(D.cats[g].section!=='income')){o.cat=g;o.sure=!!mm}return o}
function qtextHint(){const o=qtextResolve();if(!QA.qtext)return'Amount and a word or two. Paisa picks the category from your past entries. Press Done to save.';
  if(!o.amt)return'Add an amount, like 350.';const c=o.cat&&D.cats[o.cat];
  return`${o.type==='in'?'Income':'Expense'} · <b>${fmt(parseAmt(o.amt))}</b>${o.note?' · '+esc(o.note):''} · ${c?esc(c.name)+(o.sure?'':' <span class="muted">(a guess: check it, then Save)</span>'):'<span class="over">pick a category below</span>'}`}
function qtextApply(save){
  const o=qtextResolve();if(!o.amt){toast('Add an amount, like 350.');return}
  QA.amt=o.amt;if(o.note)QA.note=o.note;if(o.mode)QA.mode=o.mode;if(o.card)QA.card=o.card;if(o.acct)QA.acct=o.acct;QA.type=o.type==='in'?'in':'out';QA.src=o.sms?'share':'manual';
  if(o.cat){QA.cat=o.cat;QA.guessed=!o.sure}else if(QA.cat&&D.cats[QA.cat]&&(D.cats[QA.cat].section==='income')!==(QA.type==='in'))QA.cat=null;
  lsSet('paisa-qtext','1');
  if(save&&QA.cat&&o.sure){QA.text=false;quickSave();return}
  QA.text=false;renderQuick();
}
function qSyncSplit(){if(!QA||!QA.split)return;document.querySelectorAll('[data-split-cat]').forEach(s=>{QA.split[+s.dataset.splitCat].cat=s.value});document.querySelectorAll('[data-split-amt]').forEach(s=>{QA.split[+s.dataset.splitAmt].amt=s.value})}
function quickKey(k){
  if(!QA)return;let a=QA.amt;
  if(k==='⌫')a=a.slice(0,-1);
  else if(k==='.'){if(!a.includes('.'))a=(a||'0')+'.'}
  else{if(a.includes('.')&&a.split('.')[1].length>=2)return;if(a.replace('.','').length>=10)return;a=(a==='0'?'':a)+k}
  QA.amt=a;renderQuick();
}
async function quickSave(){
  const q=QA;if(!q)return;
  qSync();qSyncSplit();const rep=$('#q-repeat');if(rep)q.repeat=rep.checked;
  const amt=parseAmt(q.amt);if(!(amt>0))return;
  const now=Date.now();const base={byName:q.id?(q.byName||''):(MYNAME||''),date:q.date,note:q.note,src:q.src||'manual',by:q.by||ME||'local',at:q.at||now,ub:ME||'local',uat:now,...(!q.id&&q.t0?{secs:Math.round((performance.now()-q.t0)/100)/10}:q.secs?{secs:q.secs}:{})};
  try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}
  if(q.type==='xfer'){
    if(!q.from||!q.to||q.from===q.to)return;const id=q.id||uid();
    const obj={...base,type:'xfer',from:q.from,to:q.to,amt};closeSheet();
    store.set('tx',id,obj).then(()=>log(q.id?'edited':'added','transfer',`${acctName(q.from)} → ${acctName(q.to)} ${fmt(amt)}`)).catch(()=>{});
    lsSet('paisa-lastacct',q.from);lsSet('paisa-hint-xfer','1');toast(`${q.id?'Updated':'Moved'} ${fmt(amt)} · ${acctName(q.from)} → ${acctName(q.to)}.`);return;
  }
  const acct=q.mode==='Card'?'':(q.acct||'');
  if(q.mode==='Card'&&q.card)lsSet('paisa-lastcard',q.card);if(acct)lsSet('paisa-lastacct',acct);
  const common={...base,mode:q.mode,card:q.mode==='Card'?q.card||'':'',acct};
  if(q.split){
    const parts=q.split.map(r=>({cat:r.cat,amt:parseAmt(r.amt)})).filter(r=>r.cat&&r.amt>0);
    if(parts.reduce((s,r)=>s+r.amt,0)!==amt){toast('The split must add up to '+fmt(amt)+'.');return}
    const sid=uid();closeSheet();
    await Promise.allSettled(parts.map((r,i)=>store.set('tx',sid+'-'+i,{...common,cat:r.cat,amt:r.amt,split:sid})));
    log('added','split entry',`${fmt(amt)} across ${parts.length} categories`);toast(`Saved ${fmt(amt)} split across ${parts.length} categories.`);return;
  }
  if(!q.cat)return;const id=q.id||uid();
  const obj={...common,cat:q.cat,amt,...(q.rec?{rec:q.rec}:{}),...(q.split_of?{split:q.split_of}:{})};
  const c=D.cats[q.cat];closeSheet();
  store.set('tx',id,obj).then(()=>{log(q.id?'edited':'added',c.section==='income'?'income':'entry',`${c.name} ${fmt(amt)}`)}).catch(()=>{});
  if(q.repeat&&!q.id){const day=Number(q.date.slice(8));store.set('recurring',uid(),{cat:q.cat,amt,day,mode:q.mode,acct,note:q.note||'',active:true}).then(()=>log('added','repeat',c.name)).catch(()=>{})}
  const inThisMonth=keyOf(obj.date)===curKey()&&c.section!=='income';
  toast(`${q.id?'Updated':'Saved'} ${fmt(amt)} · ${c.name}.${q.repeat&&!q.id?' It will repeat on the '+ordinal(Number(q.date.slice(8)))+' each month.':inThisMonth?' '+dailyLine():''}`,{ms:4200});
  if(!q.id&&!q.repeat)setTimeout(()=>{if(!$('#sheetRoot').innerHTML)afterSaveAsk({...obj})},900);
}
function quickDelete(){
  const q=QA;if(!q||!q.id)return;closeSheet();deleteTx(q.id);
}

/* ---- category editor ---- */
function openCat(id,sec){
  const c=id?catById(id):{name:'',section:sec,dueDay:null};
  const b=id?budgetOf(c,VM):0;const showDue=c.section==='bills'||c.section==='debt';
  openSheet(`${sheetHead(id?'Edit category':'New '+SECN[sec]+' category')}
    <div class="field"><label for="c-name">Name</label><input class="input" id="c-name" value="${esc(c.name)}" ${id?'':'autofocus'}></div>
    <div class="two"><div class="field"><label for="c-b">Budget for ${mLabel(VM)} (₹)</label><input class="input num" id="c-b" inputmode="decimal" value="${id?rupees(b):''}"></div>
    ${showDue?`<div class="field"><label for="c-due">Due day (1–31)</label><input class="input num" id="c-due" inputmode="numeric" value="${c.dueDay||''}" placeholder="none"></div>`:'<div></div>'}</div>
    ${id?`<div class="flabel" style="margin-bottom:6px">Apply budget change to</div><div class="seg" style="margin-bottom:14px" role="group"><button data-act="scope" data-k="month" aria-pressed="false">${mLabel(VM)} only</button><button data-act="scope" data-k="future" aria-pressed="true">This & future months</button></div>`:''}
    <button class="btn primary block" data-act="savecat" data-id="${id||''}" data-sec="${c.section}">Save</button>
    ${id?`<div class="btns" style="margin-top:10px"><button class="btn" data-act="catup" data-id="${id}">Move up</button><button class="btn" data-act="catdown" data-id="${id}">Move down</button><button class="btn" data-act="catarch" data-id="${id}">${c.archived?'Restore':'Archive'}</button><button class="btn danger" data-act="catdel" data-id="${id}">Delete</button></div><p class="small muted" style="margin:8px 0 0">Archive hides it but keeps past entries. Delete lets you move its entries or delete them too.</p>`:''}
  `);
  SCOPE='future';
}
let SCOPE='future';
async function saveCat(id,sec){
  const name=$('#c-name').value.trim();if(!name){toast('Give the category a name.');return}
  const amt=parseAmt($('#c-b').value);const dueEl=$('#c-due');let due=dueEl?parseInt(dueEl.value,10):null;
  if(dueEl&&dueEl.value&&!(due>=1&&due<=31)){toast('Due day must be between 1 and 31.');return}
  if(!(due>=1))due=null;
  const b=isNaN(amt)?0:amt;
  if(!id){
    const order=Math.max(0,...catsAll().filter(c=>c.section===sec).map(c=>c.order||0))+1;
    const nid=uid();closeSheet();
    await store.set('cats',nid,{name,section:sec,order,archived:false,dueDay:due,hist:[{from:VM,amt:b}]}).catch(()=>{});
    log('added','category',name);return;
  }
  const c={...D.cats[id]};delete c.id;const old=budgetOf({...c,id},VM);
  c.name=name;c.dueDay=due;
  const mdoc=JSON.parse(JSON.stringify(D.months[VM]||{}));
  if(b!==old||SCOPE==='future'&&mdoc.b&&mdoc.b[id]!=null){
    if(SCOPE==='month'){await store.patch('months',VM,['b',id],b).catch(()=>{})}
    else{
      c.hist=(c.hist||[]).filter(h=>h.from<VM);
      if(!c.hist.length){const prev=(D.cats[id].hist||[]).slice().sort((a,b)=>a.from.localeCompare(b.from));if(prev.length&&prev[0].from<VM)c.hist.push({from:prev[0].from,amt:old})}
      c.hist.push({from:VM,amt:b});
      if(mdoc.b&&mdoc.b[id]!=null){store.patch('months',VM,['b',id],null).catch(()=>{})}
    }
  }
  closeSheet();
  await store.set('cats',id,c).catch(()=>{});
  log('changed','budget',`${name} ${fmt(b)} (${SCOPE==='month'?mLabel(VM)+' only':'from '+mLabel(VM)})`);
}
function moveCat(id,dir){
  const c=D.cats[id];const list=catsAll().filter(x=>x.section===c.section);
  const i=list.findIndex(x=>x.id===id),j=i+dir;if(j<0||j>=list.length)return;
  list.forEach((x,n)=>x.order=n);[list[i].order,list[j].order]=[list[j].order,list[i].order];
  list.forEach(x=>{if(D.cats[x.id].order!==x.order){const o={...D.cats[x.id],order:x.order};store.set('cats',x.id,o).catch(()=>{})}});
  toast('Moved '+(dir<0?'up':'down'));
}

/* ---- misc sheets ---- */
function openBreakdown(){
  const m=month(VM);
  openSheet(`${sheetHead('How '+mLong(VM)+' adds up')}
    <div style="margin:0 0 14px">${moneyBar(m,VM===curKey())}</div>
    <div class="kv"><span>Money at the start</span><b class="num">${fmt(m.open)}</b></div>
    <div class="kv"><span>+ Income received</span><b class="num">${fmt(m.income)}</b></div>
    <div class="kv"><span><b>Available</b></span><b class="num">${fmt(m.available)}</b></div>
    ${OUT.map(k=>`<div class="kv"><span>− ${SECN[k]}</span><span class="num">${fmt(m.sec[k].a)}</span></div>`).join('')}
    <div class="kv"><span><b>Left to spend</b></span><b class="num ${m.left<0?'over':''}">${fmt(m.left)}</b></div>
    <div style="height:10px"></div>
    <div class="kv small"><span>Planned payments not made yet</span><span class="num">${fmt(m.toPay)}</span></div>
    <div class="kv small"><span>Income still expected</span><span class="num">${fmt(m.incomeToCome)}</span></div>
    <div class="kv small"><span>Projected month-end balance</span><b class="num ${m.projected<0?'over':''}">${fmt(m.projected)}</b></div>`);
}
function openOpening(){
  const m=month(VM);const ov=D.months[VM]&&D.months[VM].open!=null;
  openSheet(`${sheetHead('Opening balance · '+mLabel(VM))}
    <p class="small muted" style="margin-top:0">Normally this is last month's closing balance. Override it only if your bank balance differs.</p>
    <div class="field"><label for="ob">Opening balance (₹)</label><input class="input num" id="ob" inputmode="decimal" value="${rupees(m.open)}" autofocus></div>
    <button class="btn primary block" data-act="saveopen">Save</button>
    ${ov?`<button class="btn block" style="margin-top:8px" data-act="resetopen">Use carried-forward balance</button>`:''}`);
}
function openLoan(id){
  const l=id?D.loans[id]:{name:'',lender:'',original:null,rate:null,emi:null,outstanding:null,cat:'',asOf:todayISO()};
  const debt=catsAll().filter(c=>c.section==='debt'&&!c.archived);
  openSheet(`${sheetHead(id?'Edit loan':'Add loan')}
    <div class="two"><div class="field"><label for="l-name">Name</label><input class="input" id="l-name" value="${esc(l.name)}" placeholder="Home loan 1"></div><div class="field"><label for="l-lender">Lender</label><input class="input" id="l-lender" value="${esc(l.lender)}" placeholder="SBI"></div></div>
    <div class="two"><div class="field"><label for="l-orig">Original amount (₹)</label><input class="input num" id="l-orig" inputmode="decimal" value="${rupees(l.original)}"></div><div class="field"><label for="l-rate">Interest (% a year)</label><input class="input num" id="l-rate" inputmode="decimal" value="${l.rate??''}"></div></div>
    <div class="two"><div class="field"><label for="l-emi">EMI (₹)</label><input class="input num" id="l-emi" inputmode="decimal" value="${rupees(l.emi)}"></div><div class="field"><label for="l-out">Outstanding today (₹)</label><input class="input num" id="l-out" inputmode="decimal" value="${rupees(id?loanOutstanding(l):l.outstanding)}"></div></div>
    <div class="field"><label for="l-cat">EMI category</label><select class="input" id="l-cat"><option value="">Not linked</option>${debt.map(c=>`<option value="${c.id}" ${l.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <button class="btn primary block" data-act="saveloan" data-id="${id||''}">Save</button>
    ${id?`<button class="btn danger block" style="margin-top:8px" data-act="delloan" data-id="${id}">Delete loan</button>`:''}`);
}
function openCard(id){
  const c=id?D.cards[id]:{name:'',bank:'',limit:null,stmtDay:'',dueDay:''};
  openSheet(`${sheetHead(id?'Edit card':'Add credit card')}
    <div class="two"><div class="field"><label for="k-name">Card name</label><input class="input" id="k-name" value="${esc(c.name)}" placeholder="Millennia"></div><div class="field"><label for="k-bank">Bank</label><input class="input" id="k-bank" value="${esc(c.bank)}" placeholder="HDFC"></div></div>
    <div class="field"><label for="k-limit">Credit limit (₹)</label><input class="input num" id="k-limit" inputmode="decimal" value="${rupees(c.limit)}"></div>
    <div class="two"><div class="field"><label for="k-sd">Statement day</label><input class="input num" id="k-sd" inputmode="numeric" value="${c.stmtDay||''}"></div><div class="field"><label for="k-dd">Due day</label><input class="input num" id="k-dd" inputmode="numeric" value="${c.dueDay||''}"></div></div>
    ${(()=>{const L=catsAll().filter(x=>!x.archived&&(x.section==='bills'||x.section==='debt'));if(!L.length)return'';
      const cur=id?L.find(x=>x.card===id):null;const guess=cur||(!Object.keys(cardLinks()).length?L.find(x=>/credit card|card bill/i.test(x.name)):null);
      return`<div class="field"><label for="k-cat">Budget line that pays this card</label><select class="input" id="k-cat"><option value="">None</option>${L.map(x=>`<option value="${x.id}" ${guess&&guess.id===x.id?'selected':''}>${esc(x.name)}${x.card&&x.card!==id&&D.cards[x.card]?' · '+esc(D.cards[x.card].name):''}</option>`).join('')}</select></div>
      <p class="small muted" style="margin:-6px 0 12px">Paying the card with a self transfer marks this bill paid, and Paisa warns if it would count spending twice.</p>`})()}
    <button class="btn primary block" data-act="savecard" data-id="${id||''}">Save</button>
    ${id?`<button class="btn block" style="margin-top:8px" data-act="carddel" data-id="${id}">Delete card and its entries…</button>`:''}
    ${id?`<button class="btn danger block" style="margin-top:8px" data-act="delcard" data-id="${id}">Delete card</button>`:''}`);
}
function openStmt(id){
  const c=D.cards[id];const st=(c.stmts||{})[VM]||{};
  openSheet(`${sheetHead(esc(c.name)+' · '+mLabel(VM))}
    <div class="two"><div class="field"><label for="s-amt">Statement amount (₹)</label><input class="input num" id="s-amt" inputmode="decimal" value="${rupees(st.amt)}" autofocus></div><div class="field"><label for="s-paid">Amount paid (₹)</label><input class="input num" id="s-paid" inputmode="decimal" value="${rupees(st.paid)}"></div></div>
    <button class="btn primary block" data-act="savestmt" data-id="${id}">Save statement</button>`);
}
const val=id=>{const e=$('#'+id);return e?e.value:''};
const amtOrNull=id=>{const v=parseAmt(val(id));return isNaN(v)?null:v};

/* ---- PIN ---- */
async function sha(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('paisa:'+s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return 'x'+s}}
let PIN={mode:null,buf:'',first:''};
function showLock(mode){
  PIN={mode,buf:'',first:''};drawLock();
}
function drawLock(){
  const titles={unlock:'Enter your PIN',set:'Choose a 4-digit PIN',confirm:'Enter the PIN again'};
  $('#lockRoot').innerHTML=`<div class="lock" role="dialog" aria-modal="true" aria-label="App lock"><div class="mark">₹</div><h2>${titles[PIN.mode]}</h2>
  <div class="dots" aria-hidden="true">${[0,1,2,3].map(i=>`<i class="${i<PIN.buf.length?'on':''}"></i>`).join('')}</div><div class="small" id="pinmsg" style="min-height:18px;color:var(--bad)">${PIN.msg||''}</div>
  <div class="keypad">${['1','2','3','4','5','6','7','8','9','','0','⌫'].map(x=>x?`<button data-act="pin" data-k="${x}" aria-label="${x==='⌫'?'Delete':x}">${x}</button>`:'<span></span>').join('')}</div>
  ${PIN.mode!=='unlock'?'<button class="link" data-act="pincancel">Cancel</button>':''}</div>`;
}
async function pinKey(k){
  if(k==='⌫')PIN.buf=PIN.buf.slice(0,-1);else if(PIN.buf.length<4)PIN.buf+=k;
  PIN.msg='';
  if(PIN.buf.length===4){
    if(PIN.mode==='unlock'){if(await sha(PIN.buf)===lsGet('paisa-pin')){$('#lockRoot').innerHTML='';return}PIN.msg='Wrong PIN. Try again.';PIN.buf=''}
    else if(PIN.mode==='set'){PIN.first=PIN.buf;PIN.buf='';PIN.mode='confirm'}
    else{if(PIN.buf===PIN.first){lsSet('paisa-pin',await sha(PIN.buf));$('#lockRoot').innerHTML='';toast('PIN set. The app now locks on this device.');render();return}PIN.msg="PINs didn't match. Start again.";PIN.mode='set';PIN.buf=''}
  }
  drawLock();
}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();if(lsGet('paisa-pin')&&!$('#privacy')){const d=document.createElement('div');d.className='privacy';d.id='privacy';document.body.appendChild(d)}}
  else{const p=$('#privacy');if(p)p.remove();if(lsGet('paisa-pin')&&Date.now()-hiddenAt>5*60*1000)showLock('unlock')}
});

/* ---- toast ---- */
let toastT=null;
function toast(msg,o={}){
  clearTimeout(toastT);
  $('#toastRoot').innerHTML=`<div class="toast" role="status"><span>${esc(msg)}</span>${o.action?`<button data-act="toastact">${esc(o.action)}</button>`:''}</div>`;
  TOASTFN=o.fn||null;
  toastT=setTimeout(()=>{$('#toastRoot').innerHTML='';TOASTFN=null},o.ms||3200);
}
let TOASTFN=null;

/* ---- downloads / Excel ---- */
let XLSXP=null;
function loadXLSX(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(XLSXP)return XLSXP;
  XLSXP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=()=>res(window.XLSX);s.onerror=()=>{XLSXP=null;rej(new Error('load'))};document.head.appendChild(s)});
  return XLSXP;
}
async function saveFile(filename,data,type){
  const blob=data instanceof Blob?data:new Blob([data],{type:type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const file=new File([blob],filename,{type:blob.type});
  // phones: offer the share sheet so the file can go to Drive, WhatsApp or Files
  if(navigator.canShare&&matchMedia('(pointer:coarse)').matches&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:filename});return}catch(e){if(e&&e.name==='AbortError')return}
  }
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
async function downloadTemplate(){
  let X;try{X=await loadXLSX()}catch(e){toast("Couldn't load the Excel library.");return}
  const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Section','Category','Budget','Due day'],['Income','Salary',120000,''],['Savings','SIP',15000,''],['Bills','Rent',25000,5],['Expenses','Groceries',10000,''],['Debt','Home loan EMI',25000,5]]),'Budget');
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Date','Category','Amount','Mode','Note'],['2026-11-01','Salary',120000,'Net banking','Example row'],['2026-11-02','Groceries',553,'UPI','Example row']]),'Expense Log');
  await saveFile('Paisa Planner import template.xlsx',X.write(wb,{type:'array',bookType:'xlsx'}));
}

/* ---- import ---- */
let IMP=null;
function secFrom(s){s=String(s||'').toLowerCase();if(s.startsWith('inc'))return'income';if(s.startsWith('sav')||s.includes('invest'))return'savings';if(s.startsWith('bill'))return'bills';if(s.startsWith('debt')||s.includes('emi')||s.includes('loan'))return'debt';if(s.startsWith('exp'))return'expenses';return null}
function toISO(v){
  if(v instanceof Date&&!isNaN(v))return iso(new Date(v.getTime()+12*36e5));
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}
  const s=String(v||'').trim();let m;
  if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
  if(m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)){const y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+pad(m[2])+'-'+pad(m[1])}
  const d=new Date(s);return isNaN(d)?null:iso(d);
}
async function handleImport(file){
  let X;try{X=await loadXLSX()}catch(e){toast("Couldn't load the Excel library. Check your connection.");return}
  let wb;try{wb=X.read(await file.arrayBuffer(),{cellDates:true})}catch(e){toast("Couldn't read that file. Save it as .xlsx and try again.");return}
  const find=re=>wb.SheetNames.find(n=>re.test(n));
  const rowsOf=n=>n?X.utils.sheet_to_json(wb.Sheets[n],{defval:''}):[];
  const col=(r,...names)=>{for(const k of Object.keys(r)){const kl=k.toLowerCase().trim();if(names.some(n=>kl===n||kl.startsWith(n)))return r[k]}return''};
  const bName=find(/budget|categor/i);const lName=find(/expense log|log|transaction|entries/i)||(wb.SheetNames.length===1?wb.SheetNames[0]:null);
  const existing={};catsAll().forEach(c=>existing[c.name.toLowerCase()]=c);
  const newCats={};const budgetRows=[];
  rowsOf(bName).forEach(r=>{const name=String(col(r,'category','name')).trim();if(!name)return;const sec=secFrom(col(r,'section','type'))||guessSection(name);const b=parseAmt(col(r,'budget','planned','amount'));const due=parseInt(col(r,'due'),10);
    budgetRows.push({name,sec,b:isNaN(b)?0:b,due:due>=1&&due<=31?due:null});
    if(!existing[name.toLowerCase()])newCats[name.toLowerCase()]={name,sec,b:isNaN(b)?0:b,due:due>=1&&due<=31?due:null}});
  const tx=[];let skipped=0;
  rowsOf(lName===bName?null:lName).forEach(r=>{const date=toISO(col(r,'date'));const name=String(col(r,'category')).trim();const amt=parseAmt(col(r,'amount','actual','spent'));
    if(!date||!name||!(amt>0)){skipped++;return}
    const sec=secFrom(col(r,'section','type'));
    if(!existing[name.toLowerCase()]&&!newCats[name.toLowerCase()])newCats[name.toLowerCase()]={name,sec:sec||guessSection(name),b:0,due:null};
    const mode=MODES.find(m=>m.toLowerCase()===String(col(r,'mode','payment')).toLowerCase().trim())||(String(col(r,'mode','payment')).toLowerCase().includes('card')?'Card':'UPI');
    const an=String(col(r,'account','bank')).toLowerCase().trim();const ma=an?acctList().find(a=>(a.last4&&an.includes(a.last4))||(a.nick&&an.includes(a.nick.toLowerCase()))||an.includes((a.bank||'').toLowerCase())):null;
    tx.push({date,name,amt,mode,note:String(col(r,'note','description','remarks')).slice(0,120),acct:ma?ma.id:''})});
  if(!tx.length&&!budgetRows.length){toast('No Budget or Expense Log rows found. Use the template’s column names.');return}
  tx.forEach(t=>t.k=keyOf(t.date));
  const months=[...new Set(tx.map(t=>t.k))].sort();
  const knownCount=new Set(tx.map(t=>t.name.toLowerCase()).filter(n=>existing[n])).size;
  IMP={tx,newCats,budgetRows,skipped,months,knownCount,skip:{},step:0};
  openImportStep();
}
async function doImport(){
  const I=IMP;if(!I)return;
  const startEl=$('#imp-start');const newOpen=amtOrNull('imp-open');
  const keep=I.tx.filter(t=>!I.skip[t.k]);
  const firstM=keep.length?keep.map(t=>t.k).sort()[0]:null;
  closeSheet();toast('Importing…',{ms:60000});
  const ids={};catsAll().forEach(c=>ids[c.name.toLowerCase()]=c.id);
  let order=catsAll().length;
  const from=startEl&&startEl.checked&&firstM?firstM:'2000-01';
  for(const k in I.newCats){const c=I.newCats[k];const id=uid();ids[k]=id;await store.set('cats',id,{name:c.name,section:c.sec,order:order++,archived:false,dueDay:c.due,hist:[{from,amt:c.b}]}).catch(()=>{})}
  for(const r of I.budgetRows){const id=ids[r.name.toLowerCase()];if(!id||I.newCats[r.name.toLowerCase()])continue;const c={...D.cats[id]};c.hist=[{from,amt:r.b}];if(r.due)c.dueDay=r.due;await store.set('cats',id,c).catch(()=>{})}
  let n=0;const batch=[];const now=Date.now();
  for(const t of keep){batch.push(store.set('tx',uid()+(n++),{cat:ids[t.name.toLowerCase()],amt:t.amt,date:t.date,mode:t.mode,note:t.note,card:'',acct:t.acct||'',src:'import',by:ME||'local',at:now,ub:ME||'local',uat:now}).catch(()=>{}));if(batch.length>=8){await Promise.all(batch);batch.length=0}}
  await Promise.all(batch);
  if(startEl&&startEl.checked&&firstM){await store.set('settings','main',{...S(),startMonth:firstM,opening:newOpen||0}).catch(()=>{})}
  log('imported','Excel',`${keep.length} entries`);
  IMP=null;$('#toastRoot').innerHTML='';
  openSheet(`${sheetHead('All in')}<div class="reveal-num num" style="font-size:44px">${keep.length.toLocaleString('en-IN')}</div><p class="onb-q" style="font-size:20px;margin:0 0 14px">entries imported.</p><p class="small muted" style="margin:0 0 16px">Your history is in. Months, balances and charts now include it.</p><button class="btn primary block" data-act="close">See my budget</button>`);
}
async function wipe(){
  openSheet(`${sheetHead(MODE==='cloud'?'Delete family budget?':'Delete all data?')}<p class="small">Type <b>DELETE</b> to remove everything${MODE==='cloud'?' for everyone in the family':' from this device'}.</p><div class="field"><input class="input" id="wipe-c" autocomplete="off" aria-label="Type DELETE to confirm"></div><button class="btn danger block" data-act="dowipe">Delete everything</button>`);
}
async function doWipe(){
  if(val('wipe-c')!=='DELETE'){toast('Type DELETE in capitals to confirm.');return}
  if(MODE==='cloud'){closeSheet();const {error}=await SB.rpc('delete_family');if(error){toast(errMsg(error));return}clearFamilyCache();toast('Family budget deleted.');return cloudNoFamily()}
  closeSheet();toast('Deleting…',{ms:60000});
  for(const col of COLS){const ids=Object.keys(D[col]);for(let i=0;i<ids.length;i+=8)await Promise.all(ids.slice(i,i+8).map(id=>store.del(col,id).catch(()=>{})))}
  ONB=null;toast('All data deleted.');location.hash='home';
}

/* ================= goals: save up, or clear a loan ================= */
let GTYPE='save';
function loanGoalCalc(g){
  const l=D.loans[g.loan];if(!l)return null;
  const P=loanOutstanding(l),i=(l.rate||0)/100/12,E=l.emi||0;
  const now=loanCalc(P,l.rate||0,E);
  const prog=l.original?clamp(1-P/l.original,0,1):0;
  if(!g.date)return{l,P,prog,now};
  const n=Math.max(1,(()=>{const[y,m]=g.date.slice(0,7).split('-').map(Number);const[cy,cm]=curKey().split('-').map(Number);return(y-cy)*12+(m-cm)})());
  // EMI needed to finish by the target month
  const need=i===0?Math.ceil(P/n):Math.ceil(P*i/(1-Math.pow(1+i,-n)));
  const on=!now.err&&now.n<=n;
  return{l,P,prog,now,n,need,extra:Math.max(0,need-E),on};
}
function goalCardHTML(id,g){
  const edit=canAdmin()?`<button class="btn sm" data-act="editgoal" data-id="${id}">Edit</button>`:'';
  if(g.type==='yearly'){const y=yearlyCalc(g);return `<section class="sect"><div class="sect-head"><h2>${esc(g.name)}</h2>${edit}</div>
    <div class="pbar" style="height:10px"><i style="width:${y.prog*100}%;background:var(--accent)"></i></div>
    <div class="kv" style="margin-top:8px"><span>${fmt(g.saved||0)} of ${fmt(g.amount)} set aside</span><b>Due ${mLabel(y.due)}</b></div>
    <p class="small" style="margin:6px 0 4px">Set aside <b class="num">${fmt(y.monthly)} a month</b> for the next ${y.months} month${y.months===1?'':'s'} so it doesn't hit one month's budget.</p></section>`}
  if(g.type==='loan'){
    const c=loanGoalCalc(g);
    if(!c)return `<section class="sect"><div class="sect-head"><h2>${esc(g.name)}</h2>${edit}</div><p class="small muted">The loan for this goal was deleted.</p></section>`;
    const payoff=c.now.err?null:addM(curKey(),c.now.n);
    return `<section class="sect"><div class="sect-head"><h2>${esc(g.name)}</h2>${edit}</div>
      <div class="pbar" style="height:10px"><i style="width:${c.prog*100}%;background:var(--good)"></i></div>
      <div class="kv" style="margin-top:8px"><span>${Math.round(c.prog*100)}% repaid</span><b class="num">${fmt(c.P)} left</b></div>
      <div class="kv"><span>At today's EMI</span><b>${payoff?'Debt-free '+mLabel(payoff):esc(c.now.err)}</b></div>
      ${g.date?`<div class="kv"><span>Your target · ${mLabel(g.date.slice(0,7))}</span><span class="pill ${c.on?'p-paid':'p-overdue'}">${c.on?'On track':'Behind'}</span></div>
      <p class="small ${c.on?'muted':''}" style="margin:8px 0 4px">${c.on?`You'll finish ${c.now.n<c.n?(c.n-c.now.n)+' month'+(c.n-c.now.n===1?'':'s')+' early':'right on time'}.`:`Pay <b class="num">${fmt(c.extra)} more a month</b> (EMI of ${fmt(c.need)}) to be debt-free by ${mLabel(g.date.slice(0,7))}.`}</p>`:''}
    </section>`;
  }
  const c=goalCalc(g);
  return `<section class="sect"><div class="sect-head"><h2>${esc(g.name)}</h2>${edit}</div>
    <div class="pbar" style="height:10px"><i style="width:${c.prog*100}%;background:var(--accent)"></i></div>
    <div class="kv" style="margin-top:8px"><span>${fmt(g.saved)} of ${fmt(g.target)}</span><b>${Math.round(c.prog*100)}%</b></div>
    <div class="kv"><span>Months to go</span><b>${c.n===0?'Reached':isFinite(c.n)?c.n+' at '+fmt(g.monthly)+' a month':'Add a monthly amount'}</b></div>
    ${g.date?`<div class="kv"><span>Target ${mLabel(g.date.slice(0,7))}</span><span class="pill ${c.on?'p-paid':'p-overdue'}">${c.on?'On track':'Behind'}</span></div>`:''}</section>`;
}
function goalsBody(){
  const m=month(curKey());const monthly=m.sec.bills.b+m.sec.expenses.b+m.sec.debt.b;
  const gs=Object.entries(D.goals);
  return `<section class="bsum"><div class="label">Suggested emergency fund</div><div class="num" style="font-weight:700;font-size:26px;letter-spacing:-.02em">${fmt(monthly*6)}</div><div class="small muted">6 months of bills, spending and EMIs (${fmt(monthly)} a month)</div></section>
  ${(()=>{const ys=gs.filter(([i,g])=>g.type==='yearly');const tot=ys.reduce((s,[i,g])=>s+yearlyCalc(g).monthly,0);return ys.length?`<p class="small" style="margin:0">Yearly payments need <b class="num">${fmt(tot)} a month</b> set aside. Add it as a Savings budget so it's planned.</p>`:''})()}
  ${gs.map(([id,g])=>goalCardHTML(id,g)).join('')||'<p class="small muted" style="margin:0">No goals yet. Save up for something, or set a date to be free of a loan.</p>'}
  ${canAdmin()?`<div class="btns"><button class="btn primary" data-act="newgoal" data-k="save">+ Savings goal</button><button class="btn" data-act="newgoal" data-k="loan">+ Clear a loan</button><button class="btn" data-act="newgoal" data-k="yearly">+ Yearly payment</button></div>`:''}`;
}
function openGoal(id,type){
  const g=id?D.goals[id]:{name:'',target:null,saved:null,monthly:null,date:'',type:type||'save'};
  GTYPE=g.type||'save';
  const loans=Object.entries(D.loans);
  const seg=id?'':`<div class="seg" role="group" style="margin-bottom:14px"><button data-act="gtype" data-k="save" aria-pressed="${GTYPE==='save'}">Save up</button><button data-act="gtype" data-k="loan" aria-pressed="${GTYPE==='loan'}">Clear a loan</button><button data-act="gtype" data-k="yearly" aria-pressed="${GTYPE==='yearly'}">Yearly</button></div>`;
  let body;
  if(GTYPE==='yearly'){
    body=`<div class="field"><label for="g-name">What is it?</label><input class="input" id="g-name" value="${esc(g.name||'')}" placeholder="Car insurance, school fees, property tax"></div>
    <div class="two"><div class="field"><label for="g-amt">Amount (₹)</label><input class="input num" id="g-amt" inputmode="decimal" value="${rupees(g.amount)}"></div><div class="field"><label for="g-mon">Due in</label><select class="input" id="g-mon">${MONL.map((m,i)=>`<option value="${i+1}" ${(g.month||0)===i+1?'selected':''}>${m}</option>`).join('')}</select></div></div>
    <div class="field"><label for="g-s">Already set aside (₹)</label><input class="input num" id="g-s" inputmode="decimal" value="${rupees(g.saved)}"></div>
    <button class="btn primary block" data-act="savegoal" data-id="${id||''}">Save</button>`;
  }else if(GTYPE==='loan'){
    body=loans.length?`<div class="field"><label for="g-loan">Which loan?</label><select class="input" id="g-loan">${loans.map(([lid,l])=>`<option value="${lid}" ${g.loan===lid?'selected':''}>${esc(l.name)} · ${fmt(loanOutstanding(l))} left</option>`).join('')}</select></div>
      <div class="field"><label for="g-d">Debt-free by</label><input class="input" id="g-d" type="month" value="${(g.date||'').slice(0,7)}"></div>
      <p class="small muted" style="margin:-4px 0 12px">I'll show whether today's EMI gets you there, and how much extra a month would.</p>
      <button class="btn primary block" data-act="savegoal" data-id="${id||''}">Save goal</button>`
      :`<p class="small" style="margin-top:0">Add the loan first: what's left, the interest and the EMI.</p><button class="btn primary block" data-act="editloan">Add a loan</button>`;
  }else{
    body=`<div class="field"><label for="g-name">Goal</label><input class="input" id="g-name" value="${esc(g.name)}" placeholder="Emergency fund, Goa trip, new phone"></div>
    <div class="two"><div class="field"><label for="g-t">Target (₹)</label><input class="input num" id="g-t" inputmode="decimal" value="${rupees(g.target)}"></div><div class="field"><label for="g-s">Saved so far (₹)</label><input class="input num" id="g-s" inputmode="decimal" value="${rupees(g.saved)}"></div></div>
    <div class="two"><div class="field"><label for="g-m">Each month (₹)</label><input class="input num" id="g-m" inputmode="decimal" value="${rupees(g.monthly)}"></div><div class="field"><label for="g-d">By when</label><input class="input" id="g-d" type="month" value="${(g.date||'').slice(0,7)}"></div></div>
    <button class="btn primary block" data-act="savegoal" data-id="${id||''}">Save goal</button>`;
  }
  openSheet(`${sheetHead(id?'Edit goal':'New goal')}${seg}${body}${id?`<button class="btn danger block" style="margin-top:8px" data-act="delgoal" data-id="${id}">Delete goal</button>`:''}`);
}
function saveGoal(id){
  if(GTYPE==='yearly'){const name=val('g-name').trim();const amount=amtOrNull('g-amt');if(!name||!(amount>0)){toast('Add a name and the amount.');return}
    const o={type:'yearly',name,amount,month:Number(val('g-mon')),saved:amtOrNull('g-s')||0};closeSheet();store.set('goals',id||uid(),o).then(()=>log(id?'edited':'added','yearly payment',name)).catch(()=>{});return}
  if(GTYPE==='loan'){
    const lid=val('g-loan');if(!lid||!D.loans[lid]){toast('Pick a loan.');return}
    const o={type:'loan',loan:lid,name:'Clear '+D.loans[lid].name,date:val('g-d')};
    closeSheet();store.set('goals',id||uid(),o).then(()=>log(id?'edited':'added','goal',o.name)).catch(()=>{});return;
  }
  const name=val('g-name').trim();if(!name){toast('Give the goal a name.');return}
  const o={type:'save',name,target:amtOrNull('g-t')||0,saved:amtOrNull('g-s')||0,monthly:amtOrNull('g-m')||0,date:val('g-d')};
  closeSheet();store.set('goals',id||uid(),o).then(()=>log(id?'edited':'added','goal',name)).catch(()=>{});
}

/* ================= import: a step-by-step check ================= */
const SEC_GUESS=[[/salary|income|bonus|interest received|dividend|refund|freelance/,'income'],[/sip|mutual|invest|\brd\b|\bfd\b|ppf|nps|deposit|saving|gold|stock/,'savings'],
  [/emi|loan|credit card/,'debt'],[/\brent\b|electric|power|water|gas|internet|wifi|broadband|mobile|phone|dth|maid|help|society|maintenance|insurance|school|fee|tuition/,'bills']];
function guessSection(n){n=n.toLowerCase();for(const[re,s]of SEC_GUESS)if(re.test(n))return s;return'expenses'}
function impSteps(){const I=IMP;return['intro',...(Object.keys(I.newCats).length?['cats']:[]),...I.months.map(k=>'m:'+k),'final']}
function impSecOf(name){const c=catsAll().find(x=>x.name.toLowerCase()===name.toLowerCase());if(c)return c.section;const n=IMP.newCats[name.toLowerCase()];return n?n.sec:'expenses'}
function impMonthStats(k){
  const rows=IMP.tx.filter(t=>t.k===k);const sec={income:0,savings:0,bills:0,expenses:0,debt:0};const byCat={};
  rows.forEach(t=>{const s=impSecOf(t.name);sec[s]+=t.amt;if(s!=='income')byCat[t.name]=(byCat[t.name]||0)+t.amt});
  const top=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return{rows,sec,out:OUT.reduce((s,x)=>s+sec[x],0),top};
}
function openImportStep(){
  const I=IMP;const steps=impSteps();const st=steps[I.step];const dots=`<div class="onb-dots" style="justify-content:flex-start">${steps.map((_,i)=>`<i class="${i<=I.step?'on':''}" style="width:${Math.max(8,Math.min(22,240/steps.length))}px"></i>`).join('')}</div>`;
  const head=`<div class="sheet-h">${dots}<button class="x" data-act="close" aria-label="Cancel import">×</button></div>`;
  const kept=I.tx.filter(t=>!I.skip[t.k]);
  if(st==='intro'){
    const span=I.months.length?(I.months.length===1?mLabel(I.months[0]):`${mLabel(I.months[0])} to ${mLabel(I.months[I.months.length-1])}`):'';
    return openSheet(`${head}<p class="label" style="margin:0">I read your sheet</p>
      <div class="reveal-num num" style="font-size:44px">${I.tx.length.toLocaleString('en-IN')}</div>
      <p class="onb-q" style="font-size:20px;margin:0 0 10px">entries${span?' from '+span:''}.</p>
      <div class="kv small"><span>Categories already in the app</span><b>${I.knownCount}</b></div>
      <div class="kv small"><span>New categories</span><b>${Object.keys(I.newCats).length}</b></div>
      ${I.budgetRows.length?`<div class="kv small"><span>Budget rows</span><b>${I.budgetRows.length}</b></div>`:''}
      ${I.skipped?`<div class="kv small"><span>Rows I couldn't read</span><b class="over">${I.skipped}</b></div><p class="small muted" style="margin:6px 0 0">These had no date, category or amount, and won't be imported.</p>`:''}
      <p class="small muted" style="margin:14px 0 0">Nothing is saved until you confirm. It takes about a minute to check.</p>
      <button class="btn primary block" style="margin-top:16px" data-act="impnext">Let's check it</button>`);
  }
  if(st==='cats'){
    const nc=Object.values(I.newCats);
    return openSheet(`${head}<p class="label" style="margin:0">New categories</p><h2 class="onb-q" style="font-size:22px;margin:4px 0 6px">Where should these go?</h2>
      <p class="small muted" style="margin:0 0 10px">I've guessed from the names. Change any that are wrong.</p>
      ${nc.map(c=>{const n=I.tx.filter(t=>t.name.toLowerCase()===c.name.toLowerCase());return `<div class="erow">${icon({name:c.name,section:c.sec})}<span class="n">${esc(c.name)}<span class="small muted">${n.length?n.length+' entries · '+fmt(n.reduce((s,t)=>s+t.amt,0)):'budget only'}</span></span>
        <select class="input rolesel" data-impsec="${esc(c.name.toLowerCase())}" aria-label="Section for ${esc(c.name)}">${SECTIONS.map(s=>`<option value="${s.k}" ${c.sec===s.k?'selected':''}>${s.n.split(' ')[0].replace('Savings','Savings')}</option>`).join('')}</select></div>`}).join('')}
      <button class="btn primary block" style="margin-top:14px" data-act="impnext">These look right</button>`);
  }
  if(st.startsWith('m:')){
    const k=st.slice(2);const s=impMonthStats(k);const mi=I.months.indexOf(k);
    return openSheet(`${head}<p class="label" style="margin:0">Month ${mi+1} of ${I.months.length}</p>
      <h2 class="onb-q" style="font-size:24px;margin:4px 0 2px">${mLong(k)} ${k.slice(0,4)}</h2><p class="small muted" style="margin:0 0 12px">${s.rows.length} entries</p>
      <div class="two" style="margin-bottom:10px"><div><div class="label">Money in</div><div class="num" style="font-size:24px;font-weight:700;color:var(--good)">${fmt(s.sec.income)}</div></div><div><div class="label">Money out</div><div class="num" style="font-size:24px;font-weight:700">${fmt(s.out)}</div></div></div>
      ${OUT.filter(x=>s.sec[x]).map(x=>`<div class="kv small"><span>${SECN[x]}</span><span class="num">${fmt(s.sec[x])}</span></div>`).join('')}
      ${s.top.length?`<p class="small muted" style="margin:10px 0 0">Biggest: ${s.top.map(([n,v])=>esc(n)+' '+fmt(v)).join(' · ')}</p>`:''}
      <p class="onb-q" style="font-size:17px;margin:16px 0 10px">Does this match your sheet?</p>
      <div class="btns"><button class="btn primary" data-act="impnext">Looks right</button><button class="btn" data-act="impskipm" data-k="${k}">Leave out ${MON[Number(k.slice(5))-1]}</button></div>
      ${I.months.length-mi>2?`<button class="link small" style="margin-top:12px" data-act="impallok">The rest look right too</button>`:''}`);
  }
  // final
  const months=I.months.filter(k=>!I.skip[k]);const first=months[0];
  const needStart=first&&S()&&first<S().startMonth;
  return openSheet(`${head}<p class="label" style="margin:0">Ready</p>
    <div class="reveal-num num" style="font-size:44px">${kept.length.toLocaleString('en-IN')}</div>
    <p class="onb-q" style="font-size:20px;margin:0 0 10px">entries from ${months.length} month${months.length===1?'':'s'}${Object.keys(I.skip).length?`, leaving out ${Object.keys(I.skip).map(k=>mLabel(k)).join(', ')}`:''}.</p>
    ${needStart?`<label class="check" style="border:0"><input type="checkbox" id="imp-start" checked><span class="small">Start the budget from ${mLabel(first)} so balances carry forward</span></label>
      <div class="field" style="margin-top:6px"><label for="imp-open">Money in your account on ${dShort(mStart(first))} ${first.slice(0,4)} (₹)</label><input class="input num" id="imp-open" inputmode="decimal" value="0"></div>`:''}
    <button class="btn primary block" style="margin-top:14px" data-act="doimport" ${kept.length||I.budgetRows.length?'':'disabled'}>Import ${kept.length.toLocaleString('en-IN')} entries</button>`);
}

/* ================= export: pick exactly what you want ================= */
let EXP=null;
const EXP_PARTS=[['entries','Entries'],['accounts','Bank accounts'],['networth','Net worth'],['summary','Monthly summary'],['budget','Budget vs actual'],['bills','Bills & EMIs'],['loans','Loans'],['cards','Credit cards'],['goals','Goals']];
const EXP_FORMATS=[['xlsx','Excel'],['csv','CSV'],['pdf','PDF report'],['json','Full backup']];
function openExport(preset={}){
  if(!EXP||preset.reset!==false)EXP={period:'month',month:VM,year:Number(VM.slice(0,4)),from:mStart(VM),to:todayISO(),inc:{entries:true,summary:true,budget:true,bills:false,loans:false,cards:false,goals:false},format:'xlsx',cat:'',mode:'',who:'',filters:false,...preset};
  renderExport();
}
function expKeys(){
  const E=EXP;
  if(E.period==='month')return[E.month];
  if(E.period==='year')return Array.from({length:12},(_,i)=>ym(E.year,i+1)).filter(k=>txIndex()[k]||(S()&&k>=S().startMonth&&k<=curKey()));
  if(E.period==='range'){const a=keyOf(E.from||todayISO()),b=keyOf(E.to||todayISO());const out=[];let k=a;while(k<=b&&out.length<240){out.push(k);k=addM(k,1)}return out}
  return[...new Set([...chainKeys(),...Object.keys(txIndex())])].sort();
}
function expEntries(){/* transfers have no category, so a category filter leaves them out */
  const E=EXP;let list=[];expKeys().forEach(k=>{list.push(...((txIndex()[k]||{}).list||[]))});
  if(E.period==='range')list=list.filter(t=>t.date>=E.from&&t.date<=E.to);
  if(E.cat)list=list.filter(t=>t.cat===E.cat);if(E.mode)list=list.filter(t=>t.mode===E.mode);if(E.who)list=list.filter(t=>(t.by||'local')===E.who);
  return list.sort((a,b)=>a.date.localeCompare(b.date));
}
function expPeriodLabel(){const E=EXP,ks=expKeys();if(E.period==='month')return mLabel(E.month);if(E.period==='year')return String(E.year);if(E.period==='range')return dShort(E.from)+' '+E.from.slice(0,4)+' to '+dShort(E.to)+' '+E.to.slice(0,4);return ks.length>1?mLabel(ks[0])+' to '+mLabel(ks[ks.length-1]):ks.length?mLabel(ks[0]):'Everything'}
function expSummaryLine(){
  const E=EXP;if(E.format==='json')return'Everything in one backup file you can restore later.';
  const n=expEntries().length;const parts=EXP_PARTS.filter(([k])=>E.inc[k]);
  if(E.format==='csv')return`${n.toLocaleString('en-IN')} entries · ${expPeriodLabel()} · one CSV file`;
  return`${parts.length} section${parts.length===1?'':'s'} · ${n.toLocaleString('en-IN')} entries · ${expPeriodLabel()}`;
}
function renderExport(){
  const E=EXP;const cats=catsAll();
  const people=[...new Set(Object.values(D.tx).map(t=>t.by||'local'))];
  const chip=(act,k,on,l)=>`<button class="chip" data-act="${act}" data-k="${k}" aria-pressed="${on}">${l}</button>`;
  const years=[...new Set([curKey().slice(0,4),...Object.keys(txIndex()).map(k=>k.slice(0,4))])].sort().reverse();
  openSheet(`${sheetHead('Export')}
    <div class="flabel" style="margin-bottom:6px">Which period?</div>
    <div class="chips" style="margin-bottom:10px">${[['month','A month'],['year','A year'],['range','Date range'],['all','Everything']].map(([k,l])=>chip('expper',k,E.period===k,l)).join('')}</div>
    ${E.period==='month'?`<input class="input" type="month" id="exp-m" value="${E.month}" style="margin-bottom:14px">`:''}
    ${E.period==='year'?`<select class="input" id="exp-y" style="margin-bottom:14px">${years.map(y=>`<option ${String(E.year)===y?'selected':''}>${y}</option>`).join('')}</select>`:''}
    ${E.period==='range'?`<div class="two" style="margin-bottom:6px"><div class="field"><label for="exp-from">From</label><input class="input" type="date" id="exp-from" value="${E.from}"></div><div class="field"><label for="exp-to">To</label><input class="input" type="date" id="exp-to" value="${E.to}"></div></div>`:''}
    <div class="flabel" style="margin:4px 0 6px">Format</div>
    <div class="chips" style="margin-bottom:14px">${EXP_FORMATS.map(([k,l])=>chip('expfmt',k,E.format===k,l)).join('')}</div>
    ${E.format==='json'?'':E.format==='csv'?'<p class="small muted" style="margin:-6px 0 14px">CSV holds one table, so it includes entries only. Pick Excel for everything else.</p>':`
    <div class="flabel" style="margin-bottom:6px">What to include</div>
    <div class="chips" style="margin-bottom:14px">${EXP_PARTS.map(([k,l])=>chip('expinc',k,!!E.inc[k],l)).join('')}</div>`}
    ${E.format==='json'?'':`<button class="link small" data-act="expfilt" style="padding:0 0 10px">${E.filters?'Hide filters':'Only some entries? Filter by category, payment mode or person'}</button>
    ${E.filters?`<div class="filters" style="margin-bottom:14px">
      <select class="input" id="exp-cat" aria-label="Category"><option value="">All categories</option>${cats.map(c=>`<option value="${c.id}" ${E.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
      <select class="input" id="exp-mode" aria-label="Payment mode"><option value="">All payment modes</option>${MODES.map(x=>`<option ${E.mode===x?'selected':''}>${x}</option>`).join('')}</select>
      ${people.length>1?`<select class="input" id="exp-who" style="grid-column:1/-1" aria-label="Added by"><option value="">Everyone</option>${people.map(p=>`<option value="${esc(p)}" ${E.who===p?'selected':''}>${esc(who(p))}</option>`).join('')}</select>`:''}</div>`:''}`}
    <p class="small" id="exp-sum" style="margin:4px 0 12px;color:var(--muted)">${expSummaryLine()}</p>
    <button class="btn primary block" data-act="expgo">${E.format==='pdf'?'Create PDF':E.format==='json'?'Save backup':'Export'}</button>`);
}
function expReadInputs(){const E=EXP;const g=id=>{const e=$('#'+id);return e?e.value:null};
  if(g('exp-m'))E.month=g('exp-m');if(g('exp-y'))E.year=Number(g('exp-y'));if(g('exp-from'))E.from=g('exp-from');if(g('exp-to'))E.to=g('exp-to');
  if(g('exp-cat')!==null)E.cat=g('exp-cat');if(g('exp-mode')!==null)E.mode=g('exp-mode');if(g('exp-who')!==null)E.who=g('exp-who');}
function expTables(){
  const E=EXP,ks=expKeys(),T={};
  const ents=expEntries();
  if(E.inc.entries||E.format==='csv')T['Entries']=[['Date','Type','Section','Category','Amount (₹)','Paid by','Account','Card','Note','Added by'],...ents.map(t=>{if(isXfer(t))return[t.date,'Self transfer','','',t.amt/100,'',acctName(t.from)+' → '+acctName(t.to),'',t.note||'',who(t.by)];const c=D.cats[t.cat]||{};return[t.date,c.section==='income'?'Income':'Expense',SECN[c.section]||'',c.name||'',t.amt/100,t.mode||'',t.acct?acctName(t.acct):'',t.card&&D.cards[t.card]?D.cards[t.card].name:'',t.note||'',who(t.by)]})];
  if(E.format!=='csv'&&E.inc.accounts)T['Bank accounts']=[['Account','Bank','Type','Last 4','Balance (₹)','Last checked'],...acctList().map(a=>[acctLabel(a),a.bank||'',a.type||'',a.last4||'',acctBalance(a.id)/100,a.checkedAt||''])];
  if(E.format!=='csv'&&E.inc.networth){const n=netWorth();T['Net worth']=[['Item','Amount (₹)'],['Bank and cash',n.acc/100],...assetList().map(a=>[(a.name||a.type)+' ('+a.type+')',(a.value||0)/100]),['Loans still owed',-n.loans/100],['Credit card dues',-n.cards/100],['Net worth',n.total/100]]}
  if(E.format==='csv')return T;
  if(E.inc.summary)T['Monthly summary']=[['Month','Opening','Income','Savings','Bills','Spending','EMIs','Closing','Savings rate'],...ks.map(k=>{const m=month(k);return[mLabel(k),m.open/100,m.income/100,m.sec.savings.a/100,m.sec.bills.a/100,m.sec.expenses.a/100,m.sec.debt.a/100,m.close/100,m.income?Math.round(m.sec.savings.a/m.income*100)+'%':'']})];
  if(E.inc.budget)T['Budget vs actual']=[['Month','Section','Category','Budget (₹)','Actual (₹)','Left (₹)'],...ks.flatMap(k=>month(k).cats.filter(c=>!E.cat||c.id===E.cat).map(c=>[mLabel(k),SECN[c.section],c.name,c.budget/100,c.actual/100,c.left/100]))];
  if(E.inc.bills)T['Bills & EMIs']=[['Month','Bill or EMI','Due date','Budget (₹)','Paid (₹)','Status'],...ks.flatMap(k=>billsFor(k).map(b=>[mLabel(k),b.name,b.due,b.budget/100,b.actual/100,b.label]))];
  if(E.inc.loans)T['Loans']=[['Loan','Lender','Interest %','EMI (₹)','Outstanding (₹)','Months left','Payoff','Interest still to pay (₹)'],...Object.values(D.loans).map(l=>{const P=loanOutstanding(l),c=loanCalc(P,l.rate||0,l.emi||0);return[l.name,l.lender||'',l.rate||0,(l.emi||0)/100,P/100,c.err?'':c.n,c.err?c.err:mLabel(addM(curKey(),c.n)),c.err?'':c.interest/100]})];
  if(E.inc.cards)T['Credit cards']=[['Card','Bank','Limit (₹)','Month','Statement (₹)','Paid (₹)','Status'],...Object.values(D.cards).flatMap(cd=>ks.filter(k=>cd.stmts&&cd.stmts[k]).map(k=>{const st=cd.stmts[k],s=cardStatus(st);return[cd.name,cd.bank||'',(cd.limit||0)/100,mLabel(k),st.amt/100,(st.paid||0)/100,s==='full'?'Paid in full':s==='part'?'Part paid':'Not paid']}))];
  if(E.inc.goals)T['Goals']=[['Goal','Type','Target or loan','Progress','By when','Status'],...Object.values(D.goals).map(g=>{if(g.type==='yearly'){const y=yearlyCalc(g);return[g.name,'Yearly payment',(g.amount||0)/100,Math.round(y.prog*100)+'%',mLabel(y.due),'Set aside '+fmt(y.monthly)+' a month']}if(g.type==='loan'){const c=loanGoalCalc(g);return[g.name,'Clear a loan',c?fmt(c.P)+' left':'',c?Math.round(c.prog*100)+'%':'',g.date||'',c&&g.date?(c.on?'On track':'Behind'):'']}const c=goalCalc(g);return[g.name,'Save up',g.target/100,Math.round(c.prog*100)+'%',g.date||'',g.date?(c.on?'On track':'Behind'):'']})];
  return T;
}
async function runExport(){
  expReadInputs();const E=EXP;const name='Paisa Planner '+expPeriodLabel().replace(/[^\w\- ]+/g,'');
  if(E.format==='json'){closeSheet();return backup()}
  if(E.format!=='csv'&&!EXP_PARTS.some(([k])=>E.inc[k])){toast('Pick at least one thing to include.');return}
  const T=expTables();
  if(E.format==='csv'){
    const csv=T['Entries'].map(r=>r.map(v=>{const s=String(v??'');return/[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\n');
    closeSheet();await saveFile(name+'.csv',new Blob(['﻿'+csv],{type:'text/csv'}));log('exported','CSV',expPeriodLabel());return;
  }
  if(E.format==='pdf'){closeSheet();return printReport(T,name)}
  let X;try{X=await loadXLSX()}catch(e){toast("Couldn't load the Excel tools. Check your connection.");return}
  const wb=X.utils.book_new();for(const[n,rows]of Object.entries(T))X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(rows),n.slice(0,31));
  closeSheet();await saveFile(name+'.xlsx',X.write(wb,{type:'array',bookType:'xlsx'}));
  log('exported','Excel',expPeriodLabel()+' · '+Object.keys(T).join(', '));
}
function printReport(T,name){
  const s=S()||{};const fmtCell=v=>typeof v==='number'?INR.format(v):esc(v);
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>
    body{font-family:Manrope,system-ui,sans-serif;color:#14201B;margin:28px;font-size:11px}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 6px}
    .sub{color:#5B6863;margin:4px 0 14px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:4px 6px;border-bottom:1px solid #D9E0DC;text-align:left}th{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#5B6863}
    td:not(:first-child){white-space:nowrap}@page{margin:14mm}</style></head><body>
    <h1>${esc(s.name||'Paisa Planner')}</h1><div class="sub">${esc(expPeriodLabel())} · exported ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · amounts in ₹</div>
    ${Object.entries(T).map(([n,rows])=>`<h2>${esc(n)}</h2><table><thead><tr>${rows[0].map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(v=>`<td>${fmtCell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}
    </body></html>`;
  const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
  f.contentDocument.open();f.contentDocument.write(html);f.contentDocument.close();
  setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print();toast('Choose "Save as PDF" in the print window.')}catch(e){toast("This browser can't create PDFs here. Try Excel instead.")}setTimeout(()=>f.remove(),60000)},400);
  log('exported','PDF',expPeriodLabel());
}

/* ================= proactive budget warnings ================= */
// Pace: projects a category's month-end total from how fast it's being spent.
// Plan check: is more planned to go out than the month brings in?
function planGap(k){
  const m=month(k);const inc=m.cats.filter(c=>c.section==='income'&&!c.archived).reduce((t,c)=>t+c.budget,0);
  const out=m.cats.filter(c=>OUT.includes(c.section)&&!c.archived).reduce((t,c)=>t+c.budget,0);
  return{inc,out,gap:out-(m.open+inc)};
}
function planBannerHTML(k){
  const p=planGap(k);if(p.gap<=0)return'';
  return `<div class="planwarn"><div class="grow small"><b>Your plan is ${fmt(p.gap)} more than you'll have</b> in ${mLong(k)}. Planned out ${fmt(p.out)}, income ${fmt(p.inc)}${month(k).open?` plus ${fmt(month(k).open)} to start`:''}.</div>${canAdmin()?'<button class="btn sm" data-act="bedit">Trim the plan</button>':''}</div>`;
}

/* ================= scheduled reminders (web push) ================= */
const PUSH_READY=()=>CLOUD&&!!CFG.vapidPublicKey&&'PushManager' in window&&'serviceWorker' in navigator;
const RH=(k,d)=>{const v=parseInt(lsGet(k),10);return v>=0&&v<=23?v:d};
const pushPrefs=()=>({bills:lsGet('paisa-remind')!=='off',evening:lsGet('paisa-evening')==='on',weekly:lsGet('paisa-weekly')==='on',
  billsHour:RH('paisa-h-bills',8),eveningHour:RH('paisa-h-eve',21),weeklyHour:RH('paisa-h-week',19),weeklyDay:(()=>{const v=parseInt(lsGet('paisa-d-week'),10);return v>=0&&v<=6?v:0})()});
const hourLabel=h=>(h%12||12)+(h<12?' am':' pm');
const hourSelect=(id,val,from=0,to=23)=>`<select class="input tsel" id="${id}" aria-label="Time">${Array.from({length:to-from+1},(_,i)=>from+i).map(h=>`<option value="${h}" ${h===val?'selected':''}>${hourLabel(h)}</option>`).join('')}</select>`;
const b64uToBytes=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
const bytesToB64u=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let PUSH_ON=null;
async function syncPush(){
  if(!PUSH_READY()||!SB||!ME||!NOTIF_SUPPORT||Notification.permission!=='granted')return false;
  try{
    const reg=await navigator.serviceWorker.ready;const p=pushPrefs();
    let sub=await reg.pushManager.getSubscription();
    if(!p.bills&&!p.evening&&!p.weekly){if(sub){await SB.rpc('delete_push_subscription',{p_endpoint:sub.endpoint});await sub.unsubscribe()}PUSH_ON=false;return true}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(CFG.vapidPublicKey)});
    const j=sub.toJSON();const {error}=await SB.rpc('save_push_subscription',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_prefs:p});
    PUSH_ON=!error;return PUSH_ON;
  }catch(e){PUSH_ON=false;return false}
}
async function serverTest(el){
  el.disabled=true;
  const ok=await syncPush();
  if(!ok){el.disabled=false;toast("Couldn't register this phone for reminders. Check notifications are allowed.");return}
  const {data,error}=await SB.functions.invoke('send-reminders',{body:{kind:'test'}});
  el.disabled=false;
  if(error)toast("The reminder service isn't answering yet. The family Owner may need to finish setup.");
  else if(data&&data.sent){lsSet('paisa-push-ok','1');toast('Sent. It should arrive in a few seconds.');render()}
  else toast('No phone found. Turn reminders off and on, then try again.');
}
function remindersCardHTML(){
  const perm=NOTIF_SUPPORT?Notification.permission:'unsupported';
  const sched=PUSH_READY();
  const setup=CLOUD&&IS_OWNER&&!CFG.vapidPublicKey?`<a class="btn sm" href="#pushsetup" style="display:inline-block;margin-top:12px;text-decoration:none">Set up reminders for everyone</a><p class="small muted" style="margin:6px 0 0">One-time, for the Owner. Lets reminders arrive even when the app is closed.</p>`:'';
  const head=`<h2 style="margin-bottom:6px">Reminders</h2>`;
  if(perm==='unsupported')return `<section class="card">${head}<p class="small" style="margin:0">This browser can't show notifications. On iPhone, add the app to your home screen first (iOS 16.4 or later), then open it from there.</p>${setup}</section>`;
  if(perm==='denied')return `<section class="card">${head}<p class="small" style="margin:0">Notifications are blocked for this app. Allow them in your phone's settings for this site, then come back here.</p>${setup}</section>`;
  if(perm!=='granted')return `<section class="card">${head}<p class="small muted" style="margin:0 0 10px">${sched?'Get bill and EMI reminders on your phone at 8 am, even when the app is closed.':'Get a heads-up about bills and EMIs due within 3 days.'}</p><button class="btn primary" data-act="allownotif">Turn on reminders</button>${setup}</section>`;
  const tog=(id,on,t,s)=>`<label class="rtog"><span class="grow"><b>${t}</b><span class="small muted">${s}</span></span><input type="checkbox" id="${id}" ${on?'checked':''}></label>`;
  const p=pushPrefs();
  if(!sched)return `<section class="card">${head}
    ${tog('rem-on',p.bills,'Bills & EMIs','Checked when you open the app, at most once a day: anything due within 3 days or overdue.')}
    ${lsGet('paisa-local-ok')?'':'<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="testnotif">Send a test</button></div>'}
    ${setup||`<p class="small muted" style="margin:10px 0 0">${CLOUD?'Reminders while the app is closed will start once the app\'s reminder setup is finished.':'Reminders while the app is closed need family sync (Supabase) to be set up.'}</p>`}</section>`;
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `<section class="card">${head}
    ${tog('rem-on',p.bills,'Bills & EMIs','3 days before, on the day, and the next morning if still unpaid.')}
    ${p.bills?`<div class="hrow"><span class="small muted">Send at</span>${hourSelect('h-bills',p.billsHour)}</div>`:''}
    ${tog('rem-eve',p.evening,'Evening nudge','Only on days you haven\'t logged anything.')}
    ${p.evening?`<div class="hrow"><span class="small muted">Send at</span>${hourSelect('h-eve',p.eveningHour,12,23)}</div>`:''}
    ${tog('rem-week',p.weekly,'Weekly check-in','What you spent this week, in one line.')}
    ${p.weekly?`<div class="hrow"><span class="small muted">Every</span><select class="input tsel" id="d-week" aria-label="Day">${days.map((d,i)=>`<option value="${i}" ${i===p.weeklyDay?'selected':''}>${d}</option>`).join('')}</select><span class="small muted">at</span>${hourSelect('h-week',p.weeklyHour)}</div>`:''}
    ${!(p.bills||p.evening||p.weekly)?'':!lsGet('paisa-push-ok')?'<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="servertest">Send a test</button></div>'
      :PUSH_ON===false?'<div class="planwarn" style="margin-top:10px"><div class="grow small">Reminders aren\'t reaching this phone right now.</div><button class="btn sm" data-act="servertest">Fix it</button></div>'
      :'<p class="small" style="margin:12px 0 0;color:var(--good)">● On for this phone</p>'}
    <p class="small muted" style="margin:10px 0 0">These arrive even when the app is closed.</p></section>`;
}

/* ================= one-time reminder setup page (Owner) ================= */
let PS={keys:null,secret:null,sql:'',fn:''};
async function psGenerate(){
  const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',kp.privateKey);
  const pub=new Uint8Array([4,...b64uToBytes(jwk.x),...b64uToBytes(jwk.y)]);
  PS.keys={pub:bytesToB64u(pub),priv:jwk.d};
  PS.secret=[...crypto.getRandomValues(new Uint8Array(24))].map(b=>b.toString(16).padStart(2,'0')).join('');
  render();
}
function cronSQL(){
  const url=(CFG.supabaseUrl||'https://YOUR-PROJECT.supabase.co').replace(/\/$/,'')+'/functions/v1/send-reminders';
  const sec=PS.secret||'PASTE-YOUR-CRON-SECRET';
  const job=(name,cron,kind)=>`select cron.schedule('${name}', '${cron}', $job$
  select net.http_post(
    url := '${url}',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','${sec}'),
    body := jsonb_build_object('kind','${kind}'))
$job$);`;
  return `-- Paisa Planner reminder schedule: runs at the top of every hour (India time);
-- each person gets reminders at the times they picked in Settings → Reminders.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobname) from cron.job where jobname like 'paisa-%';
${job('paisa-hourly','30 * * * *','auto')}`;
}
async function psLoadFiles(){
  if(PS.sql&&PS.fn)return;
  try{const [a,b]=await Promise.all([fetch('supabase/push.sql').then(r=>r.ok?r.text():''),fetch('supabase/functions/send-reminders/index.ts').then(r=>r.ok?r.text():'')]);PS.sql=a;PS.fn=b;render()}catch(e){}
}
function pushSetupView(){
  psLoadFiles();
  const code=(id,txt,rows=6)=>`<textarea class="input mono" id="${id}" rows="${rows}" readonly>${esc(txt)}</textarea><button class="btn sm" data-act="pscopy" data-k="${id}" style="margin-top:6px">Copy</button>`;
  const step=(n,t,body)=>`<section class="sect"><h2 style="margin-bottom:8px"><span class="stepn">${n}</span>${t}</h2>${body}</section>`;
  return topbar('Reminder setup',{month:false,back:'prefs'})+`<div class="stack">
  <p class="heroline" style="margin:0">One-time setup so reminders reach every family member's phone at the time they choose, even with the app closed. About 10 minutes, in your Supabase dashboard. Your brother's family and yours share it automatically.</p>
  ${!CLOUD?'<div class="planwarn"><div class="small">Family sync (Supabase) isn\'t set up in this copy of the app, so scheduled reminders can\'t work yet.</div></div>':''}
  ${CFG.vapidPublicKey?'<div class="planwarn"><div class="small"><b>Reminders are already set up.</b> Don\'t make new keys unless the private key has leaked: new keys stop reminders on every phone until each person turns them off and on again.</div></div>':''}
  ${step(1,'Create the reminders table',`<p class="small muted" style="margin:0 0 8px">Supabase → <b>SQL Editor</b> → New query → paste → <b>Run</b>.</p>${PS.sql?code('ps-sql',PS.sql,8):'<p class="small muted">Loading…</p>'}`)}
  ${step(2,'Make your keys',`<p class="small muted" style="margin:0 0 8px">These are made on this phone and never sent anywhere. Keep this page open until step 5.</p>
    ${PS.keys?`<div class="field"><label>Public key <span class="muted">(safe to share)</span></label>${code('ps-pub',PS.keys.pub,2)}</div>
      <div class="field"><label>Private key <span class="over">(secret, don't share)</span></label>${code('ps-priv',PS.keys.priv,1)}</div>
      <div class="field"><label>Schedule password <span class="over">(secret)</span></label>${code('ps-sec',PS.secret,1)}</div>`:'<button class="btn primary" data-act="psgen">Make keys</button>'}`)}
  ${step(3,'Add the reminder sender',`<p class="small muted" style="margin:0 0 8px">Supabase → <b>Edge Functions</b> → <b>Deploy a new function</b> → <b>Via Editor</b>. Name it exactly <b>send-reminders</b>, replace the sample code with this, then <b>Deploy</b>. After it deploys, open its <b>Details</b> and turn <b>off</b> "Verify JWT" (the schedule password protects it instead), then save.</p>${PS.fn?code('ps-fn',PS.fn,8):'<p class="small muted">Loading…</p>'}`)}
  ${step(4,'Save the secrets',`<p class="small muted" style="margin:0 0 8px">Supabase → <b>Edge Functions</b> → <b>Secrets</b> → add these four:</p>
    <div class="kv small"><span class="mono">VAPID_PUBLIC_KEY</span><span>public key from step 2</span></div>
    <div class="kv small"><span class="mono">VAPID_PRIVATE_KEY</span><span>private key from step 2</span></div>
    <div class="kv small"><span class="mono">CRON_SECRET</span><span>schedule password from step 2</span></div>
    <div class="kv small"><span class="mono">VAPID_SUBJECT</span><span>mailto: and your email</span></div>`)}
  ${step(5,'Turn on the schedule',`<p class="small muted" style="margin:0 0 8px">Supabase → <b>SQL Editor</b> → New query → paste → <b>Run</b>. ${PS.secret?'Your schedule password is already filled in.':'Make keys in step 2 first so the password is filled in.'}</p>${code('ps-cron',cronSQL(),10)}`)}
  ${step(6,'Tell the app your public key',`<p class="small muted" style="margin:0">Send the <b>public key</b> from step 2 to whoever manages the app (it's safe to share), or paste it into <span class="mono">config.js</span> as <span class="mono">vapidPublicKey</span> on GitHub. Then everyone opens Settings → Reminders → <b>Send a test</b>.</p>`)}
  </div>`;
}

const ordinal=n=>n+(['th','st','nd','rd'][(n%10<4&&Math.floor(n%100/10)!==1)?n%10:0]);
/* ================= viewport & keyboard (iPhone) ================= */
(function(){
  const vv=window.visualViewport;const root=document.documentElement;
  const sync=()=>{if(!vv)return;root.style.setProperty('--vvh',vv.height+'px');root.style.setProperty('--vvt',vv.offsetTop+'px')};
  if(vv){vv.addEventListener('resize',sync);vv.addEventListener('scroll',sync);sync()}
  const isField=el=>el&&/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)&&!/^(checkbox|radio|file|button|submit)$/.test(el.type||'');
  document.addEventListener('focusin',e=>{if(isField(e.target))document.body.classList.add('kb')});
  document.addEventListener('focusout',()=>setTimeout(()=>{if(!isField(document.activeElement))document.body.classList.remove('kb')},50));
  // stop the page behind an open sheet from scrolling
  new MutationObserver(()=>document.body.classList.toggle('sheet-open',!!document.querySelector('#sheetRoot .scrim'))).observe(document.getElementById('sheetRoot'),{childList:true});
  document.addEventListener('toggle',e=>{if(e.target&&e.target.id==='home-more')lsSet('paisa-home-more',e.target.open?'1':'0')},true);
})();
