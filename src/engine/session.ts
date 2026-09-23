import type { AppProgress, DockerState, LevelDefinition, LevelProgress } from './types';
import type { CurriculumSummary } from '../ui/share';
import { cloneState, createInitialState, runContainer, createNetwork, createVolume } from './engine';
import { findRegistryImage } from './registry';
import { LEVELS, getLevel, getNextLevel } from '../levels';

export const STORAGE_KEY = 'learndocker.progress.v1';
export const COOKIE_KEY = 'learn_docker_progress';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

interface PersistBlob {
  progress: Record<string, LevelProgress>;
  savedAt?: string;
}

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey !== COOKIE_KEY) continue;
    try {
      return decodeURIComponent(rest.join('='));
    } catch {
      return rest.join('=');
    }
  }
  return null;
}

function writeCookie(payload: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(payload)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function parseBlob(raw: string | null): Record<string, LevelProgress> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistBlob | Record<string, LevelProgress>;
    if (parsed && typeof parsed === 'object' && 'progress' in parsed) {
      return (parsed as PersistBlob).progress ?? {};
    }
    return parsed as Record<string, LevelProgress>;
  } catch {
    return null;
  }
}

export function loadProgress(): AppProgress {
  let fromLocal: Record<string, LevelProgress> | null = null;
  let fromCookie: Record<string, LevelProgress> | null = null;
  try {
    fromLocal = parseBlob(typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY));
  } catch {
    fromLocal = null;
  }
  try {
    fromCookie = parseBlob(readCookie());
  } catch {
    fromCookie = null;
  }
  const merged: Record<string, LevelProgress> = {};
  for (const src of [fromCookie ?? {}, fromLocal ?? {}]) {
    for (const [id, prog] of Object.entries(src)) {
      if (!prog) continue;
      const prev = merged[id];
      merged[id] = {
        solved: Boolean(prog.solved || prev?.solved),
        bestCommands:
          prev?.bestCommands == null
            ? prog.bestCommands
            : prog.bestCommands == null
              ? prev.bestCommands
              : Math.min(prev.bestCommands, prog.bestCommands),
        attempts: Math.max(prog.attempts ?? 0, prev?.attempts ?? 0),
        quizScore: prog.quizScore ?? prev?.quizScore,
      };
    }
  }
  return { levels: merged };
}

export function saveProgress(progress: AppProgress): void {
  const blob: PersistBlob = { progress: progress.levels, savedAt: new Date().toISOString() };
  const payload = JSON.stringify(blob);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // ignore
  }
  writeCookie(payload);
}

export function recordSolve(progress: AppProgress, levelId: string, commandsUsed: number): AppProgress {
  const prev = progress.levels[levelId] ?? { solved: false, bestCommands: null, attempts: 0 };
  const best = prev.bestCommands == null ? commandsUsed : Math.min(prev.bestCommands, commandsUsed);
  const next: AppProgress = {
    levels: {
      ...progress.levels,
      [levelId]: { solved: true, bestCommands: best, attempts: prev.attempts + 1 },
    },
    quizzes: progress.quizzes,
  };
  saveProgress(next);
  return next;
}

export function applyLevelStart(level: LevelDefinition | undefined): DockerState {
  let state = createInitialState();
  if (!level?.start) return state;
  const start = level.start;

  if (start.files) {
    state.files = { ...state.files, ...start.files };
  }
  if (start.prePulled) {
    for (const name of start.prePulled) {
      const catalog = findRegistryImage(name);
      if (!catalog || state.images.find((i) => i.name === catalog.name)) continue;
      state.images.push({
        name: catalog.name,
        repo: catalog.repo,
        tag: catalog.tag,
        imageId: `sha256:pre${state.nextImageSeq.toString(16).padStart(4, '0')}`,
        layers: catalog.layers.map((l) => ({ ...l })),
        sizeKb: catalog.sizeKb,
        created: new Date().toISOString(),
        vulns: catalog.vulns ? { ...catalog.vulns } : undefined,
        user: catalog.user ?? 'root',
      });
      state.nextImageSeq += 1;
    }
  }
  if (start.compose) {
    const compose = structuredClone(start.compose);
    state.compose = compose;
    const netName = compose.networks[0];
    if (netName && !state.networks.find((n) => n.name === netName)) {
      state = createNetwork(state, netName);
    }
    for (const v of compose.volumes ?? []) {
      if (!state.volumes.find((x) => x.name === v)) state = createVolume(state, v);
    }
  }
  if (start.containers) {
    for (const spec of start.containers) {
      const catalog = findRegistryImage(spec.image);
      if (catalog && !state.images.find((i) => i.name === catalog.name)) {
        state.images.push({
          name: catalog.name,
          repo: catalog.repo,
          tag: catalog.tag,
          imageId: `sha256:pre${state.nextImageSeq.toString(16).padStart(4, '0')}`,
          layers: catalog.layers.map((l) => ({ ...l })),
          sizeKb: catalog.sizeKb,
          created: new Date().toISOString(),
        });
        state.nextImageSeq += 1;
      }
      const result = runContainer(state, spec.image, {
        name: spec.name,
        detach: true,
        ports: spec.ports ?? [],
        volumes: spec.volumeMounts ?? [],
        network: spec.networks?.[0],
        env: spec.env ?? {},
        command: spec.command ? spec.command.split(' ') : undefined,
      });
      state = result.state;
    }
  }
  return state;
}

export function summarizeCurriculum(progress: AppProgress): CurriculumSummary {
  const learned: CurriculumSummary['learned'] = [];
  const remaining: CurriculumSummary['remaining'] = [];
  let next: CurriculumSummary['next'] = null;

  for (const level of LEVELS) {
    const item = {
      id: level.id,
      name: level.name,
      seriesTitle: level.series,
      outcomes: level.learning,
    };
    if (progress.levels[level.id]?.solved) learned.push(item);
    else {
      remaining.push(item);
      if (!next) next = item;
    }
  }

  const lastSolvedIdx = LEVELS.reduce((acc, l, i) => (progress.levels[l.id]?.solved ? i : acc), -1);
  const officialNext = lastSolvedIdx >= 0 ? getNextLevel(LEVELS[lastSolvedIdx]!.id) : LEVELS[0];
  if (officialNext && progress.levels[officialNext.id]?.solved) next = remaining[0] ?? null;
  else if (officialNext) next = remaining.find((r) => r.id === officialNext.id) ?? remaining[0] ?? null;

  return {
    solvedCount: learned.length,
    total: LEVELS.length,
    learned,
    remaining,
    next,
    percent: LEVELS.length ? Math.round((learned.length / LEVELS.length) * 100) : 0,
  };
}

export function resumeLine(summary: CurriculumSummary): string {
  if (!summary.solvedCount) {
    return `No saved progress yet (${summary.total} levels waiting). Start with \`levels\`.`;
  }
  const nextText = summary.next ? `Next up: ${summary.next.name}` : 'All levels cleared.';
  return [
    `Welcome back — progress saved: ${summary.solvedCount}/${summary.total} levels (${summary.percent}%).`,
    `Learned so far: ${summary.learned.map((l) => l.name).join(' · ')}`,
    nextText,
    'Open Levels to resume. Type `steps` after starting a level. Type `quiz` to test concepts.',
  ].join('\n');
}

export { LEVELS, getLevel, getNextLevel, cloneState };
