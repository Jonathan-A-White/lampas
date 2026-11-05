// tests/unit/data-build-lxx.test.ts — Lampas Septuagint R2 (mw-u2w5klk.10): scripts/data-build-lxx.ts writes a shipped book's Greek chapters as
// public/data-lxx/<book>/<n>.json (docs/data.md 'The Septuagint data'). The fixtures under tests/fixtures/lxx/ are slices of the pinned sources, never the network:
//   swete-gen-1.csv, swete-psa-22.csv   Swete's verse starts and tokens of Gen 1 and Greek Ps 22 (versification block, a blank line, word block)
//   swete-translit-gen-1.csv            the SBL transliteration of the same lines (eliranwong/LXX-Swete-1930, 03-Swete_SBL_transliterations.csv)
//   annotations-gen-1.tsv               the annotation file of Gen 1: what `npm run lxx:release` writes (derived rows and a model session's choices, tests/fixtures/lxx/choices-gen-1.txt)
//   lxx2012-gen-1.usfm, lxx2012-psa-22.usfm, lxx2012-dan-3.usfm   Brenton's English; tvtms-slice.txt   the verse map; tbesg-gen-1.txt   TBESG rows for Gen 1's lemmas
// Ps 22 has no annotation file of its own: its rows are made here (the same lemma and parsing for every word), because what is tested of it is the join and the verse map.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import type { Chapter } from '../../src/data/chapter';
import { syntheticGenesis } from '../support/lxx-genesis';
import { greekChapterOf, type LxxIndex as AppLxxIndex } from '../../src/data/lxxChapter';
import { LEXICON_FILE, buildLxx, lexiconEntry, writeLxx, type LxxIndex, type LxxInput, type LxxLexiconEntry } from '../../scripts/data-build-lxx';
import { GUESS_BELOW, layerKey, parseAnnotations, parseTranslit, sweteBooks } from '../../scripts/data/lxxChapter';
import { ANNOTATION_HEADER } from '../../scripts/lxx/release';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');
const [genVersification, genWords] = fixture('swete-gen-1.csv').split('\n\n');
const [psaVersification, psaWords] = fixture('swete-psa-22.csv').split('\n\n');

/** Rows for every word of a Swete book: one lemma and parsing, as a layer 2 answer. */
function annotateAll(book: string, lemma = 'λόγος', parsing = 'N-NSM', confidence = 0.9): string {
  const words = sweteBooks(`${genVersification}\n${psaVersification}`, `${genWords}\n${psaWords}`).get(book) ?? [];
  return [ANNOTATION_HEADER, ...words.map((w) => [w.ref, lemma, parsing, '2', confidence.toFixed(2), ''])].map((r) => r.join('\t')).join('\n') + '\n';
}

const LICENCE = readFileSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930'));
const README = readFileSync(join(FIXTURES, 'README-LXX-Swete-1930.md'));

const input = (over: Partial<LxxInput> = {}): LxxInput => ({
  versification: `${genVersification.trimEnd()}\n${psaVersification}`,
  words: `${genWords.trimEnd()}\n${psaWords}`,
  translit: fixture('swete-translit-gen-1.csv'),
  annotations: { gen: fixture('annotations-gen-1.tsv'), psa: annotateAll('psa') },
  usfm: { gen: fixture('lxx2012-gen-1.usfm'), psa: fixture('lxx2012-psa-22.usfm') },
  tvtms: fixture('tvtms-slice.txt'),
  tbesg: fixture('tbesg-gen-1.txt'),
  licence: LICENCE,
  readme: README,
  ...over,
});

const built = buildLxx(input());
const chapter = (path: string): Chapter => JSON.parse(built.files.get(path) ?? 'null') as Chapter;
const gen1 = chapter('gen/1.json');
const psa22 = chapter('psa/22.json');

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-build-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

describe('a Greek chapter in the chapter shape', () => {
  it('writes gen/1.json: lang grc, translation lxx2012, edition swete, 751 words with their lemma, parsing, layer and confidence', () => {
    expect(gen1).toMatchObject({ book: 'Genesis', code: 'gen', chapter: 1, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {} });
    const words = gen1.verses.flatMap((v) => v.g);
    expect(words).toHaveLength(751);
    expect(gen1.verses).toHaveLength(31);
    for (const w of words) {
      expect(w.t).not.toBe('');
      expect(w.tr).not.toBe('');
      expect(w.s).toBe('');
      expect(w.l).not.toBe('');
      expect(w.p).not.toBe('');
      expect(['1', '2', '2a', '3', 'g']).toContain(w.y);
      expect(w.c).toBeGreaterThan(0);
      expect(w.c).toBeLessThanOrEqual(1);
    }
  });

  it("keeps Swete's capitals and brackets in the word, and his transliteration beside it", () => {
    const [first] = gen1.verses[0].g;
    expect(first).toMatchObject({ t: 'ΕΝ', tr: 'en', l: 'ἐν', p: 'PREP', y: '1' });
    expect(gen1.verses.flatMap((v) => v.g).some((w) => w.t.includes('['))).toBe(true);
    // the display form of a token keeps its full stop; the transliteration is the file's
    expect(gen1.verses[0].g.map((w) => w.t).join(' ')).toBe('ΕΝ ΑΡΧΗ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.');
    expect(gen1.verses[0].g[2].tr).toBe('epoiēsen');
  });

  it('puts the English of Gen 1:1 in one chunk that holds every word', () => {
    const one = gen1.verses[0];
    expect(one.e).toEqual([{ t: 'In the beginning God made the heaven and the earth.', g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]);
    expect(one.g.every((w) => w.e === 0)).toBe(true);
    // the fixture's USFM has Gen 1:1-5 only: a verse with no English has no chunk, and its words no `e`
    expect(gen1.verses.slice(0, 5).every((v) => v.e.length === 1 && v.e[0].g.length === v.g.length)).toBe(true);
    expect(gen1.verses.slice(5).every((v) => v.e.length === 0 && v.g.every((w) => w.e === undefined))).toBe(true);
  });

  it('decodes every parsing code a chapter uses into its parse map, once', () => {
    const used = new Set(gen1.verses.flatMap((v) => v.g.map((w) => w.p)));
    expect(new Set(Object.keys(gen1.parse))).toEqual(used);
    expect(gen1.parse['PREP']).toBe('preposition');
    expect(gen1.parse['V-AAI-3S']).toBe('verb, aorist active indicative, 3rd person singular');
  });

  it('names the Lampas verse of each Greek verse, and the verses of a Psalm one number on', () => {
    expect(gen1.verses[0].ref).toEqual({ book: 'gen', chapter: 1, verse: 1 });
    expect(gen1.verses[30].ref).toEqual({ book: 'gen', chapter: 1, verse: 31 });
    expect(psa22.chapter).toBe(22);
    // Swete's Ps 22:1 is the title and the first verse together: Lampas's 23:1
    const one = psa22.verses[0];
    expect(one.n).toBe(1);
    expect(one.ref).toEqual({ book: 'psa', chapter: 23, verse: 1 });
    expect(one.e).toHaveLength(1);
    expect(one.e[0].t).toBe('A Psalm of David. The Lord tends me as a shepherd, and I shall lack nothing.');
    expect(one.g.map((w) => w.t).slice(0, 3)).toEqual(['Ψαλμὸς', 'τῷ', 'Δαυείδ.']);
    expect(psa22.verses[1].ref).toEqual({ book: 'psa', chapter: 23, verse: 2 });
    expect(psa22.verses.map((v) => v.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("marks the words Brenton supplied, counted among the verse's words", () => {
    const five = psa22.verses[4].e[0];
    expect(five.s).toBeDefined();
    const words = five.t.split(/\s+/);
    expect(five.s!.map((i) => words[i])).toEqual(['wine.']);
  });

  it('says ref none for a verse Lampas has no counterpart for, and keeps its English', () => {
    // a made Daniel 3: 23 (a verse in Lampas), 24 (the Song of the Three: none), 91 (Lampas 3:24); Brenton's USFM numbers the last as 3:24
    const rows = (refs: string[]): string => refs.map((r) => `${r}\tλόγος\tN-NSM\t2\t0.90\t`).join('\n');
    const dan = ['Dan.3:23#1', 'Dan.3:24#1', 'Dan.3:91#1'];
    const versification = ['1\tDan.3:23', '2\tDan.3:24', '3\tDan.3:91'].join('\n');
    const words = ['1\tαὐτοί', '2\tεὐλογεῖτε', '3\tἰδού'].join('\n');
    const translit = ['1\tautoi', '2\teulogeite', '3\tidou'].join('\n');
    const out = buildLxx({
      ...input(),
      versification,
      words,
      translit,
      annotations: { dan: `${ANNOTATION_HEADER.join('\t')}\n${rows(dan)}\n` },
      usfm: { dan: fixture('lxx2012-dan-3.usfm') },
    });
    const c = JSON.parse(out.files.get('dan/3.json')!) as Chapter;
    expect(c.verses.map((v) => v.n)).toEqual([23, 24, 91]);
    expect(c.verses.map((v) => v.ref)).toEqual([{ book: 'dan', chapter: 3, verse: 23 }, 'none', { book: 'dan', chapter: 3, verse: 24 }]);
    expect(c.verses[1].e).toEqual([]);
    expect(c.verses[2].e[0].t).toMatch(/\S/);
  });

  it('says ref none for a verse past the end of the Lampas chapter, when the counts are given, and for a book Lampas has none of', () => {
    const counts = { gen: [30], psa: Array.from({ length: 150 }, () => 5) };
    const out = buildLxx(input({ lampasVerses: counts }));
    const c = JSON.parse(out.files.get('gen/1.json')!) as Chapter;
    expect(c.verses[29].ref).toEqual({ book: 'gen', chapter: 1, verse: 30 });
    expect(c.verses[30].ref).toBe('none');
    const p = JSON.parse(out.files.get('psa/22.json')!) as Chapter;
    expect(p.verses[5].ref).toBe('none');
    expect(p.verses[4].ref).toEqual({ book: 'psa', chapter: 23, verse: 5 });
  });

  it('writes the same bytes on a second run', () => {
    const again = buildLxx(input());
    expect([...again.files.keys()]).toEqual([...built.files.keys()]);
    for (const [path, text] of built.files) expect(again.files.get(path)).toBe(text);
  });
});

describe('what the build refuses and what it leaves out', () => {
  it('skips a book with no annotation file, and names it', () => {
    const only = buildLxx(input({ annotations: { gen: fixture('annotations-gen-1.tsv') } }));
    expect(only.shipped).toEqual(['gen']);
    expect(only.skipped).toEqual(['psa']);
    expect([...only.files.keys()].some((p) => p.startsWith('psa/'))).toBe(false);
    expect(only.notes.join('\n')).toContain('skipped, no annotation file: psa');
    expect((JSON.parse(only.files.get('index.json')!) as LxxIndex).books.map((b) => b.code)).toEqual(['gen']);
  });

  it('stops at an annotation row for a ref the text lacks, naming it', () => {
    const extra = `${fixture('annotations-gen-1.tsv')}Gen.1:32#1\tλόγος\tN-NSM\t2\t0.90\t\n`;
    expect(() => buildLxx(input({ annotations: { gen: extra } }))).toThrow(/Gen\.1:32#1.*Swete's text lacks/);
  });

  it('stops at a word with no row, naming it', () => {
    const lines = fixture('annotations-gen-1.tsv').split('\n').filter((l) => !l.startsWith('Gen.1:2#3\t'));
    expect(() => buildLxx(input({ annotations: { gen: lines.join('\n') } }))).toThrow(/Gen\.1:2#3 has no row/);
  });

  it('stops at a word with no transliteration, and at a parsing it cannot put in words', () => {
    const noTranslit = fixture('swete-translit-gen-1.csv').replace(/^1\ten\n/, '1\t\n');
    expect(() => buildLxx(input({ translit: noTranslit }))).toThrow(/Gen\.1:1#1 has no transliteration/);
    const odd = fixture('annotations-gen-1.tsv').replace('Gen.1:1#1\tἐν\tPREP', 'Gen.1:1#1\tἐν\tZZZ');
    expect(() => buildLxx(input({ annotations: { gen: odd } }))).toThrow(/Gen\.1:1#1 has the parsing "ZZZ"/);
  });

  it('reads the annotation file strictly: its header, its layers, a ref given twice', () => {
    const good = fixture('annotations-gen-1.tsv');
    expect(parseAnnotations(good, 'gen').size).toBe(751);
    expect(() => parseAnnotations(good.replace('ref\tlemma', 'ref\tword'), 'gen')).toThrow(/header row/);
    expect(() => parseAnnotations(good.replace('\t1\t0.92', '\t4\t0.92'), 'gen')).toThrow(/layer "4"/);
    expect(() => parseAnnotations(`${good}Gen.1:1#1\tἐν\tPREP\t1\t0.92\t\n`, 'gen')).toThrow(/Gen\.1:1#1 twice/);
  });

  it('gives a word whose confidence is below 0.5 the layer g, whatever layer found it', () => {
    expect(GUESS_BELOW).toBe(0.5);
    const row = { ref: 'Gen.1:1#1', lemma: 'ἐν', parsing: 'PREP', layer: '3', confidence: 0.4 };
    expect(layerKey(row)).toBe('g');
    expect(layerKey({ ...row, confidence: 0.49 })).toBe('g');
    expect(layerKey({ ...row, confidence: 0.5 })).toBe('3');
    expect(layerKey({ ...row, layer: '2a', confidence: 0.85 })).toBe('2a');
    const words = gen1.verses.flatMap((v) => v.g);
    const guesses = words.filter((w) => w.y === 'g');
    expect(guesses.length).toBeGreaterThan(0);
    expect(guesses.every((w) => w.c! < 0.5)).toBe(true);
    expect(words.filter((w) => w.y !== 'g').every((w) => w.c! >= 0.5)).toBe(true);
  });
});

describe('the index and the lexicon', () => {
  const index = JSON.parse(built.files.get('index.json')!) as LxxIndex;

  it('lists the shipped books with their Greek chapters and verses and the Lampas chapter(s) of each', () => {
    expect(index.books.map((b) => b.code)).toEqual(['gen', 'psa']);
    const [gen, psa] = index.books;
    expect(gen).toMatchObject({ code: 'gen', name: 'Genesis', lampas: 'gen', chapters: 1, verses: [31], lampasChapters: [[1]], lang: 'grc' });
    expect(gen.fingerprints).toHaveLength(1);
    expect(gen.fingerprints[0]).toMatch(/^[0-9a-f]{12}$/);
    // the fixture has Greek Ps 22 only: chapters 1-21 are empty
    expect(psa.chapters).toBe(22);
    expect(psa.verses[21]).toBe(6);
    expect(psa.verses.slice(0, 21).every((n) => n === 0)).toBe(true);
    expect(psa.lampasChapters[21]).toEqual([23]);
    expect(psa.fingerprints[0]).toBe('');
  });

  it('names its sources', () => {
    expect(Object.keys(index.sources)).toEqual(['greek', 'transliteration', 'annotations', 'english', 'versification', 'lexicon']);
    expect(index.sources.greek).toMatch(/Swete/);
    expect(index.sources.english).toMatch(/Brenton/);
    expect(index.sources.annotations).toMatch(/MIT/);
  });

  it("has an entry for every distinct lemma of the fixture, with TBESG's gloss", () => {
    const lexicon = JSON.parse(built.files.get(LEXICON_FILE)!) as Record<string, LxxLexiconEntry>;
    const lemmas = new Set([...parseAnnotations(fixture('annotations-gen-1.tsv'), 'gen').values(), ...parseAnnotations(annotateAll('psa'), 'psa').values()].map((r) => r.lemma));
    expect(new Set(Object.keys(lexicon))).toEqual(lemmas);
    expect(lemmas.size).toBe(115);
    for (const lemma of lemmas) expect(lexicon[lemma].g, lemma).not.toBe('');
    expect(lexicon['ἀρχή']).toMatchObject({ g: 'beginning', s: 'G746' });
    expect(lexicon['ἀρχή'].d).not.toBe('');
    expect(lexicon['λόγος'].g).not.toBe('');
  });

  it("looks a lemma of several forms up by each form, and gives one TBESG lacks an empty entry, named", () => {
    const table = new Map<string, LxxLexiconEntry>([['ὕδωρ', { g: 'water', d: 'water', s: 'G5204' }]]);
    expect(lexiconEntry(table, 'ὕδωρ, ὕδατος')?.g).toBe('water');
    expect(lexiconEntry(table, 'ἄλλο')).toBeUndefined();
    const out = buildLxx(input({ annotations: { gen: fixture('annotations-gen-1.tsv'), psa: annotateAll('psa', 'ξξξ') } }));
    expect((JSON.parse(out.files.get(LEXICON_FILE)!) as Record<string, LxxLexiconEntry>)['ξξξ']).toEqual({ g: '', d: '', s: '' });
    expect(out.notes.join('\n')).toContain('TBESG has no entry for 1 lemma: ξξξ');
  });
});

describe('the files', () => {
  it('writes them, a second run writes nothing, and a book that loses its annotation file loses its chapters', () => {
    const dir = tmp();
    const first = writeLxx(input(), dir);
    expect(first).toMatchObject({ chapters: 2, shipped: ['gen', 'psa'], skipped: [] });
    expect(readdirSync(dir).sort()).toEqual(['LICENSE-swete.txt', 'README-swete.md', 'gen', 'index.json', 'lexicon-grc-lxx.json', 'psa']);
    expect(first.written).toBe(6);
    expect(writeLxx(input(), dir).written).toBe(0);
    expect(readFileSync(join(dir, 'gen', '1.json'), 'utf8')).toBe(built.files.get('gen/1.json'));
    writeLxx(input({ annotations: { gen: fixture('annotations-gen-1.tsv') } }), dir);
    expect(existsSync(join(dir, 'psa', '22.json'))).toBe(false);
    expect(existsSync(join(dir, 'gen', '1.json'))).toBe(true);
  });

  it("copies eliranwong's LICENSE and README byte for byte, beside the files", () => {
    const dir = tmp();
    writeLxx(input(), dir);
    expect(readFileSync(join(dir, 'LICENSE-swete.txt')).equals(LICENCE)).toBe(true);
    expect(readFileSync(join(dir, 'README-swete.md')).equals(README)).toBe(true);
    expect(LICENCE.toString('utf8')).toMatch(/GNU GENERAL PUBLIC LICENSE\s+Version 3/);
  });

  it('reads the transliteration file by line, an editor sign having an empty one', () => {
    const t = parseTranslit('1\ten\n2\t\n3\tarchē\n');
    expect(t.get(1)).toBe('en');
    expect(t.get(2)).toBe('');
    expect(t.get(3)).toBe('archē');
  });
});

describe('a book shipped chapter by chapter (mw-u2w5klk.265)', () => {
  const genesis = syntheticGenesis(10);
  const gen = sweteBooks(genesis.versification, genesis.words).get('gen') ?? [];
  const chapterOf = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);
  /** The annotation file of the first chapters of the synthetic Genesis, with the line lxx:release writes first; every word one lemma and parsing. */
  const annotations = (shipped: readonly number[], line = `# shipped chapters: ${shipped[0]}-${shipped[shipped.length - 1]} of 10`): string =>
    [line, ANNOTATION_HEADER.join('\t'), ...gen.filter((w) => shipped.includes(chapterOf(w.ref))).map((w) => [w.ref, 'λόγος', 'N-NSM', '2', '0.90', ''].join('\t'))].join('\n') + '\n';
  const partInput = (text: string): LxxInput => input({ versification: genesis.versification, words: genesis.words, translit: genesis.translit, annotations: { gen: text }, usfm: {} });
  const part = buildLxx(partInput(annotations([1, 2, 3, 4, 5, 6])));
  const partIndex = JSON.parse(part.files.get('index.json')!) as LxxIndex;

  it('writes a chapter file for each shipped chapter and none for the rest', () => {
    const chapters = [...part.files.keys()].filter((p) => p.includes('/')).sort();
    expect(chapters).toEqual([1, 2, 3, 4, 5, 6].map((n) => `gen/${n}.json`));
    expect(part.shipped).toEqual(['gen']);
    expect((JSON.parse(part.files.get('gen/6.json')!) as Chapter).verses.flatMap((v) => v.g)).toHaveLength(genesis.wordsPerChapter);
  });

  it('keeps the index entry’s shape: lampasChapters EMPTY for an unshipped Greek chapter, and gains shipped and the book’s chapter count', () => {
    const [book] = partIndex.books;
    expect(book).toMatchObject({ code: 'gen', name: 'Genesis', lampas: 'gen', chapters: 10, lang: 'grc', shipped: [1, 2, 3, 4, 5, 6] });
    expect(book.lampasChapters).toEqual([[1], [2], [3], [4], [5], [6], [], [], [], []]);
    expect(book.verses.slice(0, 6)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(book.verses).toHaveLength(10);
    expect(book.fingerprints).toHaveLength(10);
    expect(book.fingerprints.slice(0, 6).every((f) => /^[0-9a-f]{12}$/.test(f))).toBe(true);
    expect(book.fingerprints.slice(6)).toEqual(['', '', '', '']);
    expect(Object.keys(book)).toEqual(expect.arrayContaining(['code', 'name', 'chapters', 'verses', 'fingerprints', 'lang', 'lampas', 'lampasChapters', 'shipped']));
  });

  it('is read by today’s greekChapterOf: a shipped chapter answers, an unshipped one answers null', () => {
    const from = partIndex as unknown as AppLxxIndex;
    expect(greekChapterOf(from, 'gen', 3)).toMatchObject({ code: 'gen', chapter: 3 });
    expect(greekChapterOf(from, 'gen', 7)).toBeNull();
    expect(greekChapterOf(from, 'gen', 10)).toBeNull();
  });

  it('puts the lemmas of the shipped chapters in the lexicon, and a second run writes the same bytes', () => {
    const lexicon = JSON.parse(part.files.get(LEXICON_FILE)!) as Record<string, LxxLexiconEntry>;
    expect(Object.keys(lexicon)).toEqual(['λόγος']);
    const again = buildLxx(partInput(annotations([1, 2, 3, 4, 5, 6])));
    expect([...again.files.keys()]).toEqual([...part.files.keys()]);
    for (const [path, text] of part.files) expect(again.files.get(path)).toBe(text);
  });

  it('ships a book with every chapter as it did, shipped holding them all', () => {
    const all = buildLxx(partInput(annotations(Array.from({ length: 10 }, (_, i) => i + 1), '# shipped chapters: all 10')));
    const [book] = (JSON.parse(all.files.get('index.json')!) as LxxIndex).books;
    expect(book.shipped).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(book.lampasChapters.every((c) => c.length > 0)).toBe(true);
  });

  it('writes the chapters of one run into a directory and removes the chapter a later run no longer ships', () => {
    const dir = tmp();
    writeLxx(partInput(annotations([1, 2, 3, 4, 5, 6])), dir);
    expect(existsSync(join(dir, 'gen', '6.json'))).toBe(true);
    writeLxx(partInput(annotations([1, 2, 3])), dir);
    expect(existsSync(join(dir, 'gen', '6.json'))).toBe(false);
    expect(existsSync(join(dir, 'gen', '3.json'))).toBe(true);
  });

  it('stops where the line says chapters the rows do not hold, and where a chapter has some of its rows only', () => {
    expect(() => buildLxx(partInput(annotations([1, 2, 3], '# shipped chapters: 1-4 of 10')))).toThrow(/names chapters 1-4.*rows hold 1-3/);
    const lines = annotations([1, 2]).split('\n').filter((l) => !l.startsWith('Gen.2:3#2\t'));
    expect(() => buildLxx(partInput(lines.join('\n')))).toThrow(/Gen\.2:3#2 has no row/);
  });

  it('reads a file with no line of its own, as before: the chapters its rows hold are shipped', () => {
    const [book] = (JSON.parse(buildLxx(partInput(annotations([1, 2], ''))).files.get('index.json')!) as LxxIndex).books;
    expect(book.shipped).toEqual([1, 2]);
  });

  it('does not hand out a Lampas chapter whose verses are in a Greek chapter that is not shipped (Psalm 116 is Greek Psalms 114 and 115)', () => {
    const section = '$Psa.116:1-116:19\tEnglish KJV\tHebrew\tLatin\tGreek\nOneToOne\tPsa.116:1-9\tPsa.116:1-9\tPsa.114:1-9\tPsa.114:1-9\nOneToOne\tPsa.116:10-19\tPsa.116:10-19\tPsa.115:1-10\tPsa.115:1-10\n';
    const tvtms = fixture('tvtms-slice.txt').replace('#DataEnd(Condensed)', `${section}#DataEnd(Condensed)`);
    const versification = ['1\tPsa.114:1', '3\tPsa.115:1'].join('\n');
    const words = ['1\tἐν', '2\tἐν', '3\tἐν', '4\tἐν'].join('\n');
    const translit = ['1\ten', '2\ten', '3\ten', '4\ten'].join('\n');
    const rows = (refs: string[]): string => [ANNOTATION_HEADER.join('\t'), ...refs.map((r) => `${r}\tἐν\tPREP\t1\t0.95\t`)].join('\n') + '\n';
    const g114 = ['Psa.114:1#1', 'Psa.114:1#2'];
    const g115 = ['Psa.115:1#1', 'Psa.115:1#2'];
    const build = (refs: string[]): LxxIndex['books'][number] =>
      (JSON.parse(buildLxx(input({ versification, words, translit, tvtms, annotations: { psa: rows(refs) }, usfm: {} })).files.get('index.json')!) as LxxIndex).books[0];
    // half of Lampas's Psalm 116 is in each: with one of them not shipped, Psalm 116 is not offered (greekChapterOf would open half a Psalm)
    expect(build(g114).lampasChapters.slice(113)).toEqual([[], []]);
    expect(build(g115).lampasChapters.slice(113)).toEqual([[], []]);
    expect(build([...g114, ...g115]).lampasChapters.slice(113)).toEqual([[116], [116]]);
    expect(build(g114).chapters).toBe(115);
    expect(build(g114).shipped).toEqual([114]);
  });
});

describe('Brenton\u2019s English at a Greek chapter not shipped (mw-u2w5klk.273)', () => {
  const genesis = syntheticGenesis(10);
  const gen = sweteBooks(genesis.versification, genesis.words).get('gen') ?? [];
  const chapterOf = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);
  const annotations =
    ['# shipped chapters: 1-3 of 10', ANNOTATION_HEADER.join('\t'), ...gen.filter((w) => chapterOf(w.ref) <= 3).map((w) => [w.ref, 'λόγος', 'N-NSM', '2', '0.90', ''].join('\t'))].join('\n') + '\n';
  // Brenton's chapters 2 (shipped), 8 (a Greek chapter of Swete's that is not shipped) and 11 (a chapter Swete's Genesis does not have)
  const usfm = ['\\id GEN', '\\c 2', '\\p', '\\v 1 First of two.', '\\c 8', '\\p', '\\v 1 First of eight.', '\\c 11', '\\p', '\\v 1 First of eleven.'].join('\n') + '\n';
  const book = (): string[] => {
    const notes = buildLxx(input({ versification: genesis.versification, words: genesis.words, translit: genesis.translit, annotations: { gen: annotations }, usfm: { gen: usfm } })).notes;
    return notes.filter((n) => n.includes('no Greek verse'));
  };

  it('does not call a Brenton verse unplaced because its Greek chapter is held back: it is Swete\u2019s verse, shipped later', () => {
    const lines = book();
    expect(lines.join('\n')).not.toContain('gen 8:1');
    expect(lines.join('\n')).not.toContain('gen 2:1');
  });

  it('still names a Brenton verse whose Greek verse is in no chapter of Swete\u2019s book', () => {
    expect(book()).toEqual(['gen: LXX2012 verses with no Greek verse to stand at: gen 11:1']);
  });
});

describe('the shipped notice', () => {
  const dir = 'public/data-lxx';

  it("holds eliranwong's licence and README as the pinned commit has them (the fixtures are byte copies of those files)", () => {
    expect(readFileSync(join(dir, 'LICENSE-swete.txt')).equals(LICENCE)).toBe(true);
    expect(readFileSync(join(dir, 'README-swete.md')).equals(README)).toBe(true);
  });

  it('states in README.md that the annotations are MIT and the text beside them is GPL-3.0, and where each is', () => {
    const text = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(text).toMatch(/MIT/);
    expect(text).toMatch(/GPL-3\.0/);
    expect(text).toContain('LICENSE-swete.txt');
    expect(text).toContain('README-swete.md');
    expect(text).toContain('data/lxx/LICENSE');
  });
});
