import { useEffect, useRef } from 'react';
import type { TerminalLine } from './appState';

interface Props {
  lines: TerminalLine[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onHistory: (direction: 1 | -1) => string | undefined;
  historyValue: string | null;
}

export function Terminal({ lines, value, onChange, onSubmit, onHistory, historyValue }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (historyValue !== null && inputRef.current) {
      inputRef.current.value = historyValue;
      onChange(historyValue);
    }
  }, [historyValue, onChange]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-log" ref={logRef} aria-live="polite">
        {lines.map((line) => (
          <div key={line.id} className={`term-line ${line.kind}`}>
            {line.text}
          </div>
        ))}
      </div>
      <form
        className="terminal-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
          onChange('');
        }}
      >
        <span className="prompt">$</span>
        <input
          ref={inputRef}
          className="terminal-input"
          spellCheck={false}
          autoComplete="off"
          aria-label="Docker command"
          value={value}
          placeholder="docker run -d --name web alpine:3.20"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = onHistory(-1);
              if (prev !== undefined) onChange(prev);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = onHistory(1);
              if (next !== undefined) onChange(next);
            }
          }}
        />
      </form>
    </div>
  );
}
