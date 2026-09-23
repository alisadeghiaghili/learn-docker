import type { LevelDefinition, QuizQuestion } from '../engine/types';
import {
  BASIC_LEVELS,
  BUILD_LEVELS,
  COMPOSE_LEVELS,
  DATA_LEVELS,
  FAILURE_LEVELS,
  HOOD_LEVELS,
  NETWORK_LEVELS,
  OPS_LEVELS,
  QUIZZES,
  SECURITY_LEVELS,
} from './catalog';

export const LEVELS: LevelDefinition[] = [
  ...BASIC_LEVELS,
  ...BUILD_LEVELS,
  ...COMPOSE_LEVELS,
  ...DATA_LEVELS,
  ...NETWORK_LEVELS,
  ...OPS_LEVELS,
  ...SECURITY_LEVELS,
  ...HOOD_LEVELS,
  ...FAILURE_LEVELS,
];

export { QUIZZES };

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevel(id: string): LevelDefinition | undefined {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return LEVELS[0];
  return LEVELS[idx + 1];
}

export function levelsBySeries(): Array<{ series: string; levels: LevelDefinition[] }> {
  const map = new Map<string, LevelDefinition[]>();
  for (const level of LEVELS) {
    const list = map.get(level.series) ?? [];
    list.push(level);
    map.set(level.series, list);
  }
  return Array.from(map.entries()).map(([series, levels]) => ({ series, levels }));
}

export function getQuiz(id: string): QuizQuestion | undefined {
  return QUIZZES.find((q) => q.id === id);
}

export function quizzesForLevel(level: LevelDefinition): QuizQuestion[] {
  return (level.quiz ?? []).map((id) => QUIZZES.find((q) => q.id === id)).filter(Boolean) as QuizQuestion[];
}

export const CURRICULUM_OUTCOMES = [
  'Explain image vs container vs writable layer with a correct ownership story',
  'Use lifecycle verbs (run/start/stop/rm) without conflating them',
  'Design cache-friendly Dockerfiles and ship multi-stage runtime images',
  'Model multi-service apps with compose, DNS, volumes, and depends_on limits',
  'Publish ports deliberately (EXPOSE vs -p) and fix bind conflicts',
  'Persist data with named volumes and know when bind mounts are right',
  'Operate: logs, exec, healthchecks, restart policies, prune with a map',
  'Harden: non-root, slim bases, scan-first, no docker.sock in app containers',
  'Debug failure classes from daemon messages (ports, image refs, health)',
  'Describe namespaces/cgroups/union FS well enough to predict behavior',
];
