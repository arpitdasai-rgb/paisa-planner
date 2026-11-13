/* Paisa Planner · PWA plumbing, app lock, backup and restore, start-up (runs last).
   Classic script loaded in order with defer; it shares globals with the other js/ files. */
"use strict";
/* ================= PWA plumbing ================= */
let INSTALL_EVT=null,UPDATE=false,OFFLINE=!navigator.onLine,SWREG=null;
const STANDALONE=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const IS_IOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const NOTIF_SUPPORT='Notification' in window;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL_EVT=e;if(route==='prefs')render()});
window.addEventListener('appinstalled',()=>{INSTALL_EVT=null;render()});
window.addEventListener('online',()=>{OFFLINE=false;render()});
window.addEventListener('offline',()=>{OFFLINE=true;render()});
// keep data in sync if the app is open in two tabs
window.addEventListener('storage',e=>{if(e.key==='paisa-local'&&e.newValue){try{const o=JSON.parse(e.newValue);COLS.forEach(c=>D[c]=o[c]||{});changed()}catch(x){}}});
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    SWREG=reg;
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){UPDATE=true;render()}})});
  }).catch(()=>{});
}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
async function notify(title,body){
  if(!NOTIF_SUPPORT||Notification.permission!=='granted')return false;
  const opts={body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'paisa-dues',data:{url:'./#bills'}};
  try{const reg=SWREG||(navigator.serviceWorker&&await navigator.serviceWorker.ready);if(reg){await reg.showNotification(title,opts);return true}}catch(e){}
  try{new Notification(title,opts);return true}catch(e){return false}
}
function checkReminders(force){
  if(!S()||!NOTIF_SUPPORT||Notification.permission!=='granted'||lsGet('paisa-remind')==='off')return;
  const t=todayISO();if(!force&&lsGet('paisa-remind-day')===t)return;
  const ds=billsFor(curKey()).filter(b=>b.st==='due'||b.st==='overdue');
  lsSet('paisa-remind-day',t);
  if(!ds.length)return;
  const over=ds.filter(b=>b.st==='overdue');
  const title=over.length?over.length+' payment'+(over.length>1?'s':'')+' overdue':ds.length+' payment'+(ds.length>1?'s':'')+' due soon';
  notify(title,ds.slice(0,4).map(b=>b.name+' · '+fmt(b.budget)+' · '+b.label).join('\n'));
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders()});
async function backup(){
  const payload=JSON.stringify({app:'paisa-planner',version:1,exportedAt:new Date().toISOString(),data:{...D,trash:{}}},null,1);
  await saveFile('Paisa Planner backup '+todayISO()+'.json',new Blob([payload],{type:'application/json'}));
  lsSet('paisa-backup-at',String(Date.now()));render();
}
let RESTORE=null;
async function handleRestore(file){
  let o;try{o=JSON.parse(await file.text())}catch(e){toast("That file isn't a Paisa Planner backup.");return}
  if(!o||o.app!=='paisa-planner'||!o.data||typeof o.data!=='object'){toast("That file isn't a Paisa Planner backup.");return}
  RESTORE=o;const n=Object.keys(o.data.tx||{}).length,c=Object.keys(o.data.cats||{}).length;
  openSheet(`${sheetHead('Restore backup?')}<p class="small">Backup from ${esc(new Date(o.exportedAt).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}))}: ${n} entries and ${c} categories.</p><p class="small muted">This replaces everything currently on this device.</p><button class="btn primary block" data-act="dorestore">Replace and restore</button>`);
}
function doRestore(){
  if(!RESTORE)return;COLS.forEach(c=>D[c]=RESTORE.data[c]&&typeof RESTORE.data[c]==='object'?RESTORE.data[c]:{});
  RESTORE=null;saveLocal();closeSheet();VM=null;changed();toast('Backup restored.');
}

(async function boot(){
  if(CLOUD){if(lsGet('paisa-pin'))showLock('unlock');cloudBoot();return}
  startLocal();
  if(lsGet('paisa-pin'))showLock('unlock');
  setRoute();setTimeout(()=>checkReminders(),1500);
})();
