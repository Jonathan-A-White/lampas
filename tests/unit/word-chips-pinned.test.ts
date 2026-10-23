// The tutor's word chip for Logos names the first lexicon he pinned (docs/design/library-at-scale.md 3.5, mw-rfjjzd.8), and the first one ticked when none is pinned.
import { describe, expect, it } from 'vitest';
import type { StudyResources } from '../../src/data/repositories';
import { LEXICONS } from '../../src/resources/logos';
import { wordChips } from '../../src/resources/tutorLinks';

const ids = LEXICONS.map((l) => l.id);
const logosChip = (chosen: StudyResources) => wordChips('ἀγάπη', 'G26', chosen).find((c) => c.resource.id === 'logos');

describe('the word chip for Logos', () => {
  it('names the first pinned lexicon, not the first ticked', () => {
    const pinned = ids[5]!;
    const chip = logosChip({ on: ['logos'], options: { logos: JSON.stringify(ids) }, pinnedLexicons: [pinned] });
    expect(chip?.label).toBe(`Open in Logos: ${LEXICONS.find((l) => l.id === pinned)?.name} for ἀγάπη`);
    expect(chip?.tile).toBe(LEXICONS.find((l) => l.id === pinned)?.short);
  });

  it('names the first of two pinned lexicons, whatever order they are given in', () => {
    const chip = logosChip({ on: ['logos'], options: { logos: JSON.stringify(ids) }, pinnedLexicons: [ids[7]!, ids[3]!] });
    expect(chip?.label).toBe(`Open in Logos: ${LEXICONS.find((l) => l.id === ids[3])?.name} for ἀγάπη`);
  });

  it('names BDAG for ἀγάπη when BDAG is the one pinned', () => {
    expect(logosChip({ on: ['logos'], options: { logos: JSON.stringify(ids) }, pinnedLexicons: ['bdag'] })?.label).toBe('Open in Logos: BDAG for ἀγάπη');
  });

  it('names the first ticked when none is pinned', () => {
    const chip = logosChip({ on: ['logos'], options: { logos: JSON.stringify([ids[4], ids[9]]) }, pinnedLexicons: [] });
    expect(chip?.label).toBe(`Open in Logos: ${LEXICONS.find((l) => l.id === ids[4])?.name} for ἀγάπη`);
  });

  it('ignores a pinned lexicon that is not among the ticked', () => {
    const chip = logosChip({ on: ['logos'], options: { logos: JSON.stringify([ids[4]]) }, pinnedLexicons: [ids[9]!] });
    expect(chip?.label).toBe(`Open in Logos: ${LEXICONS.find((l) => l.id === ids[4])?.name} for ἀγάπη`);
  });
});
