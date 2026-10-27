// tests/unit/teach-cards.test.ts — every card of the grammar ladder teaches a total beginner (mw-5r3p30.234, src/data/grammar/teach/): it says what
// the idea is in plain English, how to spot it in Greek (a table where the idea is a set of endings or forms), and takes one New Testament word apart;
// the word is spelt only with letters, sounds and marks the cards below it taught, and no card uses a grammar term before the card that teaches it.
import { describe, expect, it } from 'vitest';
import { loadChapter, loadIndex } from '../../src/data/chapter';
import { foundationOf } from '../../src/data/grammar/inference';
import { LADDER, ideaOf, ideasBelow, type GrammarIdea } from '../../src/data/grammar/ladder';
import { cardTexts, stepsOf, teachOf } from '../../src/data/grammar/teach';
import { validateDiagram } from '../../src/diagram/validate';
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

describe('a card that draws its idea in a sentence diagram (mw-5r3p30.791)', () => {
  /** the cards that carry one; the other parts of speech are the next story's */
  const DRAWN = ['noun', 'case-nominative', 'case-accusative', 'case-genitive', 'case-dative'];
  const drawn = LADDER.filter((i) => teachOf(i.id).diagram);
  /** a verse's word as the diagram's request strips it (src/diagram/request.ts): no marks at its edges, an elision's apostrophe kept */
  const bare = (t: string) => t.replace(/^[^\p{L}\p{M}\p{N}']+|[^\p{L}\p{M}\p{N}']+$/gu, '').normalize('NFC');

  it('is drawn on the noun and the four cases', () => {
    expect(drawn.map((i) => i.id)).toEqual(expect.arrayContaining(DRAWN));
  });

  it('keeps every word once in its tree, and lights only its own words, at least one', () => {
    for (const idea of drawn) {
      const { diagram, words, lit } = teachOf(idea.id).diagram!;
      expect(validateDiagram(diagram, words.length), idea.id).toEqual({ ok: true });
      expect(lit.length, idea.id).toBeGreaterThan(0);
      for (const i of lit) expect(Number.isInteger(i) && i >= 0 && i < words.length, `${idea.id}: lit ${i}`).toBe(true);
    }
  });

  it('draws in Greek the words of the verse it names, as the text spells them', async () => {
    stubChapterFetch();
    const index = await loadIndex();
    const wrong: string[] = [];
    for (const idea of drawn) {
      const card = teachOf(idea.id).diagram!;
      expect(card.mode, idea.id).toBe('greek');
      const book = index.books.find((b) => b.code === card.verse.book);
      expect(`${book?.name} ${card.verse.chapter}:${card.verse.verse}`, idea.id).toBe(card.reference);
      const verse = (await loadChapter(card.verse.book, card.verse.chapter)).verses.find((v) => v.n === card.verse.verse);
      for (const word of card.words) {
        if (!('word' in word)) {
          wrong.push(`${idea.id}: ${word.text} is not a Greek word`);
          continue;
        }
        const text = verse?.g[word.word]?.t;
        if (text === undefined || bare(text) !== word.text.normalize('NFC')) wrong.push(`${idea.id}: word ${word.word} of ${card.reference} is ${text}, not ${word.text}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('lights the word of its idea: the nominative the subject, the accusative the direct object, the genitive a word that hangs, the dative a word under the verb', () => {
    const litWords = (id: string) => {
      const card = teachOf(id).diagram!;
      return card.lit.map((i) => card.words[i].text);
    };
    const clause = (id: string) => teachOf(id).diagram!.diagram.clauses[0].clause;
    const indexes = (refs: { words: ({ i: number } | { implied: string })[] }) => refs.words.flatMap((r) => ('i' in r ? [r.i] : []));
    expect(teachOf('case-nominative').diagram!.lit).toEqual(indexes(clause('case-nominative').subject));
    const accusative = clause('case-accusative').complement!;
    expect(accusative.kind).toBe('direct-object');
    expect(teachOf('case-accusative').diagram!.lit).toEqual(indexes(accusative.slot));
    expect(litWords('noun').length).toBeGreaterThanOrEqual(2);
    for (const id of ['case-genitive', 'case-dative']) expect(litWords(id), id).toHaveLength(1);
  });

  it('gives its reference among the card\'s texts', () => {
    for (const idea of drawn) expect(cardTexts(teachOf(idea.id))).toContain(teachOf(idea.id).diagram!.reference);
  });
});

describe('the augment card, whose worked example quotes a sentence', () => {
  // mw-svw421.35: it gave ἐθεασάμεθα τὴν δόξαν αὐτοῦ under 1 John 1:1, but that phrase is John 1:14. Other cards quote past their verse too; they are not this story.
  it('quotes it from the verse it names, or names the verse it is from', async () => {
    stubChapterFetch();
    const index = await loadIndex();
    const strip = (w: string) => w.normalize('NFC').toLowerCase().replace(/[^\p{L}]/gu, '');
    const wrong: string[] = [];
    for (const idea of LADDER.filter((i) => i.id === 'augment')) {
      for (const worked of teachOf(idea.id).worked) {
        if (!worked.ref) continue;
        const [, name, chapter, verse] = /^(.+) (\d+):(\d+)$/.exec(worked.ref) ?? [];
        const book = index.books.find((b) => b.name === name);
        expect(book, worked.ref).toBeDefined();
        if (!book) continue;
        const words = ((await loadChapter(book.code, Number(chapter))).verses.find((v) => v.n === Number(verse))?.g ?? []).map((w) => strip(w.t));
        for (const step of worked.steps) {
          // a run of two or more Greek words in a row is a quoted sentence; a step that names another verse (“John 1:14”) is quoting that one
          if (/\b[1-3]? ?[A-Z][a-z]+ \d+:\d+/.test(step)) continue;
          for (const run of step.match(/(?:[\p{Script=Greek}'’]+[,.·;]?\s+)+[\p{Script=Greek}'’]+/gu) ?? []) {
            const quoted = run.split(/\s+/).map(strip);
            const at = words.findIndex((_, i) => quoted.every((q, j) => words[i + j] === q));
            if (at < 0) wrong.push(`${idea.id}: “${run}” is not in ${worked.ref}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
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
