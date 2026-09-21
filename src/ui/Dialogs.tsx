import { levelsBySeries } from '../levels';
import type { AppProgress } from '../engine/types';
import { getLevel } from '../levels';

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
          browser only.
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
          Interactive Docker visualizer and tutorial — the same product shape as learnGitBranching,
          rebuilt for containers instead of commits.
        </p>
        <p>
          Type <strong>docker</strong> commands in the terminal. The schematic shows registry
          images, local images with layers, containers, volumes, and networks. This is a
          simulator — nothing runs on your machine.
        </p>
        <p>
          Sandbox mode is empty by default. Open <strong>levels</strong> to follow a guided
          curriculum, or just start typing:
        </p>
        <pre
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '10px 12px',
            color: 'var(--muted)',
          }}
        >
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

export function HelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Help" onClick={(e) => e.stopPropagation()}>
        <h2>How learnDocker works</h2>
        <p>
          Commands are parsed by a simulated Docker engine. Failures mirror real daemon messages
          so you learn the error surface, not a toy dialect.
        </p>
        <p>
          <strong>undo</strong> rewinds the last successful state change. <strong>reset</strong>{' '}
          restores the level start (or empty sandbox). Click schematic nodes to inspect them.
        </p>
        <p>
          In level mode, meeting the win condition records your command count. Try to hit par.
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

export { getLevel };
