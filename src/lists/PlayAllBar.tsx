// src/lists/PlayAllBar.tsx — Play all (mw-9q8wp1.5) for a verse list (VerseListScreen.tsx) and the Share sheet's Bible references (share/ShareReferences.tsx): 'Play all' reads every reference
// in the order shown through the passage player (src/speech/passagePlayer.ts), in the language the Reader reads in; an Old Testament reference is announced as skipped and the player goes on.
// While it plays the button gives way to a bar, 'Reading <reference> · k of N', with Pause (Play once paused) and Stop. The bar belongs to the references this screen started: if another
// reading takes the voice, the bar goes and 'Play all' returns. Leaving the screen (this unmounting, also when the list is put into Edit) stops what it started.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ListedReference } from '../nav/refsInText';
import { getPassagePlayer, onPassageChange, pausePassage, playPassages, resumePassage, stopPassage, type PassageRef } from '../speech/passagePlayer';
import { passageOf } from './passageOf';

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

/** 'Play all' for `refs` (listed references, in the order to be read), or, while they are being read, the bar. */
export function PlayAll({ refs }: { refs: readonly ListedReference[] }) {
  const player = useSyncExternalStore(onPassageChange, getPassagePlayer, getPassagePlayer);
  const passages = useMemo(() => refs.map(passageOf), [refs]);
  // the passages the player was given by this screen: a change of the list while it plays (the other order) does not take the bar away
  const [started, setStarted] = useState<PassageRef[] | null>(null);
  // what the unmount reads: the state's value is stale in a cleanup that was made once
  const mirror = useRef<PassageRef[] | null>(null);
  useEffect(
    () => () => {
      const mine = mirror.current;
      const current = getPassagePlayer().current;
      if (mine && current && mine.includes(current)) stopPassage();
    },
    [],
  );
  const at = started && player.current ? started.indexOf(player.current) : -1;
  if (player.state === 'idle' || at < 0) {
    if (passages.length === 0) return null;
    return (
      <button
        type="button"
        onClick={() => {
          mirror.current = passages;
          setStarted(passages);
          playPassages(passages);
        }}
        className={`${BUTTON} text-accent`}
      >
        <span aria-hidden="true">▶ </span>Play all
      </button>
    );
  }
  const total = started?.length ?? passages.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
      <p role="status" aria-label="Playing the list" className="min-w-0 flex-1 break-words text-base font-medium">
        {`Reading ${player.current?.heading ?? ''} · ${at + 1} of ${total}`}
      </p>
      {player.state === 'playing' ? (
        <button type="button" onClick={pausePassage} className={BUTTON}>
          Pause
        </button>
      ) : (
        <button type="button" onClick={resumePassage} className={BUTTON}>
          Play
        </button>
      )}
      <button type="button" onClick={stopPassage} className={BUTTON}>
        Stop
      </button>
    </div>
  );
}
