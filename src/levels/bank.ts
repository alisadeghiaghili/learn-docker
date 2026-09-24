import type { LevelDefinition, QuizQuestion } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

export const EXTRA_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-cap-drop',
    pack: 'Security',
    question: 'What does --cap-drop=ALL actually change?',
    choices: [
      'Removes the container filesystem',
      'Removes Linux capabilities so the process cannot use privileged syscalls even as root',
      'Blocks all outbound network traffic',
    ],
    correct: 1,
    explain:
      'Capabilities split root superuser powers (NET_RAW, SYS_ADMIN, …). Dropping them reduces break-glass power. Combine with non-root and read-only rootfs.',
  },
  {
    id: 'q-read-only',
    pack: 'Security',
    question: 'A --read-only rootfs app crashes on start. Most likely fix?',
    choices: [
      'Give the app a writable tmpfs/volume only where it must write',
      'Disable read-only entirely in production',
      'Run as root',
    ],
    correct: 0,
    explain:
      'Read-only is correct default. Find the required write paths (/tmp, cache, pid files) and mount tmpfs or a volume there. Do not throw away the whole hardening.',
  },
  {
    id: 'q-secret-file',
    pack: 'Security',
    question: 'Why avoid ENV DB_PASSWORD=... in a Dockerfile?',
    choices: [
      'ENV is slower at runtime',
      'It is baked into image layers and leaks via docker inspect/history to anyone with the image',
      'Docker cannot read ENV values in containers',
    ],
    correct: 1,
    explain:
      'Config that is secret must not be immutable image content. Inject at run/compose time (env file, secret mount). History and inspect are readers.',
  },
  {
    id: 'q-health-condition',
    pack: 'Compose',
    question: 'depends_on with condition: service_healthy means…',
    choices: [
      'Start the dependency after its healthcheck reports healthy',
      'Restart both services every 30s',
      'Encrypt traffic between services',
    ],
    correct: 0,
    explain:
      'You are buying readiness, not just start order. The dependency must define a healthcheck or the condition never becomes true.',
  },
  {
    id: 'q-profile',
    pack: 'Compose',
    question: 'Compose profiles are used to…',
    choices: [
      'Change the Docker log driver',
      'Include optional services only when explicitly activated',
      'Pin image digests',
    ],
    correct: 1,
    explain:
      'Profiles keep debug workers, admin tools, or seed jobs out of the default up set. Activate with --profile dev.',
  },
  {
    id: 'q-override',
    pack: 'Compose',
    question: 'compose.override.yml is the standard place for…',
    choices: [
      'Production-only replica counts',
      'Local/dev tweaks layered over the base compose file',
      'The only file Compose reads',
    ],
    correct: 1,
    explain:
      'Base file is shared truth; override is developer laptop glue (bind mounts, debug ports). Avoid encoding prod in the override.',
  },
  {
    id: 'q-dns-missing',
    pack: 'Failure labs',
    question: 'web cannot resolve db, but both containers are Up. First hypothesis?',
    choices: [
      'They are not on a shared user-defined network (or wrong service name)',
      'The host is out of disk',
      'You forgot --read-only',
    ],
    correct: 0,
    explain:
      'DNS is a network-membership feature. Check docker network inspect and that the client uses the service/compose name, not localhost.',
  },
  {
    id: 'q-health-unhealthy',
    pack: 'Failure labs',
    question: 'docker ps shows (unhealthy). What does that usually mean?',
    choices: [
      'The container has too many layers',
      'The HEALTHCHECK command is failing — process is up but the probe (HTTP/DB) is failing',
      'The image failed to pull',
    ],
    correct: 1,
    explain:
      'Unhealthy is the probe saying the app is not ready. Read logs, exec and curl the health path, fix the app or the probe command.',
  },
  {
    id: 'q-user-denied',
    pack: 'Failure labs',
    question: 'Permission denied writing to /app/config after USER app. Best fix?',
    choices: [
      'chmod 777 the image',
      'chown the path to the app user in the Dockerfile, or write config to a volume/tmpfs owned by app',
      'Remove USER and stay root',
    ],
    correct: 1,
    explain:
      'Fix ownership or the write path. 777 and root are how you win the battle and lose the security review.',
  },
  {
    id: 'q-layer-whiteout',
    pack: 'Under the hood',
    question: 'Container A deletes a file from the image. Container B (same image)…',
    choices: [
      'Also loses the file',
      'Still sees the file — deletion is a whiteout only in A’s writable layer',
      'Corrupts the shared layer for everyone',
    ],
    correct: 1,
    explain:
      'Lower layers are immutable and shared. Delete/add/write in one container never mutates the shared image content.',
  },
  {
    id: 'q-diff',
    pack: 'Under the hood',
    question: 'docker diff shows a huge /var/log file. What story does that tell?',
    choices: [
      'The base image is oversized',
      'The container wrote a large file into the writable layer (not a volume)',
      'Ports are mispublished',
    ],
    correct: 1,
    explain:
      'diff is the writables/whiteout report. Ephemeral logs should go to stdout or a volume, not accumulate in the container FS.',
  },
  {
    id: 'q-build-secret',
    pack: 'Build',
    question: 'Need an API key during RUN npm ci without leaving it in the image. Use…',
    choices: [
      'ARG then ENV the key',
      'BuildKit secret mount: RUN --mount=type=secret … (or a multi-stage trick that never copies the key)',
      'COPY key.pem into the builder and rmi later',
    ],
    correct: 1,
    explain:
      'Classic ARG/COPY secrets end up in layers/history. BuildKit secrets (or external fetch at build with short-lived creds) keep them out of the final filesystem.',
  },
  {
    id: 'q-cgroup',
    pack: 'Under the hood',
    question: 'A container starves the host CPU. What is the precise limit knob?',
    choices: [
      'Dockerfile CMD',
      'cgroup limits (--cpus/--memory) or compose deploy.resources',
      'EXPOSE',
    ],
    correct: 1,
    explain:
      'Namespaces isolate; cgroups limit. Set --memory, --cpu-quota/--cpus so noisy neighbors cannot wreck the host.',
  },
  {
    id: 'q-checkpoint',
    pack: 'Basics',
    question: 'Best definition of a “ready” container for dependents?',
    choices: [
      'docker create returned an ID',
      'The process answers a real readiness probe (port, DB, HTTP 200 on /health)',
      'It has a name',
    ],
    correct: 1,
    explain:
      'Created/starting is not ready. Wire a probe or make dependents retry. This is the lesson of depends_on vs health.',
  },
  {
    id: 'q-bind-perm',
    pack: 'Data',
    question: 'Bind mount ./data:/data causes Permission denied for user app. Usually…',
    choices: [
      'Named volumes are always required',
      'Host dir UID/GID does not match the container user',
      'EXPOSE is missing',
    ],
    correct: 1,
    explain:
      'Bind mounts carry host ownership. Match UIDs, use user namespaces, or prefer named volumes for app-owned data.',
  },
  {
    id: 'q-prune-volumes',
    pack: 'Ops',
    question: 'docker system prune --volumes is appropriate when…',
    choices: [
      'You need the DB data tomorrow',
      'You are on an ephemeral CI runner and all volumes are disposable',
      'You only want to stop containers',
    ],
    correct: 1,
    explain:
      'Volumes are data. --volumes is the nuclear option for data. CI yes; shared DB volumes no.',
  },
  {
    id: 'q-multi-net',
    pack: 'Networks',
    question: 'Why attach a proxy container to both frontend and backend networks?',
    choices: [
      'To make it double fast',
      'So it can publish to clients and reach private services that clients cannot',
      'Because Docker requires 2 NICs',
    ],
    correct: 1,
    explain:
      'Network membership is the isolation boundary. Proxies are the deliberate bridge. DB stays on the private net only.',
  },
  {
    id: 'q-distroless',
    pack: 'Security',
    question: 'Distroless images mainly help security by…',
    choices: [
      'Encrypting the filesystem',
      'Removing shells and package managers so there is less to exploit and less CVE noise',
      'Hiding env vars',
    ],
    correct: 1,
    explain:
      'No shell means harder breakouts and smaller surface. Debug with ephemeral debug images or exec sidecars when needed.',
  },
  {
    id: 'q-log-driver',
    pack: 'Ops',
    question: 'Container disks fill with log files. Structural fix?',
    choices: [
      'Larger writable layer',
      'Log to stdout and use a log driver/aggregator; do not write huge local files in-container',
      'More EXPOSE lines',
    ],
    correct: 1,
    explain:
      '12-factor logs. json-file/local drivers with rotation, or ship out to Loki/ELK. Writable layer is not a log store.',
  },
  {
    id: 'q-tag-vs-digest',
    pack: 'Build',
    question: 'Why pin digests (image@sha256:…) in production deploy manifests?',
    choices: [
      'Tags never move, so digests are optional',
      'Tags can be overwritten; digests are immutable content addresses',
      'Digests pull faster',
    ],
    correct: 1,
    explain:
      'latest and 1.25 are mutable pointers. Digests make prod immune to silent tag moves. Trade-off: you own update flow.',
  },
];

export const FAILURE_BANK: LevelDefinition[] = [
  {
    id: 'fail-dns',
    name: 'DNS: name does not resolve',
    series: 'Failure labs',
    difficulty: 4,
    brief: 'web and db are Up but on different networks. Join them so web can reach db by name.',
    teaching: `Symptom: wget: bad address 'db' or curl: (6) Could not resolve host.

This is not a firewall mystery. DNS for container names exists on **user-defined networks** for **members**.

Hypothesis tree:
1. Is the name right? (compose service name vs container name vs alias)
2. Are both endpoints on the SAME network? (docker network inspect)
3. Is the client using localhost/127.0.0.1 by mistake?
4. Did you attach db only to a private net while web sits on another?

Fix patterns:
- docker network connect app-net web
- or re-run both with --network app-net
- in compose, put both under networks: [app-net]

Never "fix" DNS by putting the DB on the host network and hoping.

Your lab starts with web on bridge (or a different net) and db on app-net. Make them peers.

Inspect both containers' Networks: lines — that is the scoreboard.`,
    steps: steps(
      ['docker ps', 'Confirm both processes are Up (so this is not a crash).'],
      ['docker inspect web', 'Read Networks — is app-net missing?'],
      ['docker network connect app-net web', 'Attach web to the shared net (or re-run with --network).'],
      ['docker exec web wget -qO- http://db', 'Prove resolution + connectivity.'],
    ),
    fieldNotes: [
      'Aliases help when the container name is ugly: --network-alias api.',
      'Multiple networks: traffic crosses only where a container is dual-homed.',
    ],
    learning: [
      'DNS as membership, not magic',
      'network inspect/connect as diagnostics',
      'localhost vs service name in containers',
    ],
    hint: 'docker inspect web\ndocker network connect app-net web\ndocker exec web wget -qO- http://db',
    par: 4,
    start: {
      prePulled: ['alpine:3.20', 'nginx:1.25', 'postgres:16'],
      containers: [
        { name: 'db', image: 'postgres:16', networks: ['app-net'] },
        { name: 'web', image: 'nginx:1.25', networks: ['bridge'] },
      ],
    },
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      const db = s.containers.find((c) => c.name === 'db');
      return Boolean(web && db && web.networks.includes('app-net') && db.networks.includes('app-net'));
    },
  },
  {
    id: 'fail-unhealthy',
    name: 'Unhealthy probe',
    series: 'Failure labs',
    difficulty: 4,
    brief: 'Container is Up but marked unhealthy because the probe hits the wrong port. Fix the healthcheck.',
    teaching: `docker ps shows (unhealthy) or (health: starting) forever.

HEALTHCHECK is a **probe of behavior**, not a vibe. Common bugs:

| Probe says | Reality |
|------------|---------|
| wget http://127.0.0.1/health | App listens on 3000 and only / |
| CMD true | Liar — always healthy |
| curl localhost | IPv6/IPv4 mismatch |
| pg_isready -U wrong | Auth/role error looks like down |
| timeout too short | Cold start marks unhealthy |

Debug loop:
1. docker inspect --format '...' (Health.Log)  → probe stdout/stderr
2. docker exec web wget -qO- http://127.0.0.1:3000/  → manual probe
3. docker logs web → is the app even bound?
4. Fix either the app (listen 0.0.0.0, correct path) or the probe

In this lab the probe uses port 80 but the app expects 8080 inside (or path is wrong). Recreate the container with a correct --healthcheck.

A wrong healthcheck is worse than none: orchestrators will kill healthy apps.`,
    steps: steps(
      ['docker ps', 'See unhealthy state.'],
      ['docker inspect web', 'Read Health.Log / configured command.'],
      [
        'docker run -d --name web2 --healthcheck "wget -qO- http://127.0.0.1:8080/health" -p 8080:8080 nginx:1.25',
        'Recreate with a probe that matches reality (name web2 or rm old first).',
      ],
    ),
    fieldNotes: [
      'Prefer /health that checks dependencies lightly (DB ping with timeout).',
      'interval vs start-period: give slow apps a start-period.',
    ],
    learning: [
      'Probe semantics and Health.Log',
      'listen address vs probe address',
      'Why lying healthchecks are dangerous',
    ],
    hint: 'docker inspect web\ndocker rm -f web\ndocker run -d --name web --healthcheck "wget -qO- http://127.0.0.1:8080/health" -p 8080:8080 nginx:1.25',
    par: 3,
    start: {
      prePulled: ['nginx:1.25'],
      containers: [
        {
          name: 'web',
          image: 'nginx:1.25',
          healthcheck: 'wget -qO- http://127.0.0.1/',
          ports: [{ hostPort: 8080, containerPort: 80, protocol: 'tcp' }],
        },
      ],
    },
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web' || c.name === 'web2');
      return Boolean(web && web.healthcheck && web.healthcheck.includes('8080'));
    },
  },
  {
    id: 'fail-user-write',
    name: 'Permission denied as non-root',
    series: 'Failure labs',
    difficulty: 4,
    brief: 'app user cannot write /app/out. Fix ownership in the image story — do not revert to root.',
    teaching: `Error: Permission denied: /app/out/result.txt

You forced USER app (good). The directory is still root-owned from an early COPY (classic).

Fix hierarchy (best first):
1. Dockerfile: COPY --chown=app:app ...
2. Dockerfile: RUN mkdir /app/out && chown app:app /app/out
3. Run with a volume/tmpfs at /app/out owned correctly
4. Match host UID for bind mounts (id -u)

Anti-patterns:
- USER root "just for the write"
- chmod 777 (works in the demo, fails the review)

In this lab, prove whoami is non-root AND a write succeeds via a proper mount or by recreating with the right --user and a writable path.

Security and operability are not opposites; bad packaging makes them fight.`,
    steps: steps(
      ['docker run --name w1 --user app alpine:3.20 sh -c "echo hi > /app/out/x"', 'Reproduce the denial.'],
      [
        'docker run -d --name w2 --user app -v scratch:/app/out alpine:3.20',
        'Provide a writable mount for the non-root user (clean pattern).',
      ],
      ['docker exec w2 whoami', 'Still non-root.', true],
    ),
    fieldNotes: [
      'named volumes are root-owned initially — you may need an init chown entrypoint.',
      'rootless Docker changes UID mapping; test perms in CI.',
    ],
    learning: [
      'Ownership vs user identity',
      'COPY --chown and writable paths',
      'Volume/tmpfs as the correct write surface',
    ],
    hint: 'docker run -d --name w2 --user app -v scratch:/app/out alpine:3.20',
    par: 3,
    start: {
      prePulled: ['alpine:3.20'],
      containers: [
        { name: 'w1', image: 'alpine:3.20', user: 'app' },
      ],
    },
    quiz: ['q-user-denied', 'q-nonroot'],
    check: (s) => {
      const w2 = s.containers.find((c) => c.name === 'w2' || c.name === 'writer');
      return Boolean(w2 && w2.user && w2.user !== 'root' && w2.volumeMounts.length >= 1);
    },
  },
  {
    id: 'fail-volume-perm',
    name: 'Bind mount ownership mismatch',
    series: 'Failure labs',
    difficulty: 4,
    brief: 'Bind-mount host dir into a non-root container and end with a working write path.',
    teaching: `Named volumes are managed; **bind mounts are just host directories**.

Host dir owned by your user (uid 1000). Container runs as uid 1001 (or 0 vs 1000). Result: Permission denied or files appearing owned by weird UIDs on the host.

Decide explicitly:
- **App-owned data** → named volume (and init to chown if needed)
- **Developer source bind mount** → match UID or use rootless/userns
- **Config files** → read-only bind mount (:ro)

Never chmod 777 your home to make Docker happy.

Lab goal: use a named volume (or :ro config + named data) so writes succeed while whoami stays non-root.

Also remember: down -v never deletes bind mounts — they are your files.`,
    steps: steps(
      [
        'docker run -d --name data1 --user app -v appdata:/data alpine:3.20',
        'Named volume is the portable app-data pattern.',
      ],
      ['docker exec data1 whoami', 'Identity check.', true],
    ),
    fieldNotes: [
      ':ro for config prevents accidental mutation of host files.',
      'UID mismatch is the #1 bind-mount support ticket.',
    ],
    learning: [
      'Bind vs named ownership model',
      'When to use :ro',
      'Avoiding 777 as a design',
    ],
    hint: 'docker run -d --name data1 --user app -v appdata:/data alpine:3.20',
    par: 3,
    start: {
      prePulled: ['alpine:3.20'],
      volumes: ['appdata'],
    },
    quiz: ['q-bind-perm', 'q-writable-layer'],
    check: (s) => {
      const c = s.containers.find((x) => x.name === 'data1');
      return Boolean(c && c.user !== 'root' && c.volumeMounts.some((m) => !m.bind));
    },
  },
  {
    id: 'fail-dockerfile-order',
    name: 'Dockerfile cache poison',
    series: 'Failure labs',
    difficulty: 5,
    brief: 'Diagnose a Dockerfile where every rebuild reinstalls deps. Rebuild with a cache-friendly order.',
    teaching: `Symptom: every docker build takes 8 minutes even for one-line source edits.

Read the Dockerfile top to bottom. The first instruction that changes invalidates everything after.

Poison patterns:
  COPY . .          # any edit busts cache here
  RUN npm ci        # always cold
  RUN pip install   # always cold

Repair pattern:
  COPY requirements.txt .
  RUN pip install -r requirements.txt
  COPY . .

Also poison:
- ARG used early but changes every CI run (build number)
- ADD of a remote URL
- secrets in early RUN (also a security bug)

In this lab you get a bad order. Produce a build that shows CACHED on the dependency step on the second build (our sim marks unchanged earlier lines as cached).

If you must pass --no-cache forever, your order is still wrong.`,
    steps: steps(
      ['docker build -t app:1.0 .', 'Baseline slow rebuild story.'],
      ['docker build -t app:1.0 .', 'Observe cache flags in output after you fix order (files already set for good order — compare teaching).'],
    ),
    fieldNotes: [
      'BuildKit --mount=type=cache can outperform layer cache for package managers.',
      'Pin deps (lockfiles) or cache means wrong versions forever.',
    ],
    learning: [
      'Sequential cache invalidation',
      'Lockfile + early COPY pattern',
      'ARG/ADD as cache poison',
    ],
    hint: 'docker build -t app:1.0 .\ndocker history app:1.0',
    par: 2,
    start: {
      files: {
        Dockerfile: [
          'FROM node:20-alpine',
          'WORKDIR /app',
          'COPY . .',
          'RUN npm ci',
          'CMD ["node", "app.js"]',
        ].join('\n'),
        'package.json': '{"name":"x","dependencies":{}}',
        'app.js': 'console.log(1);',
      },
    },
    quiz: ['q-layer-cache', 'q-build-secret'],
    check: (s) => Boolean(s.images.find((i) => i.repo === 'app')),
  },
  {
    id: 'fail-prune-regret',
    name: 'Prune regret (recoverable process)',
    series: 'Failure labs',
    difficulty: 3,
    brief: 'Inventory with system df, delete ONLY stopped junk, keep a data volume and a running service.',
    teaching: `The incident channel: "I ran prune -a --volumes and staging is gone."

Good pruning is **filter-shaped**, not apocalyptic:

1. docker system df → map
2. docker ps -a → classify: running / exited-precious / exited-junk
3. docker container prune → only stopped
4. docker image prune → dangling only
5. volumes: inspect contents first; never --volumes casually

Invariant to practice here:
- a running web container remains
- a named volume with data remains
- stopped tmp containers are gone

If you fail this, you learned why prod runbooks ban shotgun prune.

Our simulator records prune results so the check can see what you destroyed.`,
    steps: steps(
      ['docker system df', 'Inventory first.'],
      ['docker stop tmp', 'Make junk actually junk (if not already).'],
      ['docker container prune', 'Narrow delete — not system prune --volumes.'],
      ['docker ps', 'web still running is success evidence.', true],
    ),
    fieldNotes: [
      'CI runners: aggressive prune is fine.',
      'Shared staging: names and labels beat guessing.',
    ],
    learning: [
      'Classification before deletion',
      'Narrow prune verbs',
      'Protecting volumes and running workloads',
    ],
    hint: 'docker system df\ndocker container prune\ndocker ps\ndocker volume ls',
    par: 4,
    start: {
      prePulled: ['alpine:3.20', 'nginx:1.25'],
      volumes: ['appdata'],
      containers: [
        { name: 'web', image: 'nginx:1.25' },
        { name: 'tmp', image: 'alpine:3.20' },
      ],
    },
    quiz: ['q-prune-volumes', 'q-prune'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web' && c.status === 'running');
      const vol = s.volumes.find((v) => v.name === 'appdata');
      const tmp = s.containers.find((c) => c.name === 'tmp');
      return Boolean(web && vol && !tmp);
    },
  },
  {
    id: 'fail-dependson-race',
    name: 'depends_on is not readiness',
    series: 'Failure labs',
    difficulty: 5,
    brief: 'App starts before DB is ready. Leave the stack in a state where web depends on a healthy db.',
    teaching: `Classic prod 2am:

  web   | Error: connect ECONNREFUSED db:5432
  web   | retrying...
  db    | ready to accept connections   # too late

depends_on only orders **container start**. Postgres/Redis/Mongo need seconds to accept connections.

Solutions (layered):
1. App-level retry/backoff (always)
2. healthcheck on db + depends_on.condition: service_healthy (compose)
3. Entrypoint wait script (older pattern)
4. Orchestrator readiness probes (K8s)

Do **not** sleep 5 in the Dockerfile — that freezes builds and is still a race.

Lab acceptance: compose model / container story shows db healthcheck and web waiting on health (or equivalent inspect fields), and the race is explained in your head.

We simulate the compose fix via run flags + network membership and a healthcheck on db.`,
    steps: steps(
      ['docker compose config', 'Read the declared depends_on / health story.'],
      [
        'docker run -d --name db --healthcheck "pg_isready" postgres:16',
        'DB with a real readiness probe.',
      ],
      [
        'docker run -d --name web --network app-net nginx:1.25',
        'App on the shared net (already in broken stack — repair).',
      ],
    ),
    fieldNotes: [
      'compose: condition: service_healthy is the declarative fix.',
      'K8s: readinessProbe ≠ livenessProbe.',
    ],
    learning: [
      'Start order vs readiness',
      'healthcheck + condition pattern',
      'Why sleep-in-entrypoint is a smell',
    ],
    hint: 'docker compose config\ndocker run -d --name db --healthcheck "pg_isready" postgres:16',
    par: 4,
    start: {
      prePulled: ['postgres:16', 'nginx:1.25'],
      files: {
        'docker-compose.yml': [
          'services:',
          '  web: { image: nginx:1.25, depends_on: [db], networks: [app-net] }',
          '  db: { image: postgres:16, networks: [app-net] }',
          'networks: { app-net: {} }',
        ].join('\n'),
      },
      containers: [
        { name: 'db', image: 'postgres:16', networks: ['app-net'] },
        { name: 'web', image: 'nginx:1.25', networks: ['app-net'] },
      ],
    },
    quiz: ['q-health-condition', 'q-compose-depends', 'q-checkpoint'],
    check: (s) => {
      const db = s.containers.find((c) => c.name.includes('db'));
      return Boolean(db && db.healthcheck && (db.health === 'healthy' || db.status === 'running'));
    },
  },
  {
    id: 'fail-disk-logs',
    name: 'Writable layer full of logs',
    series: 'Failure labs',
    difficulty: 4,
    brief: 'Stop log-file sprawl: leave a container that logs to stdout (or a volume), not the writable layer.',
    teaching: `Error: No space left on device — but images are tiny.

docker diff web shows megabytes under /var/log/app/app.log.

Why this is structural:
- writable layer is per-container and removed with rm (so you "fix" space by destroying evidence)
- unbounded local logs fill the disk and hide bugs
- backup/retention is impossible to reason about

Correct patterns:
- 12-factor: logs to stdout/stderr; docker handles rotation via log-driver
- ship to Loki/ELK/Splunk for retention
- if you must files: a volume with an external rotator

In this lab, end with a design where logs are not accumulating in the container FS: e.g. run with a log-oriented posture (stdout logging, or simply not writing a huge file) and explain via inspect/logs.

Practical win condition we can check: a running container whose volumeData does not contain a giant log path — i.e. you did not bake logging into the writable layer.`,
    steps: steps(
      ['docker inspect web', 'Find the offending write path (FS entries).'],
      [
        'docker rm -f web',
        'Clear the bad instance.',
      ],
      [
        'docker run -d --name web nginx:1.25',
        'Restart with stdout logging (no /var/log file writes).',
      ],
    ),
    fieldNotes: [
      'json-file with max-size/max-file is the daemon-side backstop.',
      'Debug logs at DEBUG level are the usual disk killer.',
    ],
    learning: [
      'Writable layer as anti-pattern log store',
      'stdout + log drivers',
      'docker diff as a disk diagnosis tool',
    ],
    hint: 'docker inspect web\ndocker rm -f web\ndocker run -d --name web nginx:1.25',
    par: 3,
    start: {
      prePulled: ['nginx:1.25', 'alpine:3.20'],
      containers: [
        {
          name: 'web',
          image: 'alpine:3.20',
          volumeData: { '/var/log/app/app.log': 'x'.repeat(80) },
        },
      ],
    },
    quiz: ['q-log-driver', 'q-diff'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web' && c.status === 'running');
      if (!web) return false;
      const logSprawl = Object.keys(web.volumeData).some((p) => p.includes('/var/log'));
      return !logSprawl;
    },
  },
];

export const COMPOSE_PROD_LEVELS: LevelDefinition[] = [
  {
    id: 'compose-secrets',
    name: 'Secrets out of the image',
    series: 'Compose',
    difficulty: 5,
    brief: 'Provide a DB password without baking it into an image layer. Use run-time env or a secret mount.',
    teaching: `Three bad ways to ship a password:

1. ENV DB_PASSWORD=hunter2 in the Dockerfile → in history + inspect for anyone with the image
2. COPY .env → still a layer (and often in git)
3. password in a public compose file → repo leak

Good ways:
- run/compose **environment** from an untracked env file: env_file: .env (gitignored)
- **secrets** (Swarm/compose secrets) as files under /run/secrets
- short-lived tokens from a secret manager (vault, cloud SM)

Rules:
- Never in Dockerfile ENV/RUN/COPY
- Never in git
- Rotate when leaked (assume history is leaked)
- Prefer file mounts over env when the app can read files (env leaks via /proc/1/environ and many dumps)

Lab: create container with -e DB_PASSWORD=... at run (or -v secret) while the image stays clean. Inspect must show Env on the container, not in image history.

Our win check: a running container has env DB_PASSWORD set at runtime, and you have not built it into an image as ENV.`,
    steps: steps(
      [
        'docker run -d --name db -e DB_PASSWORD=demo -v pgdata:/var/lib/postgresql/data postgres:16',
        'Inject at run time (container config), not image content.',
      ],
      ['docker inspect db', 'Env is on the container object.', true],
    ),
    fieldNotes: [
      'compose secrets: file-based, better than env for CLI tools that read files.',
      'Anyone who can docker inspect or pull your image is in the blast radius of baked secrets.',
    ],
    learning: [
      'Image content vs runtime config',
      'env_file / secrets patterns',
      'History and inspect as leak surfaces',
    ],
    hint: 'docker run -d --name db -e DB_PASSWORD=demo postgres:16\ndocker inspect db',
    par: 3,
    start: { prePulled: ['postgres:16'] },
    quiz: ['q-secret-file', 'q-build-secret'],
    check: (s) => {
      const db = s.containers.find((c) => c.name === 'db');
      return Boolean(db && db.env['DB_PASSWORD']);
    },
  },
  {
    id: 'compose-health-condition',
    name: 'service_healthy depends_on',
    series: 'Compose',
    difficulty: 5,
    brief: 'Declare db health and make web depend on readiness — recreate the stack accordingly.',
    teaching: `Production compose fragment:

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 10
  web:
    depends_on:
      db:
        condition: service_healthy

Mechanics:
1. db gets a probe
2. compose waits until Health=healthy before starting web
3. still keep app retries (compose can only gate **start**)

Profiles variant: put a migrate job under profiles: ["tools"] so up does not run it every time.

Lab acceptance (simulated): db container has healthcheck and web exists with compose dependency story — we check healthcheck on db + both up on same net.

Read that again: health is a **contract** between the process and its dependents.`,
    steps: steps(
      [
        'docker run -d --name db --healthcheck "pg_isready" postgres:16',
        'Probe attached to the dependency.',
      ],
      ['docker run -d --name web --network app-net nginx:1.25', 'Dependent on the shared net.'],
    ),
    fieldNotes: [
      'start_period avoids false unhealthy during migrations.',
      'condition: service_started is the weak sibling of service_healthy.',
    ],
    learning: [
      'service_healthy semantics',
      'Probe design (pg_isready, HTTP /health)',
      'Profiles for optional jobs',
    ],
    hint: 'docker run -d --name db --healthcheck "pg_isready" postgres:16\ndocker run -d --name web --network app-net nginx:1.25',
    par: 3,
    start: {
      prePulled: ['postgres:16', 'nginx:1.25'],
      containers: [
        { name: 'db', image: 'postgres:16', networks: ['app-net'] },
        { name: 'web', image: 'nginx:1.25', networks: ['app-net'] },
      ],
      files: {
        'docker-compose.yml': [
          'services:',
          '  db:',
          '    image: postgres:16',
          '    healthcheck: { test: pg_isready, interval: 5s, retries: 10 }',
          '  web:',
          '    image: nginx:1.25',
          '    depends_on:',
          '      db: { condition: service_healthy }',
          '    networks: [app-net]',
        ].join('\n'),
      },
    },
    quiz: ['q-health-condition', 'q-profile', 'q-override'],
    check: (s) => {
      const db = s.containers.find((c) => c.name === 'db' || c.name.includes('db'));
      const web = s.containers.find((c) => c.name === 'web' || c.name.includes('web'));
      return Boolean(db && web && db.healthcheck);
    },
  },
];

export const SECURITY_DRILLS: LevelDefinition[] = [
  {
    id: 'sec-cap-drop',
    name: 'Drop capabilities',
    series: 'Security',
    difficulty: 4,
    brief: 'Run a hardened container story: non-root + read-only + a single writable tmpfs.',
    teaching: `Linux capabilities turn "root" into a menu of powers: NET_RAW, NET_ADMIN, SYS_PTRACE, SYS_ADMIN, CAP_SYS_MODULE, …

Docker defaults are a middle ground. For app containers:

  docker run --user 1000:1000 \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    myapp

What each does:
- --user: not uid 0
- --read-only: immutable rootfs
- --tmpfs: the only writable scratch
- --cap-drop ALL: start from zero powers (add back NET_BIND_SERVICE if needed)
- no-new-privileges: no setuid escalation mid-run

Swapping these off because "the app broke" is how hardening dies. Fix the app write paths and required caps explicitly.

Lab win: a container with user != root and readOnly true (caps modeled in inspect if present).

Defense in depth is a stack — each line is cheap.`,
    steps: steps(
      [
        'docker run -d --name hard --user app --read-only -v scratch:/tmp alpine:3.20',
        'Non-root + immutable rootfs + explicit scratch.',
      ],
      ['docker inspect hard', 'Prove User and ReadonlyRootfs.', true],
    ),
    fieldNotes: [
      'NET_BIND_SERVICE is the usual add-back for ports under 1024.',
      'no-new-privileges is almost free — take it.',
    ],
    learning: [
      'Capability model vs blanket root',
      'read-only + tmpfs packaging',
      'no-new-privileges',
    ],
    hint: 'docker run -d --name hard --user app --read-only -v scratch:/tmp alpine:3.20\ndocker inspect hard',
    par: 3,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-cap-drop', 'q-read-only', 'q-nonroot'],
    check: (s) => {
      const c = s.containers.find((x) => x.name === 'hard');
      return Boolean(c && c.readOnly && c.user && c.user !== 'root');
    },
  },
  {
    id: 'sec-distroless',
    name: 'Prefer minimal runtime bases',
    series: 'Security',
    difficulty: 4,
    brief: 'Compare node:20 vs alpine vs a distroless-style choice; leave with a slim image and a scan story.',
    teaching: `CVE count correlates with **package count** and **age of unpatched packages**.

| Base | Shells? | Typical use |
|------|---------|-------------|
| node:20 (Debian) | yes | convenience build/dev |
| node:20-alpine | yes (ash) | slim prod with debug shell |
| distroless | no | hardened prod |
| scratch + static bin | no | Go/Rust ideal end state |

Practical ladder:
1. Multi-stage (tools out)
2. alpine/slim runtime
3. USER non-root
4. scan gate on critical/high
5. distroless when your debug story is ready

You cannot exec bash in distroless — debug with ephemeral debug tags or metrics/traces. That is not a bug.

Lab: pull fat and slim, scan both, keep alpine in the local store as the chosen slim base for later runs.`,
    steps: steps(
      ['docker pull node:20', 'Fat base — larger CVE surface.'],
      ['docker pull alpine:3.20', 'Slim base.'],
      ['docker scan node:20', 'Quantify the difference.'],
      ['docker scan alpine:3.20', 'Decide with numbers.'],
    ),
    fieldNotes: [
      'Distroless + non-root + read-only is a very strong default.',
      'Pin digests in deploy when tag movement is unacceptable.',
    ],
    learning: [
      'Base size vs CVE surface',
      'Debug strategy without shells',
      'Scan-gated releases',
    ],
    hint: 'docker pull node:20\ndocker pull alpine:3.20\ndocker scan node:20\ndocker scan alpine:3.20',
    par: 4,
    quiz: ['q-distroless', 'q-tag-vs-digest'],
    check: (s) => Boolean(s.images.find((i) => i.repo === 'alpine') && s.images.find((i) => i.repo === 'node')),
  },
];

export const HOOD_DRILLS: LevelDefinition[] = [
  {
    id: 'hood-whiteout',
    name: 'Whiteout isolation',
    series: 'Under the hood',
    difficulty: 5,
    brief: 'Prove one container delete/write does not mutate the shared image for another container.',
    teaching: `Overlayfs lower layers are **immutable and shared**.

Container A: rm /etc/motd  → whiteout in A's upper layer
Container B (same image): still sees /etc/motd

Container A: echo x > /etc/motd → copy-up: full file copied to upper, then modified
Container B: original content

This is why:
- images are safely shared across dozens of containers
- "hotfix in the running container" does not fix the image
- docker commit is almost always the wrong impulse — fix the Dockerfile

Lab design:
1. Two containers, same imageId
2. One uses --read-only (cannot mutate) and one writable
3. You can reason: shared lower, private upper

Acceptance: same imageId on c1 and c2; c1 readOnly (policy demonstration of immutability).

Optional real-Docker homework: docker diff c2 after a write.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Shared lower stack.'],
      ['docker run -d --name c1 --read-only -v s1:/tmp alpine:3.20', 'Immutability enforced.'],
      ['docker run -d --name c2 alpine:3.20', 'Private writable layer.'],
    ),
    fieldNotes: [
      'docker diff is the upper-layer report card.',
      'rm in container != rm in image.',
    ],
    learning: [
      'Whiteout and copy-up',
      'Shared lower immutability',
      'Why hotfix-in-container fails',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name c1 --read-only -v s1:/tmp alpine:3.20\ndocker run -d --name c2 alpine:3.20',
    par: 3,
    check: (s) => {
      const c1 = s.containers.find((c) => c.name === 'c1');
      const c2 = s.containers.find((c) => c.name === 'c2');
      return Boolean(c1?.readOnly && c2 && c1.imageId === c2.imageId);
    },
    quiz: ['q-layer-whiteout', 'q-diff'],
  },
  {
    id: 'hood-cgroup-limits',
    name: 'cgroup limits for noisy neighbors',
    series: 'Under the hood',
    difficulty: 4,
    brief: 'Run a container with memory and CPU limits and read them back from inspect.',
    teaching: `Namespaces answer "what can it see?"
cgroups answer "how much can it use?"

Without limits, one JVM can swap the whole host. With limits:

  docker run -d --name batch \
    --memory 256m --memory-swap 256m \
    --cpus 0.5 \
    alpine:3.20

OOM killer will kill **that** container when it exceeds memory (exit 137 story). That is better than host-wide thrash.

Compose:

  deploy:
    resources:
      limits:
        cpus: '0.50'
        memory: 256M

Pair with restart: on-failure if the job should retry after OOM (careful: infinite OOM loops).

Lab win: inspect shows memLimit/cpus set.

Capacity planning without limits is theater.`,
    steps: steps(
      [
        'docker run -d --name batch --memory 256m --cpus 0.5 alpine:3.20',
        'Declare resource ceilings at create time.',
      ],
      ['docker inspect batch', 'Limits visible in config.', true],
    ),
    fieldNotes: [
      'memory-swap equal to memory disables swap (predictable OOM).',
      'requests/limits in K8s are the same idea with scheduling.',
    ],
    learning: [
      'Namespaces vs cgroups one-liner',
      'OOM 137 and limits',
      'compose deploy.resources',
    ],
    hint: 'docker run -d --name batch --memory 256m --cpus 0.5 alpine:3.20\ndocker inspect batch',
    par: 3,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-cgroup', 'q-ns'],
    check: (s) => {
      const c = s.containers.find((x) => x.name === 'batch');
      return Boolean(c && (c.memLimit || c.cpus));
    },
  },
];
