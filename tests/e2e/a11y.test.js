const {OUT,XLSX_JS,XLSX_NODE,URL}=require('./_env');
// Accessibility: runs axe-core (WCAG 2.1 A/AA rules) on every screen in light and dark,
// and checks the colour tokens meet contrast targets. Fails on serious or critical issues.
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
let AXE=process.env.PAISA_AXE;if(!AXE){try{AXE=require.resolve('axe-core/axe.min.js')}catch(e){}}
const seed=fs.readFileSync(OUT+'/seed.json','utf8');
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
(async()=>{const b=await chromium.launch();const problems=[];const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({...devices['iPhone 13'],colorScheme:scheme});
  await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.PAISA_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'}));
  await ctx.route('**/sw.js',r=>r.fulfill({status:404,body:''}));
  await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){const o=JSON.parse(s);localStorage.clear();for(const k in o)localStorage.setItem(k,o[k]);sessionStorage.setItem('seeded','1')}},seed);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  // token contrast: text on every surface it sits on
  await p.goto(URL+'#home');await p.waitForTimeout(400);
  const T=await p.evaluate(()=>{const s=getComputedStyle(document.documentElement);const g=n=>s.getPropertyValue(n).trim();return{bg:g('--bg'),surface:g('--surface'),sunk:g('--sunk'),hero:g('--hero'),ink:g('--ink'),muted:g('--muted'),good:g('--good'),bad:g('--bad'),warn:g('--warn'),nav:g('--nav'),navink:g('--nav-ink'),gold:g('--gold')}});
  const pairs=[['ink','bg',7],['ink','surface',7],['muted','bg',4.5],['muted','surface',4.5],['muted','hero',4.5],['muted','sunk',4.5],['good','surface',4.5],['bad','surface',4.5],['warn','surface',4.5],['warn','hero',4.5],['navink','nav',4.5],['gold','nav',3]];
  for(const [f,g,min] of pairs){const r=ratio(T[f],T[g]);console.log(`${scheme} contrast ${f} on ${g}: ${r.toFixed(2)} (needs ${min})`);if(r<min)problems.push(`${scheme}: ${f} on ${g} is ${r.toFixed(2)}, needs ${min}`)}
  if(!AXE){console.log('axe-core not installed: skipping rule checks');await ctx.close();continue}
  const axe=fs.readFileSync(AXE,'utf8');
  for(const r of ['home','budget','bills','plan','transactions','more','prefs','family','reports','help','habits']){
    await p.goto(URL+'#'+r);await p.waitForTimeout(500);await p.addScriptTag({content:axe});
    const res=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,target:v.nodes.slice(0,2).map(x=>x.target.join(' ')).join(' | ')}))});
    const bad=res.filter(v=>v.impact==='serious'||v.impact==='critical');
    console.log(`${scheme} #${r}: ${res.length?res.map(v=>`${v.id}(${v.impact},${v.n})`).join(', '):'no issues'}`);
    bad.forEach(v=>problems.push(`${scheme} #${r}: ${v.id} – ${v.help} – ${v.target}`));
  }
  await ctx.close();
}
if(errs.length)console.log('ERRORS:\n'+errs.join('\n'));
if(problems.length){console.log('ACCESSIBILITY PROBLEMS:\n'+problems.join('\n'));process.exit(1)}
console.log('accessibility checks passed');await b.close()})();
