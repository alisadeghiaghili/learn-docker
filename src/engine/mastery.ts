/**
 * Mastery map: skill domains with checkpoints.
 * 90% requires the full protocol (UI + real labs + teach-back + rubric).
 */

export type MasteryDomain =
  | 'models'
  | 'commands'
  | 'build'
  | 'compose'
  | 'network'
  | 'volumes'
  | 'debug'
  | 'registry'
  | 'security';

export interface MasteryCheck {
  id: string;
  prompt: string;
  /** Commands or evidence (Track A sim ids or Track B labs) */
  evidence: string[];
  /** Self-grade question after evidence */
  probe: string;
}

export interface MasteryDomainSpec {
  id: MasteryDomain;
  title: string;
  /** Ceiling if only UI is done (honest cap) */
  uiOnlyCap: number;
  /** Ceiling if full protocol (UI + Track B + teach-back + rubric) */
  fullProtocolTarget: number;
  checks: MasteryCheck[];
}

export const MASTERY: MasteryDomainSpec[] = [
  {
    id: 'models',
    title: 'Image / container / layer / writable layer',
    uiOnlyCap: 80,
    fullProtocolTarget: 92,
    checks: [
      {
        id: 'm1',
        prompt: 'Explain image vs container in 4 sentences without notes.',
        evidence: ['intro-hello', 'image-vs-container', 'q-image-container'],
        probe: 'Where does an unmounted write go? What happens after rm?',
      },
      {
        id: 'm2',
        prompt: 'Draw or describe shared RO layers + private writable layer.',
        evidence: ['hood-layers-write', 'hood-whiteout'],
        probe: 'Why does a write in A not change B?',
      },
      {
        id: 'm3',
        prompt: 'Run two containers from one imageId (sim + real lab 02).',
        evidence: ['lab-02'],
        probe: 'Show inspect proof of same Image id.',
      },
    ],
  },
  {
    id: 'commands',
    title: 'Day-to-day CLI (run/ps/logs/exec)',
    uiOnlyCap: 75,
    fullProtocolTarget: 90,
    checks: [
      {
        id: 'c1',
        prompt: 'Rehearse then real: pull, run -d --name, ps, stop, start, rm.',
        evidence: ['lifecycle', 'lab-01', 'lab-03'],
        probe: 'Difference between stop and rm? start and run?',
      },
      {
        id: 'c2',
        prompt: 'logs + exec loop on a live nginx (lab 08).',
        evidence: ['ops-logs-exec', 'lab-08'],
        probe: 'Why can logs look empty?',
      },
      {
        id: 'c3',
        prompt: 'Complete a timed run of 8 core commands without help.',
        evidence: ['fluency-drill'],
        probe: 'Type from memory: run named, published port, named volume.',
      },
    ],
  },
  {
    id: 'build',
    title: 'Dockerfile / cache / multi-stage',
    uiOnlyCap: 72,
    fullProtocolTarget: 91,
    checks: [
      {
        id: 'b1',
        prompt: 'Rewrite a cache-poisoned Dockerfile (COPY . . first).',
        evidence: ['build-cache-order', 'fail-dockerfile-order'],
        probe: 'Why does order change rebuild time?',
      },
      {
        id: 'b2',
        prompt: 'Multi-stage runtime size story (lab 04).',
        evidence: ['build-multistage', 'lab-04'],
        probe: 'What is discarded? What ships?',
      },
      {
        id: 'b3',
        prompt: 'history/inspect layer audit.',
        evidence: ['build-layers'],
        probe: 'Which instruction added the most size?',
      },
    ],
  },
  {
    id: 'compose',
    title: 'Compose multi-service',
    uiOnlyCap: 65,
    fullProtocolTarget: 90,
    checks: [
      {
        id: 'p1',
        prompt: '3-service stack: web+db+cache with volume and net (capstone).',
        evidence: ['compose-up', 'docs/CAPSTONE.md'],
        probe: 'How does web reach db?',
      },
      {
        id: 'p2',
        prompt: 'depends_on vs healthy; fix a start-order race.',
        evidence: ['compose-health-condition', 'fail-dependson-race'],
        probe: 'What does depends_on NOT guarantee?',
      },
      {
        id: 'p3',
        prompt: 'Base + override + prod file split; config in CI.',
        evidence: ['compose-files-split'],
        probe: 'Where do laptop bind mounts belong?',
      },
      {
        id: 'p4',
        prompt: 'down vs down -v (lab-style on real compose).',
        evidence: ['compose-down-volumes'],
        probe: 'When is -v correct?',
      },
    ],
  },
  {
    id: 'network',
    title: 'Networks / DNS / ports',
    uiOnlyCap: 72,
    fullProtocolTarget: 90,
    checks: [
      {
        id: 'n1',
        prompt: 'EXPOSE vs -p explanation + real publish (lab 07).',
        evidence: ['ports', 'lab-07'],
        probe: 'HOST:CONTAINER order?',
      },
      {
        id: 'n2',
        prompt: 'User-defined net DNS (lab 06).',
        evidence: ['networks', 'lab-06'],
        probe: 'Why not localhost?',
      },
      {
        id: 'n3',
        prompt: 'Pick topology for 3 scenarios (bridge/host/overlay).',
        evidence: ['net-deep-topologies'],
        probe: 'When is macvlan right?',
      },
    ],
  },
  {
    id: 'volumes',
    title: 'Volumes / persistence',
    uiOnlyCap: 75,
    fullProtocolTarget: 91,
    checks: [
      {
        id: 'v1',
        prompt: 'Write, rm container, re-read volume (lab 05).',
        evidence: ['volumes-persist', 'lab-05'],
        probe: 'Where did the file live?',
      },
      {
        id: 'v2',
        prompt: 'Bind mount UID mismatch story.',
        evidence: ['fail-volume-perm'],
        probe: 'Why not chmod 777?',
      },
    ],
  },
  {
    id: 'debug',
    title: 'Debug / failure literacy',
    uiOnlyCap: 55,
    fullProtocolTarget: 90,
    checks: [
      {
        id: 'd1',
        prompt: 'Port conflict runbook (lab 10).',
        evidence: ['fail-port-in-use', 'lab-10'],
        probe: 'First command? What not to prune?',
      },
      {
        id: 'd2',
        prompt: 'Unhealthy probe diagnosis.',
        evidence: ['fail-unhealthy', 'ops-health-restart', 'lab-09'],
        probe: 'Up vs healthy?',
      },
      {
        id: 'd3',
        prompt: 'Permission denied non-root fix.',
        evidence: ['fail-user-write', 'security-nonroot'],
        probe: 'chown vs root vs volume?',
      },
      {
        id: 'd4',
        prompt: 'Name does not resolve fix.',
        evidence: ['fail-dns'],
        probe: 'Network membership vs hostname?',
      },
      {
        id: 'd5',
        prompt: 'Break one real stack on purpose and fix it (Track B).',
        evidence: ['lab-break-fix'],
        probe: 'Write the incident timeline in 5 lines.',
      },
    ],
  },
  {
    id: 'registry',
    title: 'Registry / release gate',
    uiOnlyCap: 75,
    fullProtocolTarget: 92,
    checks: [
      {
        id: 'r1',
        prompt: 'tag vs digest vs latest (quizzes + reg pack).',
        evidence: ['reg-names-tags', 'reg-digest-pin'],
        probe: 'Why not deploy latest?',
      },
      {
        id: 'r2',
        prompt: 'Full gate: scan → sbom → sign → version tag → inspect.',
        evidence: ['reg-capstone-gate', 'lab-12'],
        probe: 'Name 6 gate steps from memory.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security posture',
    uiOnlyCap: 65,
    fullProtocolTarget: 90,
    checks: [
      {
        id: 's1',
        prompt: 'Hardened run flags bundle.',
        evidence: ['sec-cap-drop', 'security-nonroot'],
        probe: 'user + read-only + caps + secrets, why each?',
      },
      {
        id: 's2',
        prompt: 'Secrets not in image layers.',
        evidence: ['compose-secrets', 'fail-user-write'],
        probe: 'Why ENV in Dockerfile is a leak?',
      },
    ],
  },
];

export function masteryScore(self: Record<string, boolean>): {
  byDomain: Array<{ id: MasteryDomain; title: string; percent: number; readyFor90: boolean }>;
  overall: number;
} {
  const byDomain = MASTERY.map((d) => {
    const done = d.checks.filter((c) => self[c.id]).length;
    const percent = Math.round((done / d.checks.length) * d.fullProtocolTarget);
    return {
      id: d.id,
      title: d.title,
      percent,
      readyFor90: done === d.checks.length,
    };
  });
  const overall = Math.round(byDomain.reduce((a, b) => a + b.percent, 0) / byDomain.length);
  return { byDomain, overall };
}

/** Protocol required before claiming 90% on a domain. */
export const PROTOCOL_90 = [
  '1. All Mastery checks for the domain (UI evidence + Track B where listed)',
  '2. Teach-back to a human or recording (60s, no notes)',
  '3. Rubric essay pass for that pack',
  '4. One real break-and-fix in that domain (where applicable)',
  '5. Spaced review at day 7 and day 30 without looking',
];

export function protocolText(): string {
  return PROTOCOL_90.join('\n');
}
