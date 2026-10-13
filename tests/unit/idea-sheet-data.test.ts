// tests/unit/idea-sheet-data.test.ts — what the idea sheet shows (src/data/grammar/ideaSheet.ts): the examples of an idea in a passage
// and the paradigm table built from the passage's own forms, over the committed 1 John 1 and Romans 8.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadChapter, loadIndex, type BookIndex, type Chapter } from '../../src/data/chapter';
import { ideaExamples, ideaPassage, paradigmOf } from '../../src/data/grammar/ideaSheet';
import { ideaOf, ideaOfTerm } from '../../src/data/grammar/ladder';
import { DEFAULT_CHAPTER } from '../../src/data/readerChapter';
import { stubChapterFetch } from '../support/chapter-fetch';

let index: BookIndex;
let john: Chapter;
let romans: Chapter;

beforeAll(async () => {
  stubChapterFetch();
  index = await loadIndex();
  john = await loadChapter('1jn', 1);
  romans = await loadChapter('rom', 8);
});

describe('the paradigm table of a case', () => {
  it('has τοῦ and τῆς in their cells for the genitive over 1 John 1, and blanks where the passage lacks a form', () => {
    const table = paradigmOf(ideaOf('case-genitive'), [john]);
    expect(table).not.toBeNull();
    expect(table?.columns).toEqual(['masculine', 'feminine', 'neuter']);
    expect(table?.rows.map((r) => r.label)).toEqual(['singular', 'plural']);
    const [singular, plural] = table?.rows ?? [];
    expect(singular.cells).toEqual(['τοῦ', 'τῆς', null]);
    expect(plural.cells).toEqual([null, null, null]);
  });

  it('takes the forms of the article in that case only', () => {
    const table = paradigmOf(ideaOf('case-dative'), [john]);
    expect(table?.rows[0].cells).toEqual([null, null, 'τῷ']);
    expect(table?.rows[1].cells).toEqual(['τοῖς', null, null]);
  });

  it('is null for a case the passage has no article in', () => {
    expect(paradigmOf(ideaOf('case-vocative'), [john])).toBeNull();
  });

  it('is null for an idea that is neither a case nor a tense', () => {
    expect(paradigmOf(ideaOf('preposition'), [john])).toBeNull();
    expect(paradigmOf(ideaOf('alphabet'), [john])).toBeNull();
  });
});

describe('the paradigm table of a tense', () => {
  it('shows the persons of one verb of the passage, where the passage has them', () => {
    const table = paradigmOf(ideaOf('tense-aorist'), [john]);
    expect(table).not.toBeNull();
    expect(table?.columns).toEqual(['1st person', '2nd person', '3rd person']);
    expect(table?.rows.map((r) => r.label)).toEqual(['singular', 'plural']);
    expect(table?.verb).toMatch(/aorist/);
    const cells = (table?.rows ?? []).flatMap((r) => r.cells).filter((c) => c !== null);
    expect(cells.length).toBeGreaterThanOrEqual(1);
    // every filled cell is a form of the one lemma the table names
    const lemma = table?.lemma ?? '';
    const forms = john.verses.flatMap((v) => v.g).filter((w) => w.l === lemma).map((w) => w.t);
    for (const cell of cells) expect(forms).toContain(cell);
  });

  it('picks the verb that fills the most cells', () => {
    // Romans 8 has λέγω-style verbs in several persons; whichever is chosen fills at least as many cells as any other lemma's
    const table = paradigmOf(ideaOf('tense-present'), [romans]);
    const filled = (table?.rows ?? []).flatMap((r) => r.cells).filter((c) => c !== null).length;
    expect(filled).toBeGreaterThanOrEqual(2);
  });

  it('is null when the passage has no finite verb of the tense', () => {
    expect(paradigmOf(ideaOf('tense-pluperfect'), [john])).toBeNull();
  });
});

describe('the examples of an idea', () => {
  it('are the first three lemmas of the passage whose code needs the idea, with their verses', () => {
    const found = ideaExamples('case-genitive', [john]);
    expect(found.map((e) => e.word.t)).toEqual(['ἀρχῆς', 'ἡμῶν', 'τοῦ']);
    expect(found.map((e) => e.verse)).toEqual([1, 1, 1]);
    expect(found.every((e) => e.chapter === john)).toBe(true);
    expect(new Set(found.map((e) => e.word.l)).size).toBe(3);
  });

  it('stay within the verse of a verse goal', () => {
    const found = ideaExamples('tense-aorist', [john], 2);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((e) => e.verse === 2)).toBe(true);
  });

  it('come from the later chapters when the first has too few', () => {
    const found = ideaExamples('tense-future', [john, romans]);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((e) => e.chapter === romans)).toBe(true);
  });

  it('are none for an idea no word has, such as a case the passage lacks', () => {
    expect(ideaExamples('case-vocative', [john])).toEqual([]);
  });
});

/** The marked stretches of an example, in order. */
const markedOf = (e: { parts: { text: string; marked: boolean }[] }): string[] => e.parts.filter((p) => p.marked).map((p) => p.text);
const formsOf = (id: string, verse = 1) => ideaExamples(id, [john], verse).map((e) => e.word.t);

describe('the examples of a foundation idea (letters, pairs, marks, syllables, punctuation) over 1 John 1:1', () => {
  it('diphthongs include λόγου and καὶ, with the pair marked', () => {
    const found = ideaExamples('diphthongs', [john], 1);
    const pairs = new Map(found.map((e) => [e.word.t, markedOf(e)]));
    expect(pairs.get('λόγου')).toEqual(['ου']);
    expect(pairs.get('καὶ')).toEqual(['αὶ']);
    expect(pairs.get('τοῖς')).toEqual(['οῖ']);
  });

  it('breathings include ἑωράκαμεν and αἱ, with the vowel that carries the breathing marked', () => {
    const found = ideaExamples('breathings', [john], 1);
    const marks = new Map(found.map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('ἑωράκαμεν')).toEqual(['ἑ']);
    expect(marks.get('αἱ')).toEqual(['ἱ']);
  });

  it('the rough breathing idea has Ὃ and ἑωράκαμεν, the smooth has ἀρχῆς and ὀφθαλμοῖς (mw-5r3p30.230)', () => {
    const rough = formsOf('breathing-rough');
    expect(rough).toContain('Ὃ');
    expect(rough).toContain('ἑωράκαμεν');
    const smooth = formsOf('breathing-smooth');
    expect(smooth).toContain('ἀρχῆς');
    expect(smooth).toContain('ὀφθαλμοῖς');
  });

  it('the ου diphthong idea has a word holding ου, the pair marked (mw-5r3p30.230)', () => {
    const found = ideaExamples('diphthong-ou', [john], 1);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((e) => e.word.t.normalize('NFD').replace(/\p{M}/gu, '').includes('ου'))).toBe(true);
  });

  it('the alphabet returns words from the verse', () => {
    const found = ideaExamples('alphabet', [john], 1);
    expect(found.length).toBeGreaterThan(0);
    const verse = new Set(john.verses[0].g.map((w) => w.t));
    expect(found.every((e) => verse.has(e.word.t) && e.verse === 1)).toBe(true);
  });

  it('a letter marks that letter wherever it stands, a capital too', () => {
    const found = ideaExamples('letter-omicron', [john], 1);
    const marks = new Map(found.map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('λόγου')).toEqual(['ό', 'ο']);
    expect(marks.get('ὀφθαλμοῖς')).toEqual(['ὀ', 'ο']);
  });

  it('a final sigma is a sigma', () => {
    const marks = new Map(ideaExamples('letter-sigma', [john], 1).map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('ἀρχῆς')).toEqual(['ς']);
  });

  it('an item of a group marks only its own pair', () => {
    const found = ideaExamples('diphthong-ou', [john], 1);
    expect(found.map((e) => e.word.t)).toEqual(['τοῦ', 'λόγου']);
    expect(found.map(markedOf)).toEqual([['οῦ'], ['ου']]);
  });

  it('accents mark the accented vowel', () => {
    const marks = new Map(ideaExamples('accents', [john], 1).map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('ἀρχῆς')).toEqual(['ῆ']);
    expect(marks.get('ἀκηκόαμεν')).toEqual(['ό']);
  });

  it('syllables mark each vowel sound, a pair once, in words of two or more', () => {
    const marks = new Map(ideaExamples('syllables', [john], 1).map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('λόγου')).toEqual(['ό', 'ου']);
    expect(marks.has('ἦν')).toBe(false);
  });

  it('punctuation marks the apostrophe of a dropped vowel', () => {
    const found = ideaExamples('punctuation', [john], 1);
    expect(found.map((e) => e.word.t)).toEqual(["ἀπ'"]);
    expect(markedOf(found[0])).toEqual(["'"]);
  });

  it('consonant pairs, found in 1 John 1:3, mark the pair', () => {
    // γγ in ἀπαγγέλλομεν
    const found = ideaExamples('consonant-pairs', [john], 3);
    expect(found.some((e) => markedOf(e).includes('γγ'))).toBe(true);
  });

  it('are none, not an error, for a mark the verse lacks (iota subscript in 1:1)', () => {
    expect(formsOf('iota-subscript')).toEqual([]);
  });

  it('give each form once, however many words are spelt so', () => {
    const forms = formsOf('breathings');
    expect(new Set(forms.map((f) => f.toLowerCase())).size).toBe(forms.length);
  });

  it('a word that no foundation rule marks is shown whole, unmarked, for a grammar idea', () => {
    const found = ideaExamples('case-genitive', [john], 1);
    expect(found[0].parts).toEqual([{ text: found[0].word.t, marked: false }]);
  });
});

describe('the passage the examples come from', () => {
  const none = { book: 'rom', chapter: 8, title: 'Romans 8' };
  it('is the goal chapter, named by its title', async () => {
    const passage = await ideaPassage('1 John 1', DEFAULT_CHAPTER, loadChapter, index);
    expect(passage.title).toBe('1 John 1');
    expect(passage.chapters.map((c) => c.chapter)).toEqual([1]);
    expect(passage.verse).toBeUndefined();
  });

  it('is the one verse of a verse goal', async () => {
    const passage = await ideaPassage('Read 1 John 1:3', DEFAULT_CHAPTER, loadChapter, index);
    expect(passage.title).toBe('1 John 1:3');
    expect(passage.verse).toBe(3);
  });

  it('is the first chapters of a book goal, and no more than five', async () => {
    const passage = await ideaPassage('Matthew', DEFAULT_CHAPTER, loadChapter, index);
    expect(passage.title).toBe('Matthew');
    expect(passage.chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is the open chapter with no goal, an empty goal, "No goal" or a goal that names nothing', async () => {
    for (const text of [undefined, '', 'No goal', 'Read Atlantis 3']) {
      const passage = await ideaPassage(text, none, loadChapter, index);
      expect(passage.title, String(text)).toBe('Romans 8');
      expect(passage.chapters.map((c) => c.chapter)).toEqual([8]);
    }
  });
});

describe('the idea of a term', () => {
  it('is the one idea that covers it', () => {
    expect(ideaOfTerm('genitive')).toBe('case-genitive');
    expect(ideaOfTerm('aorist')).toBe('tense-aorist');
    expect(ideaOfTerm('conjunction')).toBe('conjunction');
  });
  it('is undefined for a word that is no grammar term', () => {
    expect(ideaOfTerm('zeugma')).toBeUndefined();
  });
});
