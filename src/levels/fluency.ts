import type { LevelDefinition } from '../engine/types';

function steps(...items: Array<[string, string] | [string, string, true]>): LevelDefinition['steps'] {
  return items.map((item) => ({ command: item[0], note: item[1], optional: item[2] === true }));
}

function text(...lines: string[]): string {
  return lines.join('\n');
}

export const FLUENCY_LEVELS: LevelDefinition[] = [
  {
    id: 'fluency-drill',
    name: 'Fluency: 8 commands from memory',
    series: 'Basics',
    difficulty: 3,
    brief: 'Run the core loop without reading teaching text. Speed + correctness.',
    teaching: text(
      'Fluency is not knowledge — it is retrieval under mild pressure.',
      '',
      'Do this sequence in Sandbox without scrolling the brief:',
      '  1. pull alpine:3.20',
      '  2. run -d --name f1 alpine:3.20 sleep 300',
      '  3. ps',
      '  4. stop f1',
      '  5. start f1',
      '  6. exec f1 whoami (or logs f1)',
      '  7. run -d --name f2 -p 18080:80 -v fdata:/data nginx:1.25',
      '  8. rm -f f1 f2',
      '',
      'When you can do this cold in under 3 minutes on a real daemon, commands are becoming muscle.',
      'Repeat daily for 3 days (see review).',
    ),
    steps: steps(
      ['docker pull alpine:3.20', 'Cold: no peeking.'],
      ['docker run -d --name f1 alpine:3.20', 'Detach + name.'],
      ['docker stop f1', 'Lifecycle.'],
      ['docker start f1', 'Lifecycle.'],
      ['docker rm -f f1', 'Cleanup.'],
    ),
    fieldNotes: [
      'Time yourself. Log the time in notes.',
      'On Track B use labs/lab-01..03 as the timer track.',
    ],
    learning: ['Retrieval practice', 'Command fluency', 'Timing as feedback'],
    hint: 'docker pull alpine:3.20\ndocker run -d --name f1 alpine:3.20\ndocker stop f1\ndocker start f1\ndocker rm -f f1',
    par: 5,
    start: { prePulled: ['alpine:3.20'] },
    check: (s) => s.containers.some((c) => c.name === 'f1') || s.nextContainerSeq >= 1,
  },
  {
    id: 'lab-break-fix',
    name: 'Break-and-fix (self-directed)',
    series: 'Failure labs',
    difficulty: 5,
    brief: 'Break a stack on purpose on YOUR machine, then fix it. Log the timeline.',
    teaching: text(
      '90% debug skill does not come from reading failure labs. It comes from causing harm and healing it.',
      '',
      'On a real daemon (Track B), pick ONE break:',
      '  A. Occupy port 8080, then try another nginx on 8080',
      '  B. Run web and db on different networks, curl by name',
      '  C. Healthcheck the wrong port, watch unhealthy',
      '  D. USER without chown, write to /app',
      '',
      'Required deliverable (notes):',
      '  - exact error string',
      '  - hypothesis in one line',
      '  - commands that fixed it',
      '  - one preventive change (Dockerfile, compose, or runbook)',
      '',
      'This in-app level is complete when you have written that timeline (paste into notes / PR).',
    ),
    steps: steps(
      ['help', 'Rehearse relevant commands first.'],
      ['rubric r-failure-port', 'Self-grade the port runbook if you chose A.'],
    ),
    fieldNotes: [
      'Prefer a disposable VM/laptop snap if you fear breakage.',
      'The written timeline is the learning artifact, not the fix alone.',
    ],
    learning: ['Incident discipline', 'Hypothesis debugging', 'Prevention over heroics'],
    hint: 'rubric r-failure-port\nrubric r-ops-health',
    par: 2,
    check: () => true,
  },
  {
    id: 'teachback-models',
    name: 'Teach-back: core models',
    series: 'Basics',
    difficulty: 2,
    brief: 'Record or tell a 60s explanation. This is the 90% gate for models.',
    teaching: text(
      'Research-backed: retrieval + teaching is stronger than re-reading.',
      '',
      'Script outline (no notes):',
      '  "An image is… A container is… Writes without a mount go to… After rm…',
      '   A volume is… EXPOSE vs -p…"',
      '',
      'If you stutter on writable layer or volumes, go back to Basics + Data.',
      'Pass criteria: a peer (or your recording) can answer questions you cannot skip.',
      '',
      'Mark this level done only after teach-back. Then run `review` on day 7.',
    ),
    steps: steps(
      ['curriculum', 'Refresh outcomes before speaking.'],
      ['review', 'Schedule the day-7 re-test.'],
    ),
    fieldNotes: [
      'Camera optional. Notes NOT optional for honesty.',
      'Second teach-back in 7 days is the retention check.',
    ],
    learning: ['Teach-back method', 'Self-calibration', 'Retention protocol'],
    hint: 'curriculum\nreview',
    par: 2,
    check: () => true,
  },
];
