// src/reader/VerseText.tsx — how one verse's words are drawn (moved as is from src/Reader.tsx, module map R1a).
import type { BarHandlers } from 'voice-kit/composer';
import { Fragment, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { type EnglishChunk, type GreekWord, type SourceLanguage, type Verse, englishRuns } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, strayMarks, type WovenVerse } from '../data/weave';
import { useAiAllowed } from '../gate/licenceContext';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import type { SpeechLanguage } from '../speech/languages';
import type { Lookup } from '../WordSheet';
import { sourceAttrs, sourceFace, sourceSpeech } from './sourceText';
import { VariantBrace } from './VariantBrace';
import type { BraceReading, ShownUnit } from './variants';
import { sayWord } from './sayWord';
import { variantLabel, variantLookup } from './variantWords';
import { wordAtPoint } from './tappedWord';
import { Tap, TAP_PAD } from './Tap';
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
  /** the variant units of this verse the Reader shows (src/reader/variants.ts): their words are marked and a brace after them holds the other readings; absent, none */
  variants?: readonly ShownUnit[];
  /** a tap on a unit's brace */
  onVariant?: (shown: ShownUnit) => void;
}

/** How a variant unit's words are drawn (mw-9ji6ek0.5): a dotted line under them in the accent, which reads in the light and the dark themes and leaves the word's own colour.
 * The line is the background of one span around the whole run of marked words (mw-9ji6ek0.13), a 2 px dot every 4 px: a dotted text-decoration starts its own pattern in each
 * word's span, and where two meet (the space after 'for ') the dots crowd into a dash. Each word stays its own tap target inside the run. The span's padding is under the line only
 * (an inline box's vertical padding costs the line nothing). */
const VARIANT_RUN =
  'pb-[0.1em] [background-image:linear-gradient(to_right,var(--color-accent)_50%,transparent_50%)] [background-size:4px_2px] [background-position:left_bottom] bg-repeat-x [box-decoration-break:clone]';

/** One thing drawn in a verse's row; a `run` one is under the variant line (VARIANT_RUN) with its marked neighbours, a brace or any other word ends the run.
 * A `run` one is a function of `bare`: the run's last word is drawn without its trailing space, which underRuns puts after the run's span (mw-9ji6ek0.28). */
interface Drawn {
  node: ReactNode | ((bare: boolean) => ReactNode);
  run?: boolean;
}

/** The nodes of a row, the consecutive `run` ones wrapped in one span that draws the unit's one dotted line. The space after the run's last word stands outside the span:
 * Immersive justifies, a line with a brace stretches its spaces, and a background under that space would be dots on nothing (mw-9ji6ek0.28). */
function underRuns(items: readonly Drawn[]): ReactNode[] {
  const out: ReactNode[] = [];
  let run: Drawn[] = [];
  const draw = (item: Drawn, bare: boolean): ReactNode => (typeof item.node === 'function' ? item.node(bare) : item.node);
  const close = () => {
    if (run.length) {
      out.push(<span key={`run${out.length}`} data-variant-run="" className={VARIANT_RUN}>{run.map((item, k) => draw(item, k === run.length - 1))}</span>, ' ');
    }
    run = [];
  };
  for (const item of items) {
    if (item.run) run.push(item);
    else {
      close();
      out.push(draw(item, false));
    }
  }
  close();
  return out;
}

/** Where each brace of a verse stands and which words or chunks are marked (VerseText): in the Greek view after the unit's last word; in the English and the weave after
 * the last drawn chunk that holds a word of the unit (or, where the MSB gives the unit's words no English, after the chunk of the word before them, or at the start), in
 * the language the unit's chunks take: Greek when every one is woven, else English. */
interface VariantPlan {
  marked: ReadonlySet<number>;
  after: ReadonlyMap<number, readonly { shown: ShownUnit; language: 'greek' | 'english' }[]>;
  start: readonly { shown: ShownUnit; language: 'greek' | 'english' }[];
}

const NO_PLAN: VariantPlan = { marked: new Set(), after: new Map(), start: [] };

function planVariants(verse: Verse, view: ReaderView, woven: WovenVerse | null, variants: readonly ShownUnit[] | undefined): VariantPlan {
  if (!variants?.length) return NO_PLAN;
  const marked = new Set<number>();
  const after = new Map<number, { shown: ShownUnit; language: 'greek' | 'english' }[]>();
  const start: { shown: ShownUnit; language: 'greek' | 'english' }[] = [];
  const put = (at: number, item: { shown: ShownUnit; language: 'greek' | 'english' }) => after.set(at, [...(after.get(at) ?? []), item]);
  if (view === 'greek') {
    for (const shown of variants) {
      shown.unit.w.forEach((i) => marked.add(i));
      put(Math.max(...shown.unit.w), { shown, language: 'greek' });
    }
    return { marked, after, start };
  }
  const order = drawnOrder(verse, woven);
  const held = new Map<number, number>();
  verse.e.forEach((chunk, i) => chunk.g.forEach((g) => held.set(g, i)));
  for (const shown of variants) {
    const chunks = [...new Set(shown.unit.w.flatMap((g) => (held.has(g) ? [held.get(g) as number] : [])))];
    if (chunks.length) {
      chunks.forEach((c) => marked.add(c));
      const last = chunks.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a));
      put(last, { shown, language: woven && chunks.every((c) => woven[c]) ? 'greek' : 'english' });
      continue;
    }
    const before = [...held.keys()].filter((g) => g < Math.min(...shown.unit.w)).sort((a, b) => b - a)[0];
    if (before === undefined) start.push({ shown, language: 'english' });
    else put(held.get(before) as number, { shown, language: 'english' });
  }
  return { marked, after, start };
}

/** How a marked word is drawn: the verse card of a Review question shows the form asked (mw-5r3p30.652). */
const MARKED = 'font-bold underline decoration-2 underline-offset-4';

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not) in the order the weave lays them out
 * (the English order, or with the Weave's Order Greek the Greek one, mw-5r3p30.250). `marked` are indices into `verse.g` drawn marked (data-marked; in the English view
 * the chunk that stands for one); `still` draws the words as plain text for a verse shown on a card, where a tap has nothing to open. */
export function VerseText({ verse, view, source = 'grc', woven, onLook, marked, still, variants, onVariant }: Pick<VerseProps, 'verse' | 'view' | 'source' | 'woven' | 'onLook' | 'variants' | 'onVariant'> & { marked?: ReadonlySet<number>; still?: boolean }) {
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
  const say = (text: string, language: SpeechLanguage) => sayWord(text, language, verse.n);
  // a word inside a variant's brace opens the word popup as a word of the text does (src/reader/variantWords.ts), saying which reading it is from
  const lookVariant = (word: string, reading: BraceReading, language: 'greek' | 'english') => {
    const lookup = variantLookup(verse, word, reading, language, variantLabel(reading.chips));
    if (lookup) onLook(lookup);
  };
  // a marked word the MSB gives no English of its own is in no chunk: it is drawn, marked, in its own place in the English and the weave (weave.ts strayMarks, mw-5r3p30.817)
  const strays = view === 'greek' || marked === undefined ? { before: new Map<number, readonly number[]>(), end: [] as readonly number[] } : strayMarks(verse, marked, drawnOrder(verse, woven));
  const strayWord = (i: number) => (
    <Tap key={`w${i}`} still={still} data-word={String(i)} data-marked="" {...own} dir={ownDir} className={`${face} text-accent ${TAP_PAD} ${MARKED}`} onTap={() => lookGreek(verse.g[i])} onLongPress={() => say(verse.g[i].t, ownSpeech)}>
      {verse.g[i].t}
    </Tap>
  );
  // the variant units (mw-9ji6ek0.5): their words or chunks marked, a brace after them; a verse on a card (still) has none
  const plan = still ? NO_PLAN : planVariants(verse, view, woven, variants);
  const bracesAt = (items: readonly { shown: ShownUnit; language: 'greek' | 'english' }[] | undefined): Drawn[] =>
    (items ?? []).map(({ shown, language }) => ({ node: <VariantBrace key={`v${variants?.indexOf(shown) ?? 0}`} shown={shown} language={language} onOpen={onVariant} onWord={(word, reading) => lookVariant(word, reading, language)} onSay={say} /> }));
  const plain = (nodes: ReactNode[]): Drawn[] => nodes.map((node) => ({ node }));
  return (
    <span data-text>
      {underRuns(view === 'greek'
        ? verse.g.flatMap((w, i): Drawn[] => [
            {
              run: plan.marked.has(i),
              node: (bare: boolean) => (
                <Tap key={i} bare={bare} still={still} data-word={String(i)} data-marked={marked?.has(i) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} className={`${TAP_PAD} ${marked?.has(i) ? MARKED : ''}`} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, ownSpeech)}>
                  {w.t}
                </Tap>
              ),
            },
            ...bracesAt(plan.after.get(i)),
          ])
        : [-2, ...drawnOrder(verse, woven), -1].flatMap((i): Drawn[] => {
            if (i === -2) return bracesAt(plan.start);
            if (i < 0) return plain(strays.end.map(strayWord));
            const braces = bracesAt(plan.after.get(i));
            const before = plain((strays.before.get(i) ?? []).map(strayWord));
            const run = plan.marked.has(i);
            // a Greek-order weave may have moved a sentence's closing mark to the end of its last piece (weave.ts chunkText)
            const text = chunkText(verse, woven, i);
            const c = text === verse.e[i].t ? verse.e[i] : { ...verse.e[i], t: text };
            const weft = woven?.[i];
            if (weft && weft.words.length > 1) {
              // Two Greek words behind one English chunk ("to you." is ὑμῖν γράφω): the wrapper only holds the chunk's marks, each word is its own target (mw-5r3p30.614).
              const words = (bare: boolean) => weft.words.map((w, k) => (
                <Tap key={k} bare={bare && k === weft.words.length - 1} still={still} dir={ownDir} className={TAP_PAD} onTap={() => lookWord(w, c)} onLongPress={() => say(w.t, ownSpeech)}>
                  {w.t}
                </Tap>
              ));
              return [...before, { run, node: (bare: boolean) => (
                <span key={i} data-chunk={String(i)} data-woven="" data-marked={isMarked(c) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} data-learning={weft.learning ? '' : undefined} {...own} dir={ownDir} className={`${face} text-accent ${isMarked(c) ? MARKED : ''}`}>
                  {weft.learning ? (
                    <span className="inline-flex flex-col items-center align-top leading-tight">
                      <span data-greek>{words(bare)}</span>
                      <Tap still={still} data-hint="" lang="en" dir={chunkDir} className="whitespace-nowrap font-sans text-sm font-normal text-muted" onTap={(e) => lookEnglish(c, e)} onLongPress={() => say(c.t, 'english')}>
                        {c.t}
                      </Tap>
                    </span>
                  ) : (
                    words(bare)
                  )}
                </span>
              ) }, ...braces];
            }
            return [...before, { run, node: (bare: boolean) => weft ? (
              <Tap
                key={i}
                bare={bare}
                still={still}
                data-chunk={String(i)}
                data-woven=""
                data-marked={isMarked(c) ? '' : undefined}
                data-variant={plan.marked.has(i) ? '' : undefined}
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
              <Tap key={i} bare={bare} still={still} dir={chunkDir} data-chunk={String(i)} data-marked={isMarked(c) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} className={`${TAP_PAD} ${isMarked(c) ? `${MARKED} text-accent` : ''}`} onTap={(e) => lookEnglish(c, e)} onLongPress={() => say(c.t, 'english')}>
                {c.s ? <SuppliedText chunk={c} /> : c.t}
              </Tap>
            ) }, ...braces];
          }))}
    </span>
  );
}
