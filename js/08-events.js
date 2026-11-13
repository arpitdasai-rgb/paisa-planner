/* Paisa Planner · events: one delegated handler for every button, inputs, keyboard.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= events ================= */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act,id=el.dataset.id;
  if(a==='scrim'&&e.target!==el)return;
  switch(a){
    case 'attall':ATT_ALL=!ATT_ALL;render();break;
    case 'dismsg':lsSet('paisa-dis-'+el.dataset.k+'-'+VM,'1');render();break;
    case 'hview':HVIEW=el.dataset.k;render();break;
    case 'prefsec':PREFSEC=el.dataset.k;PREF_KEEP=true;closeSheet();if(route==='prefs'){render();window.scrollTo(0,0)}else location.hash='prefs';break;
    case 'prefback':PREFSEC=null;render();window.scrollTo(0,0);break;
    case 'invsheet':inviteSheet();break;
    case 'rolessheet':rolesSheet();break;
    case 'activitysheet':activitySheet();break;
    case 'setrole':{closeSheet();const fake={disabled:false};setRole(id,el.dataset.k,fake);break}
    case 'goplan':planTab=el.dataset.k;PLAN_KEEP=true;closeSheet();if(planTab==='networth')ensureSnapshot();if(route==='plan'){render();window.scrollTo(0,0)}else location.hash='plan';break;
    case 'wpick':WSEL=id;render();{const s=$('.cstack');if(s)s.scrollIntoView({block:'center',behavior:'smooth'})}break;
    case 'wfilter':WFILTER=el.dataset.k;WSEL=null;render();break;
    case 'wdetail':openWalletDetail(id);break;
    case 'wpay':{const s=cardState(id);closeSheet();openQuick({type:'xfer',to:'card:'+id,amt:s.due?String(s.due/100):'',from:defaultAcct(),note:'Card bill'});break}
    case 'wxfer':closeSheet();openQuick({type:'xfer',from:id});break;
    case 'waddmenu':openSheet(`${sheetHead('Add to Wallet')}<div class="stack"><button class="pillbtn block" data-act="editacct">Bank account</button><button class="btn block" data-act="editcard">Credit card</button><button class="btn block" data-act="goplan" data-k="loans">Loan</button></div>`);break;
    case 'mq':{const i=$('#m-q');if(i){i.value=el.dataset.k;moreSearch(el.dataset.k);saveRecentQ(el.dataset.k)}break}
    case 'go':location.hash=el.dataset.k;break;
    case 'catentries':F={cat:id,mode:'',q:''};location.hash='transactions';break;
    case 'bedit':BEDIT=true;BDRAFT={};BSCOPE='future';render();window.scrollTo(0,0);break;
    case 'bcancel':BEDIT=false;BDRAFT={};render();break;
    case 'bsave':saveBudgets();break;
    case 'bscope':BSCOPE=el.dataset.k;el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el));break;
    case 'qrep':{const r=QA&&QA.reps&&QA.reps[Number(el.dataset.i)];if(!r)break;Object.assign(QA,{cat:r.cat,amt:String(r.amt/100),note:r.note,mode:r.mode,card:r.card||(r.mode==='Card'?defaultCard():'')});renderQuick();break}
    case 'mprev':VM=addM(VM,-1);render();break;
    case 'mnext':VM=addM(VM,1);render();break;
    case 'yprev':reportYear--;render();break;
    case 'ynext':reportYear++;render();break;
    case 'scrim':case 'close':closeSheet();break;
    case 'breakdown':openBreakdown();break;
    case 'onb-sd':ONB.startDay=Number(el.dataset.k);render();break;
    case 'onb-inc':ONB.income=el.dataset.k;render();break;
    case 'onb-hh':ONB.household=el.dataset.k;render();break;
    case 'onb-tile':{const tl=TILES.find(x=>x.k===el.dataset.k);if(ONB.sel[tl.k])delete ONB.sel[tl.k];else ONB.sel[tl.k]={amt:String(round500(onbIncome()/100*tl.pct))};render();break}
    case 'onb-go':if(ONB.step===2&&!(onbIncome()>0)){toast('Enter roughly what comes in.');break}ONB.step++;render();window.scrollTo(0,0);break;
    case 'onb-back':ONB.step=Math.max(1,ONB.step-1);render();break;
    case 'onb-create':el.disabled=true;el.textContent='Setting up…';await finishOnboarding();break;
    case 'fab':openQuick();break;
    case 'setdue':{const c={...D.cats[id],dueDay:Number(el.dataset.k)};closeSheet();store.set('cats',id,c).then(()=>log('set','due day',c.name+' on '+c.dueDay)).catch(()=>{});toast(`Got it. I'll remind you before the ${c.dueDay}${c.dueDay%10===1&&c.dueDay!==11?'st':c.dueDay%10===2&&c.dueDay!==12?'nd':c.dueDay%10===3&&c.dueDay!==13?'rd':'th'}.`);break}
    case 'duepick':openSheet(`${sheetHead('Which day?')}<div class="field"><label for="dp-day">Day of the month (1–31)</label><input class="input num" id="dp-day" inputmode="numeric" autofocus></div><button class="btn primary block" data-act="duepicksave" data-id="${id}">Save</button>`);break;
    case 'duepicksave':{const d=parseInt(val('dp-day'),10);if(!(d>=1&&d<=31)){toast('Enter a day between 1 and 31.');break}const c={...D.cats[id],dueDay:d};closeSheet();store.set('cats',id,c).catch(()=>{});toast('Due day saved.');break}
    case 'loanask':openLoanAsk(id);break;
    case 'loanreveal':loanReveal(id);break;
    case 'duedates':openDueDates();break;
    case 'savedues':saveDues();break;
    case 'snooze':lsSet('paisa-snooze-'+el.dataset.k,String(Date.now()+3*864e5));render();break;
    case 'goinvite':closeSheet();location.hash='family';setTimeout(()=>{const i=$('#inv-email');if(i)i.focus()},300);break;
    case 'goloans':closeSheet();planTab='loans';location.hash='plan';break;
    case 'wrapnext':WRAP.step++;openWrap(WRAP.prev);break;
    case 'wrapclose':closeWrap();break;
    case 'wrapraise':wrapRaise(id,el.dataset.k);break;
    case 'qtexton':QA.text=true;renderQuick();setTimeout(()=>{const i=$('#q-text');if(i)i.focus()},60);break;
    case 'qtextoff':{const o=qtextResolve();if(o.amt)qtextApply(false);else{QA.text=false;renderQuick()}break}
    case 'qpaste':navigator.clipboard.readText().then(s=>{QA.qtext=s||'';const i=$('#q-text');if(i)i.value=QA.qtext;const h=$('#q-text-hint');if(h)h.innerHTML=qtextHint()}).catch(()=>toast('Allow paste, or long-press the box and tap Paste.'));break;
    case 'qpaycard':{qSync();const lk=cardOfCat(D.cats[QA.cat]);const cid=lk&&lk!=='*'?lk:Object.keys(D.cards)[0];QA.type='xfer';QA.cat=null;QA.from=QA.acct||defaultAcct();QA.to=cid?'card:'+cid:'';renderQuick();break}
    case 'key':{const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))a.blur()}quickKey(el.dataset.k);break;
    case 'qcat':qSync();QA.cat=id;QA.guessed=false;renderQuick();break;
    case 'qtype':qSync();QA.type=el.dataset.k;QA.guessed=false;QA.split=null;QA.cat=QA.type==='in'?lastIncomeCat():null;if(QA.type==='xfer'){QA.from=QA.from||defaultAcct();QA.to=''}else if(!QA.acct)QA.acct=defaultAcct(QA.mode);if(QA.type==='in'&&QA.mode==='Card')QA.mode='Net banking';if(QA.type==='in'&&QA.mode==='UPI'&&!QA.amt)QA.mode='Net banking';renderQuick();break;
    case 'qmore':qSync();QA.more=!QA.more;renderQuick();if(QA.more){const n=$('#q-note');if(n&&!QA.note)n.focus()}break;
    case 'qall':qSync();QA.all=!QA.all;renderQuick();break;
    case 'qmode':qSync();QA.mode=el.dataset.k;if(QA.mode==='Card'&&!QA.card)QA.card=defaultCard();if(QA.mode==='Cash')QA.acct=defaultAcct('Cash');renderQuick();break;
    case 'qacct':qSync();QA.acct=id;renderQuick();break;
    case 'qfrom':qSync();QA.from=id;if(QA.to===id)QA.to='';renderQuick();break;
    case 'qto':qSync();QA.to=id;renderQuick();break;
    case 'spliton':qSync();QA.split=[{cat:QA.cat||'',amt:QA.amt||''},{cat:'',amt:''}];QA.more=false;renderQuick();break;
    case 'splitoff':qSyncSplit();QA.split=null;renderQuick();break;
    case 'splitadd':qSyncSplit();QA.split.push({cat:'',amt:''});renderQuick();break;
    case 'splitdel':qSyncSplit();QA.split.splice(+el.dataset.k,1);if(!QA.split.length)QA.split=null;renderQuick();break;
    case 'editacct':closeSheet();openAccount(id);break;
    case 'actype':ACTYPE=el.dataset.k;el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el));break;
    case 'saveacct':saveAccount(id);break;
    case 'archacct':confirmSheet('Remove '+esc(acctName(id))+'?','Past entries keep their history. You can add it again later.','Remove',async()=>{await store.set('accounts',id,{...D.accounts[id],archived:true,isDefault:false}).catch(()=>{});toast('Account removed.')});break;
    case 'checkacct':openCheck(id);break;
    case 'checklog':{const v=Number(el.dataset.k);const cur=acctBalance(id),d=v-cur,cat=$('#ck-cat').value;if(!cat||!d)break;closeSheet();const now=Date.now();
      await store.set('tx',uid(),{byName:MYNAME||'',cat,amt:Math.abs(d),date:todayISO(),mode:'UPI',note:'Found in bank check',card:'',acct:id,src:'reconcile',by:ME||'local',at:now,ub:ME||'local',uat:now}).catch(()=>{});
      await store.set('accounts',id,{...D.accounts[id],checkedAt:todayISO()}).catch(()=>{});log('logged','bank check',`${acctName(id)} ${fmt(Math.abs(d))}`);toast(`Logged ${fmt(Math.abs(d))} · ${D.cats[cat].name}. ${acctName(id)} now matches your bank.`);break}
    case 'useopenbank':{const bs=bankStart(VM);if(bs==null)break;store.patch('months',VM,['open'],bs).then(()=>log('changed','opening balance',mLabel(VM)+' '+fmt(bs)+' from banks')).catch(()=>{});toast(`${mLong(VM)} now starts with ${fmt(bs)}, from your banks.`);break}
    case 'checkyes':{closeSheet();await store.set('accounts',id,{...D.accounts[id],checkedAt:todayISO()}).catch(()=>{});toast('Balance confirmed.');break}
    case 'checkfix':{const v=amtOrNull('ck-bal');if(v==null){toast('Enter what your bank shows.');break}if(v===acctBalance(id)){closeSheet();await store.set('accounts',id,{...D.accounts[id],checkedAt:todayISO()}).catch(()=>{});toast('Balance confirmed.');break}openCheckDiff(id,v);break}
    case 'checkadj':{const v=Number(el.dataset.k);const cur=acctBalance(id);closeSheet();await store.set('accounts',id,{...D.accounts[id],adj:(D.accounts[id].adj||0)+(v-cur),checkedAt:todayISO()}).catch(()=>{});log('corrected','balance',acctName(id)+' to '+fmt(v));toast('Balance updated to '+fmt(v)+'.');break}
    case 'recok':confirmRec(id);break;
    case 'recskip':{store.patch('bills',curKey(),['skipRec',id],true).catch(()=>{});toast('Skipped for this month.');break}
    case 'editrec':closeSheet();openRec(id,id?{}:(el.dataset.k?{cat:el.dataset.k,amt:Number(el.dataset.amt)||null,day:Number(el.dataset.day)||1,mode:'Net banking'}:{}));break;
    case 'rectype':RECTYPE=el.dataset.k;openRec(null,{});break;
    case 'saverec':saveRec(id);break;
    case 'delrec':closeSheet();store.del('recurring',id).catch(()=>{});toast('Repeat deleted.');break;
    case 'editasset':openAsset(id);break;
    case 'saveasset':{const v=amtOrNull('as-val');if(v==null){toast('Enter the value.');break}const o={type:val('as-type'),name:val('as-name').trim(),value:v,asOf:todayISO()};closeSheet();await store.set('assets',id||uid(),o).catch(()=>{});log(id?'updated':'added','asset',o.name||o.type);ensureSnapshot();break}
    case 'delasset':closeSheet();store.del('assets',id).catch(()=>{});break;
    case 'delaccount':confirmSheet('Delete your account?','This signs you out and removes your sign-in, profile and reminders. Your past entries stay with the family under your name.'+(IS_OWNER?' If you are the only member, the family budget is deleted too.':''),'Delete my account',async()=>{const {error}=await SB.rpc('delete_my_account');if(error){toast(errMsg(error));return}clearFamilyCache();toast('Your account has been deleted.');await SB.auth.signOut()});break;
    case 'qcard':qSync();QA.card=id;renderQuick();break;
    case 'qsave':quickSave();break;
    case 'qdel':quickDelete();break;
    case 'edittx':if(SWIPED){SWIPED=false;break}
      if(SEL){const t=D.tx[id];if(!t||!canEditTx(t))break;SEL.has(id)?SEL.delete(id):SEL.add(id);const sw=el.closest('.swipe');if(sw)sw.classList.toggle('picked',SEL.has(id));const sb=$('.selbar');if(sb)sb.outerHTML=selBar();break}
      openEditTx(id);break;
    case 'selstart':SEL=new Set();render();break;
    case 'selcancel':SEL=null;render();break;
    case 'selall':document.querySelectorAll('#txlist .swipe[data-can="1"]').forEach(s=>SEL.add(s.dataset.id));render();break;
    case 'seldel':if(SEL&&SEL.size)openDelete({ids:[...SEL],step:3});break;
    case 'deldata':openDelete();break;
    case 'stmmatch':closeSheet();openStmMatch(id);break;
    case 'stmtoggle':{const r=STM.rows[+el.dataset.i];document.querySelectorAll('[data-stmcat]').forEach(s=>{STM.rows[+s.dataset.stmcat].cat=s.value});r.on=!r.on;renderStm();break}
    case 'stmsave':stmSave();break;
    case 'helptopic':HELPT=el.dataset.k;render();break;
    case 'helpq':HELPQ=el.dataset.k;HELPT='';render();break;
    case 'helpopen':HELPQ=el.dataset.k||'';HELPT='';location.hash='help';break;
    case 'clearmonth':openDelete({what:{entries:true,budgets:true,bills:true},period:'month',month:VM,step:1});break;
    case 'acctdel':closeSheet();openDelete({what:{entries:true,accounts:true},pick:{accounts:[id]},period:'all',f:{acct:id},step:2});break;
    case 'carddel':closeSheet();openDelete({what:{entries:true,cards:true},pick:{cards:[id]},period:'all',f:{acct:'card:'+id},step:2});break;
    case 'delwhat':{const k=el.dataset.k;DEL.what[k]=!DEL.what[k];if(k==='entries'||k==='cards'||k==='assets')DEL.pick={...DEL.pick};renderDelete();break}
    case 'delper':delRead();DEL.period=el.dataset.k;DEL.typed='';renderDelete();break;
    case 'delkind':{delRead();const K=DEL.f.kinds,k=el.dataset.k;DEL.f.kinds=K.includes(k)?K.filter(x=>x!==k):[...K,k];renderDelete();break}
    case 'delcat':{delRead();const C=DEL.f.cats,k=el.dataset.k;DEL.f.cats=C.includes(k)?C.filter(x=>x!==k):[...C,k];renderDelete();break}
    case 'delsrc':delRead();DEL.f.src=el.dataset.k;renderDelete();break;
    case 'delmore':delRead();DEL.more=!DEL.more;renderDelete();break;
    case 'delpick':{delRead();const k=el.dataset.k,pid=el.dataset.id;const cur=DEL.pick[k]||delPickList(k).map(x=>x[0]);DEL.pick[k]=cur.includes(pid)?cur.filter(x=>x!==pid):[...cur,pid];renderDelete();break}
    case 'delnext':{delRead();const st=delSteps();DEL.step=st[Math.min(st.length-1,st.indexOf(DEL.step)+1)];DEL.typed='';renderDelete();const sh=$('#sheetRoot .sheet');if(sh)sh.scrollTop=0;break}
    case 'delback':{delRead();const st=delSteps();DEL.step=st[Math.max(0,st.indexOf(DEL.step)-1)];renderDelete();break}
    case 'delkeep':setTimeout(()=>{delRead();renderDelete()},0);break;
    case 'delgo':delGo();break;
    case 'delbackup':backup();break;
    case 'delfresh':openFresh();break;
    case 'freshgo':freshGo();break;
    case 'trashrestore':restoreTrash(id).then(()=>render());break;
    case 'trashdrop':confirmSheet('Delete for good?',"This can't be undone.",'Delete for good',async()=>{trashDrop(id);render()});break;
    case 'catdel':openCatDelete(id);break;
    case 'catdelmode':CATDEL=el.dataset.k;el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el));{const w=$('#cd-movewrap');if(w)w.hidden=CATDEL==='del'}break;
    case 'catdelgo':catDelGo(id);break;
    case 'paybill':{const c=catById(id);const b=budgetOf(c,VM);const due=dueDate(c,VM);const t=todayISO();
      const rr=recForCat(id);openQuick({cat:id,amt:rr?String(rr.amt/100):b?String(b/100):'',mode:rr&&rr.mode||'Auto-debit',acct:rr&&rr.acct||defaultAcct(),date:VM===curKey()?(t<mStart(VM)?mStart(VM):t):due,title:'Mark '+c.name+' paid'});break}
    case 'skip':case 'unskip':{store.patch('bills',VM,['skip',id],a==='skip'?true:null).then(()=>log(a==='skip'?'skipped':'unskipped','bill',(D.cats[id]||{}).name)).catch(()=>{});break}
    case 'addcat':openCat(null,el.dataset.sec);break;
    case 'editcat':openCat(id);break;
    case 'scope':SCOPE=el.dataset.k;el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el));break;
    case 'savecat':saveCat(id,el.dataset.sec);break;
    case 'catup':moveCat(id,-1);break;
    case 'catdown':moveCat(id,1);break;
    case 'catarch':{const c={...D.cats[id],archived:!D.cats[id].archived};closeSheet();store.set('cats',id,c).then(()=>log(c.archived?'archived':'restored','category',c.name)).catch(()=>{});toast(c.archived?'Archived '+c.name:'Restored '+c.name);break}
    case 'editopen':openOpening();break;
    case 'saveopen':{const v=amtOrNull('ob');if(v==null){toast('Enter an amount.');break}closeSheet();store.patch('months',VM,['open'],v).then(()=>log('changed','opening balance',mLabel(VM)+' '+fmt(v))).catch(()=>{});break}
    case 'resetopen':{closeSheet();store.patch('months',VM,['open'],null).catch(()=>{});break}
    case 'editloan':openLoan(id);break;
    case 'saveloan':{const name=val('l-name').trim();if(!name){toast('Give the loan a name.');break}
      const o={name,lender:val('l-lender').trim(),original:amtOrNull('l-orig'),rate:parseFloat(val('l-rate'))||0,emi:amtOrNull('l-emi')||0,outstanding:amtOrNull('l-out')||0,cat:val('l-cat'),asOf:todayISO()};
      closeSheet();store.set('loans',id||uid(),o).then(()=>log(id?'edited':'added','loan',name)).catch(()=>{});break}
    case 'delloan':closeSheet();delCommit({dels:[{col:'loans',id}],label:((D.loans[id]||{}).name||'Loan')+' loan'});break;
    case 'editcard':openCard(id);break;
    case 'savecard':{const name=val('k-name').trim();if(!name){toast('Give the card a name.');break}
      const o={...(id?D.cards[id]:{stmts:{}}),name,bank:val('k-bank').trim(),limit:amtOrNull('k-limit')||0,stmtDay:parseInt(val('k-sd'),10)||null,dueDay:parseInt(val('k-dd'),10)||null};
      const cid=id||uid();const link=$('#k-cat')?$('#k-cat').value:null;closeSheet();store.set('cards',cid,o).then(()=>log(id?'edited':'added','card',name)).catch(()=>{});
      if(link!==null)Object.entries(D.cats).forEach(([x,c])=>{const want=x===link;if(want&&c.card!==cid)store.set('cats',x,{...c,card:cid}).catch(()=>{});else if(!want&&c.card===cid){const n={...c};delete n.card;store.set('cats',x,n).catch(()=>{})}});
      break}
    case 'delcard':closeSheet();delCommit({dels:[{col:'cards',id}],label:((D.cards[id]||{}).name||'')+' card'});break;
    case 'stmt':openStmt(id);break;
    case 'savestmt':{const o={name:D.cards[id].name};const st={amt:amtOrNull('s-amt')||0,paid:amtOrNull('s-paid')||0};closeSheet();store.patch('cards',id,['stmts',VM],st).then(()=>log('updated','card statement',o.name+' '+mLabel(VM))).catch(()=>{});break}
    case 'editgoal':openGoal(id);break;
    case 'savegoal':saveGoal(id);break;
    case 'newgoal':openGoal(null,el.dataset.k);break;
    case 'gtype':openGoal(null,el.dataset.k);break;
    case 'delgoal':closeSheet();delCommit({dels:[{col:'goals',id}],label:((D.goals[id]||{}).name||'Goal')+' goal'});break;
    case 'saveprefs':{const op=amtOrNull('p-op');const o={...S(),name:val('p-name').trim()||S().name,startDay:Number(val('p-sd'))||1,startMonth:val('p-sm')||S().startMonth,opening:op==null?S().opening:op};const hi=$('#p-hideinc');if(hi)o.hideIncome=hi.checked;
      store.set('settings','main',o).then(()=>{log('changed','settings','');toast('Settings saved.')}).catch(()=>{});break}
    case 'setpin':showLock('set');break;
    case 'clearpin':lsSet('paisa-pin',null);toast('PIN removed.');render();break;
    case 'pin':pinKey(el.dataset.k);break;
    case 'pincancel':$('#lockRoot').innerHTML='';break;
    case 'template':downloadTemplate();break;
    case 'doimport':doImport();break;
    case 'impnext':IMP.step++;openImportStep();break;
    case 'impskipm':IMP.skip[el.dataset.k]=true;IMP.step++;openImportStep();break;
    case 'impallok':IMP.step=impSteps().length-1;openImportStep();break;
    case 'exp-month':openExport({period:'month',month:VM});break;
    case 'exp-year':openExport({period:'year',year:route==='reports'?reportYear:Number(VM.slice(0,4))});break;
    case 'expper':expReadInputs();EXP.period=el.dataset.k;renderExport();break;
    case 'expfmt':expReadInputs();EXP.format=el.dataset.k;renderExport();break;
    case 'expinc':expReadInputs();EXP.inc[el.dataset.k]=!EXP.inc[el.dataset.k];renderExport();break;
    case 'expfilt':expReadInputs();EXP.filters=!EXP.filters;renderExport();break;
    case 'expgo':runExport();break;
    case 'wipe':wipe();break;
    case 'dowipe':doWipe();break;
    case 'install':if(INSTALL_EVT){INSTALL_EVT.prompt();const r=await INSTALL_EVT.userChoice.catch(()=>null);INSTALL_EVT=null;if(r&&r.outcome==='accepted')toast('Installed. Find Paisa Planner on your home screen.');render()}break;
    case 'allownotif':{const p=await Notification.requestPermission();if(p==='granted'){lsSet('paisa-remind','on');const s=await syncPush();toast(s?'Reminders on. Pick your times below.':'Reminders on.');if(!s)checkReminders(true)}render();break}
    case 'servertest':serverTest(el);break;
    case 'psgen':psGenerate();break;
    case 'pscopy':{const ta=$('#'+el.dataset.k);if(ta){navigator.clipboard.writeText(ta.value).then(()=>toast('Copied.'),()=>{ta.select();toast('Selected. Copy it from the menu.')})}break}
    case 'testnotif':lsSet('paisa-local-ok','1');setTimeout(render,300);notify('Paisa Planner','Reminders are working. You will hear about dues 3 days ahead.');break;
    case 'backup':backup();break;
    case 'dorestore':doRestore();break;
    case 'reload':location.reload();break;
    case 'google':googleSignIn();break;
    case 'signout':signOut();break;
    case 'createfam':createFamily(el);break;
    case 'acceptinv':acceptInvite(id,el);break;
    case 'declineinv':{await SB.rpc('decline_invite',{p_invite:id});cloudNoFamily();break}
    case 'invrole':INVROLE=el.dataset.k;el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el));{const h=$('#inv-help');if(h)h.textContent=ROLEHELP[INVROLE]}break;
    case 'invite':sendInvite(el);break;
    case 'revokeinv':{const {error}=await SB.rpc('revoke_invite',{p_invite:id});if(error)toast(errMsg(error));else{toast('Invite revoked.');loadMembers()}break}
    case 'copyinv':copyInvite(el.dataset.email,el.dataset.role);break;
    case 'sharemsg':shareText(INVMSG);break;
    case 'copymsg':copyText(INVMSG);break;
    case 'memmenu':memberMenu(id);break;
    case 'makeowner':confirmSheet('Make '+esc(NAMES[id]||'them')+' the Owner?','You will become an Admin. Only the new Owner can delete the family or hand ownership back.','Make Owner',async()=>{const {error}=await SB.rpc('transfer_ownership',{p_user:id});if(error)toast(errMsg(error));else{toast('Ownership handed over.');loadMembers()}});break;
    case 'removemem':confirmSheet('Remove '+esc(NAMES[id]||'this person')+'?','They lose access straight away. Their past entries stay, marked with their name.','Remove',async()=>{const {error}=await SB.rpc('remove_member',{p_user:id});if(error)toast(errMsg(error));else{toast('Removed from the family.');loadMembers()}});break;
    case 'leave':confirmSheet('Leave this family?','You will lose access to this budget. Your past entries stay with the family.','Leave family',async()=>{const {error}=await SB.rpc('leave_family');if(error){toast(errMsg(error));return}clearFamilyCache();toast('You left the family.');cloudNoFamily()});break;
    case 'confirmok':{const f=CONFIRMFN;CONFIRMFN=null;closeSheet();if(f)await f();break}
    case 'toastact':{const f=TOASTFN;TOASTFN=null;$('#toastRoot').innerHTML='';if(f)f();break}
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='q-text'&&QA){e.preventDefault();e.stopImmediatePropagation();QA.qtext=e.target.value;qtextApply(true)}});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.onb){ONB[t.dataset.onb]=t.value.replace(/[^0-9]/g,'');if(t.value!==ONB[t.dataset.onb])t.value=ONB[t.dataset.onb];const nb=document.querySelector('[data-act=onb-go]');if(nb&&ONB.step===2)nb.disabled=!(onbIncome()>0)}
  else if(t.dataset.onbtile){ONB.sel[t.dataset.onbtile].amt=t.value.replace(/[^0-9]/g,'');const l=$('#onb-left');if(l)l.innerHTML=onbLeftHTML()}
  else if(t.dataset.onbamt){ONB.sel[t.dataset.onbamt].amt=t.value}
  else if(t.dataset.filter){F[t.dataset.filter]=t.value;renderTxList()}
  else if('delf' in t.dataset){delLive()}
  else if('helpq' in t.dataset){HELPQ=t.value;helpRefresh()}
  else if('qtext' in t.dataset&&QA){QA.qtext=t.value;const h=$('#q-text-hint');if(h)h.innerHTML=qtextHint()}
  else if('frtype' in t.dataset){const g=$('#fr-go');if(g)g.disabled=t.value.trim().toUpperCase()!=='FRESH'}
  else if(t.dataset.msearch!=null){moreSearch(t.value)}
  else if(t.dataset.splitAmt!=null&&QA&&QA.split){qSyncSplit();const tot=parseAmt(QA.amt)||0,sum=QA.split.reduce((s,r)=>{const v=parseAmt(r.amt);return s+(isNaN(v)?0:v)},0);const l=$('#split-left');if(l){l.textContent=sum===tot?'Adds up':(tot-sum>0?fmt(tot-sum)+' left to assign':fmt(sum-tot)+' too much');l.className='small '+(sum===tot?'':'over')}const b=document.querySelector('[data-act=qsave]');if(b)b.disabled=sum!==tot||!tot}
  else if(t.dataset.bedit){BDRAFT[t.dataset.bedit]=t.value;const s=$('#bsum');if(s)s.innerHTML=bsumHTML(month(VM))}
  else if(t.dataset.prepay){const id=t.dataset.prepay;const l=D.loans[id];const P=loanOutstanding(l);const L=parseAmt(t.value);const out=$('#ppo-'+id);if(!out)return;
    if(!(L>0)){out.textContent='';return}
    const a=loanCalc(P,l.rate||0,l.emi||0),b=loanCalc(Math.max(0,P-L),l.rate||0,l.emi||0);
    if(a.err||b.err){out.textContent=a.err||b.err;return}
    out.innerHTML=`Saves <b>${a.n-b.n} months</b> and <b>${fmt(a.interest-b.interest)}</b> in interest. New payoff: ${mLabel(addM(curKey(),b.n))}.`}
});
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='stm-file'&&e.target.files[0]){stmLoad(e.target.files[0]);return}
  const t=e.target;
  if(t.id==='onb-sd'){ONB.startDay=Number(t.value);render()}
  else if(t.id==='m-q'){saveRecentQ(t.value)}
  else if(t.id==='ac-bank'){const w=$('#ac-other-wrap');if(w)w.hidden=t.value!=='Other'}
  else if(t.dataset.splitCat!=null&&QA&&QA.split){qSyncSplit()}
  else if(t.dataset.impsec&&IMP){IMP.newCats[t.dataset.impsec].sec=t.value}
  else if(t.id&&t.id.startsWith('exp-')&&EXP){expReadInputs();const s=$('#exp-sum');if(s)s.textContent=expSummaryLine()}
  else if(t.id==='q-note'&&QA&&QA.type!=='in'){QA.note=t.value.trim();const mm=merchantMemory()[QA.note.toLowerCase()];if(mm&&(!QA.cat||QA.guessed)){QA.date=val('q-date')||QA.date;QA.date=QA.date;Object.assign(QA,{cat:mm.cat,guessed:true,mode:mm.mode||QA.mode,card:mm.card||QA.card});renderQuick()}}
  else if(t.id==='imp-file'&&t.files[0]){handleImport(t.files[0]);t.value=''}
  else if(t.id==='restore-file'&&t.files[0]){handleRestore(t.files[0]);t.value=''}
  else if(t.dataset.role){setRole(t.dataset.role,t.value,t)}
  else if(['h-bills','h-eve','h-week','d-week'].includes(t.id)){lsSet({'h-bills':'paisa-h-bills','h-eve':'paisa-h-eve','h-week':'paisa-h-week','d-week':'paisa-d-week'}[t.id],t.value);syncPush();toast('Saved. Reminders will come at the new time.')}
  else if(t.id==='rem-on'){lsSet('paisa-remind',t.checked?'on':'off');syncPush();render();toast(t.checked?'Bill reminders on.':'Bill reminders off.')}
  else if(t.id==='rem-eve'){lsSet('paisa-evening',t.checked?'on':'off');syncPush();render();toast(t.checked?'Evening nudge on.':'Evening nudge off.')}
  else if(t.id==='rem-week'){lsSet('paisa-weekly',t.checked?'on':'off');syncPush();render();toast(t.checked?'Weekly check-in on.':'Weekly check-in off.')}
});
document.addEventListener('keydown',e=>{
  if($('#lockRoot').innerHTML&&/^[0-9]$|^Backspace$/.test(e.key)){pinKey(e.key==='Backspace'?'⌫':e.key);e.preventDefault();return}
  if(e.key==='Escape'&&$('#sheetRoot').innerHTML){closeSheet();return}
  if(QA&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){
    if(/^[0-9.]$/.test(e.key)){quickKey(e.key);e.preventDefault()}
    else if(e.key==='Backspace'){quickKey('⌫');e.preventDefault()}
    else if(e.key==='Enter'&&QA.amt&&QA.cat){quickSave();e.preventDefault()}
  }
});
$('#fab').addEventListener('click',()=>openQuick());

/* ================= boot ================= */
function startLocal(){
  MODE='local';
  try{const raw=lsGet('paisa-local');if(raw){const o=JSON.parse(raw);COLS.forEach(c=>D[c]=o[c]||{})}}catch(e){}

}
