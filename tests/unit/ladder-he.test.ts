// The Hebrew reading ladder (mw-gdcyf98.14): scripts/ladder-he.ts scores every Old Testament verse for how hard it is to say, from the words' syllabified transliteration.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildLadder as buildGreek } from '../../scripts/ladder-el';
import type { LadderEntry as GreekEntry } from '../../scripts/ladder-el';
import { buildLadder, scoreHebrewWords, type LadderEntry, type Unsyllabified } from '../../scripts/ladder-he';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { isGreekBook } from '../support/data-books';

const trs = (text: string): string[] => text.split(' ');

describe('the score of a Hebrew verse', () => {
  it('is 0 for nothing to read, and a single one-syllable word costs only its number', () => {
    expect(scoreHebrewWords([]).score).toBe(0);
    expect(scoreHebrewWords(['lā']).score).toBe(1);
  });

  it('counts each syllable after a word’s first, and the longest word past three syllables twice', () => {
    expect(scoreHebrewWords(['lā·lā']).score).toBe(2);
    expect(scoreHebrewWords(trs('lā·lā lā')).score).toBe(3);
    // 1 word + 4 syllables past the first + 2 each for the 2 syllables past 3
    expect(scoreHebrewWords(['lā·lā·lā·lā·lā']).score).toBe(9);
  });

  it('counts Jonah’s name by hand: the w of a holam-vav is no syllable of its own', () => {
    expect(scoreHebrewWords(['yō·w·nāh']).score).toBe(2);
  });

  it('charges a shewa, a reduced vowel, a doubled letter and a run of consonants', () => {
    const plain = scoreHebrewWords(['lā·lā']).score;
    expect(scoreHebrewWords(['lə·lā']).score).toBe(plain + 1);
    expect(scoreHebrewWords(['lă·lā']).score).toBe(plain + 1);
    // a doubled consonant (a dagesh) is said once: it costs 1 and is no cluster
    expect(scoreHebrewWords(['lal·lā']).score).toBe(plain + 1);
    expect(scoreHebrewWords(['lam·lā']).score).toBe(plain + 1);
    // a run of three costs one more
    expect(scoreHebrewWords(['lamp·lā']).score).toBe(plain + 2);
  });

  it('charges the rare letters ḥ ḵ ṣ ʿ, and not an aleph', () => {
    const plain = scoreHebrewWords(['lā·lā']).score;
    for (const letter of ['ḥ', 'ḵ', 'ṣ', 'ʿ', '‘']) expect(scoreHebrewWords([`lā·${letter}ā`]).score, letter).toBe(plain + 2);
    expect(scoreHebrewWords(['lā·’ā']).score).toBe(plain);
  });

  it('counts a form with no vowel to say as one word and one syllable, and lists it', () => {
    expect(scoreHebrewWords(['h·s·rm']).score).toBe(1);
    expect(scoreHebrewWords(['']).score).toBe(1);
  });

  it('gives at most three short reasons, the heaviest first', () => {
    const { why } = scoreHebrewWords(trs('way·hî də·ḇar- Yah·weh ’el- yō·w·nāh ben- ’ă·mit·tay lê·mōr'));
    expect(why.length).toBeGreaterThan(0);
    expect(why.length).toBeLessThanOrEqual(3);
    for (const reason of why) expect(reason.length).toBeLessThan(40);
  });
});

describe('the ladder of the whole Old Testament', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ladder-he-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }), HOOK_TIMEOUT_MS);
  const first = join(tmp, 'a', 'he.json');
  const second = join(tmp, 'b', 'he.json');
  const unsyllabified: Unsyllabified[] = [];

  it('lists every Old Testament verse once, easiest first, and a second run is byte-identical', () => {
    buildLadder('public/data', first, unsyllabified);
    buildLadder('public/data', second);
    const text = readFileSync(first, 'utf8');
    expect(text).toBe(readFileSync(second, 'utf8'));
    const ladder = JSON.parse(text) as LadderEntry[];
    expect(ladder).toHaveLength(23144);
    expect(new Set(ladder.map((e) => e.ref)).size).toBe(ladder.length);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i].score, ladder[i].ref).toBeGreaterThanOrEqual(ladder[i - 1].score);
    for (const e of ladder) {
      expect(e.why.length).toBeLessThanOrEqual(3);
      expect(e.ref).toMatch(/^[0-9a-z]{3}\.\d+\.\d+$/);
      expect(isGreekBook(e.ref.slice(0, 3)), e.ref).toBe(false);
    }
  });

  it('starts with these ten verses, the easiest', () => {
    const ladder = JSON.parse(readFileSync(first, 'utf8')) as LadderEntry[];
    expect(ladder.slice(0, 10).map((e) => [e.ref, e.score])).toEqual([
      ['exo.20.14', 3],
      ['exo.20.15', 4],
      ['deu.5.18', 5],
      ['deu.5.19', 6],
      ['1ch.1.1', 7],
      ['exo.20.13', 8],
      ['deu.5.17', 8],
      ['1ch.1.27', 8],
      ['gen.46.23', 9],
      ['neh.10.13', 9],
    ]);
  });

  it('ranks Genesis 1:1 as harder than Jonah 1:1, and Genesis 1:2 harder than both', () => {
    const ladder = JSON.parse(readFileSync(first, 'utf8')) as LadderEntry[];
    const at = (ref: string): LadderEntry => ladder[ladder.findIndex((e) => e.ref === ref)];
    expect(at('jon.1.1').score).toBe(20);
    expect(at('gen.1.1').score).toBe(26);
    expect(at('gen.1.2').score).toBeGreaterThan(at('gen.1.1').score);
  });

  it('counts and lists the 25 verses with a word it cannot syllabify, and scores them on all their words', () => {
    expect(unsyllabified).toHaveLength(25);
    const refs = unsyllabified.map((u) => u.ref);
    expect(refs).toContain('jdg.16.25');
    expect(unsyllabified.find((u) => u.ref === 'jdg.16.25')?.forms).toEqual(['h·s·rm']);
    // a word with no transliteration is listed by its Hebrew
    expect(unsyllabified.find((u) => u.ref === 'num.23.13')?.forms).toEqual(['נָּ֨א']);
  });

  it('leaves the Greek ladders to the New Testament: ladder-el walks no Old Testament verse', () => {
    const greek: GreekEntry[] = buildGreek('public/data', join(tmp, 'el-only', 'el.json'));
    expect(greek.some((e) => ['gen', 'psa', 'jon'].includes(e.ref.slice(0, 3)))).toBe(false);
    expect(greek).toHaveLength(7953);
  });

  it('is what is committed: public/data/ladder/he.json is the output of a fresh run', () => {
    expect(existsSync('public/data/ladder/he.json')).toBe(true);
    expect(readFileSync('public/data/ladder/he.json', 'utf8')).toBe(readFileSync(first, 'utf8'));
  });
});

describe('the Hebrew ladder is described', () => {
  it('in docs/reading-ladder.md and in the npm script', () => {
    const doc = readFileSync('docs/reading-ladder.md', 'utf8');
    expect(doc).toContain('public/data/ladder/he.json');
    expect(doc).toContain('scripts/ladder-he.ts');
    expect(doc).toMatch(/first guess/i);
    expect((JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts.ladder).toBe('tsx scripts/ladder-el.ts && tsx scripts/ladder-en.ts && tsx scripts/ladder-he.ts');
  });
});
