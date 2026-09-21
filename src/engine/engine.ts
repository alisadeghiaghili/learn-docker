import type {
  Container,
  DockerState,
  ImageLayer,
  ImageRef,
  Network,
  Volume,
} from './types';
import { findRegistryImage, splitImageName } from './registry';

export function cloneState(state: DockerState): DockerState {
  return structuredClone(state);
}

export function createInitialState(): DockerState {
  return {
    images: [],
    containers: [],
    volumes: [],
    networks: [
      {
        name: 'bridge',
        driver: 'bridge',
        subnet: '172.17.0.0/16',
        containers: [],
        createdAt: isoNow(),
      },
      {
        name: 'host',
        driver: 'host',
        containers: [],
        createdAt: isoNow(),
      },
      {
        name: 'none',
        driver: 'none',
        containers: [],
        createdAt: isoNow(),
      },
    ],
    nextContainerSeq: 1,
    nextImageSeq: 1,
    nextNetworkSeq: 1,
  };
}

export function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function shortId(prefix: string, seq: number): string {
  return `${prefix}${seq.toString(16).padStart(6, '0')}`;
}

export function findImage(state: DockerState, name: string): ImageRef | undefined {
  const { repo, tag } = splitImageName(name);
  return state.images.find((img) => img.repo === repo && img.tag === tag);
}

export function findContainer(
  state: DockerState,
  ref: string,
): Container | undefined {
  return state.containers.find(
    (c) => c.name === ref || c.id === ref || c.id.startsWith(ref),
  );
}

export function findVolume(state: DockerState, name: string): Volume | undefined {
  return state.volumes.find((v) => v.name === name);
}

export function findNetwork(state: DockerState, name: string): Network | undefined {
  return state.networks.find((n) => n.name === name);
}

export function pullImage(state: DockerState, name: string): DockerState {
  const catalog = findRegistryImage(name);
  if (!catalog) {
    throw new EngineError(
      `Error response from daemon: pull access denied for ${name}, repository does not exist or may require 'docker login'`,
    );
  }
  const existing = findImage(state, catalog.name);
  if (existing) {
    return state;
  }
  const next = cloneState(state);
  const { repo, tag } = splitImageName(catalog.name);
  const imageId = shortId('sha256:', next.nextImageSeq);
  next.images.push({
    name: catalog.name,
    repo,
    tag,
    imageId,
    layers: catalog.layers.map((l) => ({ ...l })),
    sizeKb: catalog.sizeKb,
    created: isoNow(),
  });
  next.nextImageSeq += 1;
  return next;
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export function createVolume(state: DockerState, name: string): DockerState {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
    throw new EngineError(`Error: invalid volume name: ${name}`);
  }
  if (findVolume(state, name)) {
    return state;
  }
  const next = cloneState(state);
  next.volumes.push({
    name,
    createdAt: isoNow(),
    data: {},
    labels: {},
  });
  return next;
}

export function createNetwork(
  state: DockerState,
  name: string,
  driver: Network['driver'] = 'bridge',
): DockerState {
  if (findNetwork(state, name)) {
    throw new EngineError(`Error response from daemon: network with name ${name} already exists`);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
    throw new EngineError(`Error: invalid network name: ${name}`);
  }
  const next = cloneState(state);
  next.networks.push({
    name,
    driver,
    subnet: driver === 'bridge' ? `172.${18 + (next.nextNetworkSeq % 200)}.0.0/16` : undefined,
    containers: [],
    createdAt: isoNow(),
    });
  next.nextNetworkSeq += 1;
  return next;
}

export interface RunOptions {
  name?: string;
  detach?: boolean;
  removeOnExit?: boolean;
  ports: Array<{ hostPort: number; containerPort: number; protocol: 'tcp' | 'udp' }>;
  volumes: Array<{ volume: string; path: string }>;
  network?: string;
  env: Record<string, string>;
  command?: string[];
}

export function runContainer(
  state: DockerState,
  imageName: string,
  options: RunOptions,
): { state: DockerState; container: Container } {
  const image = findImage(state, imageName);
  if (!image) {
    throw new EngineError(
      `Unable to find image locally: ${imageName}. Pull it first with: docker pull ${imageName}`,
    );
  }

  const next = cloneState(state);
  const seq = next.nextContainerSeq;
  const id = shortId('', seq);
  const name = options.name || `friendly_${['euler', 'noether', 'turing', 'hopper', 'shannon', 'lovelace'][seq % 6]}_${seq}`;
  if (findContainer(next, name)) {
    throw new EngineError(
      `Error response from daemon: Conflict. The container name "/${name}" is already in use.`,
    );
  }

  for (const mount of options.volumes) {
    if (!findVolume(next, mount.volume)) {
      // Docker auto-creates named volumes on first use
      next.volumes.push({
        name: mount.volume,
        createdAt: isoNow(),
        data: {},
        labels: { 'com.docker.compose.project': 'learndocker' },
      });
    }
  }

  const networkName = options.network || 'bridge';
  if (!findNetwork(next, networkName)) {
    throw new EngineError(`Error response from daemon: network ${networkName} not found`);
  }

  // Seed volume data into container view for mounts
  const volumeData: Record<string, string> = {};
  for (const mount of options.volumes) {
    const vol = findVolume(next, mount.volume);
    if (vol) {
      for (const [k, v] of Object.entries(vol.data)) {
        volumeData[`${mount.path}/${k}`.replace(/\/+/g, '/')] = v;
      }
    }
  }

  const container: Container = {
    id,
    name,
    image: image.name,
    imageId: image.imageId,
    status: 'running',
    command: options.command?.join(' ') || imageCommand(image.name),
    createdAt: isoNow(),
    ports: options.ports.map((p) => ({ ...p })),
    env: { ...options.env },
    volumeMounts: options.volumes.map((v) => ({ ...v })),
    networks: [networkName],
    hostname: name,
    volumeData,
  };

  next.containers.push(container);
  next.nextContainerSeq += 1;

  const net = findNetwork(next, networkName);
  if (net) {
    net.containers.push(id);
  }

  // hello-world prints and exits
  if (image.repo === 'hello-world') {
    container.status = 'exited';
    container.exitCode = 0;
  }

  // Simulate a write into a mounted volume when a "seed" command is used
  if (options.command && options.command.length > 0) {
    simulateCommandEffects(container, options.command);
    persistVolumeWrites(next, container);
  }

  return { state: next, container };
}

function imageCommand(imageName: string): string {
  const reg = findRegistryImage(imageName);
  if (!reg) return '/bin/sh';
  const cmdLayer = reg.layers.find((l) => l.instruction.startsWith('CMD'));
  if (!cmdLayer) return '/bin/sh';
  const m = cmdLayer.instruction.match(/CMD\s+\[(.*)\]/);
  if (!m) return cmdLayer.instruction.replace(/^CMD\s+/, '');
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .join(' ');
}

function simulateCommandEffects(container: Container, command: string[]): void {
  // Support a simple educational pattern:
  //   sh -c 'echo hello > /data/note.txt'
  //   sh -c 'echo persisted > /data/db.txt'
  const joined = command.join(' ');
  const writeMatch = joined.match(/echo\s+(.+?)\s*>\s*([^\s'"]+)/);
  if (writeMatch) {
    const content = writeMatch[1].replace(/^['"]|['"]$/g, '');
    const path = writeMatch[2];
    const mount = container.volumeMounts.find(
      (m) => path === m.path || path.startsWith(`${m.path}/`),
    );
    if (mount) {
      const rel = path.slice(mount.path.length).replace(/^\//, '') || 'file.txt';
      container.volumeData[path] = content;
      // Stash relative key for persistence
      (container as Container & { _pendingWrites?: Array<{ volume: string; key: string; content: string }> })._pendingWrites =
        (
          (container as Container & { _pendingWrites?: Array<{ volume: string; key: string; content: string }> })
            ._pendingWrites || []
        ).concat([{ volume: mount.volume, key: rel, content }]);
    } else {
      container.volumeData[path] = content;
    }
  }
}

function persistVolumeWrites(state: DockerState, container: Container): void {
  const pending = (container as Container & {
    _pendingWrites?: Array<{ volume: string; key: string; content: string }>;
  })._pendingWrites;
  if (!pending) return;
  for (const write of pending) {
    const vol = findVolume(state, write.volume);
    if (vol) {
      vol.data[write.key] = write.content;
    }
  }
  delete (container as Container & { _pendingWrites?: unknown })._pendingWrites;
}

export function setContainerStatus(
  state: DockerState,
  ref: string,
  status: Container['status'],
  exitCode?: number,
): DockerState {
  const next = cloneState(state);
  const c = findContainer(next, ref);
  if (!c) {
    throw new EngineError(`Error: No such container: ${ref}`);
  }
  c.status = status;
  if (status === 'running') {
    c.exitCode = undefined;
  } else if (exitCode !== undefined) {
    c.exitCode = exitCode;
  } else if (status === 'exited' && c.exitCode === undefined) {
    c.exitCode = 0;
  }
  return next;
}

export function removeContainer(
  state: DockerState,
  ref: string,
  force = false,
): DockerState {
  const next = cloneState(state);
  const c = findContainer(next, ref);
  if (!c) {
    throw new EngineError(`Error: No such container: ${ref}`);
  }
  if (c.status === 'running' && !force) {
    throw new EngineError(
      `Error response from daemon: cannot remove a running container ${c.id}. Stop the container before removal or force remove`,
    );
  }
  // Persist any in-container volume data that was written
  for (const [path, content] of Object.entries(c.volumeData)) {
    const mount = c.volumeMounts.find(
      (m) => path === m.path || path.startsWith(`${m.path}/`),
    );
    if (mount) {
      const vol = findVolume(next, mount.volume);
      if (vol) {
        const rel = path.slice(mount.path.length).replace(/^\//, '') || path;
        vol.data[rel] = content;
      }
    }
  }
  next.containers = next.containers.filter((x) => x.id !== c.id);
  for (const n of next.networks) {
    n.containers = n.containers.filter((id) => id !== c.id);
  }
  return next;
}

export function removeImage(state: DockerState, name: string): DockerState {
  const next = cloneState(state);
  const img = findImage(next, name);
  if (!img) {
    throw new EngineError(`Error: No such image: ${name}`);
  }
  const inUse = next.containers.find((c) => c.imageId === img.imageId);
  if (inUse) {
    throw new EngineError(
      `Error response from daemon: conflict: unable to remove image ${name} (must force) - container ${inUse.id} is using its referenced image`,
    );
  }
  next.images = next.images.filter((i) => i.imageId !== img.imageId);
  return next;
}

export function removeVolume(state: DockerState, name: string): DockerState {
  const next = cloneState(state);
  const vol = findVolume(next, name);
  if (!vol) {
    throw new EngineError(`Error: No such volume: ${name}`);
  }
  const inUse = next.containers.find((c) =>
    c.volumeMounts.some((m) => m.volume === name),
  );
  if (inUse) {
    throw new EngineError(
      `Error response from daemon: remove ${name}: volume is in use - [${inUse.name}]`,
    );
  }
  next.volumes = next.volumes.filter((v) => v.name !== name);
  return next;
}

export function removeNetwork(state: DockerState, name: string): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, name);
  if (!net) {
    throw new EngineError(`Error: No such network: ${name}`);
  }
  if (net.driver !== 'bridge' && ['host', 'none'].includes(name)) {
    throw new EngineError(`Error response from daemon: ${name} is a pre-defined network and cannot be removed`);
  }
  if (net.containers.length > 0) {
    throw new EngineError(
      `Error response from daemon: error while removing network: network ${name} has active endpoints`,
    );
  }
  next.networks = next.networks.filter((n) => n.name !== name);
  return next;
}

export function connectNetwork(
  state: DockerState,
  networkName: string,
  containerRef: string,
): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, networkName);
  if (!net) {
    throw new EngineError(`Error: No such network: ${networkName}`);
  }
  const c = findContainer(next, containerRef);
  if (!c) {
    throw new EngineError(`Error: No such container: ${containerRef}`);
  }
  if (!c.networks.includes(networkName)) {
    c.networks.push(networkName);
  }
  if (!net.containers.includes(c.id)) {
    net.containers.push(c.id);
  }
  return next;
}

export function disconnectNetwork(
  state: DockerState,
  networkName: string,
  containerRef: string,
): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, networkName);
  if (!net) {
    throw new EngineError(`Error: No such network: ${networkName}`);
  }
  const c = findContainer(next, containerRef);
  if (!c) {
    throw new EngineError(`Error: No such container: ${containerRef}`);
  }
  c.networks = c.networks.filter((n) => n !== networkName);
  net.containers = net.containers.filter((id) => id !== c.id);
  return next;
}

export function buildImage(
  state: DockerState,
  tag: string,
  dockerfileLines: string[],
): { state: DockerState; image: ImageRef; log: string[] } {
  const log: string[] = ['Sending build context to Docker daemon  12.29kB'];
  const layers: ImageLayer[] = [];
  let sizeKb = 0;
  let baseRepo = '';
  let baseTag = '';

  dockerfileLines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    const step = index + 1;
    const instruction = line;
    const stepSize = estimateInstructionSize(line);
    sizeKb += stepSize;
    layers.push({
      id: `sha256:build${layers.length + 1}`,
      instruction,
      sizeKb: stepSize,
    });
    log.push(`Step ${step}/${dockerfileLines.filter((l) => l.trim() && !l.startsWith('#')).length} : ${line}`);
    if (line.toUpperCase().startsWith('FROM ')) {
      const base = line.slice(5).trim();
      const split = splitImageName(base);
      baseRepo = split.repo;
      baseTag = split.tag;
      if (!findImage(state, base) && findRegistryImage(base)) {
        log.push(` ---> Pulling base image ${base}`);
      }
    } else {
      log.push(' ---> Using cache');
    }
    log.push(' ---> ' + shortId('', 90 + layers.length));
  });
  log.push(`Successfully tagged ${tag}`);
  log.push(`Successfully built ${shortId('', 70)}`);

  const next = cloneState(state);
  const { repo, tag: imageTag } = splitImageName(tag);
  // If retagging same repo:tag, replace
  next.images = next.images.filter((i) => !(i.repo === repo && i.tag === imageTag));
  const image: ImageRef = {
    name: `${repo}:${imageTag}`,
    repo,
    tag: imageTag,
    imageId: shortId('sha256:', next.nextImageSeq),
    layers,
    sizeKb,
    created: isoNow(),
    parent: baseRepo ? `${baseRepo}:${baseTag}` : undefined,
  };
  next.images.push(image);
  next.nextImageSeq += 1;
  return { state: next, image, log };
}

function estimateInstructionSize(line: string): number {
  const op = line.split(/\s+/)[0]?.toUpperCase() ?? '';
  switch (op) {
    case 'FROM':
      return 100;
    case 'RUN':
      return 4_000 + line.length * 10;
    case 'COPY':
    case 'ADD':
      return 800 + line.length * 5;
    case 'WORKDIR':
    case 'ENV':
    case 'EXPOSE':
    case 'LABEL':
    case 'CMD':
    case 'ENTRYPOINT':
      return 40 + line.length;
    default:
      return 100;
  }
}

export function describeContainer(c: Container): string {
  return [
    `Id: ${c.id}`,
    `Name: ${c.name}`,
    `Image: ${c.image}`,
    `Status: ${c.status}${c.exitCode !== undefined ? ` (${c.exitCode})` : ''}`,
    `Command: ${c.command}`,
    `Hostname: ${c.hostname}`,
    c.ports.length
      ? `Ports: ${c.ports.map((p) => `${p.hostPort}->${p.containerPort}/${p.protocol}`).join(', ')}`
      : 'Ports: (none)',
    c.volumeMounts.length
      ? `Volumes: ${c.volumeMounts.map((m) => `${m.volume}:${m.path}`).join(', ')}`
      : 'Volumes: (none)',
    `Networks: ${c.networks.join(', ') || '(none)'}`,
    ...Object.entries(c.env).map(([k, v]) => `Env: ${k}=${v}`),
    ...Object.entries(c.volumeData).map(([k, v]) => `FS ${k}: ${v}`),
  ].join('\n');
}
