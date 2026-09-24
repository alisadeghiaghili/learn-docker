/**
 * Rubric / essay assessment + spaced review prompts.
 * Scored by self-grade against a key (0-2 per bullet) — not machine ABC.
 */
export interface RubricQuestion {
  id: string;
  pack: string;
  prompt: string;
  /** Minimum bullets the learner should hit (each worth 1). */
  keyPoints: string[];
  /** 0-2 overall target */
  passScore: number;
}

export const RUBRIC_QUESTIONS: RubricQuestion[] = [
  {
    id: 'r-image-container',
    pack: 'Basics',
    prompt:
      'In 6–8 sentences, explain to a junior: what is an image, what is a container, and where does a file write go if nothing is mounted? What happens to that write after docker rm?',
    keyPoints: [
      'Image = immutable layered template + config',
      'Container = isolated process instance + writable layer',
      'Unmounted writes hit the writable layer (copy-up)',
      'docker rm destroys writable layer; volumes survive',
      'Many containers can share one imageId',
    ],
    passScore: 4,
  },
  {
    id: 'r-build-cache',
    pack: 'Build',
    prompt:
      'Your Dockerfile starts with COPY . . then RUN npm ci. Every source change takes 8 minutes. Explain the root cause and rewrite the first instructions. Why does order matter for cache?',
    keyPoints: [
      'Cache invalidates from first changed instruction onward',
      'COPY . . busts cache on any source edit',
      'Copy lockfile first, install deps, then copy source',
      'Expensive stable steps stay early',
      'Optional: BuildKit cache mounts',
    ],
    passScore: 4,
  },
  {
    id: 'r-multistage',
    pack: 'Build',
    prompt: 'Why does multi-stage build shrink the runtime image and reduce CVEs? What exactly is discarded?',
    keyPoints: [
      'Only final stage is exported as the tagged image',
      'Builder toolchains/compilers/npm cache discarded',
      'COPY --from=builder moves artifacts only',
      'Smaller pull and smaller package inventory',
      'USER/HEALTHCHECK belong in runtime stage',
    ],
    passScore: 4,
  },
  {
    id: 'r-dns-compose',
    pack: 'Compose',
    prompt:
      'web cannot reach db. Both are Up. Walk your diagnosis like an on-call engineer (4 steps max) and name the correct client URL form inside web.',
    keyPoints: [
      'Confirm both on same user-defined network',
      'Use service name DNS (http://db:5432), not localhost',
      'docker network inspect / docker inspect Networks',
      'connect/re-run with --network if split',
      'depends_on is not readiness (bonus)',
    ],
    passScore: 4,
  },
  {
    id: 'r-volumes',
    pack: 'Data',
    prompt: 'Compare writable layer, named volume, bind mount for a Postgres data dir. Which do you pick and why? What breaks with the wrong choice?',
    keyPoints: [
      'Writable layer dies with container — wrong for DB',
      'Named volume survives rm, portable, managed',
      'Bind mount couples to host UID/paths',
      'Postgres needs persistent data at /var/lib/postgresql/data',
      'down -v deletes named volumes — intentional footgun',
    ],
    passScore: 4,
  },
  {
    id: 'r-expose-publish',
    pack: 'Networks',
    prompt: 'A teammate says EXPOSE 80 makes the app public. Correct them precisely and show the command that actually publishes host 8080.',
    keyPoints: [
      'EXPOSE is documentation/metadata only',
      'Publish requires -p host:container',
      'Correct: -p 8080:80',
      'Container port is private to its netns until published',
      'HOST:CONTAINER order',
    ],
    passScore: 4,
  },
  {
    id: 'r-security',
    pack: 'Security',
    prompt:
      'Give a 5-line production default for running a web app image (user, rootfs, caps, secrets, base). Explain one reason for each.',
    keyPoints: [
      'USER non-root',
      '--read-only + tmpfs where writes required',
      'cap-drop ALL / no-new-privileges',
      'Secrets at runtime (env_file/secret mount), never Dockerfile ENV',
      'Slim/distroless base + scan gate',
    ],
    passScore: 4,
  },
  {
    id: 'r-registry-gate',
    pack: 'Registry',
    prompt:
      'Describe your release gate for an image in order (min 6 steps). Why not deploy :latest?',
    keyPoints: [
      'Build multi-stage from explicit base tag/digest',
      'Scan, SBOM',
      'Sign, verify identity',
      'Tag qualified version (not latest)',
      'imagetools inspect platforms',
      'Push to team namespace, deploy by digest',
      'latest is mutable / un-auditable',
    ],
    passScore: 5,
  },
  {
    id: 'r-failure-port',
    pack: 'Failure labs',
    prompt: 'Bind for 0.0.0.0:8080 failed: port is already allocated. Write your runbook (commands + why not prune -a --volumes).',
    keyPoints: [
      'docker ps — find PORTS holder',
      'stop/rm the holder or remap -p 8081:80',
      'Do not delete volumes to fix ports',
      'Stopped containers release ports; running hold them',
      'prune is irreversible and not the first tool',
    ],
    passScore: 4,
  },
  {
    id: 'r-ops-health',
    pack: 'Ops',
    prompt: 'Container shows Up but users get 502. Unhealthy vs dead process: how do you tell, and what do you check first?',
    keyPoints: [
      'Up = process exists; health = probe of readiness',
      'docker inspect Health.Log',
      'docker logs + exec curl the health path',
      'restart policy recovers crashes, not wedge (needs health)',
      'depends_on.condition service_healthy for dependents',
    ],
    passScore: 4,
  },
  {
    id: 'r-namespace-cgroup',
    pack: 'Under the hood',
    prompt: 'One sentence each: namespaces, cgroups, union filesystem. Then: why can two containers share image layers but not writes?',
    keyPoints: [
      'Namespaces isolate views (PID/MNT/NET/…)',
      'cgroups limit resources',
      'Union FS stacks RO layers + upper writable',
      'Shared lower layers immutable',
      'Writes copy-up to per-container upper (whiteout on delete)',
    ],
    passScore: 4,
  },
  {
    id: 'r-capstone-explain',
    pack: 'Capstone',
    prompt:
      'You must ship a 3-service stack (web, db, cache) to a small team server this week. Outline compose layout, data, network, health, logging, image release, and rollback. Max 20 lines.',
    keyPoints: [
      'compose.yaml + prod overrides; no laptop binds in base',
      'Named volume for db; service DNS on app-net',
      'healthcheck on db + condition; app retries',
      'Logs to stdout + rotation',
      'Images built multi-stage, scanned, signed, digest-pinned',
      'Rollout with health gate; rollback = previous digest',
      'Secrets not in git/image',
    ],
    passScore: 6,
  },
];

export interface ReviewItem {
  id: string;
  day: 1 | 7 | 30;
  prompt: string;
}

/** Spaced review queue shipped with progress. */
export const SPACED_REVIEW: ReviewItem[] = [
  { id: 'rv1', day: 1, prompt: 'Without looking: image vs container vs writable layer in 3 sentences.' },
  { id: 'rv2', day: 1, prompt: 'Write a cache-friendly Dockerfile first 5 lines for a Node app.' },
  { id: 'rv3', day: 1, prompt: 'EXPOSE vs -p — one paragraph.' },
  { id: 'rv4', day: 7, prompt: 'Diagnose "name db does not resolve" in 4 commands.' },
  { id: 'rv5', day: 7, prompt: 'Why multi-stage? What is discarded?' },
  { id: 'rv6', day: 7, prompt: 'Named volume vs bind mount for Postgres.' },
  { id: 'rv7', day: 7, prompt: 'depends_on vs service_healthy.' },
  { id: 'rv8', day: 30, prompt: 'Write your image release gate (7 steps).' },
  { id: 'rv9', day: 30, prompt: 'Hardened run flags for a web app (user/ro/caps/secrets).' },
  { id: 'rv10', day: 30, prompt: 'Port already allocated runbook.' },
];

export function reviewDue(solvedCount: number): ReviewItem[] {
  if (solvedCount < 3) return [];
  if (solvedCount < 8) return SPACED_REVIEW.filter((r) => r.day === 1);
  if (solvedCount < 15) return SPACED_REVIEW.filter((r) => r.day <= 7);
  return SPACED_REVIEW;
}
