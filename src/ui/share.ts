export const LIVE_URL = 'https://alisadeghiaghili.github.io/learn-docker/';
export const SHARE_URL = 'https://alisadeghiaghili.github.io/learn-docker/';
export const REPO_URL = 'https://github.com/alisadeghiaghili/learn-docker';
export const COFFEE_URL = 'https://www.buymeacoffee.com/alisadeghil';
export const PUBLISHER = 'Ali Sadeghi Aghili';

export interface ShareLearnedItem {
  id: string;
  name: string;
  seriesTitle: string;
  outcomes?: string[];
}

export interface CurriculumSummary {
  solvedCount: number;
  total: number;
  learned: ShareLearnedItem[];
  remaining: ShareLearnedItem[];
  next: ShareLearnedItem | null;
  percent: number;
}

export interface ShareContext {
  levelName: string;
  levelId: string;
  commands: number | null;
  par: number;
  curriculum: CurriculumSummary;
}

function bulletList(items: ShareLearnedItem[], limit?: number): string[] {
  const list = limit ? items.slice(0, limit) : items;
  const lines = list.map((l) => `• ${l.seriesTitle}: ${l.name}`);
  if (limit && items.length > limit) {
    lines.push(`• …and ${items.length - limit} more`);
  }
  return lines;
}

export function shareMessageLinkedIn(ctx: ShareContext): string {
  const c = ctx.curriculum;
  const learned = c.learned.length ? bulletList(c.learned) : [];
  const outcomeLines = c.learned
    .flatMap((l) => (l.outcomes ?? []).map((o) => `  – ${o}`))
    .slice(0, 12);

  const parts = [
    'I am learning Docker with learnDocker — an interactive visualizer and tutorial.',
    '',
    `Latest level cleared: ${ctx.levelName} (${ctx.levelId})${
      ctx.commands !== null
        ? ` — ${ctx.commands} command${ctx.commands === 1 ? '' : 's'} (par ${ctx.par})`
        : ''
    }`,
    c.solvedCount > 0 ? '' : 'Starting the Docker curriculum.',
    '',
    learned.length ? 'What I have learned so far:' : '',
    ...learned,
    ...(outcomeLines.length ? ['', 'Outcomes:', ...outcomeLines] : []),
    '',
    `Progress: ${c.solvedCount}/${c.total} levels (${c.percent}%).`,
    '',
    'Try it yourself:',
    SHARE_URL,
  ];
  return parts.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

export function shareMessageX(ctx: ShareContext): string {
  const c = ctx.curriculum;
  const head = `Learning Docker with learnDocker — ${c.solvedCount}/${c.total} levels done.`;
  const first = c.learned[0] ? `• ${c.learned[0].name}` : 'Interactive Docker sandbox + levels.';
  let text = `${head}\n${first}\n${SHARE_URL}`;
  if (text.length > 275) text = `${head}\n${SHARE_URL}`;
  return text;
}

export interface ShareTargets {
  linkedin: string;
  x: string;
  facebook: string;
  text: string;
  shortText: string;
  url: string;
  learnedLines: string[];
}

export function buildShareTargets(ctx: ShareContext): ShareTargets {
  const longText = shareMessageLinkedIn(ctx);
  const shortText = shareMessageX(ctx);
  const url = SHARE_URL;
  return {
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent('learnDocker')}&summary=${encodeURIComponent(longText)}&source=learnDocker`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(longText)}`,
    text: longText,
    shortText,
    url,
    learnedLines: bulletList(ctx.curriculum.learned),
  };
}

export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
}

export async function copySharePayload(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export async function shareWithClipboard(
  kind: 'linkedin' | 'facebook' | 'x' | 'copy',
  targets: ShareTargets,
): Promise<{ opened: boolean; copied: boolean }> {
  if (kind === 'copy') {
    return { opened: false, copied: await copySharePayload(targets.text) };
  }
  const copied = await copySharePayload(kind === 'x' ? targets.shortText : targets.text);
  const href =
    kind === 'linkedin' ? targets.linkedin : kind === 'facebook' ? targets.facebook : targets.x;
  openShareWindow(href);
  return { opened: true, copied };
}
