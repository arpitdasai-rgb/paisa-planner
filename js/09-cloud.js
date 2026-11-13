/* Paisa Planner · cloud: Supabase sign-in, family, sync, offline outbox, cache.
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= cloud: Supabase database + Google sign-in ================= */
const CFG=window.PAISA_CONFIG||{};
const CLOUD=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
const SUPABASE_JS='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
let SB=null,FID=null,MEMBERS=[],INVITES=[],EMAIL='',MYNAME='',MYAVATAR='',CH=null,DOCS_READY=false,PENDING=0,STARTED=null;
let INVROLE='member',INVMSG='',CONFIRMFN=null,FAMNAME='';
const ROLEN={owner:'Owner',admin:'Admin',member:'Member',viewer:'Viewer'};
const ROLEHELP={admin:'Can change budgets, categories, loans and cards, and invite people.',member:'Can add expenses and income, mark bills paid and edit their own entries.',viewer:'Can see everything but cannot change anything.'};
const GLOGO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const errMsg=e=>(e&&(e.message||e.error_description||e.msg))||'Something went wrong. Try again.';
const isNetErr=e=>!navigator.onLine||/failed to fetch|network|load failed|fetch failed/i.test(errMsg(e));
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load'));document.head.appendChild(s)})}
function screen(html){$('#tabs').hidden=true;$('#fab').hidden=true;$('#app').innerHTML=html}

/* -- offline cache + outbox (per family) -- */
const cacheKey=()=>'paisa-cloud-'+FID, outKey=()=>'paisa-outbox-'+FID;
function cacheSave(){if(FID)try{localStorage.setItem(cacheKey(),JSON.stringify(D))}catch(e){}}
let cacheT=null;function cacheSoon(){clearTimeout(cacheT);cacheT=setTimeout(cacheSave,300)}
function outbox(){try{return JSON.parse(localStorage.getItem(outKey())||'[]')}catch(e){return[]}}
function outSave(a){try{localStorage.setItem(outKey(),JSON.stringify(a))}catch(e){}PENDING=a.length}
function queueOut(op){const a=op.patch?outbox():outbox().filter(x=>!(x.col===op.col&&x.id===op.id));a.push(op);outSave(a);scheduleRender()}
function clearFamilyCache(){if(!FID)return;lsSet(cacheKey(),null);lsSet(outKey(),null);lsSet(syncKey(),null);lsSet('paisa-fid-'+ME,null)}
async function pushDoc(op){
  const {error}=await SB.from('docs').upsert({family_id:FID,col:op.col,id:op.id,data:op.data,deleted:op.deleted},{onConflict:'family_id,col,id'});
  if(error)throw error;
}
let PATCH_RPC=true;   // turns off if the database hasn't had supabase/v4.sql yet
async function pushPatch(op){
  if(PATCH_RPC){const {error}=await SB.rpc('patch_doc',{p_col:op.col,p_id:op.id,p_path:op.path,p_value:op.value});
    if(!error)return;if(!(error.code==='PGRST202'||error.code==='42883'||/patch_doc/.test(error.message||'')))throw error;PATCH_RPC=false}
  await pushDoc({col:op.col,id:op.id,data:D[op.col][op.id]||{},deleted:false});
}
function cloudPatch(op){
  return enqueue(op.col+'/'+op.id,async()=>{
    if(!navigator.onLine){queueOut(op);return}
    try{await pushPatch(op)}catch(e){if(isNetErr(e)){queueOut(op);return}refetchDoc(op.col,op.id);throw{code:e.code==='42501'?'invalid_argument':'server',message:errMsg(e)}}
  });
}
function cloudWrite(op){
  return enqueue(op.col+'/'+op.id,async()=>{
    if(!navigator.onLine){queueOut(op);return}
    try{await pushDoc(op)}catch(e){
      if(isNetErr(e)){queueOut(op);return}
      refetchDoc(op.col,op.id);   // the server refused: show its version again
      throw {code:e.code==='42501'?'invalid_argument':'server',message:errMsg(e)};
    }
  });
}
let flushing=false;
async function flushOut(){
  if(flushing||!SB||!FID||!navigator.onLine)return;flushing=true;
  let a=outbox();
  while(a.length){
    const op=a[0];
    try{await(op.patch?pushPatch(op):pushDoc(op))}catch(e){if(isNetErr(e))break;refetchDoc(op.col,op.id);toast("An offline change wasn't allowed for your role and was undone.")}
    a.shift();outSave(a);
  }
  flushing=false;scheduleRender();
}
async function refetchDoc(col,id){
  const {data}=await SB.from('docs').select('data,deleted').eq('family_id',FID).eq('col',col).eq('id',id).maybeSingle();
  applyRow({col,id,data:data?data.data:null,deleted:!data||data.deleted});
}
function applyRow(r){
  if(!COLS.includes(r.col))return;
  if(outbox().some(o=>o.col===r.col&&o.id===r.id))return; // a newer local change is waiting to upload
  const n={...D[r.col]};if(r.deleted||r.data==null)delete n[r.id];else n[r.id]=r.data;D[r.col]=n;
  if(r.col==='tx'&&r.data&&r.data.by&&r.data.byName&&!NAMES[r.data.by])NAMES[r.data.by]=r.data.byName;
  cacheSoon();changed();
}
const syncKey=()=>'paisa-sync-'+FID;
async function loadAllDocs(){
  let since=null;try{const s=JSON.parse(lsGet(syncKey())||'null');if(s&&DOCS_READY&&Date.now()-s.full<7*864e5)since=s}catch(e){}
  const all={};COLS.forEach(c=>all[c]=since?{...D[c]}:{});let maxAt=since?since.at:'';
  for(let from=0;;from+=1000){
    let q=SB.from('docs').select('col,id,data,deleted,updated_at').eq('family_id',FID);
    q=since?q.gt('updated_at',since.at):q.eq('deleted',false);
    const {data,error}=await q.order('updated_at').order('col').order('id').range(from,from+999);
    if(error)throw error;
    data.forEach(r=>{if(!all[r.col])return;if(r.deleted||r.data==null)delete all[r.col][r.id];else all[r.col][r.id]=r.data;if(r.updated_at>maxAt)maxAt=r.updated_at});
    if(data.length<1000)break;
  }
  outbox().forEach(op=>{if(!all[op.col])return;if(op.patch)all[op.col][op.id]=setDeep(JSON.parse(JSON.stringify(all[op.col][op.id]||{})),op.path,op.value);else if(op.deleted)delete all[op.col][op.id];else all[op.col][op.id]=op.data});
  COLS.forEach(c=>D[c]=all[c]);
  Object.values(D.tx).forEach(t=>{if(t.by&&t.byName&&!NAMES[t.by])NAMES[t.by]=t.byName});
  if(maxAt)lsSet(syncKey(),JSON.stringify({at:maxAt,full:since?since.full:Date.now()}));
  DOCS_READY=true;cacheSave();changed();
}
function setRoleFrom(r){ROLE=ROLEN[r]||'Viewer';IS_OWNER=r==='owner'}
async function loadMembers(){
  if(!FID)return;
  const {data,error}=await SB.from('family_members').select('user_id,role,joined_at,profiles(name,email,avatar_url)').eq('family_id',FID);
  if(error)return;
  MEMBERS=data.map(m=>({id:m.user_id,role:m.role,name:(m.profiles&&m.profiles.name)||'',email:(m.profiles&&m.profiles.email)||'',avatar:(m.profiles&&m.profiles.avatar_url)||''}));
  MEMBERS.forEach(m=>NAMES[m.id]=m.name||m.email);
  const me=MEMBERS.find(m=>m.id===ME);
  if(!me){clearFamilyCache();toast('You are no longer in this family.');return cloudNoFamily()}
  setRoleFrom(me.role);
  INVITES=[];
  if(canAdmin()){const r=await SB.from('invites').select('id,email,role,expires_at').eq('family_id',FID).eq('status','pending').order('created_at');INVITES=(r.data||[]).filter(i=>new Date(i.expires_at)>new Date())}
  scheduleRender();
}

/* -- sign-in flow -- */
async function cloudBoot(){
  screen('<div class="empty-state" style="padding-top:30vh">Signing you in…</div>');
  try{await loadScript(SUPABASE_JS)}catch(e){return screen(`<div class="empty-state" style="padding-top:26vh"><h2>Can't load sign-in</h2><p>Check your internet connection and open the app again.</p><button class="btn" data-act="reload">Try again</button></div>`)}
  SB=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const q=new URLSearchParams(location.search);const oauthErr=q.get('error_description')||q.get('error');
  const {data}=await SB.auth.getSession();
  if(location.search)history.replaceState(null,'',location.pathname+location.hash);
  SB.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'){resetCloud();showSignIn()}});
  if(!data.session)return showSignIn(oauthErr?'Sign-in was cancelled or failed. Try again.':'');
  afterSignIn(data.session.user);
}
function showSignIn(msg){
  MODE='signin';
  screen(`<div class="stack" style="padding-top:18vh;text-align:center;align-items:center">
    <div class="mark" style="width:64px;height:64px;font-size:32px;border-radius:18px">₹</div>
    <h1 style="font-size:28px">Paisa Planner</h1>
    <p class="muted" style="margin:0;max-width:320px">Plan the month, log spending in seconds and never miss a bill or EMI. Share one budget with your family.</p>
    <div style="height:8px"></div>
    <button class="gbtn" data-act="google">${GLOGO}<span>Continue with Google</span></button>
    ${msg?`<div class="small" style="color:var(--bad)">${esc(msg)}</div>`:''}
    <p class="small muted" style="margin:0;max-width:320px">We only receive your name, Gmail address and profile photo. We never see your inbox. <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>
  </div>`);
}
async function googleSignIn(){
  const {error}=await SB.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error)showSignIn(errMsg(error));
}
async function signOut(){
  if(outbox().length&&!signOut.ok){signOut.ok=true;toast('Some changes have not synced yet. Tap Sign out again to sign out anyway.',{ms:5000});return}
  cacheSave();lsSet(cacheKey(),null);
  await SB.auth.signOut();
}
function resetCloud(){if(CH&&SB)SB.removeChannel(CH);CH=null;FID=null;STARTED=null;DOCS_READY=false;MEMBERS=[];INVITES=[];COLS.forEach(c=>D[c]={});memo={};ME=null}
async function afterSignIn(user){
  ME=user.id;EMAIL=(user.email||'').toLowerCase();
  const md=user.user_metadata||{};MYNAME=md.full_name||md.name||EMAIL.split('@')[0];MYAVATAR=md.avatar_url||md.picture||'';NAMES[ME]=MYNAME;
  const cached=lsGet('paisa-fid-'+ME);
  if(cached){FID=cached;startCloud()}       // open instantly from this device's copy
  const {data,error}=await SB.from('family_members').select('family_id,role').eq('user_id',ME).maybeSingle();
  if(error){if(!cached)screen(`<div class="empty-state" style="padding-top:26vh"><h2>Can't reach your budget</h2><p>Check your connection and try again.</p><button class="btn" data-act="reload">Try again</button></div>`);return}
  if(!data){if(cached)clearFamilyCache();return cloudNoFamily()}
  setRoleFrom(data.role);
  if(data.family_id!==FID){if(cached)clearFamilyCache();FID=data.family_id;STARTED=null;startCloud()}else scheduleRender();
}
async function startCloud(){
  if(STARTED===FID)return;STARTED=FID;
  lsSet('paisa-fid-'+ME,FID);
  COLS.forEach(c=>D[c]={});DOCS_READY=false;
  try{const raw=localStorage.getItem(cacheKey());if(raw){const o=JSON.parse(raw);COLS.forEach(c=>D[c]=o[c]||{});DOCS_READY=true}}catch(e){}
  PENDING=outbox().length;MODE='cloud';memo={};VM=null;setRoute();
  if(CH)SB.removeChannel(CH);
  CH=SB.channel('family-'+FID)
    .on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'family_id=eq.'+FID},p=>{if(p.new&&p.new.col)applyRow(p.new)})
    .on('postgres_changes',{event:'*',schema:'public',table:'family_members',filter:'family_id=eq.'+FID},()=>loadMembers())
    .subscribe();
  try{await loadAllDocs();stale=false}catch(e){
    if(!DOCS_READY){STARTED=null;return screen(`<div class="empty-state" style="padding-top:26vh"><h2>Can't load your family budget</h2><p>${esc(isNetErr(e)?'Check your internet connection.':errMsg(e))}</p><button class="btn" data-act="reload">Try again</button></div>`)}
    stale=true;scheduleRender();
  }
  await loadMembers();flushOut();syncPush().then(on=>{if(route==='prefs')scheduleRender();if(!on)setTimeout(()=>checkReminders(),1200)});
}
window.addEventListener('online',()=>{if(MODE==='cloud'){flushOut().then(()=>loadAllDocs().catch(()=>{}))}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&MODE==='cloud'&&navigator.onLine){loadMembers();flushOut()}});

/* -- no family yet: accept an invite or start one -- */
async function cloudNoFamily(){
  MODE='nofamily';if(CH&&SB)SB.removeChannel(CH);CH=null;FID=null;STARTED=null;DOCS_READY=false;COLS.forEach(c=>D[c]={});memo={};
  screen('<div class="empty-state" style="padding-top:30vh">Checking for invites…</div>');
  const {data}=await SB.from('invites').select('id,role,expires_at,family_name,inviter_name').eq('email',EMAIL).eq('status','pending').order('created_at',{ascending:false});
  const invs=(data||[]).filter(i=>new Date(i.expires_at)>new Date());
  let localN=0;try{const o=JSON.parse(lsGet('paisa-local')||'null');if(o&&o.settings&&o.settings.main)localN=Object.keys(o.tx||{}).length+1}catch(e){}
  screen(`<div class="stack" style="padding-top:28px">
    <div class="brand"><div class="mark">₹</div><span class="label">Signed in as ${esc(EMAIL)}</span></div>
    <h1 style="font-size:26px">Hi ${esc(MYNAME.split(' ')[0])}</h1>
    ${invs.map(i=>`<section class="card"><div class="label" style="margin-bottom:4px">Invite</div><h2>${esc(i.inviter_name||'Someone')} invited you to ${esc(i.family_name||'their family budget')}</h2>
      <p class="small muted" style="margin:6px 0 12px">You'll join as <b>${ROLEN[i.role]}</b>: ${ROLEHELP[i.role].charAt(0).toLowerCase()+ROLEHELP[i.role].slice(1)} Expires ${new Date(i.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}.</p>
      <div class="btns"><button class="btn primary" data-act="acceptinv" data-id="${i.id}">Join family</button><button class="btn" data-act="declineinv" data-id="${i.id}">Decline</button></div></section>`).join('')}
    <section class="card"><h2 style="margin-bottom:6px">${invs.length?'Or start your own budget':'Start your family budget'}</h2>
      <p class="small muted" style="margin:0 0 12px">You'll be the Owner. Invite family members by their Gmail address after setup.</p>
      <div class="field"><label for="fam-name">Budget name</label><input class="input" id="fam-name" value="Our family budget"></div>
      ${localN?`<label class="check" style="border:0"><input type="checkbox" id="fam-copy" checked><span class="small">Copy the budget already on this device (${localN-1} entries)</span></label>`:''}
      <button class="btn primary block" data-act="createfam">Create family budget</button></section>
    <button class="link" data-act="signout" style="align-self:center">Sign out</button>
  </div>`);
}
async function acceptInvite(id,el){
  el.disabled=true;el.textContent='Joining…';
  const {error}=await SB.rpc('accept_invite',{p_invite:id});
  if(error){toast(errMsg(error));return cloudNoFamily()}
  const {data}=await SB.auth.getUser();afterSignIn(data.user);
}
async function createFamily(el){
  const name=val('fam-name').trim()||'Our family budget';const copy=$('#fam-copy')&&$('#fam-copy').checked;
  el.disabled=true;el.textContent='Creating…';
  const {data:fid,error}=await SB.rpc('create_family',{p_name:name});
  if(error){toast(errMsg(error));el.disabled=false;el.textContent='Create family budget';return}
  FID=fid;FAMNAME=name;ONB=null;
  if(copy){
    try{
      const o=JSON.parse(lsGet('paisa-local')||'{}');const rows=[];
      COLS.filter(c=>c!=='trash').forEach(c=>Object.entries(o[c]||{}).forEach(([id,d])=>{
        if(c==='tx'&&d&&(d.by==='local'||!d.by))d={...d,by:ME,ub:ME,byName:MYNAME};
        if(c==='log'&&d&&(d.user==='local'||!d.user))d={...d,user:ME};
        if(c==='settings'&&d)d={...d,name,owner:ME};
        rows.push({family_id:fid,col:c,id,data:d,deleted:false});
      }));
      for(let i=0;i<rows.length;i+=500){const {error:e2}=await SB.from('docs').upsert(rows.slice(i,i+500),{onConflict:'family_id,col,id'});if(e2)throw e2}
      toast('Copied '+rows.length+' items to your family budget.');
    }catch(e){toast("Couldn't copy this device's budget: "+errMsg(e))}
  }
  setRoleFrom('owner');STARTED=null;startCloud();
}

/* -- family screen (cloud) -- */
function inviteMessage(email,role){
  const fam=S()?S().name:'our family budget';
  return `${MYNAME} invited you to "${fam}" on Paisa Planner as ${ROLEN[role]}.\n\nOpen ${location.origin+location.pathname} and tap "Continue with Google" using ${email}. The invite expires in 7 days.`;
}
async function sendInvite(el){
  const email=val('inv-email').trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast('Enter a valid Gmail address.');return}
  el.disabled=true;
  const {error}=await SB.rpc('invite_member',{p_email:email,p_role:INVROLE});
  el.disabled=false;
  if(error){toast(errMsg(error));return}
  log('invited','member',email+' as '+ROLEN[INVROLE]);
  loadMembers();copyInvite(email,INVROLE,true);
}
function copyInvite(email,role,fresh){
  INVMSG=inviteMessage(email,role);
  openSheet(`${sheetHead(fresh?'Invite created':'Invite message')}
    <p class="small" style="margin-top:0">${esc(email)} will see the invite when they sign in with that Gmail address. Send them this message so they know where to go:</p>
    <div class="input" style="white-space:pre-wrap;font-size:14px;margin-bottom:12px">${esc(INVMSG)}</div>
    <div class="btns">${navigator.share?'<button class="btn primary" data-act="sharemsg">Share…</button>':''}<button class="btn ${navigator.share?'':'primary'}" data-act="copymsg">Copy message</button></div>`);
}
async function shareText(text){try{await navigator.share({text})}catch(e){}}
function copyText(text){navigator.clipboard.writeText(text).then(()=>toast('Copied.'),()=>toast('Select the message and copy it.'))}
async function setRole(uid,role,sel){
  sel.disabled=true;
  const {error}=await SB.rpc('set_member_role',{p_user:uid,p_role:role});
  sel.disabled=false;
  if(error){toast(errMsg(error));loadMembers();return}
  log('changed','role',(NAMES[uid]||'member')+' to '+ROLEN[role]);
  toast((NAMES[uid]||'They')+' is now '+ROLEN[role]+'.');loadMembers();
}
function confirmSheet(title,body,okLabel,fn){
  CONFIRMFN=fn;
  openSheet(`${sheetHead(title)}<p class="small" style="margin-top:0">${body}</p><button class="btn danger block" data-act="confirmok">${okLabel}</button>`);
}
