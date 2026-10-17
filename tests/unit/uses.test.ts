// usesOf (src/data/grammar/uses.ts): what a word is doing in its verse, proved on named verses of 1 John and Romans 8 and walked over every chapter.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { USE_IDS, usesOf, type Use, type UseId } from '../../src/data/grammar/uses';

const chapterOf = (book: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const verseOf = (book: string, chapter: number, n: number): Verse => chapterOf(book, chapter).verses.find((v) => v.n === n)!;
const usesIn = (book: string, chapter: number, n: number): Use[] => usesOf(verseOf(book, chapter, n));
const ofId = (uses: Use[], id: UseId): Use[] => uses.filter((u) => u.id === id);
/** The uses of one id whose words include every index asked for. */
const on = (uses: Use[], id: UseId, ...words: number[]): Use[] => ofId(uses, id).filter((u) => words.every((w) => u.words.includes(w)));

describe('1 John: the clauses and the conditions', () => {
  it('1:3 finds ἵνα with ἔχητε', () => {
    expect(ofId(usesIn('1jn', 1, 3), 'clause-hina').map((u) => u.words)).toEqual([[6, 10]]);
  });

  it('1:6 finds the third condition on ἐὰν εἴπωμεν, and ὅτι with ἔχομεν', () => {
    const uses = usesIn('1jn', 1, 6);
    expect(ofId(uses, 'condition')).toEqual([{ id: 'condition', words: [0, 1], head: 1, detail: 'third' }]);
    expect(ofId(uses, 'clause-hoti')).toEqual([{ id: 'clause-hoti', words: [2, 4], head: 1 }]);
  });

  it('1:6 does not call ποιοῦμεν or περιπατῶμεν hortatory: ἐάν stands before them', () => {
    expect(ofId(usesIn('1jn', 1, 6), 'subjunctive-hortatory')).toEqual([]);
  });

  it('1:9 finds the third condition and ἵνα with ἀφῇ, and no periphrastic in πιστός ἐστιν', () => {
    const uses = usesIn('1jn', 1, 9);
    expect(ofId(uses, 'condition')).toEqual([{ id: 'condition', words: [0, 1], head: 1, detail: 'third' }]);
    expect(ofId(uses, 'clause-hina').map((u) => u.words)).toEqual([[9, 10]]);
    expect(ofId(uses, 'periphrastic')).toEqual([]);
  });

  it('2:1 finds ἵνα with ἁμάρτητε and the third condition on ἐάν τις ἁμάρτῃ', () => {
    const uses = usesIn('1jn', 2, 1);
    expect(ofId(uses, 'clause-hina').map((u) => u.words)).toEqual([[5, 7]]);
    expect(ofId(uses, 'condition')).toEqual([{ id: 'condition', words: [9, 11], head: 11, detail: 'third' }]);
  });

  it('2:1 finds no prohibition in ἵνα μὴ ἁμάρτητε: a negative purpose clause is not a command', () => {
    expect(ofId(usesIn('1jn', 2, 1), 'prohibition')).toEqual([]);
  });
});

describe('Romans 8', () => {
  it('8:1 finds the article standing alone in τοῖς ἐν Χριστῷ Ἰησοῦ', () => {
    expect(ofId(usesIn('rom', 8, 1), 'article-substantival')).toEqual([{ id: 'article-substantival', words: [4, 5, 6, 7], head: 5 }]);
  });

  it('8:3 finds τὸ ... ἀδύνατον standing alone, γάρ second in its clause, and πέμψας as an adverbial participle', () => {
    const uses = usesIn('rom', 8, 3);
    expect(ofId(uses, 'article-substantival')).toEqual([{ id: 'article-substantival', words: [0, 2], head: 2 }]);
    expect(ofId(uses, 'postpositive')).toEqual([{ id: 'postpositive', words: [1] }]);
    expect(ofId(uses, 'participle-adverbial').map((u) => u.words)).toEqual([[16]]);
  });

  it('8:12 finds the articular infinitive τοῦ ... ζῇν and οὖν second in its clause', () => {
    const uses = usesIn('rom', 8, 12);
    expect(ofId(uses, 'infinitive-articular')).toEqual([{ id: 'infinitive-articular', words: [8, 11], head: 11 }]);
    expect(ofId(uses, 'postpositive')).toEqual([{ id: 'postpositive', words: [1] }]);
  });

  it('8:16 finds αὐτὸ τὸ πνεῦμα in agreement with πνεῦμα, and ὅτι with ἐσμέν', () => {
    const uses = usesIn('rom', 8, 16);
    expect(on(uses, 'agreement', 2)[0]).toEqual({ id: 'agreement', words: [0, 1, 2], head: 2 });
    expect(ofId(uses, 'clause-hoti')).toEqual([{ id: 'clause-hoti', words: [7, 8], head: 3 }]);
  });

  it('8:31 finds the first condition on εἰ, though the verse has no verb after it', () => {
    expect(ofId(usesIn('rom', 8, 31), 'condition')).toEqual([{ id: 'condition', words: [5], detail: 'first' }]);
  });

  it('8:38 finds ὅτι with the verb it hangs on, πέπεισμαι, though the clause has no verb of its own here', () => {
    expect(ofId(usesIn('rom', 8, 38), 'clause-hoti')).toEqual([{ id: 'clause-hoti', words: [2], head: 0 }]);
  });

  it('8:38 finds no adverbial participle: the ὅτι clause has no finite verb in this verse', () => {
    expect(ofId(usesIn('rom', 8, 38), 'participle-adverbial')).toEqual([]);
  });
});

// One verse per rule, found in the text. `on` names the words a use must include.
describe('each rule finds its use in a named verse', () => {
  const cases: Array<[UseId, string, number, number, number[], string?]> = [
    ['agreement', 'rom', 12, 3, [3, 4, 5, 6]], // τῆς χάριτος τῆς δοθείσης
    ['article-substantival', 'tit', 3, 15, [7, 8]], // τοὺς φιλοῦντας
    ['article-position', '1ti', 1, 15, [0, 1, 2], 'predicate'], // Πιστὸς ὁ λόγος
    ['article-position', 'mat', 9, 1, [9, 10, 11], 'attributive'], // τὴν ἰδίαν πόλιν
    ['article-position', 'mrk', 1, 27, [12, 13, 14, 15], 'attributive'], // ἡ διδαχὴ ἡ καινή
    ['postpositive', 'luk', 10, 31, [2]], // Κατὰ συγκυρίαν δὲ
    ['postpositive', '1co', 13, 9, [2]], // Ἐκ μέρους δὲ
    ['participle-adverbial', 'mat', 1, 19, [9]], // μὴ θέλων
    ['participle-adverbial', 'act', 5, 5, [0]], // Ἀκούων
    ['genitive-absolute', 'mat', 2, 1, [2, 3]], // Ἰησοῦ γεννηθέντος
    ['genitive-absolute', 'mat', 27, 19, [0, 2]], // Καθημένου αὐτοῦ
    ['periphrastic', 'luk', 4, 44, [1, 2]], // ἦν κηρύσσων
    ['periphrastic', 'act', 8, 1, [2, 3]], // ἦν συνευδοκῶν
    ['infinitive-articular', '1th', 2, 12, [6, 7, 8]], // εἰς τὸ περιπατῆσαι
    ['infinitive-complement', 'rom', 11, 25, [2, 4]], // θέλω ἀγνοεῖν
    ['infinitive-complement', 'rom', 8, 8, [6, 8]], // ἀρέσαι οὐ δύνανται: the infinitive first
    ['subjunctive-hortatory', '1jn', 4, 7, [1]], // ἀγαπῶμεν ἀλλήλους
    ['subjunctive-hortatory', 'heb', 4, 16, [0]], // Προσερχώμεθα
    ['prohibition', 'luk', 1, 13, [6, 7]], // Μὴ φοβοῦ: a present imperative
    ['prohibition', '1pe', 4, 12, [1, 2]], // μὴ ξενίζεσθε
    ['ou-me', 'mat', 24, 34, [3, 4, 5]], // οὐ μὴ παρέλθῃ
    ['condition', 'jhn', 4, 10, [5, 6], 'second'], // Εἰ ᾔδεις ... ἂν
    ['condition', '1co', 16, 22, [0, 3], 'first'], // Εἴ τις οὐ φιλεῖ
    ['condition', 'rom', 8, 11, [0], 'first'], // Εἰ ... τοῦ ἐγείραντος ... οἰκεῖ: a participle on the way is passed
    ['condition', '1jn', 4, 11, [1, 5], 'first'], // εἰ ... ἠγάπησεν: a past verb, but the main clause is in the present
  ];
  it.each(cases)('%s in %s %i:%i', (id, book, chapter, n, words, detail) => {
    const found = on(usesIn(book, chapter, n), id, ...words);
    expect(found.length).toBeGreaterThan(0);
    if (detail) expect(found.some((u) => u.detail === detail)).toBe(true);
  });
});

describe('a verse with no such use finds none', () => {
  // each verse is chosen to tempt the rule, or to have nothing for it
  const none: Array<[UseId, string, number, number]> = [
    ['agreement', '1jn', 4, 19], // Ἡμεῖς ἀγαπῶμεν αὐτόν ὅτι αὐτὸς πρῶτος ἠγάπησεν ἡμᾶς
    ['article-substantival', '1jn', 1, 6],
    ['article-position', '1jn', 1, 6],
    ['postpositive', '1jn', 1, 6],
    ['clause-hoti', '1jn', 1, 9],
    ['clause-hina', '1jn', 1, 6],
    ['participle-adverbial', '1jn', 1, 9],
    ['genitive-absolute', '1jn', 1, 3],
    ['periphrastic', '1jn', 1, 9], // πιστός ἐστιν
    ['infinitive-articular', '1jn', 1, 9],
    ['infinitive-complement', 'rom', 8, 26], // καθὸ δεῖ: no infinitive
    ['subjunctive-hortatory', '1jn', 3, 18], // μὴ ἀγαπῶμεν: after μή
    ['subjunctive-hortatory', '1jn', 4, 19], // ἀγαπῶμεν as an indicative, with no hortatory form
    ['subjunctive-hortatory', 'rom', 8, 37],
    ['prohibition', '1jn', 3, 18], // μὴ with a present subjunctive is no prohibition
    ['ou-me', '1jn', 3, 18], // μή without οὐ
    ['condition', '1jn', 2, 22], // εἰ μή: 'except', no condition
  ];
  it.each(none)('%s in %s %i:%i', (id, book, chapter, n) => {
    expect(ofId(usesIn(book, chapter, n), id)).toEqual([]);
  });
});

describe('every verse of the New Testament', () => {
  it('is walked without a throw, each use naming real words in text order', () => {
    let verses = 0;
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const verse of chapter.verses) {
          verses++;
          for (const use of usesOf(verse)) {
            const where = `${book.name} ${file} ${verse.n} ${use.id}`;
            expect(USE_IDS, where).toContain(use.id);
            expect(use.words.length, where).toBeGreaterThan(0);
            expect(use.words, where).toEqual([...new Set(use.words)].sort((a, b) => a - b));
            for (const w of use.words) expect(Number.isInteger(w) && w >= 0 && w < verse.g.length, where).toBe(true);
            if (use.head !== undefined) expect(Number.isInteger(use.head) && use.head >= 0 && use.head < verse.g.length, where).toBe(true);
          }
        }
      }
    }
    expect(verses).toBeGreaterThan(7000);
  });
});
