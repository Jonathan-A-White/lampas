// tests/unit/example-gloss-repeat.test.ts — an example row's gloss never repeats itself (mw-5r3p30.263). TBESG writes some entries 'range: chosen'
// ('to see: see'); the idea sheet's breathings lesson, 'Examples from 1 John 1:1', showed ἑωράκαμεν with that whole string where ἀκηκόαμεν showed
// 'to hear'. A row reads one clean gloss: the word's own English in its verse, else the first sense of its dictionary gloss, whatever the source wrote.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadChapter, type Chapter, type GreekWord } from '../../src/data/chapter';
import { exampleGloss, exampleMeaning, type IdeaExample } from '../../src/data/grammar/ideaSheet';
import { LADDER } from '../../src/data/grammar/ladder';
import { stubChapterFetch } from '../support/chapter-fetch';

const breathings = LADDER.find((i) => i.id === 'breathings') ?? LADDER.find((i) => /breathing/.test(i.id));
if (!breathings) throw new Error('no breathings idea');

const exampleOf = (chapter: Chapter, verse: number, word: GreekWord): IdeaExample => ({ word, chapter, verse, reference: `${chapter.book} ${chapter.chapter}:${verse}`, parts: [] });

/** 'X: X' however the two sides are cased or introduced ('to see: see', 'an age: age'). */
const repeats = (gloss: string): boolean => {
  const m = /^([^:]+):\s*([^:]+)$/.exec(gloss);
  const key = (s: string) => s.trim().toLowerCase().replace(/^(?:to|be|a|an|the)\s+/, '');
  return !!m && key(m[1]) === key(m[2]);
};

describe('the example row for ἑωράκαμεν (ὁράω)', () => {
  let john: Chapter;
  beforeAll(async () => {
    stubChapterFetch();
    john = await loadChapter('1jn', 1);
  });

  /** the chapter with ἑωράκαμεν's verse English taken away, so the row has only the dictionary's gloss, as the Governor saw it */
  const withoutOwnEnglish = (lexGloss: string): { chapter: Chapter; word: GreekWord } => {
    const word = { ...john.verses[0].g.find((w) => w.t === 'ἑωράκαμεν')!, e: undefined };
    const chapter: Chapter = {
      ...john,
      lex: { ...john.lex, [word.s]: { ...john.lex[word.s], g: lexGloss } },
      verses: john.verses.map((v) => (v.n === 1 ? { ...v, g: v.g.map((w) => (w.t === word.t ? word : w)) } : v)),
    };
    return { chapter, word };
  };

  it('reads "to see" from the bundled gloss (with its aorist note, mw-bsf54t.12), not "to see: see"', () => {
    const { chapter, word } = withoutOwnEnglish(john.lex.G3708.g);
    expect(exampleGloss(breathings, exampleOf(chapter, 1, word))).toBe('to see (aorist εἶδον)');
  });

  it('reads "to see" even from the raw source form TBESG writes, "to see: see"', () => {
    const { chapter, word } = withoutOwnEnglish('to see: see');
    expect(exampleGloss(breathings, exampleOf(chapter, 1, word))).toBe('to see');
  });

  it('with its own English it reads that, as before', () => {
    const word = john.verses[0].g.find((w) => w.t === 'ἑωράκαμεν')!;
    expect(exampleGloss(breathings, exampleOf(john, 1, word))).toBe('we have seen');
  });
});

describe('the row gloss of every lemma in the bundled data', () => {
  const DATA = join(process.cwd(), 'public/data');
  const books = readdirSync(DATA).filter((b) => /^[0-9a-z]+$/.test(b) && b !== 'ladder' && statSync(join(DATA, b)).isDirectory());

  it('is never of the form "X: X", with its own English or with only the dictionary gloss', () => {
    const found: string[] = [];
    let rows = 0;
    for (const book of books) {
      for (const file of readdirSync(join(DATA, book))) {
        const chapter = JSON.parse(readFileSync(join(DATA, book, file), 'utf8')) as Chapter;
        for (const verse of chapter.verses) {
          for (const w of verse.g) {
            const alone: GreekWord = { ...w, e: undefined };
            for (const word of [w, alone]) {
              rows++;
              const example = exampleOf(chapter, verse.n, word);
              const shown = exampleGloss(breathings, example);
              if (repeats(shown) || shown.includes(':')) found.push(`${book}/${file} ${verse.n} ${w.t}: ${shown}`);
              const meaning = exampleMeaning(chapter, verse.n, word);
              if (repeats(meaning.replace(/^[^:]+:\s*(?=.*:)/u, ''))) found.push(`${book}/${file} ${verse.n} ${w.t} (meaning): ${meaning}`);
            }
          }
        }
      }
    }
    expect(rows).toBeGreaterThan(100000);
    expect(found.slice(0, 20)).toEqual([]);
  });
});
