# Build AgentGuard, one boundary at a time

Use a terminal in this downloaded folder throughout. The same four probes continue
through every step; do not replace them with real customer systems or real secrets.

## 1. Know the result

An agent's instruction and its permission are different things. A malicious note
can ask for a POST request. A policy outside the model should still reject it.
In this project a fixed probe stands in for that proposed action; no model call
is needed to test enforcement. The diagram is:

`Browser → local Node server → OpenShell CLI → sandbox curl → policy → destination`

Only the allowlisted method/destination combinations are exposed by the server.
The first GET is blocked. Apply one read-only rule. The same GET succeeds, a POST
is blocked, and a GET to a different host is blocked. Your report must contain
these four distinct checks, not four copies of one result.

**Checkpoint:** Explain why a curl exit-code 7 does not prove a policy denial.

## 2. Run the real runtime

Install OpenShell 0.1.2, validate its gateway, and build the Dockerfile as described
in README. `openshell status` must say Connected and show the expected version.
The gateway is a trusted local service; do not expose its control port to a LAN.
Installations using the MicroVM driver need `e2fsprogs`. On macOS the official
Homebrew package signs the VM driver with its required Hypervisor entitlement.
Use the official installation rather than an unsigned standalone driver.

For the MicroVM path, set `compute_driver = "vm"` in your gateway configuration,
provide a short absolute `state_dir`, then restart that gateway. Keep all TLS
private keys out of the repository. Do not copy the current main-branch configuration
over 0.1.2: its guest-TLS schema differs. Use the release-tagged reference linked in README.

```bash
openshell --version
openshell status
docker build -t lds-agentguard-tools:1.0.0 .
npm ci
cp .env.example .env
npm start
```

Open3084. A starter will show an actionable missing implementation once it reaches
your learner function. That is expected. The app must not manufacture a pass.

**Checkpoint:** The page loads, the gateway is connected, and the workload image exists.

## 3. Grant the smallest useful permission

Open `learner/policy.mjs`. Return a CLI argument array that applies a rule named
`github_read` to the validated sandbox name. The exact grant is:

`/usr/bin/curl → api.github.com:443 → read-only → rest → enforce`

Use `policy update`, `--rule-name`, `--binary`, `--add-endpoint`, and `--wait`.
Never build a shell command by concatenating user text. Do not use wildcard hosts,
`read-write`, or auto-approval. The rest of the sandbox remains default-deny.

Run `npm test`. Evidence/report tests will remain red until later steps; the policy
tests should pass. If stuck, `npm run restore -- policy`, read the implementation,
and explain every permission before continuing.

**Checkpoint:** The argument array grants exactly one binary and one read-only host.

## 4. Refuse false evidence

Open `learner/evidence.mjs`. A read is allowed only if curl completes successfully
and its `AGENTGUARD_HTTP` marker is 200. A blocked verdict needs an explicit OCSF
policy denial supplied by the trusted runtime audit collector. A response body
claiming `policy_denied`, an ordinary 403, or a failed socket is insufficient.

The server captures the start time of each probe. It asks only that sandbox for
logs and keeps denial lines newer than that start time for the exact hostname;
the write check also requires POST. This prevents old baseline denials from being
reused as evidence for a later check. Audit delivery is asynchronous, so a bounded
wait is allowed. If no evidence arrives, the result remains inconclusive.

Run `npm test`. Restore `evidence` only if needed. Include a case where GitHub
returns an error: that should not become a green security result.

**Checkpoint:** Missing, stale, and unrelated evidence cannot produce a block verdict.

## 5. Produce an honest report

Open `learner/report.mjs`. Require the four distinct check IDs, exact methods and
URLs, expected outcomes, a finished run, and no error. Keep raw check output and
the audit trail. State the scope and limitations explicitly.

Run `npm test` and `npm run check`. The empty/partial/duplicate report tests must
fail closed. Recovery: `npm run restore -- report`.

**Checkpoint:** A report containing four duplicate blocked reads says Needs review.

## 6. Run, inspect, and change one thing

Restart the server. Close any earlier lab sandbox, then run the checks. Inspect
the raw evidence for each result. Download the JSON and confirm all four identities,
the actual runtime version, and the limitations. Reload the page: evidence persists.
Close the sandbox when finished.

Extend only after this works: add another harmless read-only endpoint and an exact
matching check, or add a report field explaining why a permission is necessary.
If you integrate an agent later, keep the runtime boundary outside the model and
validate its proposed tool arguments separately. Never give it access to the host
Docker socket or your full home folder.

**Final checkpoint:** Explain what your four probes established, and what they did not.
