import { spawn } from 'node:child_process';
export function command(args, { timeout = 90000 } = {}) {
  const executable = process.env.OPENSHELL_BIN || 'openshell';
  const endpoint = process.env.AGENTGUARD_GATEWAY || 'https://127.0.0.1:17670';
  const url = new URL(endpoint);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) throw new Error('Use an authenticated local OpenShell gateway.');
  return new Promise(resolve => {
    let stdout = '', stderr = '', settled = false;
    const child = spawn(executable, ['--gateway-endpoint', endpoint, '--color', 'never', ...args], { shell: false, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const finish = (code, error) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ code, stdout, stderr: stderr + (error ? '\n' + error : '') }); };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(-1, 'Command timed out. Check the sandbox state before retrying.'); }, timeout);
    child.stdout.on('data', data => { stdout = (stdout + data).slice(-100000); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-30000); });
    child.on('error', error => finish(-1, error.code === 'ENOENT' ? 'OpenShell CLI was not found. Follow the setup guide.' : error.message));
    child.on('close', code => finish(code ?? -1));
  });
}
export function probeArguments(sandbox, method, destination) {
  if (!/^lds-ag-[a-z0-9-]{1,40}$/.test(sandbox)) throw new Error('Invalid sandbox');
  if (!['GET', 'POST'].includes(method) || !['https://api.github.com/zen', 'https://example.com/'].includes(destination)) throw new Error('Probe is outside this lab');
  return ['sandbox', 'exec', '-n', sandbox, '--no-login-shell', '--', '/usr/bin/curl', '--silent', '--show-error', '--max-time', '15', '-X', method, '-w', '\nAGENTGUARD_HTTP:%{http_code}\n', destination];
}
