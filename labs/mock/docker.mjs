/**
 * Mock Docker CLI for lab-script CI — NOT a substitute for a real daemon.
 * Authenticity scorecard must use real `docker` only (see labs/SCORECARD.md).
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const STATE_DIR = process.env.LEARNDOCKER_MOCK_STATE || join(tmpdir(), 'learndocker-mock');
mkdirSync(STATE_DIR, { recursive: true });
const STATE_FILE = join(STATE_DIR, 'state.json');

function load() {
  if (!existsSync(STATE_FILE)) {
    return {
      images: [],
      containers: [],
      volumes: [],
      networks: ['bridge', 'host', 'none'],
      loggedIn: [],
      log: [],
    };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function save(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function log(state, line) {
  state.log.push(line);
  return line;
}

function out(state, ...lines) {
  for (const l of lines) {
    process.stdout.write(l + '\n');
  }
  save(state);
}

function short() {
  return Math.random().toString(16).slice(2, 14);
}

function parseArgs(argv) {
  return argv.slice(2);
}

const args = parseArgs(process.argv);
const cmd = args[0] || '';
const rest = args.slice(1);
const state = load();

function nameArg(tokens) {
  return tokens.find((t) => !t.startsWith('-') && t !== '.');
}

function flagValue(tokens, flag) {
  const i = tokens.indexOf(flag);
  return i >= 0 ? tokens[i + 1] : undefined;
}

switch (cmd) {
  case 'info':
  case 'version': {
    if (cmd === 'version') {
      out(
        state,
        'Client: Docker Engine (MOCK)',
        ' Version:           29.8.0-mock',
        ' API version:       1.56',
        ' OS/Arch:           windows/amd64',
        'Server: Docker Engine (MOCK)',
        ' Version:           29.8.0-mock',
      );
    } else {
      out(
        state,
        'Client: Docker Engine (MOCK)',
        'Server: Docker Engine (MOCK)',
        ' Containers: ' + state.containers.length,
        ' Images: ' + state.images.length,
      );
    }
    break;
  }

  case 'pull': {
    const name = nameArg(rest) || 'hello-world:latest';
    const img = name.includes(':') ? name : `${name}:latest`;
    if (!state.images.some((i) => i.name === img)) {
      state.images.push({ name: img, id: short(), digests: [`${img}@sha256:${short()}`] });
    }
    out(
      state,
      `${img}: Pulling from mock`,
      `Digest: sha256:${short()}`,
      `Status: Downloaded newer image for ${img}`,
      img,
    );
    break;
  }

  case 'images': {
    out(state, 'REPOSITORY   TAG       IMAGE ID      CREATED        SIZE');
    for (const i of state.images) {
      out(state, `${i.name}   ${i.id.slice(0, 12)}   1 minute ago   7MB`);
    }
    break;
  }

  case 'run': {
    const image = nameArg(rest.filter((t, i, a) => {
      // last non-flag that looks like image after flags — simplified: first name with : or after --name block
      return !t.startsWith('-') && a[i - 1] !== '--name' && a[i - 1] !== '-p' && a[i - 1] !== '-v' && a[i - 1] !== '-e' && a[i - 1] !== '--network' && a[i - 1] !== '--health-cmd' && a[i - 1] !== '--health-interval';
    })) || 'alpine:3.20';
    const cname = flagValue(rest, '--name') || `c${short().slice(0, 6)}`;
    const hasImage = state.images.some((i) => i.name === image || i.name.startsWith(image.split(':')[0]));
    if (!hasImage) {
      state.images.push({ name: image, id: short(), digests: [] });
    }
    const ports = [];
    const pi = rest.indexOf('-p');
    if (pi >= 0 && rest[pi + 1]) {
      const [h, c] = String(rest[pi + 1]).split(':');
      ports.push(`${h}->${c}`);
    }
    const detach = rest.includes('-d') || rest.includes('--detach') || rest.includes('--rm');
    const exists = state.containers.find((c) => c.name === cname);
    if (exists) {
      process.stderr.write(
        `docker: Error response from daemon: Conflict. The container name "/${cname}" is already in use.\n`,
      );
      process.exit(1);
    }
    const id = short();
    state.containers.push({
      id,
      name: cname,
      image,
      status: 'running',
      ports,
      network: flagValue(rest, '--network') || 'bridge',
    });
    if (detach) out(state, id);
    else out(state, 'Hello from Docker! (mock)', id);
    break;
  }

  case 'ps': {
    out(state, 'CONTAINER ID   IMAGE     COMMAND   STATUS   NAMES');
    for (const c of state.containers) {
      out(state, `${c.id.slice(0, 12)}   ${c.image}   ${c.status}   ${c.name}`);
    }
    break;
  }

  case 'stop':
  case 'start': {
    for (const t of rest.filter((x) => !x.startsWith('-'))) {
      const c = state.containers.find((x) => x.name === t || x.id.startsWith(t));
      if (c) c.status = cmd === 'stop' ? 'exited' : 'running';
    }
    out(state, ...rest.filter((x) => !x.startsWith('-')));
    break;
  }

  case 'rm': {
    const force = rest.includes('-f');
    for (const t of rest.filter((x) => !x.startsWith('-'))) {
      const c = state.containers.find((x) => x.name === t || x.id.startsWith(t));
      if (!c) continue;
      if (c.status === 'running' && !force) {
        process.stderr.write(`Error: cannot remove a running container ${c.id}\n`);
        process.exit(1);
      }
      state.containers = state.containers.filter((x) => x.id !== c.id);
    }
    out(state);
    break;
  }

  case 'exec': {
    const target = rest.find((t) => !t.startsWith('-'));
    const c = state.containers.find((x) => x.name === target || x.id.startsWith(target || ''));
    if (!c) {
      process.stderr.write(`Error: No such container: ${target}\n`);
      process.exit(1);
    }
    const command = rest.slice(rest.indexOf(target) + 1);
    const joined = command.join(' ');
    if (joined.includes('whoami')) out(state, 'root');
    else if (joined.includes('uname')) out(state, 'Linux mock 6.0.0');
    else if (joined.includes('cat')) out(state, 'persisted');
    else if (joined.includes('ping')) out(state, `PING ${command[command.length - 1]}: 1 packets transmitted`);
    else if (joined.includes('curl') || joined.includes('wget')) out(state, 'HTTP/1.1 200 OK');
    else out(state, `(mock exec) ${joined}`);
    break;
  }

  case 'logs': {
    out(state, `mock log line for ${nameArg(rest) || 'container'}`);
    break;
  }

  case 'inspect': {
    const ref = nameArg(rest);
    const c = state.containers.find((x) => x.name === ref || x.id.startsWith(ref || ''));
    const img = state.images.find((x) => x.name === ref);
    if (c) {
      out(
        state,
        JSON.stringify(
          {
            Name: '/' + c.name,
            Image: c.image,
            State: { Status: c.status, Health: { Status: 'healthy' } },
            NetworkSettings: { Ports: c.ports },
          },
          null,
          2,
        ),
      );
    } else if (img) {
      out(
        state,
        JSON.stringify(
          {
            Id: img.id,
            RepoTags: [img.name],
            RepoDigests: img.digests.length ? img.digests : [`${img.name}@sha256:${img.id}`],
          },
          null,
          2,
        ),
      );
    } else {
      process.stderr.write(`Error: No such object: ${ref}\n`);
      process.exit(1);
    }
    break;
  }

  case 'build': {
    const tag = flagValue(rest, '-t') || flagValue(rest, '--tag') || 'app:latest';
    if (!state.images.some((i) => i.name === tag)) {
      state.images.push({ name: tag, id: short(), digests: [] });
    }
    out(state, 'Step 1/1 : FROM alpine:3.20', 'Successfully tagged ' + tag, 'Successfully built ' + short());
    break;
  }

  case 'history': {
    out(state, 'IMAGE          CREATED BY                          SIZE');
    out(state, 'mock           FROM alpine:3.20                    7MB');
    break;
  }

  case 'volume': {
    if (rest[0] === 'create') {
      const n = rest[1];
      if (n && !state.volumes.includes(n)) state.volumes.push(n);
      out(state, n || 'vol');
    } else if (rest[0] === 'rm') {
      state.volumes = state.volumes.filter((v) => v !== rest[1]);
      out(state, rest[1]);
    } else {
      out(state, 'DRIVER    VOLUME NAME', ...state.volumes.map((v) => 'local     ' + v));
    }
    break;
  }

  case 'network': {
    if (rest[0] === 'create') {
      const n = rest.find((t, i) => i > 0 && !t.startsWith('-'));
      if (n && !state.networks.includes(n)) state.networks.push(n);
      out(state, n);
    } else if (rest[0] === 'rm') {
      state.networks = state.networks.filter((x) => x !== rest[1]);
      out(state, rest[1]);
    } else {
      out(state, 'NETWORK ID      NAME      DRIVER');
      state.networks.forEach((n, i) => out(state, `${1000 + i}   ${n}   bridge`));
    }
    break;
  }

  case 'port': {
    out(state, '80/tcp -> 0.0.0.0:18080');
    break;
  }

  case 'image': {
    if (rest[0] === 'inspect') {
      const ref = nameArg(rest.slice(1));
      const img = state.images.find((x) => x.name === ref);
      if (!img) {
        process.stderr.write(`Error: No such image: ${ref}\n`);
        process.exit(1);
      }
      out(state, JSON.stringify([{ RepoDigests: img.digests.length ? img.digests : [`${img.name}@sha256:${img.id}`] }], null, 2));
    } else out(state);
    break;
  }

  case 'login': {
    state.loggedIn.push(nameArg(rest) || 'docker.io');
    out(state, 'Login Succeeded');
    break;
  }

  case 'tag': {
    const src = rest[0];
    const dst = rest[1];
    const img = state.images.find((i) => i.name === src);
    if (!img) {
      process.stderr.write(`Error: No such image: ${src}\n`);
      process.exit(1);
    }
    state.images.push({ ...img, name: dst, id: img.id });
    out(state, dst);
    break;
  }

  case 'push': {
    out(state, 'The push refers to repository [mock]', 'latest: digest: sha256:' + short() + ' size: 100');
    break;
  }

  default:
    process.stderr.write(`docker: '${cmd}' is not a docker command (MOCK)\n`);
    process.exit(1);
}

save(state);
