// A drill's answer gives a word's meanings in the sweet spot (mw-5r3p30.1000): at most three, the commonest first, each one the MSB's English uses for at
// least SHARE_LINE of the word's uses (measured from the Greek-English alignment in the chapters); where the alignment cannot settle it, TBESG's gloss.
// Only the Quick test's and Review's answer changes: the word card's gloss (lexicon `g`), his seed list and the Hebrew words are as they were.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { recordAnswer } from '../../src/data/repositories/results';
import { SEED_WORDS } from '../../src/data/seed-words';
import type { Word } from '../../src/data/db';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { normaliseLemma } from '../../src/data/lemma';
import { meaningsOf, shareMeaning } from '../../src/data/meanings';
import { buildQuestion, distractorsFor, mulberry32, seedDistractors } from '../../src/data/quiz';
import { MAX_MEANINGS, SHARE_LINE, type DrillReport } from '../../scripts/data/drillAnswers';

const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as LemmaLexicon;
const report = JSON.parse(readFileSync('data/drill-report.json', 'utf8')) as DrillReport;
const NFC = (s: string): string => s.normalize('NFC');
const word = (lemma: string, gloss: string): Word => ({ lemma: NFC(lemma), lang: 'grc', lemmas: [NFC(lemma)], gloss, lesson: 0, state: 'learning', since: 0 });
const answerOf = (lemma: string): string => lexicon[lemma].q ?? lexicon[lemma].g;

describe('the answer of a drill', () => {
  it("gives γυνή as 'woman, wife', and the word card's gloss stays 'woman'", () => {
    expect(answerOf('γυνή')).toBe('woman, wife');
    expect(lexicon['γυνή'].g).toBe('woman');
    const q = buildQuestion(word('γυνή', 'woman'), seedDistractors(), null, mulberry32(1), lexicon);
    expect(q.gloss).toBe('woman, wife');
    expect(q.options).toContain('woman, wife');
  });

  it('gives no answer more than three meanings', () => {
    const over = Object.keys(lexicon).filter((l) => meaningsOf(answerOf(l)).length > MAX_MEANINGS);
    expect(over).toEqual([]);
  });

  it("gives his seed word ἄνθρωπος three meanings at most, though the seed list keeps its five", () => {
    const seed = SEED_WORDS.find((s) => normaliseLemma(s.lemma).headword === 'ἄνθρωπος')!;
    expect(meaningsOf(seed.gloss).length).toBe(5);
    const q = buildQuestion(word('ἄνθρωπος', seed.gloss), seedDistractors(), null, mulberry32(1), lexicon);
    expect(meaningsOf(q.gloss).length).toBeLessThanOrEqual(MAX_MEANINGS);
    expect(q.gloss).toBe(answerOf('ἄνθρωπος'));
  });

  it('leaves a gloss he typed himself as it is', () => {
    const q = buildQuestion(word('γυνή', 'my lady'), seedDistractors(), null, mulberry32(1), lexicon);
    expect(q.gloss).toBe('my lady');
  });

  it('is the question of the same word: the key, and so its progress and schedule, are as before', () => {
    const w = word('γυνή', 'woman');
    const q = buildQuestion(w, seedDistractors(), null, mulberry32(1), lexicon);
    expect(q.lemma).toBe(w.lemma);
    expect(buildQuestion(w, seedDistractors(), null, mulberry32(1)).lemma).toBe(q.lemma);
  });

  it('has a wrong choice that never carries a meaning of the answer', () => {
    // the pool the screens use: the seed's wrong glosses in the same shape as the right one
    const pool = distractorsFor('grc', [], lexicon);
    expect(pool.some((d) => d.gloss !== seedDistractors().find((s) => s.lemma === d.lemma)!.gloss)).toBe(true);
    const bad: string[] = [];
    for (const lemma of Object.keys(lexicon)) {
      for (const seed of [1, 2]) {
        const q = buildQuestion(word(lemma, lexicon[lemma].g), pool, null, mulberry32(seed), lexicon);
        const mine = new Set(meaningsOf(q.gloss).map(shareMeaning));
        for (const option of q.options) if (option !== q.gloss && meaningsOf(option).some((m) => mine.has(shareMeaning(m)))) bad.push(`${lemma}: ${option} / ${q.gloss}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('a word the drill asks with its new answer', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.reviews.clear(), db.words.clear(), db.results.clear()]);
  });
  afterAll(() => db.close());

  it('keeps its row, its gloss, its results and its schedule keyed by the lemma, as before', async () => {
    await db.words.put(word('γυνή', 'woman'));
    const q = buildQuestion(word('γυνή', 'woman'), distractorsFor('grc', [], lexicon), null, mulberry32(1), lexicon);
    expect(q.gloss).toBe('woman, wife');
    await recordAnswer(q.lemma, true, 1000);
    await recordAnswer(q.lemma, true, 2000);
    expect((await db.words.get('γυνή'))?.gloss).toBe('woman');
    expect((await db.words.get('γυνή'))?.state).toBe('solid');
    expect((await db.results.where('lemma').equals('γυνή').toArray()).map((r) => r.right)).toEqual([true, true]);
    expect(await db.reviews.get(['word', 'γυνή'])).toMatchObject({ kind: 'word', id: 'γυνή' });
  });
});

describe('the report of the build', () => {
  it('names the line as one constant, 15 percent, and the cap as three', () => {
    expect(SHARE_LINE).toBe(0.15);
    expect(MAX_MEANINGS).toBe(3);
  });

  it('holds, for every lemma it measured, each meaning a drill answer gives at or over the line', () => {
    const entries = Object.entries(report.lemmas);
    expect(entries.length).toBeGreaterThan(3000);
    for (const [lemma, r] of entries) {
      if (r.source !== 'alignment') continue;
      expect(r.meanings.length, lemma).toBeLessThanOrEqual(MAX_MEANINGS);
      for (const [meaning, uses] of r.meanings) expect(uses / r.uses, `${lemma} ${meaning}`).toBeGreaterThanOrEqual(SHARE_LINE);
      expect(r.answer, lemma).toBe(lexicon[lemma].q ?? lexicon[lemma].g);
    }
  });

  it('has a reason for every hand correction, and the lexicon takes its answer', () => {
    const corrected = Object.entries(report.lemmas).filter(([, r]) => r.source === 'correction');
    expect(corrected.length).toBeGreaterThan(0);
    for (const [lemma, r] of corrected) {
      expect(r.reason, lemma).toBeTruthy();
      expect(lexicon[lemma].q ?? lexicon[lemma].g).toBe(r.answer);
    }
  });
});
