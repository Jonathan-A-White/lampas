// src/reader/ChapterText.tsx — how a chapter's verses are drawn: a verse to a line, a paragraph, a section heading, a passage
// (moved as is from src/Reader.tsx, module map R1a).
import { useEffect, useRef } from 'react';
import type { Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import type { Passage } from '../data/passage';
import type { Woven } from '../data/weave';
import { VersePlay } from '../speech/ReadControls';
import type { Lookup } from '../WordSheet';
import { READING_CLASS, textClass } from './textClass';
import { VerseNumber, VerseText, type VerseProps, type VerseTalk } from './VerseText';

/** Verse by verse: one verse per line, its number a button before it (a tap opens the Verse view, src/VerseView.tsx). */
export function VerseLine(props: VerseProps) {
  const { verse, view, selected, reading, onSelect, onPlay, talk } = props;
  return (
    <p
      data-verse={verse.n}
      data-selected={selected}
      data-reading={reading || undefined}
      lang={view === 'greek' ? 'grc' : 'en'}
      className={`mb-1 break-words rounded-xl px-2 leading-(--lp-leading) ${reading ? READING_CLASS : selected ? 'bg-accent/15' : ''} ${textClass(view)}`}
    >
      <VerseNumber
        n={verse.n}
        selected={selected}
        onSelect={onSelect}
        talk={talk}
        className="inline-block min-h-(--lp-tap) min-w-(--lp-tap) pr-1 text-left align-baseline font-sans text-sm font-semibold leading-(--lp-tap) text-muted"
      >
        {verse.n}
      </VerseNumber>
      <VerseText {...props} />
      <VersePlay playing={reading} onPlay={onPlay} className="align-baseline font-sans" />
    </p>
  );
}

/** Paragraph: the verses of one MSB paragraph run on, each number a small superscript. The button is still 44 px square
 * (its side margins pull the neighbours back in), and a verse is still selected by its number. The play button of a
 * verse shows only while it is selected, so a paragraph reads as running text. */
export function ParagraphView({ verses, view, woven, selected, reading, onSelect, onPlay, onLook, talk }: {
  verses: Verse[];
  view: ReaderView;
  woven: (Woven[] | null)[];
  selected: number | null;
  /** the verse being read aloud */
  reading: number | null;
  onSelect: (n: number) => void;
  onPlay: (n: number) => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
}) {
  return (
    <p data-paragraph lang={view === 'greek' ? 'grc' : 'en'} className={`mb-2 break-words px-2 leading-(--lp-leading) ${textClass(view)}`}>
      {verses.map((verse, i) => (
        <span key={verse.n} data-verse={verse.n} data-selected={selected === verse.n} data-reading={reading === verse.n || undefined} className={`rounded-xl ${reading === verse.n ? READING_CLASS : selected === verse.n ? 'bg-accent/15' : ''}`}>
          <VerseNumber
            n={verse.n}
            selected={selected === verse.n}
            onSelect={() => onSelect(verse.n)}
            talk={talk}
            className="-mx-3 inline-block min-h-(--lp-tap) min-w-(--lp-tap) text-center align-baseline font-sans leading-(--lp-tap)"
          >
            <sup className="text-xs font-semibold text-muted">{verse.n}</sup>
          </VerseNumber>
          <VerseText verse={verse} view={view} woven={woven[i]} onLook={onLook} />
          {selected === verse.n || reading === verse.n ? (
            <VersePlay playing={reading === verse.n} onPlay={() => onPlay(verse.n)} className="align-baseline font-sans" />
          ) : null}
        </span>
      ))}
    </p>
  );
}

/** A section heading: the MSB's own English, whichever view is on. The whole heading is a button that opens the Verse view for its passage; its
 * padding (the heading's own side padding moved onto it, so it spans the whole width) and the negative margin that takes the vertical padding back keep the text where it was and give a thumb 44 px (`flow-root` keeps the margin inside). */
export function SectionHeading({ text, onOpen }: { text: string; onOpen: () => void }) {
  return (
    <h2 data-heading lang="en" className="mb-1 mt-5 flow-root font-sans text-lg font-semibold leading-snug text-accent">
      <button type="button" onClick={onOpen} className="-my-2.5 block w-full rounded-lg px-2 py-2.5 text-left active:bg-line">
        {text}
      </button>
    </h2>
  );
}

/** The verses of a passage for the Verse view, one after another with a small number before each, the one being read highlighted; the reading is
 * followed down the box the view scrolls the passage in (data-passage-box), by moving that box and nothing else. Each verse is the Reader's own VerseText, so the weave and the tappable words follow it. */
export function PassageText({ passage, view, wovenOf, reading, onLook }: {
  passage: Passage;
  view: ReaderView;
  wovenOf: (verse: Verse) => Woven[] | null;
  reading: number | null;
  onLook: (lookup: Lookup) => void;
}) {
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = reading === null ? null : box.current?.querySelector<HTMLElement>(`[data-passage-verse="${reading}"]`);
    const scroller = el?.closest<HTMLElement>('[data-passage-box]');
    if (!el || !scroller) return;
    const inner = el.getBoundingClientRect();
    const outer = scroller.getBoundingClientRect();
    if (inner.top < outer.top || inner.bottom > outer.bottom) scroller.scrollTop += inner.top - outer.top - 8;
  }, [reading]);
  return (
    <span ref={box} data-passage={passage.first}>
      {passage.verses.map((verse) => (
        <span key={verse.n} data-passage-verse={verse.n} data-reading={reading === verse.n || undefined} className={`rounded-xl ${reading === verse.n ? READING_CLASS : ''}`}>
          <sup className="mr-1 font-sans text-xs font-semibold text-muted">{verse.n}</sup>
          <VerseText verse={verse} view={view} woven={wovenOf(verse)} onLook={onLook} />
        </span>
      ))}
    </span>
  );
}
