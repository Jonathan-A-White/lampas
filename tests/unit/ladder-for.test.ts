// tests/unit/ladder-for.test.ts — ladderFor(lang) is the one door to a ladder (mw-gdcyf98.9): the Greek ladder unchanged behind it, a Hebrew ladder beside it whose
// every idea id starts 'he-' so a grammar level, a review row and a drill plan never collide with a Greek one; and a Hebrew idea marked known writes its level
// but no review row yet (story l owns the Hebrew card and its drill).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { ALWAYS_NEEDED, LADDER, TIERS, ideasOf, ideasOfWord } from '../../src/data/grammar/ladder';
import { LADDER_LANGS, ladderFor, ladderLangOf } from '../../src/data/grammar/ladders';
import { HEBREW_LADDER, HEBREW_TIERS } from '../../src/data/grammar/hebrew/ladder';
import { teachOf } from '../../src/data/grammar/teach';
import { getLevel, teachIdea } from '../../src/data/repositories/grammarLevels';
import { GRAMMAR_TERMS } from '../../src/data/parseCode';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.meta.clear()]);
});
afterAll(() => db.close());

describe('ladderFor', () => {
  it('names the two languages', () => {
    expect([...LADDER_LANGS]).toEqual(['grc', 'hbo']);
  });

  it('answers for Greek with the Greek ladder as it was: 163 ideas, the alphabet first and the conditions last', () => {
    const grc = ladderFor('grc');
    expect(grc.lang).toBe('grc');
    expect(grc.ideas).toBe(LADDER);
    expect(grc.ideas).toHaveLength(163);
    expect(grc.ideas[0]).toMatchObject({ id: 'alphabet', rung: 1 });
    expect(grc.ideas.at(-1)).toMatchObject({ id: 'condition', rung: 163 });
    expect(grc.tiers).toBe(TIERS);
    expect(grc.terms).toEqual(GRAMMAR_TERMS);
    expect(grc.foundation).toBe(ALWAYS_NEEDED);
    expect(grc.foundationTiers).toEqual(['letters', 'sounds', 'marks']);
    expect(grc.teach['alphabet']).toBe(teachOf('alphabet'));
    expect(Object.keys(grc.teach).length).toBeGreaterThan(100);
    expect(grc.ideasOf('N-GSF')).toEqual(ideasOf('N-GSF'));
    const word = { l: 'λόγος', p: 'N-NSM', t: 'λόγος' };
    expect(grc.ideasOfWord(word)).toEqual(ideasOfWord(word));
    expect(grc.ideaOf('alphabet')).toBe(LADDER[0]);
  });

  it('answers for Hebrew with its own ladder: the provisional tiers and one idea to start, the alphabet', () => {
    const hbo = ladderFor('hbo');
    expect(hbo.lang).toBe('hbo');
    expect(hbo.ideas).toBe(HEBREW_LADDER);
    expect(hbo.tiers).toBe(HEBREW_TIERS);
    expect([...hbo.tiers]).toEqual(['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences']);
    expect(hbo.ideas.map((i) => i.id)).toEqual(['he-alphabet']);
    expect(hbo.ideas[0]).toMatchObject({ id: 'he-alphabet', title: 'The Hebrew alphabet', tier: 'letters', rung: 1, needs: [] });
    expect(Object.keys(hbo.teach)).toEqual(['he-alphabet']);
    expect(hbo.teach['he-alphabet'].worked.length).toBeGreaterThan(0);
    expect(hbo.foundation).toEqual(['he-alphabet']);
    expect(hbo.terms).toEqual([]);
    expect(hbo.ideaOf('he-alphabet')).toBe(HEBREW_LADDER[0]);
    expect(() => hbo.ideaOf('alphabet')).toThrow(/Unknown grammar idea/);
    expect(hbo.ideasOf('anything')).toEqual([]);
    expect(hbo.ideasOfWord({ l: 'אב', p: 'N' })).toEqual([]);
  });

  it('keeps the two apart: every Hebrew idea id starts he- and no Greek one does', () => {
    for (const idea of ladderFor('hbo').ideas) expect(idea.id.startsWith('he-'), idea.id).toBe(true);
    for (const idea of ladderFor('grc').ideas) expect(idea.id.startsWith('he-'), idea.id).toBe(false);
    const greek = new Set(ladderFor('grc').ideas.map((i) => i.id));
    for (const idea of ladderFor('hbo').ideas) expect(greek.has(idea.id), idea.id).toBe(false);
    expect(ladderLangOf('he-alphabet')).toBe('hbo');
    expect(ladderLangOf('alphabet')).toBe('grc');
  });
});

describe('a Hebrew idea marked known', () => {
  it('is written to the grammar levels and schedules no review row yet', async () => {
    const now = Date.UTC(2026, 9, 26, 9, 0, 0);
    expect(await teachIdea('he-alphabet', 'known', now)).toEqual({ status: 'taught' });
    expect(await getLevel('he-alphabet')).toMatchObject({ id: 'he-alphabet', level: 'solid', how: 'sheet' });
    expect(await db.reviews.toArray()).toEqual([]);
  });

  it('still schedules a Greek idea marked known', async () => {
    await teachIdea('case-genitive', 'known', Date.UTC(2026, 9, 26, 9, 0, 0));
    expect((await db.reviews.toArray()).map((r) => r.id)).toEqual(['case-genitive']);
  });
});
