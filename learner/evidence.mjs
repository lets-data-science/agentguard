/** A failed command alone does not prove that a security policy blocked it. */
export function classifyEvidence({ code, stdout = '', stderr = '', audit = '' }, expected) {
  const text = stdout + '\n' + stderr;
  const httpMatch = text.match(/AGENTGUARD_HTTP:(\d{3})/);
  const status = httpMatch ? Number(httpMatch[1]) : null;
  if (expected === 'allowed' && code === 0 && status === 200) return { verdict: 'allowed', detail: 'The request reached GitHub and returned HTTP 200.' };
  if (/\[OCSF\s*\].*DENIED.*(?:policy_denied|policy_dns_ineligible|not allowed by policy|L7_REQUEST|not permitted by policy)/.test(audit)) return { verdict: 'blocked', detail: 'The current request has an explicit policy denial in the OpenShell audit log.' };
  return { verdict: 'inconclusive', detail: `No explicit policy verdict was found${status ? ` (HTTP ${status})` : ''}. Check the gateway and audit log; this is not a passing security test.` };
}
