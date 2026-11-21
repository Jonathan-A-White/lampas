// src/lists/PlayAllBar.tsx — Play all (mw-9q8wp1.5) for a verse list (VerseListScreen.tsx) and the Share sheet's Bible references (share/ShareReferences.tsx): 'Play all' reads every reference
// in the order shown through the passage player (src/speech/passagePlayer.ts), in the language the Reader reads in; an Old Testament reference is announced as skipped and the player goes on.
// Where he stopped is kept (src/speech/passagePlace.ts, mw-5r3p30.1236) for a list that has a `placeKey`: the button then reads 'Resume · <reference>:<verse>' and goes on from there, with a small
// 'From the start' beside it; the end of the list clears the place, and leaving the screen keeps it.
// While it plays the button gives way to a bar, 'Reading <reference> · k of N', with Pause (Play once paused) and Stop. The bar belongs to the references this screen started: if another
// reading takes the voice, the bar goes and 'Play all' returns. Leaving the screen (this unmounting, also when the list is put into Edit) stops what it started.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ListedReference } from '../nav/refsInText';
import { clearPlace, getPlace, resumeIndex, subscribePlace } from '../speech/passagePlace';
import { getPassagePlayer, onPassageChange, pausePassage, playPassages, resumePassage, stopPassage, type PassageRef } from '../speech/passagePlayer';
import { playableOf } from './passageOf';

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

/** the passages the player was given by this screen, and where the first of them stands in the whole list */
interface Started {
  given: PassageRef[];
  base: number;
}

/** 'Play all' for `refs` (listed references, in the order to be read), or, while they are being read, the bar. `placeKey` (passagePlace.ts listKey) keeps where he stopped: Resume. */
export function PlayAll({ refs, placeKey }: { refs: readonly ListedReference[]; placeKey?: string }) {
  const player = useSyncExternalStore(onPassageChange, getPassagePlayer, getPassagePlayer);
  const passages = useMemo(() => refs.map(playableOf), [refs]);
  const place = useSyncExternalStore(subscribePlace, () => (placeKey ? getPlace(placeKey) : null), () => null);
  const resumeAt = resumeIndex(place, passages.map((p) => p.heading));
  // the passages the player was given by this screen: a change of the list while it plays (the other order) does not take the bar away
  const [started, setStarted] = useState<Started | null>(null);
  // what the unmount reads: the state's value is stale in a cleanup that was made once
  const mirror = useRef<PassageRef[] | null>(null);
  const play = (from: number, verse?: number) => {
    const given = passages.slice(from);
    mirror.current = given;
    setStarted({ given, base: from });
    playPassages(given, { verse, place: placeKey });
  };
  useEffect(
    () => () => {
      const mine = mirror.current;
      const current = getPassagePlayer().current;
      if (mine && current && mine.includes(current)) stopPassage();
    },
    [],
  );
  const at = started && player.current ? started.given.indexOf(player.current) : -1;
  if (player.state === 'idle' || at < 0) {
    if (passages.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (place && resumeAt >= 0 ? play(resumeAt, place.verse) : play(0))} className={`${BUTTON} text-accent`}>
          <span aria-hidden="true">▶ </span>
          {place && resumeAt >= 0 ? `Resume · ${place.label}` : 'Play all'}
        </button>
        {place && resumeAt >= 0 ? (
          <button
            type="button"
            onClick={() => {
              if (placeKey) clearPlace(placeKey);
              play(0);
            }}
            className="min-h-11 rounded-lg px-3 text-base text-muted underline"
          >
            From the start
          </button>
        ) : null}
      </div>
    );
  }
  const total = started ? started.base + started.given.length : passages.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
      <p role="status" aria-label="Playing the list" className="min-w-0 flex-1 break-words text-base font-medium">
        {`Reading ${player.current?.heading ?? ''} · ${(started?.base ?? 0) + at + 1} of ${total}`}
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
