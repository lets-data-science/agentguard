# AgentGuard

Build a local workbench that tests a real NVIDIA OpenShell network boundary.
One approved read succeeds; an unapproved read, a write, and another destination
remain blocked. Every blocked result requires fresh matching runtime audit evidence.

Built by **LDS Team** · An LDS project · Apache-2.0 · version 1.0.0

## What you build

The interface and CLI bridge are provided. Implement three small modules:
`learner/policy.mjs` grants a minimal permission; `learner/evidence.mjs` separates
policy denials from ordinary errors; `learner/report.mjs` verifies the complete run.
The starter leaves these as exercises. The reference and checkpoints are complete.
Read [the build guide](docs/BUILD.md) before running the starter.

## Requirements

- Node.js 22.13 or newer.
- NVIDIA OpenShell CLI/gateway **0.1.2** with an authenticated local gateway.
- A supported runtime: Docker Engine28+ with required host networking, or the
  OpenShell MicroVM driver on Apple Silicon/macOS or Linux/KVM.
- Docker to build the small workload image. The VM driver can import a locally built image.
- Internet for the official runtime/image downloads and the two harmless probe hosts.

No Gemini or other model key is needed. These are **scripted probes**, not an AI
model pretending to discover an attack. OpenShell is the real enforcement engine.
This build is not a general security certification or a hosted security service.

## Start

First install the pinned OpenShell release following NVIDIA's official installation
instructions. Review their installer before running it:
https://docs.nvidia.com/openshell/latest/about/installation

Check `openshell --version` and `openshell status`. For 0.1.2 consult the release-tagged
configuration documentation, because `main` can describe newer behavior:
https://github.com/NVIDIA/OpenShell/blob/v0.1.2/docs/how-it-works/gateways/configuration.mdx

```bash
docker build -t lds-agentguard-tools:1.0.0 .
npm ci
cp .env.example .env
# Edit AGENTGUARD_GATEWAY only if your local endpoint differs.
npm test
npm start
```

Open http://localhost:3084. Click **Run the policy checks**. The first sandbox can
take a few minutes while the runtime prepares its image. Never interpret a timeout
or missing dependency as a passing block. Expand each result to see the command
output and matched audit line, then download the JSON report.

The app leaves its sandbox available for inspection. **Close this sandbox** deletes
only the sandbox created for that run. Evidence remains in `.data/last-run.json`.
Close it before another run. If you stop the app mid-run, restart it and inspect
the interrupted state before closing the sandbox.

## Data and boundaries

The Node server binds only 127.0.0.1, validates Host/Origin, accepts JSON mutations,
and executes an allowlisted CLI argument array without a shell. No personal folders,
API keys, or files are mounted into the workload. Probes send no request body.
The POST goes to GitHub's read-only `/zen` endpoint, never a repository mutation URL.
No automated changes are made to GitHub. Keep generated certificates, `.env`, `.data`,
and runtime folders out of source archives. This app does not call any speech API.

## Useful commands

```bash
npm test
npm run check
npm run restore -- policy
npm run restore -- evidence
npm run restore -- report
```

Restore preserves your previous learner file under `.backups/`. Restart `npm start`
after changing a learner module. [Verification notes](docs/VERIFICATION.md) explain
the difference between unit tests, observed runtime evidence, and security claims.
