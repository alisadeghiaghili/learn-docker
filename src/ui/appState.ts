import type {
  AppProgress,
  Container,
  DockerState,
  EngineOutput,
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
  saveProgress,
} from '../engine/session';

export type AppMode = 'sandbox' | 'level';

export interface TerminalLine {
  id: number;
  kind: 'in' | 'out' | 'ok' | 'err' | 'sys';
  text: string;
}

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
  lines: TerminalLine[];
  selection: Selection;
  progress: AppProgress;
  showLevels: boolean;
  showIntro: boolean;
  showHelp: boolean;
  solvedFlash: boolean;
  commandHistory: string[];
  historyIndex: number | null;
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
  | { type: 'HISTORY_NAV'; direction: 1 | -1 }
  | { type: 'DISMISS_SOLVED' };

let lineSeq = 1;

function pushLines(lines: TerminalLine[], outputs: string[], kind: TerminalLine['kind']): TerminalLine[] {
  const next = [...lines];
  for (const text of outputs) {
    next.push({ id: lineSeq++, kind, text });
  }
  return next;
}

function welcomeLines(): TerminalLine[] {
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
    solvedFlash: false,
    commandHistory: [],
    historyIndex: null,
  };
}

function currentLevel(state: AppState): LevelDefinition | undefined {
  return state.levelId ? getLevel(state.levelId) : undefined;
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
        };
      }
      const previous = state.historyStack[state.historyStack.length - 1];
      return {
        ...state,
        state: previous,
        historyStack: state.historyStack.slice(0, -1),
        commandCount: Math.max(0, state.commandCount - 1),
        lines: pushLines(state.lines, ['undid last command'], 'sys'),
        solvedFlash: false,
        historyIndex: null,
      };
    }
    case 'RESET': {
      const level = currentLevel(state);
      const fresh = applyLevelStart(level);
      return {
        ...state,
        state: fresh,
        historyStack: [],
        commandCount: 0,
        selection: null,
        solvedFlash: false,
        lines: pushLines(
          state.lines,
          [
            level
              ? `reset level '${level.name}'`
              : 'reset sandbox daemon to empty state',
          ],
          'sys',
        ),
        historyIndex: null,
      };
    }
    case 'SELECT':
      return { ...state, selection: action.selection };
    case 'OPEN_LEVELS':
      return { ...state, showLevels: action.open ?? !state.showLevels };
    case 'OPEN_HELP':
      return { ...state, showHelp: action.open ?? !state.showHelp };
    case 'INTRO_SEEN':
      return { ...state, showIntro: false };
    case 'START_LEVEL': {
      const level = getLevel(action.levelId);
      if (!level) return state;
      return {
        ...state,
        mode: 'level',
        levelId: level.id,
        state: applyLevelStart(level),
        historyStack: [],
        commandCount: 0,
        selection: null,
        showLevels: false,
        solvedFlash: false,
        lines: pushLines(
          state.lines,
          [
            `— level: ${level.name} (${level.series}) —`,
            level.brief,
            level.hint ? `hint:\n${level.hint}` : '',
          ].filter(Boolean),
          'sys',
        ),
        historyIndex: null,
      };
    }
    case 'START_SANDBOX':
      return {
        ...state,
        mode: 'sandbox',
        levelId: null,
        state: applyLevelStart(undefined),
        historyStack: [],
        commandCount: 0,
        selection: null,
        showLevels: false,
        solvedFlash: false,
        lines: pushLines(state.lines, ['— sandbox mode —'], 'sys'),
        historyIndex: null,
      };
    case 'HISTORY_NAV': {
      if (state.commandHistory.length === 0) return state;
      const max = state.commandHistory.length - 1;
      const idx =
        state.historyIndex === null
          ? action.direction === -1
            ? max
            : max
          : state.historyIndex + action.direction;
      const clamped = Math.max(0, Math.min(max, idx));
      return { ...state, historyIndex: clamped };
    }
    case 'DISMISS_SOLVED':
      return { ...state, solvedFlash: false };
    default:
      return state;
  }
}

function handleSubmit(state: AppState, rawInput: string): AppState {
  const input = rawInput.trim();
  const lineIn: TerminalLine = { id: lineSeq++, kind: 'in', text: input };

  // Meta commands handled by the app shell (not the engine)
  if (input === 'levels') {
    return {
      ...state,
      showLevels: true,
      lines: [...state.lines, lineIn, { id: lineSeq++, kind: 'sys', text: 'opening level map…' }],
      commandHistory: input ? [...state.commandHistory, input] : state.commandHistory,
      historyIndex: null,
    };
  }
  if (input === 'sandbox') {
    return appReducer({ ...state, lines: [...state.lines, lineIn] }, { type: 'START_SANDBOX' });
  }
  if (input === 'reset') {
    return appReducer({ ...state, lines: [...state.lines, lineIn] }, { type: 'RESET' });
  }
  if (input === 'undo') {
    return appReducer({ ...state, lines: [...state.lines, lineIn] }, { type: 'UNDO' });
  }
  if (input === 'clear') {
    return { ...state, lines: [], historyIndex: null };
  }

  const result: EngineOutput & { state: DockerState } = executeCommand(input, state.state);
  let lines = pushLines([...state.lines, lineIn], result.lines, result.ok ? 'out' : 'err');

  const commandCount = state.commandCount + 1;
  const nextState: AppState = {
    ...state,
    state: result.state,
    lines,
    commandCount,
    historyStack: result.ok
      ? [...state.historyStack, cloneState(state.state)].slice(-50)
      : state.historyStack,
    commandHistory: input ? [...state.commandHistory, input].slice(-100) : state.commandHistory,
    historyIndex: null,
    solvedFlash: false,
  };

  const level = currentLevel(nextState);
  if (level && level.check(nextState.state)) {
    const progress = recordSolve(state.progress, level.id, commandCount);
    saveProgress(progress);
    lines = pushLines(lines, [
      '',
      `LEVEL SOLVED: ${level.name}`,
      `commands used: ${commandCount}  |  par: ${level.par}`,
      commandCount <= level.par
        ? 'Matched par. Clean work.'
        : `Over par by ${commandCount - level.par}. Try again for a tighter run.`,
      'type levels for the next challenge, or sandbox to experiment',
    ], 'ok');
    return {
      ...nextState,
      lines,
      progress,
      solvedFlash: true,
    };
  }

  // Track attempts when a level command runs but doesn't solve
  if (level && result.ok && !level.check(nextState.state)) {
    // only count once per solve cycle via commandCount already
  }

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

export { LEVELS };
