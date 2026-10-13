// Marks that change the word and Enclitics (mw-86e9r1.6): the two ladder ideas that teach the pairs a breathing or an accent tells apart (ἡ/ἤ, ὁ/ὅ,
// εἰ/εἶ, ἐν/ἕν, οὐ/οὗ, ἀλλά/ἄλλα, αὐτή/αὕτη, τίς/τις) and the small words that lean on the one before; each is asked as a question that is wrong
// if the mark is ignored, and the accents lesson no longer says the marks need not be told apart.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ENCLITIC_USES, MARK_PAIRS } from '../../src/data/grammar/marks';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { buildIdeaQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { bmaTutor } from '../../src/approaches/bma-tutor';

const nfc = (s: string): string => s.normalize('NFC');
const PLAIN = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const chapterOf = (ref: { book: string; chapter: number }): Chapter => JSON.parse(readFileSync(`public/data/${ref.book}/${ref.chapter}.json`, 'utf8')) as Chapter;
const rom8 = chapterOf({ book: 'rom', chapter: 8 });
/** The words of a verse as the text spells them, no punctuation, in NFC. */
const verseText = (ref: { book: string; chapter: number; verse: number }): string => {
  const verse = chapterOf(ref).verses.find((v) => v.n === ref.verse);
  if (!verse) throw new Error(`No verse ${ref.book} ${ref.chapter}:${ref.verse}`);
  return ` ${verse.g.map((w) => nfc(w.t)).join(' ')} `;
};

describe('the Marks that change the word idea', () => {
  const idea = LADDER.find((i) => i.id === 'marks-change-word');

  it('is on the ladder among the marks, resting on breathings and accents', () => {
    expect(idea).toBeDefined();
    expect(idea!.title).toBe('Marks that change the word');
    expect(idea!.tier).toBe('marks');
    expect(idea!.needs).toEqual(expect.arrayContaining(['breathings', 'accents']));
    for (const need of idea!.needs) expect(ideaOf(need).rung).toBeLessThan(idea!.rung);
  });

  it('names the eight pairs in its lesson', () => {
    expect(MARK_PAIRS).toHaveLength(8);
    for (const pair of MARK_PAIRS) {
      expect(idea!.text, pair.a.word).toContain(pair.a.word);
      expect(idea!.text, pair.b.word).toContain(pair.b.word);
    }
    for (const word of ['ἡ', 'ἤ', 'ὁ', 'ὅ', 'εἰ', 'εἶ', 'ἐν', 'ἕν', 'οὐ', 'οὗ', 'ἀλλά', 'ἄλλα', 'αὐτή', 'αὕτη', 'τίς', 'τις']) {
      expect(MARK_PAIRS.flatMap((p) => [p.a.word, p.b.word]).map(nfc), word).toContain(nfc(word));
    }
  });

  it('gives each word of each pair a real New Testament phrase, found in its verse', () => {
    for (const pair of MARK_PAIRS) {
      for (const w of [pair.a, pair.b]) {
        expect(w.phrase, w.word).toContain(w.inPhrase);
        expect(PLAIN(w.inPhrase), w.word).toBe(PLAIN(w.word));
        expect(verseText(w.ref), `${w.phrase} in ${w.ref.book} ${w.ref.chapter}:${w.ref.verse}`).toContain(` ${nfc(w.phrase)} `);
      }
    }
  });

  it('pairs words that are alike but for their marks', () => {
    for (const pair of MARK_PAIRS) {
      expect(PLAIN(pair.a.word), pair.a.word).toBe(PLAIN(pair.b.word));
      expect(nfc(pair.a.word)).not.toBe(nfc(pair.b.word));
    }
  });

  it('asks a question that is wrong if the mark is ignored: the twin is offered, four different choices, one right', () => {
    const asked = new Set<string>();
    for (let seed = 1; seed <= 120; seed += 1) {
      const q = buildIdeaQuestion(idea!, [rom8], mulberry32(seed));
      expect(q.ideaId).toBe('marks-change-word');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      const twins = q.options.filter((o) => o !== q.right && PLAIN(o) === PLAIN(q.right));
      expect(twins, `${q.right} among ${q.options.join(' ')}`).toHaveLength(1);
      asked.add(q.right);
    }
    expect(asked.size).toBe(16);
  });
});

describe('the Enclitics idea', () => {
  const idea = LADDER.find((i) => i.id === 'enclitics');

  it('is on the ladder among the marks, after Marks that change the word, resting on breathings and accents', () => {
    expect(idea).toBeDefined();
    expect(idea!.title).toBe('Enclitics');
    expect(idea!.tier).toBe('marks');
    expect(idea!.needs).toEqual(expect.arrayContaining(['breathings', 'accents']));
    expect(idea!.rung).toBeGreaterThan(ideaOf('marks-change-word').rung);
  });

  it('names the forms of εἰμί, τις and μου/σου/μοι and says they lean on the word before', () => {
    for (const form of ['εἰμί', 'ἐστιν', 'τις', 'μου', 'σου', 'μοι']) expect(idea!.text, form).toContain(form);
    expect(idea!.text).toMatch(/lean/);
  });

  it('shows real phrases, each found in its verse', () => {
    for (const use of ENCLITIC_USES) {
      expect(use.phrase, use.right).toContain(use.right);
      expect(verseText(use.ref), `${use.phrase} in ${use.ref.book} ${use.ref.chapter}:${use.ref.verse}`).toContain(` ${nfc(use.phrase)} `);
    }
  });

  it('is asked as a question with four different choices, one right, and the questions can be missed', () => {
    const asked = new Set<string>();
    for (let seed = 1; seed <= 80; seed += 1) {
      const q = buildIdeaQuestion(idea!, [rom8], mulberry32(seed));
      expect(q.ideaId).toBe('enclitics');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      asked.add(q.right);
    }
    expect(asked.size).toBeGreaterThan(2);
  });

  it('has a τις/τίς question that offers the other one', () => {
    const uses = ENCLITIC_USES.filter((u) => PLAIN(u.right) === 'τις');
    expect(uses.map((u) => nfc(u.right)).sort()).toEqual(['τίς', 'τις'].map(nfc).sort());
    for (const u of uses) expect(u.others.map(nfc)).toContain(nfc(u.right) === nfc('τις') ? nfc('τίς') : nfc('τις'));
  });
});

describe('the accents lesson', () => {
  const accents = ideaOf('accents');

  it('no longer says the three marks need not be told apart, and says where the marks matter', () => {
    expect(accents.text).not.toMatch(/need not|do not need to tell|not need to tell/);
    expect(accents.text).toMatch(/change/);
    expect(accents.text).toMatch(/lean/);
  });

  it('keeps the stress and the two-sounds advice', () => {
    expect(accents.text).toMatch(/stress/);
    expect(accents.text).toMatch(/two sounds/);
  });
});

describe('where the two ideas are taught', () => {
  it('are in a lesson of BMA Tutor beside the other marks', () => {
    const lessons = bmaTutor.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons));
    const marks = lessons.find((l) => l.ideas.includes('movable-letters'));
    expect(marks!.ideas).toEqual(expect.arrayContaining(['marks-change-word', 'enclitics']));
  });

  it('are rested on by the interrogative and the indefinite pronoun, which turn on τίς and τις', () => {
    expect(ideaOf('pronoun-interrogative').needs).toContain('marks-change-word');
    expect(ideaOf('pronoun-indefinite').needs).toContain('enclitics');
  });
});
