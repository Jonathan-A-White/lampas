// src/reader/split/TextDock.tsx — the body of a text in the Reader's dock (mw-5r3p30.1130, docs/design/reader-split.md 'A text pane'): the chosen text's verses of the open chapter, each in one plain view (no weave,
// no section headings, no Variants braces, no reading highlight), drawn by the Reader's own VerseText so a tap on a word opens the word sheet it opens, over both panes. The rows are the passage's sequence
// (splitPairing.ts): a passage verse the text lacks is a muted row at its place ('15 · Not in the Septuagint'), so nothing is ever blank. A verse number is a button that brings the passage to that verse.
// Each row carries Lampas's verse number (data-dock-verse), which is what the Link follows; a dock verse with no Lampas number (data-dock-extra) is drawn with its own number alone.
import type { ReactNode } from 'react';
import type { Chapter } from '../../data/chapter';
import { ShownNumber } from '../ChapterText';
import { isSeptuagint } from '../septuagint';
import { rowAttrs } from '../sourceText';
import { textClass } from '../textClass';
import { VerseText } from '../VerseText';
import type { Lookup } from '../../WordSheet';
import { pairVerses } from './splitPairing';
import { notInText, splitTextView, type SplitTextKey } from './splitTexts';

const NUMBER = 'inline-block min-h-(--lp-tap) min-w-(--lp-tap) pe-1 text-start align-baseline font-sans text-sm font-semibold leading-(--lp-tap) text-muted';
/** A Septuagint verse whose English chunk is paired to no Greek word: a tap on it opens nothing (the Reader's Verse view does the same) */
const stay = (): void => undefined;

export function TextDock({ text, book, lampasChapter, chapter, passage, onLook, onNumber }: {
  text: SplitTextKey;
  /** Lampas's book code and the chapter the Reader has open */
  book: string;
  lampasChapter: number;
  /** the dock's text in that chapter */
  chapter: Chapter;
  /** the passage's verses, Lampas's numbers */
  passage: readonly number[];
  onLook(lookup: Lookup, chapter: Chapter): void;
  /** a tap on a dock verse's number: the passage goes to Lampas's verse `n` */
  onNumber(n: number): void;
}): ReactNode {
  const { view, source } = splitTextView(text, book);
  const septuagint = isSeptuagint(chapter);
  const rows = pairVerses(passage, chapter.verses, book, lampasChapter);
  return (
    <div data-dock-text={text} className="px-1 pt-2">
      {rows.map((row) =>
        row.kind === 'missing' ? (
          <p key={`m${row.lampas}`} data-dock-verse={row.lampas} data-dock-missing="" lang="en" className="mb-1 rounded-xl px-2 py-2 font-sans text-base leading-(--lp-leading) text-muted">
            {row.lampas} · {notInText(text)}
          </p>
        ) : (
          <div
            key={`v${row.verse.n}`}
            data-dock-verse={row.lampas ?? undefined}
            data-dock-extra={row.lampas === null ? '' : undefined}
            {...rowAttrs(view, source)}
            className={`mb-1 break-words rounded-xl px-2 leading-(--lp-leading) ${textClass(view, source)}`}
          >
            <button type="button" data-verse-number aria-label={`Verse ${row.lampas ?? row.verse.n}`} disabled={row.lampas === null} onClick={() => row.lampas !== null && onNumber(row.lampas)} className={NUMBER}>
              <ShownNumber verse={row.verse} septuagint={septuagint ? chapter.chapter : undefined} />
            </button>
            <VerseText verse={row.verse} view={view} source={source} woven={null} onLook={(lookup) => onLook(lookup, chapter)} onUnlinked={septuagint ? stay : undefined} />
          </div>
        ),
      )}
    </div>
  );
}
