// src/ChapterNav.tsx — the two buttons at the foot of a chapter, after the last verse (mw-5r3p30.63): '‹ 1 John 1' and '1 John 3 ›'.
// The header has no width for them (docs: the title already truncates at 360 px). A tap opens the chapter from the top as a new Back
// step, the way the picker does; a chapter that is not on the phone says so in the Reader. Matthew 1 has no previous, Revelation 22 no next.
// Above the buttons sits one small card (mw-5r3p30.706, under the Tips setting): a tip that a swipe changes chapter; once he has changed chapter by a swipe
// (src/tips/hints.ts chapterSwiped), in its place an offer to hide the buttons, Hide or Keep, answered for good. Settings > Chapter buttons sets Hide and
// brings them back; with Hide this draws nothing.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { neighbours } from './data/neighbours';
import type { OpenChapter } from './data/readerChapter';
import { getTips, setChapterButtons } from './data/repositories';
import { openReader } from './nav/route';
import { chapterButtonsSetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { HintCard } from './tips/HintCard';
import { CHAPTER_BUTTONS_OFFER, CHAPTER_NAV_SHOWN, chapterSwiped, hints, HIDE_CHAPTER_BUTTONS } from './tips/hints';

const BUTTON = 'flex min-h-12 w-full items-center rounded-xl border border-line bg-surface px-3 text-base font-medium text-accent active:bg-line';

/** The offer to hide the buttons: Hide sets Chapter buttons to Hide, Keep leaves them; either answer is kept for good. */
function HideOffer() {
  const tips = useLiveQuery(getTips, []);
  const [offer, setOffer] = useState(false);
  useEffect(() => {
    let current = true;
    void hints.nextTip(CHAPTER_BUTTONS_OFFER).then((next) => current && setOffer(next !== null));
    return () => {
      current = false;
    };
  }, []);
  if (tips !== 'on' || !offer) return null;
  const answer = (hide: boolean) => {
    setOffer(false);
    void hints.dismiss(HIDE_CHAPTER_BUTTONS);
    if (hide) void setChapterButtons('hide');
  };
  return (
    <aside role="note" data-hint-card={HIDE_CHAPTER_BUTTONS} className="mb-3 flex flex-wrap items-center gap-x-2 rounded-xl border border-line px-3">
      <p className="min-w-0 flex-1 basis-40 py-1 text-sm">You swipe between chapters. Hide these buttons?</p>
      <div className="flex shrink-0">
        <button type="button" onClick={() => answer(true)} className="min-h-12 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
          Hide
        </button>
        <button type="button" onClick={() => answer(false)} className="min-h-12 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
          Keep
        </button>
      </div>
    </aside>
  );
}

export function ChapterNav({ book, chapter }: { book: string; chapter: number }) {
  const shown = useSetting(chapterButtonsSetting);
  const { previous, next } = neighbours(book, chapter);
  if (shown !== 'show' || (!previous && !next)) return null;
  const go = (to: OpenChapter) => openReader({ book: to.book, chapter: to.chapter });
  return (
    <nav aria-label="Chapters" className="px-3 pt-6">
      {chapterSwiped() ? <HideOffer /> : <HintCard event={CHAPTER_NAV_SHOWN} className="mb-3" />}
      <div className="grid grid-cols-2 gap-3">
        {previous ? (
          <button type="button" onClick={() => go(previous)} className={`${BUTTON} justify-start text-left`}>
            ‹ {previous.title}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {next ? (
          <button type="button" onClick={() => go(next)} className={`${BUTTON} justify-end text-right`}>
            {next.title} ›
          </button>
        ) : null}
      </div>
    </nav>
  );
}
