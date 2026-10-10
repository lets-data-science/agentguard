# Walkthrough script

The LDS guide uses an actual local-app recording with one continuous narration take. Playback timing is adjusted to follow the narration; captions and the transcript contain the same words.

AI narration uses Prateek Gaurav’s authorized voice. Voice credentials and audio source files are not included in this code repository. Building and testing the app requires no speech credits.

Current guide film: 53.84 seconds.

## Transcript

AgentGuard makes permissions something you can test. It creates a real OpenShell sandbox with networking closed, then runs four scripted checks. This demonstration uses no model calls. The policy gives curl read access to one host. The allowed destination and methods are visible in the policy. Everything outside that rule stays blocked, so we can check useful access and its limits together. First, inspect the read before permission: the audit log records a denial. After permission, the same request reaches GitHub successfully. A write request is still denied, and a request to another host is blocked too. Those outcomes demonstrate this specific policy boundary. Four probes cannot establish protection against every attack. Download the report, then inspect the raw audit trail. Every conclusion should be traceable to evidence from the run.

## Recording review

- Show actual application behavior using non-private teaching inputs.
- Keep API keys, private browser profiles and credentials out of the recording.
- Explain any edited waiting time; do not imply that replaying saved evidence starts a new run.
- Verify the final picture against this transcript, captions and the visible actions.
- Review the full script and picture before generating any replacement narration.
