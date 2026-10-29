// src/reader/VerseText.tsx — how one verse's words are drawn (moved as is from src/Reader.tsx, module map R1a).
import { Fragment, type MouseEvent, type ReactNode } from 'react';
import { type EnglishChunk, type GreekWord, type SourceLanguage, type Verse, englishRuns } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, strayMarks, type WovenVerse } from '../data/weave';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import type { SpeechLanguage } from '../speech/languages';
import type { Lookup } from '../WordSheet';
import { sourceAttrs, sourceFace, sourceSpeech } from './sourceText';
import { VariantBrace } from './VariantBrace';
import { chosenEnglish, chosenWords, OMISSION_MARK, type ChosenUnit } from './chosenReading';
import { chipOf, type BraceReading, type ShownUnit } from './variants';
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

/** The button with a verse's number: a tap selects the verse (it opens its Verse view), a hold (half a second) copies the verse at once, licence or not, as a hold on a section heading
 * or the place line copies its passage or the chapter (`onCopy`, src/copy/useCopyHold.ts: useLongPress, the app's one hold). Talking about the verse is one tap away in the Verse view;
 * the Talk bar's own hold is the hold-to-talk (mw-5r3p30.835). */
export function VerseNumber({ n, selected, onSelect, onCopy, className, children }: {
  n: number;
  selected: boolean;
  onSelect: () => void;
  onCopy?: () => void;
  className: string;
  children: ReactNode;
}) {
  const press = useLongPress(onSelect, () => onCopy?.());
  return (
    <button
      type="button"
      {...press}
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
  /** a hold on the verse's number copies the verse */
  onCopy?: () => void;
  onPlay: () => void;
  onLook: (lookup: Lookup) => void;
  /** the variant units of this verse the Reader shows (src/reader/variants.ts): their words are marked and a brace after them holds the other readings; absent, none */
  variants?: readonly ShownUnit[];
  /** a tap on a unit's brace */
  onVariant?: (shown: ShownUnit) => void;
  /** the units of this verse with a reading laid in place by the reading set in force (src/reader/chosenReading.ts): their words are the reading's, with a thin solid line under them, whether Variants is on or not */
  chosen?: readonly ChosenUnit[];
}

/** How a variant unit's words are drawn (mw-9ji6ek0.5): a dotted line under them in the accent, which reads in the light and the dark themes and leaves the word's own colour.
 * The line is the background of one span around the whole run of marked words (mw-9ji6ek0.13), a 2 px dot every 4 px: a dotted text-decoration starts its own pattern in each
 * word's span, and where two meet (the space after 'for ') the dots crowd into a dash. Each word stays its own tap target inside the run. The span's padding is under the line only
 * (an inline box's vertical padding costs the line nothing). */
const VARIANT_RUN =
  'pb-[0.1em] [background-image:linear-gradient(to_right,var(--color-accent)_50%,transparent_50%)] [background-size:4px_2px] [background-position:left_bottom] bg-repeat-x [box-decoration-break:clone]';

/** How a reading laid in place is marked (mw-9ji6ek0.24): a thin solid line in the accent under its words, the background of one span around the run like the dotted line (VARIANT_RUN) so it
 * stops at the last letter and does not cross the space the line stretches. */
const CHOSEN_RUN =
  'pb-[0.1em] [background-image:linear-gradient(var(--color-accent),var(--color-accent))] [background-size:100%_1px] [background-position:left_bottom] bg-no-repeat [box-decoration-break:clone]';

/** One thing drawn in a verse's row; a `run` one is under the variant line (VARIANT_RUN: 'variant') or the line of a reading in place (CHOSEN_RUN: 'chosen') with its marked neighbours of the
 * same kind, a brace or any other word ends the run.
 * A `run` one is a function of `bare`: the run's last word is drawn without its trailing space, which underRuns puts after the run's span (mw-9ji6ek0.28). */
interface Drawn {
  node: ReactNode | ((bare: boolean) => ReactNode);
  run?: 'variant' | 'chosen';
}

/** The nodes of a row, the consecutive `run` ones of a kind wrapped in one span that draws the unit's one line. The space after the run's last word stands outside the span:
 * Immersive justifies, a line with a brace stretches its spaces, and a background under that space would be a line under nothing (mw-9ji6ek0.28). */
function underRuns(items: readonly Drawn[]): ReactNode[] {
  const out: ReactNode[] = [];
  let run: Drawn[] = [];
  const draw = (item: Drawn, bare: boolean): ReactNode => (typeof item.node === 'function' ? item.node(bare) : item.node);
  const close = () => {
    if (run.length) {
      const chosen = run[0].run === 'chosen';
      out.push(
        <span key={`run${out.length}`} {...(chosen ? { 'data-chosen-run': '' } : { 'data-variant-run': '' })} className={chosen ? CHOSEN_RUN : VARIANT_RUN}>
          {run.map((item, k) => draw(item, k === run.length - 1))}
        </span>,
        ' ',
      );
    }
    run = [];
  };
  for (const item of items) {
    if (item.run) {
      if (run.length && run[0].run !== item.run) close();
      run.push(item);
    } else {
      close();
      out.push(draw(item, false));
    }
  }
  close();
  return out;
}

/** A reading laid in place, as it is drawn: `greek` its words (tagged Greek, each a Tap), `english` its English as the chunks it replaces read (their edge marks kept: `first` and `last`
 * are the English of the first and last drawn chunk). A reading that leaves the words out is drawn as the small ⸆ of either kind. */
interface Placement {
  chosen: ChosenUnit;
  kind: 'greek' | 'english';
  first: string;
  last: string;
}

/** Where each brace of a verse stands and which words or chunks are marked (VerseText): in the Greek view after the unit's last word; in the English and the weave after
 * the last drawn chunk that holds a word of the unit (or, where the MSB gives the unit's words no English, after the chunk of the word before them, or at the start), in
 * the language the unit's chunks take: Greek when every one is woven, else English. A unit whose words have no chunk (a reading leaves them out or changes them) marks the chunk of the word before them.
 * A reading laid in place (mw-9ji6ek0.24) is not marked dotted: `inPlace` are the words or chunks of the text that stay and carry the solid line (the MSB's English when the reading's is the
 * same), `dropped` the ones its words replace, `replace` the reading drawn instead of the last of them, `tail` and `startPut` a reading drawn where the unit has no chunk of its own. */
interface VariantPlan {
  marked: ReadonlySet<number>;
  after: ReadonlyMap<number, readonly { shown: ShownUnit; language: 'greek' | 'english' }[]>;
  start: readonly { shown: ShownUnit; language: 'greek' | 'english' }[];
  inPlace: ReadonlySet<number>;
  dropped: ReadonlySet<number>;
  replace: ReadonlyMap<number, Placement>;
  tail: ReadonlyMap<number, readonly Placement[]>;
  startPut: readonly Placement[];
}

const NO_PLAN: VariantPlan = { marked: new Set(), after: new Map(), start: [], inPlace: new Set(), dropped: new Set(), replace: new Map(), tail: new Map(), startPut: [] };

function planVariants(verse: Verse, view: ReaderView, woven: WovenVerse | null, variants: readonly ShownUnit[] | undefined, chosen: readonly ChosenUnit[] | undefined): VariantPlan {
  if (!variants?.length && !chosen?.length) return NO_PLAN;
  const marked = new Set<number>();
  const inPlace = new Set<number>();
  const dropped = new Set<number>();
  const replace = new Map<number, Placement>();
  const tail = new Map<number, Placement[]>();
  const startPut: Placement[] = [];
  const after = new Map<number, { shown: ShownUnit; language: 'greek' | 'english' }[]>();
  const start: { shown: ShownUnit; language: 'greek' | 'english' }[] = [];
  const put = (at: number, item: { shown: ShownUnit; language: 'greek' | 'english' }) => after.set(at, [...(after.get(at) ?? []), item]);
  if (view === 'greek') {
    for (const shown of variants ?? []) {
      if (shown.chosen === undefined) shown.unit.w.forEach((i) => marked.add(i));
      put(Math.max(...shown.unit.w), { shown, language: 'greek' });
    }
    for (const c of chosen ?? []) {
      const last = Math.max(...c.unit.w);
      c.unit.w.forEach((i) => i !== last && dropped.add(i));
      replace.set(last, { chosen: c, kind: 'greek', first: '', last: '' });
    }
    return { marked, after, start, inPlace, dropped, replace, tail, startPut };
  }
  const order = drawnOrder(verse, woven);
  const held = new Map<number, number>();
  verse.e.forEach((chunk, i) => chunk.g.forEach((g) => held.set(g, i)));
  const chunksOf = (w: readonly number[]): number[] => [...new Set(w.flatMap((g) => (held.has(g) ? [held.get(g) as number] : [])))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const beforeOf = (w: readonly number[]): number | undefined => [...held.keys()].filter((g) => g < Math.min(...w)).sort((a, b) => b - a)[0];
  const languageOf = (chunks: readonly number[]): 'greek' | 'english' => (woven && chunks.every((c) => woven[c]) ? 'greek' : 'english');
  for (const shown of variants ?? []) {
    const isChosen = shown.chosen !== undefined;
    const chunks = chunksOf(shown.unit.w);
    if (chunks.length) {
      if (!isChosen) chunks.forEach((c) => marked.add(c));
      put(chunks[chunks.length - 1], { shown, language: languageOf(chunks) });
      continue;
    }
    const before = beforeOf(shown.unit.w);
    if (before === undefined) start.push({ shown, language: 'english' });
    else {
      const chunk = held.get(before) as number;
      // the words are folded into the English of the word before them ('was reigning in' holds ἐπὶ, 'I hope' holds δὲ): whether a reading leaves them out or changes them, that chunk is the one to dot (mw-9ji6ek0.30, .35)
      if (!isChosen) marked.add(chunk);
      put(chunk, { shown, language: 'english' });
    }
  }
  for (const c of chosen ?? []) {
    const chunks = chunksOf(c.unit.w);
    if (chunks.length) {
      const language = languageOf(chunks);
      if (language === 'english' && c.sameEnglish) {
        chunks.forEach((k) => inPlace.add(k));
        continue;
      }
      const last = chunks[chunks.length - 1];
      chunks.forEach((k) => k !== last && dropped.add(k));
      replace.set(last, { chosen: c, kind: language, first: chunkText(verse, woven, chunks[0]), last: chunkText(verse, woven, last) });
      continue;
    }
    const before = beforeOf(c.unit.w);
    const placement: Placement = { chosen: c, kind: 'english', first: '', last: '' };
    if (before === undefined) {
      if (c.omitted || !c.sameEnglish) startPut.push(placement);
    } else {
      const chunk = held.get(before) as number;
      if (c.omitted || !c.sameEnglish) tail.set(chunk, [...(tail.get(chunk) ?? []), placement]);
      else inPlace.add(chunk);
    }
  }
  return { marked, after, start, inPlace, dropped, replace, tail, startPut };
}

/** How a marked word is drawn: the verse card of a Review question shows the form asked (mw-5r3p30.652). */
const MARKED = 'font-bold underline decoration-2 underline-offset-4';

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not) in the order the weave lays them out
 * (the English order, or with the Weave's Order Greek the Greek one, mw-5r3p30.250). `marked` are indices into `verse.g` drawn marked (data-marked; in the English view
 * the chunk that stands for one); `still` draws the words as plain text for a verse shown on a card, where a tap has nothing to open. */
export function VerseText({ verse, view, source = 'grc', woven, onLook, marked, still, variants, onVariant, chosen }: Pick<VerseProps, 'verse' | 'view' | 'source' | 'woven' | 'onLook' | 'variants' | 'onVariant' | 'chosen'> & { marked?: ReadonlySet<number>; still?: boolean }) {
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
  const plan = still ? NO_PLAN : planVariants(verse, view, woven, variants, chosen);
  const bracesAt = (items: readonly { shown: ShownUnit; language: 'greek' | 'english' }[] | undefined): Drawn[] =>
    (items ?? []).map(({ shown, language }) => ({ node: <VariantBrace key={`v${variants?.indexOf(shown) ?? 0}`} shown={shown} language={language} onOpen={onVariant} onWord={(word, reading) => lookVariant(word, reading, language)} onSay={say} /> }));
  const plain = (nodes: ReactNode[]): Drawn[] => nodes.map((node) => ({ node }));
  // a reading laid in place (mw-9ji6ek0.24): its Greek words, each a Tap that opens its card; its English words, each a Tap that opens the Greek of the reading; or the ⸆ of a reading that leaves them out
  const inPlaceOf = (p: Placement, key: string): Drawn => {
    const c = p.chosen;
    const label = variantLabel([chipOf(c.code)]);
    const reading = { greek: c.alt.text, english: c.english, g: c.alt.g };
    const omission = (bare: boolean) => (
      <Fragment key={key}>
        <span role="img" aria-label="left out" data-chosen="" data-chosen-omitted="" className="font-sans text-[0.8em] text-accent">
          {OMISSION_MARK}
        </span>
        {bare ? null : ' '}
      </Fragment>
    );
    if (c.omitted) return { run: 'chosen', node: omission };
    if (p.kind === 'greek') {
      const words = chosenWords(verse, c);
      const greekFace = view === 'greek' ? '' : `${face} text-accent`;
      return {
        run: 'chosen',
        node: (bare: boolean) => (
          <Fragment key={key}>
            {words.map((w, k) => (
              <Tap key={k} bare={bare && k === words.length - 1} still={still} data-chosen="" {...own} dir={ownDir} className={`${greekFace} ${TAP_PAD}`} onTap={() => { const lookup = variantLookup(verse, w.t, reading, 'greek', label); if (lookup) onLook(lookup); }} onLongPress={() => say(w.t, ownSpeech)}>
                {w.t}
              </Tap>
            ))}
          </Fragment>
        ),
      };
    }
    const tokens = chosenEnglish(c, p.first, p.last).split(/\s+/).filter(Boolean);
    return {
      run: 'chosen',
      node: (bare: boolean) => (
        <Fragment key={key}>
          {tokens.map((token, k) => (
            <Tap
              key={k}
              bare={bare && k === tokens.length - 1}
              still={still}
              dir={chunkDir}
              data-chosen=""
              className={TAP_PAD}
              onTap={() => { const lookup = variantLookup(verse, token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), reading, 'english', label); if (lookup) onLook(lookup); }}
              onLongPress={() => say(token, 'english')}
            >
              {token}
            </Tap>
          ))}
        </Fragment>
      ),
    };
  };
  const placements = (list: readonly Placement[] | undefined, key: string): Drawn[] => (list ?? []).map((p, k) => inPlaceOf(p, `${key}-${k}`));
  return (
    <span data-text>
      {underRuns(view === 'greek'
        ? verse.g.flatMap((w, i): Drawn[] => {
            // a reading laid in place stands for the unit's words: the last of them is where it is drawn, the others are not (mw-9ji6ek0.24)
            if (plan.dropped.has(i)) return bracesAt(plan.after.get(i));
            const placed = plan.replace.get(i);
            if (placed) return [inPlaceOf(placed, `c${i}`), ...bracesAt(plan.after.get(i))];
            return [
              {
                run: plan.marked.has(i) ? 'variant' : undefined,
                node: (bare: boolean) => (
                  <Tap key={i} bare={bare} still={still} data-word={String(i)} data-marked={marked?.has(i) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} className={`${TAP_PAD} ${marked?.has(i) ? MARKED : ''}`} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, ownSpeech)}>
                    {w.t}
                  </Tap>
                ),
              },
              ...bracesAt(plan.after.get(i)),
            ];
          })
        : [-2, ...drawnOrder(verse, woven), -1].flatMap((i): Drawn[] => {
            if (i === -2) return [...placements(plan.startPut, 'start'), ...bracesAt(plan.start)];
            if (i < 0) return plain(strays.end.map(strayWord));
            const braces = [...placements(plan.tail.get(i), `t${i}`), ...bracesAt(plan.after.get(i))];
            const before = plain((strays.before.get(i) ?? []).map(strayWord));
            // a chunk a reading laid in place replaces is not drawn; the last of them is where the reading stands
            if (plan.dropped.has(i)) return [...before, ...braces];
            const placed = plan.replace.get(i);
            if (placed) return [...before, inPlaceOf(placed, `c${i}`), ...braces];
            const run = plan.marked.has(i) ? ('variant' as const) : plan.inPlace.has(i) ? ('chosen' as const) : undefined;
            const kept = plan.inPlace.has(i) ? '' : undefined;
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
                <span key={i} data-chunk={String(i)} data-woven="" data-marked={isMarked(c) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} data-chosen={kept} data-learning={weft.learning ? '' : undefined} {...own} dir={ownDir} className={`${face} text-accent ${isMarked(c) ? MARKED : ''}`}>
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
                data-chosen={kept}
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
              <Tap key={i} bare={bare} still={still} dir={chunkDir} data-chunk={String(i)} data-marked={isMarked(c) ? '' : undefined} data-variant={plan.marked.has(i) ? '' : undefined} data-chosen={kept} className={`${TAP_PAD} ${isMarked(c) ? `${MARKED} text-accent` : ''}`} onTap={(e) => lookEnglish(c, e)} onLongPress={() => say(c.t, 'english')}>
                {c.s ? <SuppliedText chunk={c} /> : c.t}
              </Tap>
            ) }, ...braces];
          }))}
    </span>
  );
}
