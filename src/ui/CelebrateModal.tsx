import { useEffect, useMemo, useState } from 'react';
import type { AppProgress } from '../engine/types';
import { getNextLevel } from '../levels';
import {
  buildShareTargets,
  shareWithClipboard,
  type CurriculumSummary,
} from './share';
import { summarizeCurriculum } from '../engine/session';
import { launchConfetti, playFanfare } from './confetti';

interface Props {
  levelId: string;
  levelName: string;
  series: string;
  par: number;
  commands: number;
  progress: AppProgress;
  onClose: () => void;
  onNext: (levelId: string) => void;
}

const CHEERS = [
  'Clean run. The daemon is on your side now.',
  'That mental model just got solid.',
  'Nice — you did not just type commands, you understood them.',
  'Locked in. Keep going.',
];

export function CelebrateModal({
  levelId,
  levelName,
  series,
  par,
  commands,
  progress,
  onClose,
  onNext,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const curriculum: CurriculumSummary = useMemo(() => summarizeCurriculum(progress), [progress]);
  const next = getNextLevel(levelId);
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)]!, []);
  const share = useMemo(
    () =>
      buildShareTargets({
        levelName,
        levelId,
        commands,
        par,
        curriculum,
      }),
    [levelName, levelId, commands, par, curriculum],
  );

  useEffect(() => {
    playFanfare();
    const confetti = launchConfetti(4800);
    return () => confetti?.stop();
  }, []);

  const onShare = async (kind: 'linkedin' | 'x' | 'facebook' | 'copy') => {
    const result = await shareWithClipboard(kind, share);
    if (kind === 'copy') {
      setStatus(result.copied ? 'Copied to clipboard.' : 'Copy failed — select the text manually.');
      return;
    }
    setStatus(result.copied ? 'Share window opened · message copied too.' : 'Share window opened.');
  };

  const underPar = commands <= par;

  return (
    <div className="modal-backdrop overlay-celebrate" role="presentation">
      <div className="modal modal-celebrate" role="dialog" aria-modal="true" aria-label="Level complete">
        <div className="celebrate">
          <div className="celebrate-visual" aria-hidden="true">
            <div className="celebrate-ring" />
            <div className="celebrate-star">★</div>
          </div>
          <div className="celebrate-badge">LEVEL CLEARED</div>
          <h3 className="celebrate-title">{levelName}</h3>
          <p className="celebrate-sub">
            {series} · <code>{levelId}</code>
          </p>
          <p className="celebrate-cheer">{cheer}</p>
          <div className="celebrate-stats">
            {underPar ? (
              <>
                <strong>{commands}</strong> command{commands === 1 ? '' : 's'} · matched par {par}
              </>
            ) : (
              <>
                <strong>{commands}</strong> commands. Ideal is {par}. Still counts — you got there.
              </>
            )}
          </div>
          <div className="celebrate-progress">
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${curriculum.percent}%` }} />
            </div>
            <div className="par-note">
              {curriculum.solvedCount} / {curriculum.total} levels solved · progress saved in this
              browser
            </div>
          </div>
          <div className="share-block">
            <div className="next-title">Share what you learned</div>
            <div className="learned-preview">
              <ul>
                {curriculum.learned.length ? (
                  curriculum.learned.map((l) => (
                    <li key={l.id}>
                      {l.seriesTitle}: {l.name}
                      {l.outcomes?.length ? (
                        <ul>
                          {l.outcomes.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))
                ) : (
                  <li>Solve more levels to build your curriculum list.</li>
                )}
              </ul>
            </div>
            <div className="share-row" role="group" aria-label="Share">
              <button type="button" className="share-btn linkedin" onClick={() => void onShare('linkedin')}>
                LinkedIn
              </button>
              <button type="button" className="share-btn x" onClick={() => void onShare('x')}>
                X / Twitter
              </button>
              <button type="button" className="share-btn facebook" onClick={() => void onShare('facebook')}>
                Facebook
              </button>
              <button type="button" className="share-btn copy" onClick={() => void onShare('copy')}>
                Copy post
              </button>
            </div>
            {status ? <div className="share-status">{status}</div> : null}
            <details className="share-preview">
              <summary>Preview post text</summary>
              <pre>{share.text}</pre>
            </details>
          </div>
          {next ? (
            <div className="celebrate-next">Next: {next.name} ({next.id})</div>
          ) : (
            <div className="celebrate-next">All levels in this pack are cleared.</div>
          )}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              onClose();
            }}
          >
            Stay here
          </button>
          {next ? (
            <button type="button" className="primary" onClick={() => onNext(next.id)}>
              Continue · {next.id}
            </button>
          ) : (
            <button type="button" className="primary" onClick={onClose}>
              Browse levels
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
