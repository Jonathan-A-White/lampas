// The Old Testament build (scripts/data-build-ot.ts, mw-uqlxea.1) on a slice of the real Berean table: tests/fixtures/data/bsb_tables_slice.tsv is the header row and the rows
// of the verse groups of Genesis 1:1-5, Jonah 1:1-3 and 1:17 and Daniel 2:4, taken from data/raw/bsb_tables.tsv with
//   awk -F'\t' -v refs='Genesis 1:1|...|Daniel 2:4' 'BEGIN{...} FNR==NR{if($13 in want)g[$4]=1;next} FNR==1||($4 in g&&$5!="Greek")' bsb_tables.tsv bsb_tables.tsv
// (docs/data.md has the line) and tbesh_slice.txt is the TBESH entries of their Strong's numbers.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { runBuild } from '../../scripts/data-build';
import { checkHeader } from '../../scripts/data/bereanTable';
import { cleanHebrewGloss, parseTbes } from '../../scripts/data/tbes';
import { BSB_FILE, MISPLACED_READ_RIGHT, OT_EXPECTED_HEADER, TBESH_FILE, addSpellings, buildOt, changedPairings, dotsRows, fixPairing, markWaitingByGloss, misplacedChunks, otLexicon, runBuildOt, type BuiltChapter } from '../../scripts/data-build-ot';
import { wordGloss, type BookIndex, type Chapter, type Verse } from '../../src/data/chapter';
import type { FrequencyEntry } from '../../src/data/frequency';
import type { LemmaLexicon } from '../../src/data/lexicon';

const table = readFileSync('tests/fixtures/data/bsb_tables_slice.tsv', 'utf8');
const tbesh = readFileSync('tests/fixtures/data/tbesh_slice.txt', 'utf8');
const lex = otLexicon(tbesh);
const linesOf = (text: string): string[] => text.split(/\r?\n/);

async function build(text = table) {
  const chapters: BuiltChapter[] = [];
  const rest = await buildOt(linesOf(text), lex, (c) => void chapters.push(c));
  return { chapters, ...rest };
}
const find = (chapters: BuiltChapter[], path: string): Chapter => {
  const found = chapters.find((c) => c.path === path);
  if (!found) throw new Error(`no chapter ${path} in ${chapters.map((c) => c.path).join(', ')}`);
  return found.chapter;
};

const tmpDirs: string[] = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-data-ot-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

describe('the table header', () => {
  const header = linesOf(table)[0].split('\t');
  it('passes when every column the build reads is named as it was', () => {
    expect(() => checkHeader(header, OT_EXPECTED_HEADER, 'BSB table')).not.toThrow();
  });
  it('stops the build with the differing column named when one is renamed', async () => {
    const renamed = [...header];
    renamed[18] = ' BSB edition ';
    expect(() => checkHeader(renamed, OT_EXPECTED_HEADER, 'BSB table')).toThrow(/column 18 should be " BSB version ", is " BSB edition "/);
    const text = [renamed.join('\t'), ...linesOf(table).slice(1)].join('\n');
    await expect(build(text)).rejects.toThrow(/column 18/);
  });
});

describe('Genesis 1', () => {
  it('says its source language and its translation', async () => {
    const { chapters } = await build();
    const gen1 = find(chapters, 'gen/1.json');
    expect(gen1.lang).toBe('hbo');
    expect(gen1.translation).toBe('msb');
    expect(gen1.book).toBe('Genesis');
    expect(gen1.code).toBe('gen');
    expect(gen1.chapter).toBe(1);
    expect(Object.keys(gen1)).toEqual(['book', 'code', 'chapter', 'lang', 'translation', 'lex', 'parse', 'verses']);
  });

  it('has 7 words in verse 1, in Hebrew order, the keys the New Testament has', async () => {
    const { chapters } = await build();
    const v1 = find(chapters, 'gen/1.json').verses[0];
    expect(v1.n).toBe(1);
    expect(v1.g.map((w) => w.tr)).toEqual(['bə·rê·šîṯ', 'bā·rā', '’ĕ·lō·hîm', '’êṯ', 'haš·šā·ma·yim', 'wə·’êṯ', 'hā·’ā·reṣ']);
    expect(v1.g[0]).toEqual({ t: 'בְּרֵאשִׁ֖ית', tr: 'bə·rê·šîṯ', s: 'H7225', l: 'רֵאשִׁית', p: 'Prep-b | N-fs', e: 0 });
    expect(v1.g.map((w) => w.s)).toEqual(['H7225', 'H1254', 'H430', 'H853', 'H8064', 'H853', 'H776']);
  });

  it('has the English chunks in English order with g, and the object marker without e', async () => {
    const { chapters } = await build();
    const v1 = find(chapters, 'gen/1.json').verses[0];
    // the table gives 'and' to וְאֵת and 'the earth' to הָאָרֶץ: two chunks, as the New Testament has one per word that has English
    expect(v1.e).toEqual([
      { t: 'In the beginning', g: [0] },
      { t: 'God', g: [2] },
      { t: 'created', g: [1] },
      { t: 'the heavens', g: [4] },
      { t: 'and', g: [5] },
      { t: 'the earth.', g: [6] },
    ]);
    expect(v1.g[3].t).toBe('אֵ֥ת');
    expect(v1.g[3].e).toBeUndefined();
    expect(v1.g.map((w) => w.e)).toEqual([0, 2, 1, undefined, 3, 4, 5]);
  });

  it('puts the heading on Genesis 1:1 and the paragraph mark on the verse that opens one', async () => {
    const { chapters } = await build();
    const gen1 = find(chapters, 'gen/1.json');
    expect(gen1.verses[0].h).toBe('The Creation');
    expect(gen1.verses[0].p).toBe(1);
    expect(gen1.verses[2].h).toBe('The First Day');
    expect(gen1.verses[1].h).toBeUndefined();
  });

  it('has the lexicon of its Strong numbers, the definition cut at 300 characters', async () => {
    const { chapters } = await build();
    const gen1 = find(chapters, 'gen/1.json');
    expect(gen1.lex.H430.g).toMatch(/God/);
    expect(gen1.lex.H7225.d.length).toBeGreaterThan(0);
    for (const entry of Object.values(gen1.lex)) expect(entry.d.length).toBeLessThanOrEqual(301);
    expect(Object.keys(gen1.lex)).toEqual([...Object.keys(gen1.lex)].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))));
  });

  it('decodes V-Qal-Perf-3ms from the table\'s own long parsing column', async () => {
    const { chapters } = await build();
    const gen1 = find(chapters, 'gen/1.json');
    expect(gen1.parse['V-Qal-Perf-3ms']).toBe('Verb - Qal - Perfect - third person masculine singular');
    expect(gen1.parse['Prep-b | N-fs']).toBe('Preposition-b | Noun - feminine singular');
    for (const v of gen1.verses) for (const w of v.g) expect(gen1.parse[w.p], w.p).toBeTruthy();
  });
});

describe('Daniel 2:4', () => {
  it('keeps the Aramaic words as words of its Hebrew chapter', async () => {
    const { chapters } = await build();
    const dan2 = find(chapters, 'dan/2.json');
    expect(dan2.lang).toBe('hbo');
    const v4 = dan2.verses[0];
    expect(v4.n).toBe(4);
    expect(v4.g.map((w) => w.t)).toEqual(
      expect.arrayContaining(['הַכַּשְׂדִּ֛ים', 'וַֽיְדַבְּר֧וּ', 'מַלְכָּא֙', 'חֱיִ֔י', 'וּפִשְׁרָ֥א']),
    );
    expect(v4.g).toHaveLength(12);
    // every word has its English, in the table's English order: 'Then the astrologers answered the king in Aramaic'
    expect(v4.e.map((c) => c.t).slice(0, 4)).toEqual(['Then the astrologers', 'answered', 'the king', 'in Aramaic,']);
  });
});

describe('Jonah 1', () => {
  it('is four verses of the slice (1:1-3 and 1:17), named in the index', async () => {
    const { chapters, books } = await build();
    expect(find(chapters, 'jon/1.json').verses.map((v) => v.n)).toEqual([1, 2, 3, 17]);
    const jon = books.find((b) => b.code === 'jon');
    expect(jon?.name).toBe('Jonah');
    expect(jon?.chapters).toBe(1);
    expect(jon?.verses).toEqual([4]);
  });

  it('1:17: the fish is "fish" (H1709, not "Fish (Gate)") and the Piel וַיְמַן is "to appoint" (H4487), the lemma saying "to count"', async () => {
    const { chapters } = await build();
    const jon = find(chapters, 'jon/1.json');
    const v17 = jon.verses.find((v) => v.n === 17)!;
    expect(jon.lex.H1709.g).toBe('fish');
    expect(jon.lex.H4487.g).toBe('to count');
    const piel = v17.g.find((w) => w.s === 'H4487')!;
    expect(piel.gl).toBe('to appoint');
    expect(wordGloss(jon, piel)).toBe('to appoint');
    // a word whose stem has no sense of its own, and a noun, carry no gl; wordGloss reads the lemma's
    const qal = v17.g.find((w) => w.s === 'H1104')!;
    const fish = v17.g.find((w) => w.s === 'H1709')!;
    expect(qal).not.toHaveProperty('gl');
    expect(fish).not.toHaveProperty('gl');
    expect(wordGloss(jon, fish)).toBe('fish');
    expect(Object.keys(piel)).toEqual(['t', 'tr', 's', 'l', 'p', 'gl', 'e']);
  });

  it('wordGloss prefers the word\'s own gl to the lemma\'s gloss', () => {
    const chapter = { lex: { H1: { g: 'to count', d: '' } } } as unknown as Chapter;
    expect(wordGloss(chapter, { t: '', tr: '', s: 'H1', l: '', p: '', gl: 'to appoint' })).toBe('to appoint');
    expect(wordGloss(chapter, { t: '', tr: '', s: 'H1', l: '', p: '' })).toBe('to count');
  });
});

describe('the build', () => {
  it('reads the table as a stream: the first chapter is out before the last line is read', async () => {
    let pulled = 0;
    async function* lines(): AsyncGenerator<string> {
      for (const line of linesOf(table)) {
        pulled++;
        yield line;
      }
    }
    const total = linesOf(table).length;
    let pulledAtFirst = -1;
    await buildOt(lines(), lex, () => {
      if (pulledAtFirst < 0) pulledAtFirst = pulled;
    });
    expect(pulledAtFirst).toBeGreaterThan(0);
    expect(pulledAtFirst).toBeLessThan(total);
  });

  it('gives the same fingerprints on two runs, and a fingerprint is the first 12 hex of the file\'s bytes', async () => {
    const a = await build();
    const b = await build();
    expect(a.books.map((x) => x.fingerprints)).toEqual(b.books.map((x) => x.fingerprints));
    const gen = a.books.find((x) => x.code === 'gen');
    expect(gen?.fingerprints[0]).toMatch(/^[0-9a-f]{12}$/);
  });

  it('gives a word the table has no Strong number for an empty s and l, and counts it nowhere', async () => {
    // the first word of Jonah 1:1 is דְּבַר־ (H1697, 'də·ḇar-'): blank its Strong number
    const out = linesOf(table).map((line) => {
      const f = line.split('\t');
      if (f[7] === 'də·ḇar-' && f[10] === '1697') f[10] = '';
      return f.join('\t');
    });
    const { chapters, lexicon, frequency } = await build(out.join('\n'));
    const word = find(chapters, 'jon/1.json').verses[0].g.find((w) => w.tr === 'də·ḇar-');
    expect(word).toMatchObject({ s: '', l: '' });
    expect(Object.keys(find(chapters, 'jon/1.json').lex)).not.toContain('');
    expect(Object.keys(lexicon)).not.toContain('');
    expect(frequency.map((e) => e.strongs)).not.toContain('');
  });

  it('writes lexicon-hbo.json and frequency-hbo.json in the shapes of lexicon.json and frequency.json', async () => {
    const { lexicon, frequency } = await build();
    expect(lexicon['רֵאשִׁית']).toEqual({ g: expect.any(String), s: 'H7225', c: 'noun' });
    expect(Object.keys(lexicon)).toEqual([...Object.keys(lexicon)].sort());
    const god = frequency.find((e) => e.strongs === 'H430');
    expect(god).toMatchObject({ strongs: 'H430', lemma: 'אֱלֹהִים', proper: false });
    expect(god?.count).toBeGreaterThanOrEqual(5);
    const jonah = frequency.find((e) => e.strongs === 'H3124');
    expect(jonah?.proper).toBe(true);
    expect(frequency.map((e) => e.count)).toEqual([...frequency.map((e) => e.count)].sort((x, y) => y - x));
  });
});

describe('the files', () => {
  function setup(): { raw: string; out: string; download: () => Promise<void> } {
    const raw = tmp();
    writeFileSync(join(raw, BSB_FILE), table);
    writeFileSync(join(raw, TBESH_FILE), tbesh);
    return {
      raw,
      out: join(raw, 'out'),
      download: async () => {
        throw new Error('the raw files are there; nothing should be downloaded');
      },
    };
  }
  const dump = (dir: string) =>
    readdirSync(dir, { recursive: true })
      .map(String)
      .filter((p) => p.endsWith('.json'))
      .sort()
      .map((p) => `${p}\n${readFileSync(join(dir, p), 'utf8')}`)
      .join('\n');

  it('writes the chapters, the index of the books it has, lexicon-hbo.json and frequency-hbo.json; the second run writes nothing', async () => {
    const { raw, out, download } = setup();
    const first = await runBuildOt({ rawDir: raw, outDir: out, download });
    expect(first.chapters).toBe(3);
    expect(existsSync(join(out, 'gen/1.json'))).toBe(true);
    expect(existsSync(join(out, 'jon/1.json'))).toBe(true);
    expect(existsSync(join(out, 'dan/2.json'))).toBe(true);
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as BookIndex;
    expect(index.books.map((b) => [b.code, b.lang])).toEqual([['gen', 'hbo'], ['dan', 'hbo'], ['jon', 'hbo']]);
    const lexicon = JSON.parse(readFileSync(join(out, 'lexicon-hbo.json'), 'utf8')) as LemmaLexicon;
    const frequency = JSON.parse(readFileSync(join(out, 'frequency-hbo.json'), 'utf8')) as FrequencyEntry[];
    expect(Object.keys(lexicon).length).toBeGreaterThan(20);
    expect(frequency.length).toBeGreaterThan(20);
    // the app asks for the two Hebrew lists by the fingerprints index.json carries (src/data/chapter.ts listUrl, mw-fnvjof.17.41)
    const fingerprint = (file: string) => createHash('sha256').update(readFileSync(join(out, file))).digest('hex').slice(0, 12);
    expect(index.lists).toEqual({ 'lexicon-hbo': fingerprint('lexicon-hbo.json'), 'frequency-hbo': fingerprint('frequency-hbo.json') });
    const before = dump(out);
    const second = await runBuildOt({ rawDir: raw, outDir: out, download });
    expect(second.written).toBe(0);
    expect(dump(out)).toBe(before);
  });

  it('keeps the New Testament books of the index already on disk, and writes none of its chapters', async () => {
    const { raw, out, download } = setup();
    mkdirSync(out, { recursive: true });
    const nt: BookIndex = { books: [{ code: 'mat', name: 'Matthew', chapters: 28, verses: [25], fingerprints: ['abcdefabcdef'], lang: 'grc' }] };
    writeFileSync(join(out, 'index.json'), JSON.stringify(nt));
    writeFileSync(join(out, 'lexicon.json'), '{}');
    await runBuildOt({ rawDir: raw, outDir: out, download });
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as BookIndex;
    expect(index.books.map((b) => b.code)).toEqual(['gen', 'dan', 'jon', 'mat']);
    expect(readFileSync(join(out, 'lexicon.json'), 'utf8')).toBe('{}');
  });

  it("is left alone by the New Testament build, which keeps the Old Testament's books in the index", async () => {
    const { raw, out, download } = setup();
    await runBuildOt({ rawDir: raw, outDir: out, download });
    const before = dump(out);
    writeFileSync(join(raw, 'msb_nt_tables.tsv'), readFileSync('tests/fixtures/data/msb-slice.tsv'));
    writeFileSync(join(raw, 'tbesg.txt'), readFileSync('tests/fixtures/data/tbesg-slice.txt'));
    await runBuild({ rawDir: raw, outDir: out, download, variants: false });
    for (const path of ['gen/1.json', 'jon/1.json', 'dan/2.json', 'lexicon-hbo.json', 'frequency-hbo.json']) {
      expect(existsSync(join(out, path)), path).toBe(true);
      expect(readFileSync(join(out, path), 'utf8')).toBe(before.split(`${path}\n`)[1].split('\n')[0]);
    }
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as BookIndex;
    expect(index.books.map((b) => [b.code, b.lang])).toEqual([['gen', 'hbo'], ['dan', 'hbo'], ['jon', 'hbo'], ['mat', 'grc'], ['jhn', 'grc'], ['rom', 'grc'], ['rev', 'grc']]);
    expect(index.lists).toEqual((JSON.parse(before.split('index.json\n')[1].split('\n')[0]) as BookIndex).lists);
  });

  it('downloads a raw file that is absent, from the Berean site and the STEPBible-Data Lexicons folder', async () => {
    const raw = tmp();
    const asked: string[] = [];
    const download = async (url: string, dest: string) => {
      asked.push(url);
      writeFileSync(dest, dest.endsWith(BSB_FILE) ? table : tbesh);
    };
    await runBuildOt({ rawDir: raw, outDir: join(raw, 'out'), download });
    expect(asked).toEqual([
      'https://bereanbible.com/bsb_tables.tsv',
      'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt',
    ]);
  });
});

describe('the shared reader of the TBES lexicons', () => {
  it('reads the Hebrew number of a sense lettered a, b as the number: H1254 is to create', () => {
    const entry = otLexicon(tbesh).get('H1254');
    expect(entry?.lemma).toBe('בָּרָא');
    expect(entry?.gloss).toBe('to create');
    expect(entry?.pos).toBe('verb');
  });
  it('marks a name by the morph\'s language N', () => {
    expect(otLexicon(tbesh).get('H3124')?.name).toBe(true);
    expect(otLexicon(tbesh).get('H430')?.name).toBeUndefined();
  });
  it("writes a range with a bracketed word as one list of meanings, as the Greek's range", () => {
    expect(cleanHebrewGloss('to come (in): come')).toBe('to come (in), come');
    expect(cleanHebrewGloss('to come (in): (sun)set')).toBe('to come (in), (sun)set');
    expect(cleanHebrewGloss('mighty: ox')).toBe('mighty, ox');
    expect(cleanHebrewGloss('land: country/planet')).toBe('land, country, planet');
    expect(cleanHebrewGloss('to create')).toBe('to create');
  });
  it('reads Greek keys only as before', () => {
    const g = parseTbes('G0001\tG0001 =\tG0001\tΑ\ta\tG:N\tAlpha\tletter\n', { letter: 'G', gloss: (_l, raw) => raw });
    expect(g.get('G1')?.lemma).toBe('Α');
  });
});

describe('the other spellings of a number (mw-fnvjof.17.40)', () => {
  const row = (key: string, lemma: string, gloss: string, how = '=', morph = 'H:V') => `${key}\t${key.toUpperCase()} ${how}\t${key.toUpperCase()}\t${lemma}\tt\t${morph}\t${gloss}\tdef`;
  const text = [
    row('H3384a', 'יָרָא', 'to shoot'),
    row('H3384b', 'יָרָה', 'to show'),
    row('H7183a', 'קַשָּׁב', 'attentive', '= a Spelling of', 'H:A'),
    row('H7183b', 'קַשֻּׁב', 'attentive', '=', 'H:A'),
    row('H7161a', 'קֶ֫רֶן', 'horn', '=', 'H:N'),
    row('H7161b', 'קַרְנַ֫יִם', 'Karnaim', '= a Name of', 'N:N'),
    row('H7311a', 'רוּם', 'to exalt'),
    row('H7311b', 'רָנַן', 'to sing', '= a Meaning of'),
  ].join('\n');
  const tb = parseTbes(text, { letter: 'H', gloss: (_l, g) => g });

  it("gives a number's other plain or spelling lines of its own part of speech, never a name or a meaning", () => {
    expect(tb.spellings?.('H3384')).toEqual([{ lemma: 'יָרָה', gloss: 'to show', definition: '', pos: 'verb' }]);
    expect(tb.spellings?.('H7183')?.map((e) => e.lemma)).toEqual(['קַשֻּׁב']);
    expect(tb.spellings?.('H7161')).toEqual([]);
    expect(tb.spellings?.('H7311')).toEqual([]);
  });

  it('adds the spelling to the lexicon under the same number, marked v, after the text and never over a lemma the text has', () => {
    const base: LemmaLexicon = { 'יָרָא': { g: 'to shoot', s: 'H3384', c: 'verb' }, 'יָרָה': { g: 'x', s: 'H1', c: 'verb' } };
    expect(addSpellings(base, tb)['יָרָה']).toEqual({ g: 'x', s: 'H1', c: 'verb' });
    const only: LemmaLexicon = { 'יָרָא': { g: 'to shoot', s: 'H3384', c: 'verb' } };
    expect(addSpellings(only, tb)).toEqual({ ...only, 'יָרָה': { g: 'to show', s: 'H3384', c: 'verb', v: true } });
  });
});

// mw-fnvjof.17.161: Isaiah 33:8, the rows of the real table (tests/fixtures/data/bsb_isa33_8.tsv, tbesh_isa33_8.txt: the verse group 18288 and the TBESH lines of its numbers).
// "travel . . . has ceased." is עֹבֵר, then אֹרַח ('. . .'), then שָׁבַת: the '. . .' word's English is in the chunk BEFORE it. "and human life" is on לֹא in the table, a slip of the source
// (אֱנוֹשׁ is 'human'; the '. . .' is on it), which the build corrects (PAIRING_FIXES).
describe("Isaiah 33:8: a chunk lists the Hebrew words it renders, not its neighbour's (mw-fnvjof.17.161)", () => {
  const isaiahTable = readFileSync('tests/fixtures/data/bsb_isa33_8.tsv', 'utf8');
  const isaiahLex = otLexicon(readFileSync('tests/fixtures/data/tbesh_isa33_8.txt', 'utf8'));
  const strongsOfChunk = async (text: string): Promise<string[]> => {
    const chapters: BuiltChapter[] = [];
    await buildOt(linesOf(isaiahTable), isaiahLex, (c) => void chapters.push(c));
    const verse = find(chapters, 'isa/33.json').verses.find((v) => v.n === 8)!;
    const chunk = verse.e.find((c) => c.t === text);
    if (!chunk) throw new Error(`no chunk ${text}: ${verse.e.map((c) => c.t).join(' | ')}`);
    return chunk.g.map((i) => verse.g[i].s);
  };

  it('"and human life" holds אֱנוֹשׁ (H582) alone', async () => expect(await strongsOfChunk('and human life')).toEqual(['H582']));
  it('"is disregarded." holds לֹא (H3808) and חָשַׁב (H2803)', async () => expect(await strongsOfChunk('is disregarded.')).toEqual(['H3808', 'H2803']));
  it('"travel" holds עֹבֵר (H5674) and אֹרַח (H734)', async () => expect(await strongsOfChunk('travel')).toEqual(['H5674', 'H734']));
  it('"has ceased." holds שָׁבַת (H7673) alone', async () => expect(await strongsOfChunk('has ceased.')).toEqual(['H7673']));
});

// mw-fnvjof.17.193: Genesis 21:11 'Now this matter distressed [in the eyes of] Abraham greatly': the table's '. . .' is on בְּעֵינֵי and its English ('in the eyes of') is meant for 'Abraham', the chunk
// AFTER it, not for 'distressed'. tests/fixtures/data/bsb_gen21_11.tsv has the verse's eight rows (the sorts and words of the published table; the table itself is not in a worktree).
describe("Genesis 21:11: a '. . .' word the table meant for the chunk after it (mw-fnvjof.17.193)", () => {
  const verseLex = otLexicon(`${tbesh}\n${readFileSync('tests/fixtures/data/tbesh_gen21_11.txt', 'utf8')}`);
  const verseOf = async () => {
    const chapters: BuiltChapter[] = [];
    await buildOt(linesOf(readFileSync('tests/fixtures/data/bsb_gen21_11.tsv', 'utf8')), verseLex, (c) => void chapters.push(c));
    return find(chapters, 'gen/21.json').verses.find((v) => v.n === 11)!;
  };
  const strongsOfChunk = async (text: string): Promise<string[]> => {
    const verse = await verseOf();
    const chunk = verse.e.find((c) => c.t === text);
    if (!chunk) throw new Error(`no chunk ${text}: ${verse.e.map((c) => c.t).join(' | ')}`);
    return chunk.g.map((i) => verse.g[i].s);
  };

  it('"Abraham" holds בְּעֵינֵי (H5869) and אַבְרָהָם (H85)', async () => expect(await strongsOfChunk('Abraham')).toEqual(['H5869', 'H85']));
  it('"distressed" holds וַיֵּרַע (H7489) alone', async () => expect(await strongsOfChunk('distressed')).toEqual(['H7489']));
  it("every other '. . .' word still joins the chunk before it: only the verse named in PAIRING_FIXES waits", async () => {
    const chapters: BuiltChapter[] = [];
    await buildOt(linesOf(readFileSync('tests/fixtures/data/bsb_isa33_8.tsv', 'utf8')), otLexicon(readFileSync('tests/fixtures/data/tbesh_isa33_8.txt', 'utf8')), (c) => void chapters.push(c));
    const verse = find(chapters, 'isa/33.json').verses.find((v) => v.n === 8)!;
    expect(verse.e.find((c) => c.t === 'travel')!.g.map((i) => verse.g[i].s)).toEqual(['H5674', 'H734']);
  });
});

describe('the build says how far a change of pairing reached (mw-fnvjof.17.161)', () => {
  const chapterOf = (pairs: Array<[number, number[]]>): Chapter =>
    ({ verses: pairs.map(([n, g]) => ({ n, g: [{ t: 'a', tr: '', s: 'H1', l: 'a', p: 'x', e: 0 }, { t: 'b', tr: '', s: 'H2', l: 'b', p: 'x', e: g.includes(1) ? 0 : 1 }], e: [{ t: 'x', g }] })) }) as unknown as Chapter;

  it('counts the verses whose chunks list other words, and a verse the file lacks', () => {
    const before = chapterOf([[1, [0, 1]], [2, [0]]]);
    expect(changedPairings(before, chapterOf([[1, [0, 1]], [2, [0]]]))).toEqual([]);
    expect(changedPairings(before, chapterOf([[1, [0]], [2, [0]], [3, [0]]]))).toEqual([1, 3]);
    expect(changedPairings(undefined, chapterOf([[1, [0]]]))).toEqual([1]);
  });

  it('a pairing fix whose words the verse lacks stops the build, naming the verse', () => {
    expect(() => fixPairing('Isaiah', 33, 8, [])).toThrow(/Isaiah 33:8: the pairing fix names H3808/);
    expect(() => fixPairing('Isaiah', 33, 9, [])).not.toThrow();
  });
});

// mw-fnvjof.17.210: a '. . .' word whose gloss is in the chunk after it and not in the one before waits for that chunk (markWaitingByGloss). tests/fixtures/data/bsb_waits_gloss.tsv has the rows of the real table for
// Exodus 21:26 ('as compensation for' [תַּחַת, עֵינוֹ '. . .'] 'the eye.' [עַיִן]) and Genesis 5:6 ('105' with שָׁנִים '. . .', then 'years old,'), tbesh_waits_gloss.txt their numbers' lines.
describe("a '. . .' word whose gloss is in the chunk after it (mw-fnvjof.17.210)", () => {
  const waitsLex = otLexicon(readFileSync('tests/fixtures/data/tbesh_waits_gloss.txt', 'utf8'));
  const versesOf = async () => {
    const chapters: BuiltChapter[] = [];
    await buildOt(linesOf(readFileSync('tests/fixtures/data/bsb_waits_gloss.tsv', 'utf8')), waitsLex, (c) => void chapters.push(c));
    return { exo: find(chapters, 'exo/21.json').verses.find((v) => v.n === 26)!, gen: find(chapters, 'gen/5.json').verses.find((v) => v.n === 6)! };
  };
  const strongsOf = (verse: Verse, text: string): string[] => {
    const chunk = verse.e.find((c) => c.t === text);
    if (!chunk) throw new Error(`no chunk ${text}: ${verse.e.map((c) => c.t).join(' | ')}`);
    return chunk.g.map((i) => verse.g[i].s);
  };

  it('"the eye." holds both עַיִן words, and "as compensation for" holds תַּחַת alone', async () => {
    const { exo } = await versesOf();
    expect(strongsOf(exo, 'the eye.')).toEqual(['H5869', 'H5869']);
    expect(strongsOf(exo, 'as compensation for')).toEqual(['H8478']);
  });
  it('a numeral before it leaves it there: "105" keeps שָׁנִים, "years old," holds שָׁנָה alone', async () => {
    const { gen } = await versesOf();
    expect(strongsOf(gen, '105')).toContain('H8141');
    expect(strongsOf(gen, 'years old,')).toEqual(['H8141']);
  });
  it('markWaitingByGloss marks the word and says how many; a second call marks none', () => {
    const word = (over: object) => ({ sourceSort: 1, englishSort: 1, text: 'x', translit: '', parse: '', strongs: 'H1', english: '', begQ: '', tail: '', par: '', note: '', ...over });
    const words = [word({ sourceSort: 1, englishSort: 1, english: 'for' }), word({ sourceSort: 2, englishSort: 2, english: '. . .', strongs: 'H5869' }), word({ sourceSort: 3, englishSort: 3, english: 'the eye.' })];
    const gloss = (s: string) => (s === 'H5869' ? 'eye' : '');
    expect(markWaitingByGloss(words, gloss)).toBe(1);
    expect(words[1].waits).toBe(true);
    expect(markWaitingByGloss(words, gloss)).toBe(0);
    const other = [words[0], { ...words[1], waits: undefined }, { ...words[2], english: 'the tooth.' }];
    expect(markWaitingByGloss(other, gloss)).toBe(0);
  });
  it('dotsRows lists the waiting word with the English before and after it, and the Genesis 21:11 shape still joined before', () => {
    const word = (over: object) => ({ sourceSort: 1, englishSort: 1, text: 'x', translit: '', parse: '', strongs: 'H1', english: '', begQ: '', tail: '', par: '', note: '', ...over });
    const words = [word({ sourceSort: 1, englishSort: 1, english: 'for', text: 'a' }), word({ sourceSort: 2, englishSort: 2, english: '. . .', strongs: 'H5869', text: 'b', waits: true }), word({ sourceSort: 3, englishSort: 3, english: 'the eye.', text: 'c' })];
    expect(dotsRows('Exodus 21:26', words, () => 'eye').map((r) => [r.kind, r.before, r.after])).toEqual([['waits', 'for', 'the eye.']]);
    // Genesis 21:11: 'distressed' (Hebrew word 1) 'greatly' (2) then the '. . .' word (3) and 'Abraham' (4) in the Hebrew; in English 'distressed', the '. . .', 'Abraham', 'greatly'
    const same = [word({ sourceSort: 1, englishSort: 1, english: 'distressed' }), word({ sourceSort: 2, englishSort: 4, english: 'greatly' }), word({ sourceSort: 3, englishSort: 2, english: '. . .' }), word({ sourceSort: 4, englishSort: 3, english: 'Abraham' })];
    expect(dotsRows('Genesis 21:11', same, () => '').map((r) => [r.kind, r.before, r.after])).toEqual([['next', 'distressed', 'Abraham']]);
  });
});

describe('two chunks that sit on each other\'s Hebrew word (mw-fnvjof.17.210, npm run pairing:sweep -- --glosses)', () => {
  const glosses: Record<string, string> = { H1: 'to look', H2: 'house' };
  const verse = (a: string, b: string): Verse => ({
    n: 1,
    g: [{ t: 'a', tr: '', s: 'H1', l: 'a', p: 'V-Qal', e: 0 }, { t: 'b', tr: '', s: 'H2', l: 'b', p: 'N-ms', e: 1 }],
    e: [{ t: a, g: [0] }, { t: b, g: [1] }],
  } as unknown as Verse);
  it('finds two words whose English is on each other', () => {
    expect(misplacedChunks('Test 1:1', verse('the house', 'he looks'), (s) => glosses[s]).map((m) => m.strongs)).toEqual(['H1', 'H2']);
  });
  it('finds nothing where each chunk holds its own word', () => {
    expect(misplacedChunks('Test 1:1', verse('he looks', 'the house'), (s) => glosses[s])).toEqual([]);
  });
  it('the verses read and found right are named, and none is Isaiah 33:8 (fixed in PAIRING_FIXES)', () => {
    expect(MISPLACED_READ_RIGHT.has('Psalms 78:1')).toBe(true);
    expect(MISPLACED_READ_RIGHT.has('Isaiah 33:8')).toBe(false);
  });
});
