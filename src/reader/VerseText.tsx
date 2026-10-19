// src/reader/VerseText.tsx — how one verse's words are drawn (moved as is from src/Reader.tsx, module map R1a).
import { Fragment, type ReactNode } from 'react';
import { type EnglishChunk, type GreekWord, type Verse, englishRuns } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { drawnOrder, type WovenVerse } from '../data/weave';
import { publish } from '../events/bus';
import { useAiAllowed } from '../gate/licenceContext';
import { useHoldPress } from '../ui/holdPress';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import { speakWord } from '../speech/greek';
import type { SpeechLanguage } from '../speech/languages';
import type { Lookup } from '../WordSheet';
import { GREEK_LANG } from '../script/greekLang';
// 44 px (--lp-tap) minus 1 em, halved, top and bottom. Every face's content area is taller than 1 em (Gentium Plus
// about 1.11 em, a phone's sans about 1.1 em), so an inline word is never under 44 px whatever the font, and the line
// box stays --lp-tap tall, so the spare pixels cost no layout.
const TAP_PAD = 'py-[calc((var(--lp-tap)-1em)/2)]';

/** An English chunk with only the words the translators supplied in italics ('was' of 'was king'): [data-supplied]. */
function SuppliedText({ chunk }: { chunk: EnglishChunk }) {
  return (
    <>
      {englishRuns(chunk).map((run, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : ''}
          {run.supplied ? (
            <i data-supplied className="italic">
              {run.text}
            </i>
          ) : (
            run.text
          )}
        </Fragment>
      ))}
    </>
  );
}

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. It has no horizontal padding: the gap between two words is that one space (mw-5r3p30.127). A finger held on it for half a second (`onLongPress`)
 * is a press, not a tap: the click that follows is dropped, and so is one after the finger wandered over 10 px
 * (src/ui/longPress.ts). The word never selects text and never raises the phone's callout menu, so the hold is free for the press. */
function Tap({ onTap, onLongPress, lang, className, children, ...data }: {
  onTap: () => void;
  onLongPress: () => void;
  lang?: string;
  'data-lang'?: string;
  className?: string;
  children: ReactNode;
  'data-chunk'?: string;
  'data-woven'?: string;
  'data-learning'?: string;
  'data-word'?: string;
  'data-hint'?: string;
}) {
  const press = useLongPress(onTap, onLongPress);
  return (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      {...data}
      {...press}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer ${NO_SELECT} rounded active:bg-line ${className ?? ''}`}
    >
      {children}{' '}
    </span>
  );
}

/** What a held verse number does: open the talk about that verse and listen, send on release, drop on a slide-away. */
export interface VerseTalk {
  onHold: (n: number) => void;
  onRelease: () => void;
  onDrop: () => void;
}

/** The button with a verse's number: a tap selects the verse, a hold (half a second) talks about it. */
export function VerseNumber({ n, selected, onSelect, talk, className, children }: {
  n: number;
  selected: boolean;
  onSelect: () => void;
  talk: VerseTalk;
  className: string;
  children: ReactNode;
}) {
  const press = useHoldPress({ onTap: onSelect, onHold: () => talk.onHold(n), onRelease: talk.onRelease, onDrop: talk.onDrop });
  // Holding the number talks to the tutor: with no licence it is a plain button that selects (mw-8m9dyu.2).
  const ai = useAiAllowed();
  return (
    <button
      type="button"
      {...(ai ? press : { onClick: onSelect })}
      data-verse-number
      aria-label={`Verse ${n}`}
      aria-pressed={selected}
      className={`select-none [-webkit-touch-callout:none] ${className}`}
    >
      {children}
    </button>
  );
}

export interface VerseProps {
  verse: Verse;
  view: ReaderView;
  /** per English chunk, the Greek words shown in its place or null, and the order the chunks are laid out in; null for the whole verse when the weave is off */
  woven: WovenVerse | null;
  selected: boolean;
  /** this verse is the one being read aloud */
  reading: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
}

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not) in the order the weave lays them out
 * (the English order, or with the Weave's Order Greek the Greek one, mw-5r3p30.250). */
export function VerseText({ verse, view, woven, onLook }: Pick<VerseProps, 'verse' | 'view' | 'woven' | 'onLook'>) {
  const lookGreek = (w: GreekWord) =>
    onLook({ words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false });
  const lookWord = (w: GreekWord, c: EnglishChunk) => onLook({ words: [w], english: c.t, fromEnglish: false });
  const lookEnglish = (c: EnglishChunk) => onLook({ words: c.g.map((i) => verse.g[i]), english: c.t, fromEnglish: true });
  // A long press says the word alone, in its own language, straight from the press (docs/pwa-best-practices.md section 12).
  // A reading under way is paused by the word (speech/greek.ts speakBeside): a Listen goes on by itself when the word is over.
  const say = (text: string, language: SpeechLanguage) => {
    if (speakWord(text, language)) publish({ kind: 'word-spoken', text, language, verse: verse.n });
  };
  return (
    <span data-text>
      {view === 'greek'
        ? verse.g.map((w, i) => (
            <Tap key={i} data-word={String(i)} className={TAP_PAD} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, 'greek')}>
              {w.t}
            </Tap>
          ))
        : drawnOrder(verse, woven).map((i) => {
            const c = verse.e[i];
            const weft = woven?.[i];
            if (weft && weft.words.length > 1) {
              // Two Greek words behind one English chunk ("to you." is ὑμῖν γράφω): the wrapper only holds the chunk's marks, each word is its own target (mw-5r3p30.614).
              const words = weft.words.map((w, k) => (
                <Tap key={k} className={TAP_PAD} onTap={() => lookWord(w, c)} onLongPress={() => say(w.t, 'greek')}>
                  {w.t}
                </Tap>
              ));
              return (
                <span key={i} data-chunk={String(i)} data-woven="" data-learning={weft.learning ? '' : undefined} {...GREEK_LANG} className="font-greek text-[length:var(--lp-greek-size)] text-accent">
                  {weft.learning ? (
                    <span className="inline-flex flex-col items-center align-top leading-tight">
                      <span data-greek>{words}</span>
                      <Tap data-hint="" lang="en" className="whitespace-nowrap font-sans text-sm font-normal text-muted" onTap={() => lookEnglish(c)} onLongPress={() => say(c.t, 'english')}>
                        {c.t}
                      </Tap>
                    </span>
                  ) : (
                    words
                  )}
                </span>
              );
            }
            return weft ? (
              <Tap
                key={i}
                data-chunk={String(i)}
                data-woven=""
                data-learning={weft.learning ? '' : undefined}
                {...GREEK_LANG}
                className={`font-greek text-[length:var(--lp-greek-size)] text-accent ${TAP_PAD}`}
                onTap={() => lookEnglish(c)}
                onLongPress={() => say(weft.words.map((w) => w.t).join(' '), 'greek')}
              >
                {weft.learning ? (
                  <span className="inline-flex flex-col items-center align-top leading-tight">
                    <span data-greek>{weft.words.map((w) => w.t).join(' ')}</span>
                    <span data-hint lang="en" className="whitespace-nowrap font-sans text-sm font-normal text-muted">
                      {c.t}
                    </span>
                  </span>
                ) : (
                  weft.words.map((w) => w.t).join(' ')
                )}
              </Tap>
            ) : (
              <Tap key={i} data-chunk={String(i)} className={TAP_PAD} onTap={() => lookEnglish(c)} onLongPress={() => say(c.t, 'english')}>
                {c.s ? <SuppliedText chunk={c} /> : c.t}
              </Tap>
            );
          })}
    </span>
  );
}
