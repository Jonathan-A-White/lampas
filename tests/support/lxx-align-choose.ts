// tests/support/lxx-align-choose.ts — what the per-book model-pass tests share (story mw-u2w5klk.349.99): tests/unit/lxx-align-choose.test.ts holds the book-agnostic tests and tests/unit/lxx-align-choose-<code>.test.ts
// each book's own, so a pass on one book edits no file of another's. A helper two of them need is here, not copied.
import type { EnglishChunk, Verse } from '../../src/data/chapter';
import { lettersOf, SUPPLIED_FOR_VERB } from '../../scripts/lxx/align';

export const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');
export const aligned = (v: Verse): EnglishChunk[] => v.e.filter((c) => c.y === 'align');
/**
 * How the aligner's own chunks of `now` (the model pass applied) differ from those of `was` (without it), by Greek positions: none, in a verse the model pass left alone. A chunk keeps its
 * positions and confidence; its text may be short of the words Brenton supplies for a verb that the model paired with a Greek word of their own (joinSupplied joins only a chunk with no Greek:
 * "they moved" is "moved" when the model gives "they" a word), and of nothing else.
 */
export const alignedDiffs = (was: Verse, now: Verse): string[] => {
  const out: string[] = [];
  const key = (c: EnglishChunk): string => c.g.join(',');
  // a lead chunk (mw-u2w5klk.274.14) is supplied words paired to the verb's Greek word without joining it, so another chunk holds the same word: it is left out on both sides
  const isLead = (v: Verse, d: EnglishChunk): boolean =>
    d.c === 0.5 && d.t.split(/\s+/).every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w))) && v.e.some((o) => o !== d && o.g.some((k) => d.g.includes(k)));
  const after = new Map(aligned(now).filter((c) => !isLead(now, c)).map((c) => [key(c), c]));
  for (const c of aligned(was).filter((c) => !isLead(was, c))) {
    const d = after.get(key(c));
    if (!d) {
      out.push(`${c.t}|${key(c)}: no longer an aligned chunk`);
      continue;
    }
    after.delete(key(c));
    if (d.c !== c.c) out.push(`${c.t}|${key(c)}: confidence ${c.c} became ${d.c}`);
    const cut = c.t.split(/\s+/).filter(Boolean);
    const rest = d.t.split(/\s+/).filter(Boolean);
    const lead = cut.slice(0, cut.length - rest.length);
    const supplied = lead.every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w)));
    if (c.t !== d.t && !(lead.length > 0 && cut.slice(lead.length).join(' ') === d.t && supplied)) out.push(`${c.t}|${key(c)}: text became ${d.t}`);
  }
  for (const d of after.values()) out.push(`${d.t}|${key(d)}: a new aligned chunk`);
  return out;
};

