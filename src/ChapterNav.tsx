// src/ChapterNav.tsx — the two buttons at the foot of a chapter, after the last verse (mw-5r3p30.63): '‹ 1 John 1' and '1 John 3 ›'.
// The header has no width for them (docs: the title already truncates at 360 px). A tap opens the chapter from the top as a new Back
// step, the way the picker does; a chapter that is not on the phone says so in the Reader. Matthew 1 has no previous, Revelation 22 no next.
import { neighbours } from './data/neighbours';
import type { OpenChapter } from './data/readerChapter';
import { openReader } from './nav/route';

const BUTTON = 'flex min-h-12 w-full items-center rounded-xl border border-line bg-surface px-3 text-base font-medium text-accent active:bg-line';

export function ChapterNav({ book, chapter }: { book: string; chapter: number }) {
  const { previous, next } = neighbours(book, chapter);
  if (!previous && !next) return null;
  const go = (to: OpenChapter) => openReader({ book: to.book, chapter: to.chapter });
  return (
    <nav aria-label="Chapters" className="grid grid-cols-2 gap-3 px-3 pt-6">
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
    </nav>
  );
}
