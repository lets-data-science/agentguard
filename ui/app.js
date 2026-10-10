const $ = selector => document.querySelector(selector);
let last = '';
const labels = {ready:'Ready',starting:'Starting',connecting:'Connecting',creating:'Creating sandbox',checking:'Checking',policy:'Applying policy',complete:'Complete','needs-attention':'Needs attention',interrupted:'Interrupted',closed:'Sandbox closed'};
function node(tag, text, className) { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
function render(state) {
  $('#phase').textContent = labels[state.phase] || state.phase;
  $('#status').textContent = state.busy ? 'Running real OpenShell commands. Evidence arrives one check at a time.' : state.phase === 'complete' ? 'All four expected outcomes were observed. Read the evidence and its limits below.' : state.error ? 'The run needs review. No unverified result is marked as a pass.' : state.events.length ? 'Saved on this computer. Close the sandbox before running again.' : 'Create a sandbox to begin. The first run may take a few minutes.';
  $('#run').disabled = state.busy || Boolean(state.sandbox);
  $('#close').hidden = !state.sandbox; $('#close').disabled = state.busy;
  $('#download').hidden = !state.events.some(event => event.type === 'check');
  $('#error').hidden = !state.error; $('#error').textContent = state.error || '';
  $('#audit').textContent = state.audit || 'Audit evidence will load after the run.';
  if (state.events.length) {
    const items = state.events.map(event => { const li = node('li', ''); const top = node('div', '', 'event-top'); top.append(node('h3', event.title)); if (event.verdict) top.append(node('span', event.verdict, 'badge ' + event.verdict)); li.append(top, node('p', event.detail)); if (event.output) { const details = node('details', ''); details.append(node('summary', 'Inspect command output'), node('pre', `${event.method} ${event.url}\n\n${event.output}`)); li.append(details); } return li; });
    $('#events').replaceChildren(...items);
  }
}
async function refresh() { try { const response = await fetch('/api/state'); if (!response.ok) throw new Error('Unable to load state'); const state = await response.json(); const serialized = JSON.stringify(state); if (serialized !== last) { render(state); last = serialized; } } catch { $('#status').textContent = 'Local server disconnected. Restart npm start; the last evidence is saved.'; } }
async function action(name) { try { const response = await fetch('/api/' + name, {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); const result = await response.json(); if (!response.ok) throw new Error(result.error); await refresh(); } catch(error) { $('#error').hidden = false; $('#error').textContent = error.message; } }
$('#run').addEventListener('click', () => action('run')); $('#close').addEventListener('click', () => action('close'));
await refresh(); setInterval(refresh, 1200);
