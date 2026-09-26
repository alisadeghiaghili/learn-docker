import { useEffect, useMemo, useReducer, useState } from 'react';
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
import { BrandMark } from './ui/BrandMark';
import { getLevel, LEVELS, getNextLevel } from './levels';
import './styles/app.css';

type NavAction =
  | 'levels'
  | 'hint'
  | 'steps'
  | 'curriculum'
  | 'rubric'
  | 'review'
  | 'mastery'
  | 'quiz'
  | 'undo'
  | 'reset'
  | 'sandbox'
  | 'help'
  | 'lesson';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [navOpen, setNavOpen] = useState(false);
  const level = state.levelId ? getLevel(state.levelId) : undefined;
  const selected = useMemo(() => selectedObject(state), [state]);
  const solvedCount = getSolvedCount(state.progress);
  const celebrateLevel = state.celebrateLevelId ? getLevel(state.celebrateLevelId) : null;
  const nextLevel = level ? getNextLevel(level.id) : LEVELS[0];

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const runNav = (action: NavAction) => {
    setNavOpen(false);
    switch (action) {
      case 'levels':
        dispatch({ type: 'OPEN_LEVELS', open: true });
        break;
      case 'undo':
        dispatch({ type: 'UNDO' });
        break;
      case 'reset':
        dispatch({ type: 'RESET' });
        break;
      case 'sandbox':
        dispatch({ type: 'START_SANDBOX' });
        break;
      case 'help':
        dispatch({ type: 'OPEN_HELP', open: true });
        break;
      case 'hint':
      case 'steps':
      case 'curriculum':
      case 'rubric':
      case 'review':
      case 'mastery':
      case 'quiz':
        dispatch({ type: 'SUBMIT', input: action });
        break;
      case 'lesson':
        if (level?.teaching) {
          dispatch({ type: 'SUBMIT', input: 'curriculum' });
        } else {
          dispatch({ type: 'OPEN_HELP', open: true });
        }
        break;
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand" title="learnDocker">
          <BrandMark size={30} />
          <div className="brand-text">
            <div className="brand-name">
              learn<span className="brand-accent">Docker</span>
            </div>
            <div className="brand-sub">interactive visualizer · tutorial</div>
          </div>
        </div>

        <div className="level-title" title={level?.name ?? 'Sandbox'}>
          <span className="level-title-mode">
            {state.mode === 'level' ? (level?.series ?? 'Level') : 'Sandbox'}
          </span>
          <span className="level-title-name">
            {state.mode === 'level' ? (level?.name ?? '') : 'Free play — empty daemon'}
          </span>
        </div>

        <div className="toolbar-actions tb-row">
          <button type="button" className="tb-btn primary" onClick={() => runNav('levels')}>
            Levels
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('lesson')}>
            Lesson
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('steps')}>
            Guide
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('hint')}>
            Hint
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('curriculum')}>
            Solution
          </button>
          <button
            type="button"
            className="tb-btn"
            onClick={() => runNav('undo')}
            disabled={state.historyStack.length === 0}
          >
            Undo
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('reset')}>
            Reset
          </button>
          <button type="button" className="tb-btn" onClick={() => runNav('sandbox')}>
            Sandbox
          </button>
          <button
            type="button"
            className="tb-btn tb-icon"
            onClick={() => runNav('help')}
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
          <a
            className="tb-btn tb-icon"
            href="https://github.com/alisadeghiaghili/learn-docker"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </a>
          <a
            className="tb-btn tb-coffee"
            href="https://www.buymeacoffee.com/alisadeghil"
            target="_blank"
            rel="noopener noreferrer"
            title="Buy me a coffee"
          >
            Buy me a coffee
          </a>
          <button
            type="button"
            className={`tb-btn nav-toggle${navOpen ? ' is-open' : ''}`}
            aria-expanded={navOpen}
            aria-controls="nav-drawer"
            aria-label="More menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="nav-bars" aria-hidden="true" />
          </button>
          {navOpen && (
            <div className="nav-drawer" id="nav-drawer" role="menu">
              <button type="button" role="menuitem" onClick={() => runNav('mastery')}>
                Mastery map
              </button>
              <button type="button" role="menuitem" onClick={() => runNav('rubric')}>
                Rubric essays
              </button>
              <button type="button" role="menuitem" onClick={() => runNav('review')}>
                Spaced review
              </button>
              <button type="button" role="menuitem" onClick={() => runNav('quiz')}>
                Quiz
              </button>
              <hr />
              <button type="button" role="menuitem" onClick={() => runNav('help')}>
                Help & tracks
              </button>
            </div>
          )}
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
                      const isDone = level.check(state.state) || i < currentStepIndex(level, state as never);
                      const isCurrent = !level.check(state.state) && i === currentStepIndex(level, state as never);
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
                <div className="next-box">
                  <div className="next-title">Next</div>
                  <button type="button" className="primary" onClick={() => runNav('hint')}>
                    Show next command
                  </button>
                  {nextLevel ? (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => dispatch({ type: 'START_LEVEL', levelId: nextLevel.id })}
                    >
                      Skip → {nextLevel.name}
                    </button>
                  ) : null}
                </div>
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
                  networks. Type <code>levels</code> for the guided path (Start with{' '}
                  <strong>Setup</strong>). Progress is saved in this browser.
                </p>
                <div className="learning-box">
                  <div className="next-title">Start here</div>
                  <ul>
                    <li>Open Levels → Setup 00–05</li>
                    <li>Then Basics while Track B installs on your machine</li>
                    <li>Run labs/run-all.ps1 when Docker Server is up</li>
                  </ul>
                </div>
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

function currentStepIndex(level: ReturnType<typeof getLevel>, state: { state: never; hint: string | null }) {
  if (!level) return -1;
  if (level.check(state.state)) return level.steps.length;
  const idx = level.steps.findIndex((s) => !s.optional && s.command === state.hint);
  return idx >= 0 ? idx : 0;
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
