// src/reader/VerseText.tsx — how one verse's words are drawn (moved as is from src/Reader.tsx, module map R1a).
import type { BarHandlers } from 'voice-kit/composer';
import { Fragment, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { type EnglishChunk, type GreekWord, type SourceLanguage, type Verse, englishRuns } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { publish } from '../events/bus';
import { useAiAllowed } from '../gate/licenceContext';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import { hasVoice, speakWord } from '../speech/greek';
import type { SpeechLanguage } from '../speech/languages';
import type { Lookup } from '../WordSheet';
import { sourceAttrs, sourceFace, sourceSpeech } from './sourceText';
import { wordAtPoint } from './tappedWord';
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
function Tap({ onTap, onLongPress, still, lang, dir, className, children, ...data }: {
  /** a tap by touch or mouse gives its click: where on the word the finger was; the keyboard's Enter gives none */
  onTap: (e?: MouseEvent<HTMLElement>) => void;
  onLongPress: () => void;
  /** read only (a verse on a card): a plain span, not a button */
  still?: boolean;
  lang?: string;
  /** the direction the word is isolated in: an Old Testament weave puts English chunks (ltr) and Hebrew ones (rtl) in one row, each its own way round */
  dir?: 'ltr' | 'rtl';
  'data-lang'?: string;
  className?: string;
  children: ReactNode;
  'data-chunk'?: string;
  'data-woven'?: string;
  'data-learning'?: string;
  'data-word'?: string;
  'data-hint'?: string;
  'data-marked'?: string;
}) {
  const press = useLongPress((e) => onTap(e as MouseEvent<HTMLElement>), onLongPress);
  if (still) {
    return (
      <>
        <span lang={lang} dir={dir} {...data} className={className}>
          {children}
        </span>{' '}
      </>
    );
  }
  // A word with a direction of its own is a bidi isolate and its trailing space stands outside it: inside, the space would sit on the isolate's own end, which is the side of the previous neighbour
  // for a left-to-right chunk and of the next for a right-to-left one, and the gaps in a row of both would fall unevenly.
  const word = (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      dir={dir}
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
      {children}
      {dir ? null : ' '}
    </span>
  );
  return dir ? (
    <>
      {word}{' '}
    </>
  ) : (
    word
  );
}

/** What a held verse number does: the handlers of voice-kit's bar for a press on verse `n` (src/Reader.tsx pressOn) open the talk about that verse as the hold begins, listen, send on release and drop on a slide-away. */
export interface VerseTalk {
  handlers: (n: number) => BarHandlers;
  /** a hold of the kit's bar is going on */
  listening: boolean;
}

/** The button with a verse's number: a tap selects the verse, a hold (half a second) talks about it. Where the tutor is not offered (no licence) the hold copies the verse
 * instead, at once (`onCopy`, src/copy/useCopyHold.ts: useLongPress, the app's one hold). */
export function VerseNumber({ n, selected, onSelect, onCopy, talk, className, children }: {
  n: number;
  selected: boolean;
  onSelect: () => void;
  onCopy?: () => void;
  talk: VerseTalk;
  className: string;
  children: ReactNode;
}) {
  // Holding the number talks to the tutor: with no licence it is a plain button that selects (mw-8m9dyu.2).
  const ai = useAiAllowed();
  const listening = useRef(false);
  useEffect(() => {
    listening.current = talk.listening;
  });
  // the click that ends a hold is not a tap: the flag is cleared as a press begins, set as its hold has begun by the time the finger lifts
  const held = useRef(false);
  const guard = useRef<(() => void) | null>(null);
  useEffect(() => () => guard.current?.(), []);
  const handlers = ai ? talk.handlers(n) : null;
  const press = useLongPress(onSelect, () => onCopy?.());
  const copying = !ai && onCopy !== undefined;
  return (
    <button
      type="button"
      {...(handlers ?? {})}
      onPointerDown={
        copying
          ? press.onPointerDown
          : handlers
          ? (e) => {
              held.current = false;
              // the page does not scroll under a finger that holds (React's touchmove is passive: a listener of our own, on while he presses)
              guard.current?.();
              const el = e.currentTarget;
              const keepStill = (event: TouchEvent): void => {
                if (listening.current && event.cancelable) event.preventDefault();
              };
              el.addEventListener('touchmove', keepStill, { passive: false });
              guard.current = () => {
                el.removeEventListener('touchmove', keepStill);
                guard.current = null;
              };
              handlers.onPointerDown(e);
            }
          : undefined
      }
      {...(copying ? { onPointerMove: press.onPointerMove, onContextMenu: press.onContextMenu } : {})}
      onPointerUp={
        copying
          ? press.onPointerUp
          : handlers
          ? () => {
              if (listening.current) held.current = true;
              guard.current?.();
              handlers.onPointerUp();
            }
          : undefined
      }
      onPointerCancel={
        copying
          ? press.onPointerCancel
          : handlers
          ? () => {
              guard.current?.();
              handlers.onPointerCancel();
            }
          : undefined
      }
      onClick={
        copying
          ? press.onClick
          : () => {
              if (held.current) held.current = false;
              else onSelect();
            }
      }
      data-verse-number
      aria-label={`Verse ${n}`}
      aria-pressed={selected}
      className={`${NO_SELECT} ${className}`}
    >
      {children}
    </button>
  );
}

export interface VerseProps {
  verse: Verse;
  view: ReaderView;
  /** the language of the chapter's own words, the source view's: Greek unless the chapter is Hebrew ('hbo') */
  source?: SourceLanguage;
  /** per English chunk, the Greek words shown in its place or null, and the order the chunks are laid out in; null for the whole verse when the weave is off */
  woven: WovenVerse | null;
  selected: boolean;
  /** this verse is the one being read aloud */
  reading: boolean;
  onSelect: () => void;
  /** a hold on the verse's number with no tutor to talk to copies the verse */
  onCopy?: () => void;
  onPlay: () => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
}

/** How a marked word is drawn: the verse card of a Review question shows the form asked (mw-5r3p30.652). */
const MARKED = 'font-bold underline decoration-2 underline-offset-4';

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not) in the order the weave lays them out
 * (the English order, or with the Weave's Order Greek the Greek one, mw-5r3p30.250). `marked` are indices into `verse.g` drawn marked (data-marked; in the English view
 * the chunk that stands for one); `still` draws the words as plain text for a verse shown on a card, where a tap has nothing to open. */
export function VerseText({ verse, view, source = 'grc', woven, onLook, marked, still }: Pick<VerseProps, 'verse' | 'view' | 'source' | 'woven' | 'onLook'> & { marked?: ReadonlySet<number>; still?: boolean }) {
  const hebrew = source === 'hbo';
  const own = sourceAttrs(source);
  const face = sourceFace(source);
  const ownSpeech = sourceSpeech(source);
  // an Old Testament weave has Hebrew and English side by side: each chunk is isolated in its own direction, whichever way the row runs
  const chunkDir = hebrew ? ('ltr' as const) : undefined;
  const ownDir = hebrew ? ('rtl' as const) : undefined;
  const isMarked = (c: EnglishChunk): boolean => marked !== undefined && c.g.some((i) => marked.has(i));
  const lookGreek = (w: GreekWord) =>
    onLook({ words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false });
  const lookWord = (w: GreekWord, c: EnglishChunk) => onLook({ words: [w], english: c.t, fromEnglish: false });
  // `tapped` is the one English word of the chunk his finger was on, when the chunk is drawn in English and holds more than one (the sheet then looks up that word alone, mw-5r3p30.782)
  const lookEnglish = (c: EnglishChunk, e?: MouseEvent<HTMLElement>) =>
    onLook({ words: c.g.map((i) => verse.g[i]), english: c.t, fromEnglish: true, tapped: e ? wordAtPoint(e.currentTarget, e.clientX, e.clientY) : undefined });
  // A long press says the word alone, in its own language, straight from the press (docs/pwa-best-practices.md section 12).
  // A reading under way is paused by the word (speech/greek.ts speakBeside): a Listen goes on by itself when the word is over.
  const say = (text: string, language: SpeechLanguage) => {
    // a phone that lists no Hebrew voice says nothing: its default voice would read the letters as English (the reading shows the line about it, ReadControls)
    if (language === 'hebrew' && hasVoice('hebrew') === false) return;
    if (speakWord(text, language)) publish({ kind: 'word-spoken', text, language, verse: verse.n });
  };
  return (
    <span data-text>
      {view === 'greek'
        ? verse.g.map((w, i) => (
            <Tap key={i} still={still} data-word={String(i)} data-marked={marked?.has(i) ? '' : undefined} className={`${TAP_PAD} ${marked?.has(i) ? MARKED : ''}`} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, ownSpeech)}>
              {w.t}
            </Tap>
          ))
        : drawnOrder(verse, woven).map((i) => {
            // a Greek-order weave may have moved a sentence's closing mark to the end of its last piece (weave.ts chunkText)
            const text = chunkText(verse, woven, i);
            const c = text === verse.e[i].t ? verse.e[i] : { ...verse.e[i], t: text };
            const weft = woven?.[i];
            if (weft && weft.words.length > 1) {
              // Two Greek words behind one English chunk ("to you." is ὑμῖν γράφω): the wrapper only holds the chunk's marks, each word is its own target (mw-5r3p30.614).
              const words = weft.words.map((w, k) => (
                <Tap key={k} still={still} dir={ownDir} className={TAP_PAD} onTap={() => lookWord(w, c)} onLongPress={() => say(w.t, ownSpeech)}>
                  {w.t}
                </Tap>
              ));
              return (
                <span key={i} data-chunk={String(i)} data-woven="" data-marked={isMarked(c) ? '' : undefined} data-learning={weft.learning ? '' : undefined} {...own} dir={ownDir} className={`${face} text-accent ${isMarked(c) ? MARKED : ''}`}>
                  {weft.learning ? (
                    <span className="inline-flex flex-col items-center align-top leading-tight">
                      <span data-greek>{words}</span>
                      <Tap still={still} data-hint="" lang="en" dir={chunkDir} className="whitespace-nowrap font-sans text-sm font-normal text-muted" onTap={(e) => lookEnglish(c, e)} onLongPress={() => say(c.t, 'english')}>
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
                still={still}
                data-chunk={String(i)}
                data-woven=""
                data-marked={isMarked(c) ? '' : undefined}
                data-learning={weft.learning ? '' : undefined}
                {...own}
                dir={ownDir}
                className={`${face} text-accent ${TAP_PAD} ${isMarked(c) ? MARKED : ''}`}
                onTap={() => lookEnglish(c)}
                onLongPress={() => say(weft.words.map((w) => w.t).join(' '), ownSpeech)}
              >
                {weft.learning ? (
                  <span className="inline-flex flex-col items-center align-top leading-tight">
                    <span data-greek>{weft.words.map((w) => w.t).join(' ')}</span>
                    <span data-hint lang="en" dir={chunkDir} className="whitespace-nowrap font-sans text-sm font-normal text-muted">
                      {c.t}
                    </span>
                  </span>
                ) : (
                  weft.words.map((w) => w.t).join(' ')
                )}
              </Tap>
            ) : (
              <Tap key={i} still={still} dir={chunkDir} data-chunk={String(i)} data-marked={isMarked(c) ? '' : undefined} className={`${TAP_PAD} ${isMarked(c) ? `${MARKED} text-accent` : ''}`} onTap={(e) => lookEnglish(c, e)} onLongPress={() => say(c.t, 'english')}>
                {c.s ? <SuppliedText chunk={c} /> : c.t}
              </Tap>
            );
          })}
    </span>
  );
}
