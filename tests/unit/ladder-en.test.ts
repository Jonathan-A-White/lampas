// The English reading ladder (mw-neuq78.2): scripts/ladder-en.ts scores every verse's English, as the app shows it, for how hard it is to say.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildLadder, scoreEnglish, syllablesOf } from '../../scripts/ladder-en';
import type { LadderEntry } from '../../scripts/ladder-shared';

describe('syllables of an English word', () => {
  it.each([
    ['Jesus', 2], ['wept', 1], ['the', 1], ['made', 1], ['table', 2], ['walked', 1], ['wanted', 2], ['Zerubbabel', 4],
    ['beautiful', 3], ['Uriah', 3], ['everything', 3], ['loved', 1], ['believe', 2], ['Solomon', 3],
  ])('%s has %i', (word, n) => {
    expect(syllablesOf(word)).toBe(n);
  });
});

describe('the score of a verse', () => {
  it('counts a plain short verse by hand: 2 words, 1 syllable past the first (Jesus), nothing else', () => {
    expect(scoreEnglish('Jesus wept.').score).toBe(2 + 1);
  });

  it('is 0 for nothing to read', () => {
    expect(scoreEnglish('').score).toBe(0);
  });

  it('charges a name or loanword that is not at the start of a sentence, not one that is', () => {
    const plain = scoreEnglish('and the king went up').score;
    expect(scoreEnglish('and Zerubbabel went up').score).toBeGreaterThan(plain);
    const atStart = scoreEnglish('Zerubbabel went up').score;
    const inside = scoreEnglish('then Zerubbabel went up').score;
    // the inside one has one more word (1) and the name's own charge, so more than the word alone
    expect(inside).toBeGreaterThan(atStart + 1);
  });

  it('does not charge the common sacred names mid-sentence', () => {
    expect(scoreEnglish('and God loved the world').why.join(' ')).not.toMatch(/name/);
  });

  it('charges the spellings that break the usual sounds', () => {
    const plain = scoreEnglish('the man was kind').score;
    expect(scoreEnglish('the man thought kind').score).toBeGreaterThan(plain);
    expect(scoreEnglish('the knight was kind').score).toBeGreaterThan(scoreEnglish('the night was kind').score);
    expect(scoreEnglish('the phrase was kind').score).toBeGreaterThan(scoreEnglish('the frase was kind').score);
  });

  it('charges the longest word for each syllable past three', () => {
    expect(scoreEnglish('a unbelievable thing').score).toBeGreaterThan(scoreEnglish('a believable thing').score);
  });

  it('gives at most three short reasons, the heaviest first', () => {
    const { why } = scoreEnglish('and Jesse the father of David the king, and Zerubbabel the father of Abiud');
    expect(why.length).toBeGreaterThan(0);
    expect(why.length).toBeLessThanOrEqual(3);
    for (const reason of why) expect(reason.length).toBeLessThan(40);
  });
});

describe('the English ladder of the whole New Testament', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ladder-en-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const first = join(tmp, 'a', 'en.json');
  const second = join(tmp, 'b', 'en.json');
  const verseCount = (): number => {
    let n = 0;
    const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: { code: string; chapters: number }[] };
    for (const b of index.books) {
      for (let c = 1; c <= b.chapters; c++) n += (JSON.parse(readFileSync(`public/data/${b.code}/${c}.json`, 'utf8')) as { verses: unknown[] }).verses.length;
    }
    return n;
  };
  const load = (): LadderEntry[] => JSON.parse(readFileSync(first, 'utf8')) as LadderEntry[];

  it('lists every verse once, easiest first, and a second run is byte-identical', () => {
    buildLadder('public/data', first);
    buildLadder('public/data', second);
    const text = readFileSync(first, 'utf8');
    expect(text).toBe(readFileSync(second, 'utf8'));
    const ladder = JSON.parse(text) as LadderEntry[];
    expect(ladder).toHaveLength(verseCount());
    expect(new Set(ladder.map((e) => e.ref)).size).toBe(ladder.length);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i].score, ladder[i].ref).toBeGreaterThanOrEqual(ladder[i - 1].score);
    for (const e of ladder) {
      expect(e.why.length).toBeLessThanOrEqual(3);
      expect(e.ref).toMatch(/^[0-9a-z]{3}\.\d+\.\d+$/);
    }
  });

  it("ranks John 11:35 ('Jesus wept.') in the easiest tenth", () => {
    const ladder = load();
    const at = ladder.findIndex((e) => e.ref === 'jhn.11.35');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(ladder.length / 10);
  });

  it("ranks verses of Matthew 1's genealogy in the hardest tenth", () => {
    const ladder = load();
    const from = Math.floor((ladder.length * 9) / 10);
    for (const ref of ['mat.1.8', 'mat.1.13']) {
      const at = ladder.findIndex((e) => e.ref === ref);
      expect(at, ref).toBeGreaterThanOrEqual(from);
    }
  });

  it('breaks a tie by canonical order', () => {
    const ladder = load();
    const books = (JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: { code: string }[] }).books.map((b) => b.code);
    const place = (ref: string): number => {
      const [b, c, v] = ref.split('.');
      return books.indexOf(b) * 1_000_000 + Number(c) * 1000 + Number(v);
    };
    for (let i = 1; i < ladder.length; i++) {
      if (ladder[i].score === ladder[i - 1].score) expect(place(ladder[i].ref), ladder[i].ref).toBeGreaterThan(place(ladder[i - 1].ref));
    }
  });

  it('is what is committed: public/data/ladder/en.json is the output of a fresh run', () => {
    expect(existsSync('public/data/ladder/en.json')).toBe(true);
    expect(readFileSync('public/data/ladder/en.json', 'utf8')).toBe(readFileSync(first, 'utf8'));
  });

  it('is described in docs/reading-ladder.md', () => {
    const doc = readFileSync('docs/reading-ladder.md', 'utf8');
    expect(doc).toContain('public/data/ladder/en.json');
    expect(doc).toContain('scripts/ladder-en.ts');
    expect(doc).toMatch(/## English/);
  });
});
