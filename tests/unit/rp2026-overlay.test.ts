// scripts/data/rp2026.ts: the Robinson-Pierpont 2026 wording changes laid over the 2018 base (mw-9ji6ek0.2). The 2026 release is read from a small
// zip written here (nothing of it is committed but data/rp2026-overlay.json, which the build writes) and never the network.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildData, parseLexicon, runBuild } from '../../scripts/data-build';
import {
  RP2026_FILES,
  RP2026_SHA256,
  applyOverlay,
  diffEdition,
  diffVerse,
  greekOf,
  loadRp2026,
  overlayReport,
  parseRp2026,
  unzip,
  type OverlayEntry,
} from '../../scripts/data/rp2026';
import type { Chapter, GreekWord, Verse, VariantPlace } from '../../src/data/chapter';

// ---------------------------------------------------------------- a zip made here

function zipOf(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, 'latin1');
    const data = deflateRawSync(raw);
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    parts.push(local, nameBytes, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

// ---------------------------------------------------------------- the ASCII release

const REV_ASC = '\r\n     11:16 kai oi eikosi tessarev presbuteroi oi enwpion\r\ntou yeou kayhmenoi\r\n     11:17 legontev\r\n     13:14 kai plana\r\n';

describe('the RP 2026 ASCII release', () => {
  it('is Greek letters: v the final sigma, y theta, q psi, c chi, x xi, f phi', () => {
    expect(greekOf('apokaluqiv')).toBe('αποκαλυψις');
    expect(greekOf('yeov')).toBe('θεος');
    expect(greekOf('cristou')).toBe('χριστου');
    expect(greekOf('exekenthsan')).toBe('εξεκεντησαν');
    expect(greekOf('fwnh')).toBe('φωνη');
    expect(greekOf('basileia')).toBe('βασιλεια');
    expect(greekOf('hmwn')).toBe('ημων');
  });

  it('reads a verse reference line and the wrapped lines after it, as chapter:verse -> words', () => {
    const verses = parseRp2026(REV_ASC);
    expect([...verses.keys()]).toEqual(['11:16', '11:17', '13:14']);
    expect(verses.get('11:16')).toEqual(['και', 'οι', 'εικοσι', 'τεσσαρες', 'πρεσβυτεροι', 'οι', 'ενωπιον', 'του', 'θεου', 'καθημενοι']);
    expect(verses.get('13:14')).toEqual(['και', 'πλανα']);
  });

  it('refuses a character it does not know, so a changed release cannot slip past the build', () => {
    expect(() => parseRp2026('     1:1 kai j\r\n')).toThrow(/1:1/);
  });
});

describe('the zip', () => {
  it('reads each file of a zip by name', () => {
    const files = unzip(zipOf({ 'RE05.ASC': REV_ASC, 'MT05.ASC': '     1:1 bivlov\r\n' }));
    expect([...files.keys()].sort()).toEqual(['MT05.ASC', 'RE05.ASC']);
    expect(files.get('MT05.ASC')!.toString('latin1')).toBe('     1:1 bivlov\r\n');
  });

  it('is checked against the pinned sha256, and refused with another', async () => {
    expect(RP2026_SHA256).toMatch(/^[0-9a-f]{64}$/);
    const zip = zipOf(Object.fromEntries(Object.values(RP2026_FILES).map((f) => [f, ''])));
    const dir = mkdtempSync(join(tmpdir(), 'lampas-rp2026-'));
    try {
      const download = async (_url: string, dest: string): Promise<void> => {
        mkdirSync(join(dest, '..'), { recursive: true });
        writeFileSync(dest, zip);
      };
      const books = await loadRp2026(dir, download, () => undefined, createHash('sha256').update(zip).digest('hex'));
      expect(books.size).toBe(27);
      await expect(loadRp2026(dir, download, () => undefined, RP2026_SHA256)).rejects.toThrow(/sha256/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------- the diff

describe('the words that differ between RP 2018 and RP 2026, by their letters', () => {
  const rev1116 = 'Καὶ οἱ εἴκοσι τέσσαρες πρεσβύτεροι οἱ ἐνώπιον τοῦ θρόνου τοῦ θεοῦ καθήμενοι ἐπὶ τοὺς θρόνους αὐτῶν'.split(' ');

  it('finds nothing in the same words with other accents, capitals, marks or a final sigma', () => {
    expect(diffVerse("Λέγω δὲ ὑμῖν ἀπ’ ἄρτι ζῇς".split(' '), 'λεγω δε υμιν απ αρτι ζης'.split(' '))).toEqual([]);
  });

  it('gives the 2018 words and the 2026 words of a run, with a word of what stands around it', () => {
    const to = 'και οι εικοσι τεσσαρες πρεσβυτεροι οι ενωπιον του θεου καθημενοι επι τους θρονους αυτων'.split(' ');
    const [one, ...more] = diffVerse(rev1116, to);
    expect(more).toEqual([]);
    expect(one.from.map((w) => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()).join(' ')).toMatch(/θρονου/);
    expect(one.from.length).toBeGreaterThan(one.to.length);
    expect(one.to).toContain('θεου');
  });

  it('keeps two words that changed places as one run', () => {
    expect(diffVerse('Παῦλος δέσμιος χριστοῦ Ἰησοῦ καὶ Τιμόθεος'.split(' '), 'παυλος δεσμιος ιησου χριστου και τιμοθεος'.split(' '))).toEqual([
      { from: ['δέσμιος', 'χριστοῦ', 'Ἰησοῦ', 'καὶ'], to: ['δεσμιος', 'ιησου', 'χριστου', 'και'] },
    ]);
  });

  it('writes a word given instead of another as an entry with a word on each side of it', () => {
    expect(diffVerse('ἐκ τοῦ γεννήματος τῆς ἀμπέλου'.split(' '), 'εκ του γενηματος της αμπελου'.split(' '))).toEqual([
      { from: ['τοῦ', 'γεννήματος', 'τῆς'], to: ['του', 'γενηματος', 'της'] },
    ]);
  });

  it('lists the entries of the books, with the book, chapter and verse', () => {
    const rp2018 = new Map([['rev', new Map([['13:14', 'Καὶ πλανᾷ ὃ εἶχεν τὴν πληγὴν καὶ ἔζησεν'], ['13:15', 'Καὶ ἐδόθη']])]]);
    const rp2026 = new Map([['rev', new Map([['13:14', 'και πλανα ο ειχεν πληγην και εζησεν'.split(' ')], ['13:15', 'και εδοθη'.split(' ')]])]]);
    expect(diffEdition(rp2018, rp2026)).toEqual([
      { book: 'Revelation', chapter: 13, verse: 14, from: ['εἶχεν', 'τὴν', 'πληγὴν'], to: ['ειχεν', 'πληγην'] },
    ]);
  });

  it('refuses a verse one edition has and the other lacks', () => {
    const rp2018 = new Map([['rev', new Map([['13:14', 'Καὶ πλανᾷ']])]]);
    expect(() => diffEdition(rp2018, new Map([['rev', new Map<string, string[]>()]]))).toThrow(/Revelation 13:14/);
  });

  it('is committed as data/rp2026-overlay.json with Revelation 11:16 and 13:14 in it', () => {
    const entries = JSON.parse(readFileSync('data/rp2026-overlay.json', 'utf8')) as OverlayEntry[];
    expect(entries.length).toBeGreaterThan(0);
    const rev = entries.filter((e) => e.book === 'Revelation').map((e) => `${e.chapter}:${e.verse}`);
    expect(rev).toContain('11:16');
    expect(rev).toContain('13:14');
    const at = (c: number, v: number): OverlayEntry => entries.find((e) => e.book === 'Revelation' && e.chapter === c && e.verse === v)!;
    expect(at(11, 16).from.join(' ')).toContain('θρόνου');
    expect(at(13, 14).from).toContain('τὴν');
    expect(at(13, 14).to).not.toContain('την');
  });
});

// ---------------------------------------------------------------- laying it on a chapter

const word = (t: string, over: Partial<GreekWord> = {}): GreekWord => ({ t, tr: t, s: 'G1', l: t, p: 'N-NSM', ...over });
/** a verse of the words, each with its own English chunk (a word named in `bare` has none) */
function verseOf(words: string[], bare: string[] = []): Verse {
  const g = words.map((t) => word(t));
  const e: Verse['e'] = [];
  g.forEach((w, i) => {
    if (bare.includes(w.t)) return;
    w.e = e.length;
    e.push({ t: `e${i}`, g: [i] });
  });
  return { n: 16, g, e };
}
const entry = (from: string[], to: string[]): OverlayEntry => ({ book: 'Revelation', chapter: 11, verse: 16, from, to });
const texts = (v: Verse): string => v.g.map((w) => w.t).join(' ');

describe('applying an overlay entry to a verse', () => {
  it('takes out a word the 2026 text lacks, and the other words keep their English and their place', () => {
    const v = verseOf(['οἱ', 'ἐνώπιον', 'τοῦ', 'θρόνου', 'τοῦ', 'θεοῦ', 'καθήμενοι'], ['τοῦ', 'θρόνου']);
    const units: VariantPlace[] = [
      { v: 16, w: [6], base: 'καθήμενοι', alts: [{ code: 'B', text: 'οἳ κάθηνται' }] },
      { v: 16, w: [3], base: 'θρόνου', alts: [{ code: 'B', text: 'θρόνων' }] },
    ];
    const result = applyOverlay('Revelation', 11, [v], units, [entry(['ἐνώπιον', 'τοῦ', 'θρόνου', 'τοῦ', 'θεοῦ'], ['ενωπιον', 'του', 'θεου'])]);
    expect(texts(v)).toBe('οἱ ἐνώπιον τοῦ θεοῦ καθήμενοι');
    expect(result.applied).toBe(1);
    expect(result.units).toEqual([{ v: 16, w: [4], base: 'καθήμενοι', alts: [{ code: 'B', text: 'οἳ κάθηνται' }] }]);
    expect(result.dropped).toBe(1);
    // the links stay mutual: e[g[i].e].g holds i and g[e[j].g[k]].e is j
    v.g.forEach((w, i) => {
      if (w.e !== undefined) expect(v.e[w.e].g).toContain(i);
    });
    v.e.forEach((c, j) => c.g.forEach((i) => expect(v.g[i].e).toBe(j)));
  });

  it('gives a respelled word the 2026 letters with the accents it had, and its beta-code', () => {
    const v = verseOf(['ἐκ', 'τοῦ', 'γεννήματος', 'τῆς']);
    v.g[2].tr = 'gennhmatov';
    const result = applyOverlay('Revelation', 11, [v], [], [entry(['τοῦ', 'γεννήματος', 'τῆς'], ['του', 'γενηματος', 'της'])]);
    expect(v.g.map((w) => w.t)).toEqual(['ἐκ', 'τοῦ', 'γενήματος', 'τῆς']);
    expect(v.g[2]).toMatchObject({ tr: 'genhmatov', s: 'G1', e: 2 });
    expect(result.applied).toBe(1);
  });

  it('moves two words that change places, with their English, and carries the units to their new place', () => {
    const v = verseOf(['δέσμιος', 'χριστοῦ', 'Ἰησοῦ', 'καὶ']);
    const units: VariantPlace[] = [{ v: 16, w: [2], base: 'Ἰησοῦ', alts: [{ code: 'N', text: 'Ἰησοῦ χριστοῦ' }] }];
    const result = applyOverlay('Revelation', 11, [v], units, [entry(['δέσμιος', 'χριστοῦ', 'Ἰησοῦ', 'καὶ'], ['δεσμιος', 'ιησου', 'χριστου', 'και'])]);
    expect(texts(v)).toBe('δέσμιος Ἰησοῦ χριστοῦ καὶ');
    expect(v.g.map((w) => v.e[w.e!].t)).toEqual(['e0', 'e2', 'e1', 'e3']);
    expect(result.units.map((u) => u.w)).toEqual([[1]]);
  });

  it('is already done when the verse reads the 2026 words (Romans 13:9 σεαυτόν, which the MSB table has as εαυτόν)', () => {
    const v = verseOf(['ὡς', 'εαυτόν']);
    const before = JSON.stringify(v);
    const result = applyOverlay('Revelation', 11, [v], [], [entry(['ὡς', 'σεαυτόν'], ['ως', 'εαυτον'])]);
    expect(JSON.stringify(v)).toBe(before);
    expect(result).toMatchObject({ applied: 0, already: 1 });
  });

  it('drops a unit whose other readings now read as the text', () => {
    const v = verseOf(['τοῦ', 'γεννήματος', 'τῆς']);
    const units: VariantPlace[] = [{ v: 16, w: [1], base: 'γεννήματος', alts: [{ code: 'N', text: 'γενήματος' }] }];
    const result = applyOverlay('Revelation', 11, [v], units, [entry(['τοῦ', 'γεννήματος', 'τῆς'], ['του', 'γενηματος', 'της'])]);
    expect(result.units).toEqual([]);
    expect(result.dropped).toBe(1);
  });

  it('fails, naming the verse, when the 2018 words are not in it and it does not read the 2026 words either', () => {
    const v = verseOf(['οἱ', 'ἐνώπιον', 'τοῦ', 'θεοῦ']);
    expect(() => applyOverlay('Revelation', 11, [v], [], [entry(['ἐνώπιον', 'τοῦ', 'θρόνου', 'τοῦ', 'θεοῦ'], ['ενωπιον', 'του', 'θρονου', 'θεου'])])).toThrow(
      /Revelation 11:16.*ἐνώπιον τοῦ θρόνου τοῦ θεοῦ/,
    );
  });

  it('fails, naming the verse, when the chapter has no such verse', () => {
    expect(() => applyOverlay('Revelation', 11, [verseOf(['οἱ'])], [], [{ ...entry(['οἱ'], ['ο']), verse: 99 }])).toThrow(/Revelation 11:99/);
  });

  it('fails rather than invent a word: a word the 2026 text adds has no lemma or parsing code to be given', () => {
    const v = verseOf(['οἱ', 'ἐνώπιον', 'θεοῦ']);
    expect(() => applyOverlay('Revelation', 11, [v], [], [entry(['ἐνώπιον', 'θεοῦ'], ['ενωπιον', 'του', 'θεου'])])).toThrow(/Revelation 11:16.*του/);
  });

  it('leaves the entries of another chapter alone', () => {
    const v = verseOf(['οἱ', 'θεοῦ']);
    const result = applyOverlay('Revelation', 12, [v], [], [entry(['οἱ'], ['ο'])]);
    expect(result.applied + result.already).toBe(0);
  });
});

// ---------------------------------------------------------------- the whole build

describe('the build lays the overlay on the chapters', () => {
  const msb = readFileSync('tests/fixtures/data/msb-slice.tsv', 'utf8');
  const lexicon = parseLexicon(readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8'));

  it('fails when an overlay entry’s 2018 words are not in the verse, with a message that names the verse', () => {
    const overlay: OverlayEntry[] = [{ book: 'Revelation', chapter: 17, verse: 8, from: ['τὸ', 'ἅγιον', 'θηρίον'], to: ['το', 'θηριον'] }];
    expect(() => buildData(msb, lexicon, undefined, overlay)).toThrow(/Revelation 17:8/);
  });

  it('applies an entry to the verse and says how many it applied', () => {
    const overlay: OverlayEntry[] = [{ book: 'Revelation', chapter: 17, verse: 8, from: ['ὃ', 'εἶδες', 'ἦν'], to: ['ο', 'ειδον', 'ην'] }];
    const built = buildData(msb, lexicon, undefined, overlay);
    const verse = built.chapters.find((c) => c.path === 'rev/17.json')!.chapter.verses[0];
    expect(verse.g[3]).toMatchObject({ t: 'εἶδον', tr: 'eidon' });
    expect(built.overlay).toMatchObject({ applied: 1, already: 0 });
  });

  it('fetches the zip, prints the count of the overlay and the books, writes data/rp2026-overlay.json and lays it on the chapter', async () => {
    const base = mkdtempSync(join(tmpdir(), 'lampas-rp2026-build-'));
    const raw = join(base, 'raw');
    mkdirSync(raw, { recursive: true });
    writeFileSync(join(raw, 'msb_nt_tables.tsv'), msb);
    writeFileSync(join(raw, 'tbesg.txt'), readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8'));
    const rev2018 = 'chapter,verse,text\n17,8,"Τὸ θηρίον, ὃ εἶδες, ἦν, καὶ οὐκ ἔστιν, καὶ μέλλει ἀναβαίνειν ἐκ τῆς ἀβύσσου, καὶ εἰς ἀπώλειαν ὑπάγειν. Καὶ θαυμάσονται οἱ κατοικοῦντες ἐπὶ τῆς γῆς, ὧν οὐ γέγραπται τὰ ὀνόματα ἐπὶ τὸ βιβλίον τῆς ζωῆς ἀπὸ καταβολῆς κόσμου, βλεπόντων ὅτι ἦν τὸ θηρίον, καὶ οὐκ ἔστιν, καὶ παρέσται."\n';
    const rev2026 =
      '     17:8 to yhrion o eidon hn kai ouk estin kai mellei anabainein ek ths abussou kai eis apwleian upagein kai yaumasontai oi katoikountev epi ths ghv wn ou gegraptai ta onomata epi to biblion ths zwhv apo katabolhv kosmou blepontwn oti hn to yhrion kai ouk estin kai parestai\r\n';
    const files = Object.fromEntries(Object.values(RP2026_FILES).map((f) => [f, f === 'RE05.ASC' ? rev2026 : '']));
    const zip = zipOf(files);
    const sha = (parts: Buffer[]): string => parts.reduce((h, p) => h.update(p), createHash('sha256')).digest('hex');
    const variantsFiles = (name: string): string => (name === 'REV' ? rev2018 : 'chapter,verse,text\n');
    const apparatusSha = sha(Object.values(await import('../../scripts/data/variants').then((m) => m.VARIANTS_FILES)).map((n) => Buffer.from(variantsFiles(n))));
    const log: string[] = [];
    const overlayFile = join(base, 'overlay.json');
    try {
      await runBuild({
        rawDir: raw,
        outDir: join(base, 'out'),
        overlayFile,
        untaggedFile: join(base, 'untagged.txt'),
        log: (line) => log.push(line),
        variantsSha256: apparatusSha,
        rp2026Sha256: sha([zip]),
        download: async (url, dest) => {
          mkdirSync(join(dest, '..'), { recursive: true });
          writeFileSync(dest, url.endsWith('.zip') ? zip : variantsFiles(url.split('/').pop()!.replace(/\.csv$/, '')));
        },
      });
      const entries = JSON.parse(readFileSync(overlayFile, 'utf8')) as OverlayEntry[];
      expect(entries).toEqual([{ book: 'Revelation', chapter: 17, verse: 8, from: ['ὃ', 'εἶδες', 'ἦν'], to: ['ο', 'ειδον', 'ην'] }]);
      expect(log).toContain(overlayReport(entries, { applied: 1, already: 0, dropped: 0 })[0]);
      expect(log.some((l) => /RP 2026 overlay: 1 entry in 1 book \(Revelation 1\)/.test(l))).toBe(true);
      const rev = JSON.parse(readFileSync(join(base, 'out', 'rev', '17.json'), 'utf8')) as Chapter;
      expect(rev.verses[0].g[3].t).toBe('εἶδον');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('the report', () => {
  it('says how many entries, in how many books, which, and what was done with them', () => {
    const entries: OverlayEntry[] = [
      { book: 'Matthew', chapter: 26, verse: 29, from: ['γεννήματος'], to: ['γενηματος'] },
      { book: 'Revelation', chapter: 11, verse: 16, from: ['x'], to: ['y'] },
      { book: 'Revelation', chapter: 13, verse: 14, from: ['x'], to: ['y'] },
    ];
    const [first, second] = overlayReport(entries, { applied: 2, already: 1, dropped: 1 });
    expect(first).toBe('RP 2026 overlay: 3 entries in 2 books (Matthew 1, Revelation 2): 2 laid on the chapters, 1 already read so, 1 variant unit dropped');
    expect(second).toBe('  Matthew 26:29, Revelation 11:16, Revelation 13:14');
  });
});
