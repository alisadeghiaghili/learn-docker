# Authenticity Scorecard

Two columns on purpose:

| Column | Counts toward authenticity 9? | Source |
|--------|-------------------------------|--------|
| **Real** | **Yes** | `.\labs\run-all.ps1` with live Docker **Server** |
| **Sim** | No | `.\labs\run-mock.ps1` (CI smoke only) |

Mock never proves daemon friction. Do not fill Real from Sim.

## Current status (this machine)

| Item | Value |
|------|--------|
| Docker CLI | 29.8.0 present |
| Docker Desktop | installed |
| WSL2 | present |
| Virtual Machine Platform | pending reboot / virtualization may be off |
| Engine (Server) | **NOT CONFIRMED** |
| Real labs | **not run** |
| Mock labs (CI) | `.\labs\run-mock.ps1` — smoke only |
| **Authenticity (Real)** | **0 / 24 — BLOCKED** |

## After reboot (Real)

```powershell
docker version
.\labs\run-all.ps1
```

| Lab | Real 0–2 | Sim 0–2 | Notes |
|-----|----------|---------|-------|
| 01 hello | | | |
| 02 two containers | | | |
| 03 lifecycle | | | |
| 04 multi-stage | | | |
| 05 volume | | | |
| 06 network DNS | | | |
| 07 ports | | | |
| 08 logs/exec | | | |
| 09 health | | | |
| 10 port conflict | | | |
| 11 digest | | | |
| 12 release gate | | | |
| **Total** | **/24** | **/24** | |

- Real **≥ 20** — authenticity 9/10
- Real **16–19** — solid 8
- Real **≤ 15** or blank — do not claim 9
