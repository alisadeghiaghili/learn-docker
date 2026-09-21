import type { AppProgress, DockerState, LevelProgress } from './types';
import { cloneState, createInitialState } from './engine';
import { findRegistryImage } from './registry';
import { LEVELS, getLevel } from '../levels';
import type { LevelDefinition } from './types';

const STORAGE_KEY = 'learndocker.progress.v1';

export function loadProgress(): AppProgress {
  if (typeof localStorage === 'undefined') {
    return { levels: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { levels: {} };
    const parsed = JSON.parse(raw) as AppProgress;
    return { levels: parsed.levels ?? {} };
  } catch {
    return { levels: {} };
  }
}

export function saveProgress(progress: AppProgress): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function applyLevelStart(level: LevelDefinition | undefined): DockerState {
  let state = createInitialState();
  if (!level?.start) {
    return state;
  }
  const start = level.start;
  if (start.prePulled) {
    for (const name of start.prePulled) {
      const catalog = findRegistryImage(name);
      if (!catalog) continue;
      const existing = state.images.find((i) => i.name === catalog.name);
      if (existing) continue;
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
  }
  return state;
}

export function recordSolve(
  progress: AppProgress,
  levelId: string,
  commandsUsed: number,
): AppProgress {
  const prev: LevelProgress = progress.levels[levelId] ?? {
    solved: false,
    bestCommands: null,
    attempts: 0,
  };
  const best =
    prev.bestCommands === null
      ? commandsUsed
      : Math.min(prev.bestCommands, commandsUsed);
  return {
    levels: {
      ...progress.levels,
      [levelId]: {
        solved: true,
        bestCommands: best,
        attempts: prev.attempts + 1,
      },
    },
  };
}

export function recordAttempt(progress: AppProgress, levelId: string): AppProgress {
  const prev = progress.levels[levelId] ?? {
    solved: false,
    bestCommands: null,
    attempts: 0,
  };
  return {
    levels: {
      ...progress.levels,
      [levelId]: { ...prev, attempts: prev.attempts + 1 },
    },
  };
}

export function checkLevel(levelId: string, state: DockerState): boolean {
  const level = getLevel(levelId);
  if (!level) return false;
  return level.check(state);
}

export { LEVELS, getLevel, cloneState };
