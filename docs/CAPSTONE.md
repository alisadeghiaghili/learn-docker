# Capstone (integration)

One story that touches every dimension. Do it in the web app **and** once on real Docker.

## Story

Ship a small product: **web** (nginx) + **db** (postgres) + **cache** (redis) for a demo shop.

### Requirements

1. `compose.yaml` + `compose.prod.yaml` (no laptop bind mounts in base)
2. Named volume `pgdata` for db
3. User-defined network `app-net` with DNS
4. `web` publishes `8080:80`
5. db has `healthcheck` (pg_isready); web depends on healthy db
6. Custom image for a tiny static site: multi-stage build, `USER app`, HEALTHCHECK
7. Logs to stdout; you can name the rotation control
8. Release the site image with the **registry gate** (scan → sbom → sign → version tag — not latest)
9. Explain rollback using digest pin (2 sentences)
10. Rubric `r-capstone-explain` pass ≥ 6

### Real-daemon pass

Run steps 1–5 via CLI/compose on Docker Desktop/Engine (labs). Attach `labs/SCORECARD.md` row notes.

### Definition of done

- [ ] In-app: `reg-capstone-gate` solved
- [ ] In-app: `compose-up` + `compose-down-volumes` solved
- [ ] Real: compose up --wait healthy
- [ ] Rubric capstone key self-graded
- [ ] One-paragraph postmortem: what you would automate in CI
