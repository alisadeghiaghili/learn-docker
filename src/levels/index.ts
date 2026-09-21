import type { LevelDefinition } from '../engine/types';

export const LEVELS: LevelDefinition[] = [
  {
    id: 'intro-hello',
    name: 'Hello, daemon',
    series: 'Basics',
    brief:
      'Pull the hello-world image from the registry, then run it. The container prints a message and exits on its own.',
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
      'An image is a template. A container is a running instance. Pull alpine:3.20 once, then run TWO containers from that same image with --name web and --name worker (use -d so they stay up).',
    hint: 'docker pull alpine:3.20\ndocker run -d --name web alpine:3.20\ndocker run -d --name worker alpine:3.20',
    par: 3,
    start: {},
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
      'Containers have states. Run a container named demo from alpine:3.20 (-d), stop it, then start it again. It must be running at the end. docker ps -a should show it.',
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
      'docker build creates an image from a Dockerfile. The build context is already in this sandbox. Build it as demo-app:1.0, then inspect the image — you should see multiple layers.',
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
      'Container filesystems die with the container. Named volumes survive. Create volume data-vol, run a container that writes into it, remove the container, then run a new container with the same volume — the file must still be there.\n\nUse: docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"\nThen: docker rm -f writer\ndocker run --name reader -v data-vol:/data alpine:3.20\nThen: docker inspect reader — look for FS /data/note.txt',
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
      'Containers on the same user-defined network can reach each other by name. Create network app-net, run two containers on it (app and db) using --network, both from alpine:3.20 with -d.',
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
      'A container port is private until you publish it to the host. Pull nginx:1.25, run it as web with -p 8080:80 and -d. Inspect should show host port 8080 mapped to container port 80.',
    hint: 'docker pull nginx:1.25\ndocker run -d --name web -p 8080:80 nginx:1.25\ndocker inspect web',
    par: 3,
    start: {},
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
      'Sandbox hygiene matters. Pull alpine:3.20, run two throwaway containers (tmp1, tmp2) with -d, stop both, remove them, then remove the alpine:3.20 image. No alpine containers and no alpine:3.20 image should remain.',
    hint:
      'docker pull alpine:3.20\ndocker run -d --name tmp1 alpine:3.20\ndocker run -d --name tmp2 alpine:3.20\ndocker stop tmp1 tmp2\ndocker rm tmp1 tmp2\ndocker rmi alpine:3.20',
    par: 6,
    start: {},
    check: (s) => {
      const alpineContainers = s.containers.filter((c) => c.image === 'alpine:3.20');
      const alpineImage = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      const everRan = true; // progress is observed via solved state when image is gone after use
      // We require: no alpine:3.20 containers, no alpine:3.20 image, AND volumes/networks not required
      // Additionally they must have actually used alpine at least once — tracked by image removal
      // after containers existed. We approximate: image absent AND no containers with that image.
      // To avoid free-win on empty state, require nextContainerSeq > 2 (they ran things) OR image was never the goal alone.
      return (
        alpineContainers.length === 0 &&
        !alpineImage &&
        s.nextContainerSeq >= 3
      ) && everRan;
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
