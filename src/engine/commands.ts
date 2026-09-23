import type { DockerState, EngineOutput, ImageRef } from './types';
import { DEMO_CONTEXT_FILES, MULTISTAGE_DOCKERFILE, REGISTRY, splitImageName } from './registry';
import {
  EngineError,
  buildImage,
  cloneState,
  connectNetwork,
  containerLogs,
  createNetwork,
  createVolume,
  describeContainer,
  disconnectNetwork,
  execInContainer,
  findContainer,
  findImage,
  findNetwork,
  findVolume,
  parseDockerfile,
  pullImage,
  removeContainer,
  removeImage,
  removeNetwork,
  removeVolume,
  runContainer,
  setContainerStatus,
  systemPrune,
} from './engine';
import { DEMO_COMPOSE } from './registry';

export interface CommandResult extends EngineOutput {
  state: DockerState;
}

const HELP_TEXT = [
  'learnDocker — simulated Docker CLI',
  '',
  'App: help · levels · hint · steps · curriculum · sandbox · reset · undo · clear · quiz',
  '',
  'Docker (simulated):',
  '  docker pull|images|rmi|history|inspect|logs|exec|version',
  '  docker run [-d|--rm] [--name] [-p H:C] [-v name:path] [--network] [-e K=V]',
  '           [--restart POLICY] [--healthcheck CMD] [--user U] [--read-only] [--memory] [--cpus]',
  '  docker ps [-a] · start|stop|restart|rm [-f]',
  '  docker build [-t TAG] [--target STAGE] [--no-cache] .',
  '  docker volume create|ls|rm',
  '  docker network create|ls|rm|connect|disconnect',
  '  docker compose up [-d] · down · ps · logs · config',
  '  docker system df|prune',
  '',
  'Registry catalog:',
  ...REGISTRY.map((i) => `  ${i.name.padEnd(22)} ${i.description}`),
];

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function ok(state: DockerState, lines: string[], extra?: Partial<CommandResult>): CommandResult {
  return { state, lines, ok: true, ...extra };
}

function fail(state: DockerState, lines: string[]): CommandResult {
  return { state, lines, ok: false };
}

function statusLabel(c: DockerState['containers'][number]): string {
  if (c.status === 'running') {
    return c.health === 'healthy' ? 'Up (healthy)' : 'Up 1 minute';
  }
  if (c.status === 'exited') return `Exited (${c.exitCode ?? 0})`;
  return c.status;
}

function psTable(containers: DockerState['containers'], all: boolean): string[] {
  const rows = containers.filter((c) => all || c.status === 'running');
  if (rows.length === 0) {
    return ['CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS   NAMES'];
  }
  const header =
    'CONTAINER ID   IMAGE                 COMMAND                 CREATED        STATUS              PORTS                   NAMES';
  return [
    header,
    ...rows.map((c) => {
      const ports = c.ports.map((p) => `0.0.0.0:${p.hostPort}->${p.containerPort}/${p.protocol}`).join(', ');
      return [
        c.id.slice(0, 12).padEnd(14),
        c.image.padEnd(21),
        `"${c.command}"`.slice(0, 23).padEnd(23),
        '1 min ago'.padEnd(14),
        statusLabel(c).padEnd(19),
        ports.padEnd(23),
        c.name,
      ].join(' ');
    }),
  ];
}

function formatSize(kb: number): string {
  if (kb >= 1_000_000) return `${(kb / 1_000_000).toFixed(2)}GB`;
  if (kb >= 1_000) return `${(kb / 1_000).toFixed(2)}MB`;
  return `${kb}kB`;
}

function imagesTable(images: ImageRef[]): string[] {
  if (images.length === 0) return ['REPOSITORY   TAG       IMAGE ID   CREATED   SIZE'];
  return [
    'REPOSITORY          TAG             IMAGE ID       CREATED        SIZE',
    ...images.map((img) =>
      [
        img.repo.padEnd(19),
        img.tag.padEnd(15),
        img.imageId.replace('sha256:', '').slice(0, 12).padEnd(14),
        '1 minute ago'.padEnd(14),
        formatSize(img.sizeKb),
      ].join(' '),
    ),
  ];
}

interface RunFlagOptions {
  name?: string;
  detach: boolean;
  removeOnExit: boolean;
  ports: Array<{ hostPort: number; containerPort: number; protocol: 'tcp' | 'udp' }>;
  volumes: Array<{ volume: string; path: string; bind?: boolean }>;
  network?: string;
  env: Record<string, string>;
  command?: string[];
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthcheck?: string | null;
  user?: string;
  readOnly?: boolean;
  memLimit?: string;
  cpus?: number;
  labels?: Record<string, string>;
}

function parseRunFlags(tokens: string[]): { options: RunFlagOptions; image?: string; rest: string[] } {
  const options: RunFlagOptions = {
    detach: false,
    removeOnExit: false,
    ports: [],
    volumes: [],
    env: {},
  };
  const rest: string[] = [];
  let image: string | undefined;
  let i = 0;
  let sawImage = false;

  while (i < tokens.length) {
    const t = tokens[i];
    if (!sawImage) {
      if (t === '-d' || t === '--detach') {
        options.detach = true;
        i += 1;
      } else if (t === '--rm') {
        options.removeOnExit = true;
        i += 1;
      } else if (t === '--name') {
        options.name = tokens[i + 1];
        i += 2;
      } else if (t === '-p' || t === '--publish') {
        const spec = tokens[i + 1] ?? '';
        const [host, ctr] = spec.split(':');
        options.ports.push({
          hostPort: Number(host),
          containerPort: Number(ctr ?? host),
          protocol: 'tcp',
        });
        i += 2;
      } else if (t === '-v' || t === '--volume') {
        const spec = tokens[i + 1] ?? '';
        const parts = spec.split(':');
        options.volumes.push({ volume: parts[0], path: parts.slice(1).join(':') });
        i += 2;
      } else if (t === '--network') {
        options.network = tokens[i + 1];
        i += 2;
      } else if (t === '-e' || t === '--env') {
        const spec = tokens[i + 1] ?? '';
        const eq = spec.indexOf('=');
        options.env[spec.slice(0, eq)] = spec.slice(eq + 1);
        i += 2;
      } else if (t === '--restart') {
        options.restart = tokens[i + 1] as RunFlagOptions['restart'];
        i += 2;
      } else if (t === '--healthcheck') {
        options.healthcheck = tokens[i + 1] ?? 'true';
        i += 2;
      } else if (t.startsWith('--healthcheck=')) {
        options.healthcheck = t.slice('--healthcheck='.length) || 'true';
        i += 1;
      } else if (t === '--user') {
        options.user = tokens[i + 1];
        i += 2;
      } else if (t === '--read-only') {
        options.readOnly = true;
        i += 1;
      } else if (t === '--memory' || t === '-m') {
        options.memLimit = tokens[i + 1];
        i += 2;
      } else if (t === '--cpus') {
        options.cpus = Number(tokens[i + 1]);
        i += 2;
      } else if (t === '--label') {
        const spec = tokens[i + 1] ?? '';
        const eq = spec.indexOf('=');
        options.labels = options.labels ?? {};
        options.labels[spec.slice(0, eq)] = spec.slice(eq + 1);
        i += 2;
      } else if (t.startsWith('-')) {
        i += 1;
      } else {
        image = t;
        sawImage = true;
        i += 1;
      }
    } else {
      rest.push(t);
      i += 1;
    }
  }
  return {
    options: { ...options, command: rest.length > 0 ? rest : undefined },
    image,
    rest,
  };
}

export function executeCommand(rawInput: string, state: DockerState): CommandResult {
  const input = rawInput.trim();
  if (!input) return ok(state, []);
  const tokens = tokenize(input);
  const root = tokens[0];
  try {
    if (root === 'help') return ok(state, HELP_TEXT);
    if (root === 'clear') return ok(state, []);
    if (root === 'echo') return ok(state, [tokens.slice(1).join(' ')]);
    if (root === 'docker') return executeDocker(tokens.slice(1), state);
    return fail(state, [`bash: ${root}: command not found`, "Type 'help' to see learnDocker commands."]);
  } catch (err) {
    const message = err instanceof EngineError ? err.message : String(err);
    return fail(state, [message]);
  }
}

function executeDocker(args: string[], state: DockerState): CommandResult {
  if (args.length === 0) {
    return ok(state, ['Usage:  docker [OPTIONS] COMMAND', "Run 'docker help' for more information."]);
  }
  const cmd = args[0];
  const rest = args.slice(1);

  switch (cmd) {
    case 'help':
      return ok(state, HELP_TEXT);

    case 'pull': {
      const name = rest[0];
      if (!name) return fail(state, ['"docker pull" requires at least 1 argument.']);
      const normalized = name.includes(':') ? name : `${name}:latest`;
      const already = findImage(state, normalized);
      if (already) {
        return ok(state, [
          `${already.name}: Pulling from ${already.repo}`,
          'Digest: sha256:deadbeef',
          `Status: Image is up to date for ${already.name}`,
          already.name,
        ]);
      }
      const next = pullImage(state, name);
      const img = next.images[next.images.length - 1]!;
      return ok(next, [
        `${img.name}: Pulling from ${img.repo}`,
        ...img.layers.map((l) => `${l.id.slice(-12)}: Pull complete`),
        `Digest: sha256:${img.imageId.replace('sha256:', '')}dead`,
        `Status: Downloaded newer image for ${img.name}`,
        img.name,
      ]);
    }

    case 'images':
      return ok(state, imagesTable(state.images));

    case 'ps': {
      const all = rest.includes('-a') || rest.includes('--all');
      return ok(state, psTable(state.containers, all));
    }

    case 'run': {
      const parsed = parseRunFlags(rest);
      if (!parsed.image) return fail(state, ['"docker run" requires at least 1 argument: the image name.']);
      const { state: next, container } = runContainer(state, parsed.image, parsed.options);
      const lines: string[] = [];
      if (container.logs.length) lines.push(...container.logs);
      if (parsed.options.detach) lines.push(container.id);
      else lines.push(`docker: attached to ${container.name} (${container.id})`, `status=${container.status}`);
      return ok(next, lines);
    }

    case 'start':
    case 'stop':
    case 'restart': {
      const refs = rest.filter((t) => !t.startsWith('-'));
      if (!refs.length) return fail(state, [`"docker ${cmd}" requires a container reference.`]);
      let next = cloneState(state);
      for (const ref of refs) {
        if (cmd === 'stop') next = setContainerStatus(next, ref, 'exited', 0);
        else if (cmd === 'start') next = setContainerStatus(next, ref, 'running');
        else {
          next = setContainerStatus(next, ref, 'exited', 0);
          next = setContainerStatus(next, ref, 'running');
        }
      }
      return ok(next, refs);
    }

    case 'rm': {
      const force = rest.includes('-f') || rest.includes('--force');
      const refs = rest.filter((t) => !t.startsWith('-'));
      if (!refs.length) return fail(state, ['"docker rm" requires at least 1 argument.']);
      let next = cloneState(state);
      for (const ref of refs) next = removeContainer(next, ref, force);
      return ok(next, refs);
    }

    case 'rmi': {
      const name = rest.filter((t) => !t.startsWith('-'))[0];
      if (!name) return fail(state, ['"docker rmi" requires an image reference.']);
      const next = removeImage(state, name);
      return ok(next, [`Untagged: ${name}`, `Deleted: ${name}`]);
    }

    case 'history': {
      const name = rest[0];
      if (!name) return fail(state, ['"docker history" requires an image reference.']);
      const img = findImage(state, name);
      if (!img) return fail(state, [`Error: No such image: ${name}`]);
      const rows = (img.history ?? img.layers.map((l) => ({ instruction: l.instruction, sizeKb: l.sizeKb, stage: '0' })));
      return ok(state, [
        'IMAGE          CREATED          CREATED BY                                      SIZE',
        ...rows.map((h, i) =>
          [
            img.imageId.replace('sha256:', '').slice(0, 12).padEnd(14),
            '1 minute ago'.padEnd(14),
            (h.instruction + ` [${h.stage}]`).slice(0, 44).padEnd(44),
            formatSize(h.sizeKb),
            i === 0 ? '' : '',
          ].join(' '),
        ),
        `stages: ${img.finalStage ?? 'default'} · user: ${img.user ?? 'root'}`,
      ]);
    }

    case 'build': {
      let tag = 'anonymous:latest';
      let target: string | undefined;
      let noCache = false;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '-t' || rest[i] === '--tag') tag = rest[i + 1] ?? tag;
        if (rest[i] === '--target') target = rest[i + 1];
        if (rest[i] === '--no-cache') noCache = true;
      }
      const dockerfileKey = Object.keys(state.files).find((f) => f.toLowerCase() === 'dockerfile');
      if (target === 'runtime' && !state.files['Dockerfile']?.includes('AS runtime')) {
        // allow multi-stage file injection via level
      }
      const source = dockerfileKey ? state.files[dockerfileKey]! : DEMO_CONTEXT_FILES['Dockerfile']!;
      const { state: next, image, log } = buildImage(state, tag, source, { target, noCache });
      return ok(next, [...log, `Built ${image.name} · layers=${image.layers.length} · size=${formatSize(image.sizeKb)}`]);
    }

    case 'volume': {
      const sub = rest[0];
      if (sub === 'ls' || sub === 'list') {
        return ok(state, [
          'DRIVER    VOLUME NAME',
          ...state.volumes.map((v) => `${(v.driver ?? 'local').padEnd(10)}${v.name}`),
        ]);
      }
      if (sub === 'create') {
        const name = rest[1];
        if (!name) return fail(state, ['"docker volume create" requires a name.']);
        return ok(createVolume(state, name), [name]);
      }
      if (sub === 'rm') {
        const name = rest[1];
        if (!name) return fail(state, ['"docker volume rm" requires a name.']);
        return ok(removeVolume(state, name), [name]);
      }
      return fail(state, [`Unknown volume subcommand: ${sub}`]);
    }

    case 'network': {
      const sub = rest[0];
      if (sub === 'ls' || sub === 'list') {
        return ok(state, [
          'NETWORK ID     NAME      DRIVER    SCOPE',
          ...state.networks.map((n, i) => `${String(1000 + i).padEnd(14)} ${n.name.padEnd(10)}${n.driver.padEnd(10)}local`),
        ]);
      }
      if (sub === 'create') {
        const nameToken = rest.filter((t, i) => i > 0 && !t.startsWith('-')).pop();
        if (!nameToken) return fail(state, ['"docker network create" requires a name.']);
        const next = createNetwork(state, nameToken);
        return ok(next, [next.networks[next.networks.length - 1]!.name]);
      }
      if (sub === 'rm') {
        const name = rest[1];
        if (!name) return fail(state, ['"docker network rm" requires a name.']);
        return ok(removeNetwork(state, name), [name]);
      }
      if (sub === 'connect') {
        const net = rest[1];
        const ctr = rest[2];
        if (!net || !ctr) return fail(state, ['Usage: docker network connect <network> <container>']);
        return ok(connectNetwork(state, net, ctr), [`${ctr} connected to ${net}`]);
      }
      if (sub === 'disconnect') {
        const net = rest[1];
        const ctr = rest[2];
        if (!net || !ctr) return fail(state, ['Usage: docker network disconnect <network> <container>']);
        return ok(disconnectNetwork(state, net, ctr), [`${ctr} disconnected from ${net}`]);
      }
      return fail(state, [`Unknown network subcommand: ${sub}`]);
    }

    case 'exec': {
      const detachIdx = rest.findIndex((t) => t === '-d' || t === '--detach');
      let i = 0;
      while (i < rest.length && rest[i]!.startsWith('-')) i += 1;
      const ref = rest[i];
      const command = rest.slice(i + 1);
      if (!ref || command.length === 0) {
        return fail(state, ['Usage: docker exec [opts] CONTAINER COMMAND [ARG...]']);
      }
      void detachIdx;
      const { state: next, output } = execInContainer(state, ref, command);
      return ok(next, output);
    }

    case 'logs': {
      const ref = rest.filter((t) => !t.startsWith('-'))[0];
      if (!ref) return fail(state, ['"docker logs" requires a container reference.']);
      return ok(state, containerLogs(state, ref));
    }

    case 'inspect': {
      const ref = rest.filter((t) => !t.startsWith('-'))[0];
      if (!ref) return fail(state, ['"docker inspect" requires a reference.']);
      const c = findContainer(state, ref);
      if (c) return ok(state, [describeContainer(c)]);
      const img = findImage(state, ref);
      if (img) {
        return ok(state, [
          `Id: ${img.imageId}`,
          `Name: ${img.name}`,
          `Layers: ${img.layers.length}`,
          ...img.layers.map((l, i) => `  ${i + 1}. ${l.instruction} (${formatSize(l.sizeKb)})${l.cached ? ' [cached]' : ''}`),
          `Size: ${formatSize(img.sizeKb)}`,
          `User: ${img.user ?? 'root'}`,
          `Healthcheck: ${img.healthcheck ?? 'none'}`,
          img.vulns
            ? `Vulns: critical=${img.vulns.critical} high=${img.vulns.high} medium=${img.vulns.medium}`
            : 'Vulns: n/a',
        ]);
      }
      const vol = findVolume(state, ref);
      if (vol) {
        return ok(state, [
          `Name: ${vol.name}`,
          'Driver: local',
          `Created: ${vol.createdAt}`,
          ...Object.entries(vol.data).map(([k, v]) => `File ${k}: ${v}`),
        ]);
      }
      const net = findNetwork(state, ref);
      if (net) {
        return ok(state, [
          `Name: ${net.name}`,
          `Driver: ${net.driver}`,
          `Subnet: ${net.subnet ?? 'n/a'}`,
          `Containers: ${net.containers.length}`,
        ]);
      }
      return fail(state, [`Error: No such object: ${ref}`]);
    }

    case 'compose': {
      return executeCompose(rest, state);
    }

    case 'system': {
      const sub = rest[0];
      if (sub === 'df') {
        const images = state.images.reduce((a, i) => a + i.sizeKb, 0);
        const containers = state.containers.length;
        const volumes = state.volumes.reduce((a, v) => a + Object.keys(v.data).length * 10, 0);
        return ok(state, [
          'TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE',
          `Images          ${String(state.images.length).padEnd(10)}${String(state.images.length).padEnd(10)}${formatSize(images).padEnd(10)}`,
          `Containers      ${String(containers).padEnd(10)}${String(state.containers.filter((c) => c.status === 'running').length).padEnd(10)}`,
          `Local Volumes   ${String(state.volumes.length).padEnd(10)}${String(0).padEnd(10)}${formatSize(volumes).padEnd(10)}`,
        ]);
      }
      if (sub === 'prune') {
        const { state: next, log } = systemPrune(state);
        return ok(next, ['WARNING! This will remove:', '- all stopped containers', '- dangling images', '...', ...log]);
      }
      return fail(state, [`Unknown system subcommand: ${sub}`]);
    }

    case 'version':
      return ok(state, [
        'Client: learnDocker Engine - Community',
        ' Version:           0.2.0-simulated',
        ' API version:       1.43',
        ' Go version:        n/a (TypeScript simulator)',
      ]);

    case 'scan':
    case 'scout': {
      const name = rest.filter((t) => !t.startsWith('-'))[0];
      const img = name ? findImage(state, name) : undefined;
      if (!img) return fail(state, ['Usage: docker scan IMAGE']);
      const v = img.vulns ?? { critical: 0, high: 0, medium: 0 };
      return ok(state, [
        `Scanning ${img.name}...`,
        `Target: docker-image://${img.name}`,
        `Vulnerabilities: ${v.critical} critical, ${v.high} high, ${v.medium} medium`,
        v.critical > 0 ? 'Recommendation: switch to alpine/distroless runtime and rebuild.' : 'No critical issues in this simulation.',
      ]);
    }

    default:
      return fail(state, [`docker: '${cmd}' is not a docker command.`, "See 'docker --help'."]);
  }
}

function executeCompose(rest: string[], state: DockerState): CommandResult {
  const sub = rest[0];
  const hasComposeFile =
    Boolean(state.files['docker-compose.yml'] || state.files['compose.yaml']) || Boolean(state.compose);

  if (sub === 'config') {
    return ok(state, [
      'name: learndocker',
      'services:',
      '  web: { image: nginx:1.25, ports: ["8080:80"], depends_on: [db] }',
      '  db:  { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data] }',
      '  cache: { image: redis:7 }',
      'networks: [app-net]',
      'volumes: [pgdata]',
    ]);
  }

  if (sub === 'up') {
    if (!hasComposeFile) {
      return fail(state, [
        'no configuration file provided: no docker-compose.yml or compose.yaml in the current directory',
      ]);
    }
    const project = DEMO_COMPOSE;
    let next = cloneState(state);
    const lines: string[] = [`[+] Running ${project.services.length + 2}/2`, 'Network learndocker_app-net  Created', 'Volume learndocker_pgdata    Created'];

    // ensure images
    for (const svc of project.services) {
      if (svc.image) next = pullImage(next, svc.image);
    }
    if (!next.networks.find((n) => n.name === project.networks[0])) {
      next = createNetwork(next, project.networks[0]!);
    }
    for (const vName of project.volumes) {
      if (!findVolume(next, vName)) next = createVolume(next, vName);
    }

    // start in depends_on order
    const order = ['cache', 'db', 'web'];
    for (const svcName of order) {
      const svc = project.services.find((s) => s.name === svcName)!;
      const { state: after, container } = runContainer(next, svc.image!, {
        name: `${project.name}-${svc.name}-1`,
        detach: true,
        ports: (svc.ports ?? []).map((p) => ({ hostPort: p.host, containerPort: p.target, protocol: 'tcp' as const })),
        volumes: (svc.volumes ?? []).map((v) => ({ volume: v.source, path: v.target })),
        network: svc.networks?.[0] ?? 'app-net',
        env: svc.environment ?? {},
        command: svc.command ? svc.command.split(' ') : undefined,
        restart: 'unless-stopped',
        healthcheck: svc.healthcheck ?? null,
        labels: { 'com.docker.compose.project': project.name, 'com.docker.compose.service': svc.name },
        composeService: svc.name,
        composeProject: project.name,
      });
      next = after;
      lines.push(`Container learndocker-${svc.name}-1  Started (${container.id})`);
    }
    next.compose = structuredClone(project);
    return ok(next, lines);
  }

  if (sub === 'down') {
    if (!state.compose && !hasComposeFile) {
      return fail(state, ['no configuration file provided']);
    }
    let next = cloneState(state);
    const project = next.compose ?? DEMO_COMPOSE;
    const names = project.services.map((s) => `${project.name}-${s.name}-1`);
    for (const n of names) {
      if (findContainer(next, n)) next = removeContainer(next, n, true);
    }
    if (findNetwork(next, project.networks[0]!)) next = removeNetwork(next, project.networks[0]!);
    // volumes remain unless -v
    if (rest.includes('-v')) {
      for (const v of project.volumes) {
        if (findVolume(next, v) && !next.containers.some((c) => c.volumeMounts.some((m) => m.volume === v))) {
          next = removeVolume(next, v);
        }
      }
    }
    next.compose = null;
    return ok(next, names.map((n) => `Container ${n}  Removed`).concat(['Network learndocker_app-net  Removed']));
  }

  if (sub === 'ps') {
    const rows = state.containers.filter((c) => c.composeProject || c.composeService || c.name.includes('-web-') || c.name.includes('-db-') || c.name.includes('-cache-'));
    return ok(state, [
      'NAME                     IMAGE               STATUS',
      ...rows.map((c) => `${c.name.padEnd(24)}${c.image.padEnd(20)}${statusLabel(c)}`),
    ]);
  }

  if (sub === 'logs') {
    const rows = state.containers.filter((c) => c.composeService);
    return ok(state, rows.flatMap((c) => [`${c.name} |`, ...c.logs.map((l) => `${c.name} | ${l}`)]));
  }

  return fail(state, [`Unknown compose subcommand: ${sub}`]);
}

export { parseDockerfile, MULTISTAGE_DOCKERFILE, splitImageName };
