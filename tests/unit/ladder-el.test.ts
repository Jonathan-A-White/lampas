// The Greek reading ladder (mw-neuq78.1): scripts/ladder-el.ts scores every verse for how hard it is to say, not to understand.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildLadder, scoreWords, type LadderEntry } from '../../scripts/ladder-el';

const words = (text: string): string[] => text.split(' ');

describe('the score of a verse', () => {
  it('counts John 11:35 by hand: 4 + 0 + 3 for the words, 3 for their number, 2 for the 4-syllable longest word', () => {
    // Ἐδάκρυσεν: 3 syllables past the first + the cluster κρ = 4; ὁ = 0; Ἰησοῦς: 2 syllables past the first + the digraph ου = 3
    expect(scoreWords(words('Ἐδάκρυσεν ὁ Ἰησοῦς')).score).toBe(12);
  });

  it('is 0 for nothing to read, and a single simple word costs only its number', () => {
    expect(scoreWords([]).score).toBe(0);
    expect(scoreWords(['ὁ']).score).toBe(1);
  });

  it('charges the rare letters, the doubled-g pairs and the diaeresis', () => {
    const plain = scoreWords(['βαλα']).score;
    expect(scoreWords(['βαξα']).score).toBe(plain + 2);
    expect(scoreWords(['βαζα']).score).toBe(plain + 2);
    // γγ is a doubled letter, so only its pair costs; γκ is a cluster as well
    expect(scoreWords(['βαγγα']).score).toBe(plain + 2);
    expect(scoreWords(['βαγκα']).score).toBe(plain + 3);
    expect(scoreWords(['Ἠσαΐας']).score).toBeGreaterThan(scoreWords(['Ἠσαίας']).score);
  });

  it('gives at most three short reasons, the heaviest first', () => {
    const { why } = scoreWords(words('τοῦ Ἀμιναδάβ τοῦ Ἀράμ τοῦ Ἑσρώμ τοῦ Φαρές τοῦ Ἰούδα'));
    expect(why.length).toBeGreaterThan(0);
    expect(why.length).toBeLessThanOrEqual(3);
    for (const reason of why) expect(reason.length).toBeLessThan(40);
  });

  it('puts a short verse of simple syllables before a long genealogy verse', () => {
    const short = scoreWords(words('Ἐδάκρυσεν ὁ Ἰησοῦς')).score;
    const genealogy = scoreWords(words('τοῦ Ἀμιναδάβ τοῦ Ἀράμ τοῦ Ἑσρώμ τοῦ Φαρές τοῦ Ἰούδα')).score;
    expect(short).toBeLessThan(genealogy);
  });
});

describe('the ladder of the whole New Testament', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ladder-el-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const first = join(tmp, 'a', 'el.json');
  const second = join(tmp, 'b', 'el.json');
  const verseCount = (): number => {
    let n = 0;
    const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: { code: string; chapters: number }[] };
    for (const b of index.books) {
      for (let c = 1; c <= b.chapters; c++) n += (JSON.parse(readFileSync(`public/data/${b.code}/${c}.json`, 'utf8')) as { verses: unknown[] }).verses.length;
    }
    return n;
  };

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

  it('ranks John 11:35 before a genealogy verse of Luke 3', () => {
    const ladder = JSON.parse(readFileSync(first, 'utf8')) as LadderEntry[];
    const at = (ref: string): number => ladder.findIndex((e) => e.ref === ref);
    expect(at('jhn.11.35')).toBeGreaterThanOrEqual(0);
    expect(at('luk.3.33')).toBeGreaterThanOrEqual(0);
    expect(at('jhn.11.35')).toBeLessThan(at('luk.3.33'));
    expect(ladder[at('jhn.11.35')].score).toBe(12);
  });

  it('breaks a tie by canonical order', () => {
    const ladder = JSON.parse(readFileSync(first, 'utf8')) as LadderEntry[];
    const books = (JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: { code: string }[] }).books.map((b) => b.code);
    const place = (ref: string): number => {
      const [b, c, v] = ref.split('.');
      return books.indexOf(b) * 1_000_000 + Number(c) * 1000 + Number(v);
    };
    for (let i = 1; i < ladder.length; i++) {
      if (ladder[i].score === ladder[i - 1].score) expect(place(ladder[i].ref), ladder[i].ref).toBeGreaterThan(place(ladder[i - 1].ref));
    }
  });

  it('is what is committed: public/data/ladder/el.json is the output of a fresh run', () => {
    expect(existsSync('public/data/ladder/el.json')).toBe(true);
    expect(readFileSync('public/data/ladder/el.json', 'utf8')).toBe(readFileSync(first, 'utf8'));
  });

  it('is described in docs/reading-ladder.md', () => {
    const doc = readFileSync('docs/reading-ladder.md', 'utf8');
    expect(doc).toContain('npm run ladder');
    expect(doc).toContain('public/data/ladder/el.json');
    expect(doc).toMatch(/first guess/i);
  });
});
