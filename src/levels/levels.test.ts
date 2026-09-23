import { describe, expect, it } from 'vitest';
import { executeCommand } from '../engine/commands';
import { applyLevelStart } from '../engine/session';
import { LEVELS, getQuiz, quizzesForLevel, CURRICULUM_OUTCOMES } from '../levels';
import type { DockerState } from '../engine/types';

function run(state: DockerState, ...cmds: string[]): DockerState {
  let s = state;
  for (const cmd of cmds) {
    const result = executeCommand(cmd, s);
    if (!result.ok) throw new Error(`Command failed: ${cmd}\n${result.lines.join('\n')}`);
    s = result.state;
  }
  return s;
}

function level(id: string) {
  const l = LEVELS.find((x) => x.id === id);
  if (!l) throw new Error(`missing level ${id}`);
  return l;
}

describe('curriculum integrity', () => {
  it('covers all major packs with enough depth', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(16);
    const series = new Set(LEVELS.map((l) => l.series));
    for (const s of [
      'Basics',
      'Build',
      'Compose',
      'Data',
      'Networks',
      'Ops',
      'Security',
      'Under the hood',
      'Failure labs',
    ]) {
      expect(series.has(s as never)).toBe(true);
    }
  });

  it('every level has teaching, steps, and outcomes', () => {
    for (const l of LEVELS) {
      expect(l.teaching.length).toBeGreaterThan(200);
      expect(l.steps.length).toBeGreaterThanOrEqual(2);
      expect(l.learning.length).toBeGreaterThanOrEqual(3);
      expect(l.par).toBeGreaterThan(0);
    }
  });

  it('quiz bank is substantial and valid', () => {
    expect(quizzesForLevel(level('build-multistage')).length).toBeGreaterThanOrEqual(2);
    expect(getQuiz('q-multistage')?.correct).toBe(1);
    expect(CURRICULUM_OUTCOMES.length).toBeGreaterThanOrEqual(8);
  });

  it('ids are unique', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('level solutions', () => {
  it('intro-hello', () => {
    const l = level('intro-hello');
    const start = applyLevelStart(l);
    expect(l.check(start)).toBe(false);
    expect(l.check(run(start, 'docker pull hello-world', 'docker run hello-world'))).toBe(true);
  });

  it('image-vs-container requires one image two containers', () => {
    const l = level('image-vs-container');
    const start = applyLevelStart(l);
    const partial = run(start, 'docker pull alpine:3.20', 'docker run -d --name web alpine:3.20');
    expect(l.check(partial)).toBe(false);
    expect(l.check(run(partial, 'docker run -d --name worker alpine:3.20'))).toBe(true);
  });

  it('lifecycle stop/start', () => {
    const l = level('lifecycle');
    const start = applyLevelStart(l);
    const stopped = run(start, 'docker run -d --name demo alpine:3.20', 'docker stop demo');
    expect(l.check(stopped)).toBe(false);
    expect(l.check(run(stopped, 'docker start demo'))).toBe(true);
  });

  it('build-layers', () => {
    const l = level('build-layers');
    expect(l.check(run(applyLevelStart(l), 'docker build -t demo-app:1.0 .'))).toBe(true);
  });

  it('build-multistage keeps runtime small', () => {
    const l = level('build-multistage');
    const s = run(applyLevelStart(l), 'docker build -t app:1.0 .');
    const img = s.images.find((i) => i.repo === 'app');
    expect(img?.finalStage === 'runtime' || img!.sizeKb < 200_000).toBe(true);
    expect(l.check(s)).toBe(true);
  });

  it('compose-up starts three services', () => {
    const l = level('compose-up');
    const s = run(applyLevelStart(l), 'docker compose up -d');
    expect(l.check(s)).toBe(true);
  });

  it('compose-down keeps pgdata volume', () => {
    const l = level('compose-down-volumes');
    const s = run(applyLevelStart(l), 'docker compose up -d', 'docker compose down');
    expect(l.check(s)).toBe(true);
    expect(s.volumes.find((v) => v.name === 'pgdata')).toBeTruthy();
  });

  it('volumes-persist', () => {
    const l = level('volumes-persist');
    const written = run(
      applyLevelStart(l),
      'docker volume create data-vol',
      'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
    );
    expect(l.check(written)).toBe(false);
    const solved = run(
      written,
      'docker rm -f writer',
      'docker run -d --name reader -v data-vol:/data alpine:3.20',
    );
    expect(l.check(solved)).toBe(true);
  });

  it('networks + ports + ops-logs + health + prune + cleanup', () => {
    expect(
      level('networks').check(
        run(
          applyLevelStart(level('networks')),
          'docker network create app-net',
          'docker run -d --name db --network app-net alpine:3.20',
          'docker run -d --name app --network app-net alpine:3.20',
        ),
      ),
    ).toBe(true);

    expect(
      level('ports').check(
        run(applyLevelStart(level('ports')), 'docker pull nginx:1.25', 'docker run -d --name web -p 8080:80 nginx:1.25'),
      ),
    ).toBe(true);

    expect(
      level('ops-logs-exec').check(
        run(
          applyLevelStart(level('ops-logs-exec')),
          'docker pull nginx:1.25',
          'docker run -d --name web -p 8080:80 nginx:1.25',
          'docker logs web',
          'docker exec web whoami',
        ),
      ),
    ).toBe(true);

    expect(
      level('ops-health-restart').check(
        run(
          applyLevelStart(level('ops-health-restart')),
          'docker pull nginx:1.25',
          'docker run -d --name web --restart unless-stopped --healthcheck "wget -qO- http://127.0.0.1/" nginx:1.25',
        ),
      ),
    ).toBe(true);

    expect(
      level('ops-prune').check(
        run(applyLevelStart(level('ops-prune')), 'docker run -d --name tmp alpine:3.20', 'docker stop tmp', 'docker system prune'),
      ),
    ).toBe(true);

    expect(
      level('cleanup-order').check(
        run(
          applyLevelStart(level('cleanup-order')),
          'docker pull alpine:3.20',
          'docker run -d --name tmp1 alpine:3.20',
          'docker run -d --name tmp2 alpine:3.20',
          'docker stop tmp1 tmp2',
          'docker rm tmp1 tmp2',
          'docker rmi alpine:3.20',
        ),
      ),
    ).toBe(true);
  });

  it('security-nonroot + scan + hood + failure labs', () => {
    expect(
      level('security-nonroot').check(
        run(
          applyLevelStart(level('security-nonroot')),
          'docker pull nginx:1.25',
          'docker run -d --name web --user app nginx:1.25',
          'docker exec web whoami',
        ),
      ),
    ).toBe(true);

    expect(
      level('security-scan').check(
        run(
          applyLevelStart(level('security-scan')),
          'docker pull node:20',
          'docker pull alpine:3.20',
          'docker scan node:20',
        ),
      ),
    ).toBe(true);

    expect(
      level('hood-layers-write').check(
        run(
          applyLevelStart(level('hood-layers-write')),
          'docker pull alpine:3.20',
          'docker run -d --name c1 --read-only -v scratch:/tmp alpine:3.20',
          'docker run -d --name c2 alpine:3.20',
        ),
      ),
    ).toBe(true);

    const failStart = applyLevelStart(level('fail-image-in-use'));
    expect(level('fail-image-in-use').check(failStart)).toBe(false);
    expect(
      level('fail-image-in-use').check(
        run(failStart, 'docker rm -f web', 'docker rmi alpine:3.20'),
      ),
    ).toBe(true);
  });
});
