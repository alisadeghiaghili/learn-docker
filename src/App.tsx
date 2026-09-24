import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  appReducer,
  createInitialState,
  getSolvedCount,
  selectedObject,
} from './ui/appState';
import { Schematic } from './ui/Schematic';
import { Terminal } from './ui/Terminal';
import { HelpDialog, IntroDialog, LevelsDialog } from './ui/Dialogs';
import { CelebrateModal } from './ui/CelebrateModal';
import { getLevel, LEVELS } from './levels';
import './styles/app.css';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const level = state.levelId ? getLevel(state.levelId) : undefined;
  const selected = useMemo(() => selectedObject(state), [state]);
  const solvedCount = getSolvedCount(state.progress);
  const celebrateLevel = state.celebrateLevelId ? getLevel(state.celebrateLevelId) : null;
  const celebratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.showCelebrate || !celebrateLevel) return;
    if (celebratedRef.current === `${celebrateLevel.id}:${state.commandCount}`) return;
    celebratedRef.current = `${celebrateLevel.id}:${state.commandCount}`;
  }, [state.showCelebrate, celebrateLevel, state.commandCount]);

  const currentStepIndex = useMemo(() => {
    if (!level) return -1;
    if (level.check(state.state)) return level.steps.length;
    // Find first non-optional step not yet reflected — reuse hint string match
    const hint = state.hint;
    const idx = level.steps.findIndex((s) => !s.optional && s.command === hint);
    return idx >= 0 ? idx : 0;
  }, [level, state.state, state.hint]);

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
              images {state.state.images.length} · containers {state.state.containers.length} ·
              volumes {state.state.volumes.length} · nets {state.state.networks.length} · cmds{' '}
              {state.commandCount}
              {state.mode === 'level' && level ? ` · par ${level.par}` : ''}
            </div>
          </div>
          <Schematic
            state={state.state}
            selection={state.selection}
            onSelect={(selection) => dispatch({ type: 'SELECT', selection })}
          />
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
                <details className="teaching-box" open>
                  <summary className="next-title">What is happening</summary>
                  <p>{level.teaching}</p>
                </details>
                {level.learning.length > 0 && (
                  <div className="learning-box">
                    <div className="next-title">You are learning</div>
                    <ul>
                      {level.learning.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {level.fieldNotes && level.fieldNotes.length > 0 && (
                  <div className="field-box">
                    <div className="next-title">Field notes</div>
                    <ul>
                      {level.fieldNotes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="goal-list" aria-label="Level steps">
                  <div className="next-title">Steps</div>
                  <ul>
                    {level.steps.map((step, i) => {
                      const isDone = level.check(state.state) || i < currentStepIndex;
                      const isCurrent = !level.check(state.state) && i === currentStepIndex;
                      return (
                        <li
                          key={`${step.command}-${i}`}
                          className={`${isDone ? 'met' : ''}${isCurrent ? ' current' : ''}${step.optional ? ' optional' : ''}`}
                        >
                          <div className="g-label">
                            <span className="step-icon" aria-hidden>
                              {isDone ? '✓' : isCurrent ? '▶' : '○'}
                            </span>
                            <code>{step.command}</code>
                            {isCurrent ? <span className="chip current-chip">now</span> : null}
                            {step.optional ? <span className="chip">optional</span> : null}
                          </div>
                          <div className="g-detail">{step.note}</div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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
                  networks. Type <code>levels</code> when you want a guided path. Progress is saved
                  in this browser (cookie + local storage).
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
        hint={state.hint}
        extraCompletions={state.extraCompletions}
        focusToken={state.focusToken}
        onSubmit={(value) => dispatch({ type: 'SUBMIT', input: value })}
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
      {state.showCelebrate && celebrateLevel ? (
        <CelebrateModal
          levelId={celebrateLevel.id}
          levelName={celebrateLevel.name}
          series={celebrateLevel.series}
          par={celebrateLevel.par}
          commands={state.commandCount}
          progress={state.progress}
          onClose={() => dispatch({ type: 'CLOSE_CELEBRATE' })}
          onNext={(id) => {
            dispatch({ type: 'CLOSE_CELEBRATE' });
            dispatch({ type: 'START_LEVEL', levelId: id });
          }}
        />
      ) : null}
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
