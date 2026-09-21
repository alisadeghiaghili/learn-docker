import { useCallback, useMemo, useReducer, useState } from 'react';
import {
  appReducer,
  createInitialState,
  getSolvedCount,
  selectedObject,
} from './ui/appState';
import { Schematic } from './ui/Schematic';
import { Terminal } from './ui/Terminal';
import { HelpDialog, IntroDialog, LevelsDialog } from './ui/Dialogs';
import { getLevel, LEVELS } from './levels';
import './styles/app.css';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [input, setInput] = useState('');
  const level = state.levelId ? getLevel(state.levelId) : undefined;
  const selected = useMemo(() => selectedObject(state), [state]);
  const solvedCount = getSolvedCount(state.progress);

  const onHistory = useCallback(
    (direction: 1 | -1): string | undefined => {
      const hist = state.commandHistory;
      if (hist.length === 0) return '';
      const idx =
        state.historyIndex === null
          ? hist.length - 1
          : state.historyIndex + direction;
      const clamped = Math.max(0, Math.min(hist.length - 1, idx));
      dispatch({ type: 'HISTORY_NAV', direction });
      return hist[clamped];
    },
    [state.commandHistory, state.historyIndex],
  );

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          learnDocker
        </div>
        <span className={`mode-pill${state.mode === 'level' ? ' level' : ''}`}>
          {state.mode === 'level' ? `level · ${level?.name ?? ''}` : 'sandbox'}
        </span>
        <div className="toolbar-actions">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_LEVELS', open: true })}>
            levels
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.historyStack.length === 0}
          >
            undo
          </button>
          <button type="button" onClick={() => dispatch({ type: 'RESET' })}>
            reset
          </button>
          <button type="button" className="ghost" onClick={() => dispatch({ type: 'OPEN_HELP', open: true })}>
            help
          </button>
        </div>
      </header>

      <div className="main-row">
        <div className="canvas-wrap">
          <div className="canvas-header">
            <div className="canvas-title">daemon schematic</div>
            <div className="canvas-stats">
              images {state.state.images.length} · containers{' '}
              {state.state.containers.length} · volumes {state.state.volumes.length} · nets{' '}
              {state.state.networks.length} · cmds {state.commandCount}
              {state.mode === 'level' && level ? ` · par ${level.par}` : ''}
            </div>
          </div>
          <Schematic
            state={state.state}
            selection={state.selection}
            onSelect={(selection) => dispatch({ type: 'SELECT', selection })}
          />
          {state.solvedFlash && level && (
            <div className="solved-overlay">
              LEVEL SOLVED — {level.name} · {state.commandCount}/{level.par} commands ·{' '}
              <button
                type="button"
                className="ghost"
                onClick={() => dispatch({ type: 'OPEN_LEVELS', open: true })}
              >
                next level
              </button>
            </div>
          )}
        </div>

        <aside className="side">
          <div className="level-brief">
            {level ? (
              <>
                <div className="level-meta">
                  <span>{level.series}</span>
                  <span>par {level.par}</span>
                  <span>
                    {state.progress.levels[level.id]?.solved
                      ? `solved · best ${state.progress.levels[level.id].bestCommands}`
                      : 'in progress'}
                  </span>
                </div>
                <h2>{level.name}</h2>
                <p>{level.brief}</p>
                {level.hint && (
                  <div className="level-hint">
                    hint
                    {'\n'}
                    {level.hint}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="level-meta">
                  <span>sandbox</span>
                  <span>
                    {solvedCount}/{LEVELS.length} levels solved
                  </span>
                </div>
                <h2>Free play</h2>
                <p>
                  Empty simulated daemon. Pull images, run containers, mount volumes, wire
                  networks. Type <code>levels</code> when you want a guided path.
                </p>
              </>
            )}
          </div>
          <div className="inspector">
            <h3>Inspector</h3>
            {selected ? (
              <pre>{formatSelection(selected)}</pre>
            ) : (
              <div className="inspector-empty">
                Click an image, container, volume, or network in the schematic to inspect it.
              </div>
            )}
          </div>
        </aside>
      </div>

      <Terminal
        lines={state.lines}
        value={input}
        onChange={setInput}
        onSubmit={(value) => dispatch({ type: 'SUBMIT', input: value })}
        onHistory={onHistory}
        historyValue={null}
      />

      <LevelsDialog
        open={state.showLevels}
        progress={state.progress}
        activeLevelId={state.levelId}
        onClose={() => dispatch({ type: 'OPEN_LEVELS', open: false })}
        onStartLevel={(id) => dispatch({ type: 'START_LEVEL', levelId: id })}
        onStartSandbox={() => dispatch({ type: 'START_SANDBOX' })}
      />
      <IntroDialog
        open={state.showIntro}
        onClose={() => dispatch({ type: 'INTRO_SEEN' })}
        onOpenLevels={() => dispatch({ type: 'OPEN_LEVELS', open: true })}
      />
      <HelpDialog open={state.showHelp} onClose={() => dispatch({ type: 'OPEN_HELP', open: false })} />
    </div>
  );
}

function formatSelection(selected: NonNullable<ReturnType<typeof selectedObject>>): string {
  const { kind, data } = selected;
  if (kind === 'container') {
    return [
      `id: ${data.id}`,
      `name: ${data.name}`,
      `image: ${data.image}`,
      `status: ${data.status}${data.exitCode !== undefined ? ` (${data.exitCode})` : ''}`,
      `command: ${data.command}`,
      `hostname: ${data.hostname}`,
      `ports: ${data.ports.map((p) => `${p.hostPort}->${p.containerPort}/${p.protocol}`).join(', ') || '—'}`,
      `networks: ${data.networks.join(', ') || '—'}`,
      `volumes: ${data.volumeMounts.map((m) => `${m.volume}:${m.path}`).join(', ') || '—'}`,
      `env: ${Object.entries(data.env).map(([k, v]) => `${k}=${v}`).join(' ') || '—'}`,
      ...Object.entries(data.volumeData).map(([k, v]) => `fs ${k}: ${v}`),
    ].join('\n');
  }
  if (kind === 'image') {
    return [
      `name: ${data.name}`,
      `id: ${data.imageId}`,
      `layers: ${data.layers.length}`,
      ...data.layers.map((l, i) => `  ${i + 1}. ${l.instruction} (${l.sizeKb}kB)`),
      `size: ${data.sizeKb}kB`,
    ].join('\n');
  }
  if (kind === 'volume') {
    return [
      `name: ${data.name}`,
      `driver: local`,
      `created: ${data.createdAt}`,
      ...Object.entries(data.data).map(([k, v]) => `file ${k}: ${v}`),
    ].join('\n');
  }
  return [
    `name: ${data.name}`,
    `driver: ${data.driver}`,
    `subnet: ${data.subnet ?? 'n/a'}`,
    `containers: ${data.containers.length}`,
  ].join('\n');
}
