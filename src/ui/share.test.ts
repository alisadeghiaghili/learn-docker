import { describe, expect, it } from 'vitest';
import { buildShareTargets, shareMessageLinkedIn, shareMessageX } from '../ui/share';
import { loadProgress, recordSolve, saveProgress, summarizeCurriculum } from '../engine/session';
import { LEVELS } from '../levels';

describe('share messages', () => {
  const curriculum = summarizeCurriculum({ levels: {} });

  it('LinkedIn message includes live URL and learning framing', () => {
    const text = shareMessageLinkedIn({
      levelName: 'Hello, daemon',
      levelId: 'intro-hello',
      commands: 2,
      par: 2,
      curriculum,
    });
    expect(text).toContain('https://alisadeghiaghili.github.io/learn-docker/');
    expect(text).toContain('learning Docker');
    expect(text).toContain('Hello, daemon');
    expect(text).not.toContain('learnGitBranching');
  });

  it('X message stays short and links the app', () => {
    const text = shareMessageX({
      levelName: 'Hello, daemon',
      levelId: 'intro-hello',
      commands: 2,
      par: 2,
      curriculum,
    });
    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).toContain('learn-docker');
  });

  it('buildShareTargets encodes LinkedIn/X/Facebook intents', () => {
    const targets = buildShareTargets({
      levelName: 'Volumes persist',
      levelId: 'volumes-persist',
      commands: 6,
      par: 6,
      curriculum,
    });
    expect(targets.linkedin).toContain('linkedin.com/shareArticle');
    expect(targets.x).toContain('twitter.com/intent/tweet');
    expect(targets.facebook).toContain('facebook.com/sharer');
  });

  it('lists learned outcomes after solves', () => {
    const progress = recordSolve({ levels: {} }, 'intro-hello', 2);
    const summary = summarizeCurriculum(progress);
    expect(summary.learned).toHaveLength(1);
    expect(summary.learned[0]!.id).toBe('intro-hello');
    expect(summary.learned[0]!.outcomes?.length).toBeGreaterThan(0);
    expect(summary.next?.id).toBe('image-vs-container');
  });
});

describe('progress persistence shape', () => {
  it('merges solve records with best command golf', () => {
    let p = recordSolve({ levels: {} }, 'intro-hello', 5);
    p = recordSolve(p, 'intro-hello', 2);
    expect(p.levels['intro-hello']!.solved).toBe(true);
    expect(p.levels['intro-hello']!.bestCommands).toBe(2);
  });

  it('curriculum totals match level count', () => {
    const summary = summarizeCurriculum(loadProgress());
    expect(summary.total).toBe(LEVELS.length);
  });

  it('saveProgress is a no-throw under node (no document)', () => {
    expect(() => saveProgress({ levels: {} })).not.toThrow();
  });
});
