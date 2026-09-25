import { levelsBySeries, LEVELS } from '../levels';
import type { AppProgress } from '../engine/types';
import { BrandMark } from './BrandMark';
const REPO_URL = 'https://github.com/alisadeghiaghili/learn-docker';
const COFFEE_URL = 'https://www.buymeacoffee.com/alisadeghil';
const LINKTR = 'https://linktr.ee/aliaghili';
const COFFEE_BTN_IMG =
  'https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=alisadeghil&button_colour=2a3a4a&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00';

function C({ children }: { children: string }) {
  return <code className="chip-cmd">{children}</code>;
}

interface Props {
  open: boolean;
  progress: AppProgress;
  activeLevelId: string | null;
  onClose: () => void;
  onStartLevel: (id: string) => void;
  onStartSandbox: () => void;
}

export function LevelsDialog({ open, progress, activeLevelId, onClose, onStartLevel, onStartSandbox }: Props) {
  if (!open) return null;
  const series = levelsBySeries();

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Levels" onClick={(e) => e.stopPropagation()}>
        <h2>Levels</h2>
        <p>
          Work through the sequences. Command golf: match the par. Progress is stored in this
          browser so you can resume next week.
        </p>
        {series.map((group) => (
          <div className="level-series" key={group.series}>
            <h3>{group.series}</h3>
            {group.levels.map((level) => {
              const p = progress.levels[level.id];
              const active = activeLevelId === level.id;
              return (
                <button
                  key={level.id}
                  className={`level-row${active ? ' primary' : ''}`}
                  onClick={() => onStartLevel(level.id)}
                >
                  <span>
                    <div className="name">{level.name}</div>
                    <div className="meta">
                      par {level.par}
                      {p?.solved && p.bestCommands !== null ? ` · best ${p.bestCommands}` : ''}
                    </div>
                  </span>
                  <span className={p?.solved ? 'badge-solved' : 'badge-open'}>
                    {p?.solved ? 'solved' : active ? 'current' : 'open'}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        <div className="modal-actions">
          <button type="button" onClick={onStartSandbox}>
            Sandbox
          </button>
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntroDialog({
  open,
  onClose,
  onOpenLevels,
}: {
  open: boolean;
  onClose: () => void;
  onOpenLevels: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop overlay-intro" role="presentation">
      <div className="modal modal-intro" role="dialog" aria-label="Welcome">
        <div className="intro-head">
          <BrandMark size={36} />
          <h2>
            Learn<span className="brand-accent">Docker</span>
          </h2>
        </div>

        <p>
          Interactive <strong>Docker</strong> tutorial — sandbox + guided levels.
        </p>

        <p>
          The board shows <strong>Registry → Images → Containers</strong> and the volumes / networks
          they share. That is the material flow a Docker daemon manages.
        </p>

        <ul className="intro-bullets">
          <li>
            Basics: <C>run</C>, <C>ps</C>, <C>stop</C>, image vs container
          </li>
          <li>
            Build: <C>build</C>, <C>layers</C>, multi-stage
          </li>
          <li>
            Registry: <C>pull</C>, <C>tag</C>, <C>push</C>, digests
          </li>
          <li>
            Compose: <C>compose up</C>, <C>down</C>, DNS, volumes
          </li>
          <li>
            Ops: <C>logs</C>, <C>exec</C>, health, prune
          </li>
          <li>
            Security: <C>--user</C>, <C>--read-only</C>, scan/sign gate
          </li>
        </ul>

        <p className="intro-meta">
          Meta:{' '}
          <C>levels</C>, <C>curriculum</C>, <C>mastery</C>, <C>hint</C>, <C>steps</C>, <C>rubric</C>,{' '}
          <C>review</C>, <C>quiz</C>.
        </p>

        <p>
          <strong>{LEVELS.length}</strong> levels included. Open Levels to begin (start with{' '}
          <strong>Setup</strong>), or stay in sandbox.
        </p>

        <h3 className="intro-h3">What is LearnDocker?</h3>
        <p>
          A browser lab bench for Docker: you type real-shaped <C>docker</C> commands and watch
          image layers, containers, volumes, and networks move. No install required for the
          tutorial core. Real daemon work is Track B on your computer (web limits — see Setup).
        </p>

        <h3 className="intro-h3">Publisher</h3>
        <p>
          Published and maintained by <strong>Ali Sadeghi Aghili</strong> — programmer, data
          engineer / scientist, ML engineer.{' '}
          <a href={LINKTR} target="_blank" rel="noopener noreferrer">
            linktr.ee/aliaghili
          </a>
        </p>

        <ul className="intro-links">
          <li>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub — source &amp; issues
            </a>
          </li>
        </ul>

        <p>Buy Me a Coffee (supports the publisher):</p>
        <p>
          <a
            className="coffee-btn"
            href={COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Buy me a coffee"
          >
            <img src={COFFEE_BTN_IMG} alt="Buy me a coffee" height={40} />
          </a>
        </p>

        <p className="intro-toolbar">
          Toolbar: <strong>Lesson</strong> (replay level intro) · <strong>GitHub</strong> ·{' '}
          <strong>Buy me a coffee</strong>.
        </p>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Sandbox
          </button>
          <button
            type="button"
            className="primary intro-cta"
            onClick={() => {
              onOpenLevels();
              onClose();
            }}
          >
            Open levels
          </button>
        </div>
      </div>
    </div>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Help" onClick={(e) => e.stopPropagation()}>
        <h2>How learnDocker works</h2>
        <p>
          Commands are parsed by a simulated Docker engine. Failures mirror real daemon messages so
          you learn the error surface, not a toy dialect.
        </p>
        <p>
          <strong>Tab</strong> completes the current word (or the next word). Repeat Tab to cycle
          options. <strong>↑ / ↓</strong> walk command history. The prompt keeps focus after every
          command.
        </p>
        <p>
          <strong>undo</strong> rewinds the last successful state change. <strong>reset</strong>{' '}
          restores the level start. Click schematic nodes to inspect them. The right panel lists
          steps — the glowing orange one is what to do next.
        </p>
        <p>
          <strong>Track A</strong> (this site): mental models. <strong>Track B</strong> (your
          computer): install Docker, run <code>labs/run-all.ps1</code> — the web cannot start a
          real daemon.
        </p>
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
