#!/usr/bin/env pw1
# Real Docker lab track (PowerShell) — requires Docker Desktop / engine.
$ErrorActionPreference = 'Stop'
docker info | Out-Null

Write-Host '== 01 hello =='
docker pull hello-world
docker run --rm hello-world

Write-Host '== 02 two containers =='
docker pull alpine:3.20
docker run -d --name ld-web alpine:3.20 sleep 3600
docker run -d --name ld-worker alpine:3.20 sleep 3600
docker inspect ld-web --format '{{.Image}} {{.Name}}'
docker inspect ld-worker --format '{{.Image}} {{.Name}}'

Write-Host '== 03 lifecycle =='
docker stop ld-worker
docker start ld-worker
docker ps -a --filter name=ld-

Write-Host '== 04 multi-stage =='
$tmpdir = Join-Path $env:TEMP ('ldbuild-' + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $tmpdir | Out-Null
@'
FROM alpine:3.20 AS builder
RUN echo payload > /artifact.txt
FROM alpine:3.20
COPY --from=builder /artifact.txt /artifact.txt
CMD ["cat", "/artifact.txt"]
'@ | Set-Content (Join-Path $tmpdir 'Dockerfile')
docker build -t ld-ms:1 $tmpdir
docker run --rm ld-ms:1

Write-Host '== 05 volume =='
docker volume create ld-data
docker run --rm -v ld-data:/data alpine:3.20 sh -c 'echo persisted > /data/note.txt'
docker run --rm -v ld-data:/data alpine:3.20 cat /data/note.txt

Write-Host '== 06 network =='
docker network create ld-net
docker run -d --name ld-db --network ld-net alpine:3.20 sleep 3600
docker run --rm --network ld-net alpine:3.20 ping -c1 ld-db

Write-Host '== 07 ports =='
docker run -d --name ld-web80 -p 18080:80 nginx:1.25
Start-Sleep 1
try { Invoke-WebRequest -Uri http://127.0.0.1:18080/ -UseBasicParsing | Select-Object -ExpandProperty StatusCode } catch { $_.Exception.Message }
docker port ld-web80

Write-Host '== 08 logs/exec =='
docker logs ld-web80
docker exec ld-web80 whoami

Write-Host '== 09 health =='
docker rm -f ld-hc 2>$null
docker run -d --name ld-hc --health-cmd 'test -f /etc/hosts' --health-interval 5s nginx:1.25
Start-Sleep 6
docker inspect ld-hc --format '{{.State.Health.Status}}'

Write-Host '== 10 port conflict =='
docker run -d --name ld-conflict -p 18080:80 nginx:1.25

Write-Host '== 11 digest =='
docker image inspect alpine:3.20 --format '{{index .RepoDigests 0}}'

Write-Host '== 12 release gate =='
docker build -t ld-rel:0.0.1 $tmpdir
docker history ld-rel:0.0.1

Write-Host '== cleanup =='
docker rm -f ld-web,ld-worker,ld-db,ld-web80,ld-hc,ld-conflict 2>$null
docker network rm ld-net 2>$null
Write-Host 'Done. Score with labs/README.md'
