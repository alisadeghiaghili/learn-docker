import type { DockerState, EngineOutput } from './types';
import { DEMO_CONTEXT_FILES, REGISTRY } from './registry';
import {
  EngineError,
  buildImage,
  cloneState,
  connectNetwork,
  createNetwork,
  createVolume,
  describeContainer,
  disconnectNetwork,
  findContainer,
  findImage,
  findNetwork,
  findVolume,
  pullImage,
  removeContainer,
  removeImage,
  removeNetwork,
  removeVolume,
  runContainer,
  setContainerStatus,
} from './engine';

export interface CommandResult extends EngineOutput {
  state: DockerState;
}

const HELP_TEXT = [
  'learnDocker — simulated Docker CLI',
  '',
  'App commands:',
  '  help                 show this help',
  '  levels               list tutorial levels',
  '  sandbox              return to sandbox mode',
  '  reset                reset daemon state for current mode',
  '  undo                 undo last successful command',
  '  clear                clear terminal output',
  '',
  'Docker commands (simulated):',
  '  docker pull <image>',
  '  docker images',
  '  docker run [opts] <image> [cmd]',
  '       -d  --rm  --name N  -p host:ctr  -v vol:path  --network net  -e K=V',
  '  docker ps [-a]',
  '  docker start|stop|restart|rm [-f] <id|name>',
  '  docker rmi <image>',
  '  docker build -t <tag> .',
  '  docker volume create|ls|rm <name>',
  '  docker network create|ls|rm|connect|disconnect <net> [ctr]',
  '  docker inspect <id|name>',
  '  docker logs <id|name>',
  '',
  'Registry images available:',
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

function psTable(containers: DockerState['containers'], all: boolean): string[] {
  const rows = containers.filter((c) => all || c.status === 'running');
  if (rows.length === 0) {
    return ['CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS   NAMES'];
  }
  const header = 'CONTAINER ID   IMAGE                 COMMAND                 CREATED        STATUS          PORTS                   NAMES';
  const body = rows.map((c) => {
    const ports = c.ports
      .map((p) => `0.0.0.0:${p.hostPort}->${p.containerPort}/${p.protocol}`)
      .join(', ');
    return [
      c.id.slice(0, 12).padEnd(14),
      c.image.padEnd(21),
      `"${c.command}"`.slice(0, 23).padEnd(23),
      '1 min ago'.padEnd(14),
      statusLabel(c).padEnd(15),
      ports.padEnd(23),
      c.name,
    ].join(' ');
  });
  return [header, ...body];
}

function statusLabel(c: DockerState['containers'][number]): string {
  if (c.status === 'running') return 'Up 1 minute';
  if (c.status === 'exited') return `Exited (${c.exitCode ?? 0})`;
  return c.status;
}

function imagesTable(images: DockerState['images']): string[] {
  if (images.length === 0) {
    return ['REPOSITORY   TAG       IMAGE ID   CREATED   SIZE'];
  }
  const header = 'REPOSITORY          TAG             IMAGE ID       CREATED        SIZE';
  const body = images.map((img) =>
    [
      img.repo.padEnd(19),
      img.tag.padEnd(15),
      img.imageId.replace('sha256:', '').slice(0, 12).padEnd(14),
      '1 minute ago'.padEnd(14),
      formatSize(img.sizeKb),
    ].join(' '),
  );
  return [header, ...body];
}

function formatSize(kb: number): string {
  if (kb >= 1_000_000) return `${(kb / 1_000_000).toFixed(2)}GB`;
  if (kb >= 1_000) return `${(kb / 1_000).toFixed(2)}MB`;
  return `${kb}kB`;
}

interface RunFlagOptions {
  name?: string;
  detach: boolean;
  removeOnExit: boolean;
  ports: Array<{ hostPort: number; containerPort: number; protocol: 'tcp' | 'udp' }>;
  volumes: Array<{ volume: string; path: string }>;
  network?: string;
  env: Record<string, string>;
  command?: string[];
}

function parseRunFlags(tokens: string[]): {
  options: RunFlagOptions;
  image?: string;
  rest: string[];
} {
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
        const hostPort = Number(host);
        const containerPort = Number(ctr ?? host);
        if (!Number.isFinite(hostPort) || !Number.isFinite(containerPort)) {
          throw new EngineError(`docker: invalid publish format: ${spec}`);
        }
        options.ports.push({ hostPort, containerPort, protocol: 'tcp' });
        i += 2;
      } else if (t === '-v' || t === '--volume') {
        const spec = tokens[i + 1] ?? '';
        const parts = spec.split(':');
        if (parts.length < 2) {
          throw new EngineError(`docker: invalid volume spec: ${spec}`);
        }
        options.volumes.push({ volume: parts[0], path: parts.slice(1).join(':') });
        i += 2;
      } else if (t === '--network') {
        options.network = tokens[i + 1];
        i += 2;
      } else if (t === '-e' || t === '--env') {
        const spec = tokens[i + 1] ?? '';
        const eq = spec.indexOf('=');
        if (eq === -1) {
          throw new EngineError(`docker: invalid env format: ${spec}`);
        }
        options.env[spec.slice(0, eq)] = spec.slice(eq + 1);
        i += 2;
      } else if (t.startsWith('-')) {
        // ignore unknown flags like -it
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
    options: {
      ...options,
      command: rest.length > 0 ? rest : undefined,
    },
    image,
    rest,
  };
}

export function executeCommand(
  rawInput: string,
  state: DockerState,
): CommandResult {
  const input = rawInput.trim();
  if (!input) {
    return ok(state, []);
  }

  const tokens = tokenize(input);
  const root = tokens[0];

  try {
    if (root === 'help') {
      return ok(state, HELP_TEXT);
    }
    if (root === 'clear') {
      return ok(state, [], { mode: undefined });
    }
    if (root === 'docker') {
      return executeDocker(tokens.slice(1), state);
    }
    if (root === 'echo') {
      return ok(state, [tokens.slice(1).join(' ')]);
    }
    return fail(state, [
      `bash: ${root}: command not found`,
      "Type 'help' to see learnDocker commands.",
    ]);
  } catch (err) {
    const message = err instanceof EngineError ? err.message : String(err);
    return fail(state, [message]);
  }
}

function executeDocker(args: string[], state: DockerState): CommandResult {
  if (args.length === 0) {
    return ok(state, [
      'Usage:  docker [OPTIONS] COMMAND',
      "Run 'docker help' for more information.",
    ]);
  }

  const cmd = args[0];
  const rest = args.slice(1);

  switch (cmd) {
    case 'help':
      return ok(state, HELP_TEXT);

    case 'pull': {
      const name = rest[0];
      if (!name) {
        return fail(state, ['"docker pull" requires at least 1 argument.']);
      }
      const already = findImage(state, name.includes(':') ? name : `${name}:latest`);
      if (already) {
        return ok(state, [
          `${already.name}: Pulling from ${already.repo}`,
          `Digest: sha256:deadbeef`,
          `Status: Image is up to date for ${already.name}`,
          already.name,
        ]);
      }
      const next = pullImage(state, name);
      const img = next.images[next.images.length - 1];
      return ok(next, [
        `${img.name}: Pulling from ${img.repo}`,
        ...img.layers.map((l) => `${l.id.slice(-12)}: Pull complete`),
        `Digest: sha256:${img.imageId.replace('sha256:', '')}dead`,
        `Status: Downloaded newer image for ${img.name}`,
        img.name,
      ]);
    }

    case 'images': {
      return ok(state, imagesTable(state.images));
    }

    case 'ps': {
      const all = rest.includes('-a') || rest.includes('--all');
      return ok(state, psTable(state.containers, all));
    }

    case 'run': {
      const parsed = parseRunFlags(rest);
      if (!parsed.image) {
        return fail(state, [
          '"docker run" requires at least 1 argument: the image name.',
        ]);
      }
      const { state: next, container } = runContainer(state, parsed.image, parsed.options);
      const lines: string[] = [];
      if (container.image.startsWith('hello-world') || container.command.includes('Hello from Docker')) {
        lines.push(
          'Hello from Docker!',
          'This message shows that your installation appears to be working correctly.',
        );
      }
      if (parsed.options.detach) {
        lines.push(container.id);
      } else if (container.status === 'exited' && container.image.startsWith('hello-world')) {
        // printed above
      } else if (!parsed.options.detach) {
        lines.push(
          `docker: attached to ${container.name} (${container.id})`,
          `status=${container.status}`,
        );
      }
      return ok(next, lines);
    }

    case 'start':
    case 'stop':
    case 'restart': {
      const refs = rest.filter((t) => !t.startsWith('-'));
      if (refs.length === 0) {
        return fail(state, [`"docker ${cmd}" requires a container reference.`]);
      }
      let next = cloneState(state);
      for (const ref of refs) {
        if (cmd === 'stop') {
          next = setContainerStatus(next, ref, 'exited', 0);
        } else if (cmd === 'start') {
          next = setContainerStatus(next, ref, 'running');
        } else {
          next = setContainerStatus(next, ref, 'exited', 0);
          next = setContainerStatus(next, ref, 'running');
        }
      }
      return ok(next, refs);
    }

    case 'rm': {
      const force = rest.includes('-f') || rest.includes('--force');
      const refs = rest.filter((t) => !t.startsWith('-'));
      if (refs.length === 0) {
        return fail(state, ['"docker rm" requires at least 1 argument.']);
      }
      let next = cloneState(state);
      const removed: string[] = [];
      for (const ref of refs) {
        next = removeContainer(next, ref, force);
        removed.push(ref);
      }
      return ok(next, removed);
    }

    case 'rmi': {
      const name = rest.filter((t) => !t.startsWith('-'))[0];
      if (!name) {
        return fail(state, ['"docker rmi" requires an image reference.']);
      }
      const next = removeImage(state, name);
      return ok(next, [`Untagged: ${name}`, `Deleted: ${name}`]);
    }

    case 'build': {
      let tag = 'anonymous:latest';
      const restFlags = rest.filter((t) => !t.startsWith('-'));
      const tagIdx = rest.indexOf('-t') !== -1 ? rest.indexOf('-t') : rest.indexOf('--tag');
      if (tagIdx !== -1 && rest[tagIdx + 1]) {
        tag = rest[tagIdx + 1];
      } else if (restFlags.length && restFlags[restFlags.length - 1] !== '.') {
        const maybe = restFlags.find((t) => t !== '.');
        if (maybe && maybe !== '.') tag = maybe;
      }
      const dockerfile = DEMO_CONTEXT_FILES['Dockerfile'].split('\n').filter(Boolean);
      const { state: next, image, log } = buildImage(state, tag, dockerfile);
      return ok(next, [...log, `Built image ${image.name} with ${image.layers.length} layers`]);
    }

    case 'volume': {
      const sub = rest[0];
      if (sub === 'ls' || sub === 'list') {
        if (state.volumes.length === 0) {
          return ok(state, ['DRIVER    VOLUME NAME']);
        }
        return ok(state, [
          'DRIVER    VOLUME NAME',
          ...state.volumes.map((v) => `local     ${v.name}`),
        ]);
      }
      if (sub === 'create') {
        const name = rest[1];
        if (!name) {
          return fail(state, ['"docker volume create" requires a name.']);
        }
        const next = createVolume(state, name);
        return ok(next, [name]);
      }
      if (sub === 'rm') {
        const name = rest[1];
        if (!name) {
          return fail(state, ['"docker volume rm" requires a name.']);
        }
        const next = removeVolume(state, name);
        return ok(next, [name]);
      }
      return fail(state, [`Unknown volume subcommand: ${sub}`]);
    }

    case 'network': {
      const sub = rest[0];
      if (sub === 'ls' || sub === 'list') {
        return ok(state, [
          'NETWORK ID     NAME      DRIVER    SCOPE',
          ...state.networks.map((n, i) =>
            `${String(1000 + i).padEnd(14)} ${n.name.padEnd(10)}${n.driver.padEnd(10)}local`,
          ),
        ]);
      }
      if (sub === 'create') {
        const name = rest.find((t, i) => i > 0 && !t.startsWith('-') && t !== 'bridge');
        // rest: create [--driver bridge] name
        const nameToken = rest.filter((t, i) => i > 0 && !t.startsWith('-')).pop();
        if (!nameToken) {
          return fail(state, ['"docker network create" requires a name.']);
        }
        const next = createNetwork(state, name || nameToken);
        return ok(next, [next.networks[next.networks.length - 1].name]);
      }
      if (sub === 'rm') {
        const name = rest[1];
        if (!name) {
          return fail(state, ['"docker network rm" requires a name.']);
        }
        const next = removeNetwork(state, name);
        return ok(next, [name]);
      }
      if (sub === 'connect') {
        const net = rest[1];
        const ctr = rest[2];
        if (!net || !ctr) {
          return fail(state, ['Usage: docker network connect <network> <container>']);
        }
        const next = connectNetwork(state, net, ctr);
        return ok(next, [`${ctr} connected to ${net}`]);
      }
      if (sub === 'disconnect') {
        const net = rest[1];
        const ctr = rest[2];
        if (!net || !ctr) {
          return fail(state, ['Usage: docker network disconnect <network> <container>']);
        }
        const next = disconnectNetwork(state, net, ctr);
        return ok(next, [`${ctr} disconnected from ${net}`]);
      }
      return fail(state, [`Unknown network subcommand: ${sub}`]);
    }

    case 'inspect': {
      const ref = rest.filter((t) => !t.startsWith('-'))[0];
      if (!ref) {
        return fail(state, ['"docker inspect" requires a reference.']);
      }
      const c = findContainer(state, ref);
      if (c) {
        return ok(state, [describeContainer(c)]);
      }
      const img = findImage(state, ref);
      if (img) {
        return ok(state, [
          `Id: ${img.imageId}`,
          `Name: ${img.name}`,
          `Layers: ${img.layers.length}`,
          ...img.layers.map((l, i) => `  ${i + 1}. ${l.instruction} (${formatSize(l.sizeKb)})`),
          `Size: ${formatSize(img.sizeKb)}`,
        ]);
      }
      const vol = findVolume(state, ref);
      if (vol) {
        return ok(state, [
          `Name: ${vol.name}`,
          `Driver: local`,
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

    case 'logs': {
      const ref = rest.filter((t) => !t.startsWith('-'))[0];
      if (!ref) {
        return fail(state, ['"docker logs" requires a container reference.']);
      }
      const c = findContainer(state, ref);
      if (!c) {
        return fail(state, [`Error: No such container: ${ref}`]);
      }
      const lines: string[] = [];
      if (c.image.startsWith('hello-world')) {
        lines.push('Hello from Docker!');
      }
      for (const [path, content] of Object.entries(c.volumeData)) {
        lines.push(`${path}: ${content}`);
      }
      if (lines.length === 0) {
        lines.push(`(no output from ${c.name})`);
      }
      return ok(state, lines);
    }

    case 'version':
      return ok(state, [
        'Client: learnDocker Engine - Community',
        ' Version:           0.1.0-simulated',
        ' API version:       1.43',
        ' Go version:        n/a (TypeScript simulator)',
        ' Git commit:        learndocker',
      ]);

    default:
      return fail(state, [
        `docker: '${cmd}' is not a docker command.`,
        "See 'docker --help'.",
      ]);
  }
}
