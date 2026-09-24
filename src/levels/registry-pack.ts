import type { LevelDefinition, QuizQuestion } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

export const REGISTRY_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-tag-mutable',
    pack: 'Registry',
    question: 'What is wrong with deploying alpine:3.20 by tag only in production?',
    choices: [
      'Tags are encrypted and slow',
      'A tag is a mutable pointer — someone can push a different image under the same tag',
      'Tags cannot contain dots',
    ],
    correct: 1,
    explain:
      'Tags are names, not content. 3.20 and latest can move. Pin image@sha256:… when you need the exact bits you tested.',
  },
  {
    id: 'q-digest',
    pack: 'Registry',
    question: 'A digest (sha256:…) uniquely identifies…',
    choices: [
      'The repository name',
      'The exact image manifest content (and thus the config + layer list)',
      'The Dockerfile filename',
    ],
    correct: 1,
    explain:
      'Digests are content addresses of the manifest. Same digest means same artifact bits (within a repo context). Tags resolve to digests at pull time.',
  },
  {
    id: 'q-multiarch',
    pack: 'Registry',
    question: 'A multi-arch (manifest list) image means…',
    choices: [
      'One tag that points to per-platform manifests (amd64/arm64/…)',
      'The image runs on several containers at once',
      'Two Dockerfiles concatenated',
    ],
    correct: 1,
    explain:
      'docker pull --platform linux/arm64 selects the child manifest. Buildx --platform builds multiple and publishes an OCI index.',
  },
  {
    id: 'q-push-auth',
    pack: 'Registry',
    question: 'docker push to docker.io/myuser/app fails with unauthorized. First correct action?',
    choices: [
      'docker system prune',
      'docker login (or a credential helper / token) with rights to that repo',
      'Retag as root:app',
    ],
    correct: 1,
    explain:
      'Push is an authenticated write to a namespace. Login or CI OIDC/robot token. Also confirm the image name includes your user/org.',
  },
  {
    id: 'q-retag',
    pack: 'Registry',
    question: 'docker tag app:1.0 registry.example.com/team/app:1.0 does what?',
    choices: [
      'Copies all layers to a new registry immediately',
      'Adds a new local name pointer to the same image ID (push later copies layers)',
      'Encrypts the image',
    ],
    correct: 1,
    explain:
      'tag is cheap rename/alias to the same imageId. push uploads missing layers + manifest under that name.',
  },
  {
    id: 'q-latest',
    pack: 'Registry',
    question: 'Using :latest in production is risky mainly because…',
    choices: [
      'latest is always slowest',
      'latest is an ordinary mutable tag with no ordering semantics — not “newest” in a reliable way',
      'Docker refuses latest on servers',
    ],
    correct: 1,
    explain:
      'latest is not a version. Prefer semver or git sha tags, and digests for deploy pins. Use latest only for local toys if at all.',
  },
  {
    id: 'q-private-registry',
    pack: 'Registry',
    question: 'Why keep base images / golden images in a private registry or mirror?',
    choices: [
      'Public registries do not support alpine',
      'Rate limits, supply-chain control, air-gapped clusters, and guaranteed availability',
      'Private images cannot have CVEs',
    ],
    correct: 1,
    explain:
      'Hub rate limits and upstream deletion risk are real. Enterprises mirror bases and sign/approve images (Harbor, ECR, Artifactory, …).',
  },
  {
    id: 'q-image-id',
    pack: 'Registry',
    question: 'Two different tags on one machine point to the same IMAGE ID. That means…',
    choices: [
      'One is a compressed copy',
      'They are aliases of the same image object (same config/layers)',
      'One must be deleted',
    ],
    correct: 1,
    explain:
      'IMAGE ID is the local image object identity (config digest in modern Docker). rmi on one tag untags; layers go when no tag/ref remains.',
  },
  {
    id: 'q-pull-platform',
    pack: 'Registry',
    question: 'On an ARM laptop, docker pull --platform linux/amd64 node:20 gives you…',
    choices: [
      'The ARM image anyway',
      'The amd64 child manifest (may need emulation to run)',
      'Nothing — --platform is compose-only',
    ],
    correct: 1,
    explain:
      'Platform selection picks the variant from the index. Running a foreign arch usually goes through qemu/rosetta. Build multi-arch for users who need it.',
  },
  {
    id: 'q-untag',
    pack: 'Registry',
    question: 'docker rmi myapp:old when myapp:1.0 shares the same ID will…',
    choices: [
      'Delete the filesystem layers immediately',
      'Remove the tag; layers remain while another tag still references the ID',
      'Push to the registry',
    ],
    correct: 1,
    explain:
      'Untag vs delete. Last ref wins — when the image ID has zero tags/refs, layers become dangling and reclaimable.',
  },
];

export const REGISTRY_LEVELS: LevelDefinition[] = [
  {
    id: 'reg-names-tags',
    name: 'Names, tags, and refs',
    series: 'Registry',
    difficulty: 3,
    brief: 'Pull two names that share a base, retag one image, and see IMAGE ID aliasing.',
    teaching: `A full reference is a chain of names:

  registry/repository/name:tag
  docker.io/library/alpine:3.20
  ghcr.io/acme/api:v1.4.2

Invisible defaults:
- registry default = docker.io
- official images = library/...
- tag default = latest (a trap)

**Tag** is a movable label on a manifest. **IMAGE ID** is the local object (config). Many tags can sit on one ID:

  docker tag demo-app:1.0 demo-app:stable
  docker images
  # both rows show the same IMAGE ID

Consequences:
- disk: one copy of layers
- rmi demo-app:stable only untags
- deploy by tag is deploying a name that can move

Pull alpine:3.20 and hello-world:latest; tag alpine:3.20 as alpine:stable; inspect shows one image object under two names.

Names are API. Treat them with the same care as version numbers.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Explicit tag — this is already better than bare alpine.'],
      ['docker tag alpine:3.20 alpine:stable', 'Alias another tag onto the same IMAGE ID.'],
      ['docker images', 'Two refs, one ID — aliasing is visible.', true],
    ),
    fieldNotes: [
      'Bare alpine means alpine:latest — almost always a mistake in scripts.',
      'Team convention: never push :latest to prod repos.',
    ],
    learning: [
      'registry/repo:tag anatomy',
      'Tag as mutable pointer vs IMAGE ID',
      'Aliasing and untag',
    ],
    hint: 'docker pull alpine:3.20\ndocker tag alpine:3.20 alpine:stable\ndocker images',
    par: 3,
    quiz: ['q-tag-mutable', 'q-image-id', 'q-latest'],
    check: (s) => {
      const a = s.images.find((i) => i.name === 'alpine:3.20' || (i.repo === 'alpine' && i.tag === '3.20'));
      const b = s.images.find((i) => i.tag === 'stable' && i.repo === 'alpine');
      return Boolean(a && b && a.imageId === b.imageId);
    },
  },
  {
    id: 'reg-digest-pin',
    name: 'Digests pin content',
    series: 'Registry',
    difficulty: 4,
    brief: 'Pull by tag, read the digest, then pull/run by digest pin story.',
    teaching: `Tags answer "what name do I want?"
Digests answer "which exact bytes?"

Manifest digest (sha256:...) is a content address of the manifest that lists config + layers.

  docker pull alpine:3.20
  # Status: Downloaded newer image for alpine:3.20@sha256:...

Deploy pins:

  image: alpine@sha256:abc...
  # or
  docker pull alpine@sha256:abc...

Why production cares:
- reproducible deploys (tag cannot silently move)
- audit "what exactly ran on prod last Tuesday?"
- supply chain: verify signatures against the digest (cosign/notation)

When to use tags vs digests:
| Place | Use |
|-------|-----|
| Dockerfile FROM | tag or digest (digest stronger) |
| compose dev | tag fine |
| k8s prod | digest |
| incident forensics | digest |

Lab: pull alpine:3.20 and busybox:1.36; inspect shows digests conceptually; end with both local so you can compare two pinned artifacts.

Our simulator prints Digest on pull — treat that string as the immutable ID you would pin.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Read the Digest line — that is your pin.'],
      ['docker pull busybox:1.36', 'Second artifact for comparison.'],
      ['docker inspect alpine:3.20', 'Local object view; ID is not the same as registry digest but both are content-ish identities.', true],
    ),
    fieldNotes: [
      'Multi-arch index digest ≠ platform child digest — pin the one you deploy.',
      'Renovate/Dependabot can update digest pins in PRs.',
    ],
    learning: [
      'Digest vs tag semantics',
      'Reproducible deploys with digest pins',
      'Where tags are still OK',
    ],
    hint: 'docker pull alpine:3.20\ndocker pull busybox:1.36\ndocker inspect alpine:3.20',
    par: 3,
    quiz: ['q-digest', 'q-tag-mutable', 'q-latest'],
    check: (s) =>
      Boolean(s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20')) &&
      Boolean(s.images.find((i) => i.repo === 'busybox')),
  },
  {
    id: 'reg-multiarch',
    name: 'Multi-arch and --platform',
    series: 'Registry',
    difficulty: 5,
    brief: 'Pull the same tag for two platforms and keep both stories straight.',
    teaching: `One tag can serve many CPU/OS pairs via an **OCI image index** (manifest list):

  node:20
   ├─ linux/amd64   → manifest A → layers A
   ├─ linux/arm64   → manifest B → layers B
   └─ ...

  docker pull --platform linux/amd64 node:20-alpine
  docker pull --platform linux/arm64 node:20-alpine

The client picks the child manifest. On a mismatched host, execution may use emulation (Docker Desktop, qemu).

Build side (real world):

  docker buildx build --platform linux/amd64,linux/arm64 -t repo/app:1.0 --push .

CI must not assume amd64 forever — ARM runners (Graviton, M-series) are common.

Failure modes to know:
- exec format error = wrong arch binary
- "no matching manifest" = index lacks your platform
- sparse multi-arch tags (amd64 only) break ARM users silently until pull

Lab: pull alpine:3.20 for amd64 and for arm64 (simulated platform variants). End with both pulled so you have practiced explicit platform selection.

Pin --platform in CI when you must build for a fleet that is not your laptop arch.`,
    steps: steps(
      ['docker pull --platform linux/amd64 alpine:3.20', 'Select the amd64 child from the index.'],
      ['docker pull --platform linux/arm64 alpine:3.20', 'Select the arm64 child — same tag, different bits.'],
    ),
    fieldNotes: [
      'exec format error is almost always arch mismatch.',
      'Emulation works but is slow — cross-build with buildx, do not ship amd64-only by habit.',
    ],
    learning: [
      'Manifest list / image index model',
      'docker pull --platform selection',
      'buildx multi-platform publish',
    ],
    hint: 'docker pull --platform linux/amd64 alpine:3.20\ndocker pull --platform linux/arm64 alpine:3.20',
    par: 2,
    quiz: ['q-multiarch', 'q-pull-platform', 'q-digest'],
    check: (s) => {
      const amd = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20-amd64');
      const arm = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20-arm64');
      // also accept two alpine 3.20 entries with platform labels
      const platforms = s.images.filter((i) => i.repo === 'alpine' && i.tag.startsWith('3.20'));
      return Boolean(amd && arm) || platforms.length >= 2;
    },
  },
  {
    id: 'reg-push-login',
    name: 'login, tag for a registry, push',
    series: 'Registry',
    difficulty: 4,
    brief: 'Login to a private registry, retag a local image for that namespace, and push.',
    teaching: `Pull is usually anonymous (public). **Push is always authenticated** to a namespace you own.

Flow:

  docker login registry.example.com
  docker tag app:1.0 registry.example.com/team/app:1.0
  docker push registry.example.com/team/app:1.0

Mechanics:
1. login stores a credential (or calls a helper: docker-credential-*)
2. tag writes a local name that includes the registry host (required for non-docker.io)
3. push contacts the registry API, uploads missing blobs (layers), then the manifest

Common failures:
- unauthorized / denied = wrong user, no push rights, or forgot login
- name unknown = you pushed docker.io/library/app when you meant acme/app
- unsupported: missing signature = policy/proxy in front of the registry
- disk = registry quota

CI note: prefer short-lived OIDC/robot tokens over pasting passwords into GitHub secrets when possible.

Lab: login (simulated ok), tag nginx:1.25 as registry.example.com/team/web:1.0, push it. Success = local name exists and push reports digest.

Never bake registry passwords into images (see secrets level).`,
    steps: steps(
      ['docker pull nginx:1.25', 'Start from a local image you can publish.'],
      ['docker login registry.example.com', 'Authenticate to the registry host.'],
      ['docker tag nginx:1.25 registry.example.com/team/web:1.0', 'Qualified name includes registry + namespace + tag.'],
      ['docker push registry.example.com/team/web:1.0', 'Upload layers + manifest under that name.'],
    ),
    fieldNotes: [
      'docker.io is implicit — custom hosts must be in the name or push goes to Hub.',
      'Push what you built in CI; laptops push demos and broken tags.',
    ],
    learning: [
      'Auth boundary for push vs pull',
      'Qualified naming for non-Hub registries',
      'tag → push → digest return',
    ],
    hint:
      'docker pull nginx:1.25\ndocker login registry.example.com\ndocker tag nginx:1.25 registry.example.com/team/web:1.0\ndocker push registry.example.com/team/web:1.0',
    par: 4,
    quiz: ['q-push-auth', 'q-retag', 'q-private-registry'],
    check: (s) =>
      Boolean(s.images.find((i) => i.name.includes('registry.example.com/team/web'))) &&
      Boolean(s.images.find((i) => i.name === 'registry.example.com/team/web:1.0' || i.tag === '1.0')),
  },
  {
    id: 'reg-untag-refcount',
    name: 'Untag vs delete',
    series: 'Registry',
    difficulty: 3,
    brief: 'Alias two tags, untag one, confirm layers survive on the remaining ref.',
    teaching: `Docker will not delete layers while any name still points at the image.

  docker tag app:1.0 app:backup
  docker rmi app:backup     # untag only
  docker images             # app:1.0 remains, same ID

When the **last** tag/repotag goes:

  docker rmi app:1.0
  # layers become dangling → prune can reclaim

This is refcounting, same family as "rmi while a container uses it."

Operational habits:
- keep a semver tag even if you also digest-pin deploys
- do not accumulate :build-1234 tags on prod hosts
- image prune -a removes unreferenced images — know the difference from dangling

Lab: pull alpine:3.20, tag as alpine:staging, rmi alpine:staging, leave alpine:3.20 in place.

If you rmi both, you can still pull again — the lesson is the refcount, not the bytes.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Base ref.'],
      ['docker tag alpine:3.20 alpine:staging', 'Second ref on same ID.'],
      ['docker rmi alpine:staging', 'Untag one name.'],
      ['docker images', 'alpine:3.20 must remain.', true],
    ),
    fieldNotes: [
      'dangling = untagged image layers',
      'containers hold image IDs even after stop — ps -a before rmi',
    ],
    learning: [
      'Refcount on image names',
      'Untag vs layer deletion',
      'dangling vs unused',
    ],
    hint: 'docker pull alpine:3.20\ndocker tag alpine:3.20 alpine:staging\ndocker rmi alpine:staging\ndocker images',
    par: 4,
    quiz: ['q-untag', 'q-image-id', 'q-tag-mutable'],
    check: (s) => {
      const keep = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      const staging = s.images.find((i) => i.repo === 'alpine' && i.tag === 'staging');
      return Boolean(keep) && !staging;
    },
  },
  {
    id: 'reg-supply-chain',
    name: 'Supply-chain posture',
    series: 'Registry',
    difficulty: 5,
    brief: 'Leave with a concrete policy: slim base pulled, scanned, tagged for deploy — not latest.',
    teaching: `Registry is part of your supply chain, not a magic CDN.

Threats:
- tag swap (dependency confusion / compromised account)
- public base deleted or rate-limited at the worst time
- CVEs in layers you never consciously installed
- unvetted public images with cryptominers

Minimum bar for a serious team:

1. Mirror or vendor base images (private registry / Harbor / ECR pull-through)
2. Pin digests in prod deploy (or sign+verify)
3. CI scan gate (critical/high block)
4. Multi-arch if you ship to heterogeneous hosts
5. Separate build (CI) from deploy creds (short-lived)
6. No secrets in layers

Lab story: pull alpine:3.20 (slim), scan it, tag it as registry.example.com/team/base:3.20 for your internal namespace. That is the "approved base" ritual in miniature.

If your answer to "what runs in prod?" is a tag like latest, you cannot audit an incident.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Vetted slim base.'],
      ['docker scan alpine:3.20', 'Scan before you bless it.'],
      ['docker tag alpine:3.20 registry.example.com/team/base:3.20', 'Qualify for your registry namespace.'],
      ['docker login registry.example.com', 'Ready to push when policy allows.', true],
    ),
    fieldNotes: [
      'Signature tools (cosign) attach attestations to digests — next level of this story.',
      'Air-gapped clusters need a mirror strategy before day one.',
    ],
    learning: [
      'Supply-chain failure modes',
      'Mirror + pin + scan policy',
      'Approved base image ritual',
    ],
    hint:
      'docker pull alpine:3.20\ndocker scan alpine:3.20\ndocker tag alpine:3.20 registry.example.com/team/base:3.20\ndocker login registry.example.com',
    par: 4,
    quiz: ['q-private-registry', 'q-digest', 'q-push-auth', 'q-latest'],
    check: (s) => {
      const base = s.images.find((i) => i.name.includes('registry.example.com/team/base'));
      const alpine = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      return Boolean(base && alpine);
    },
  },
];
