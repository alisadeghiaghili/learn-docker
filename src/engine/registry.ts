import type { ComposeProject, ImageLayer, RegistryImage } from './types';

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
    vulns: { critical: 0, high: 0, medium: 0 },
  },
  {
    name: 'alpine:3.20',
    repo: 'alpine',
    tag: '3.20',
    sizeKb: 7_800,
    description: 'Minimal Linux distribution. Common base image.',
    layers: layers(['ADD alpine-minirootfs.tar.gz /', 7_800]),
    vulns: { critical: 0, high: 0, medium: 1 },
  },
  {
    name: 'nginx:1.25',
    repo: 'nginx',
    tag: '1.25',
    sizeKb: 68_000,
    description: 'Web server. Exposes port 80. Often runs as root unless reconfigured.',
    layers: layers(
      ['FROM alpine:3.20', 7_800],
      ['RUN apk add nginx', 52_000],
      ['COPY nginx.conf /etc/nginx/nginx.conf', 400],
      ['EXPOSE 80', 10],
      ['CMD ["nginx", "-g", "daemon off;"]', 20],
    ),
    vulns: { critical: 0, high: 2, medium: 6 },
    user: 'root',
  },
  {
    name: 'redis:7',
    repo: 'redis',
    tag: '7',
    sizeKb: 42_000,
    description: 'In-memory key-value store. Exposes 6379.',
    layers: layers(
      ['FROM debian:bookworm-slim', 30_000],
      ['RUN apt-get install redis', 12_000],
      ['EXPOSE 6379', 10],
      ['CMD ["redis-server"]', 10],
    ),
    vulns: { critical: 0, high: 1, medium: 4 },
    user: 'redis',
  },
  {
    name: 'postgres:16',
    repo: 'postgres',
    tag: '16',
    sizeKb: 155_000,
    description: 'PostgreSQL. Exposes 5432. Expects /var/lib/postgresql/data.',
    layers: layers(
      ['FROM debian:bookworm-slim', 30_000],
      ['RUN apt-get install postgresql', 120_000],
      ['VOLUME /var/lib/postgresql/data', 10],
      ['EXPOSE 5432', 10],
      ['CMD ["postgres"]', 20],
    ),
    vulns: { critical: 0, high: 3, medium: 9 },
    user: 'postgres',
  },
  {
    name: 'node:20-alpine',
    repo: 'node',
    tag: '20-alpine',
    sizeKb: 130_000,
    description: 'Node.js on Alpine. Good for multi-stage builds.',
    layers: layers(
      ['FROM alpine:3.20', 7_800],
      ['RUN apk add nodejs', 120_000],
      ['CMD ["node"]', 20],
    ),
    vulns: { critical: 0, high: 1, medium: 3 },
  },
  {
    name: 'node:20',
    repo: 'node',
    tag: '20',
    sizeKb: 380_000,
    description: 'Full Node.js image — larger attack surface and size.',
    layers: layers(
      ['FROM debian:bookworm', 40_000],
      ['RUN apt-get install nodejs npm', 330_000],
      ['CMD ["node"]', 20],
    ),
    vulns: { critical: 1, high: 5, medium: 14 },
    user: 'root',
  },
  {
    name: 'busybox:1.36',
    repo: 'busybox',
    tag: '1.36',
    sizeKb: 2_200,
    description: 'Swiss-army userland. Tiny for probes and debug.',
    layers: layers(['ADD busybox /bin/busybox', 2_200]),
    vulns: { critical: 0, high: 0, medium: 0 },
  },
];

export const DEMO_DOCKERFILE = [
  'FROM alpine:3.20',
  'RUN apk add --no-cache curl',
  'WORKDIR /app',
  'COPY app.js /app/app.js',
  'ENV APP_ENV=prod',
  'EXPOSE 3000',
  'CMD ["node", "app.js"]',
].join('\n');

export const MULTISTAGE_DOCKERFILE = [
  '# syntax=docker/dockerfile:1',
  'FROM node:20-alpine AS builder',
  'WORKDIR /src',
  'COPY package*.json ./',
  'RUN npm ci --omit=dev',
  'COPY . .',
  'RUN npm run build && npm prune --omit=dev',
  '',
  'FROM alpine:3.20 AS runtime',
  'RUN adduser -D app',
  'WORKDIR /app',
  'COPY --from=builder /src/dist ./dist',
  'COPY --from=builder /src/node_modules ./node_modules',
  'USER app',
  'EXPOSE 3000',
  'HEALTHCHECK --interval=30s CMD wget -qO- http://127.0.0.1:3000/health || exit 1',
  'CMD ["node", "dist/server.js"]',
].join('\n');

export const DEMO_CONTEXT_FILES: Record<string, string> = {
  'Dockerfile': DEMO_DOCKERFILE + '\n',
  'app.js': 'console.log("learnDocker demo app");\n',
  'docker-compose.yml': [
    'services:',
    '  web:',
    '    image: nginx:1.25',
    '    ports:',
    '      - "8080:80"',
    '    networks: [app-net]',
    '    depends_on: [db]',
    '  db:',
    '    image: postgres:16',
    '    volumes:',
    '      - pgdata:/var/lib/postgresql/data',
    '    environment:',
    '      POSTGRES_PASSWORD: demo',
    '    networks: [app-net]',
    '  cache:',
    '    image: redis:7',
    '    networks: [app-net]',
    'networks:',
    '  app-net:',
    'volumes:',
    '  pgdata:',
    '',
  ].join('\n'),
};

export const DEMO_COMPOSE: ComposeProject = {
  name: 'learndocker',
  services: [
    {
      name: 'web',
      image: 'nginx:1.25',
      ports: [{ host: 8080, target: 80 }],
      networks: ['app-net'],
      depends_on: ['db'],
    },
    {
      name: 'db',
      image: 'postgres:16',
      volumes: [{ source: 'pgdata', target: '/var/lib/postgresql/data' }],
      environment: { POSTGRES_PASSWORD: 'demo' },
      networks: ['app-net'],
      healthcheck: 'pg_isready',
    },
    {
      name: 'cache',
      image: 'redis:7',
      networks: ['app-net'],
    },
  ],
  networks: ['app-net'],
  volumes: ['pgdata'],
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
