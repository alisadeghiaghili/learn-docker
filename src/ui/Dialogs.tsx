import { levelsBySeries } from '../levels';
import type { AppProgress } from '../engine/types';

interface Props {
  open: boolean;
  progress: AppProgress;
  activeLevelId: string | null;
  onClose: () => void;
  onStartLevel: (id: string) => void;
  onStartSandbox: () => void;
}

export function LevelsDialog({
  open,
  progress,
  activeLevelId,
  onClose,
  onStartLevel,
  onStartSandbox,
}: Props) {
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
            Sandbox mode
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
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-label="Welcome">
        <h2>learnDocker</h2>
        <p>
          Interactive Docker visualizer and tutorial. Type Docker CLI commands in the terminal and
          watch the simulated daemon state update.
        </p>
        <p>
          This is a simulator — nothing runs on your machine. The goal is to make invisible
          concepts (image layers, writable layers, volumes, networks, ports) visible so you leave
          understanding Docker, not just typing it.
        </p>
        <p>
          <strong>Track A</strong> (this site): mental models and commands in a simulator.
          <strong> Track B</strong> (your laptop): install Docker, run <code>labs/run-all.ps1</code>
          on a real daemon. Start with the <strong>Setup</strong> levels.
        </p>
        <pre className="intro-snippet">
          docker pull alpine:3.20{'\n'}
          docker run -d --name web alpine:3.20{'\n'}
          docker ps
        </pre>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Sandbox
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onOpenLevels();
              onClose();
            }}
          >
            Start first level
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
          In level mode, meeting the win condition records your command count and unlocks share
          links with your learning list.
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
