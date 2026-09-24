import type {
  Container,
  DockerState,
  ImageLayer,
  ImageRef,
  Network,
  Volume,
  ComposeProject,
} from './types';
import { findRegistryImage, splitImageName, DEMO_CONTEXT_FILES, DEMO_COMPOSE } from './registry';

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export function cloneState(state: DockerState): DockerState {
  return structuredClone(state);
}

export function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function shortId(prefix: string, seq: number): string {
  return `${prefix}${seq.toString(16).padStart(6, '0')}`;
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
      { name: 'host', driver: 'host', containers: [], createdAt: isoNow() },
      { name: 'none', driver: 'none', containers: [], createdAt: isoNow() },
    ],
    nextContainerSeq: 1,
    nextImageSeq: 1,
    nextNetworkSeq: 1,
    compose: null,
    files: { ...DEMO_CONTEXT_FILES },
  };
}

export function findImage(state: DockerState, name: string): ImageRef | undefined {
  const { repo, tag } = splitImageName(name);
  return state.images.find((img) => img.repo === repo && img.tag === tag);
}

export function findContainer(state: DockerState, ref: string): Container | undefined {
  return state.containers.find((c) => c.name === ref || c.id === ref || c.id.startsWith(ref));
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
  if (existing) return state;
  const next = cloneState(state);
  const { repo, tag } = splitImageName(catalog.name);
  next.images.push({
    name: catalog.name,
    repo,
    tag,
    imageId: shortId('sha256:', next.nextImageSeq),
    layers: catalog.layers.map((l) => ({ ...l })),
    sizeKb: catalog.sizeKb,
    created: isoNow(),
    vulns: catalog.vulns ? { ...catalog.vulns } : undefined,
    user: catalog.user ?? 'root',
    history: catalog.layers.map((l) => ({ instruction: l.instruction, sizeKb: l.sizeKb, stage: '0' })),
  });
  next.nextImageSeq += 1;
  return next;
}

export function createVolume(state: DockerState, name: string): DockerState {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
    throw new EngineError(`Error: invalid volume name: ${name}`);
  }
  if (findVolume(state, name)) return state;
  const next = cloneState(state);
  next.volumes.push({ name, createdAt: isoNow(), data: {}, labels: {}, driver: 'local' });
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
  ports: Array<{ hostPort: number; containerPort: number; protocol: 'tcp' | 'udp'; hostIp?: string }>;
  volumes: Array<{ volume: string; path: string; bind?: boolean }>;
  network?: string;
  env: Record<string, string>;
  command?: string[];
  restart?: Container['restart'];
  healthcheck?: string | null;
  user?: string;
  readOnly?: boolean;
  memLimit?: string;
  cpus?: number;
  labels?: Record<string, string>;
  composeService?: string;
  composeProject?: string;
  entrypoint?: string;
  capDrop?: string[];
  capAdd?: string[];
  noNewPrivileges?: boolean;
  memSwap?: string;
  securityOpt?: string[];
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
  const name =
    options.name ||
    `friendly_${['euler', 'noether', 'turing', 'hopper', 'shannon', 'lovelace'][seq % 6]}_${seq}`;
  if (findContainer(next, name)) {
    throw new EngineError(
      `Error response from daemon: Conflict. The container name "/${name}" is already in use.`,
    );
  }

  for (const mount of options.volumes) {
    if (!mount.bind && !findVolume(next, mount.volume)) {
      next.volumes.push({
        name: mount.volume,
        createdAt: isoNow(),
        data: {},
        labels: {},
        driver: 'local',
      });
    }
  }

  const networkName = options.network || 'bridge';
  if (!findContainerNetworkOk(next, networkName)) {
    throw new EngineError(`Error response from daemon: network ${networkName} not found`);
  }

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
    restart: options.restart ?? 'no',
    healthcheck: options.healthcheck ?? image.healthcheck ?? null,
    health: options.healthcheck || image.healthcheck ? 'starting' : null,
    user: options.user ?? image.user ?? 'root',
    readOnly: options.readOnly ?? false,
    memLimit: options.memLimit,
    cpus: options.cpus,
    labels: options.labels ?? {},
    composeService: options.composeService,
    composeProject: options.composeProject,
    logs: [],
    execHistory: [],
    capDrop: options.capDrop,
    capAdd: options.capAdd,
    noNewPrivileges: options.noNewPrivileges,
    memSwap: options.memSwap,
    securityOpt: options.securityOpt,
  };

  if (image.repo === 'hello-world') {
    container.status = 'exited';
    container.exitCode = 0;
    container.logs = [
      'Hello from Docker!',
      'This message shows that your installation appears to be working correctly.',
    ];
  }

  if (options.command && options.command.length > 0) {
    simulateCommandEffects(container, options.command);
    persistVolumeWrites(next, container);
    container.logs.push(`$ ${options.command.join(' ')}`);
  }

  if (container.health === 'starting') {
    container.health = 'healthy';
    container.logs.push('health: probe ok');
  }

  next.containers.push(container);
  next.nextContainerSeq += 1;
  const net = findNetwork(next, networkName);
  if (net) net.containers.push(id);

  return { state: next, container };
}

function findContainerNetworkOk(state: DockerState, name: string): boolean {
  return Boolean(findNetwork(state, name));
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
  const joined = command.join(' ');
  const writeMatch = joined.match(/echo\s+(.+?)\s*>\s*([^\s'"]+)/);
  if (writeMatch) {
    const content = writeMatch[1].replace(/^['"]|['"]$/g, '');
    const path = writeMatch[2];
    const mount = container.volumeMounts.find((m) => path === m.path || path.startsWith(`${m.path}/`));
    if (mount) {
      const rel = path.slice(mount.path.length).replace(/^\//, '') || 'file.txt';
      container.volumeData[path] = content;
      const pending = (container as Container & { _pendingWrites?: Array<{ volume: string; key: string; content: string }> });
      pending._pendingWrites = (pending._pendingWrites ?? []).concat([{ volume: mount.volume, key: rel, content }]);
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
    if (vol) vol.data[write.key] = write.content;
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
  if (!c) throw new EngineError(`Error: No such container: ${ref}`);
  c.status = status;
  if (status === 'running') {
    c.exitCode = undefined;
    if (c.healthcheck) c.health = 'healthy';
  } else if (exitCode !== undefined) {
    c.exitCode = exitCode;
  } else if (status === 'exited' && c.exitCode === undefined) {
    c.exitCode = 0;
  }
  return next;
}

export function removeContainer(state: DockerState, ref: string, force = false): DockerState {
  const next = cloneState(state);
  const c = findContainer(next, ref);
  if (!c) throw new EngineError(`Error: No such container: ${ref}`);
  if (c.status === 'running' && !force) {
    throw new EngineError(
      `Error response from daemon: cannot remove a running container ${c.id}. Stop the container before removal or force remove`,
    );
  }
  for (const [path, content] of Object.entries(c.volumeData)) {
    const mount = c.volumeMounts.find((m) => path === m.path || path.startsWith(`${m.path}/`));
    if (mount && !mount.bind) {
      const vol = findVolume(next, mount.volume);
      if (vol) {
        const rel = path.slice(mount.path.length).replace(/^\//, '') || path;
        vol.data[rel] = content;
      }
    }
  }
  next.containers = next.containers.filter((x) => x.id !== c.id);
  for (const n of next.networks) n.containers = n.containers.filter((id) => id !== c.id);
  return next;
}

export function removeImage(state: DockerState, name: string): DockerState {
  const next = cloneState(state);
  const img = findImage(next, name);
  if (!img) throw new EngineError(`Error: No such image: ${name}`);
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
  if (!vol) throw new EngineError(`Error: No such volume: ${name}`);
  const inUse = next.containers.find((c) => c.volumeMounts.some((m) => m.volume === name));
  if (inUse) {
    throw new EngineError(`Error response from daemon: remove ${name}: volume is in use - [${inUse.name}]`);
  }
  next.volumes = next.volumes.filter((v) => v.name !== name);
  return next;
}

export function removeNetwork(state: DockerState, name: string): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, name);
  if (!net) throw new EngineError(`Error: No such network: ${name}`);
  if (['host', 'none'].includes(name)) {
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

export function connectNetwork(state: DockerState, networkName: string, containerRef: string): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, networkName);
  if (!net) throw new EngineError(`Error: No such network: ${networkName}`);
  const c = findContainer(next, containerRef);
  if (!c) throw new EngineError(`Error: No such container: ${containerRef}`);
  if (!c.networks.includes(networkName)) c.networks.push(networkName);
  if (!net.containers.includes(c.id)) net.containers.push(c.id);
  return next;
}

export function disconnectNetwork(state: DockerState, networkName: string, containerRef: string): DockerState {
  const next = cloneState(state);
  const net = findNetwork(next, networkName);
  if (!net) throw new EngineError(`Error: No such network: ${networkName}`);
  const c = findContainer(next, containerRef);
  if (!c) throw new EngineError(`Error: No such container: ${containerRef}`);
  c.networks = c.networks.filter((n) => n !== networkName);
  net.containers = net.containers.filter((id) => id !== c.id);
  return next;
}

export function execInContainer(
  state: DockerState,
  ref: string,
  command: string[],
): { state: DockerState; output: string[] } {
  const next = cloneState(state);
  const c = findContainer(next, ref);
  if (!c) throw new EngineError(`Error: No such container: ${ref}`);
  if (c.status !== 'running') {
    throw new EngineError(`Error response from daemon: container ${c.name} is not running`);
  }
  const joined = command.join(' ');
  c.execHistory.push(joined);
  let output: string[] = [];
  if (joined.startsWith('echo')) {
    output = [command.slice(1).join(' ').replace(/^["']|["']$/g, '')];
  } else if (joined.includes('whoami')) {
    const user = c.user ?? 'root';
    output = [user === 'root' ? 'root' : user];
  } else if (joined.includes('id')) {
    const user = c.user ?? 'root';
    output = [user === 'root' ? 'uid=0(root) gid=0(root)' : `uid=1000(${user})`];
  } else if (joined.includes('ls')) {
    output = Object.keys(c.volumeData).map((p) => p.split('/').pop() ?? p);
    if (output.length === 0) output = ['app'];
  } else if (joined.includes('ps')) {
    output = [`${c.command}`];
  } else if (joined.includes('wget') || joined.includes('curl') || joined.includes('ping')) {
    const net = c.networks[0] ?? 'bridge';
    output = [`connect: network=${net} peers=${findNetwork(next, net)?.containers.length ?? 0}`];
  } else if (joined.includes('printenv') || joined.includes('env')) {
    output = Object.entries(c.env).map(([k, v]) => `${k}=${v}`);
  } else {
    output = [`(simulated) executed in ${c.name}: ${joined}`];
  }
  c.logs.push(`exec: ${joined}`);
  return { state: next, output };
}

export function containerLogs(state: DockerState, ref: string): string[] {
  const c = findContainer(state, ref);
  if (!c) throw new EngineError(`Error: No such container: ${ref}`);
  return c.logs.length ? c.logs : [`(no output from ${c.name})`];
}

export interface ParsedDockerfileStage {
  name: string;
  from: string;
  lines: string[];
}

export function parseDockerfile(source: string): ParsedDockerfileStage[] {
  const stages: ParsedDockerfileStage[] = [];
  let current: ParsedDockerfileStage | null = null;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const fromMatch = line.match(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?$/i);
    if (fromMatch) {
      current = {
        name: fromMatch[2] ?? `stage${stages.length}`,
        from: fromMatch[1],
        lines: [line],
      };
      stages.push(current);
      continue;
    }
    if (!current) {
      current = { name: 'stage0', from: 'scratch', lines: [] };
      stages.push(current);
    }
    current.lines.push(line);
  }
  return stages;
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
    default:
      return 40 + line.length;
  }
}

export function buildImage(
  state: DockerState,
  tag: string,
  dockerfileSource: string,
  opts: { target?: string; noCache?: boolean } = {},
): { state: DockerState; image: ImageRef; log: string[] } {
  const stages = parseDockerfile(dockerfileSource);
  if (stages.length === 0) {
    throw new EngineError('failed to read dockerfile: no valid instructions');
  }

  let buildStages = stages;
  if (opts.target) {
    const idx = stages.findIndex((s) => s.name.toLowerCase() === opts.target!.toLowerCase());
    if (idx < 0) {
      throw new EngineError(`failed to solve: target stage ${opts.target} not found`);
    }
    buildStages = stages.slice(0, idx + 1);
  }

  const log: string[] = ['#0 building with docker desktop driver', 'load build context'];
  const layers: ImageLayer[] = [];
  const history: NonNullable<ImageRef['history']> = [];
  let sizeKb = 0;
  let baseRepo = '';
  let baseTag = '';
  const finalStage = buildStages[buildStages.length - 1]?.name ?? 'stage0';
  let vulns = { critical: 0, high: 2, medium: 5 };
  let user = 'root';

  buildStages.forEach((stage, stageIdx) => {
    log.push(`#${stageIdx + 1} FROM ${stage.from}${stage.name !== `stage${stageIdx}` ? ` AS ${stage.name}` : ''}`);
    const fromSplit = splitImageName(stage.from);
    baseRepo = fromSplit.repo;
    baseTag = fromSplit.tag;

    const effective = stage.lines.filter((l) => !/^FROM\s+/i.test(l));
    effective.forEach((line, i) => {
      const stepSize = estimateInstructionSize(line);
      const cached = !opts.noCache && i < effective.length - 1 && stageIdx < buildStages.length - 1;
      sizeKb += cached ? 0 : stepSize;
      layers.push({
        id: `sha256:b${layers.length + 1}`,
        instruction: line,
        sizeKb: cached ? 0 : stepSize,
        stage: stage.name,
        cached,
      });
      history.push({ instruction: line, sizeKb: cached ? 0 : stepSize, stage: stage.name });
      log.push(`#${stageIdx + 1}.${i + 1} ${cached ? 'CACHED' : 'DONE'} ${line}`);

      const up = line.toUpperCase();
      if (up.startsWith('USER ')) {
        user = line.slice(5).trim();
      }
      if (up.startsWith('FROM ') && /alpine|slim|distroless/i.test(line)) {
        vulns = { critical: 0, high: 0, medium: 1 };
      }
      if (up.startsWith('FROM ') && /node:|python:|jdk|openjdk/i.test(line)) {
        vulns = { critical: 1, high: 4, medium: 12 };
      }
    });
  });

  // Only the final stage ships in the runtime image size (multi-stage win)
  const finalLayers = layers.filter((l) => l.stage === finalStage && !l.cached);
  const runtimeSize = finalLayers.reduce((a, l) => a + l.sizeKb, 0) || Math.max(2_000, sizeKb / 4);

  log.push(`exporting layers`);
  log.push(`writing image`);
  log.push(`naming to ${tag}`);
  log.push(`Done. Final image size ~${(runtimeSize / 1000).toFixed(1)}MB (builder discarded: ${(sizeKb / 1000).toFixed(1)}MB total work)`);

  const next = cloneState(state);
  const { repo, tag: imageTag } = splitImageName(tag);
  next.images = next.images.filter((i) => !(i.repo === repo && i.tag === imageTag));
  const image: ImageRef = {
    name: `${repo}:${imageTag}`,
    repo,
    tag: imageTag,
    imageId: shortId('sha256:', next.nextImageSeq),
    layers: finalLayers.length ? finalLayers : layers,
    sizeKb: runtimeSize,
    created: isoNow(),
    parent: baseRepo ? `${baseRepo}:${baseTag}` : undefined,
    finalStage,
    history,
    vulns,
    user,
  };
  next.images.push(image);
  next.nextImageSeq += 1;
  return { state: next, image, log };
}

export function describeContainer(c: Container): string {
  return [
    `Id: ${c.id}`,
    `Name: ${c.name}`,
    `Image: ${c.image}`,
    `Status: ${c.status}${c.exitCode !== undefined ? ` (${c.exitCode})` : ''}${c.health ? ` health=${c.health}` : ''}`,
    `Command: ${c.command}`,
    `Hostname: ${c.hostname}`,
    `User: ${c.user ?? 'root'}`,
    `Restart: ${c.restart ?? 'no'}`,
    c.readOnly ? 'ReadonlyRootfs: true' : 'ReadonlyRootfs: false',
    c.capDrop?.length ? `CapDrop: ${c.capDrop.join(',')}` : 'CapDrop: (default)',
    c.capAdd?.length ? `CapAdd: ${c.capAdd.join(',')}` : '',
    c.noNewPrivileges ? 'SecurityOpt: no-new-privileges' : '',
    c.memLimit ? `Memory: ${c.memLimit}` : '',
    c.cpus ? `Cpus: ${c.cpus}` : '',
    c.ports.length
      ? `Ports: ${c.ports.map((p) => `${p.hostPort}->${p.containerPort}/${p.protocol}`).join(', ')}`
      : 'Ports: (none)',
    c.volumeMounts.length
      ? `Volumes: ${c.volumeMounts.map((m) => `${m.volume}:${m.path}${m.bind ? ' (bind)' : ''}`).join(', ')}`
      : 'Volumes: (none)',
    `Networks: ${c.networks.join(', ') || '(none)'}`,
    ...Object.entries(c.env).map(([k, v]) => `Env: ${k}=${v}`),
    ...Object.entries(c.volumeData).map(([k, v]) => `FS ${k}: ${v}`),
  ].join('\n');
}

export function loadComposeFromFiles(files: Record<string, string>): ComposeProject {
  // Prefer explicit compose object in DEMO_COMPOSE when present in files marker
  if (files['docker-compose.yml']?.includes('services:') || files['compose.yaml']) {
    return structuredClone(DEMO_COMPOSE);
  }
  throw new EngineError(
    `no configuration file provided: no docker-compose.yml or compose.yaml in the current directory`,
  );
}

export function systemPrune(
  state: DockerState,
): { state: DockerState; log: string[]; removed: { containers: number; images: number; volumes: number } } {
  const next = cloneState(state);
  const removed = { containers: 0, images: 0, volumes: 0 };
  const beforeC = next.containers.length;
  next.containers = next.containers.filter((c) => c.status === 'running');
  removed.containers = beforeC - next.containers.length;
  const usedIds = new Set(next.containers.map((c) => c.imageId));
  const beforeI = next.images.length;
  next.images = next.images.filter((i) => !i.dangling && usedIds.has(i.imageId));
  removed.images = beforeI - next.images.length;
  const usedVols = new Set(next.containers.flatMap((c) => c.volumeMounts.map((m) => m.volume)));
  const beforeV = next.volumes.length;
  next.volumes = next.volumes.filter((v) => usedVols.has(v.name) || Object.keys(v.data).length > 0);
  removed.volumes = beforeV - next.volumes.length;
  next.pruned = removed;
  const log = [
    `Deleted Containers: ${removed.containers}`,
    `Deleted Images: ${removed.images}`,
    `Deleted Volumes: ${removed.volumes}`,
    `Total reclaimed space: approximate`,
  ];
  return { state: next, log, removed };
}
