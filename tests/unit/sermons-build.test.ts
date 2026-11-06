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
import type { ThemeBookFile, ThemeIndex } from '../../src/data/themeIndex';
import { rawUrl, runSermonsBuild, sourceFingerprint, themeLicence } from '../../scripts/sermons-build';

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
    expect(Object.keys(s)).toEqual(['id', 'name', 'kind', 'licence', 'credit', 'homepage', 'onByDefault', 'rows', 'books', 'fingerprint']);
    expect(s).toMatchObject({
      id: 'spurgeon-20',
      // the fixture's source.toml says on_by_default = false: the key is kept for a source that starts Off (his Logos archives) and left out for one that starts On
      onByDefault: false,
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

// The theme sources (mw-qtu3zvz.4): three topics in the sermon-index repo's themes-tcr1934 shape, built into public/themes by the same run.
const themeFile = (suffix: string): string => readFileSync(`tests/fixtures/sermons/tcr-three${suffix}`, 'utf8');
const THEME_FILES: Record<string, string> = { 'source.toml': themeFile('.toml'), 'topics.jsonl': themeFile('.topics.jsonl'), 'links.jsonl': themeFile('.jsonl') };

function themeWorkspace() {
  const w = workspace();
  writeFileSync(w.options.configFile, JSON.stringify({ repo: 'https://github.com/Jonathan-A-White/sermon-index', commit: SHA, sources: ['spurgeon-20'], themes: ['themes-three'] }));
  const asked: string[] = [];
  const download = async (url: string, dest: string): Promise<void> => {
    asked.push(url);
    const { mkdirSync, writeFileSync: write } = await import('node:fs');
    const { dirname } = await import('node:path');
    mkdirSync(dirname(dest), { recursive: true });
    const file = url.slice(url.lastIndexOf('/') + 1);
    write(dest, url.includes('/themes-three/') ? THEME_FILES[file] : file === 'source.toml' ? fixtureToml : fixtureRows);
  };
  return { ...w, asked, options: { ...w.options, download, themesOutDir: join(w.dir, 'themes') } };
}

describe('runSermonsBuild: the theme sources', () => {
  it('asks for the three files of a theme source at the pinned commit, once, and writes nothing to themes when none is listed', async () => {
    const w = themeWorkspace();
    await runSermonsBuild(w.options);
    for (const file of ['source.toml', 'topics.jsonl', 'links.jsonl'] as const) expect(w.asked).toContain(rawUrl('https://github.com/Jonathan-A-White/sermon-index', SHA, 'themes-three', file));
    expect(w.asked).toContain(`https://raw.githubusercontent.com/Jonathan-A-White/sermon-index/${SHA}/sources/themes-three/topics.jsonl`);
    const count = w.asked.length;
    await runSermonsBuild(w.options);
    expect(w.asked).toHaveLength(count);
    const bare = workspace();
    await runSermonsBuild({ ...bare.options, themesOutDir: join(bare.dir, 'themes') });
    expect(existsSync(join(bare.dir, 'themes'))).toBe(false);
  });

  it('writes index.json {sources: [{id, name, licence, credit, homepage, topics, links, books, fingerprint}]}', async () => {
    const w = themeWorkspace();
    const result = await runSermonsBuild(w.options);
    const out = readJson<ThemeIndex>(join(w.options.themesOutDir, 'index.json'));
    expect(Object.keys(out)).toEqual(['sources']);
    expect(out.sources).toHaveLength(1);
    const [s] = out.sources;
    expect(Object.keys(s)).toEqual(['id', 'name', 'licence', 'credit', 'homepage', 'topics', 'links', 'books', 'fingerprint']);
    expect(s).toMatchObject({ id: 'themes-three', name: 'Three topics (a fixture)', credit: 'The tests of Lampas', homepage: 'https://themes-three.test', topics: 3, links: 10 });
    expect(s.licence).toBe('DistributionLicense=Public Domain');
    expect(s.books).toEqual(['psa', 'jhn', 'rom', 'heb', '1jn', 'lev'].sort((a, b) => CANON.findIndex((c) => c.code === a) - CANON.findIndex((c) => c.code === b)));
    expect(s.fingerprint).toMatch(/^[0-9a-f]{12}$/);
    expect(result.themes[0]).toMatchObject({ id: 'themes-three', read: 4, listed: 3 });
    expect(result.themes[0].omitted).toEqual([
      { topic: 'love-hatred', ref: 'Rom.16.25', reason: expect.stringContaining('verse') },
      { topic: 'shepherd', ref: 'Tob.3.1', reason: "unknown book 'Tob'" },
    ]);
  });

  it('writes a book file of {topics: [{id, label, parts, verses, books}], links: [{topic, part, ref}]} for that book\'s links', async () => {
    const w = themeWorkspace();
    await runSermonsBuild(w.options);
    const rom = readJson<ThemeBookFile>(join(w.options.themesOutDir, 'themes-three', 'rom.json'));
    expect(Object.keys(rom)).toEqual(['topics', 'links']);
    // the topics with a link in Romans, in the source's order; a topic's parts are the ones Romans uses; `verses` is the topic's whole (all books, a verse once); `books` where its links are
    expect(rom.topics).toEqual([
      { id: 'atonement', label: 'Atonement', parts: [{ n: 1, label: 'Doctrine of' }], verses: 8, books: ['lev', 'rom', 'heb'] },
      { id: 'love-hatred', label: 'Love-Hatred', parts: [{ n: 4, label: 'Of God' }], verses: 3, books: ['jhn', 'rom', '1jn'] },
      { id: 'shepherd', label: 'Shepherd', parts: [], verses: 26, books: ['psa', 'jhn', 'rom'] },
    ]);
    expect(Object.keys(rom.topics[0])).toEqual(['id', 'label', 'parts', 'verses', 'books']);
    // a range over chapters keeps its chapters; a link to the whole topic has no part; a repeated link is written once
    expect(rom.links).toEqual([
      { topic: 'atonement', part: 1, ref: '5.11' },
      { topic: 'atonement', part: 1, ref: '5.9' },
      { topic: 'love-hatred', part: 4, ref: '5.8' },
      { topic: 'shepherd', ref: '5.12-6.4' },
    ]);
    const heb = readJson<ThemeBookFile>(join(w.options.themesOutDir, 'themes-three', 'heb.json'));
    expect(heb.links).toEqual([{ topic: 'atonement', part: 1, ref: '9.12' }]);
    const psa = readJson<ThemeBookFile>(join(w.options.themesOutDir, 'themes-three', 'psa.json'));
    expect(psa.links).toEqual([{ topic: 'shepherd', ref: '23.1-6' }]);
    expect(existsSync(join(w.options.themesOutDir, 'themes-three', 'tob.json'))).toBe(false);
  });

  it('carries `books` only for a topic of at most 300 verses, since the sheet joins no other', async () => {
    const w = themeWorkspace();
    const wide = THEME_FILES['links.jsonl'] + '{"topic":"empty-topic","ref":"Gen.1-Gen.12"}\n{"topic":"empty-topic","ref":"Exod.1-Exod.40"}\n{"topic":"empty-topic","ref":"Lev.1-Lev.27"}\n{"topic":"empty-topic","ref":"Rom.5.8"}\n';
    const { mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');
    const download = async (url: string, dest: string) => {
      mkdirSync(dirname(dest), { recursive: true });
      const file = url.slice(url.lastIndexOf('/') + 1);
      writeFileSync(dest, url.includes('/themes-three/') ? (file === 'links.jsonl' ? wide : THEME_FILES[file]) : file === 'source.toml' ? fixtureToml : fixtureRows);
    };
    await runSermonsBuild({ ...w.options, download });
    const rom = readJson<ThemeBookFile>(join(w.options.themesOutDir, 'themes-three', 'rom.json'));
    const topic = rom.topics.find((t) => t.id === 'empty-topic')!;
    expect(topic.verses).toBeGreaterThan(300);
    expect('books' in topic).toBe(false);
  });

  it('writes the same bytes on a second run, and removes a file an earlier run left', async () => {
    const w = themeWorkspace();
    const first = await runSermonsBuild(w.options);
    expect(first.written).toBeGreaterThan(0);
    const before = filesUnder(w.options.themesOutDir).map((f) => [f, readFileSync(join(w.options.themesOutDir, f), 'utf8')]);
    expect(before.map(([f]) => f)).toContain('index.json');
    writeFileSync(join(w.options.themesOutDir, 'themes-three', 'gen.json'), '{"topics":[],"links":[]}');
    const second = await runSermonsBuild(w.options);
    expect(second.written).toBe(1);
    expect((await runSermonsBuild(w.options)).written).toBe(0);
    expect(filesUnder(w.options.themesOutDir).map((f) => [f, readFileSync(join(w.options.themesOutDir, f), 'utf8')])).toEqual(before);
  });

  it('refuses a theme source whose kind is not themes, and a sermon source listed as a theme', async () => {
    const w = themeWorkspace();
    writeFileSync(w.options.configFile, JSON.stringify({ repo: 'https://github.com/Jonathan-A-White/sermon-index', commit: SHA, sources: ['spurgeon-20'], themes: ['spurgeon-20'] }));
    await expect(runSermonsBuild(w.options)).rejects.toThrow(/spurgeon-20.*themes/);
  });

  it('fingerprints the theme source\'s book files, and changes with a link', () => {
    const files = (ref: string): Map<string, ThemeBookFile> => new Map([['rom', { topics: [{ id: 'a', label: 'A', parts: [], verses: 1 }], links: [{ topic: 'a', ref }] }]]);
    expect(sourceFingerprint(files('5.8'))).toMatch(/^[0-9a-f]{12}$/);
    expect(sourceFingerprint(files('5.8'))).toBe(sourceFingerprint(files('5.8')));
    expect(sourceFingerprint(files('5.8'))).not.toBe(sourceFingerprint(files('5.9')));
  });
});

describe('themeLicence: the licence line index.json keeps', () => {
  it('is the module\'s DistributionLicense line alone, so the About line\'s trademark stays out of the files the app reads', () => {
    expect(themeLicence('DistributionLicense=Public Domain\nAbout=A history, under the trademark of "X".')).toBe('DistributionLicense=Public Domain');
    expect(themeLicence('Public domain, said in a sentence.')).toBe('Public domain, said in a sentence.');
  });
});
