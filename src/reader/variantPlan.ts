// src/reader/variantPlan.ts — where a verse's variant braces stand and which words or chunks a reading laid in place replaces (moved as is from src/reader/VerseText.tsx, mw-5r3p30.866):
// VerseText draws by this plan and src/reader/variantText.ts writes the same plan as plain text for Copy, so the two cannot disagree about what the Reader shows.
import type { Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import type { ChosenUnit } from './chosenReading';
import type { ShownUnit } from './variants';

/** A reading laid in place, as it is drawn: `greek` its words (tagged Greek, each a Tap), `english` its English as the chunks it replaces read (their edge marks kept: `first` and `last`
 * are the English of the first and last drawn chunk). A reading that leaves the words out is drawn as the small ⸆ of either kind. */
export interface Placement {
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
export interface VariantPlan {
  marked: ReadonlySet<number>;
  after: ReadonlyMap<number, readonly { shown: ShownUnit; language: 'greek' | 'english' }[]>;
  start: readonly { shown: ShownUnit; language: 'greek' | 'english' }[];
  inPlace: ReadonlySet<number>;
  dropped: ReadonlySet<number>;
  replace: ReadonlyMap<number, Placement>;
  tail: ReadonlyMap<number, readonly Placement[]>;
  startPut: readonly Placement[];
}

export const NO_PLAN: VariantPlan = { marked: new Set(), after: new Map(), start: [], inPlace: new Set(), dropped: new Set(), replace: new Map(), tail: new Map(), startPut: [] };

export function planVariants(verse: Verse, view: ReaderView, woven: WovenVerse | null, variants: readonly ShownUnit[] | undefined, chosen: readonly ChosenUnit[] | undefined): VariantPlan {
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
