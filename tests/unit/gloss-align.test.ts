// tests/unit/gloss-align.test.ts — the per-word English an example row shows (mw-5r3p30.360): the chunk the MSB aligns to a word, WITHOUT the words the
// translators supplied beside it that belong to its neighbours ('touched with' for ἐψηλάφησαν: 'with' is for 'our hands'; 'this is' for περί).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bareEnglish, loadChapter, type Chapter, type GreekWord } from '../../src/data/chapter';
import { exampleGloss, exampleMeaning, ideaExamples, wordEnglish, type IdeaExample } from '../../src/data/grammar/ideaSheet';
import { LADDER } from '../../src/data/grammar/ladder';
import { stubChapterFetch } from '../support/chapter-fetch';
import { isGreekBook } from '../support/data-books';

let john: Chapter;

beforeAll(async () => {
  stubChapterFetch();
  john = await loadChapter('1jn', 1);
});

const wordAt = (chapter: Chapter, verse: number, form: string): GreekWord => {
  const word = chapter.verses.find((v) => v.n === verse)?.g.find((w) => w.t === form);
  if (!word) throw new Error(`no ${form} in verse ${verse}`);
  return word;
};
const idea = (id: string) => {
  const found = LADDER.find((i) => i.id === id);
  if (!found) throw new Error(`no idea ${id}`);
  return found;
};
const exampleOf = (chapter: Chapter, verse: number, form: string): IdeaExample => ({ word: wordAt(chapter, verse, form), chapter, verse, reference: `${chapter.book} ${chapter.chapter}:${verse}`, parts: [] });

describe('the example rows of 1 John 1:1 (the Rho and Phi sheets)', () => {
  it('the Rho sheet glosses περὶ "about", not the supplied "this is"', () => {
    const rho = ideaExamples('letter-rho', [john], 1).find((e) => e.word.t === 'περὶ');
    expect(rho).toBeDefined();
    expect(['about', 'concerning']).toContain(exampleGloss(idea('letter-rho'), rho!));
  });

  it('the Phi sheet glosses ἐψηλάφησαν "touched", not "touched with"', () => {
    const phi = ideaExamples('letter-phi', [john], 1).find((e) => e.word.t === 'ἐψηλάφησαν');
    expect(phi).toBeDefined();
    expect(['touched', 'handled']).toContain(exampleGloss(idea('letter-phi'), phi!));
  });

  it('the Grammar sheet\'s meaning says the same', () => {
    expect(exampleMeaning(john, 1, wordAt(john, 1, 'ἐψηλάφησαν'))).toBe('touched');
    expect(['about', 'concerning', 'περί: about']).toContain(exampleMeaning(john, 1, wordAt(john, 1, 'περὶ')));
  });

  it('keeps the rows that were right: ἀρχῆς "the beginning", ἑωράκαμεν "we have seen", χεῖρες "hands"', () => {
    expect(exampleGloss(idea('letter-rho'), exampleOf(john, 1, 'ἀρχῆς'))).toBe('the beginning');
    expect(exampleGloss(idea('letter-rho'), exampleOf(john, 1, 'ἑωράκαμεν'))).toBe('we have seen');
    expect(exampleGloss(idea('letter-rho'), exampleOf(john, 1, 'χεῖρες'))).toBe('hands');
  });
});

// The sweep: every chapter Lampas holds, every Greek word whose chunk renders it alone. The check reads the chunk's `s` list straight from the file
// and flags a shown English that begins or ends with a word the translators supplied (an article in front is the one allowance) or that is only
// supplied words; it is the same fault as 'touched with' and 'this is' wherever it sits.
describe('the per-word English of every chapter', () => {
  const DATA = join(process.cwd(), 'public/data');
  const books = readdirSync(DATA).filter((b) => /^[0-9a-z]+$/.test(b) && b !== 'ladder' && isGreekBook(b) && statSync(join(DATA, b)).isDirectory());

  const leaks = (chapter: Chapter): { verse: number; word: string; shown: string }[] => {
    const found: { verse: number; word: string; shown: string }[] = [];
    for (const v of chapter.verses) {
      for (const w of v.g) {
        const chunk = w.e === undefined ? undefined : v.e[w.e];
        if (!chunk || chunk.g.length !== 1 || !Array.isArray(chunk.s) || !chunk.s.length) continue;
        // the chunk's words (a mark on its own is none) with whether the translators supplied each, positions as `s` counts them
        const all = chunk.t.split(/\s+/).filter(Boolean);
        const words = all.flatMap((text, i) => (/[\p{L}\p{N}]/u.test(text) ? [{ text: bareEnglish(text), supplied: chunk.s!.includes(i) }] : []));
        const shown = wordEnglish(chapter, v.n, w);
        if (!shown) continue; // nothing of its own: the row falls back to the dictionary gloss
        // the shown words are a stretch of the chunk's whose first and last word the translators did not supply (an article in front is the one allowance);
        // each word is compared without the marks at its ends, as the row shows it (bareEnglish, mw-5r3p30.265)
        const bare = bareEnglish;
        const own = shown.split(' ').map(bare);
        const sound = words.some((_, i) => {
          const stretch = words.slice(i, i + own.length);
          if (stretch.length !== own.length || stretch.some((x, k) => bare(x.text) !== own[k])) return false;
          return (!stretch[0].supplied || /^(the|a|an)$/i.test(stretch[0].text)) && !stretch[stretch.length - 1].supplied;
        });
        if (!sound) found.push({ verse: v.n, word: w.t, shown });
      }
    }
    return found;
  };

  it('holds every book of the New Testament', () => {
    expect(books).toHaveLength(27);
  });

  it('never shows a word a neighbour needs: no gloss starts or ends with a supplied word, anywhere in the 27 books', () => {
    const bad: string[] = [];
    let words = 0;
    for (const book of books) {
      for (const file of readdirSync(join(DATA, book))) {
        const chapter = JSON.parse(readFileSync(join(DATA, book, file), 'utf8')) as Chapter;
        for (const v of chapter.verses) words += v.g.length;
        for (const l of leaks(chapter)) bad.push(`${book} ${chapter.chapter}:${l.verse} ${l.word} → ${l.shown}`);
      }
    }
    expect(words).toBeGreaterThan(130000);
    expect(bad).toEqual([]);
  });

  it('does find the fault where it was seen, on the raw chunk: 1 John 1:1 has two supplied edges', () => {
    const verse = john.verses.find((v) => v.n === 1)!;
    const raw = (form: string) => verse.e[wordAt(john, 1, form).e!];
    expect(raw('περὶ').s).toEqual([0, 1]);
    expect(raw('ἐψηλάφησαν').s).toEqual([1]);
  });
});
