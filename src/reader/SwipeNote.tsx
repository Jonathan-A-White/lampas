// src/reader/SwipeNote.tsx — the short note a swipe past Matthew 1 or Revelation 22 leaves under the header (mw-5r3p30.126), with Dismiss.
// It goes by itself after a few seconds.
import { useEffect } from 'react';
import { navigate } from '../nav/route';
import type { SwipeEnd } from './useChapterSwipe';

const SHOWN_MS = 6000;

export function SwipeNote({ end, lastBook, onDismiss }: { end: SwipeEnd; lastBook: string; onDismiss(): void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, SHOWN_MS);
    return () => clearTimeout(timer);
  }, [end, onDismiss]);
  return (
    <div role="status" data-swipe-note className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1 text-sm">
      <p className="min-w-0 flex-1">
        {end === 'first' ? (
          <>
            This is the first chapter. Before it:{' '}
            <button type="button" onClick={() => navigate('preface')} className="inline-flex min-h-11 items-center font-medium text-accent underline">
              the Preface
            </button>
          </>
        ) : (
          `You have reached the end of ${lastBook}. Well done.`
        )}
      </p>
      <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
        Dismiss
      </button>
    </div>
  );
}
