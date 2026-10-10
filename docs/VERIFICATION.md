# Verification scope

Offline tests check minimum permissions, argument validation, rejection of fabricated
or missing audit evidence, duplicate/partial run handling, and report limits.
They do not prove the runtime enforces a policy. Use the app's real sandbox run
for that. A successful run contains blocked/allowed/blocked/blocked in the specified
order and independent actual audit entries for the denied probes.

The app persists failed/inconclusive results. No mocked successful checks are used
in the UI or recording. An unavailable gateway is a setup issue, not a passing test.

The macOS local review used OpenShell 0.1.2's MicroVM driver and a small locally
built Ubuntu 24.04 curl workload. Runtime image preparation needs internet and disk
space. No NVIDIA GPU is needed. Docker 28+ is the documented container-runtime
requirement; an older Docker can build the workload image for the separate VM path.

This is an educational network-policy lab. It does not certify protection against
every prompt injection, side channel, filesystem attack, or arbitrary executable.
