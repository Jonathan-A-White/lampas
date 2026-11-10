// tests/unit/lxx-quiz-form.test.ts — the Quick test and Review show, speak and ask about a Septuagint word's form without Swete's mark (mw-u2w5klk.339, was .315): the Gen 1 fixture's 'γῆν.' is 'γῆν'.
// A New Testament form is as it was. The form is cardForm's (src/reader/septuagint.ts), the one stripper.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { Word } from '../../src/data/db';
import { askAbout, buildQuestion, mulberry32, type Distractor } from '../../src/data/quiz';
import { questionsOf } from '../../src/data/quizWords';

const chapterOf = (path: string): Chapter => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const genesis = chapterOf('tests/fixtures/data-lxx/gen/1.json');
const romans = chapterOf('public/data/rom/8.json');

const word = (lemma: string, gloss: string): Word => ({ lemma, lang: 'grc', lemmas: [lemma], gloss, lesson: 1, state: 'learning', since: 0 });
const pool: Distractor[] = [
  { lemma: 'x', gloss: 'one', pos: 'Noun' },
  { lemma: 'y', gloss: 'two', pos: 'Noun' },
  { lemma: 'z', gloss: 'three', pos: 'Noun' },
];

describe('the Quick test question of a Septuagint word', () => {
  // γῆ stands in Gen 1 as 'γῆν.', 'γῆ' and 'γῆς' ...; the fixture's marked form is the one asked
  const only: Chapter = { ...genesis, verses: genesis.verses.filter((v) => v.n === 1).map((v) => ({ ...v, g: v.g.filter((w) => w.t === 'γῆν.') })) };

  it('shows the form without the mark', () => {
    expect(only.verses[0].g.map((w) => w.t)).toEqual(['γῆν.']);
    const q = buildQuestion(word('γῆ', 'earth'), pool, only, mulberry32(1));
    expect(q.form).toBe('γῆν');
    expect(q.reference).toBe('Genesis 1:1');
  });

  it('asks the tutor about the form without the mark', () => {
    const q = buildQuestion(word('γῆ', 'earth'), pool, only, mulberry32(1));
    expect(askAbout(q, { book: 'gen', chapter: 1, verse: 1 }).text).toBe('What does γῆν mean in Genesis 1:1, and why does the verse use that form?');
  });

  it('is the same on the Review path (questionsOf)', async () => {
    const [q] = await questionsOf([word('γῆ', 'earth')], [word('γῆ', 'earth')], mulberry32(1), { grc: Promise.resolve(only) });
    expect(q.form).toBe('γῆν');
  });
});

describe('the question of a New Testament word', () => {
  it('shows the form as the chapter has it', () => {
    const q = buildQuestion({ ...word('ἀγαπάω', 'to love'), lemmas: ['ἀγαπάω'] }, pool, romans, mulberry32(1));
    const forms = romans.verses.flatMap((v) => v.g).filter((w) => w.l === 'ἀγαπάω').map((w) => w.t);
    expect(forms.length).toBeGreaterThan(0);
    expect(forms).toContain(q.form);
  });

  it('Romans 8:1 gives its κατάκριμα exactly as printed', () => {
    const one: Chapter = { ...romans, verses: romans.verses.filter((v) => v.n === 1) };
    const printed = one.verses[0].g.find((w) => w.l === 'κατάκριμα')?.t;
    expect(printed).toBeDefined();
    expect(buildQuestion({ ...word('κατάκριμα', 'condemnation'), lemmas: ['κατάκριμα'] }, pool, one, mulberry32(1)).form).toBe(printed);
  });
});
