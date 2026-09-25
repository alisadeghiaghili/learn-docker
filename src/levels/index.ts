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
import {
  COMPOSE_PROD_LEVELS,
  EXTRA_QUIZZES,
  FAILURE_BANK,
  HOOD_DRILLS,
  SECURITY_DRILLS,
} from './bank';
import { REGISTRY_LEVELS, REGISTRY_QUIZZES } from './registry-pack';
import { REGISTRY_ADV_LEVELS, REGISTRY_ADV_QUIZZES } from './registry-adv';
import { COVERAGE_LEVELS, COVERAGE_QUIZZES } from './coverage-pack';
import { SETUP_LEVELS } from './setup-pack';
import { FLUENCY_LEVELS } from './fluency';

export const LEVELS: LevelDefinition[] = [
  ...SETUP_LEVELS,
  ...BASIC_LEVELS,
  ...FLUENCY_LEVELS,
  ...BUILD_LEVELS,
  ...REGISTRY_LEVELS,
  ...REGISTRY_ADV_LEVELS,
  ...COMPOSE_LEVELS,
  ...COMPOSE_PROD_LEVELS,
  ...DATA_LEVELS,
  ...NETWORK_LEVELS,
  ...COVERAGE_LEVELS,
  ...OPS_LEVELS,
  ...SECURITY_LEVELS,
  ...SECURITY_DRILLS,
  ...HOOD_LEVELS,
  ...HOOD_DRILLS,
  ...FAILURE_LEVELS,
  ...FAILURE_BANK,
];

export const QUIZ_BANK: QuizQuestion[] = [
  ...QUIZZES,
  ...EXTRA_QUIZZES,
  ...REGISTRY_QUIZZES,
  ...REGISTRY_ADV_QUIZZES,
  ...COVERAGE_QUIZZES,
];

export { QUIZZES, EXTRA_QUIZZES };

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
  return QUIZ_BANK.find((q) => q.id === id);
}

export function quizzesForLevel(level: LevelDefinition): QuizQuestion[] {
  return (level.quiz ?? []).map((id) => QUIZ_BANK.find((q) => q.id === id)).filter(Boolean) as QuizQuestion[];
}

export function quizByIndex(index: number): QuizQuestion | undefined {
  return QUIZ_BANK[index % QUIZ_BANK.length];
}

export const CURRICULUM_OUTCOMES = [
  'Explain image vs container vs writable layer with a correct ownership story',
  'Use lifecycle verbs (run/start/stop/rm) without conflating them',
  'Design cache-friendly Dockerfiles and ship multi-stage runtime images',
  'Keep secrets out of image layers (runtime env / secret mounts)',
  'Model multi-service apps with compose, DNS, volumes, and depends_on limits',
  'Wire healthcheck + condition: service_healthy instead of start-order races',
  'Publish ports deliberately (EXPOSE vs -p) and fix bind conflicts',
  'Persist data with named volumes and know when bind mounts are right',
  'Operate: logs to stdout, exec, health, restart policies, scoped prune',
  'Harden: non-root, cap-drop, read-only + tmpfs, slim/distroless bases, scan-first',
  'Debug failure classes from daemon messages (ports, DNS, health, perms, image refs)',
  'Describe namespaces/cgroups/union FS well enough to predict isolation and limits',
];
