import type { LevelDefinition, QuizQuestion } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

export const REGISTRY_ADV_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-manifest-inspect',
    pack: 'Registry',
    question: 'docker buildx imagetools inspect node:20 is most useful to see…',
    choices: [
      'Container CPU stats',
      'The remote manifest / index: platforms, digests, sizes without pulling',
      'Local writable layer diffs',
    ],
    correct: 1,
    explain:
      'It is a registry-read of metadata. Perfect for "does this tag have arm64?" and "which digest will I deploy?" before downloading GBs.',
  },
  {
    id: 'q-index-digest',
    pack: 'Registry',
    question: 'Digest of a multi-arch index vs digest of linux/amd64 child…',
    choices: [
      'Are always identical',
      'Differ — pin the child you deploy, or pin the index if all platforms ship together',
      'Only the index can be pinned',
    ],
    correct: 1,
    explain:
      'Index digest covers the list of manifests. Child digest covers one platform. Mixing them up causes "digest not found" confusion.',
  },
  {
    id: 'q-cosign',
    pack: 'Registry',
    question: 'What does verifying an image signature (cosign/notation) prove?',
    choices: [
      'The image has zero CVEs',
      'A key/identity you trust attests to this exact digest (integrity + publisher)',
      'The Dockerfile was written by a human',
    ],
    correct: 1,
    explain:
      'Signatures bind identity to digest. They do not replace scanning. Policy: only run images signed by CI identity X.',
  },
  {
    id: 'q-sbom',
    pack: 'Registry',
    question: 'An SBOM (Software Bill of Materials) for an image tells you…',
    choices: [
      'The k8s replica count',
      'Which packages/versions are inside the layers (inventory for vuln and license work)',
      'The registry password',
    ],
    correct: 1,
    explain:
      'SBOM is inventory. Generate at build (syft, buildkit sbom), attach to digest, scan against it. License compliance lives here too.',
  },
  {
    id: 'q-rate-limit',
    pack: 'Registry',
    question: 'docker pull fails with "toomanyrequests" / rate limit on docker.io. Best structural fix?',
    choices: [
      'retry harder in a bash loop forever',
      'Authenticate (higher limits) and/or use a pull-through mirror / private registry cache',
      'Switch everything to :latest',
    ],
    correct: 1,
    explain:
      'CI fleets need a mirror/pull-through cache or paid/authenticated pulls. Anonymous shared NAT IPs burn the quota instantly.',
  },
  {
    id: 'q-mirror',
    pack: 'Registry',
    question: 'A pull-through cache / mirror primarily improves…',
    choices: [
      'Image encryption at rest',
      'Availability, latency, and quota for repeated pulls of upstream images',
      'Dockerfile lint quality',
    ],
    correct: 1,
    explain:
      'First pull caches blobs locally/regionally; later pulls hit the mirror. Combined with allowlists = supply-chain control.',
  },
  {
    id: 'q-referrers',
    pack: 'Registry',
    question: 'Keeping signature and SBOM as separate artifacts linked to the image digest means…',
    choices: [
      'You must rebuild the app to add metadata',
      'You can attach/re-verify attestations without changing the image digest',
      'Registries refuse multi-artifact repos',
    ],
    correct: 1,
    explain:
      'OCI referrers/attestations hang off the subject digest. Re-sign or re-SBOM without re-releasing application layers.',
  },
  {
    id: 'q-airgap',
    pack: 'Registry',
    question: 'Air-gapped deploy of images is usually done by…',
    choices: [
      'Pulling from docker.io at deploy time with VPN hope',
      'docker save / registry export + controlled import (or a disconnected Harbor) with digest verification',
      'Copying Dockerfiles only',
    ],
    correct: 1,
    explain:
      'Move blobs, verify digests/signatures, import into the internal registry. Dockerfiles are not the artifact.',
  },
  {
    id: 'q-tag-immutable',
    pack: 'Registry',
    question: 'Some registries offer immutable tags. That means…',
    choices: [
      'Tags that cannot be overwritten once pushed',
      'Tags that always point to alpine',
      'Tags stored in cold storage',
    ],
    correct: 0,
    explain:
      'Immutability prevents tag swap attacks and "who moved my :1.2.3". You still want digests in deploy manifests.',
  },
  {
    id: 'q-namespace',
    pack: 'Registry',
    question: 'registry.example.com/team/app:1.0 — what does team/ control?',
    choices: [
      'The CPU arch',
      'The project/org namespace for RBAC, quota, and who can push',
      'The compression algorithm',
    ],
    correct: 1,
    explain:
      'Namespaces are the permission boundary. CI robot gets push to team/app only, not *.*',
  },
];

export const REGISTRY_ADV_LEVELS: LevelDefinition[] = [
  {
    id: 'reg-manifest-inspect',
    name: 'Read the remote manifest',
    series: 'Registry',
    difficulty: 5,
    brief: 'Inspect a multi-arch tag without pulling layers. Find platforms and the digest story.',
    teaching: `Before you pull 200MB, read the menu.

  docker buildx imagetools inspect node:20
  docker manifest inspect node:20
  docker inspect local:tag   # local object after pull

imagetools talks to the **registry API**: it fetches the manifest/index, not blobs.

What you learn from one call:
- is this tag multi-arch?
- which platforms?
- what is the **index digest** vs each **child digest**?
- size estimate per platform

Pin rules that actually work:
- deploy linux/amd64 only fleet → pin child digest for amd64
- ship "one tag, all platforms" → pin index digest
- never pin "whatever :1.2.3 is this week"

Incident use: "prod is broken after pull" → imagetools inspect the tag NOW and compare to the digest in your deploy manifest. Tag moved? That is your RCA.

Lab: run imagetools inspect on node:20 and alpine:3.20 (simulated remote manifests). Keep the digests in your head as the pin you would write.

Also: inspect a local image vs remote — local IMAGE ID is not always the registry digest string.`,
    steps: steps(
      ['docker buildx imagetools inspect node:20', 'Remote index: platforms + digests, no layer download.'],
      ['docker buildx imagetools inspect alpine:3.20', 'Second remote read for comparison.'],
      ['docker pull alpine:3.20', 'Only now pay for blobs.', true],
    ),
    fieldNotes: [
      'imagetools = metadata plane. pull = data plane.',
      'CI check: assert expected platform exists before buildx bake.',
    ],
    learning: [
      'Manifest/index as the remote source of truth',
      'Index digest vs child digest pinning',
      'Inspect-before-pull workflow',
    ],
    hint: 'docker buildx imagetools inspect node:20\ndocker buildx imagetools inspect alpine:3.20',
    par: 2,
    quiz: ['q-manifest-inspect', 'q-index-digest', 'q-digest'],
    check: (s) => (s.registryInspected?.length ?? 0) >= 1,
  },
  {
    id: 'reg-sign-verify',
    name: 'Signatures bind identity to digest',
    series: 'Registry',
    difficulty: 5,
    brief: 'Walk the sign → verify → policy story on a blessed image.',
    teaching: `Scanning answers "what CVEs?"
Signing answers "who published these bytes?"

Tools in the real world: cosign (Sigstore), Notation (Notary v2), registry built-in (Harbor).

  cosign sign registry.example.com/team/app@sha256:abc
  cosign verify registry.example.com/team/app@sha256:abc \
    --certificate-identity ci@acme.com --certificate-oidc-issuer https://token.actions.githubusercontent.com

What verification gives you:
- integrity: this digest was signed
- identity: by this cert/key (ideally keyless via OIDC of your CI)
- optional attestations: SBOM, provenance (SLSA)

What it does **not** give you:
- zero CVEs (still scan)
- "safe to run as root" (still harden)

Policy patterns:
- admit only images signed by our CI identity
- verify at admission (Kyverno/OPA) or at pull
- break-glass unsigned path is audited

Lab: sign (sim) the blessed alpine:3.20 digest and verify it. Then verify a "foreign" image and read the failed-policy story.

If your registry is a free-for-all push, signatures are how you restore a trust boundary.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Content you want to bless.'],
      ['docker sign alpine:3.20', 'Attach signature to the digest (simulated cosign).'],
      ['docker verify alpine:3.20', 'Check identity + integrity.'],
    ),
    fieldNotes: [
      'Keyless (Fulcio) ties signature to CI identity — good default on GitHub Actions.',
      'Always verify by digest in policy, not by tag.',
    ],
    learning: [
      'Signature = identity + integrity on digest',
      'Sign vs scan vs SBOM roles',
      'Admission policy pattern',
    ],
    hint: 'docker pull alpine:3.20\ndocker sign alpine:3.20\ndocker verify alpine:3.20',
    par: 3,
    quiz: ['q-cosign', 'q-referrers', 'q-digest'],
    check: (s) => Boolean(s.signedImages?.includes('alpine:3.20') || s.verifiedImages?.includes('alpine:3.20')),
  },
  {
    id: 'reg-sbom',
    name: 'SBOM as inventory',
    series: 'Registry',
    difficulty: 5,
    brief: 'Generate/read an SBOM for an image and explain how it feeds vuln + license gates.',
    teaching: `When security asks "what OpenSSL is in prod?" you need inventory, not vibes.

SBOM = list of components (name, version, license, hash) extracted from layers/config.

Formats: SPDX, CycloneDX.
Builders: syft, buildkit (--sbom=true), trivy, docker scout.

Pipeline that works:

  build → sbom → attach to digest → scan SBOM/image → gate on critical → sign

Why attach to digest (OCI referrers):
- auditable later ("what SBOM did we ship Tuesday?")
- re-scan without rebuild
- license compliance (GPL in a commercial binary)

False comfort: SBOM of the wrong platform variant. Multi-arch → SBOM per child.

Lab: generate (sim) SBOM for alpine:3.20 and node:20. Compare package counts — fat base, fat inventory.

CVE response becomes: new advisory → match SBOM → rebuild only what is affected.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Target artifact.'],
      ['docker sbom alpine:3.20', 'Emit component inventory (simulated syft).'],
      ['docker sbom node:20', 'Compare fat vs slim inventory.', true],
    ),
    fieldNotes: [
      'SBOM without continuous matching goes stale — same as scanning once at birth.',
      'Licenses in SBOM catch GPL surprises before legal does.',
    ],
    learning: [
      'SBOM contents and formats',
      'Attach-to-digest artifact model',
      'CVE/license response workflow',
    ],
    hint: 'docker pull alpine:3.20\ndocker sbom alpine:3.20\ndocker pull node:20\ndocker sbom node:20',
    par: 3,
    quiz: ['q-sbom', 'q-referrers', 'q-cosign'],
    check: (s) => Boolean(s.sboms?.length ?? 0 >= 1),
  },
  {
    id: 'reg-rate-limit-mirror',
    name: 'Rate limits and mirrors',
    series: 'Registry',
    difficulty: 4,
    brief: 'Reproduce toomanyrequests and end with a mirror/login posture that survives CI.',
    teaching: `Symptom in CI at 09:00 Monday:

  Error response from daemon: toomanyrequests: You have reached your pull rate limit.

Anonymous docker.io limits are per IP. Shared GitHub/NAT IPs = instant exhaustion.

Mitigations (layered):

1. docker login in CI (auth limits are higher)
2. **Pull-through cache** (Harbor, Artifactory, ECR public proxy, registry mirror= in daemon.json)
3. Vendor critical bases into your registry; build FROM your mirror
4. Cache layers in buildx/registry cache so you pull less
5. Align schedules so 200 jobs do not all pull at :00

Daemon mirror example:

  "registry-mirrors": ["https://mirror.example.com"]

For air-gap / regulated: the mirror is mandatory, not optional.

Lab: trigger the simulated rate-limit failure on an anonymous pull pattern, then apply login + qualify names to your mirror namespace (sim). End logged-in with a mirror-qualified tag story.

Blaming Docker for Hub quotas is like blaming npm for your CI stampede.`,
    steps: steps(
      ['docker pull node:20', 'Hit the quota story (sim output).'],
      ['docker login registry.example.com', 'Auth posture for higher limits / private mirror.'],
      ['docker tag alpine:3.20 registry.example.com/mirror/alpine:3.20', 'Qualify for mirror namespace.'],
    ),
    fieldNotes: [
      'registry-mirrors is daemon config — platform teams own it.',
      'Offline: docker save/load + digest check.',
    ],
    learning: [
      'Hub rate-limit economics',
      'Login + mirror + namespace strategy',
      'Air-gapped transfer as extreme mirror',
    ],
    hint:
      'docker login registry.example.com\ndocker pull alpine:3.20\ndocker tag alpine:3.20 registry.example.com/mirror/alpine:3.20',
    par: 3,
    quiz: ['q-rate-limit', 'q-mirror', 'q-namespace', 'q-airgap'],
    check: (s) => Boolean(s.images.find((i) => i.name.includes('mirror/alpine') || i.name.includes('registry.example.com'))),
  },
  {
    id: 'reg-capstone-gate',
    name: 'Capstone: release gate',
    series: 'Registry',
    difficulty: 5,
    brief: 'Ship one image through the full gate: pull/scan/tag/inspect/sign/qualified name — no latest.',
    teaching: `This is the release ritual you should be able to run half-asleep.

Checklist (each step exists because of an incident):

1. **Source** from an explicit base (alpine:3.20, not alpine)
2. **Build** multi-stage (done in Build pack)
3. **Scan** — block critical/high
4. **SBOM** — inventory attached
5. **Digest** — record the pin
6. **Sign** — identity bound to that digest
7. **Tag** for your registry namespace with a real version (not latest)
8. **imagetools inspect** — confirm platforms before announce
9. **Push** to team namespace only
10. **Deploy by digest**, keep tag for humans

If you skip steps, write down which risk you accepted.

Lab acceptance story:
- local alpine:3.20 blessed (scan)
- signed + verified
- SBOM exists
- qualified name registry.example.com/team/base:3.20
- no dependency on :latest for the blessed line

That is a 10/10 release gate in miniature — still a simulator, but the **order and reasons** are the real ones.

Do this until the order is muscle memory. Then teach it to your team as the definition of done for images.`,
    steps: steps(
      ['docker pull alpine:3.20', 'Explicit source tag.'],
      ['docker scan alpine:3.20', 'Vuln gate.'],
      ['docker sbom alpine:3.20', 'Inventory gate.'],
      ['docker sign alpine:3.20', 'Identity gate.'],
      ['docker verify alpine:3.20', 'Confirm the signature.'],
      ['docker tag alpine:3.20 registry.example.com/team/base:3.20', 'Versioned qualified name — not latest.'],
      ['docker buildx imagetools inspect alpine:3.20', 'Remote manifest sanity before announce.', true],
    ),
    fieldNotes: [
      'Definition of done for images should be a checked list in the PR template.',
      'Deploy-by-digest + human tag is the split that survives incidents.',
    ],
    learning: [
      'End-to-end release gate ordering',
      'Why each control exists',
      'latest-free naming discipline',
    ],
    hint:
      'docker pull alpine:3.20\ndocker scan alpine:3.20\ndocker sbom alpine:3.20\ndocker sign alpine:3.20\ndocker verify alpine:3.20\ndocker tag alpine:3.20 registry.example.com/team/base:3.20\ndocker buildx imagetools inspect alpine:3.20',
    par: 7,
    quiz: ['q-cosign', 'q-sbom', 'q-digest', 'q-tag-immutable', 'q-namespace'],
    check: (s) => {
      const blessed = s.images.find((i) => i.repo === 'alpine' && i.tag === '3.20');
      const qualified = s.images.find((i) => i.name.includes('registry.example.com/team/base'));
      const signed = Boolean(s.signedImages?.some((n) => n.includes('alpine'))) || Boolean(s.verifiedImages?.length);
      const sbom = (s.sboms?.length ?? 0) >= 1;
      const inspected = (s.registryInspected?.length ?? 0) >= 1;
      return Boolean(blessed && qualified && signed && sbom && inspected);
    },
  },
];
