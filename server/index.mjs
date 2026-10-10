import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { command, probeArguments } from './openshell.mjs';
import { policyArguments } from '../learner/policy.mjs';
import { classifyEvidence } from '../learner/evidence.mjs';
import { buildReport } from '../learner/report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 3084);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
const dataDir = path.join(root, '.data');
await mkdir(dataDir, { recursive: true, mode: 0o700 });
let state = { phase: 'ready', busy: false, sandbox: null, runtime: null, events: [], audit: '', error: null };
try { const saved = JSON.parse(await readFile(path.join(dataDir, 'last-run.json'), 'utf8')); state = { ...state, ...saved, busy: false, phase: saved.busy ? 'interrupted' : saved.phase }; } catch { /* First run. */ }
const persist = () => writeFile(path.join(dataDir, 'last-run.json'), JSON.stringify(state, null, 2), { mode: 0o600 });
const event = async (title, detail, extra = {}) => { state.events.push({ at: new Date().toISOString(), title, detail, ...extra }); state.events = state.events.slice(-60); await persist(); };
async function requireSuccess(args, timeout) {
  const result = await command(args, { timeout });
  if (result.code !== 0) throw new Error((result.stderr || result.stdout || 'OpenShell command failed').slice(-1800));
  return result;
}
async function run() {
  try {
    state.phase = 'connecting'; await event('Connect to OpenShell', 'Checking the real local gateway.');
    const status = await requireSuccess(['status'], 15000); state.runtime = status.stdout.trim();
    state.phase = 'creating'; state.sandbox = 'lds-ag-' + Date.now().toString(36);
    await event('Create an isolated workspace', 'A new sandbox starts with default-deny networking. First launch can take a few minutes.');
    await requireSuccess(['sandbox', 'create', '--name', state.sandbox, '--from', process.env.AGENTGUARD_IMAGE || 'lds-agentguard-tools:1.0.0', '--no-auto-providers', '--detach', '--output', 'json', '--', 'sleep', 'infinity'], 600000);
    async function probe(id, title, method, url, expected) {
      state.phase = 'checking'; await persist();
      const started = Date.now() / 1000;
      const result = await command(probeArguments(state.sandbox, method, url), { timeout: 30000 });
      let evidence = classifyEvidence(result, expected);
      // VM denials can return ECONNREFUSED; only a fresh, matching audit entry proves a policy block.
      for (let attempt = 0; evidence.verdict === 'inconclusive' && attempt < 8; attempt++) {
        await delay(1000);
        const logs = await command(['logs', state.sandbox, '--since', '1m', '--source', 'sandbox'], { timeout: 10000 });
        const exactHost = new RegExp('(?:^|[^a-zA-Z0-9.-])' + new URL(url).hostname.replaceAll('.', '\\.') + '(?=$|[^a-zA-Z0-9.-])');
        result.audit = logs.stdout.split('\n').filter(line => {
          const stamp = line.match(/^\[([\d.]+)\]/);
          return stamp && Number(stamp[1]) >= started && exactHost.test(line) && line.includes('DENIED') && (method !== 'POST' || line.includes('POST'));
        }).join('\n');
        evidence = classifyEvidence(result, expected);
      }
      await event(title, evidence.detail, { type: 'check', id, method, url, expected, ...evidence, code: result.code, output: (result.stdout + '\n' + result.stderr + '\n' + (result.audit || '')).trim() });
      if (evidence.verdict !== expected) throw new Error('The observed result did not match the expected policy outcome. Inspect the evidence before continuing.');
    }
    await probe('baseline-read', 'Read before permission', 'GET', 'https://api.github.com/zen', 'blocked');
    state.phase = 'policy'; await event('Apply the smallest permission', 'Allow only curl to read api.github.com. Write methods and other hosts remain outside this rule.');
    await requireSuccess(policyArguments(state.sandbox), 90000);
    await probe('permitted-read', 'Read after permission', 'GET', 'https://api.github.com/zen', 'allowed');
    await probe('injected-write', 'Attempt an injected write', 'POST', 'https://api.github.com/zen', 'blocked');
    await probe('other-host', 'Request a different host', 'GET', 'https://example.com/', 'blocked');
    state.phase = 'complete'; await event('Evidence is ready', 'Review all four results and the gateway audit log. The sandbox remains available for inspection.');
  } catch (error) { state.error = error.message; state.phase = 'needs-attention'; await event('Needs attention', error.message); }
  finally {
    if (state.sandbox) { const logs = await command(['logs', state.sandbox, '--since', '10m', '--source', 'sandbox'], { timeout: 10000 }); state.audit = (logs.stdout + '\n' + logs.stderr).slice(-40000); }
    state.busy = false; await persist();
  }
}
const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/styles.css', ['styles.css', 'text/css']], ['/lds-logo.svg', ['lds-logo.svg', 'image/svg+xml']]]);
const server = http.createServer(async (req, res) => {
  const reply = (code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
  try {
    if (![`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`].includes(req.headers.host)) return reply(403, { error: 'Local access only' });
    if (req.headers.origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://[::1]:${port}`].includes(req.headers.origin)) return reply(403, { error: 'Origin not allowed' });
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/state') return reply(200, state);
    if (req.method === 'GET' && url.pathname === '/api/report') { res.setHeader('Content-Disposition', 'attachment; filename="agentguard-evidence.json"'); return reply(200, buildReport(state)); }
    if (req.method === 'POST' && url.pathname === '/api/run') {
      if (req.headers['content-type'] !== 'application/json') return reply(415, { error: 'JSON required' });
      if (state.busy || state.sandbox) return reply(409, { error: 'Close the current sandbox before starting another run.' });
      state = { phase: 'starting', busy: true, sandbox: null, runtime: null, events: [], audit: '', error: null }; await persist(); void run(); return reply(202, { started: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/close') {
      if (req.headers['content-type'] !== 'application/json') return reply(415, { error: 'JSON required' });
      if (state.busy) return reply(409, { error: 'Wait for the current check to finish.' });
      if (state.sandbox) {
        if (!/^lds-ag-[a-z0-9-]{1,40}$/.test(state.sandbox)) return reply(409, {error:'Saved sandbox identity is invalid; inspect .data/last-run.json.'});
        const found = await requireSuccess(['sandbox', 'list', '--output', 'json'], 15000);
        const list = JSON.parse(found.stdout);
        // Only clear an absent sandbox when the authoritative complete list confirms it.
        if (list.next_page_token) return reply(409, {error:'The gateway list is paginated. Close this sandbox with the CLI before clearing local state.'});
        if (!Array.isArray(list.sandboxes)) return reply(502, {error:'Could not verify sandbox state.'});
        if (list.sandboxes.some(sandbox => sandbox.name === state.sandbox)) {
          const result = await command(['sandbox', 'delete', state.sandbox], { timeout: 30000 }); if (result.code !== 0) return reply(502, { error: (result.stderr || result.stdout).slice(-1600) });
        }
      }
      state.sandbox = null; state.phase = 'closed'; await persist(); return reply(200, { closed: true });
    }
    if (req.method === 'GET' && assets.has(url.pathname)) { const [file, type] = assets.get(url.pathname); return reply(200, await readFile(path.join(root, 'ui', file)), type); }
    return reply(404, { error: 'Not found' });
  } catch { return reply(500, { error: 'The local request could not be completed. Check the server terminal.' }); }
});
server.listen(port, '127.0.0.1', () => console.log(`AgentGuard: http://localhost:${port}`));
