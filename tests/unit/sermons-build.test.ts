// scripts/sermons-build.ts, scripts/sermons/osis.ts and scripts/sermons/toml.ts on a 20-row cut of the sermon-index repo's Spurgeon source (tests/fixtures/sermons/);
// never the network: the download is a fake that answers the fixture and records the addresses it was asked for.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CANON } from '../../src/data/canon';
import { parseOsisRef } from '../../scripts/sermons/osis';
import { parseToml } from '../../scripts/sermons/toml';
import type { SermonBookFile, SermonIndex } from '../../src/data/sermonIndex';
import { rawUrl, runSermonsBuild, sourceFingerprint } from '../../scripts/sermons-build';

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: Array<{ code: string; verses: number[] }> };
const verses = (code: string): readonly number[] | undefined => index.books.find((b) => b.code === code)?.verses;
const ref = (text: string) => parseOsisRef(text, verses);

describe('parseOsisRef: an OSIS reference in Lampas\'s book codes', () => {
  it('reads a verse, a range in a chapter and a range over chapters', () => {
    expect(ref('Rom.5.8')).toEqual({ ok: true, parts: [{ book: 'rom', chapter: 5, from: 8, to: 8 }] });
    expect(ref('Rom.5.1-Rom.5.11')).toEqual({ ok: true, parts: [{ book: 'rom', chapter: 5, from: 1, to: 11 }] });
    expect(ref('Rom.5.12-Rom.6.4')).toEqual({ ok: true, parts: [{ book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 }] });
  });

  it('reads a whole chapter and a whole book as their first to their last verse', () => {
    expect(ref('Ps.23')).toEqual({ ok: true, parts: [{ book: 'psa', chapter: 23, from: 1, to: 6 }] });
    expect(ref('Rom.5-Rom.6')).toEqual({ ok: true, parts: [{ book: 'rom', chapter: 5, from: 1, to: 23, toChapter: 6 }] });
    expect(ref('Jude')).toEqual({ ok: true, parts: [{ book: 'jud', chapter: 1, from: 1, to: 25 }] });
    expect(ref('Phlm')).toEqual({ ok: true, parts: [{ book: 'phm', chapter: 1, from: 1, to: 25 }] });
  });

  it('knows each of the 66 books by its OSIS name and by Lampas\'s code, in any case', () => {
    const osis = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev'];
    expect(osis).toHaveLength(66);
    osis.forEach((name, i) => {
      const code = CANON[i].code;
      expect(ref(`${name}.1.1`), name).toMatchObject({ ok: true, parts: [{ book: code, chapter: 1, from: 1, to: 1 }] });
      expect(ref(`${code.toUpperCase()}.1.1`), code).toMatchObject({ ok: true, parts: [{ book: code }] });
    });
  });

  it('lists a book the canon lacks as the reason and leaves the row out', () => {
    expect(ref('Tob.3.1')).toEqual({ ok: false, book: 'Tob', reason: "unknown book 'Tob'" });
    expect(ref('Rom.5.1-Tob.3.1')).toMatchObject({ ok: false, book: 'Tob' });
  });

  it('refuses a chapter or a verse past the end and a range that ends before it starts', () => {
    expect(ref('Rom.17.1')).toMatchObject({ ok: false, reason: expect.stringContaining('chapter') });
    expect(ref('Rom.5.99')).toMatchObject({ ok: false, reason: expect.stringContaining('verse') });
    expect(ref('Rom.5.0')).toMatchObject({ ok: false });
    expect(ref('Rom.5.8-Rom.5.2')).toMatchObject({ ok: false, reason: expect.stringContaining('before') });
    expect(ref('Rom.5.1-11')).toMatchObject({ ok: false });
    expect(ref('')).toMatchObject({ ok: false });
  });

  it('splits a range over books into one part for each book it touches, cut at the book\'s ends', () => {
    expect(ref('Rom.16.20-1Cor.1.3')).toEqual({
      ok: true,
      parts: [
        { book: 'rom', chapter: 16, from: 20, to: 24 },
        { book: '1co', chapter: 1, from: 1, to: 3 },
      ],
    });
    const wide = ref('Phlm.1.20-Heb.1.2');
    expect(wide).toEqual({ ok: true, parts: [{ book: 'phm', chapter: 1, from: 20, to: 25 }, { book: 'heb', chapter: 1, from: 1, to: 2 }] });
    const through = ref('2John.1.1-Jude.1.3');
    expect(through).toMatchObject({ ok: true });
    if (through.ok) expect(through.parts.map((p) => p.book)).toEqual(['2jn', '3jn', 'jud']);
    if (through.ok) expect(through.parts[1]).toEqual({ book: '3jn', chapter: 1, from: 1, to: 14 });
  });
});

describe('parseToml: the subset of source.toml', () => {
  it('reads strings, a multi-line string whose backslash-newline joins its lines, booleans and a date', () => {
    const text = [
      '# a comment',
      'id = "a-b"',
      'name = "Spurgeon\'s \\"sermons\\""   # trailing comment',
      'licence = """',
      'One line \\',
      'joined; and \\',
      'another."""',
      'on_by_default = true',
      'added = 2026-11-05',
      'note = "has a # inside"',
    ].join('\n');
    expect(parseToml(text)).toEqual({ id: 'a-b', name: 'Spurgeon\'s "sermons"', licence: 'One line joined; and another.', on_by_default: true, added: '2026-11-05', note: 'has a # inside' });
  });

  it('reads the real fixture\'s licence as CCEL\'s paragraph, in one line', () => {
    const toml = parseToml(readFileSync('tests/fixtures/sermons/spurgeon-20.toml', 'utf8'));
    expect(toml.licence).toMatch(/^CCEL\.org website and special contents copyright 1993-2020 Harry Plantinga\. Most of the editions/);
    expect(toml.licence).toMatch(/Check your local copyright law before copying\.$/);
    expect(String(toml.licence)).not.toMatch(/\\|\n/);
  });

  it('refuses a line it does not understand', () => {
    expect(() => parseToml('id = [1, 2]')).toThrow(/id/);
  });
});

const SHA = '0123456789abcdef0123456789abcdef01234567';
const fixtureRows = readFileSync('tests/fixtures/sermons/spurgeon-20.jsonl', 'utf8');
const fixtureToml = readFileSync('tests/fixtures/sermons/spurgeon-20.toml', 'utf8');

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'sermons-build-'));
  const configFile = join(dir, 'sources.json');
  writeFileSync(configFile, JSON.stringify({ repo: 'https://github.com/Jonathan-A-White/sermon-index', commit: SHA, sources: ['spurgeon-20'] }));
  const asked: string[] = [];
  const download = async (url: string, dest: string): Promise<void> => {
    asked.push(url);
    const { mkdirSync, writeFileSync: write } = await import('node:fs');
    const { dirname } = await import('node:path');
    mkdirSync(dirname(dest), { recursive: true });
    write(dest, url.endsWith('source.toml') ? fixtureToml : fixtureRows);
  };
  const options = { configFile, rawDir: join(dir, 'raw'), outDir: join(dir, 'out'), download, verses };
  return { dir, asked, options };
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const filesUnder = (dir: string): string[] => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort();

describe('runSermonsBuild', () => {
  it('asks raw GitHub for source.toml and rows.jsonl of the pinned commit, once each, and for nothing else', async () => {
    const w = workspace();
    await runSermonsBuild(w.options);
    expect(w.asked).toEqual([rawUrl('https://github.com/Jonathan-A-White/sermon-index', SHA, 'spurgeon-20', 'source.toml'), rawUrl('https://github.com/Jonathan-A-White/sermon-index', SHA, 'spurgeon-20', 'rows.jsonl')]);
    expect(w.asked[0]).toBe(`https://raw.githubusercontent.com/Jonathan-A-White/sermon-index/${SHA}/sources/spurgeon-20/source.toml`);
    await runSermonsBuild(w.options);
    expect(w.asked).toHaveLength(2);
    expect(existsSync(join(w.dir, 'raw'))).toBe(true);
  });

  it('writes index.json with each source\'s licence, credit, counts, books and fingerprint', async () => {
    const w = workspace();
    const result = await runSermonsBuild(w.options);
    const out = readJson<SermonIndex>(join(w.options.outDir, 'index.json'));
    expect(Object.keys(out)).toEqual(['sources']);
    expect(out.sources).toHaveLength(1);
    const [s] = out.sources;
    expect(Object.keys(s)).toEqual(['id', 'name', 'kind', 'licence', 'credit', 'homepage', 'rows', 'books', 'fingerprint']);
    expect(s).toMatchObject({
      id: 'spurgeon-20',
      kind: 'sermons',
      credit: 'Charles Haddon Spurgeon; the Christian Classics Ethereal Library (ccel.org); Spurgeon Gems (spurgeongems.org)',
      homepage: 'https://ccel.org/ccel/spurgeon',
    });
    expect(s.licence).toMatch(/^CCEL\.org website/);
    expect(s.fingerprint).toMatch(/^[0-9a-f]{12}$/);
    // 20 rows, 19 with a preaching text (385 has none)
    expect(s.rows).toBe(19);
    expect(result.sources[0]).toMatchObject({ read: 20, listed: 19, withoutRef: 1, omitted: [] });
    // books in canon order, each a Lampas code
    expect(s.books).toEqual(['num', '1sa', 'psa', 'isa', 'mal', 'luk', 'jhn', 'rom', '1co', '1jn']);
  });

  it('splits the rows by book, in the story\'s row shape, in verse order', async () => {
    const w = workspace();
    await runSermonsBuild(w.options);
    const rom = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', 'rom.json'));
    expect(Object.keys(rom)).toEqual(['rows']);
    expect(rom.rows.map((r) => `${r.id}@${r.ref.chapter}:${r.ref.from}`)).toEqual(['126@3:24', '3392@5:1', '1191@5:6', '104@5:8', '2544@5:16', '37@5:20', '330@5:21']);
    const row104 = rom.rows.find((r) => r.id === '104');
    expect(row104).toEqual({
      id: '104',
      title: "Love's Commendation",
      ref: { book: 'rom', chapter: 5, from: 8, to: 8 },
      role: 'text',
      url: 'https://ccel.org/ccel/spurgeon/sermons02/sermons02.l.html',
      alt: 'https://www.spurgeongems.org/sermon/chs104.pdf',
      preacher: 'C. H. Spurgeon',
    });
    expect(Object.keys(row104!)).toEqual(['id', 'title', 'ref', 'role', 'url', 'alt', 'preacher']);
    // an exposition has no alt and no date: the keys are left out, not empty
    const jn = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', '1jn.json'));
    const exposition = jn.rows.find((r) => r.id === '62')!;
    expect(exposition.ref).toEqual({ book: '1jn', chapter: 3, from: 1, to: 10 });
    expect('alt' in exposition).toBe(false);
    expect('date' in exposition).toBe(false);
  });

  it('puts a row of a range over books under each book it touches, and leaves out a book the canon lacks, saying so', async () => {
    const w = workspace();
    const extra = [
      JSON.stringify({ id: '9001', title: 'Over a book', ref: 'Rom.16.20-1Cor.1.3', url: 'https://ccel.org/x', date: '1860-02-03' }),
      JSON.stringify({ id: '9002', title: 'Apocrypha', ref: 'Tob.3.1', url: 'https://ccel.org/y' }),
      JSON.stringify({ id: '9003', title: 'A chapter', ref: 'Ps.23', url: 'https://ccel.org/z', cited: ['John.3.16'] }),
    ].join('\n');
    const { mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');
    const download = async (url: string, dest: string) => {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, url.endsWith('source.toml') ? fixtureToml : `${fixtureRows}\n${extra}\n`);
    };
    const result = await runSermonsBuild({ ...w.options, download });
    expect(result.sources[0].omitted).toEqual([{ id: '9002', ref: 'Tob.3.1', reason: "unknown book 'Tob'" }]);
    const rom = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', 'rom.json'));
    const co = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', '1co.json'));
    expect(rom.rows.find((r) => r.id === '9001')).toMatchObject({ ref: { book: 'rom', chapter: 16, from: 20, to: 24 }, date: '1860-02-03' });
    expect(co.rows.find((r) => r.id === '9001')).toMatchObject({ ref: { book: '1co', chapter: 1, from: 1, to: 3 } });
    const psa = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', 'psa.json'));
    expect(psa.rows.find((r) => r.id === '9003')!.ref).toEqual({ book: 'psa', chapter: 23, from: 1, to: 6 });
    // the cited reference is left out of this story: John gets no row for 9003
    const jhn = readJson<SermonBookFile>(join(w.options.outDir, 'spurgeon-20', 'jhn.json'));
    expect(jhn.rows.some((r) => r.id === '9003')).toBe(false);
    expect(existsSync(join(w.options.outDir, 'spurgeon-20', 'tob.json'))).toBe(false);
  });

  it('writes the same bytes on a second run, touches nothing, and removes a file an earlier run left', async () => {
    const w = workspace();
    const first = await runSermonsBuild(w.options);
    expect(first.written).toBeGreaterThan(0);
    const before = filesUnder(w.options.outDir).map((f) => [f, readFileSync(join(w.options.outDir, f), 'utf8')]);
    writeFileSync(join(w.options.outDir, 'spurgeon-20', 'gen.json'), '{"rows":[]}');
    writeFileSync(join(w.options.outDir, 'old-source.json'), '{}');
    const second = await runSermonsBuild(w.options);
    expect(second.written).toBe(2); // the two it removed
    expect((await runSermonsBuild(w.options)).written).toBe(0);
    expect(filesUnder(w.options.outDir).map((f) => [f, readFileSync(join(w.options.outDir, f), 'utf8')])).toEqual(before);
  });

  it('fails, naming the source, for a source id that is not in the repo\'s files', async () => {
    const w = workspace();
    const download = async () => {
      throw new Error('404');
    };
    await expect(runSermonsBuild({ ...w.options, download })).rejects.toThrow(/spurgeon-20/);
  });

  it('gives every file a size the story can quote: gzipped per source', async () => {
    const w = workspace();
    const result = await runSermonsBuild(w.options);
    const all = filesUnder(w.options.outDir).filter((f) => f.startsWith('spurgeon-20/'));
    const gz = gzipSync(Buffer.concat(all.map((f) => readFileSync(join(w.options.outDir, f))))).length;
    expect(result.sources[0].gzipBytes).toBeGreaterThan(0);
    expect(result.sources[0].gzipBytes).toBeLessThan(gz * 2);
  });
});

describe('sourceFingerprint', () => {
  const rows = (title: string): Map<string, SermonBookFile> => new Map([['rom', { rows: [{ id: '1', title, ref: { book: 'rom', chapter: 1, from: 1, to: 1 }, role: 'text', url: 'https://x' }] }]]);

  it('is the first 12 hex of a SHA-256 over the source\'s book files, the same for the same rows', () => {
    expect(sourceFingerprint(rows('A'))).toMatch(/^[0-9a-f]{12}$/);
    expect(sourceFingerprint(rows('A'))).toBe(sourceFingerprint(rows('A')));
  });

  it('changes with a title, with a book\'s name, and with the books held', () => {
    expect(sourceFingerprint(rows('A'))).not.toBe(sourceFingerprint(rows('B')));
    const other = new Map([['mat', rows('A').get('rom')!]]);
    expect(sourceFingerprint(other)).not.toBe(sourceFingerprint(rows('A')));
    const two = rows('A');
    two.set('mat', two.get('rom')!);
    expect(sourceFingerprint(two)).not.toBe(sourceFingerprint(rows('A')));
  });
});
