import type {
  AppProgress,
  Container,
  DockerState,
  ImageRef,
  LevelDefinition,
  Network,
  Volume,
} from '../engine/types';
import { cloneState } from '../engine/engine';
import { executeCommand } from '../engine/commands';
import {
  applyLevelStart,
  getLevel,
  LEVELS,
  loadProgress,
  recordSolve,
} from '../engine/session';
import { QUIZZES, quizzesForLevel } from '../levels';
import type { LogLine } from './Terminal';

export type AppMode = 'sandbox' | 'level';

export type Selection =
  | { kind: 'container'; id: string }
  | { kind: 'image'; id: string }
  | { kind: 'volume'; name: string }
  | { kind: 'network'; name: string }
  | null;

export interface AppState {
  mode: AppMode;
  levelId: string | null;
  state: DockerState;
  historyStack: DockerState[];
  commandCount: number;
  lines: LogLine[];
  selection: Selection;
  progress: AppProgress;
  showLevels: boolean;
  showIntro: boolean;
  showHelp: boolean;
  showCelebrate: boolean;
  celebrateLevelId: string | null;
  solvedFlash: boolean;
  focusToken: number;
  hint: string | null;
  extraCompletions: string[];
  justSolved: boolean;
}

export type Action =
  | { type: 'SUBMIT'; input: string }
  | { type: 'UNDO' }
  | { type: 'RESET' }
  | { type: 'SELECT'; selection: Selection }
  | { type: 'OPEN_LEVELS'; open?: boolean }
  | { type: 'INTRO_SEEN' }
  | { type: 'OPEN_HELP'; open?: boolean }
  | { type: 'START_LEVEL'; levelId: string }
  | { type: 'START_SANDBOX' }
  | { type: 'CLOSE_CELEBRATE' }
  | { type: 'DISMISS_SOLVED' };

let lineSeq = 1;

function pushLines(lines: LogLine[], outputs: string[], kind: LogLine['kind']): LogLine[] {
  const next = [...lines];
  for (const text of outputs) {
    if (text === '') {
      next.push({ id: lineSeq++, kind, text: ' ' });
      continue;
    }
    next.push({ id: lineSeq++, kind, text });
  }
  return next;
}

function welcomeLines(): LogLine[] {
  return [
    { id: lineSeq++, kind: 'sys', text: 'learnDocker 0.1.0 — simulated Docker daemon' },
    { id: lineSeq++, kind: 'sys', text: "Type 'help' for commands, 'levels' for tutorials." },
    { id: lineSeq++, kind: 'sys', text: 'Sandbox mode: empty daemon. Pull an image to begin.' },
  ];
}

export function createInitialState(): AppState {
  const progress = loadProgress();
  return {
    mode: 'sandbox',
    levelId: null,
    state: applyLevelStart(undefined),
    historyStack: [],
    commandCount: 0,
    lines: welcomeLines(),
    selection: null,
    progress,
    showLevels: false,
    showIntro: true,
    showHelp: false,
    showCelebrate: false,
    celebrateLevelId: null,
    solvedFlash: false,
    focusToken: 0,
    hint: null,
    extraCompletions: [],
    justSolved: false,
  };
}

function currentLevel(state: AppState): LevelDefinition | undefined {
  return state.levelId ? getLevel(state.levelId) : undefined;
}

function computeHint(state: AppState): string | null {
  const level = currentLevel(state);
  if (!level) return 'docker pull alpine:3.20';
  if (level.check(state.state)) return null;
  for (const step of level.steps) {
    if (step.optional) continue;
    // Heuristic: first step whose command hasn't clearly been "done" by win state.
    // Prefer the earliest step not reflected in state via a simple scan of golf history
    // is unavailable here — show first unchecked educational step as a progressive hint.
  }
  // Progressive: if no containers and no images from level start, show first step
  const remaining = level.steps.filter((s) => !s.optional);
  const doneCount = countDoneSteps(state, level);
  return remaining[doneCount]?.command ?? remaining[0]?.command ?? level.hint?.split('\n')[0] ?? null;
}

function countDoneSteps(state: AppState, level: LevelDefinition): number {
  // Match steps against state with lightweight heuristics per level id.
  const s = state.state;
  const done = level.steps.filter((step) => isStepEffectivelyDone(level.id, step.command, s)).length;
  return done;
}

function isStepEffectivelyDone(levelId: string, command: string, s: DockerState): boolean {
  if (command.startsWith('docker pull')) {
    const name = command.split(/\s+/)[2] ?? '';
    return s.images.some((i) => i.name === name || i.name.startsWith(name.split(':')[0] ?? ''));
  }
  if (command.startsWith('docker run')) {
    const nameMatch = command.match(/--name\s+(\S+)/);
    if (nameMatch) {
      const c = s.containers.find((x) => x.name === nameMatch[1]);
      return Boolean(c);
    }
  }
  if (command.startsWith('docker stop')) {
    const refs = command.split(/\s+/).slice(2);
    return refs.every((r) => s.containers.find((c) => c.name === r || c.id === r)?.status === 'exited');
  }
  if (command.startsWith('docker start')) {
    const ref = command.split(/\s+/)[2] ?? '';
    return s.containers.find((c) => c.name === ref || c.id === ref)?.status === 'running';
  }
  if (command.startsWith('docker rm')) {
    const refs = command.split(/\s+/).filter((t) => !t.startsWith('-')).slice(2);
    return refs.every((r) => !s.containers.find((c) => c.name === r || c.id === r));
  }
  if (command.startsWith('docker rmi')) {
    const name = command.split(/\s+/)[2] ?? '';
    return !s.images.find((i) => i.name === name);
  }
  if (command.startsWith('docker build')) {
    const tagMatch = command.match(/-t\s+(\S+)/);
    if (tagMatch) {
      const { repo, tag } = splitName(tagMatch[1]);
      return Boolean(s.images.find((i) => i.repo === repo && i.tag === tag));
    }
  }
  if (command.startsWith('docker volume create')) {
    const name = command.split(/\s+/)[3] ?? '';
    return Boolean(s.volumes.find((v) => v.name === name));
  }
  if (command.startsWith('docker network create')) {
    const name = command.split(/\s+/)[3] ?? '';
    return Boolean(s.networks.find((n) => n.name === name));
  }
  if (command.startsWith('docker inspect') || command.startsWith('docker logs') || command.startsWith('docker ps')) {
    // Always treated as pending optional verification — never blocks the "next" hint.
    return true;
  }
  // volume write run
  if (command.includes('echo') && command.includes('>')) {
    return Boolean(s.volumes.some((v) => Object.keys(v.data).length > 0));
  }
  void levelId;
  return false;
}

function splitName(name: string): { repo: string; tag: string } {
  const idx = name.lastIndexOf(':');
  if (idx <= 0) return { repo: name, tag: 'latest' };
  return { repo: name.slice(0, idx), tag: name.slice(idx + 1) };
}

function computeExtraCompletions(level: LevelDefinition | undefined): string[] {
  if (!level) return [];
  return [
    ...level.steps.map((s) => s.command),
    ...(level.hint ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
  ];
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SUBMIT': {
      return handleSubmit(state, action.input);
    }
    case 'UNDO': {
      if (state.historyStack.length === 0) {
        return {
          ...state,
          lines: pushLines(state.lines, ['nothing to undo'], 'err'),
          focusToken: state.focusToken + 1,
        };
      }
      const previous = state.historyStack[state.historyStack.length - 1];
      const next: AppState = {
        ...state,
        state: previous,
        historyStack: state.historyStack.slice(0, -1),
        commandCount: Math.max(0, state.commandCount - 1),
        lines: pushLines(state.lines, ['undid last command'], 'sys'),
        solvedFlash: false,
        showCelebrate: false,
        focusToken: state.focusToken + 1,
      };
      next.hint = computeHint(next);
      return next;
    }
    case 'RESET': {
      const level = currentLevel(state);
      const fresh = applyLevelStart(level);
      const next: AppState = {
        ...state,
        state: fresh,
        historyStack: [],
        commandCount: 0,
        selection: null,
        solvedFlash: false,
        showCelebrate: false,
        justSolved: false,
        lines: pushLines(
          state.lines,
          [level ? `reset level '${level.name}'` : 'reset sandbox daemon to empty state'],
          'sys',
        ),
        focusToken: state.focusToken + 1,
      };
      next.hint = computeHint(next);
      next.extraCompletions = computeExtraCompletions(level);
      return next;
    }
    case 'SELECT':
      return { ...state, selection: action.selection };
    case 'OPEN_LEVELS':
      return { ...state, showLevels: action.open ?? !state.showLevels };
    case 'OPEN_HELP':
      return { ...state, showHelp: action.open ?? !state.showHelp };
    case 'INTRO_SEEN':
      return { ...state, showIntro: false, focusToken: state.focusToken + 1 };
    case 'CLOSE_CELEBRATE':
      return {
        ...state,
        showCelebrate: false,
        celebrateLevelId: null,
        justSolved: false,
        focusToken: state.focusToken + 1,
      };
    case 'START_LEVEL': {
      const level = getLevel(action.levelId);
      if (!level) return state;
      const next: AppState = {
        ...state,
        mode: 'level',
        levelId: level.id,
        state: applyLevelStart(level),
        historyStack: [],
        commandCount: 0,
        selection: null,
        showLevels: false,
        solvedFlash: false,
        showCelebrate: false,
        celebrateLevelId: null,
        justSolved: false,
        lines: pushLines(
          state.lines,
          [`— level: ${level.name} (${level.series}) —`, level.brief, '', level.teaching].filter(
            Boolean,
          ),
          'sys',
        ),
        focusToken: state.focusToken + 1,
        extraCompletions: computeExtraCompletions(level),
      };
      next.hint = computeHint(next);
      return next;
    }
    case 'START_SANDBOX': {
      const next: AppState = {
        ...state,
        mode: 'sandbox',
        levelId: null,
        state: applyLevelStart(undefined),
        historyStack: [],
        commandCount: 0,
        selection: null,
        showLevels: false,
        solvedFlash: false,
        showCelebrate: false,
        celebrateLevelId: null,
        justSolved: false,
        lines: pushLines(state.lines, ['— sandbox mode —'], 'sys'),
        focusToken: state.focusToken + 1,
        extraCompletions: [],
      };
      next.hint = computeHint(next);
      return next;
    }
    case 'DISMISS_SOLVED':
      return { ...state, solvedFlash: false, focusToken: state.focusToken + 1 };
    default:
      return state;
  }
}

function handleSubmit(state: AppState, rawInput: string): AppState {
  const input = rawInput.trim();
  const lineIn: LogLine = { id: lineSeq++, kind: 'in', text: input };
  const focusToken = state.focusToken + 1;

  if (input === 'levels') {
    return {
      ...state,
      showLevels: true,
      lines: [...state.lines, lineIn, { id: lineSeq++, kind: 'sys', text: 'opening level map…' }],
      focusToken,
    };
  }
  if (input === 'sandbox') {
    return appReducer({ ...state, lines: [...state.lines, lineIn], focusToken }, { type: 'START_SANDBOX' });
  }
  if (input === 'reset') {
    return appReducer({ ...state, lines: [...state.lines, lineIn], focusToken }, { type: 'RESET' });
  }
  if (input === 'undo') {
    return appReducer({ ...state, lines: [...state.lines, lineIn], focusToken }, { type: 'UNDO' });
  }
  if (input === 'clear') {
    return { ...state, lines: [], focusToken };
  }
  if (input === 'hint' || input === 'steps') {
    const level = currentLevel(state);
    const levelLines = level
      ? [
          level.hint ?? level.steps.map((s) => s.command).join('\n'),
          '',
          ...level.steps.map((s) => `${s.optional ? '○' : '▸'} ${s.command}\n    ${s.note}`),
        ]
      : ['No active level. Open with `levels`.'];
    return {
      ...state,
      lines: pushLines([...state.lines, lineIn], levelLines, 'out'),
      focusToken,
    };
  }
  if (input === 'curriculum' || input === 'outcomes') {
    const level = currentLevel(state);
    const lines = level
      ? ['Outcomes for this level:', ...level.learning.map((o) => `• ${o}`), '', level.teaching]
      : LEVELS.flatMap((l) => [`${l.series}: ${l.name}`, ...l.learning.map((o) => `  • ${o}`)]);
    return {
      ...state,
      lines: pushLines([...state.lines, lineIn], lines, 'out'),
      focusToken,
    };
  }
  if (input === 'quiz' || input.startsWith('quiz ')) {
    const level = currentLevel(state);
    const q = level?.quiz?.length ? quizzesForLevel(level)[0] : QUIZZES[0];
    if (!q) {
      return {
        ...state,
        lines: pushLines([...state.lines, lineIn], ['No quiz available yet.'], 'out'),
        focusToken,
      };
    }
    const answer = input.slice(4).trim().toUpperCase();
    if (!answer) {
      return {
        ...state,
        lines: pushLines(
          [...state.lines, lineIn],
          [
            `Q: ${q.question}`,
            `  A) ${q.choices[0]}`,
            `  B) ${q.choices[1]}`,
            `  C) ${q.choices[2]}`,
            'Answer with: quiz A | quiz B | quiz C',
          ],
          'out',
        ),
        focusToken,
      };
    }
    const idx = answer === 'A' ? 0 : answer === 'B' ? 1 : answer === 'C' ? 2 : -1;
    if (idx < 0) {
      return {
        ...state,
        lines: pushLines([...state.lines, lineIn], ['Usage: quiz A | quiz B | quiz C'], 'err'),
        focusToken,
      };
    }
    const correct = idx === q.correct;
    return {
      ...state,
      lines: pushLines(
        [...state.lines, lineIn],
        [correct ? 'Correct.' : `Not quite. Best answer: ${['A', 'B', 'C'][q.correct]}`, q.explain],
        correct ? 'ok' : 'err',
      ),
      focusToken,
    };
  }

  const result = executeCommand(input, state.state);
  let lines = pushLines([...state.lines, lineIn], result.lines, result.ok ? 'out' : 'err');
  const commandCount = state.commandCount + (result.ok && input ? 1 : 0);

  const nextState: AppState = {
    ...state,
    state: result.state,
    lines,
    commandCount,
    historyStack: result.ok
      ? [...state.historyStack, cloneState(state.state)].slice(-50)
      : state.historyStack,
    solvedFlash: false,
    focusToken,
  };

  const level = currentLevel(nextState);
  if (level && level.check(nextState.state)) {
    const wasAlready = state.progress.levels[level.id]?.solved ?? false;
    const progress = recordSolve(state.progress, level.id, commandCount);
    lines = pushLines(
      lines,
      [
        '',
        `LEVEL SOLVED: ${level.name}`,
        `commands used: ${commandCount}  |  par: ${level.par}`,
        commandCount <= level.par
          ? 'Matched par. Clean work.'
          : `Over par by ${commandCount - level.par}. Try again for a tighter run.`,
      ],
      'ok',
    );
    return {
      ...nextState,
      lines,
      progress,
      solvedFlash: true,
      showCelebrate: true,
      celebrateLevelId: level.id,
      justSolved: !wasAlready || true,
      hint: null,
    };
  }

  nextState.hint = computeHint(nextState);
  nextState.extraCompletions = computeExtraCompletions(level);
  return nextState;
}

export function getSolvedCount(progress: AppProgress): number {
  return LEVELS.filter((l) => progress.levels[l.id]?.solved).length;
}

export function selectedObject(state: AppState):
  | { kind: 'container'; data: Container }
  | { kind: 'image'; data: ImageRef }
  | { kind: 'volume'; data: Volume }
  | { kind: 'network'; data: Network }
  | null {
  const sel = state.selection;
  if (!sel) return null;
  if (sel.kind === 'container') {
    const data = state.state.containers.find((c) => c.id === sel.id || c.name === sel.id);
    return data ? { kind: 'container', data } : null;
  }
  if (sel.kind === 'image') {
    const data = state.state.images.find((i) => i.imageId === sel.id || i.name === sel.id);
    return data ? { kind: 'image', data } : null;
  }
  if (sel.kind === 'volume') {
    const data = state.state.volumes.find((v) => v.name === sel.name);
    return data ? { kind: 'volume', data } : null;
  }
  if (sel.kind === 'network') {
    const data = state.state.networks.find((n) => n.name === sel.name);
    return data ? { kind: 'network', data } : null;
  }
  return null;
}

export { LEVELS, getLevel };
