import { describe, expect, it } from 'vitest';
import { executeCommand } from '../engine/commands';
import { createInitialState } from '../engine/engine';
import { applyLevelStart } from '../engine/session';
import { LEVELS } from '../levels';
import type { DockerState } from '../engine/types';

function run(state: DockerState, ...cmds: string[]): DockerState {
  let s = state;
  for (const cmd of cmds) {
    const result = executeCommand(cmd, s);
    if (!result.ok) {
      throw new Error(`Command failed: ${cmd}\n${result.lines.join('\n')}`);
    }
    s = result.state;
  }
  return s;
}

describe('levels', () => {
  it('exposes a coherent curriculum', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(8);
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('intro-hello solves via pull + run hello-world', () => {
    const level = LEVELS.find((l) => l.id === 'intro-hello')!;
    const start = applyLevelStart(level);
    expect(level.check(start)).toBe(false);
    const solved = run(start, 'docker pull hello-world', 'docker run hello-world');
    expect(level.check(solved)).toBe(true);
  });

  it('image-vs-container requires two running containers on one image', () => {
    const level = LEVELS.find((l) => l.id === 'image-vs-container')!;
    const start = applyLevelStart(level);
    const partial = run(start, 'docker pull alpine:3.20', 'docker run -d --name web alpine:3.20');
    expect(level.check(partial)).toBe(false);
    const solved = run(partial, 'docker run -d --name worker alpine:3.20');
    expect(level.check(solved)).toBe(true);
  });

  it('lifecycle ends with demo running again', () => {
    const level = LEVELS.find((l) => l.id === 'lifecycle')!;
    const start = applyLevelStart(level);
    // pre-pulled
    expect(start.images.some((i) => i.name === 'alpine:3.20')).toBe(true);
    const stopped = run(
      start,
      'docker run -d --name demo alpine:3.20',
      'docker stop demo',
    );
    expect(level.check(stopped)).toBe(false);
    const solved = run(stopped, 'docker start demo');
    expect(level.check(solved)).toBe(true);
  });

  it('build-layers requires a multi-layer demo-app image', () => {
    const level = LEVELS.find((l) => l.id === 'build-layers')!;
    const start = applyLevelStart(level);
    const solved = run(start, 'docker build -t demo-app:1.0 .');
    expect(level.check(solved)).toBe(true);
  });

  it('volumes-persist requires data to survive container removal', () => {
    const level = LEVELS.find((l) => l.id === 'volumes-persist')!;
    const start = applyLevelStart(level);
    const written = run(
      start,
      'docker volume create data-vol',
      'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
    );
    expect(level.check(written)).toBe(false);
    const solved = run(
      written,
      'docker rm -f writer',
      'docker run -d --name reader -v data-vol:/data alpine:3.20',
    );
    expect(level.check(solved)).toBe(true);
  });

  it('networks level requires two containers on app-net', () => {
    const level = LEVELS.find((l) => l.id === 'networks')!;
    const start = applyLevelStart(level);
    const solved = run(
      start,
      'docker network create app-net',
      'docker run -d --name db --network app-net alpine:3.20',
      'docker run -d --name app --network app-net alpine:3.20',
    );
    expect(level.check(solved)).toBe(true);
  });

  it('ports level requires 8080->80 on nginx', () => {
    const level = LEVELS.find((l) => l.id === 'ports')!;
    const start = applyLevelStart(level);
    const solved = run(
      start,
      'docker pull nginx:1.25',
      'docker run -d --name web -p 8080:80 nginx:1.25',
    );
    expect(level.check(solved)).toBe(true);
  });

  it('cleanup level requires alpine image and containers gone after use', () => {
    const level = LEVELS.find((l) => l.id === 'cleanup')!;
    const start = applyLevelStart(level);
    expect(level.check(start)).toBe(false);
    const mid = run(
      start,
      'docker pull alpine:3.20',
      'docker run -d --name tmp1 alpine:3.20',
      'docker run -d --name tmp2 alpine:3.20',
    );
    expect(level.check(mid)).toBe(false);
    const solved = run(
      mid,
      'docker stop tmp1 tmp2',
      'docker rm tmp1 tmp2',
      'docker rmi alpine:3.20',
    );
    expect(level.check(solved)).toBe(true);
  });

  it('starts empty sandbox with default networks only', () => {
    const s = createInitialState();
    expect(s.images).toHaveLength(0);
    expect(s.containers).toHaveLength(0);
    expect(s.networks.map((n) => n.name).sort()).toEqual(['bridge', 'host', 'none']);
  });
});
