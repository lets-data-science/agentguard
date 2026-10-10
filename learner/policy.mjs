/** Grant one executable the smallest useful network permission. */
export function policyArguments(sandbox) {
  if (!/^lds-ag-[a-z0-9-]{1,40}$/.test(sandbox)) throw new Error('Invalid lab sandbox name');
  return ['policy', 'update', sandbox, '--rule-name', 'github_read', '--binary', '/usr/bin/curl',
    '--add-endpoint', 'api.github.com:443:read-only:rest:enforce', '--wait'];
}
