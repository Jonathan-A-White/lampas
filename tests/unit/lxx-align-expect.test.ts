// tests/unit/lxx-align-expect.test.ts — `npm run lxx:align-expect` (scripts/lxx/align-expect.ts, story mw-u2w5klk.349.73; docs/lxx-align.md, 'A pairing pass'): the per-chapter counts, the leftover words with their
// reasons and the pairs by place a pairing pass used to add by hand to three test files are a sidecar per book, data/lxx/align/<book>.expect.json, written by one command; the real-data tests read it. Here: the file's
// shape, what the command keeps and what it drops, the checks that fail in one line naming the command, and two books writing no file in common. The real data is read by the three tests that use the sidecar.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import type { AlignShare } from '../../scripts/lxx/align';
import {
  alignFileChapters,
  checkCounts,
  checkFiles,
  checkLeftovers,
  checkPlacePairs,
  expectBooks,
  expectCommand,
  leftoversOf,
  mergeWhy,
  parseExpect,
  readExpect,
  renderExpect,
  runExpect,
  updateExpect,
  type BookExpect,
  type Measure,
} from '../../scripts/lxx/align-expect';
import type { Shipped } from '../../scripts/lxx/ship';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const dirs: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'lampas-lxx-expect-'));
  dirs.push(d);
  return d;
};
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const word = (t: string, p = 'N-NSM'): GreekWord => ({ t, tr: t, s: '', l: t, p, y: '2', c: 0.9 });
/** A verse with a model chunk that has no Greek ('there', content), a remainder ('removed thence'), a paired chunk, and a function word with no Greek ('and'). */
const verse: Verse = {
  n: 3,
  g: [word('θεός'), word('ἐκίνησεν', 'V-AAI-3S')],
  e: [
    { t: 'God', g: [0], c: 0.9, y: 'align' },
    { t: 'removed thence', g: [], y: 'align?' },
    { t: 'yes, there', g: [], c: 0.8, y: 'model' },
    { t: 'and', g: [] },
  ],
};
const chapter = (n: number): Chapter => ({ book: 'Genesis', code: 'gen', chapter: n, verses: [verse] }) as unknown as Chapter;

const expectOf = (): BookExpect => ({
  reasons: { 'added-by-brenton': 'Brenton adds it.' },
  chapters: {
    '1': { gaps: 0, model: 11 },
    '12': { gaps: 0, model: 2, leftovers: [['12:3:removed', 'a sentence of its own'], ['12:3:thence', 'added-by-brenton']], placePairs: [['12:3 God @0', 'read']] },
    '2': { gaps: 1, model: 0 },
  },
});

describe('the sidecar file', () => {
  it('is written the same way twice, one chapter a line where it has no lists, and reads back as it was', () => {
    const text = renderExpect(expectOf());
    expect(renderExpect(parseExpect(text))).toBe(text);
    expect(parseExpect(text)).toEqual(expectOf());
    expect(text).toContain('    "1": { "gaps": 0, "model": 11 },');
    expect(text.indexOf('"1"')).toBeLessThan(text.indexOf('"2"'));
    expect(text.indexOf('"2"')).toBeLessThan(text.indexOf('"12"'));
    expect(text).toContain('        ["12:3:thence", "added-by-brenton"]');
  });

  it('is refused without chapters', () => {
    expect(() => parseExpect('{}', 'gen.expect.json')).toThrow(/gen.expect.json has no "chapters"/);
  });

  it('is found by book, and the model files by chapter, in one directory that holds both', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'gen-02.tsv'), '');
    writeFileSync(join(dir, 'gen-01.tsv'), '');
    writeFileSync(join(dir, 'exo-01.tsv'), '');
    writeFileSync(join(dir, 'gen.expect.json'), renderExpect(expectOf()));
    expect(alignFileChapters('gen', dir)).toEqual([1, 2]);
    expect(expectBooks(dir)).toEqual(['gen']);
    expect(readExpect('gen', dir)).toEqual(expectOf());
    expect(readExpect('exo', dir)).toBeUndefined();
  });

  it('is the one the repository holds for Genesis, with a reason for every leftover word it names', () => {
    const book = readExpect('gen')!;
    expect(Object.keys(book.chapters).map(Number)).toEqual(alignFileChapters('gen'));
    for (const [n, c] of Object.entries(book.chapters)) {
      expect(c.gaps, `gen ${n}`).toBe(0);
      for (const [k, why] of c.leftovers ?? []) expect(why.trim(), `${k}`).not.toBe('');
    }
    const named = Object.values(book.chapters).flatMap((c) => (c.leftovers ?? []).map(([, why]) => why));
    for (const why of named) if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(why)) expect(book.reasons[why], why).toBeDefined();
  });
});

describe('measuring a chapter', () => {
  it("finds the content words of every chunk that opens no Greek word, and not the function words ('and', 'yes', 'there') or a paired chunk", () => {
    expect(leftoversOf(chapter(12))).toEqual(['12:3:removed', '12:3:thence']);
  });

  it("counts a function word a chapter names in `also` ('yes' of Genesis 20:6)", () => {
    expect(leftoversOf(chapter(12), ['yes'])).toEqual(['12:3:removed', '12:3:thence', '12:3:yes']);
  });
});

describe('what the command keeps', () => {
  const measure = (over: Partial<Measure> = {}): Measure => ({ gaps: 0, model: 4, leftovers: [], placePairs: [], ...over });

  it("keeps the reason a word had, gives a new word '' and drops a word that is gone, a word found twice taking its reasons in order", () => {
    const was: Array<[string, string]> = [['1:1:go', 'a'], ['1:1:go', 'b'], ['1:2:gone', 'c']];
    expect(mergeWhy(['1:2:new', '1:1:go', '1:1:go', '1:1:go'], was)).toEqual([['1:1:go', 'a'], ['1:1:go', 'b'], ['1:1:go', ''], ['1:2:new', '']]);
  });

  it('writes the counts as measured, keeps the reasons, and gives a chapter that was not there its leftovers with no reason and no pairs by place', () => {
    const next = updateExpect(expectOf(), [1, 12, 13], new Map([
      [1, measure({ model: 12, leftovers: ['1:1:x'] })],
      [12, measure({ model: 3, leftovers: ['12:3:thence', '12:3:removed', '12:3:fresh'], placePairs: ['12:3 God @0', '12:4 Lord @2'] })],
      [13, measure({ leftovers: ['13:1:a'], placePairs: ['13:1 b @1'] })],
    ]));
    expect(next.reasons).toEqual(expectOf().reasons);
    // a count-only chapter stays count-only, the counts follow the data
    expect(next.chapters['1']).toEqual({ gaps: 0, model: 12 });
    expect(next.chapters['12']).toEqual({
      gaps: 0,
      model: 3,
      leftovers: [['12:3:fresh', ''], ['12:3:removed', 'a sentence of its own'], ['12:3:thence', 'added-by-brenton']],
      placePairs: [['12:3 God @0', 'read'], ['12:4 Lord @2', '']],
    });
    expect(next.chapters['13']).toEqual({ gaps: 0, model: 4, leftovers: [['13:1:a', '']] });
    // a chapter that has no model file any more is dropped
    expect(Object.keys(next.chapters)).toEqual(['1', '12', '13']);
  });

  it('refuses, naming the chapter, when a chapter with a model file was not shipped (no Morpheus cache here), and changes nothing', () => {
    expect(() => updateExpect(expectOf(), [1, 99], new Map([[1, measure()]]))).toThrow(/chapter 99 has a model file but was not shipped/);
  });
});

describe('a stale sidecar fails in one line that names the command', () => {
  const book = expectOf();
  const same = (): Map<number, Measure> => new Map([[1, { gaps: 0, model: 11, leftovers: [], placePairs: [] }], [12, { gaps: 0, model: 2, leftovers: ['12:3:removed', '12:3:thence'], placePairs: ['12:3 God @0'] }], [2, { gaps: 1, model: 0, leftovers: [], placePairs: [] }]]);

  it('says nothing of a sidecar that is as the data is', () => {
    expect(checkCounts('gen', book, same())).toEqual([]);
    expect(checkLeftovers('gen', book, same())).toEqual([]);
    expect(checkPlacePairs('gen', book, same())).toEqual([]);
    expect(checkFiles('gen', book, [1, 2, 12])).toEqual([]);
  });

  it("fails when one count differs: the line names the chapter, both numbers and `npm run lxx:align-expect -- --book gen`", () => {
    const measured = same();
    measured.set(1, { gaps: 0, model: 12, leftovers: [], placePairs: [] });
    const problems = checkCounts('gen', book, measured);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('gen 1:');
    expect(problems[0]).toContain('model 12');
    expect(problems[0]).toContain('says 11');
    expect(problems[0]).toContain(`\`${expectCommand('gen')}\``);
    expect(problems[0]).not.toContain('\n');
    expect(expectCommand('gen')).toBe('npm run lxx:align-expect -- --book gen');
  });

  it('fails on a count of a chapter that was not shipped', () => {
    const measured = same();
    measured.delete(2);
    expect(checkCounts('gen', book, measured)[0]).toContain('was not shipped');
  });

  it('fails on a leftover word the sidecar does not name, and on a name no chunk has, each naming the command', () => {
    const measured = same();
    measured.set(12, { gaps: 0, model: 2, leftovers: ['12:3:removed', '12:3:brandnew'], placePairs: [] });
    const problems = checkLeftovers('gen', book, measured);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/does not name them \(12:3:brandnew\).*npm run lxx:align-expect -- --book gen/);
    expect(problems[1]).toMatch(/12:3:thence.*npm run lxx:align-expect -- --book gen/);
  });

  it('fails on a leftover word with no reason, and on a reason that names a key "reasons" does not have', () => {
    const bare: BookExpect = { reasons: {}, chapters: { '12': { gaps: 0, model: 2, leftovers: [['12:3:removed', ''], ['12:3:thence', 'no-such-key']] } } };
    const measured = new Map([[12, { gaps: 0, model: 2, leftovers: ['12:3:removed', '12:3:thence'], placePairs: [] }]]);
    const problems = checkLeftovers('gen', bare, measured);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/have no reason in .*gen\.expect\.json \(12:3:removed\).*npm run lxx:align-expect -- --book gen/);
    expect(problems[1]).toContain("'no-such-key'");
  });

  it('fails on a pair by place nobody has read, one that is gone, and one not marked read', () => {
    const measured = same();
    measured.set(12, { gaps: 0, model: 2, leftovers: ['12:3:removed', '12:3:thence'], placePairs: ['12:3 God @0', '12:9 new @4'] });
    expect(checkPlacePairs('gen', book, measured)[0]).toMatch(/nobody has read \(12:9 new @4\)/);
    measured.set(12, { gaps: 0, model: 2, leftovers: [], placePairs: [] });
    expect(checkPlacePairs('gen', book, measured)[0]).toMatch(/no chunk has any more \(12:3 God @0\).*npm run lxx:align-expect/);
    const unread: BookExpect = { reasons: {}, chapters: { '12': { gaps: 0, model: 2, placePairs: [['12:3 God @0', '']] } } };
    expect(checkPlacePairs('gen', unread, same())[0]).toMatch(/not marked "read"/);
  });

  it('fails on a model file the sidecar does not name, and a chapter it names that has none', () => {
    expect(checkFiles('gen', book, [1, 2, 12, 14])[0]).toMatch(/chapter 14 has a model file but is not in .*gen\.expect\.json: run `npm run lxx:align-expect -- --book gen`/);
    expect(checkFiles('gen', book, [1, 2])[0]).toMatch(/names chapter 12, which has no model file/);
  });
});

describe('two books share nothing', () => {
  const share = (code: string, book: string): AlignShare => ({ code, book, chapter: 1, verses: 1, words: 10, paired: 8, sure: 6, tokens: 10, pairedTokens: 8, model: 0 });
  /** A ship that writes one chapter of each book it is asked for, and the lexicon, as lxx:ship does, and reports it. */
  const ship = async (argv: readonly string[], options: { books?: ReadonlyArray<readonly [string, string]> }): Promise<Shipped> => {
    const out = argv[argv.indexOf('--out') + 1];
    writeFileSync(join(out, 'lexicon-grc-lxx.json'), '{}');
    const books = options.books ?? [];
    for (const [code] of books) {
      mkdirSync(join(out, code.toLowerCase()), { recursive: true });
      writeFileSync(join(out, code.toLowerCase(), '1.json'), JSON.stringify({ ...chapter(1), code: code.toLowerCase() }));
    }
    return {
      books: books.map(([code]) => ({ code: code.toLowerCase(), shipped: [1], chapters: 1 })),
      written: {} as Shipped['written'],
      withoutMorpheus: [],
      aligned: books.map(([code, name]) => share(code.toLowerCase(), name)),
    };
  };

  it('writes, for Genesis and for Exodus, two sets of files with nothing in common, none under tests/, and a second run writes nothing', async () => {
    const align = tmp();
    const docs = tmp();
    for (const f of ['gen-01.tsv', 'exo-01.tsv']) writeFileSync(join(align, f), '');
    const books = [['Gen', 'Genesis'], ['Exo', 'Exodus']] as const;
    const options = { shipper: ship, expectDir: align, reportDir: docs, books };
    const gen = await runExpect(['--book', 'gen'], options);
    const exo = await runExpect(['--book', 'exo'], options);
    expect(gen.files.map((f) => f.replace(align, 'A').replace(docs, 'D')).sort()).toEqual(['A/gen.expect.json', 'D/gen.txt']);
    expect(exo.files.map((f) => f.replace(align, 'A').replace(docs, 'D')).sort()).toEqual(['A/exo.expect.json', 'D/exo.txt']);
    expect(gen.files.filter((f) => exo.files.includes(f))).toEqual([]);
    for (const f of [...gen.files, ...exo.files]) expect(f.startsWith('tests/') || f.includes('/tests/'), f).toBe(false);
    expect(readdirSync(align).sort()).toEqual(['exo-01.tsv', 'exo.expect.json', 'gen-01.tsv', 'gen.expect.json']);
    // the new chapter's leftovers are written with no reason: the Builder writes why
    expect(readExpect('gen', align)!.chapters['1'].leftovers).toEqual([['1:3:removed', ''], ['1:3:thence', '']]);
    expect(existsSync(join(docs, 'gen.txt'))).toBe(true);
    const again = await runExpect(['--book', 'gen'], options);
    expect(again.files).toEqual([]);
  });

  it('writes a book with no model file its file under docs only, and refuses a book it does not know', async () => {
    const align = tmp();
    const docs = tmp();
    const done = await runExpect(['--book', 'exo'], { shipper: ship, expectDir: align, reportDir: docs, books: [['Exo', 'Exodus']] });
    expect(done.files).toEqual([join(docs, 'exo.txt')]);
    await expect(runExpect(['--book', 'zzz'], { shipper: ship, expectDir: align, reportDir: docs, books: [['Exo', 'Exodus']] })).rejects.toThrow(/no book 'zzz'/);
    await expect(runExpect(['--chapter', '1'], { shipper: ship })).rejects.toThrow(/usage/);
  });
});

