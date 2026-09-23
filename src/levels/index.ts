import type { LevelDefinition, LevelStep } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelStep[] {
  return items.map((item) => ({
    command: item[0],
    note: item[1],
    optional: item[2] === true,
  }));
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 'intro-hello',
    name: 'Hello, daemon',
    series: 'Basics',
    brief:
      'Pull the hello-world image from the registry, then run it. The container prints a message and exits on its own.',
    teaching: `Docker separates **images** from **containers**.

An image is an immutable template: a stack of read-only layers plus metadata (default command, env, ports). A container is a runtime instance of that image — a process with its own writable layer on top.

Pulling downloads image layers into the local daemon store. Running creates a container, starts its main process, and streams output. hello-world is designed to print and exit immediately (exit code 0), which is why you see output and then a stopped container.

If you skip pull, the daemon looks only in the local store and fails. In production Docker may auto-pull; here you pull first so the download step is explicit.`,
    steps: steps(
      ['docker pull hello-world', 'Fetch the image layers from the registry into the local store.'],
      ['docker run hello-world', 'Create a container from the image, run its CMD, print output, exit.'],
    ),
    fieldNotes: [
      'Images are templates; containers are running (or stopped) instances.',
      'hello-world’s process ends immediately — that is success, not a crash.',
      'docker ps shows running containers; docker ps -a shows exited ones too.',
    ],
    learning: [
      'Image vs container',
      'Registry pull vs local image store',
      'What docker run does end-to-end',
    ],
    hint: 'docker pull hello-world\ndocker run hello-world',
    par: 2,
    check: (s) =>
      s.containers.some((c) => c.image.startsWith('hello-world') && c.status === 'exited'),
  },
  {
    id: 'image-vs-container',
    name: 'Image vs container',
    series: 'Basics',
    brief:
      'Pull alpine:3.20 once, then run TWO containers from that same image with --name web and --name worker (use -d so they stay up).',
    teaching: `This level kills the #1 Docker confusion.

One image can back many containers. Containers do **not** copy the whole image each time — they share the same read-only layers and only get a thin writable layer.

-d (detach) keeps the container’s process running in the background. Without -d, your prompt is attached to that process (like running a foreground app).

--name gives a stable DNS-friendly handle. Without it Docker invents a whimsical name (friendly_euler, …). Names must be unique.

Success criteria: two running containers, one alpine:3.20 image in the store (not two).`,
    steps: steps(
      ['docker pull alpine:3.20', 'Download the shared base image once.'],
      ['docker run -d --name web alpine:3.20', 'First container instance (detached).'],
      ['docker run -d --name worker alpine:3.20', 'Second instance of the SAME image.'],
    ),
    fieldNotes: [
      'If you ran two pulls of alpine:3.20, the second is a no-op (Image is up to date).',
      'Shared imageId is visible in the schematic — two containers, one template.',
    ],
    learning: [
      'Containers are instances of images',
      'Shared layers vs per-container writable layer',
      'Detached mode (-d) and --name',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name web alpine:3.20\ndocker run -d --name worker alpine:3.20',
    par: 3,
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      const worker = s.containers.find((c) => c.name === 'worker');
      return Boolean(
        web &&
          worker &&
          web.status === 'running' &&
          worker.status === 'running' &&
          web.imageId === worker.imageId &&
          s.images.filter((i) => i.repo === 'alpine' && i.tag === '3.20').length === 1,
      );
    },
  },
  {
    id: 'lifecycle',
    name: 'Lifecycle',
    series: 'Basics',
    brief:
      'Run a container named demo from alpine:3.20 (-d), stop it, then start it again. It must be running at the end.',
    teaching: `A container is a process tree with a filesystem snapshot — not a VM.

States you will see:
- running — main process alive
- exited — main process ended (with an exit code)
- created — allocated but never started (rare in this UI)

docker stop asks the process to terminate gracefully (SIGTERM, then SIGKILL). The writable layer and config stay until docker rm.

docker start reuses the same container ID and writable layer. It is **not** the same as docker run (which creates a new container).

docker ps lists running; docker ps -a lists all, including exited. That is how you find stopped work.

This level teaches stop → start so you see state is preserved across restarts.`,
    steps: steps(
      ['docker run -d --name demo alpine:3.20', 'Create and start a long-running detached container.'],
      ['docker stop demo', 'Gracefully terminate the process; container becomes exited.'],
      ['docker start demo', 'Restart the SAME container (same id, same writable layer).'],
    ),
    fieldNotes: [
      'stop ≠ rm. stop pauses the process; rm deletes the container object.',
      'start ≠ run. start reuses; run creates a new one.',
    ],
    learning: [
      'Container states and exit codes',
      'stop vs rm, start vs run',
      'Reading docker ps and ps -a',
    ],
    hint: 'docker pull alpine:3.20\ndocker run -d --name demo alpine:3.20\ndocker stop demo\ndocker start demo',
    par: 4,
    start: { prePulled: ['alpine:3.20'] },
    check: (s) => {
      const demo = s.containers.find((c) => c.name === 'demo');
      return Boolean(demo && demo.status === 'running' && demo.image === 'alpine:3.20');
    },
  },
  {
    id: 'build-layers',
    name: 'Build layers',
    series: 'Images',
    brief:
      'Build the provided Dockerfile as demo-app:1.0, then inspect the image to see multiple layers.',
    teaching: `docker build turns a Dockerfile + build context into an image.

Each instruction (FROM, RUN, COPY, ENV, EXPOSE, CMD) usually creates a **layer**. Layers are cached and shared: if only the last step changes, upper layers rebuild and lower ones reuse cache.

FROM sets the parent image. COPY/ADD bring files from the build context into the image. RUN executes a command and commits the filesystem diff as a new layer. CMD sets the default process for containers.

Your sandbox already has a build context (Dockerfile + app.js). Build tags the result as demo-app:1.0.

Inspect the image and count layers — that is the mental model of an image as a stack of diffs, not a monolithic tarball.`,
    steps: steps(
      ['docker build -t demo-app:1.0 .', 'Build the image from the current context and tag it.'],
      ['docker inspect demo-app:1.0', 'List layers and size — images are stacks of diffs.'],
    ),
    fieldNotes: [
      'The trailing . is the build context path (here: the simulated project folder).',
      '-t name:tag names the result so you can run it later without digests.',
    ],
    learning: [
      'Dockerfile instructions → image layers',
      'Build context vs image',
      'How to inspect layer stacks',
    ],
    hint: 'docker build -t demo-app:1.0 .\ndocker inspect demo-app:1.0',
    par: 2,
    check: (s) => {
      const img = s.images.find((i) => i.repo === 'demo-app' && i.tag === '1.0');
      return Boolean(img && img.layers.length >= 4);
    },
  },
  {
    id: 'volumes-persist',
    name: 'Volumes persist',
    series: 'Data',
    brief:
      'Write a file into a named volume, remove the container, then run a new one with the same volume — the file must still be there.',
    teaching: `A container’s writable layer dies with the container. Application data must not live there.

**Named volumes** are managed by the daemon and survive docker rm. Mount one at a path inside the container: -v data-vol:/data.

Anything written under /data lands in the volume. After you remove the container and start a new one with the same mount, the files reappear.

Contrast with bind mounts (host paths) — powerful but coupled to your machine’s filesystem. Named volumes are the portable default for databases and shared state.

Watch the purple cylinder in the schematic: it stays after the writer container is gone. That is persistence you can see.`,
    steps: steps(
      ['docker volume create data-vol', 'Create a managed volume (or let run auto-create it).'],
      [
        'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
        'Write through the mount — data goes to the volume, not only the container FS.',
      ],
      ['docker rm -f writer', 'Destroy the container. Volume data must remain.'],
      ['docker run -d --name reader -v data-vol:/data alpine:3.20', 'New container, same volume — file should be visible.'],
      ['docker inspect reader', 'Confirm the mount and persisted file content.', true],
    ),
    fieldNotes: [
      'rm deletes the writable layer; volumes are independent objects.',
      'Postgres’s /var/lib/postgresql/data is the classic case for a named volume.',
    ],
    learning: [
      'Why container filesystems are ephemeral',
      'Named volumes and mount paths',
      'How to verify persistence after rm + run',
    ],
    hint:
      'docker pull alpine:3.20\ndocker volume create data-vol\ndocker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"\ndocker rm -f writer\ndocker run -d --name reader -v data-vol:/data alpine:3.20\ndocker inspect reader',
    par: 6,
    start: { prePulled: ['alpine:3.20'] },
    check: (s) => {
      const vol = s.volumes.find((v) => v.name === 'data-vol');
      const reader = s.containers.find((c) => c.name === 'reader');
      const writerGone = !s.containers.find((c) => c.name === 'writer');
      return Boolean(
        vol &&
          vol.data['note.txt'] === 'persisted' &&
          reader &&
          reader.status === 'running' &&
          reader.volumeMounts.some((m) => m.volume === 'data-vol') &&
          writerGone,
      );
    },
  },
  {
    id: 'networks',
    name: 'Container networks',
    series: 'Networks',
    brief:
      'Create network app-net, then run two containers on it (app and db) so they share a user-defined network.',
    teaching: `Containers on the default bridge can talk, but DNS by container name is not reliable there.

A **user-defined bridge network** (docker network create) gives you:
- automatic DNS: containers resolve each other by name (db, app)
- isolation: only members of that network are in that broadcast domain
- clean attach/detach without rewriting /etc/hosts by hand

--network app-net attaches a container at creation. You can also docker network connect/disconnect later.

In the schematic, teal links show membership. app and db on app-net is the classic service-to-database topology.

Do not use --link (legacy). User-defined networks are the supported model.`,
    steps: steps(
      ['docker network create app-net', 'Create an isolated bridge with embedded DNS.'],
      ['docker run -d --name db --network app-net alpine:3.20', 'Database container joins app-net (reachable as db).'],
      ['docker run -d --name app --network app-net alpine:3.20', 'App container joins the same net (can resolve db).'],
    ),
    fieldNotes: [
      'Hostnames on a user-defined net are the container names.',
      'bridge / host / none are predefined and behave differently — leave them alone here.',
    ],
    learning: [
      'User-defined bridge networks',
      'DNS by container name',
      'Why default bridge is not enough for multi-service apps',
    ],
    hint:
      'docker pull alpine:3.20\ndocker network create app-net\ndocker run -d --name db --network app-net alpine:3.20\ndocker run -d --name app --network app-net alpine:3.20',
    par: 4,
    start: { prePulled: ['alpine:3.20'] },
    check: (s) => {
      const net = s.networks.find((n) => n.name === 'app-net');
      const app = s.containers.find((c) => c.name === 'app');
      const db = s.containers.find((c) => c.name === 'db');
      return Boolean(
        net &&
          app &&
          db &&
          app.networks.includes('app-net') &&
          db.networks.includes('app-net') &&
          net.containers.length >= 2,
      );
    },
  },
  {
    id: 'ports',
    name: 'Publish a port',
    series: 'Networks',
    brief:
      'Run nginx:1.25 as web with -p 8080:80 and -d. Host port 8080 should map to container port 80.',
    teaching: `A container’s port is private to its network namespace. Nobody on the host can hit it until you **publish** it.

-p hostPort:containerPort installs a NAT/proxy rule so traffic to host:8080 is forwarded into the container’s port 80.

Why not just use the container IP? Because container IPs are internal, change across restarts, and are not meant to be public API. Publishing is how you expose a service.

nginx listens on 80 inside the image (EXPOSE 80 documents intent; -p actually wires host access).

Inspect the container and look for 8080->80/tcp — that is the binding you created.`,
    steps: steps(
      ['docker pull nginx:1.25', 'Get the web server image (listens on 80 inside).'],
      ['docker run -d --name web -p 8080:80 nginx:1.25', 'Publish host 8080 → container 80 and run detached.'],
      ['docker inspect web', 'Verify the published port mapping.', true],
    ),
    fieldNotes: [
      'EXPOSE is documentation; -p is the real host wiring.',
      'Format -p 8080:80 means HOST:CONTAINER.',
    ],
    learning: [
      'Container-private ports vs host ports',
      'Port publishing with -p',
      'How to verify bindings with inspect / ps',
    ],
    hint: 'docker pull nginx:1.25\ndocker run -d --name web -p 8080:80 nginx:1.25\ndocker inspect web',
    par: 3,
    check: (s) => {
      const web = s.containers.find((c) => c.name === 'web');
      return Boolean(
        web &&
          web.status === 'running' &&
          web.ports.some((p) => p.hostPort === 8080 && p.containerPort === 80),
      );
    },
  },
  {
    id: 'cleanup',
    name: 'Clean house',
    series: 'Ops',
    brief:
      'Run two throwaway containers, stop and remove them, then remove the alpine:3.20 image. Nothing alpine should remain.',
    teaching: `Disk and name clutter are operational debt.

Order matters when cleaning:
1. stop (or -f on rm) containers that still run
2. rm containers
3. rmi images only after no container references them

You cannot remove an image in use — the daemon refuses so you do not orphan running processes. Force-remove running containers with docker rm -f.

Dangling images (untagged build leftovers) show up in real life with docker images -f dangling=true. Here we end with a clean alpine:3.20 story: pull, use, delete.

Production tip: prune is powerful and irreversible. Know what you are deleting.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Bring the image in so we can clean it up later.'],
      ['docker run -d --name tmp1 alpine:3.20', 'Throwaway container 1.'],
      ['docker run -d --name tmp2 alpine:3.20', 'Throwaway container 2.'],
      ['docker stop tmp1 tmp2', 'Stop both so rm does not need -f.'],
      ['docker rm tmp1 tmp2', 'Delete the containers (writable layers go away).'],
      ['docker rmi alpine:3.20', 'Delete the image now that nothing references it.'],
    ),
    fieldNotes: [
      'rmi fails while a container still uses the image — that is intentional safety.',
      'rm -f = stop + remove in one step when you are sure.',
    ],
    learning: [
      'Dependency order for cleanup',
      'Why rmi fails on in-use images',
      'Sandbox hygiene that maps to production',
    ],
    hint:
      'docker pull alpine:3.20\ndocker run -d --name tmp1 alpine:3.20\ndocker run -d --name tmp2 alpine:3.20\ndocker stop tmp1 tmp2\ndocker rm tmp1 tmp2\ndocker rmi alpine:3.20',
    par: 6,
    check: (s) => {
      const alpineContainers = s.containers.filter((c) => c.image === 'alpine:3.20');
      const alpineImage = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      return alpineContainers.length === 0 && !alpineImage && s.nextContainerSeq >= 3;
    },
  },
];

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsBySeries(): Array<{ series: string; levels: LevelDefinition[] }> {
  const map = new Map<string, LevelDefinition[]>();
  for (const level of LEVELS) {
    const list = map.get(level.series) ?? [];
    list.push(level);
    map.set(level.series, list);
  }
  return Array.from(map.entries()).map(([series, levels]) => ({ series, levels }));
}

export function getNextLevel(id: string): LevelDefinition | undefined {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return LEVELS[0];
  return LEVELS[idx + 1];
}
