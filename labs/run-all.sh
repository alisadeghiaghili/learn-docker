#!/usr/bin/env bash
# Real Docker lab track — requires a running Docker daemon.
set -euo pipefail
command -v docker >/dev/null
docker info >/dev/null

echo "== 01 hello =="
docker pull hello-world
docker run --rm hello-world

echo "== 02 two containers, one image =="
docker pull alpine:3.20
docker run -d --name ld-web alpine:3.20 sleep 3600
docker run -d --name ld-worker alpine:3.20 sleep 3600
docker inspect ld-web --format '{{.Image}} {{.Name}}'
docker inspect ld-worker --format '{{.Image}} {{.Name}}'
# CHECK: same Image id, different names

echo "== 03 lifecycle =="
docker stop ld-worker
docker start ld-worker
docker ps -a --filter name=ld-
# CHECK: stop/start keep id; rm is different

echo "== 04 multi-stage (tiny) =="
tmpdir=$(mktemp -d)
cat >"$tmpdir/Dockerfile" <<'EOF'
FROM alpine:3.20 AS builder
RUN echo payload > /artifact.txt
FROM alpine:3.20
COPY --from=builder /artifact.txt /artifact.txt
CMD ["cat", "/artifact.txt"]
EOF
docker build -t ld-ms:1 "$tmpdir"
docker run --rm ld-ms:1
docker history ld-ms:1 | head
# CHECK: runtime image has artifact.txt, builder RUN not all in final history size story

echo "== 05 volume persistence =="
docker volume create ld-data
docker run --rm -v ld-data:/data alpine:3.20 sh -c 'echo persisted > /data/note.txt'
docker run --rm -v ld-data:/data alpine:3.20 cat /data/note.txt
# CHECK: prints persisted

echo "== 06 network DNS =="
docker network create ld-net
docker run -d --name ld-db --network ld-net alpine:3.20 sleep 3600
docker run --rm --network ld-net alpine:3.20 getent hosts ld-db || docker run --rm --network ld-net alpine:3.20 ping -c1 ld-db
# CHECK: name resolves on user-defined net

echo "== 07 ports =="
docker run -d --name ld-web80 -p 18080:80 nginx:1.25
sleep 1
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/ || true
docker port ld-web80
# CHECK: 18080 published; curl returns 200/301/302 family

echo "== 08 logs + exec =="
docker logs ld-web80 | tail -5
docker exec ld-web80 whoami
docker exec ld-web80 uname -a
# CHECK: logs non-empty; exec works

echo "== 09 health =="
docker rm -f ld-hc || true
docker run -d --name ld-hc --health-cmd 'test -f /etc/hosts' --health-interval 5s nginx:1.25
sleep 6
docker inspect ld-hc --format '{{.State.Health.Status}}'
# CHECK: healthy or starting (then healthy)

echo "== 10 port conflict (expects failure) =="
if docker run -d --name ld-conflict -p 18080:80 nginx:1.25 2>/tmp/ld-err; then
  echo 'UNEXPECTED: second bind on 18080 succeeded'
  docker rm -f ld-conflict
else
  echo 'EXPECTED conflict:'
  cat /tmp/ld-err
fi
# CHECK: daemon error mentions port allocated / bind

echo "== 11 digest =="
docker pull alpine:3.20
docker image inspect alpine:3.20 --format '{{index .RepoDigests 0}}'
# CHECK: you can quote a sha256 digest

echo "== 12 release gate (abbreviated) =="
docker build -t ld-rel:0.0.1 "$tmpdir"
docker history ld-rel:0.1 >/dev/null 2>&1 || docker history ld-rel:0.0.1 | head
echo 'Scan/SBOM/sign: use trivy/syft/cosign if installed (optional)'
command -v trivy >/dev/null && trivy image ld-rel:0.0.1 || echo 'trivy not installed — note in scorecard'
command -v cosign >/dev/null && echo 'cosign available' || echo 'cosign not installed — note in scorecard'
# CHECK: built a versioned tag (not latest-only)

echo "== cleanup (keep volumes you want) =="
docker rm -f ld-web ld-worker ld-db ld-web80 ld-hc 2>/dev/null || true
docker network rm ld-net 2>/dev/null || true
# docker volume rm ld-data   # uncomment when done
echo "Labs complete. Score yourself against labs/README.md rubric."
