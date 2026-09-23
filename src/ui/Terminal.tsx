import { useEffect, useRef } from 'react';

export type LogKind = 'in' | 'out' | 'err' | 'sys' | 'ok';

export interface LogLine {
  id: number;
  kind: LogKind;
  text: string;
}

const BASE_COMPLETIONS = [
  'help',
  'levels',
  'sandbox',
  'reset',
  'undo',
  'clear',
  'hint',
  'steps',
  'curriculum',
  'docker pull hello-world',
  'docker pull alpine:3.20',
  'docker pull nginx:1.25',
  'docker pull redis:7',
  'docker pull postgres:16',
  'docker pull node:20-alpine',
  'docker images',
  'docker run',
  'docker run -d --name web alpine:3.20',
  'docker run -d --name worker alpine:3.20',
  'docker run -d --name demo alpine:3.20',
  'docker run -d --name web -p 8080:80 nginx:1.25',
  'docker run -d --name db --network app-net alpine:3.20',
  'docker run -d --name app --network app-net alpine:3.20',
  'docker run --name writer -v data-vol:/data alpine:3.20 sh -c "echo persisted > /data/note.txt"',
  'docker run -d --name reader -v data-vol:/data alpine:3.20',
  'docker ps',
  'docker ps -a',
  'docker start',
  'docker stop',
  'docker restart',
  'docker rm',
  'docker rm -f',
  'docker rmi alpine:3.20',
  'docker build -t demo-app:1.0 .',
  'docker volume create data-vol',
  'docker volume ls',
  'docker volume rm data-vol',
  'docker network create app-net',
  'docker network ls',
  'docker network connect',
  'docker network disconnect',
  'docker network rm app-net',
  'docker inspect',
  'docker logs',
  'docker version',
];

interface WordState {
  head: string[];
  current: string;
  afterSpace: boolean;
}

function parseLine(value: string): WordState {
  const endsWithSpace = /\s$/.test(value);
  const trimmed = value.replace(/\s+$/, '');
  if (!trimmed) {
    return { head: [], current: '', afterSpace: endsWithSpace };
  }
  const parts = trimmed.split(/\s+/);
  if (endsWithSpace) {
    return { head: parts, current: '', afterSpace: true };
  }
  return {
    head: parts.slice(0, -1),
    current: parts[parts.length - 1]!,
    afterSpace: false,
  };
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

interface Props {
  lines: LogLine[];
  onSubmit: (value: string) => void;
  hint?: string | null;
  extraCompletions?: string[];
  /** Bump to re-focus the prompt (after modal close / command). */
  focusToken: number;
}

/**
 * Terminal with real shell habits: sticky focus, ArrowUp/Down history,
 * word-wise Tab completion (not full-line dump), ghost suffix only.
 */
export function Terminal({ lines, onSubmit, hint = null, extraCompletions = [], focusToken }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(0);
  const draftRef = useRef('');
  const wordCycleRef = useRef<string[]>([]);
  const wordIdxRef = useRef(0);
  const wordKeyRef = useRef('');
  const hintRefVal = useRef(hint);
  const extraRef = useRef(extraCompletions);

  hintRefVal.current = hint;
  extraRef.current = extraCompletions;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // Keep caret in the prompt unless a modal has focus.
    if (document.querySelector('.modal-backdrop')) return;
    input.focus();
    const len = input.value.length;
    try {
      input.setSelectionRange(len, len);
    } catch {
      // ignore
    }
  }, [focusToken, lines]);

  useEffect(() => {
    syncGhost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, focusToken]);

  const allCompletions = (): string[] => {
    return [
      ...new Set<string>([
        ...extraRef.current,
        ...BASE_COMPLETIONS,
        ...historyRef.current.slice().reverse(),
      ]),
    ];
  };

  const matchingCommands = (head: string[], current: string): string[] => {
    const cur = current.toLowerCase();
    return allCompletions().filter((cmd) => {
      const words = cmd.split(/\s+/);
      if (words.length <= head.length) {
        if (head.length && words.length === head.length) {
          return words.every((w, i) => w === head[i]);
        }
        return false;
      }
      for (let i = 0; i < head.length; i++) {
        if (words[i] !== head[i]) return false;
      }
      if (!cur) return true;
      return (words[head.length] ?? '').toLowerCase().startsWith(cur);
    });
  };

  const nextWords = (head: string[], current: string): string[] => {
    const matches = matchingCommands(head, current);
    const words: string[] = [];
    const push = (w: string | undefined) => {
      if (!w) return;
      if (!words.includes(w)) words.push(w);
    };
    const h = hintRefVal.current;
    if (h) {
      const hw = h.split(/\s+/);
      const okHead = head.every((word, i) => hw[i] === word);
      if (okHead) push(hw[head.length]);
    }
    for (const cmd of matches) {
      push(cmd.split(/\s+/)[head.length]);
    }
    return words.filter((w) => !current || w.toLowerCase().startsWith(current.toLowerCase()));
  };

  const measureText = (text: string): number => {
    const input = inputRef.current;
    if (!input) return text.length * 7.2;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.length * 7.2;
    const font = getComputedStyle(input).font;
    ctx.font = font || '13px Consolas, monospace';
    return ctx.measureText(text).width;
  };

  /** Ghost shows only the rest of the current word — never a full command dump. */
  const syncGhost = () => {
    const input = inputRef.current;
    const ghost = ghostRef.current;
    if (!input || !ghost) return;
    ghost.textContent = '';
    ghost.dataset.visible = '0';

    const value = input.value;
    if (!value) return;

    const { head, current, afterSpace } = parseLine(value);
    const words = nextWords(head, afterSpace ? '' : current);
    const first = words[0];
    if (!first) return;

    if (afterSpace) {
      ghost.textContent = first;
      ghost.style.left = `${measureText(value)}px`;
      ghost.dataset.visible = '1';
      return;
    }

    if (!first.toLowerCase().startsWith(current.toLowerCase()) || first.length <= current.length) {
      return;
    }

    // Suffix of the current word only.
    ghost.textContent = first.slice(current.length);
    ghost.style.left = `${measureText(value)}px`;
    ghost.dataset.visible = '1';
  };

  const applyTab = () => {
    const input = inputRef.current;
    if (!input) return;
    const value = input.value;
    const { head, current, afterSpace } = parseLine(value);
    const cycleKey = `${head.join(' ')}|${afterSpace ? '' : current}`;

    if (!value && hintRefVal.current) {
      const firstWord = hintRefVal.current.split(/\s+/)[0]!;
      input.value = firstWord;
      wordCycleRef.current = [firstWord];
      wordIdxRef.current = 0;
      wordKeyRef.current = firstWord;
      syncGhost();
      return;
    }

    const options = nextWords(head, afterSpace ? '' : current);
    if (!options.length) {
      syncGhost();
      return;
    }

    if (cycleKey !== wordKeyRef.current || !wordCycleRef.current.length) {
      wordKeyRef.current = cycleKey;
      wordCycleRef.current = options;
      wordIdxRef.current = 0;
    } else {
      wordIdxRef.current = (wordIdxRef.current + 1) % wordCycleRef.current.length;
    }

    const chosen = wordCycleRef.current[wordIdxRef.current] ?? options[0]!;
    const headText = head.length ? `${head.join(' ')} ` : '';
    // Complete the current word only — not the entire command.
    input.value = `${headText}${chosen}`;
    syncGhost();

    if (hintRef.current) {
      if (wordCycleRef.current.length > 1) {
        const preview = wordCycleRef.current.slice(0, 6).join(' · ');
        hintRef.current.hidden = false;
        hintRef.current.innerHTML = `Tab word <strong>${wordIdxRef.current + 1}/${wordCycleRef.current.length}</strong>: <code>${escapeHtml(preview)}</code>${
          wordCycleRef.current.length > 6 ? ' …' : ''
        }`;
      } else if (hintRefVal.current) {
        hintRef.current.hidden = false;
        hintRef.current.innerHTML = `Next: <code>${escapeHtml(hintRefVal.current)}</code>`;
      }
    }
  };

  const setHintUi = (command: string | null) => {
    const input = inputRef.current;
    const hintEl = hintRef.current;
    if (!input || !hintEl) return;
    // Empty input: ONE faded cue only (placeholder) — never stacked with ghost.
    input.placeholder = command
      ? `Next: ${command}`
      : 'Type a command — help · levels · hint · steps';
    hintEl.hidden = !command;
    if (command) {
      hintEl.innerHTML = `Next: <code>${escapeHtml(command)}</code> <span class="par-note">· Tab fills one word</span>`;
    } else {
      hintEl.textContent = '';
    }
    syncGhost();
  };

  useEffect(() => {
    setHintUi(hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      applyTab();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
      wordCycleRef.current = [];
      wordKeyRef.current = '';
      syncGhost();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (document.querySelector('.modal-backdrop')) return;
      const value = input.value;
      input.value = '';
      const trimmed = value.trim();
      if (trimmed) {
        historyRef.current.push(trimmed);
        historyIdxRef.current = historyRef.current.length;
      }
      wordCycleRef.current = [];
      wordKeyRef.current = '';
      onSubmit(value);
      // Sticky focus: never leave the prompt after a successful submit.
      requestAnimationFrame(() => {
        input.focus();
        syncGhost();
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!historyRef.current.length) return;
      if (historyIdxRef.current === historyRef.current.length) {
        draftRef.current = input.value;
      }
      historyIdxRef.current = Math.max(0, historyIdxRef.current - 1);
      input.value = historyRef.current[historyIdxRef.current] ?? '';
      wordCycleRef.current = [];
      syncGhost();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!historyRef.current.length) return;
      historyIdxRef.current = Math.min(historyRef.current.length, historyIdxRef.current + 1);
      input.value =
        historyIdxRef.current >= historyRef.current.length
          ? draftRef.current
          : (historyRef.current[historyIdxRef.current] ?? '');
      wordCycleRef.current = [];
      syncGhost();
    }
  };

  return (
    <div
      className="terminal"
      onClick={() => {
        if (!document.querySelector('.modal-backdrop')) inputRef.current?.focus();
      }}
    >
      <div className="terminal-log" ref={logRef} role="log" aria-live="polite" dir="ltr">
        {lines.map((line) => (
          <div key={line.id} className={`term-line ${line.kind}`}>
            {line.text}
          </div>
        ))}
      </div>
      <div className="term-hint" ref={hintRef} hidden dir="ltr" />
      <div className="terminal-input-row" dir="ltr">
        <span className="prompt">$</span>
        <div className="term-input-wrap">
          <span className="term-ghost" ref={ghostRef} aria-hidden="true" data-visible="0" />
          <input
            ref={inputRef}
            className="terminal-input"
            spellCheck={false}
            autoComplete="off"
            aria-label="Docker command"
            placeholder="Type a command — help · levels · hint · steps"
            onKeyDown={onKeyDown}
            onInput={syncGhost}
            onChange={syncGhost}
          />
        </div>
      </div>
    </div>
  );
}
