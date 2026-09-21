import type { ImageLayer, RegistryImage } from './types';

function layers(...specs: Array<[string, number]>): ImageLayer[] {
  return specs.map(([instruction, sizeKb], index) => ({
    id: `L${index + 1}`,
    instruction,
    sizeKb,
  }));
}

export const REGISTRY: RegistryImage[] = [
  {
    name: 'hello-world:latest',
    repo: 'hello-world',
    tag: 'latest',
    sizeKb: 2_500,
    description: 'Tiny image that prints a hello message and exits.',
    layers: layers(['ADD rootfs.tar.gz /', 2_500]),
  },
  {
    name: 'alpine:3.20',
    repo: 'alpine',
    tag: '3.20',
    sizeKb: 7_800,
    description: 'Minimal Linux distribution. Common base image.',
    layers: layers(['ADD alpine-minirootfs.tar.gz /', 7_800]),
  },
  {
    name: 'nginx:1.25',
    repo: 'nginx',
    tag: '1.25',
    sizeKb: 68_000,
    description: 'Web server. Exposes port 80.',
    layers: layers(
      ['FROM alpine:3.20', 7_800],
      ['RUN apk add nginx', 52_000],
      ['COPY nginx.conf /etc/nginx/nginx.conf', 400],
      ['EXPOSE 80', 10],
      ['CMD ["nginx", "-g", "daemon off;"]', 20],
    ),
  },
  {
    name: 'redis:7',
    repo: 'redis',
    tag: '7',
    sizeKb: 42_000,
    description: 'In-memory key-value store. Exposes port 6379.',
    layers: layers(
      ['FROM debian:bookworm-slim', 30_000],
      ['RUN apt-get install redis', 12_000],
      ['EXPOSE 6379', 10],
      ['CMD ["redis-server"]', 10],
    ),
  },
  {
    name: 'postgres:16',
    repo: 'postgres',
    tag: '16',
    sizeKb: 155_000,
    description: 'PostgreSQL database. Exposes port 5432. Expects /var/lib/postgresql/data.',
    layers: layers(
      ['FROM debian:bookworm-slim', 30_000],
      ['RUN apt-get install postgresql', 120_000],
      ['VOLUME /var/lib/postgresql/data', 10],
      ['EXPOSE 5432', 10],
      ['CMD ["postgres"]', 20],
    ),
  },
  {
    name: 'node:20-alpine',
    repo: 'node',
    tag: '20-alpine',
    sizeKb: 130_000,
    description: 'Node.js runtime on Alpine.',
    layers: layers(
      ['FROM alpine:3.20', 7_800],
      ['RUN apk add nodejs', 120_000],
      ['CMD ["node"]', 20],
    ),
  },
];

/** Default Dockerfile available in the simulated build context. */
export const DEMO_DOCKERFILE = [
  'FROM alpine:3.20',
  'RUN apk add --no-cache curl',
  'WORKDIR /app',
  'COPY app.js /app/app.js',
  'ENV APP_ENV=prod',
  'EXPOSE 3000',
  'CMD ["node", "app.js"]',
];

export const DEMO_CONTEXT_FILES: Record<string, string> = {
  'Dockerfile': DEMO_DOCKERFILE.join('\n') + '\n',
  'app.js': 'console.log("learnDocker demo app");\n',
};

export function findRegistryImage(name: string): RegistryImage | undefined {
  const normalized = name.includes(':') ? name : `${name}:latest`;
  return REGISTRY.find((img) => img.name === normalized);
}

export function splitImageName(name: string): { repo: string; tag: string } {
  const idx = name.lastIndexOf(':');
  if (idx <= 0 || name.includes('/', idx)) {
    return { repo: name, tag: 'latest' };
  }
  return { repo: name.slice(0, idx), tag: name.slice(idx + 1) };
}
