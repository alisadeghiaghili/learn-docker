# Mastery protocol — how to reach 90%

Critical rule: **UI-only has a hard cap** (see `mastery` command). You cannot read your way to 90% on debug or compose.

## Domain table (learning %)

| Domain | UI-only cap | Full protocol target | Required evidence |
|--------|------------:|---------------------:|-------------------|
| models (image/container/layer) | 80 | **92** | sims + lab 02 + teach-back |
| commands (CLI fluency) | 75 | **90** | fluency-drill + labs 01/03/08 |
| build | 72 | **91** | cache/multi-stage + lab 04 |
| compose | 65 | **90** | capstone stack + health race + file split |
| network / ports | 72 | **90** | labs 06–07 + topology quiz |
| volumes | 75 | **91** | lab 05 + perm failure |
| debug / failures | 55 | **90** | labs 09–10 + **break-and-fix writeup** |
| registry / release | 75 | **92** | reg-capstone-gate + lab 12 |
| security | 65 | **90** | hardened run + secrets quiz + teach-back |

## Protocol (every domain)

1. Finish Mastery checks (`mastery <domain>`)
2. Track B labs listed as evidence (live daemon)
3. Teach-back 60s without notes
4. Rubric essay pass for that pack
5. Day 7 / day 30 `review` cold

## What we will NOT claim

- **Job-ready / on-call 90%** — impossible from a course alone. Needs production-like incidents.
- **Any 90%** without Real scorecard rows for lab-backed domains.

## Self-score

```text
mastery            # list domains
mastery debug      # checks for that domain
```

Tick only what you can prove (command output, lab scorecard, recording).
