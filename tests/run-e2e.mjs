// Browser tests: serves the app, builds the seeded budget, runs every tests/e2e/*.test.js,
// and fails if any script throws, times out, or reports page errors. `npm test` runs this.
// Optional: `node tests/run-e2e.mjs sweep` also taps every button on every screen (slower).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const dir = path.join(root, 'tests/e2e');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 8767);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const run = (file) => new Promise((resolve) => {
  const t0 = Date.now(); const ch = spawn(process.execPath, [path.join(dir, file)], { env: { ...process.env, PAISA_URL: `http://localhost:${port}/` } });
  let out = ''; ch.stdout.on('data', (d) => (out += d)); ch.stderr.on('data', (d) => (out += d));
  const limit = file === 'sweep.js' ? 1500000 : 300000; const kill = setTimeout(() => { out += '\nTIMEOUT after ' + limit / 1000 + 's'; ch.kill('SIGKILL'); }, limit);
  ch.on('close', (code) => { clearTimeout(kill); const bad = code !== 0 || /ERRORS:|^BUG |TIMEOUT/m.test(out); resolve({ file, ok: !bad, secs: ((Date.now() - t0) / 1000).toFixed(0), out }); });
});
await new Promise((r) => server.listen(port, r));
const seed = await run('seed.js'); if (!seed.ok) { console.log(seed.out); process.exit(1); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();
if (process.argv.includes('sweep')) files.push('sweep.js');
let failed = 0;
for (const f of files) { const r = await run(f); console.log(`${r.ok ? 'pass' : 'FAIL'}  ${f}  (${r.secs}s)`); if (!r.ok) { failed++; console.log(r.out.split('\n').slice(-25).join('\n')); } }
server.close(); console.log(failed ? `${failed} of ${files.length} failed` : `all ${files.length} browser tests passed`); process.exit(failed ? 1 : 0);
