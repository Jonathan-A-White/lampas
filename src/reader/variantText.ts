// src/reader/variantText.ts — a verse as plain text with the variants the Reader draws in it (mw-5r3p30.866): Copy's Text 'As you read it' is what he reads, so a shown unit's brace follows its
// words ('{left out NA}', `braceText` in src/reader/variants.ts, the string VariantBrace draws) and a reading laid in place stands where the Reader lays it. Pure. It walks the same plan VerseText
// draws by (src/reader/variantPlan.ts planVariants), in the same order, so the two agree on where each brace and each reading goes (tests/unit/copy-variants.test.ts draws both and compares).
import type { Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { chosenEnglish, chosenWords, OMISSION_MARK, type ChosenUnit } from './chosenReading';
import { NO_PLAN, planVariants, type Placement } from './variantPlan';
import { braceText, type ShownUnit } from './variants';

/** A reading laid in place as the Reader draws it: its Greek words, its English as the chunks it replaces read, or the small ⸆ of a reading that leaves the words out. */
function placedText(verse: Verse, p: Placement): string {
  if (p.chosen.omitted) return OMISSION_MARK;
  return p.kind === 'greek' ? chosenWords(verse, p.chosen).map((w) => w.t).join(' ') : chosenEnglish(p.chosen, p.first, p.last).trim();
}

const bracesOf = (items: readonly { shown: ShownUnit; language: 'greek' | 'english' }[] | undefined, woven: WovenVerse | null): string[] =>
  (items ?? []).map(({ shown, language }) => braceText(shown, language, woven?.known));

/** The verse as the Reader draws it in `view` with `variants` (the units shown in it) and `chosen` (the units with a reading laid in place), or null when the Reader draws
 * neither (the caller then has the plain text). A woven chunk is the words of its own language, as shownOf in src/copy/format.ts has it. */
export function textWithVariants(
  verse: Verse,
  view: ReaderView,
  woven: WovenVerse | null,
  variants: readonly ShownUnit[] | undefined,
  chosen: readonly ChosenUnit[] | undefined,
): string | null {
  const plan = planVariants(verse, view, woven, variants, chosen);
  if (plan === NO_PLAN) return null;
  const parts: string[] = [];
  if (view === 'greek') {
    verse.g.forEach((w, i) => {
      const placed = plan.replace.get(i);
      if (placed) parts.push(placedText(verse, placed));
      else if (!plan.dropped.has(i)) parts.push(w.t);
      parts.push(...bracesOf(plan.after.get(i), woven));
    });
  } else {
    parts.push(...plan.startPut.map((p) => placedText(verse, p)), ...bracesOf(plan.start, woven));
    for (const i of drawnOrder(verse, woven)) {
      const placed = plan.replace.get(i);
      const weft = woven?.[i];
      if (placed) parts.push(placedText(verse, placed));
      else if (!plan.dropped.has(i)) parts.push(weft ? weft.words.map((w) => w.t).join(' ') : chunkText(verse, woven, i).trim());
      parts.push(...(plan.tail.get(i) ?? []).map((p) => placedText(verse, p)), ...bracesOf(plan.after.get(i), woven));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
