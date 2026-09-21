import { describe, expect, it } from 'vitest';
import { executeCommand } from '../engine/commands';
import { createInitialState } from '../engine/engine';
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

describe('docker engine commands', () => {
  it('pulls images into local storage', () => {
    const s = run(createInitialState(), 'docker pull alpine:3.20');
    expect(s.images).toHaveLength(1);
    expect(s.images[0].name).toBe('alpine:3.20');
  });

  it('rejects unknown registry images', () => {
    const result = executeCommand('docker pull nope/missing', createInitialState());
    expect(result.ok).toBe(false);
    expect(result.lines.join('\n')).toMatch(/pull access denied/);
  });

  it('runs a named detached container from a pulled image', () => {
    const s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker run -d --name web alpine:3.20',
    );
    expect(s.containers).toHaveLength(1);
    expect(s.containers[0].name).toBe('web');
    expect(s.containers[0].status).toBe('running');
  });

  it('starts two containers from one image without duplicating the image', () => {
    const s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker run -d --name web alpine:3.20',
      'docker run -d --name worker alpine:3.20',
    );
    expect(s.images).toHaveLength(1);
    expect(s.containers).toHaveLength(2);
    expect(s.containers[0].imageId).toBe(s.containers[1].imageId);
  });

  it('refuses to run an image that is not pulled', () => {
    const result = executeCommand('docker run -d alpine:3.20', createInitialState());
    expect(result.ok).toBe(false);
    expect(result.lines.join('\n')).toMatch(/Pull it first/);
  });

  it('stops, starts, and force-removes containers', () => {
    let s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker run -d --name demo alpine:3.20',
    );
    s = run(s, 'docker stop demo');
    expect(s.containers[0].status).toBe('exited');
    s = run(s, 'docker start demo');
    expect(s.containers[0].status).toBe('running');
    const rmRunning = executeCommand('docker rm demo', s);
    expect(rmRunning.ok).toBe(false);
    s = run(s, 'docker rm -f demo');
    expect(s.containers).toHaveLength(0);
  });

  it('builds an image with multiple layers from the demo Dockerfile', () => {
    const s = run(createInitialState(), 'docker build -t demo-app:1.0 .');
    const img = s.images.find((i) => i.repo === 'demo-app' && i.tag === '1.0');
    expect(img).toBeTruthy();
    expect(img!.layers.length).toBeGreaterThanOrEqual(4);
  });

  it('persists volume data after container removal', () => {
    let s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker volume create data-vol',
      'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
    );
    s = run(s, 'docker rm -f writer');
    const vol = s.volumes.find((v) => v.name === 'data-vol');
    expect(vol!.data['note.txt']).toBe('persisted');
    s = run(s, 'docker run -d --name reader -v data-vol:/data alpine:3.20');
    const reader = s.containers.find((c) => c.name === 'reader');
    expect(reader!.volumeMounts.some((m) => m.volume === 'data-vol')).toBe(true);
  });

  it('creates user-defined networks and connects containers', () => {
    const s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker network create app-net',
      'docker run -d --name db --network app-net alpine:3.20',
      'docker run -d --name app --network app-net alpine:3.20',
    );
    const net = s.networks.find((n) => n.name === 'app-net');
    expect(net!.containers.length).toBe(2);
    expect(s.containers.find((c) => c.name === 'app')!.networks).toContain('app-net');
  });

  it('publishes host ports on containers', () => {
    const s = run(
      createInitialState(),
      'docker pull nginx:1.25',
      'docker run -d --name web -p 8080:80 nginx:1.25',
    );
    expect(s.containers[0].ports).toEqual([
      { hostPort: 8080, containerPort: 80, protocol: 'tcp' },
    ]);
  });

  it('refuses to remove an image still used by a container', () => {
    const s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker run -d --name web alpine:3.20',
    );
    const result = executeCommand('docker rmi alpine:3.20', s);
    expect(result.ok).toBe(false);
  });

  it('inspects containers and images', () => {
    const s = run(
      createInitialState(),
      'docker pull alpine:3.20',
      'docker run -d --name web alpine:3.20',
    );
    const c = executeCommand('docker inspect web', s);
    expect(c.ok).toBe(true);
    expect(c.lines.join('\n')).toMatch(/Name: web/);
    const img = executeCommand('docker inspect alpine:3.20', s);
    expect(img.lines.join('\n')).toMatch(/Layers:/);
  });
});
