// tests/unit/teach-cards.test.ts — every card of the grammar ladder teaches a total beginner (mw-5r3p30.234, src/data/grammar/teach/): it says what
// the idea is in plain English, how to spot it in Greek (a table where the idea is a set of endings or forms), and takes one New Testament word apart;
// the word is spelt only with letters, sounds and marks the cards below it taught, and no card uses a grammar term before the card that teaches it.
import { describe, expect, it } from 'vitest';
import { loadChapter, loadIndex } from '../../src/data/chapter';
import { foundationOf } from '../../src/data/grammar/inference';
import { LADDER, ideaOf, ideaOfTerm, ideasBelow, type GrammarIdea } from '../../src/data/grammar/ladder';
import { cardTexts, teachOf } from '../../src/data/grammar/teach';
import { GRAMMAR_TERMS } from '../../src/data/parseCode';
import { stubChapterFetch } from '../support/chapter-fetch';

const ids = (prefix: string): string[] => LADDER.filter((i) => i.id.startsWith(prefix) && !i.parent && !i.glyphs).map((i) => i.id);

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

/**
 * Each grammar term and title key word a card might use, with the ideas that teach it (any one of them will do). GRAMMAR_TERMS map to their own
 * idea (ideaOfTerm); the rest are the key words of the ladder's titles and the words the cards teach on the way ('stem', 'ending', 'case' are the
 * noun's; the augment is the imperfect's). An everyday word that is also a term is only a term in a grammar phrase: 'the second vowel' is no
 * second aorist, and 'letter' is the alphabet's word (the 'letter' of the parsing, a letter used as a name, is taught under 'indeclinable').
 */
const KEY_WORDS: [term: string, pattern: RegExp, teachers: string[]][] = [
  ['case', /\bcases?\b/i, ['noun', ...ids('case-')]],
  ['gender', /\bgenders?\b/i, ids('gender-')],
  ['number', /\bnumber\b(?! words?)/i, ['number-singular', 'number-plural']],
  ['person', /\b(?:first|second|third) person\b|\bperson and number\b/i, ids('person-')],
  ['tense', /\btenses?\b/i, ids('tense-')],
  ['voice', /\bvoices?\b/i, ids('voice-')],
  ['mood', /\bmoods?\b/i, ids('mood-')],
  ['pronoun', /\bpronouns?\b/i, ids('pronoun')],
  ['stem', /\bstems?\b/i, ['noun']],
  ['ending', /\bendings?\b/i, ['noun']],
  ['dictionary form', /\bdictionary form\b/i, ['noun']],
  ['subject', /\bsubjects?\b/i, ['case-nominative']],
  ['object', /\bobjects?\b/i, ['case-accusative']],
  ['augment', /\baugment\b/i, ['tense-imperfect']],
  ['reduplication', /\breduplicat\w*/i, ['tense-perfect']],
  ['deponent', /\bdeponents?\b/i, ids('voice-middle-deponent').concat(ids('voice-passive-deponent'))],
  ['enclitic', /\benclitics?\b/i, ['enclitics']],
  ['breathing', /\bbreathings?\b/i, ['breathings']],
  ['accent', /\baccents?\b|\bacute\b|\bgrave\b|\bcircumflex\b/i, ['accents']],
  ['stress', /\bstress(?:ed)?\b/i, ['accents']],
  ['syllable', /\bsyllables?\b/i, ['syllables']],
  ['vowel pair', /\bvowel pairs?\b|\bpairs? of vowels\b|\bdiphthongs?\b/i, ['diphthongs']],
  ['consonant pair', /\bconsonant pairs?\b|\bpairs? of consonants\b/i, ['consonant-pairs']],
  ['iota subscript', /\biota subscript\b|\biota under\b/i, ['iota-subscript']],
  ['punctuation', /\bpunctuation\b|\bapostrophe\b|\bdiaeresis\b|\belision\b/i, ['punctuation']],
  ['movable', /\bmovable\b/i, ['movable-letters']],
  ['compound verb', /\bcompound verbs?\b/i, ['compound-verbs']],
  ['vowel', /\bvowels?\b/i, ['alphabet']],
  ['consonant', /\bconsonants?\b/i, ['alphabet']],
];

/** Everyday words that are GRAMMAR_TERMS, matched only where they are grammar. */
const TERM_PATTERNS: Record<string, RegExp> = {
  letter: /\bletters?\b/i,
  second: /\bsecond (?:aorists?|perfects?|tenses?)\b/i,
  '1st person': /\b(?:1st|first) person\b/i,
  '2nd person': /\b(?:2nd|second) person\b/i,
  '3rd person': /\b(?:3rd|third) person\b/i,
};
const TERM_TEACHERS: Record<string, string[]> = { letter: ['alphabet'] };

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The whole term list, the longest first, so 'middle or passive deponent' is read as one term and not as 'middle' and 'passive'. */
const TERMS: [term: string, pattern: RegExp, teachers: string[]][] = [
  ...GRAMMAR_TERMS.map((term): [string, RegExp, string[]] => [
    term,
    TERM_PATTERNS[term] ?? new RegExp(`(?<![\\w-])${escape(term)}s?(?![\\w-])`, 'i'),
    TERM_TEACHERS[term] ?? [ideaOfTerm(term) as string],
  ]),
  ...KEY_WORDS,
].sort((a, b) => b[0].length - a[0].length);

/** The terms a text uses, each matched stretch taken out once read, so a long term's words are not read again as short ones. */
function termsIn(text: string): [string, string[]][] {
  let rest = text;
  const found: [string, string[]][] = [];
  for (const [term, pattern, teachers] of TERMS) {
    const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
    if (!global.test(rest)) continue;
    found.push([term, teachers]);
    rest = rest.replace(global, ' ');
  }
  return found;
}

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
