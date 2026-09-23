import type { LevelDefinition, QuizQuestion } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

export const QUIZZES: QuizQuestion[] = [
  {
    id: 'q-image-container',
    pack: 'Basics',
    question: 'What is the precise relationship between an image and a container?',
    choices: [
      'A container is a full copy of an image filesystem',
      'A container is a runtime instance of an image with a thin writable layer on shared read-only layers',
      'An image is a running process; a container is its backup',
    ],
    correct: 1,
    explain:
      'Images are immutable layered templates. Containers share those layers and add a writable layer plus namespaces/PIDs/network config. You can run many containers from one image.',
  },
  {
    id: 'q-writable-layer',
    pack: 'Basics',
    question: 'Where do in-container file writes go if nothing is mounted?',
    choices: [
      'Into the image so the next run sees them',
      'Onto the host home directory automatically',
      'Into the container writable layer, which is destroyed with the container',
    ],
    correct: 2,
    explain:
      'Without a volume/bind mount, writes hit the container writable layer (copy-up on write). docker rm discards it. Persist data with named volumes or bind mounts.',
  },
  {
    id: 'q-expose-publish',
    pack: 'Networks',
    question: 'What does EXPOSE 80 in a Dockerfile actually do?',
    choices: [
      'Publishes port 80 to the host',
      'Documents intended ports; does not publish to the host',
      'Creates a firewall rule blocking other ports',
    ],
    correct: 1,
    explain:
      'EXPOSE is metadata. Host access requires -p host:container (or compose ports). Two different layers of intent: document vs wire.',
  },
  {
    id: 'q-multistage',
    pack: 'Build',
    question: 'Why does a multi-stage build produce a smaller runtime image?',
    choices: [
      'Docker compresses gzip better in stage 2',
      'Only the final stage is exported; compilers/toolchains in builder stages are discarded',
      'Layers from earlier stages are stored in a remote cache forever',
    ],
    correct: 1,
    explain:
      'COPY --from=builder pulls artifacts. The final FROM starts a new rootfs. Build tools never ship. That is the size and attack-surface win.',
  },
  {
    id: 'q-layer-cache',
    pack: 'Build',
    question: 'Your Dockerfile does COPY . . early, then RUN npm ci. Rebuilds are slow. What is the fix?',
    choices: [
      'Always pass --no-cache',
      'Copy package*.json first, npm ci, then COPY . . so dependency install stays cached when only app code changes',
      'Move all RUN steps after COPY',
    ],
    correct: 1,
    explain:
      'Cache invalidates from the first changed instruction onward. Stable, expensive steps (deps) should sit above volatile ones (source).',
  },
  {
    id: 'q-compose-depends',
    pack: 'Compose',
    question: 'What does depends_on guarantee by default?',
    choices: [
      'The dependency is healthy before start',
      'Start order only — not readiness unless you add healthcheck + condition',
      'Network encryption between services',
    ],
    correct: 1,
    explain:
      'depends_on is ordering. App readiness needs healthchecks and depends_on.condition: service_healthy (or retry logic in the app).',
  },
  {
    id: 'q-compose-network-name',
    pack: 'Compose',
    question: 'In compose, service db on the project network is reachable from web as…',
    choices: ['localhost', 'db (DNS name on the project network)', 'the host machine IP only'],
    correct: 1,
    explain:
      'Compose creates a default project network with embedded DNS. Service names are hostnames. localhost inside web is web itself, not db.',
  },
  {
    id: 'q-nonroot',
    pack: 'Security',
    question: 'Why run the app as a non-root user inside the container?',
    choices: [
      'Containers cannot run as root at all',
      'Root in the container is still powerful if there is a breakout; non-root limits impact (defense in depth)',
      'Non-root images cannot have vulnerabilities',
    ],
    correct: 1,
    explain:
      'User namespaces help, but root + capabilities + a vulnerable service is a worse day. USER app or --user reduces blast radius. Still patch base images.',
  },
  {
    id: 'q-health',
    pack: 'Ops',
    question: 'A container is Up but the app is wedged. What surfaces that best?',
    choices: [
      'HEALTHCHECK + docker ps health status (and orchestrator restart policies)',
      'docker rmi',
      'EXPOSE in the Dockerfile',
    ],
    correct: 0,
    explain:
      'Liveness of the process is not readiness of the app. HEALTHCHECK probes real behavior. Combine with restart policy or an orchestrator.',
  },
  {
    id: 'q-prune',
    pack: 'Ops',
    question: 'docker system prune is dangerous mainly because…',
    choices: [
      'It formats the host disk',
      'It removes all unused objects (stopped containers, dangling images, networks) and is irreversible',
      'It never deletes anything',
    ],
    correct: 1,
    explain:
      'Prune is bulk GC of unused resources. Volumes are opt-in via --volumes. Always docker system df first when unsure.',
  },
  {
    id: 'q-ns',
    pack: 'Under the hood',
    question: 'Two containers do not see each other’s processes primarily because of…',
    choices: [
      'different Linux kernels',
      'PID namespaces (plus mount/net/UTS/IPC/user namespaces)',
      'Docker Desktop UI settings',
    ],
    correct: 1,
    explain:
      'Namespaces isolate views of the system. cgroups limit resources. Union filesystems stack layers. Together they make lightweight isolated processes without a guest kernel.',
  },
  {
    id: 'q-fail-port',
    pack: 'Failure labs',
    question: 'Bind for 0.0.0.0:8080 failed: port is already allocated. Best next step?',
    choices: [
      'docker system prune -a',
      'Find the holder (docker ps) and stop/rm it, or publish a different host port',
      'Delete all volumes',
    ],
    correct: 1,
    explain:
      'Host ports are exclusive. Identify the conflicting container, then free the port or remap. Prune is a blunt and lossy hammer.',
  },
];

export const BASIC_LEVELS: LevelDefinition[] = [
  {
    id: 'intro-hello',
    name: 'Hello, daemon',
    series: 'Basics',
    difficulty: 1,
    brief: 'Pull hello-world and run it. It prints a message and exits 0.',
    teaching: `Docker is not a virtual machine. It packages a process plus its filesystem view.

IMAGE — immutable template: stacked read-only layers + config (CMD, ENV, EXPOSE, USER).
CONTAINER — a live instance: namespaces (PID, mount, net, UTS, IPC, user), cgroup limits, a writable layer on top of the image, and one main process (PID 1).

docker pull downloads missing layers into the local content store (by digest). docker run:
1. creates a container object (config + writable layer)
2. sets up namespaces/network
3. starts PID 1 = image CMD (unless you override)

hello-world's PID 1 prints and exits. Exit 0 is success. docker ps then shows nothing; docker ps -a shows the exited container.

Mental model to keep forever: images are nouns (templates), containers are verbs (processes with isolation).`,
    steps: steps(
      ['docker pull hello-world', 'Fetch layers into the local store. Network + content-addressed cache.'],
      ['docker run hello-world', 'Instantiate + start PID 1. Stream stdout. Exit 0 when done.'],
    ),
    fieldNotes: [
      'Pull is idempotent: second pull says Image is up to date.',
      'If you run without a local image and auto-pull is off: Unable to find image locally.',
    ],
    learning: [
      'Image vs container vs process',
      'What pull downloads (layers by digest)',
      'What run does in the daemon (create then start then attach)',
    ],
    hint: 'docker pull hello-world\ndocker run hello-world',
    par: 2,
    quiz: ['q-image-container'],
    check: (s) => s.containers.some((c) => c.image.startsWith('hello-world') && c.status === 'exited'),
  },
  {
    id: 'image-vs-container',
    name: 'One image, many containers',
    series: 'Basics',
    difficulty: 2,
    brief: 'Pull alpine:3.20 once. Run two detached containers web and worker from that one image.',
    teaching: `This is the #1 Docker confusion, permanently.

Containers do NOT each hold a private full copy of the image. The daemon mounts the same read-only layers for every instance and gives each container its own thin writable layer (copy-up on write).

So:
- 1 alpine image (shared layers)
- 2 writable layers (web, worker)
- 2 PID 1 processes
- 2 network endpoints

-d/--detach leaves the process running in the background and returns the container ID. Without -d, your terminal is attached to PID 1 stdio (try it with a long-running process and Ctrl-C stops it).

--name is stable identity for scripts and DNS. Unnamed containers get generated names (friendly_euler_...).

Success evidence: two running rows in ps, ONE alpine:3.20 in images, same IMAGE ID in inspect.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Shared template into the local store.'],
      ['docker run -d --name web alpine:3.20', 'Instance A: writable layer + namespaces + PID 1.'],
      ['docker run -d --name worker alpine:3.20', 'Instance B of the SAME imageId.'],
    ),
    fieldNotes: [
      'docker inspect web vs worker: same Image id, different Id / Name.',
      'A third run is cheap — only a writable layer + metadata.',
    ],
    learning: [
      'Shared read-only layers vs per-container writable layer',
      'Detach mode and PID 1',
      'Naming and why imageId equality matters',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name web alpine:3.20\ndocker run -d --name worker alpine:3.20',
    par: 3,
    quiz: ['q-image-container', 'q-writable-layer'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      const worker = s.containers.find((c) => c.name === 'worker');
      return Boolean(
        web && worker && web.status === 'running' && worker.status === 'running' && web.imageId === worker.imageId,
      );
    },
  },
  {
    id: 'lifecycle',
    name: 'Lifecycle: stop is not rm',
    series: 'Basics',
    difficulty: 2,
    brief: 'Run demo, stop it, start it again. Same container must be running at the end.',
    teaching: `Container states are a small state machine around the main process:

created -> running -> exited
              \\-> (rm) gone

stop — SIGTERM to PID 1, grace period, then SIGKILL. Process ends; config + writable layer remain.
start — same container ID, same writable layer, new PID 1.
rm — delete the container object and writable layer. Volumes survive.

start is not run.
- run = create + start (new ID)
- start = restart an existing object

ps shows running only. ps -a shows the full history including exited. That is how you find "I ran it and it vanished."

Also learn exit codes: Exited (0) is clean. Exited (137) often means SIGKILL (OOM or kill -9).`,
    steps: steps(
      ['docker run -d --name demo alpine:3.20', 'Create + start. PID 1 stays up (shell/sleep semantics in sim).'],
      ['docker stop demo', 'Graceful stop to exited(0). Writable layer kept.'],
      ['docker start demo', 'Same id, same writable layer, new process.'],
    ),
    fieldNotes: [
      'stop is reversible; rm is not (except volumes).',
      'docker rm -f = stop + rm when you are sure.',
    ],
    learning: [
      'Container state machine and exit codes',
      'stop vs rm, start vs run',
      'Reading ps and ps -a as diagnostics',
    ],
    hint: 'docker run -d --name demo alpine:3.20\ndocker stop demo\ndocker start demo',
    par: 3,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-health'],
    check: (s) => {
      const demo = s.containers.find((c) => c.name === 'demo');
      return Boolean(demo && demo.status === 'running' && demo.image === 'alpine:3.20');
    },
  },
];

export const BUILD_LEVELS: LevelDefinition[] = [
  {
    id: 'build-layers',
    name: 'Build is a layer stack',
    series: 'Build',
    difficulty: 3,
    brief: 'Build the provided Dockerfile as demo-app:1.0 and inspect the layer stack.',
    teaching: `docker build is not "compile into one blob." It is applying instructions to produce layered diffs.

Typical instruction to layer mapping:
- FROM — base rootfs (or previous stage)
- RUN — filesystem diff of that command
- COPY/ADD — file diff from the build context
- ENV/WORKDIR/EXPOSE/CMD — metadata (cheap layers / config)

Why layers matter:
1. CACHE — if instruction + inputs unchanged, the layer is reused.
2. DISTRIBUTION — pulls fetch only missing layers (shared between images).
3. HISTORY — docker history shows size attribution (and secrets risk if you baked keys into RUN).

Your context already has Dockerfile + app.js. Build tags the result. Inspect it and count layers. Size is the sum of final image layers — not the host source tree.

Production rule: each RUN is a commit. Combine apt-get update && install && rm -rf /var/lib/apt/lists in one layer when the package manager leaves caches behind.`,
    steps: steps(
      ['docker build -t demo-app:1.0 .', 'Execute Dockerfile; export final stage layers.'],
      ['docker inspect demo-app:1.0', 'Confirm layer count, user, size.'],
      ['docker history demo-app:1.0', 'See size attribution per instruction.', true],
    ),
    fieldNotes: [
      'The . is the build context sent to the daemon (or BuildKit). Keep it small: .dockerignore.',
      '-t name:tag is a pointer; digests are immutable.',
    ],
    learning: [
      'Dockerfile to layered image',
      'Layer size attribution with history',
      'Why build context and metadata matter',
    ],
    hint: 'docker build -t demo-app:1.0 .\ndocker inspect demo-app:1.0\ndocker history demo-app:1.0',
    par: 3,
    quiz: ['q-multistage', 'q-layer-cache'],
    check: (s) => {
      const img = s.images.find((i) => i.repo === 'demo-app' && i.tag === '1.0');
      return Boolean(img && img.layers.length >= 3);
    },
  },
  {
    id: 'build-cache-order',
    name: 'Cache-friendly Dockerfile order',
    series: 'Build',
    difficulty: 4,
    brief: 'Understand cache invalidation: rebuild after a source-only change and keep dependency install cached.',
    teaching: `Build cache is sequential and breaks at the first change.

Wrong order (common mistake):
  COPY . .
  RUN npm ci
Any source edit invalidates COPY . . and therefore npm ci.

Right order:
  COPY package*.json ./
  RUN npm ci
  COPY . .
Now app edits reuse the dependency layer.

Other cache rules:
- Changing an ARG/ENV used later invalidates from that point.
- --no-cache forces full rebuild (when you suspect a poisoned cache).
- BuildKit can cache mount (RUN --mount=type=cache) for apt/npm caches.

In this level, mentally rebuild after editing only app.js — dependency layer must show CACHED in build output (our simulator models this when later stages/lines are unchanged).

You do not need a special command to "turn cache on." You need an order that keeps expensive stable steps early.`,
    steps: steps(
      ['docker build -t demo-app:1.0 .', 'First build: full work.'],
      ['docker build -t demo-app:1.0 .', 'Rebuild: observe which lines cache (teaching: last writes win).'],
    ),
    fieldNotes: [
      'If CI always --no-cache, you are paying full cost for every commit.',
      'Mount caches (BuildKit) are faster than layer cache for package managers.',
    ],
    learning: [
      'Sequential layer cache invalidation',
      'Dependency layer isolation pattern',
      'When to use --no-cache',
    ],
    hint: 'docker build -t demo-app:1.0 .\ndocker build --no-cache -t demo-app:1.0 .',
    par: 2,
    start: {
      files: {
        Dockerfile: [
          'FROM node:20-alpine',
          'WORKDIR /app',
          'COPY package*.json ./',
          'RUN npm ci',
          'COPY . .',
          'CMD ["node", "app.js"]',
        ].join('\n'),
        'package.json': '{"name":"demo","dependencies":{"left-pad":"1.0.0"}}',
        'app.js': 'console.log("app");',
      },
    },
    check: (s) => Boolean(s.images.find((i) => i.repo === 'demo-app')),
  },
  {
    id: 'build-multistage',
    name: 'Multi-stage: ship runtime only',
    series: 'Build',
    difficulty: 5,
    brief: 'Build a multi-stage Dockerfile as app:1.0. Final image must not contain the builder toolchain size.',
    teaching: `Classic pain: you need node/npm or gcc to build, but shipping node_modules toolchains + compilers in production is huge and vulnerable.

Multi-stage build:
  FROM node:20-alpine AS builder
  ... npm ci && npm run build ...
  FROM alpine:3.20 AS runtime
  COPY --from=builder /src/dist ./dist
  USER app
  CMD ["node", "dist/server.js"]

Mechanics:
1. Each FROM opens a stage (nameable with AS).
2. COPY --from=stage pulls files across stages.
3. Only the FINAL stage becomes the tagged image by default.
4. --target stage lets you export an intermediate (e.g. for testing).

Why this is a 10/10 concept in real jobs:
- Runtime image drops compilers, npm cache, source maps you do not need
- Smaller pull/deploy
- Smaller CVE surface (docker scan gets quieter)
- Clearer security boundary (final USER)

Our simulator records finalStage and reports builder discarded size. Use build (default runtime stage) and inspect the image size vs a fat node:20 build.`,
    steps: steps(
      ['docker build -t app:1.0 .', 'Build multi-stage; runtime stage is the image.'],
      ['docker inspect app:1.0', 'Confirm size is runtime-sized, user is app if set.'],
      ['docker history app:1.0', 'See runtime stage instructions only in the exported layers.'],
    ),
    fieldNotes: [
      'Common runtime bases: alpine, distroless, scratch + static binary.',
      'Do not COPY the entire builder filesystem — only artifacts.',
    ],
    learning: [
      'Multi-stage mechanics (FROM AS, COPY --from)',
      'Size and attack-surface reduction',
      'USER, HEALTHCHECK, CMD in the runtime stage',
    ],
    hint: 'docker build -t app:1.0 .\ndocker inspect app:1.0\ndocker history app:1.0',
    par: 3,
    start: {
      files: {
        Dockerfile: [
          'FROM node:20-alpine AS builder',
          'WORKDIR /src',
          'COPY package*.json ./',
          'RUN npm ci --omit=dev',
          'COPY . .',
          'RUN npm run build',
          '',
          'FROM alpine:3.20 AS runtime',
          'RUN adduser -D app',
          'WORKDIR /app',
          'COPY --from=builder /src/dist ./dist',
          'USER app',
          'EXPOSE 3000',
          'CMD ["node", "dist/server.js"]',
        ].join('\n'),
        'package.json': '{"name":"app","scripts":{"build":"echo build"}}',
        'server.js': 'console.log("server");',
      },
    },
    quiz: ['q-multistage', 'q-layer-cache', 'q-nonroot'],
    check: (s) => {
      const img = s.images.find((i) => i.repo === 'app' && i.tag === '1.0');
      return Boolean(img && (img.finalStage === 'runtime' || img.layers.length >= 1) && img.sizeKb < 200_000);
    },
  },
];

export const COMPOSE_LEVELS: LevelDefinition[] = [
  {
    id: 'compose-up',
    name: 'Compose: one file, many services',
    series: 'Compose',
    difficulty: 4,
    brief: 'Use docker compose up -d to start web + db + cache as a project, then docker compose ps.',
    teaching: `Real apps are not one container. You have a web tier, a database, maybe a cache. docker run becomes a graveyard of flags.

Compose declares the system:
  services:
    web: { image: nginx:1.25, ports: ["8080:80"], depends_on: [db], networks: [app-net] }
    db:  { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data], networks: [app-net] }
    cache: { image: redis:7, networks: [app-net] }
  networks: { app-net: {} }
  volumes: { pgdata: {} }

What up -d does for you:
- creates the project network and named volumes
- pulls missing images
- starts services (detached)
- labels containers (com.docker.compose.project/service)
- names them project-service-1

depends_on is START ORDER, not readiness. db may still be initializing when web starts. In production add healthcheck + condition: service_healthy, or retry in the app.

Default DNS: on the project network, hostname db resolves to the db container. Inside web, localhost is web — not db.`,
    steps: steps(
      ['docker compose config', 'Validate the resolved compose model (services, nets, volumes).'],
      ['docker compose up -d', 'Create network + volume, start cache then db then web.'],
      ['docker compose ps', 'List project containers and status.'],
    ),
    fieldNotes: [
      'Service name is the DNS name. Use it in connection strings: postgres://db:5432.',
      'Ports are host:container on the web service only — db stays private to app-net.',
    ],
    learning: [
      'Compose as multi-service declaration',
      'Project naming, networks, volumes',
      'depends_on ordering vs health readiness',
    ],
    hint: 'docker compose config\ndocker compose up -d\ndocker compose ps',
    par: 3,
    start: {
      files: {
        'docker-compose.yml': [
          'services:',
          '  web:',
          '    image: nginx:1.25',
          '    ports: ["8080:80"]',
          '    networks: [app-net]',
          '    depends_on: [db]',
          '  db:',
          '    image: postgres:16',
          '    volumes: [pgdata:/var/lib/postgresql/data]',
          '    networks: [app-net]',
          '    environment: { POSTGRES_PASSWORD: demo }',
          '  cache:',
          '    image: redis:7',
          '    networks: [app-net]',
          'networks: { app-net: {} }',
          'volumes: { pgdata: {} }',
        ].join('\n'),
      },
    },
    quiz: ['q-compose-depends', 'q-compose-network-name'],
    check: (s) => {
      const names = s.containers.map((c) => c.name);
      return (
        names.some((n) => n.includes('web')) &&
        names.some((n) => n.includes('db')) &&
        names.some((n) => n.includes('cache')) &&
        s.containers.filter((c) => c.composeService).length >= 3
      );
    },
  },
  {
    id: 'compose-network-dns',
    name: 'DNS by service name',
    series: 'Compose',
    difficulty: 4,
    brief: 'After compose up, exec into web and show it can resolve db (not localhost).',
    teaching: `Compose attaches every service listed on a network to that network and registers DNS names.

From web:
- curl http://db:5432 -> talks to the db container
- curl http://localhost:8080 -> talks to web itself (published port loopback)
- ping db -> resolves to the container IP on the project net

Why this beats --link (legacy): user-defined bridge networks give embedded DNS without brittle static links. You can add a new service and it just becomes resolvable.

Failure mode to know: if web and db are on different networks, DNS does not magically cross. You must join a shared network or attach both.

Also: host.docker.internal is the host from inside a container (Linux needs extras). Service DNS is container-to-container.`,
    steps: steps(
      ['docker compose up -d', 'Project up so DNS names exist.'],
      ['docker exec web wget -qO- http://db', 'Resolve + connect by service name (simulated probe).'],
    ),
    fieldNotes: [
      'Never put DB passwords in the image; use env/compose secrets.',
      'Connecting to 127.0.0.1 inside web will never reach db.',
    ],
    learning: [
      'Embedded DNS on user-defined networks',
      'Service name as hostname',
      'Why localhost is the wrong mental model in containers',
    ],
    hint: 'docker compose up -d\ndocker exec web wget -qO- http://db\ndocker exec web wget -qO- http://cache',
    par: 3,
    start: {
      files: {
        'docker-compose.yml': [
          'services:',
          '  web: { image: nginx:1.25, ports: ["8080:80"], networks: [app-net], depends_on: [db] }',
          '  db: { image: postgres:16, networks: [app-net] }',
          '  cache: { image: redis:7, networks: [app-net] }',
          'networks: { app-net: {} }',
        ].join('\n'),
      },
    },
    check: (s) =>
      s.containers.some((c) => c.name.includes('web') && c.networks.includes('app-net')) &&
      s.containers.filter((c) => c.networks.includes('app-net')).length >= 3,
  },
  {
    id: 'compose-down-volumes',
    name: 'down vs down -v',
    series: 'Compose',
    difficulty: 3,
    brief: 'Bring the project up, then down WITHOUT deleting pgdata, then confirm the volume remains.',
    teaching: `Lifecycle of a compose project:

up -> containers + network + volumes created
down -> containers + project network removed

Named volumes are NOT removed by down unless you pass -v (--volumes).

That is intentional: databases should survive "I restarted the stack." It is also a footgun if you wanted a clean slate.

Mental model:
- down = dispose processes and wiring
- down -v = dispose processes, wiring, AND data volumes

For ephemeral test stacks, down -v is fine. For shared/staging DBs, never default to -v.

Also: compose rm removes stopped service containers; up recreates changed ones.`,
    steps: steps(
      ['docker compose up -d', 'Create stack including pgdata volume.'],
      ['docker compose down', 'Stop and remove containers + project net. Volumes stay.'],
      ['docker volume ls', 'pgdata must still be listed.'],
    ),
    fieldNotes: [
      'Bind mounts (./data:/data) are never deleted by down -v — they are host files.',
      'Check docker volume ls before assuming data is gone.',
    ],
    learning: [
      'Project teardown semantics',
      'Named volume persistence across down',
      'When -v is correct vs dangerous',
    ],
    hint: 'docker compose up -d\ndocker compose down\ndocker volume ls',
    par: 3,
    start: {
      files: {
        'docker-compose.yml': [
          'services:',
          '  web: { image: nginx:1.25, networks: [app-net] }',
          '  db: { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data], networks: [app-net] }',
          'networks: { app-net: {} }',
          'volumes: { pgdata: {} }',
        ].join('\n'),
      },
    },
    check: (s) => Boolean(s.volumes.find((v) => v.name === 'pgdata')) && !s.containers.find((c) => c.composeService),
  },
];

export const DATA_LEVELS: LevelDefinition[] = [
  {
    id: 'volumes-persist',
    name: 'Volumes outlive containers',
    series: 'Data',
    difficulty: 3,
    brief: 'Write a file through a named volume, rm the container, re-attach — data must remain.',
    teaching: `Storage layers in Docker, from inner to outer:

1. WRITABLE LAYER (container-local, dies with rm)
2. NAMED VOLUME (daemon-managed, survives rm)
3. BIND MOUNT (host path; survives everything but is environment-specific)
4. TMPFS (RAM only)

Pattern: write -> rm writer -> run reader with the same mount -> file is there.

Why named volumes beat writing in the container:
- DBs and uploads cannot be ephemeral
- Backup/migrate volumes as objects
- Same volume can be shared between old and new container versions during deploy

Verify with docker inspect: Mounts section shows Name/Source/Destination. In the schematic, the purple cylinder remains after the writer box disappears — that is persistence you can see.

Also learn copy-up: first write to a mounted empty volume creates the file in the volume, not in the image.`,
    steps: steps(
      ['docker volume create data-vol', 'Explicit managed volume (run would auto-create a named volume too).'],
      [
        'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
        'Write through the mount to volume data, not just writable layer.',
      ],
      ['docker rm -f writer', 'Destroy container object. Volume object remains.'],
      ['docker run -d --name reader -v data-vol:/data alpine:3.20', 'New instance, same volume name.'],
    ),
    fieldNotes: [
      'postgres image declares VOLUME /var/lib/postgresql/data — without a mount you still lose data on rm.',
      'Bind mount example: -v $PWD/src:/app/src (dev hot reload).',
    ],
    learning: [
      'Writable layer vs named volume vs bind mount',
      'Mount path semantics and inspect verification',
      'Why persistence is a separate object lifecycle',
    ],
    hint:
      'docker volume create data-vol\ndocker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"\ndocker rm -f writer\ndocker run -d --name reader -v data-vol:/data alpine:3.20',
    par: 5,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-writable-layer'],
    check: (s) => {
      const vol = s.volumes.find((v) => v.name === 'data-vol');
      const reader = s.containers.find((c) => c.name === 'reader');
      return Boolean(
        vol &&
          vol.data['note.txt'] === 'persisted' &&
          reader &&
          reader.status === 'running' &&
          reader.volumeMounts.some((m) => m.volume === 'data-vol') &&
          !s.containers.find((c) => c.name === 'writer'),
      );
    },
  },
];

export const NETWORK_LEVELS: LevelDefinition[] = [
  {
    id: 'networks',
    name: 'User-defined bridge + DNS',
    series: 'Networks',
    difficulty: 3,
    brief: 'Create app-net and run db and app on it with --network.',
    teaching: `Default bridge is legacy: no automatic DNS by container name. Do not design systems on it.

User-defined bridge (docker network create app-net):
- embedded DNS: container name / network alias resolves
- explicit isolation boundary
- connect/disconnect at runtime
- cleaner compose integration

Topology:
  [app] ---- app-net ---- [db]
Both join app-net. From app, db is a hostname. They are not exposed to the host unless you publish ports.

Host network (--network host) shares the host network namespace (fast, no isolation, port conflicts). none = no networking. overlay = multi-host (Swarm/K8s) — out of scope here but know it exists.

Port publish is orthogonal: it wires host to container. Intra-cluster traffic uses container ports without publish.`,
    steps: steps(
      ['docker network create app-net', 'Create isolated bridge with DNS.'],
      ['docker run -d --name db --network app-net alpine:3.20', 'db joins; hostname db.'],
      ['docker run -d --name app --network app-net alpine:3.20', 'app joins; can resolve db.'],
    ),
    fieldNotes: [
      'docker network inspect app-net shows attached containers.',
      'A container can join multiple networks (separate NICs).',
    ],
    learning: [
      'User-defined bridge vs default bridge',
      'DNS and isolation boundaries',
      'When host/none/overlay are appropriate',
    ],
    hint: 'docker network create app-net\ndocker run -d --name db --network app-net alpine:3.20\ndocker run -d --name app --network app-net alpine:3.20',
    par: 3,
    start: { prePulled: ['alpine:3.20'] },
    check: (s) => {
      const net = s.networks.find((n) => n.name === 'app-net');
      const app = s.containers.find((c) => c.name === 'app');
      const db = s.containers.find((c) => c.name === 'db');
      return Boolean(net && app && db && app.networks.includes('app-net') && db.networks.includes('app-net'));
    },
  },
  {
    id: 'ports',
    name: 'Publish vs expose',
    series: 'Networks',
    difficulty: 3,
    brief: 'Run nginx with -p 8080:80. Confirm the host binding.',
    teaching: `Inside the container netns, nginx listens on 80. That port is PRIVATE.

-p 8080:80 (publish) creates a proxy/NAT path: host:8080 to container:80.

EXPOSE 80 in a Dockerfile only documents intent. Compose ports: publishes. Kubernetes Service is a related idea.

Rules of thumb:
- Format is HOST:CONTAINER (easy to reverse by mistake).
- Host port conflicts fail with: port is already allocated.
- Bind to 127.0.0.1:8080:80 if the app should not be LAN-visible.
- Prefer publishing on a reverse proxy and leaving app ports internal when using compose.

Inspect shows Ports: 8080->80/tcp. That string is the truth, not the Dockerfile.`,
    steps: steps(
      ['docker pull nginx:1.25', 'Image with CMD nginx and EXPOSE 80.'],
      ['docker run -d --name web -p 8080:80 nginx:1.25', 'Publish host 8080 to container 80.'],
      ['docker inspect web', 'Verify 8080->80/tcp binding.', true],
    ),
    fieldNotes: [
      'EXPOSE does not make a port reachable from your laptop.',
      '-p 80:80 needs privilege on some systems for host ports under 1024.',
    ],
    learning: [
      'Container-private ports vs published ports',
      'HOST:CONTAINER mapping and conflicts',
      'EXPOSE as documentation only',
    ],
    hint: 'docker pull nginx:1.25\ndocker run -d --name web -p 8080:80 nginx:1.25\ndocker inspect web',
    par: 3,
    quiz: ['q-expose-publish', 'q-fail-port'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && web.ports.some((p) => p.hostPort === 8080 && p.containerPort === 80));
    },
  },
];

export const OPS_LEVELS: LevelDefinition[] = [
  {
    id: 'ops-logs-exec',
    name: 'Observe and intervene',
    series: 'Ops',
    difficulty: 3,
    brief: 'Run a container, read logs, exec a command inside it.',
    teaching: `Two everyday debug verbs:

docker logs — stdout/stderr of PID 1. If the app logs to a file, logs can look empty: either log to stdout (12-factor) or exec + tail.

docker exec — start a new process in an existing container namespaces (debug shell, env print). exec is not PID 1; when it exits, the container continues.

Patterns:
- docker exec -it web sh   (interactive; our sim is non-interactive)
- docker exec web printenv (config check)
- docker logs --tail 50 web
- docker logs -f web (stream)

If logs are silent and the port does not answer: process may be listening on the wrong interface (must be 0.0.0.0 in-container) or crashing before bind.

Production: prefer structured logs to stdout + a log driver (json-file, local, syslog). Do not bake secrets into log lines.`,
    steps: steps(
      ['docker run -d --name web -p 8080:80 nginx:1.25', 'Long-running service.'],
      ['docker logs web', 'Read PID 1 stdout/stderr.'],
      ['docker exec web whoami', 'Run a probe in the container namespaces.'],
    ),
    fieldNotes: [
      'exec requires a running container.',
      'Interactive -it is omitted here; in real Docker you want it for shells.',
    ],
    learning: [
      'logs as the primary blackbox signal',
      'exec vs PID 1',
      'Common silent-failure modes',
    ],
    hint: 'docker run -d --name web -p 8080:80 nginx:1.25\ndocker logs web\ndocker exec web whoami\ndocker exec web printenv',
    par: 4,
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && web.execHistory.length >= 1);
    },
  },
  {
    id: 'ops-health-restart',
    name: 'Healthchecks and restart policy',
    series: 'Ops',
    difficulty: 4,
    brief: 'Run a container with a healthcheck and a restart policy; inspect health state.',
    teaching: `Up means the process exists. It does not mean the app serves.

HEALTHCHECK runs a probe inside the container. Docker records starting then healthy or unhealthy. Orchestrators (compose, Swarm, K8s) can gate traffic or restart on this.

  HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:80/ || exit 1

Restart policy is the recovery policy for the container process:
- no — default
- on-failure — restart only on non-zero exit (optional max retries)
- always — restart always (daemon reboot with Docker live-restore keeps them)
- unless-stopped — like always but respects manual stop

Combine: healthcheck detects wedge; restart policy recovers crash loops. They solve different failure classes (liveness vs availability).

In compose:
  healthcheck: ...
  restart: unless-stopped
  depends_on:
    db:
      condition: service_healthy

Inspect shows Health and Restart — that is what an SRE reads first.`,
    steps: steps(
      [
        'docker run -d --name web --restart unless-stopped --healthcheck "wget -qO- http://127.0.0.1/" nginx:1.25',
        'Declare liveness probe + restart policy at create time.',
      ],
      ['docker inspect web', 'Confirm health and restart fields.'],
    ),
    fieldNotes: [
      'Healthcheck must match the real readiness signal (HTTP /health, pg_isready, redis-cli ping).',
      'restart: always on a job container will resurrect finished work — wrong tool.',
    ],
    learning: [
      'Liveness/readiness vs process existence',
      'Restart policy semantics',
      'Wiring health into depends_on / ops runbooks',
    ],
    hint:
      'docker run -d --name web --restart unless-stopped --healthcheck "wget -qO- http://127.0.0.1/" -p 8080:80 nginx:1.25\ndocker inspect web',
    par: 3,
    quiz: ['q-health'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && web.restart && web.restart !== 'no' && web.healthcheck);
    },
  },
  {
    id: 'ops-prune',
    name: 'Garbage collection with eyes open',
    series: 'Ops',
    difficulty: 3,
    brief: 'Create leftover stopped containers/images, inspect system df, then prune.',
    teaching: `Disk fills with:
- stopped containers (writable layers)
- dangling images (untagged intermediate/build leftovers)
- unused volumes (often the forgotten ones — data)
- unused networks

Workflow:
1. docker system df — inventory
2. Decide: what is unused vs what is "stopped but precious"
3. docker system prune (containers/images/networks)
4. docker system prune --volumes ONLY if data is disposable
5. docker image prune -a (all unused images, not just dangling)

Prune is irreversible. There is no trash can.

Team norm: prune on CI runners often; on shared hosts, narrow commands (docker container prune) beat shotgun prune -a.

In this lab you clean leftovers while proving you know volumes are separate.`,
    steps: steps(
      ['docker run -d --name tmp alpine:3.20', 'Create something disposable.'],
      ['docker stop tmp', 'Stopped containers become prune candidates.'],
      ['docker system df', 'Show inventory before deletion.'],
      ['docker system prune', 'Reclaim unused objects (volumes stay unless flagged).'],
    ),
    fieldNotes: [
      'Never run prune -a --volumes casually on a shared staging box.',
      'df is the map; prune is the knife.',
    ],
    learning: [
      'Resource leakage categories',
      'df inventory before delete',
      'Safe prune granularity',
    ],
    hint: 'docker run -d --name tmp alpine:3.20\ndocker stop tmp\ndocker system df\ndocker system prune',
    par: 4,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-prune'],
    check: (s) => Boolean(s.pruned || !s.containers.find((c) => c.name === 'tmp')),
  },
  {
    id: 'cleanup-order',
    name: 'Cleanup dependency order',
    series: 'Ops',
    difficulty: 2,
    brief: 'Remove running containers then the image — learn why rmi fails first.',
    teaching: `Deletion is a dependency graph, not a single button.

Order that works:
1. stop (or force-remove) containers using the image
2. rm containers
3. rmi images
4. rm unused volumes/networks if desired

Why rmi refuses while a container exists: that container rootfs is the image layers + writable layer. Deleting layers out from under a running (or stopped-but-defined) container is incoherent.

You saw this as a "bug" maybe. It is a safety invariant.

Force paths exist (docker rm -f, docker rmi -f) and are usually a sign you skipped the graph.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Have an image to clean later.'],
      ['docker run -d --name tmp1 alpine:3.20', 'Reference the image.'],
      ['docker run -d --name tmp2 alpine:3.20', 'Second reference.'],
      ['docker stop tmp1 tmp2', 'Required before non-force rm.'],
      ['docker rm tmp1 tmp2', 'Drop container objects.'],
      ['docker rmi alpine:3.20', 'Now the image has no refs.'],
    ),
    fieldNotes: [
      'docker ps -a is how you find stopped holders of image refs.',
      'Same dependency idea applies to volumes (in use then rm fails).',
    ],
    learning: [
      'Deletion dependency graph',
      'Safety invariants on rmi/rm volume',
      'Operational order for clean hosts',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name tmp1 alpine:3.20\ndocker run -d --name tmp2 alpine:3.20\ndocker stop tmp1 tmp2\ndocker rm tmp1 tmp2\ndocker rmi alpine:3.20',
    par: 6,
    check: (s) => {
      const alpineContainers = s.containers.filter((c) => c.image === 'alpine:3.20');
      const alpineImage = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      return alpineContainers.length === 0 && !alpineImage && s.nextContainerSeq >= 3;
    },
  },
];

export const SECURITY_LEVELS: LevelDefinition[] = [
  {
    id: 'security-nonroot',
    name: 'Run as non-root',
    series: 'Security',
    difficulty: 4,
    brief: 'Run a container with --user app and verify whoami is not root.',
    teaching: `Default image user is often root. Root inside the container is still root-ish for many attacks if there is a container escape or a privileged mount.

Defense in depth:
1. USER app in the Dockerfile (persistent)
2. --user 1000:1000 at run (override without rebuild)
3. Drop capabilities (real Docker: --cap-drop=ALL)
4. Read-only rootfs + tmpfs for /tmp
5. No --privileged (almost never justified)
6. Rootless Docker daemon (stronger, operationally picky)

Also: do not mount docker.sock into app containers (that is root on the host). Use a narrower socket/API if needed.

Scan images (docker scan / trivy / grype) and use slim bases (alpine/distroless). Non-root does not fix CVEs — it limits blast radius.

Inspect User + exec whoami to prove the identity.`,
    steps: steps(
      ['docker run -d --name web --user app nginx:1.25', 'Force a non-root identity at runtime.'],
      ['docker exec web whoami', 'Must print app (or non-root), not root.'],
      ['docker inspect web', 'User field must not be root.', true],
    ),
    fieldNotes: [
      'Some images need root to bind 80 — use ports above 1024 or setcap carefully.',
      'Prefer distroless + USER from the start of the Dockerfile runtime stage.',
    ],
    learning: [
      'Container root vs host risk',
      'USER / --user / capabilities',
      'sock mounts and other foot-guns',
    ],
    hint: 'docker run -d --name web --user app nginx:1.25\ndocker exec web whoami\ndocker inspect web',
    par: 3,
    quiz: ['q-nonroot'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && web.user && web.user !== 'root' && web.execHistory.length >= 1);
    },
  },
  {
    id: 'security-scan',
    name: 'Read a vulnerability report',
    series: 'Security',
    difficulty: 3,
    brief: 'Scan fat node:20 and slim alpine:3.20. Compare vuln counts and pick the runtime base.',
    teaching: `Image risk is mostly BASE IMAGE + PACKAGES YOU INSTALLED.

Full-fat node:20 (Debian-based) ships more packages than node:20-alpine or distroless. More packages means more CVEs and larger patches.

Workflow that scales:
1. Scan in CI (fail on critical)
2. Prefer minimal bases
3. Rebuild often (base updates)
4. Multi-stage so build tools never ship
5. Pin digests in prod if you need strict reproducibility

Critical/high findings in a runtime image are a release blocker in most orgs. Medium is triage.

Our docker scan image prints simulated severity counts that match the registry catalog. Learn the habit: scan before run, not after the incident.`,
    steps: steps(
      ['docker pull node:20', 'Fat base for comparison.'],
      ['docker pull alpine:3.20', 'Slim base.'],
      ['docker scan node:20', 'Note critical/high.'],
      ['docker scan alpine:3.20', 'Note the difference. Choose alpine for this lab.'],
    ),
    fieldNotes: [
      'Alpine uses musl; some native modules need extra care — tradeoffs exist.',
      'Distroless is even smaller but harder to debug with a shell.',
    ],
    learning: [
      'CVE surface as a function of base size',
      'Scan-first workflow',
      'Runtime base selection criteria',
    ],
    hint: 'docker pull node:20\ndocker pull alpine:3.20\ndocker scan node:20\ndocker scan alpine:3.20',
    par: 4,
    check: (s) => Boolean(s.images.find((i) => i.repo === 'alpine')),
  },
];

export const HOOD_LEVELS: LevelDefinition[] = [
  {
    id: 'hood-layers-write',
    name: 'Copy-up on write (mental model lab)',
    series: 'Under the hood',
    difficulty: 4,
    brief: 'Observe that writes land in the writable layer while the image layers stay shared.',
    teaching: `Union filesystems (overlayfs in modern Docker) stack directories:

  [ writable layer ]   <- container-local, copy-up
  [ layer N ]          <- read-only, shared
  [ layer N-1 ]
  ...
  [ base layer ]

First write to a file from a lower layer COPY-UPs it to the writable layer, then modifies the copy. The shared lower layer is unchanged — other containers still see the original.

Delete of a lower file writes a "whiteout" in the upper layer.

Why you care:
- Many containers share image layers, so disk is efficient
- Image immutability is real at the lower layers
- Debugging "my file changed" often means "you wrote in the writable layer"
- --read-only rootfs forces you to be explicit about writable mounts (tmpfs, volumes)

Namespaces are the other half: PID/MNT/NET/UTS/IPC/(user) make each container think it has its own machine. cgroups throttle CPU/memory.

Docker = namespaces + cgroups + union fs + a nice CLI/daemon. Know that sentence.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Shared lower layers.'],
      ['docker run -d --name c1 --read-only -v scratch:/tmp alpine:3.20', 'Constrain writes to an explicit mount.'],
      ['docker run -d --name c2 alpine:3.20', 'Second consumer of the same lower layers.'],
      ['docker inspect c1', 'Read-only flag + mounts show the policy.', true],
    ),
    fieldNotes: [
      '--read-only breaks apps that must write /var/run or cache dirs — add tmpfs.',
      'docker diff (real Docker) lists added/changed files in the writable layer.',
    ],
    learning: [
      'Union FS copy-up and whiteouts',
      'Namespaces + cgroups in one sentence',
      'read-only rootfs as a hardening tool',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name c1 --read-only -v scratch:/tmp alpine:3.20\ndocker run -d --name c2 alpine:3.20\ndocker inspect c1',
    par: 4,
    check: (s) => {
      const c1 = s.containers.find((c) => c.name === 'c1');
      const c2 = s.containers.find((c) => c.name === 'c2');
      return Boolean(c1?.readOnly && c2 && c1.imageId === c2.imageId);
    },
  },
];

export const FAILURE_LEVELS: LevelDefinition[] = [
  {
    id: 'fail-port-in-use',
    name: 'Port already allocated',
    series: 'Failure labs',
    difficulty: 3,
    brief: 'Diagnose a host port conflict and leave exactly one web on 8080.',
    teaching: `Error you will see in real life:

  docker: Error response from daemon: driver failed programming external connectivity
  on endpoint web: Bind for 0.0.0.0:8080 failed: port is already allocated.

Translation: the HOST port 8080 is taken — often by another container publish, or nginx/caddy on the VM.

Diagnosis path:
1. docker ps  -> look at PORTS column
2. docker ps -a if needed
3. Decide: stop the holder, or publish another host port (8081:80)
4. Do NOT delete data volumes to "fix" ports

This lab starts with a conflict and asks you to end with a single healthy publish.

Failure literacy is half of ops. Read the daemon message: it already tells you the port and the reason.`,
    steps: steps(
      ['docker ps', 'Find who holds 8080.'],
      ['docker rm -f old-web', 'Free the host port (name may vary — use ps).'],
      ['docker run -d --name web -p 8080:80 nginx:1.25', 'Publish cleanly.'],
    ),
    fieldNotes: [
      'Stopped containers do not hold host ports; running ones do.',
      '127.0.0.1:8080:80 vs 0.0.0.0:8080:80 changes exposure.',
    ],
    learning: [
      'How to read daemon bind errors',
      'Host port ownership',
      'Surgical fix vs shotgun prune',
    ],
    hint: 'docker ps\ndocker rm -f old-web\ndocker run -d --name web -p 8080:80 nginx:1.25',
    par: 3,
    start: {
      prePulled: ['nginx:1.25', 'alpine:3.20'],
      containers: [
        {
          name: 'old-web',
          image: 'nginx:1.25',
          ports: [{ hostPort: 8080, containerPort: 80, protocol: 'tcp' }],
        },
      ],
    },
    quiz: ['q-fail-port'],
    check: (s) => {
      const holders = s.containers.filter((c) => c.ports.some((p) => p.hostPort === 8080) && c.status === 'running');
      return holders.length === 1 && holders[0]!.name === 'web' && !s.containers.find((c) => c.name === 'old-web');
    },
  },
  {
    id: 'fail-image-in-use',
    name: 'rmi refused: image in use',
    series: 'Failure labs',
    difficulty: 3,
    brief: 'You cannot rmi an image until all referencing containers are gone. Prove you can clean the graph.',
    teaching: `Error:

  conflict: unable to remove repository image "alpine:3.20" (must force) - container abc is using its referenced image

This is not the daemon being annoying. A stopped container still references the image ID. Its writable layer is stacked on those lower layers.

Graph:
image <- container (running or exited)

Fix: find references, remove containers (rm / rm -f), then rmi.

If you rmi -f while containers exist you can get into weird half-states in older setups — prefer the explicit order.

Same story for volumes in use and networks with endpoints.`,
    steps: steps(
      ['docker ps -a', 'Find all references, including exited.'],
      ['docker rm -f web', 'Drop the ref.'],
      ['docker rmi alpine:3.20', 'Now legal.'],
    ),
    fieldNotes: [
      'docker ps -a is non-negotiable in cleanup runbooks.',
      'Image tags can move; IDs are the real ref for rmi conflicts.',
    ],
    learning: [
      'Reference counting in the object graph',
      'Why force flags are last resorts',
      'ps -a discipline',
    ],
    hint: 'docker ps -a\ndocker rm -f web\ndocker rmi alpine:3.20',
    par: 3,
    start: {
      prePulled: ['alpine:3.20'],
      containers: [{ name: 'web', image: 'alpine:3.20' }],
    },
    check: (s) => !s.containers.find((c) => c.name === 'web') && !s.images.find((i) => i.repo === 'alpine'),
  },
];
