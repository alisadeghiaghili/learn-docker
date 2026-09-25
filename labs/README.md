# Real Docker Lab Track

The in-app engine teaches **models**. This track teaches **muscle memory and daemon friction**.

Run these on a machine with Docker Engine or Docker Desktop (`docker version` shows a **Server** section).
If Server is missing, start Docker Desktop / `systemd start docker` first.

| In-app level | Real lab |
|--------------|----------|
| intro-hello | `labs/01-hello.sh` |
| image-vs-container | `labs/02-two-containers.sh` |
| lifecycle | `labs/03-lifecycle.sh` |
| build-multistage | `labs/04-multistage.sh` |
| volumes-persist | `labs/05-volume.sh` |
| networks | `labs/06-network.sh` |
| ports | `labs/07-ports.sh` |
| ops-logs-exec | `labs/08-logs-exec.sh` |
| ops-health-restart | `labs/09-health.sh` |
| fail-port-in-use | `labs/10-port-conflict.sh` |
| reg-digest-pin | `labs/11-digest.sh` |
| reg-capstone-gate | `labs/12-release-gate.sh` |

## How to grade yourself (authenticity rubric)

Each lab has a `CHECK` section. A **pass** is:

1. Commands ran against **real** `docker` (not the web app, not mock)
2. You can explain the output in one sentence
3. Cleanup ran (or you justify leaving containers)

Score per lab 0–2:

- 2 — clean run + explanation
- 1 — ran with hints / partial
- 0 — skipped or only used the simulator

**Real-track pass = 12 labs × 2 = 24.** Target for authenticity 9/10: **≥ 20/24 Real**.

### Mock mode (CI only)

```powershell
.\labs\run-mock.ps1          # smoke-test scripts with labs/mock/docker.cmd
.\labs\run-all.ps1           # real daemon
```

Mock validates that lab scripts are runnable. It **never** fills the Real column on the scorecard.

## Why this exists

Simulator cannot reproduce: pull latency, build cache warmth, port binds on a live host,
bind-mount permissions on your UID, `exec -it`, log volume on disk, wrong daemon via context.

