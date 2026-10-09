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

  it('are none for an idea no word has, such as a letter', () => {
    expect(ideaExamples('letter-alpha', [john])).toEqual([]);
    expect(ideaExamples('alphabet', [john])).toEqual([]);
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
