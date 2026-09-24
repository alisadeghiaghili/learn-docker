# Production Runbooks (image + stack)

These are the operational templates the curriculum teaches. Copy, edit names, keep in your team repo.

## 1. Image release (CI)

```yaml
# .github/workflows/image.yml (excerpt)
# build → scan → sbom → sign → push by digest + version tag
```

Checklist (definition of done):

1. FROM explicit base (prefer digest in prod Dockerfile)
2. Multi-stage; USER non-root in runtime
3. `trivy image --exit-code 1 --severity CRITICAL,HIGH`
4. `syft`/`docker sbom` artifact attached
5. `cosign sign` with OIDC identity of CI
6. Push `registry.example.com/team/app:${GIT_SHA}` and `:semver` — never rely on `:latest`
7. Deploy manifest pins `@sha256:…`

## 2. Stack deploy (compose prod)

```bash
docker --context prod compose -f compose.yaml -f compose.prod.yaml pull
docker --context prod compose -f compose.yaml -f compose.prod.yaml up -d --wait --wait-timeout 120
docker --context prod compose ps
```

`--wait` respects healthchecks. If it times out, rollback before debugging deeply.

## 3. Rollback

```bash
# deploy previous digest (kept in release notes / Git tag)
docker --context prod compose -f compose.yaml -f compose.prod.yaml pull
# set APP_IMAGE=repo/app@sha256:OLD in compose.prod.yaml or env
docker --context prod compose -f compose.yaml -f compose.prod.yaml up -d --no-build --wait
```

Never rollback by pushing `:latest` backwards.

## 4. Port already allocated

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
docker stop <holder> && docker rm <holder>
# or change publish to -p 18080:80
```

Do not `prune --volumes` to fix networking.

## 5. Unhealthy service

```bash
docker inspect app --format '{{json .State.Health}}' | jq
docker logs app --tail 200
docker exec app curl -sS localhost:3000/health
```

Fix probe or app listen address. `restart: always` will not fix a wedge.

## 6. Disk pressure

```bash
docker system df
docker container prune          # stopped only
docker image prune              # dangling
# volumes: inventory first — docker system prune --volumes is data loss
```

## 7. Rate limit / mirror

- CI: `docker login` + pull-through cache (Harbor/Artifactory)
- Daemon: `"registry-mirrors": ["https://mirror.example.com"]`
- Air-gap: `docker save` + digest verify + `docker load` / Harbor replication

## 8. Swarm rollout (if you use Swarm)

```bash
docker service update \
  --image registry.example.com/team/app@sha256:NEW \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-order start-first \
  --update-failure-action rollback \
  app
```

## 9. Context safety

```bash
docker context ls
# scripts must set --context or DOCKER_HOST explicitly
```

## 10. Incident: what ran in prod?

```bash
docker ps --format '{{.Names}} {{.Image}}'
docker image inspect $IMAGE --format '{{index .RepoDigests 0}}'
# compare digest to deploy manifest + SBOM + signature
```
