# Authenticity Scorecard

Fill after `labs/run-all.ps1` (Windows) or `labs/run-all.sh` on a machine with Docker Server running.

## Current status (this machine)

| Item | Value |
|------|--------|
| Docker CLI | 29.8.0 present |
| Docker Desktop | installed / processes running |
| WSL2 | 2.7.14 |
| Virtual Machine Platform | **enabled pending reboot** (`wsl --install --no-distribution` succeeded) |
| Engine (Server) | **NOT UP** — `docker info` has no Server; CLI hangs |
| Labs executed | **0 / 12** |
| Authenticated authenticity score | **0 / 24 — BLOCKED** |

Do **not** treat UI-only progress as authenticity credit.

## After reboot

```powershell
# 1) confirm server
docker version
# 2) run labs
.\labs\run-all.ps1
# 3) score each lab 0–2 in the table below
```

| Lab | 0–2 | Notes |
|-----|-----|-------|
| 01 hello | | |
| 02 two containers | | |
| 03 lifecycle | | |
| 04 multi-stage | | |
| 05 volume | | |
| 06 network DNS | | |
| 07 ports | | |
| 08 logs/exec | | |
| 09 health | | |
| 10 port conflict | | |
| 11 digest | | |
| 12 release gate | | |
| **Total** | **/24** | |

- **≥ 20** — authenticity 9/10 territory
- **16–19** — solid 8
- **≤ 15** — retake on a live daemon

Also record: Desktop vs engine-only, OS, `docker version` Server line.
