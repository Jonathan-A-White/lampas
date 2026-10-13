// The reading drill's data half (mw-neuq78.5): which tally calls for a drill, and the practice words of a Greek sound.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MissCount } from '../../src/data/db';
import type { FrequencyEntry } from '../../src/data/frequency';
import { ideaOf } from '../../src/data/grammar/ladder';
import { scoreWords } from '../../src/data/ladderScore';
import { DRILL_WORDS, drillOffer, drillWords, parseReviewId, reviewIdsOf, ruleOf, soundReviewId } from '../../src/data/readingDrill';

const frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyEntry[];
const row = (lang: string, unit: string, count: number): MissCount => ({ lang, unit, count });

describe('drillOffer', () => {
  it('offers nothing for one miss, however many units', () => {
    expect(drillOffer('el', [row('el', 'diphthong-ou', 1), row('el', 'pair-gg', 1)])).toBeNull();
    expect(drillOffer('en', [row('en', 'blessed', 1)])).toBeNull();
    expect(drillOffer('el', [])).toBeNull();
  });

  it('offers the most missed Greek sound with its rule once it was missed in two readings', () => {
    const offer = drillOffer('el', [row('el', 'pair-gg', 2), row('el', 'diphthong-ou', 4), row('en', 'blessed', 5)]);
    expect(offer).toMatchObject({ kind: 'sound', unit: 'diphthong-ou', glyphs: 'ου' });
    expect(offer?.kind === 'sound' && offer.rule).toBe(ruleOf(ideaOf('diphthong-ou')));
    expect(offer?.kind === 'sound' && offer.rule).toMatch(/^ου says oo/);
  });

  it('offers the English words he misread, the most missed first, at most five, once one was missed in two readings', () => {
    const tally = ['a', 'b', 'c', 'd', 'e', 'f'].map((w, i) => row('en', w, i === 0 ? 2 : 1));
    expect(drillOffer('en', tally)).toEqual({ kind: 'words', lang: 'en', words: ['a', 'b', 'c', 'd', 'e'] });
  });

  it('ignores a unit the ladder does not have', () => {
    expect(drillOffer('el', [row('el', 'not-a-sound', 3)])).toBeNull();
  });
});

describe('review ids', () => {
  it('make the unit and its language and read back', () => {
    expect(soundReviewId('el', 'diphthong-ou')).toBe('el:diphthong-ou');
    expect(parseReviewId('en:blessed')).toEqual({ lang: 'en', unit: 'blessed' });
    expect(parseReviewId('nonsense')).toBeUndefined();
    expect(reviewIdsOf({ kind: 'words', lang: 'en', words: ['a', 'b'] })).toEqual(['en:a', 'en:b']);
  });
});

describe('drillWords', () => {
  const bare = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');

  it('gives five different dictionary words that hold the sound, easiest first by the ladder score', () => {
    const words = drillWords(ideaOf('diphthong-ou'), frequency);
    expect(words).toHaveLength(DRILL_WORDS);
    expect(new Set(words.map(bare)).size).toBe(DRILL_WORDS);
    for (const w of words) expect(bare(w)).toContain('ου');
    const scores = words.map((w) => scoreWords([w]).score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });

  it('leaves out names', () => {
    const names = new Set(frequency.filter((e) => e.proper).map((e) => e.lemma));
    for (const id of ['diphthong-ou', 'diphthong-ai', 'pair-gg']) for (const w of drillWords(ideaOf(id), frequency)) expect(names.has(w)).toBe(false);
  });

  it('gives fewer than five when the text has fewer words with the sound', () => {
    expect(drillWords(ideaOf('pair-gks'), frequency).length).toBeLessThan(DRILL_WORDS);
  });

  it('gives nothing for an idea that is not a pair', () => {
    expect(drillWords(ideaOf('alphabet'), frequency)).toEqual([]);
  });
});
