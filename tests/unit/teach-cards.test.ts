// tests/unit/teach-cards.test.ts — every card of the grammar ladder teaches a total beginner (mw-5r3p30.234, src/data/grammar/teach/): it says what
// the idea is in plain English, how to spot it in Greek (a table where the idea is a set of endings or forms), and takes one New Testament word apart;
// the word is spelt only with letters, sounds and marks the cards below it taught, and no card uses a grammar term before the card that teaches it.
import { describe, expect, it } from 'vitest';
import { loadChapter, loadIndex } from '../../src/data/chapter';
import { foundationOf } from '../../src/data/grammar/inference';
import { LADDER, ideaOf, ideasBelow, type GrammarIdea } from '../../src/data/grammar/ladder';
import { cardTexts, stepsOf, teachOf } from '../../src/data/grammar/teach';
import { ideaChoice } from '../../src/data/grammar/lessons';
import { DEFAULT_PRONUNCIATION, pronunciationOf } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../support/chapter-fetch';
import { TERMS, ideaIdsStartingWith as ids, termsIn } from '../../src/data/grammar/taughtTerms';

/**
 * The ideas that are a set of endings or forms, so their card has a table: the ones whose title says so, and these. A beginner learns them by
 * seeing them side by side, not by reading about them.
 */
const SETS_OF_FORMS = [
  'diphthongs',
  'consonant-pairs',
  'movable-letters',
  'marks-change-word',
  'enclitics',
  'noun',
  'number-plural',
  'negative',
  ...ids('case-'),
  'article',
  'adjective',
  'comparative',
  'superlative',
  'numeral',
  ...ids('person-'),
  'pronoun-personal',
  'pronoun-demonstrative',
  'pronoun-relative',
  'pronoun-interrogative',
  'pronoun-indefinite',
  'pronoun-reflexive',
  'pronoun-possessive',
  'pronoun-reciprocal',
  'preposition',
  ...ids('preposition-'),
  ...ids('tense-'),
  'voice-middle-or-passive',
  'voice-passive',
  'mood-imperative',
  'mood-subjunctive',
  'mood-infinitive',
  'mood-participle',
  'crasis',
];

const taughtOrSelf = (idea: GrammarIdea): Set<string> => new Set([idea.id, ...ideasBelow(idea.id).map((i) => i.id)]);

/** The group a letter, pair or breathing item belongs to: knowing the group's card is knowing its items (the alphabet's tiles show all 24 letters). */
const groupOf = (id: string): string | undefined => (id.startsWith('letter-') ? 'alphabet' : ideaOf(id).parent);

describe('every card of the ladder', () => {
  for (const idea of LADDER) {
    it(`${idea.id}: says what it is, how to spot it, and works one example`, () => {
      const teach = teachOf(idea.id);
      expect(teach.whatItIs.trim(), 'whatItIs').not.toBe('');
      expect(teach.howToSpot.trim(), 'howToSpot').not.toBe('');
      expect(teach.worked.length, 'worked').toBeGreaterThan(0);
      for (const worked of teach.worked) {
        expect(worked.word.trim()).not.toBe('');
        expect(worked.gloss.trim()).not.toBe('');
        expect(worked.gloss, 'a gloss is one sense').not.toMatch(/\//);
        expect(worked.steps.length, `${worked.word}: steps`).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it('has a table on every idea whose title names endings or forms, and on every idea that is a set of endings or forms', () => {
    const missing = LADDER.filter((i) => /\b(endings?|forms?)\b/i.test(i.title) || SETS_OF_FORMS.includes(i.id)).filter((i) => !teachOf(i.id).table);
    expect(missing.map((i) => i.id)).toEqual([]);
  });

  it('fills every table: a caption, columns, and as many cells in each row as there are columns', () => {
    for (const idea of LADDER) {
      const table = teachOf(idea.id).table;
      if (!table) continue;
      expect(table.caption, idea.id).not.toBe('');
      expect(table.rows.length, idea.id).toBeGreaterThan(0);
      for (const row of table.rows) expect(row.cells, `${idea.id}: ${row.label}`).toHaveLength(table.columns.length);
    }
  });

  it('spells each worked example only with letters, sounds and marks taught at or below the card', () => {
    const untaught: string[] = [];
    for (const idea of LADDER) {
      const taught = taughtOrSelf(idea);
      for (const { word } of teachOf(idea.id).worked) {
        for (const needed of foundationOf(word)) {
          const group = groupOf(needed);
          if (!taught.has(needed) && !(group && taught.has(group))) untaught.push(`${idea.id}: ${word} needs ${needed}`);
        }
      }
    }
    expect(untaught).toEqual([]);
  });
});

describe('a worked example that names its verse', () => {
  it('is a word of that verse, as the text spells it', async () => {
    stubChapterFetch();
    const index = await loadIndex();
    const missing: string[] = [];
    for (const idea of LADDER) {
      for (const worked of teachOf(idea.id).worked) {
        if (!worked.ref) continue;
        const [, name, chapter, verse] = /^(.+) (\d+):(\d+)$/.exec(worked.ref) ?? [];
        const book = index.books.find((b) => b.name === name);
        if (!book) {
          missing.push(`${idea.id}: no book ${worked.ref}`);
          continue;
        }
        const words = (await loadChapter(book.code, Number(chapter))).verses.find((v) => v.n === Number(verse))?.g.map((w) => w.t.normalize('NFC')) ?? [];
        if (!words.includes((worked.say ?? worked.word).normalize('NFC'))) missing.push(`${idea.id}: ${worked.say ?? worked.word} is not in ${worked.ref}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('no term before it is taught', () => {
  it('maps every term to the idea that teaches it', () => {
    for (const [term, , teachers] of TERMS) {
      expect(teachers.length, term).toBeGreaterThan(0);
      for (const id of teachers) expect(() => ideaOf(id), `${term}: ${id}`).not.toThrow();
    }
  });

  it('reads a long term whole: the middle or passive deponent is one term', () => {
    expect(termsIn('a middle or passive deponent verb').map(([t]) => t)).toEqual(['middle or passive deponent', 'verb']);
    expect(termsIn('the second vowel').map(([t]) => t)).toEqual(['vowel']);
  });

  it('uses on each card only the terms of that card and of the cards below it', () => {
    const early: string[] = [];
    for (const idea of LADDER) {
      const taught = taughtOrSelf(idea);
      for (const text of cardTexts(teachOf(idea.id))) {
        for (const [term, teachers] of termsIn(text)) {
          if (!teachers.some((t) => taught.has(t))) early.push(`${idea.id} uses “${term}” (taught by ${teachers.join(' or ')}): ${text.slice(0, 80)}`);
        }
      }
    }
    expect(early).toEqual([]);
  });
});

describe('a worked example that reads a word letter by letter', () => {
  const scheme = pronunciationOf(DEFAULT_PRONUNCIATION);
  /** a letter's sound as the tiles give it, up to the first comma: 'z, as in “zoo”' is 'z' */
  const shortSound = (letter: GrammarIdea): string => ideaChoice(letter, scheme)!.split(',')[0].trim();
  const alphabet = LADDER.filter((i) => i.glyphs && i.id.startsWith('letter-'));

  it('gives each letter its sound with its name, as the tiles do, not only the name', () => {
    const lines: string[] = [];
    for (const idea of LADDER) {
      for (const worked of teachOf(idea.id).worked) {
        const spelled = stepsOf(worked, scheme).find((step) => step.startsWith('Letter by letter:'));
        if (!spelled) continue;
        for (const c of worked.word) {
          const letter = alphabet.find((l) => l.glyphs![1] === c)!;
          const name = letter.title.toLowerCase();
          if (!spelled.includes(`${c} ${name} (${shortSound(letter)})`)) lines.push(`${idea.id}: ${worked.word}: ${c} ${name} has no sound in “${spelled}”`);
        }
      }
    }
    expect(lines).toEqual([]);
  });

  it('reads the worked example of the alphabet as ΖΩΗΣ with Ζ z, Ω o, Η ee and Σ s', () => {
    const [worked] = teachOf('alphabet').worked;
    expect(worked.word).toBe('ΖΩΗΣ');
    expect(stepsOf(worked, scheme)).toContain('Letter by letter: Ζ zeta (z) · Ω omega (o) · Η eta (ee) · Σ sigma (s).');
  });

  it('names the letters only when no pronunciation is chosen', () => {
    const [worked] = teachOf('alphabet').worked;
    expect(stepsOf(worked, null)).toContain('Letter by letter: Ζ zeta · Ω omega · Η eta · Σ sigma.');
  });
});
