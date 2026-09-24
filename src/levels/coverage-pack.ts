import type { LevelDefinition, QuizQuestion } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

function text(...lines: string[]): string {
  return lines.join('\n');
}

export const COVERAGE_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-hairpin',
    pack: 'Networks',
    question: 'A container must reach its own published host port (call external URL that hairpins back). Default bridge often fails because...',
    choices: [
      'Docker blocks all HTTP',
      'NAT hairpin (from container to host-mapped port of itself/peer) is limited on default bridge; user-defined networks handle this better',
      'EXPOSE is missing',
    ],
    correct: 1,
    explain:
      'Use service DNS inside the network instead of going out to the host and back. If you must call via host, use host.docker.internal or a user-defined net.',
  },
  {
    id: 'q-macvlan',
    pack: 'Networks',
    question: 'macvlan network is for...',
    choices: [
      'Encrypting overlay traffic',
      'Giving containers real LAN IPs on the physical network (legacy appliances, DHCP)',
      'CPU isolation',
    ],
    correct: 1,
    explain:
      'Containers appear as hosts on the LAN. Powerful and dangerous (MAC conflicts, no host-to-container without extra config). Bridge/overlay cover 95% of cases.',
  },
  {
    id: 'q-compose-override',
    pack: 'Compose',
    question: 'Best split of compose files for a team?',
    choices: [
      'Everything in one file including laptop bind mounts',
      'compose.yaml as shared truth + compose.override.yaml for laptop-only tweaks + optional compose.prod.yaml',
      'Each dev has a different unique filename forever',
    ],
    correct: 1,
    explain:
      'Override auto-merges. Prod should not depend on a dev override. Use -f to compose specific stacks explicitly in CI.',
  },
  {
    id: 'q-compose-watch',
    pack: 'Compose',
    question: 'compose watch / hot reload is mainly for...',
    choices: [
      'Production rolling updates',
      'Dev inner loop: sync/rebuild on source change without restarting the world',
      'Registry mirroring',
    ],
    correct: 1,
    explain: 'Dev speed. Prod uses image rollouts. Never rely on watch as a deploy mechanism.',
  },
  {
    id: 'q-log-rotate',
    pack: 'Ops',
    question: 'json-file without rotation can...',
    choices: [
      'Encrypt logs',
      'Fill the host disk until Docker or the host dies',
      'Forward logs to ELK automatically',
    ],
    correct: 1,
    explain: 'Set max-size/max-file or use journald/syslog/fluentd/loki drivers. Rotation is not optional on long-lived hosts.',
  },
  {
    id: 'q-desktop-engine',
    pack: 'Ops',
    question: 'Docker Desktop vs engine-only Linux host, one real difference for developers...',
    choices: [
      'Desktop cannot run alpine',
      'Desktop runs a VM/WSL2 engine — file bind mount performance, contexts, and Kubernetes toggle differ from a Linux engine',
      'Engine-only has no docker CLI',
    ],
    correct: 1,
    explain: 'Mounts from Windows/macOS are slower/quirkier. docker context switches engines. Know which daemon you are talking to.',
  },
  {
    id: 'q-context',
    pack: 'Ops',
    question: 'docker context is used to...',
    choices: [
      'Change the Dockerfile base',
      'Point the CLI at different daemons (local, remote, Desktop, buildx builders)',
      'Encrypt volumes',
    ],
    correct: 1,
    explain: 'One CLI, many engines. Prod scripts should set context explicitly so nobody runs prune on the wrong host.',
  },
  {
    id: 'q-swarm-mode',
    pack: 'Ops',
    question: 'Swarm mode adds...',
    choices: [
      'A new file format for Dockerfile',
      'Built-in clustering: services, replicas, rolling updates, overlay networks, secrets on a swarm',
      'Faster local builds always',
    ],
    correct: 1,
    explain: 'Swarm is Docker-native orchestration (lighter than k8s). Same service ideas: replicas, update config, overlay net, secrets/configs.',
  },
  {
    id: 'q-rolling',
    pack: 'Ops',
    question: 'docker service update --update-parallelism 1 --update-delay 10s means...',
    choices: [
      'Delete the stack immediately',
      'Rolling update one task at a time, waiting 10s between — limits blast radius',
      'Scale to one replica forever',
    ],
    correct: 1,
    explain: 'Rollout policy is production safety. Parallelism 1 + healthcheck = safe deploys. Too high parallelism = outage class.',
  },
  {
    id: 'q-bind-perf',
    pack: 'Ops',
    question: 'Node development bind-mount is slow on Docker Desktop. Common fix?',
    choices: [
      'Add EXPOSE',
      'Use named volumes for node_modules, or WSL2/consistent caching, or develop in a container-native workflow',
      'Use :latest',
    ],
    correct: 1,
    explain: 'Host FS translation is the bottleneck. Separate dependency volume, caching mounts, or dev containers improve the inner loop.',
  },
];

export const COVERAGE_LEVELS: LevelDefinition[] = [
  {
    id: 'net-deep-topologies',
    name: 'Network topologies beyond bridge',
    series: 'Networks',
    difficulty: 5,
    brief: 'Compare bridge, user-defined bridge, host, none, overlay, macvlan — and pick for real cases.',
    teaching: text(
      'Decision table you should tattoo:',
      '',
      'Need: single host multi-service DNS -> user-defined bridge',
      'Need: max throughput no isolation -> host (rare; port fights)',
      'Need: no network -> none (batch, offline)',
      'Need: multi-host cluster (swarm/k8s) -> overlay',
      'Need: container as LAN citizen -> macvlan',
      '',
      'Hairpin/NAT: if web calls http://localhost:8080 and that is its own publish, default bridge NAT can fail or loop. Inside the cluster use service DNS (http://web:8080). Host is not the center of the universe.',
      '',
      'macvlan: you get LAN IPs. Host often cannot talk to those containers without a macvlan subinterface — the classic why-can-I-curl-from-laptop-but-not-host trap.',
      '',
      'overlay: encrypted optional, needs swarm/control plane. Multi-host service discovery.',
      '',
      'Success: you can reject host networking for a multi-service app with a one-line reason.',
    ),
    steps: steps(
      ['docker network ls', 'Inventory of types already present (bridge/host/none).'],
      ['docker network create app-net', 'User-defined bridge — default choice for compose-style apps.'],
      ['docker run -d --name a --network app-net alpine:3.20', 'Member with DNS.'],
      ['docker run -d --name b --network host alpine:3.20', 'Contrast: host share, no net isolation.', true],
    ),
    fieldNotes: [
      'Default bridge is legacy: no DNS by name.',
      'Security review will ask why host/privileged — have an answer ready.',
    ],
    learning: [
      'bridge vs host vs none vs overlay vs macvlan',
      'Hairpin and localhost traps',
      'Choosing a network with a one-line rationale',
    ],
    hint: 'docker network create app-net\ndocker run -d --name a --network app-net alpine:3.20\ndocker run -d --name b --network host alpine:3.20',
    par: 3,
    start: { prePulled: ['alpine:3.20'] },
    quiz: ['q-hairpin', 'q-macvlan', 'q-multi-net'],
    check: (s) => {
      const net = s.networks.find((n) => n.name === 'app-net');
      const a = s.containers.find((c) => c.name === 'a' || c.name === 'app');
      return Boolean(net && a && a.networks.includes('app-net'));
    },
  },
  {
    id: 'compose-files-split',
    name: 'compose.yaml vs override vs prod',
    series: 'Compose',
    difficulty: 5,
    brief: 'Split config so laptop tweaks never leak into prod.',
    teaching: text(
      'One compose file is a lie by day three.',
      '',
      'Patterns that survive teams:',
      '  compose.yaml           — services, nets, volumes (truth)',
      '  compose.override.yaml  — auto-merged: bind mounts, debug ports (laptop)',
      '  compose.prod.yaml      — replicas, limits, read_only, secrets',
      '  compose.ci.yaml        — ephemeral test DB',
      '',
      'Rules:',
      '- override is for humans on laptops; CI should pass -f compose.yaml -f compose.prod.yaml',
      '- never put host bind mounts in the shared base if prod is containers-only',
      '- docker compose config is your linter — run it in CI',
      '',
      'Watch (dev): docker compose watch — inner loop only, not deploy.',
    ),
    steps: steps(
      ['docker compose config', 'Resolve merged model — test of file layout.'],
      ['docker compose up -d', 'Run the shared service set.'],
      ['docker compose down', 'Tear down processes; keep volumes.', true],
    ),
    fieldNotes: [
      'docker compose config is underrated — catch YAML rot in CI.',
      'profiles: [tools] keeps migrate jobs out of every up.',
    ],
    learning: [
      'File split pattern (base/override/prod)',
      'Merge semantics awareness',
      'watch as dev-only tooling',
    ],
    hint: 'docker compose config\ndocker compose up -d\ndocker compose ps',
    par: 3,
    start: {
      files: {
        'docker-compose.yml': text(
          'services:',
          '  web: { image: nginx:1.25, ports: ["8080:80"], networks: [app-net] }',
          '  db: { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data], networks: [app-net] }',
          'networks: { app-net: {} }',
          'volumes: { pgdata: {} }',
        ),
      },
    },
    quiz: ['q-compose-override', 'q-compose-watch', 'q-profile'],
    check: (s) => Boolean(s.containers.find((c) => c.composeService)) || Boolean(s.compose),
  },
  {
    id: 'ops-log-drivers',
    name: 'Log drivers and rotation',
    series: 'Ops',
    difficulty: 5,
    brief: 'Adopt stdout + rotation policy — not unbounded files in the writable layer.',
    teaching: text(
      'Three layers of logging problems:',
      '1. App writes /var/log/app.log inside container -> writable layer sprawl',
      '2. json-file driver without max-size -> /var/lib/docker/containers explodes',
      '3. No central store -> incident archaeology',
      '',
      'Healthy default daemon.json:',
      '  log-driver local, log-opts max-size 10m, max-file 3',
      'Or ship out: fluentd/loki/syslog driver, or a collector sidecar.',
      '',
      'App rules: structured logs to stdout, LOG_LEVEL via env, never log secrets.',
      'Production SLO: log volume is a capacity plan, not a surprise.',
    ),
    steps: steps(
      ['docker run -d --name web nginx:1.25', 'Service logs to stdout (healthy).'],
      ['docker logs web', 'Read via CLI — no need to enter the box.'],
      ['docker logs --tail 5 web', 'Bounded reads for support.', true],
    ),
    fieldNotes: [
      'local driver is fine for single hosts; fleets use aggregated drivers.',
      'Rotating too aggressively loses the crime scene — tune with ops.',
    ],
    learning: [
      'stdout vs file logs in containers',
      'Driver rotation (max-size/max-file)',
      'Central logging as the real retention story',
    ],
    hint: 'docker run -d --name web nginx:1.25\ndocker logs web\ndocker logs --tail 5 web',
    par: 3,
    start: { prePulled: ['nginx:1.25'] },
    quiz: ['q-log-rotate', 'q-desktop-engine', 'q-log-rotate'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && !Object.keys(web.volumeData).some((p) => p.includes('/var/log')));
    },
  },
  {
    id: 'ops-context-desktop',
    name: 'Desktop, Engine, and docker context',
    series: 'Ops',
    difficulty: 4,
    brief: 'Know which daemon you are on. Use context switching safely.',
    teaching: text(
      'docker CLI is not the Docker daemon. The CLI is a remote client.',
      '',
      'Environments:',
      '- Docker Desktop (mac/Windows/WSL2): VM-backed engine, K8s toggle, slower bind mounts from host FS',
      '- Linux engine (server/CI): bare metal, systemd, /var/lib/docker',
      '- remote engine: docker -H ssh://... or contexts',
      '',
      '  docker context ls',
      '  docker context use desktop-linux',
      '  docker context create remote --docker host=ssh://deploy@10.0.0.5',
      '',
      'Why production safety: scripts can prune the wrong cluster; bind mount paths differ; feature flags differ.',
      'If you have ever deployed to the wrong host, you already understand contexts.',
    ),
    steps: steps(
      ['docker version', 'Client vs Server — are they the same world?'],
      ['docker context ls', 'Inventory of engines you can talk to.'],
      ['docker ps', 'Always confirm the daemon you intend.', true],
    ),
    fieldNotes: [
      'CI should pin --context or DOCKER_HOST explicitly.',
      'Desktop file sharing settings explain why is this mount slow/missing.',
    ],
    learning: [
      'CLI vs daemon',
      'Desktop vs Linux engine differences',
      'Context switching and blast radius',
    ],
    hint: 'docker version\ndocker context ls\ndocker ps',
    par: 3,
    quiz: ['q-desktop-engine', 'q-context', 'q-bind-perf'],
    check: () => true,
  },
  {
    id: 'ops-swarm-intro',
    name: 'Swarm services and rolling updates',
    series: 'Ops',
    difficulty: 5,
    brief: 'Learn Docker-native orchestration: service, replica, update policy.',
    teaching: text(
      'If you only know compose on one host, Swarm is the next Docker concept.',
      '',
      '  docker swarm init',
      '  docker service create --name web --replicas 3 -p 8080:80 nginx:1.25',
      '  docker service update --image repo/app:1.1 --update-parallelism 1 --update-delay 10s web',
      '',
      'Mapping: compose service -> docker service; compose up -> create/update; env file -> secret/config; restart: -> restart-condition.',
      'Rolling update: parallelism, delay, order (start-first vs stop-first), failure-action (pause/rollback/continue).',
      'Kubernetes users: this is Deployment rollout in Docker vocabulary.',
      '',
      'Lab posture: state blast radius of a bad image with update-parallelism 1 + healthcheck.',
    ),
    steps: steps(
      ['docker run -d --name web --restart unless-stopped -p 8080:80 nginx:1.25', 'Single task (compose-like).'],
      ['docker update --restart always web', 'Policy adjustment — same idea as service update.', true],
    ),
    fieldNotes: [
      'Rollout without healthcheck is just moving the outage window.',
      'Secrets as files, not ENV — even in swarm.',
    ],
    learning: [
      'Service/replica vs container',
      'Rolling update knobs and blast radius',
      'Secrets/configs vs env',
    ],
    hint: 'docker run -d --name web --restart unless-stopped -p 8080:80 nginx:1.25\ndocker update --restart always web',
    par: 3,
    start: { prePulled: ['nginx:1.25'] },
    quiz: ['q-swarm-mode', 'q-rolling', 'q-health-condition'],
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(web && web.restart && web.restart !== 'no');
    },
  },
];
