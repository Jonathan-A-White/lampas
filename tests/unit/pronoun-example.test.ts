// tests/unit/pronoun-example.test.ts — Review's Example for the pronouns μου, ἡμεῖς and ὑμεῖς (mw-indx1x6.74): the data lists every form of them under the lexicon lemma ἐγώ or σύ, which none of the three
// equals, so each was given no Example. A pronoun is found by its own forms (person, number and case of its parse), and a form of one of the three is never a form of another.
import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { NT_BOOKS } from '../../src/data/books';
import { db, type Word } from '../../src/data/db';
import { lemmaKeyOf, normaliseLemma } from '../../src/data/lemma';
import { formsOf, othersOf } from '../../src/data/quiz';
import { goalOccurrences } from '../../src/data/repositories/reviewExamples';
import { setGoal } from '../../src/data/repositories';
import { SEED_WORDS } from '../../src/data/seed-words';
import { stubChapterFetch } from '../support/chapter-fetch';

afterAll(async () => {
  vi.unstubAllGlobals();
  db.close();
});

beforeEach(async () => {
  stubChapterFetch();
  await db.open();
  await db.settings.clear();
});

const nfc = (s: string) => s.normalize('NFC');
const read = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

const words: Word[] = SEED_WORDS.map((s) => {
  const { headword, lemmas } = normaliseLemma(s.lemma);
  return { lemma: headword, lang: 'grc', lemmas, gloss: s.gloss, lesson: s.lesson, state: 'learning', since: 0 };
});
const pool = words.map((w) => ({ lemma: w.lemma, gloss: w.gloss, pos: '' }));
const word = (lemma: string): Word => words.find((w) => w.lemma === lemma)!;
const others = (w: Word) => othersOf(w, pool);

const THREE = ['μου', 'ἡμεῖς', 'ὑμεῖς'];

describe('Review gives μου, ἡμεῖς and ὑμεῖς an Example from the goal Romans 8', () => {
  it('each has one, a form of its own, and none a form of another of the three', async () => {
    await setGoal('Read Romans 8');
    const found = await goalOccurrences(THREE.map(word), others);
    expect([...found.keys()].sort()).toEqual([...THREE].sort());
    expect(found.get('ἡμεῖς')).toMatchObject({ reference: 'Romans 8:4', form: 'ἡμῖν' });
    expect(found.get('ὑμεῖς')).toMatchObject({ reference: 'Romans 8:9' });
    expect(['Ὑμεῖς', 'ὑμῖν']).toContain(found.get('ὑμεῖς')!.form);
    // μου asks for 'my': Romans 8 has no genitive but the book does, so the Example is a genitive of the book, never με or μοι (mw-indx1x6.100)
    const mine = found.get('μου')!;
    expect(['μου', 'ἐμοῦ']).toContain(nfc(mine.form));
    expect(mine).toMatchObject({ book: 'rom', chapter: 1, verse: 8 });
  });

  it('μου has no Example form με or μοι while the open chapter holds a genitive', () => {
    const rom = read('rom', 1);
    const forms = formsOf(rom, word('μου'), others(word('μου'))).map((o) => nfc(o.form));
    expect(forms.length).toBeGreaterThan(0);
    for (const f of forms) expect(['μου', 'μού', 'ἐμοῦ'], `${f} is not "my"`).toContain(f);
  });

  it('a chapter with no genitive (Romans 8) still gives μου the forms it has, με', () => {
    const forms = formsOf(read('rom', 8), word('μου'), others(word('μου')));
    expect(forms.map((o) => nfc(o.form))).toEqual(['με']);
  });

  it('a form of a plural pronoun is not given to μου, nor a form of μου to a plural', () => {
    const rom = read('rom', 8);
    const forms = (lemma: string) => formsOf(rom, word(lemma), others(word(lemma))).map((o) => nfc(o.form));
    const mine = new Set(forms('μου'));
    expect(mine.size).toBeGreaterThan(0);
    for (const p of ['ἡμεῖς', 'ὑμεῖς']) {
      expect(forms(p).length).toBeGreaterThan(0);
      for (const f of forms(p)) expect(mine.has(f), `${f} is a form of ${p} and of μου`).toBe(false);
    }
    const we = new Set(forms('ἡμεῖς'));
    for (const f of forms('ὑμεῖς')) expect(we.has(f), `${f} is a form of both ἡμεῖς and ὑμεῖς`).toBe(false);
    for (const f of we) expect(f).toMatch(/^ἡμ/i);
    for (const f of forms('ὑμεῖς')) expect(f).toMatch(/^ὑμ/i);
  });

  it('John 1 gives μου its own form (1:15)', async () => {
    await setGoal('Read John 1');
    const found = await goalOccurrences([word('μου')], others);
    expect(found.get('μου')).toMatchObject({ reference: 'John 1:15', form: 'μου' });
  });
});

describe('sweep: μου takes a genitive form wherever the chapter has one (mw-indx1x6.100)', () => {
  const chapters: [string, number][] = NT_BOOKS.flatMap((b) =>
    readdirSync(`public/data/${b.code}`).filter((f) => /^\d+\.json$/.test(f)).map((f): [string, number] => [b.code, parseInt(f, 10)]));

  it('covers every chapter of the New Testament', () => {
    expect(chapters.length).toBe(260);
  });

  it('every chapter that holds a genitive P-1GS gives only genitives as the Example form', () => {
    const mu = word('μου');
    const out = others(mu);
    const bad: string[] = [];
    let withGenitive = 0;
    for (const [b, n] of chapters) {
      const chapter = read(b, n);
      const genitive = (g: Chapter['verses'][number]['g'][number]) => g.p === 'P-1GS' && lemmaKeyOf(g.l) === 'ἐγώ';
      const holds = chapter.verses.some((v) => v.g.some(genitive));
      const forms = formsOf(chapter, mu, out);
      if (holds) {
        withGenitive++;
        const wrong = forms.filter((o) => !chapter.verses.find((v) => v.n === o.verse)!.g.some((g) => genitive(g) && nfc(g.t) === nfc(o.form)));
        if (forms.length === 0 || wrong.length > 0) bad.push(`${chapter.book} ${chapter.chapter}: ${wrong.map((o) => o.form).join(',') || 'none'}`);
      }
    }
    expect(withGenitive).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });
});

describe('sweep: every seed word is found in a chapter that holds one of its forms', () => {
  const chapters: [string, number][] = [['rom', 8], ['jhn', 1], ['phm', 1]];
  // the pronouns whose forms the data lists under the lexicon lemma of the singular I or you: found by the parse's person and number, not by lemma
  const PRONOUN_FORM: Record<string, (p: string, t: string) => boolean> = {
    ἡμεῖς: (p) => /^P-1[NGDA]P$/.test(p),
    ὑμεῖς: (p) => /^P-2[NGDA]P$/.test(p),
    μου: (p) => /^P-1[GDA]S$/.test(p),
  };

  it.each(chapters)('%s %i: a word with a form in the chapter has an Occurrence', async (book, n) => {
    const chapter = read(book, n);
    const lemmasInChapter = new Set(chapter.verses.flatMap((v) => v.g).filter((g) => g.y !== 'g').map((g) => nfc(g.l)));
    await setGoal(`Read ${chapter.book} ${chapter.chapter}`);
    // words that share a lexicon lemma with another seed word are found by the form list; the rest by their own lexicon lemma
    const shared = (w: Word) => w.lemmas.some((l) => words.some((o) => o !== w && o.lemmas.map(nfc).includes(nfc(l))));
    const holds = (w: Word): boolean => {
      const own = PRONOUN_FORM[w.lemma];
      if (own) return chapter.verses.flatMap((v) => v.g).some((g) => own(g.p ?? '', g.t));
      if (shared(w)) return false;
      return w.lemmas.some((l) => lemmasInChapter.has(nfc(l)) || lemmasInChapter.has(lemmaKeyOf(l)));
    };
    const expected = words.filter(holds);
    expect(expected.length).toBeGreaterThan(10);
    const found = await goalOccurrences(expected, others);
    const missing = expected.filter((w) => !found.has(w.lemma)).map((w) => w.lemma);
    expect(missing, `no Example in ${chapter.book} ${chapter.chapter} for`).toEqual([]);
  });
});
