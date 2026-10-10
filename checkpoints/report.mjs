export function buildReport(run) {
  const checks = run.events.filter(event => event.type === 'check');
  const required = [['baseline-read', 'GET', 'https://api.github.com/zen', 'blocked'], ['permitted-read', 'GET', 'https://api.github.com/zen', 'allowed'], ['injected-write', 'POST', 'https://api.github.com/zen', 'blocked'], ['other-host', 'GET', 'https://example.com/', 'blocked']];
  const verified = ['complete', 'closed'].includes(run.phase) && !run.error && checks.length === 4 && required.every(([id, method, url, expected]) => checks.filter(check => check.id === id && check.method === method && check.url === url && check.verdict === expected && check.expected === expected).length === 1);
  return { schema: 1, project: 'AgentGuard', createdAt: new Date().toISOString(), sandbox: run.sandbox,
    runtime: run.runtime, scope: 'Four fixed network probes in one OpenShell sandbox. Not a security certification.',
    result: verified ? 'All four expected outcomes observed' : 'Needs review', checks,
    policy: 'curl → api.github.com:443 → GET, HEAD, OPTIONS only', audit: run.audit || '',
    limitations: ['Only the listed executable and endpoints were exercised.', 'No real secrets were used.', 'An AI model was not used to select these scripted probes.'] };
}
