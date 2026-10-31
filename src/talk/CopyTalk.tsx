// src/talk/CopyTalk.tsx — 'Copy the whole talk' (mw-5r3p30.930, PROVISIONAL), at the foot of the Talk sheet's conversation: his questions and the answers, in order, on the
// clipboard as plain text (talkText.ts), and 'Copied'. The sheet has no menu; the header has no room for another button (the title is read whole beside New talk and Done,
// tests/e2e/talk.spec.ts). A phone that refuses the clipboard shows the text, selected, to copy by hand: the tap never ends in nothing.
import { useEffect, useRef, useState } from 'react';
import type { TalkTurn } from '../data/repositories/talks';
import { copy } from '../ui/clipboard';
import { talkPlainText } from './talkText';

/** How long 'Copied' stays. */
const COPIED_MS = 2500;

export function CopyTalk({ talkRef, turns }: { talkRef: string; turns: readonly TalkTurn[] }) {
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const text = talkPlainText(talkRef, turns);
  const tap = (): void => {
    void copy(text).then((done) => {
      setState(done ? 'copied' : 'by-hand');
      clearTimeout(timer.current);
      if (done) timer.current = setTimeout(() => setState('idle'), COPIED_MS);
    });
  };
  return (
    <div data-copy-talk className="w-full">
      <div className="flex items-center justify-end gap-x-2">
        {state === 'copied' ? (
          <span role="status" className="text-sm text-muted">
            Copied
          </span>
        ) : null}
        <button type="button" onClick={tap} className="min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
          Copy the whole talk
        </button>
      </div>
      {state === 'by-hand' ? (
        <textarea
          readOnly
          aria-label="Talk to copy"
          value={text}
          rows={6}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 text-base"
        />
      ) : null}
    </div>
  );
}
