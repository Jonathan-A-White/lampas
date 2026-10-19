// tests/unit/idea-sheet-data.test.ts — what the idea sheet shows (src/data/grammar/ideaSheet.ts): the examples of an idea in a passage, over the
// committed 1 John 1 and Romans 8. (The passage's paradigm table gave way to the card's own table, mw-5r3p30.234: tests/unit/teach-cards.test.ts.)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadChapter, loadIndex, type BookIndex, type Chapter } from '../../src/data/chapter';
import { exampleMeaning, ideaExamples, ideaExamplesFor, ideaPassage, isSoundIdea, wordEnglish } from '../../src/data/grammar/ideaSheet';
import { ideaOfTerm, ideasOf, LADDER } from '../../src/data/grammar/ladder';
import { decodeParse, parseSegments } from '../../src/data/parseCode';
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

describe('the examples of an idea', () => {
  it('are the first three lemmas of the passage whose code needs the idea and that the card can explain, with their verses', () => {
    // ἡμῶν (a pronoun) and τοῦ (the article) are genitives too, but the genitive's card comes before the pronoun and the article (mw-5r3p30.234)
    const found = ideaExamples('case-genitive', [john]);
    expect(found.map((e) => e.word.t)).toEqual(['ἀρχῆς', 'λόγου', 'ζωῆς']);
    expect(found.map((e) => e.verse)).toEqual([1, 1, 1]);
    expect(found.every((e) => e.chapter === john)).toBe(true);
    expect(new Set(found.map((e) => e.word.l)).size).toBe(3);
  });

  it('stay within the verse of a verse goal', () => {
    const found = ideaExamples('tense-aorist', [john], 1);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((e) => e.verse === 1)).toBe(true);
    // 1:2's aorist is ἐφανερώθη, a passive, which the aorist's card cannot explain yet (mw-5r3p30.234)
    expect(ideaExamples('tense-aorist', [john], 2)).toEqual([]);
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

  it('a letter marks that letter wherever it is said alone, a capital too (mw-5r3p30.351: a word with the letter inside a pair is no example)', () => {
    const found = ideaExamples('letter-omicron', [john], 1);
    const marks = new Map(found.map((e) => [e.word.t, markedOf(e)]));
    expect(marks.get('Ὃ')).toEqual(['Ὃ']);
    expect(marks.get('ἀκηκόαμεν')).toEqual(['ό']);
    expect(marks.has('λόγου')).toBe(false);
    expect(marks.has('ὀφθαλμοῖς')).toBe(false);
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

  it('a grammar idea with a table of endings marks the ending it names (mw-5r3p30.234), and one with none shows the word whole', () => {
    const [first] = ideaExamples('case-genitive', [john], 1);
    expect(first.parts).toEqual([
      { text: 'ἀρχ', marked: false },
      { text: 'ῆς', marked: true },
    ]);
    const [verb] = ideaExamples('verb', [john], 1);
    expect(verb.parts).toEqual([{ text: verb.word.t, marked: false }]);
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

describe('the meaning an example shows (mw-5r3p30.237)', () => {
  let johnTwo: Chapter;
  beforeAll(async () => {
    johnTwo = await loadChapter('1jn', 2);
  });
  const wordAt = (chapter: Chapter, verse: number, form: string) => {
    const word = chapter.verses.find((v) => v.n === verse)?.g.find((w) => w.t === form);
    if (!word) throw new Error(`no ${form} in verse ${verse}`);
    return word;
  };

  it('is the English the verse gives the word when the chunk renders that word alone: ταῦτα in 1 John 2:1 is "these things", not "this/he/she/it"', () => {
    const tauta = wordAt(johnTwo, 1, 'ταῦτα');
    expect(exampleMeaning(johnTwo, 1, tauta)).toBe('these things');
  });

  it('keeps the word\'s own English without the verse punctuation that trails it', () => {
    expect(exampleMeaning(johnTwo, 1, wordAt(johnTwo, 1, 'ἁμάρτῃ'))).toBe('does sin');
  });

  it('is the lemma beside its dictionary gloss when the chunk renders more than one Greek word', () => {
    const word = wordAt(johnTwo, 1, 'ταῦτα');
    const verse = johnTwo.verses.find((v) => v.n === 1);
    const shared: Chapter = { ...johnTwo, verses: johnTwo.verses.map((v) => (v === verse ? { ...v, e: v.e.map((c) => (c.g.includes(2) ? { ...c, g: [2, 3] } : c)) } : v)) };
    expect(exampleMeaning(shared, 1, word)).toBe('οὗτος: this/he/she/it');
  });

  it('is the lemma beside its gloss for a word with no English of its own', () => {
    const mh = wordAt(johnTwo, 1, 'μὴ');
    expect(mh.e).toBeUndefined();
    expect(exampleMeaning(johnTwo, 1, mh)).toBe('μή: not');
  });

  it('is "walked" for περιεπάτησεν in 1 John 2:6, the aorist, not "walk" (the MSB table gave the two English words to the wrong Greek verbs)', () => {
    const aorist = wordAt(johnTwo, 6, 'περιεπάτησεν');
    expect(exampleMeaning(johnTwo, 6, aorist)).toBe('walked');
    expect(exampleMeaning(johnTwo, 6, wordAt(johnTwo, 6, 'περιπατεῖν'))).toBe('walk');
  });

  it('has one colon only when the lexicon gloss holds a colon: τηρῇ in 1 John 2:5 is "τηρέω: to keep, observe", not "τηρέω: to keep: observe" (mw-5r3p30.335)', () => {
    const word = wordAt(johnTwo, 5, 'τηρῇ');
    expect(wordEnglish(johnTwo, 5, word)).toBe('');
    const coloned: Chapter = { ...johnTwo, lex: { ...johnTwo.lex, [word.s]: { ...johnTwo.lex[word.s], g: 'to keep: observe' } } };
    const meaning = exampleMeaning(coloned, 5, word);
    expect(meaning.split(':')).toHaveLength(2);
    expect(meaning).toBe('τηρέω: to keep, observe');
  });

  it('reads a chapter kept before the supplied-word list (`s: 1`) without throwing', () => {
    const word = wordAt(johnTwo, 1, 'ταῦτα');
    const old: Chapter = { ...johnTwo, verses: johnTwo.verses.map((v) => ({ ...v, e: v.e.map((c) => ({ ...c, s: 1 as unknown as number[] })) })) };
    expect(exampleMeaning(old, 1, word)).toBe('these things');
  });
});

describe('the examples of an idea in 1 John 2 (mw-5r3p30.240)', () => {
  it("'plural' begins with Τεκνία (2:1), the vocative plural the word sheet links it from", async () => {
    const chapter = await loadChapter('1jn', 2);
    const examples = ideaExamples('number-plural', [chapter]);
    expect(examples[0].word.t).toBe('Τεκνία');
    expect(examples[0].reference).toBe('1 John 2:1');
  });
});

describe('the idea sheet agrees with the word sheet over every parse code of the New Testament', () => {
  it('lists every idea the word sheet links for a code (number, case, gender, person, tense, voice, mood) in ideasOf(code)', () => {
    const dir = join(process.cwd(), 'public', 'data');
    const codes = new Set<string>();
    for (const book of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(join(dir, book.name))) {
        const chapter = JSON.parse(readFileSync(join(dir, book.name, file), 'utf8')) as { parse?: Record<string, string> };
        // ladder/ and the like hold other files than chapters
        for (const code of Object.keys(chapter.parse ?? {})) codes.add(code);
      }
    }
    expect(codes.size).toBeGreaterThan(100);
    const disagreements: string[] = [];
    for (const code of codes) {
      const listed = new Set(ideasOf(code));
      for (const segment of parseSegments(decodeParse(code))) {
        const idea = segment.term ? ideaOfTerm(segment.term) : undefined;
        if (segment.term && (!idea || !listed.has(idea))) disagreements.push(`${code}: ${segment.term} -> ${idea}`);
      }
    }
    expect(disagreements).toEqual([]);
  });
});

describe('the examples of an idea when the goal verse has none (mw-5r3p30.350)', () => {
  const goalOne = async () => ideaPassage('1 John 1:1', DEFAULT_CHAPTER, loadChapter, index);

  it('stay in the goal verse, labelled as it, when the verse has one', async () => {
    const found = await ideaExamplesFor('case-genitive', await goalOne(), loadChapter);
    expect(found.title).toBe('1 John 1:1');
    expect(found.examples.length).toBeGreaterThan(0);
    expect(found.examples.every((e) => e.verse === 1)).toBe(true);
  });

  it('come from the pericope, labelled with its verses, when the verse has none but the heading section does', async () => {
    // 1:1 has no ξ nor ψ, so find an idea the pericope 1:1-4 holds that 1:1 does not
    // (an idea that is not a letter or a sound: those widen until they have four easy words, mw-5r3p30.351)
    const idea = ['tense-future', 'tense-aorist', 'tense-perfect', 'mood-imperative', 'mood-subjunctive', 'voice-passive', 'case-vocative', 'mood-participle']
      .find((id) => ideaExamples(id, [john], 1).length === 0 && ideaExamples(id, [{ ...john, verses: john.verses.filter((v) => v.n <= 4) }]).length > 0);
    expect(idea).toBeDefined();
    const found = await ideaExamplesFor(idea as string, await goalOne(), loadChapter);
    expect(found.title).toBe('1 John 1:1-4');
    expect(found.examples.every((e) => e.verse >= 2 && e.verse <= 4)).toBe(true);
  });

  it('come from the chapter after the pericope, labelled with the chapter', async () => {
    const pericope = { ...john, verses: john.verses.filter((v) => v.n <= 4) };
    const idea = LADDER.find((i) => !isSoundIdea(i.id) && ideaExamples(i.id, [pericope]).length === 0 && ideaExamples(i.id, [john]).length > 0);
    expect(idea).toBeDefined();
    const found = await ideaExamplesFor((idea as { id: string }).id, await goalOne(), loadChapter);
    expect(found.title).toBe('1 John 1');
    expect(found.examples.every((e) => e.verse > 4)).toBe(true);
  });

  it('come from the book last: Xi is nowhere in 1 John 1, and is spelt in the later chapters', async () => {
    const found = await ideaExamplesFor('letter-xi', await goalOne(), loadChapter);
    expect(found.title).toBe('1 John');
    expect(found.examples.length).toBeGreaterThan(0);
    expect(found.examples.every((e) => /[ξΞ]/u.test(e.word.t))).toBe(true);
    expect(found.examples.every((e) => e.chapter.chapter > 1)).toBe(true);
  });

  it('say the search stopped short, not that none was found, when a chapter beyond the goal\'s cannot be loaded (mw-5r3p30.556)', async () => {
    const passage = await goalOne();
    const offline = (book: string, n: number) => (n === 1 ? loadChapter(book, n) : Promise.reject(new Error('offline')));
    for (const idea of ['letter-xi', 'tense-future']) {
      const found = await ideaExamplesFor(idea, passage, offline);
      expect(found.unreached, idea).toBe(true);
      expect(found.examples, idea).toEqual([]);
    }
    // a search that finds its examples before the load that fails is not stopped short
    expect((await ideaExamplesFor('case-genitive', passage, offline)).unreached).toBeUndefined();
  });

  it('are none, under the goal\'s own name, when nothing in the book has the idea', async () => {
    const found = await ideaExamplesFor('case-vocative', await ideaPassage('Jude', DEFAULT_CHAPTER, loadChapter, index), loadChapter);
    expect(found.examples).toEqual([]);
    expect(found.title).toBe('Jude');
  });
});
