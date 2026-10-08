// scripts/data-build.ts on small slices of both source files (tests/fixtures/data/); never the network.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildData, cleanDefinition, lemmaFor, parseLexicon, runBuild } from '../../scripts/data-build';
import type { Chapter, Verse } from '../../src/data/chapter';

const msb = readFileSync('tests/fixtures/data/msb-slice.tsv', 'utf8');
const tbesg = readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8');
const lexicon = parseLexicon(tbesg);
const built = buildData(msb, lexicon);

function chapter(path: string): Chapter {
  const file = built.chapters.find((c) => c.path === path);
  if (!file) throw new Error(`no ${path} in ${built.chapters.map((c) => c.path).join(', ')}`);
  return file.chapter;
}
function verse(path: string, n: number): Verse {
  const v = chapter(path).verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n} in ${path}`);
  return v;
}
const englishOf = (v: Verse) => v.e.map((c) => c.t).join(' ');

describe('the lexicon (TBESG)', () => {
  it('maps a Strong number without padding to its lemma, kept in NFC', () => {
    expect(lemmaFor(lexicon, 'G686')).toBe('ἄρα');
    expect(lemmaFor(lexicon, 'G686')).toBe('ἄρα'.normalize('NFC'));
    expect(lemmaFor(lexicon, 'G3588')).toBe('ὁ');
    expect(lemmaFor(lexicon, 'G999999')).toBeUndefined();
  });

  it('reads the gloss, and resolves a Strong number with several entries to its first', () => {
    expect(lexicon.get('G686')?.gloss).toBe('therefore');
    expect(lexicon.get('G32')?.gloss).toBe('angel');
    expect(lexicon.get('G1')?.lemma).toBe('α, Ἀλφα');
    expect(lexicon.get('G1')?.gloss).toBe('Alpha');
  });

  it('has the definition as plain text with no markup, references or daggers', () => {
    const d = lexicon.get('G686')?.definition ?? '';
    expect(d.length).toBeGreaterThan(20);
    expect(d).not.toMatch(/[<>]/);
    expect(d).not.toContain('†');
    expect(d).not.toMatch(/Rom\.7:21/);
    expect(cleanDefinition('<b>ἄρα</b>, <BR /> <i>particle</i>.† <BR /> (AS)')).toBe('ἄρα, particle.');
    expect(cleanDefinition("see <ref='Rom.1.1'>Rom.1:1</ref> here")).toBe('see here');
  });

  it('cuts a long definition at a word boundary with an ellipsis', () => {
    const long = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const cut = cleanDefinition(long);
    expect(cut.length).toBeLessThanOrEqual(301);
    expect(cut.endsWith('…')).toBe(true);
    const kept = cut.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    expect(long[kept.length]).toBe(' ');
  });
});

describe('the index', () => {
  it('lists the books present in canonical order, with chapter and verse counts', () => {
    expect(built.index.books.map((b) => b.code)).toEqual(['mat', 'jhn', 'rom', 'rev']);
    const rom = built.index.books.find((b) => b.code === 'rom');
    expect(rom).toEqual({ code: 'rom', name: 'Romans', chapters: 8, verses: [0, 0, 0, 0, 0, 0, 0, 2] });
    expect(built.index.books.find((b) => b.code === 'jhn')?.verses).toEqual([3]);
  });
});

describe('a chapter file', () => {
  it('names the book, the code and the chapter', () => {
    const c = chapter('rom/8.json');
    expect(c.book).toBe('Romans');
    expect(c.code).toBe('rom');
    expect(c.chapter).toBe(8);
    expect(c.verses.map((v) => v.n)).toEqual([1, 2]);
  });

  it('puts the Greek words of a verse in Greek order', () => {
    const words = verse('rom/8.json', 1).g.map((w) => w.t);
    expect(words.slice(0, 4)).toEqual(['Οὐδὲν', 'ἄρα', 'νῦν', 'κατάκριμα']);
    expect(words.slice(0, 2).join(' ')).toBe('Οὐδὲν ἄρα');
    expect(verse('jhn/1.json', 1).g.slice(0, 2).map((w) => w.t).join(' ')).toBe('Ἐν ἀρχῇ');
  });

  it('gives each Greek word its Strong number, lemma, translit and parsing code, and decodes the code once per file', () => {
    const c = chapter('rom/8.json');
    const ara = verse('rom/8.json', 1).g.find((w) => w.t === 'ἄρα');
    expect(ara).toMatchObject({ s: 'G686', l: 'ἄρα', tr: 'ara', p: 'PRT' });
    expect(c.lex.G686.g).toBe('therefore');
    expect(c.lex.G686.d.length).toBeGreaterThan(20);
    expect(c.parse.PRT).toBe('particle');
    const participle = verse('rom/8.json', 1).g.find((w) => w.p === 'V-PAP-DPM');
    expect(c.parse['V-PAP-DPM']).toBe('verb, present active participle, dative plural masculine');
    expect(participle?.t).toBe('περιπατοῦσιν');
  });

  it('keeps the lexicon once per file, not once per word', () => {
    const c = chapter('rom/8.json');
    const strongs = new Set(verse('rom/8.json', 1).g.concat(verse('rom/8.json', 2).g).map((w) => w.s));
    expect(Object.keys(c.lex).sort()).toEqual([...strongs].sort());
    expect(JSON.stringify(c).split('"therefore"').length - 1).toBe(1);
  });

  it('puts the English chunks in English order, so the verse reads as the MSB reads', () => {
    const v = verse('rom/8.json', 1);
    expect(englishOf(v)).toBe(
      'Therefore there is now no condemnation for those who are in Christ Jesus, who do not walk according to the flesh but according to the Spirit.',
    );
    expect(englishOf(v)).toContain('who do not walk according to the flesh');
  });

  it('links each Greek word to its English chunk and back', () => {
    const v = verse('rom/8.json', 1);
    const ara = v.g.findIndex((w) => w.t === 'ἄρα');
    const chunk = v.e[v.g[ara].e ?? -1];
    expect(chunk.t).toBe('Therefore');
    expect(chunk.g).toEqual([ara]);
    // Every link is mutual.
    v.g.forEach((w, i) => {
      if (w.e !== undefined) expect(v.e[w.e].g).toContain(i);
    });
    v.e.forEach((c, j) => c.g.forEach((i) => expect(v.g[i].e).toBe(j)));
  });

  it('marks a chunk that carries supplied [words], and strips the brackets', () => {
    const v = verse('rom/8.json', 1);
    const flesh = v.e.find((c) => c.t === 'the flesh');
    expect(flesh?.s).toBe(1);
    expect(v.e.find((c) => c.t === 'Therefore')?.s).toBeUndefined();
    expect(englishOf(v)).not.toMatch(/[[\]{}]/);
  });

  it('gives a Greek word with no English no link, and no empty chunk', () => {
    const v = verse('jhn/1.json', 1);
    const ton = v.g.find((w) => w.t === 'τὸν');
    expect(ton?.e).toBeUndefined();
    expect(v.e.every((c) => c.t.length > 0 && c.g.length > 0)).toBe(true);
    expect(englishOf(v)).toBe('In the beginning was the Word, and the Word was with God, and the Word was God.');
  });

  it('joins a word shown as ". . ." to the chunk that completes it', () => {
    const v = verse('mat/1.json', 17);
    const generations = v.e.filter((c) => c.t.includes('generations'));
    expect(generations.length).toBeGreaterThan(0);
    expect(generations.some((c) => c.g.length >= 3)).toBe(true);
    expect(englishOf(v)).not.toContain('. . .');
    expect(englishOf(v)).not.toContain('vvv');
  });

  it('reads the four rows the table shifts by a column: translit and Strong number recovered', () => {
    const v = verse('rev/17.json', 8);
    const to = v.g[0];
    expect(to.t).toBe('Τὸ');
    expect(to.tr).toBe('to');
    expect(to.s).toBe('G3588');
    expect(to.l).toBe('ὁ');
  });

  it('gives the Strong number the table leaves as 0 from the fix list', () => {
    const w = verse('mat/18.json', 12).g.find((x) => x.t === 'ἐνενήκοντα');
    expect(w).toMatchObject({ s: 'G1768', l: 'ἐνενήκοντα' });
    expect(chapter('mat/18.json').lex.G1768.g).toBe('ninety');
  });

  it('keeps quotation marks and punctuation on the English chunk', () => {
    const v = verse('rom/8.json', 1);
    expect(v.e.find((c) => c.t.startsWith('Jesus'))?.t).toBe('Jesus,');
    expect(v.e[v.e.length - 1].t).toBe('the Spirit.');
  });
});

describe('writing the files', () => {
  function run(raw: string, out: string, downloads: string[] = []) {
    return runBuild({
      rawDir: raw,
      outDir: out,
      download: async (url, dest) => {
        downloads.push(url);
        mkdirSync(join(dest, '..'), { recursive: true });
        writeFileSync(dest, url.includes('majoritybible') ? msb : tbesg);
      },
    });
  }
  const listing = (dir: string): string[] => readdirSync(dir, { recursive: true }).map(String).filter((p) => p.endsWith('.json')).sort();

  it('writes index.json and one compact file per chapter, and a second run changes nothing', async () => {
    const base = mkdtempSync(join(tmpdir(), 'lampas-data-'));
    try {
      const raw = join(base, 'raw');
      const out1 = join(base, 'out1');
      const out2 = join(base, 'out2');
      await run(raw, out1);
      await run(raw, out2);
      expect(listing(out1)).toEqual(['index.json', 'jhn/1.json', 'mat/1.json', 'mat/18.json', 'rev/17.json', 'rom/8.json']);
      expect(listing(out2)).toEqual(listing(out1));
      for (const p of listing(out1)) expect(readFileSync(join(out2, p), 'utf8')).toBe(readFileSync(join(out1, p), 'utf8'));
      const text = readFileSync(join(out1, 'rom/8.json'), 'utf8');
      expect(text).not.toMatch(/\n/);
      expect(text.startsWith('{"book":"Romans"')).toBe(true);
      expect(JSON.parse(text).chapter).toBe(8);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('downloads each raw file only when it is not already there', async () => {
    const base = mkdtempSync(join(tmpdir(), 'lampas-data-'));
    try {
      const raw = join(base, 'raw');
      const downloads: string[] = [];
      await run(raw, join(base, 'out'), downloads);
      expect(downloads).toHaveLength(2);
      expect(downloads[0]).toBe('https://majoritybible.com/msb_nt_tables.tsv');
      expect(downloads[1]).toContain('STEPBible-Data');
      expect(existsSync(join(raw, 'msb_nt_tables.tsv'))).toBe(true);
      await run(raw, join(base, 'out'), downloads);
      expect(downloads).toHaveLength(2);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('section headings and paragraph starts', () => {
  it('carries the MSB heading on the verse it comes before, as plain English', () => {
    expect(verse('rom/8.json', 1).h).toBe('Walking by the Spirit');
    expect(verse('jhn/1.json', 1).h).toBe('The Beginning');
    expect(verse('rom/8.json', 2).h).toBeUndefined();
    expect(JSON.stringify(chapter('rom/8.json'))).not.toMatch(/hdg|<p /);
  });

  it('marks a verse the MSB starts a paragraph at with p = 1, and a verse inside a paragraph with no p', () => {
    expect(verse('rom/8.json', 1).p).toBe(1);
    expect(verse('mat/18.json', 12).p).toBe(1);
    expect(verse('rom/8.json', 2).p).toBeUndefined();
  });

  it('does not change a verse\'s English chunks or Greek words', () => {
    const bare = msb
      .split('\n')
      .map((line, i) => {
        if (i === 0) return line;
        const f = line.split('\t');
        f[13] = '';
        f[15] = '';
        return f.join('\t');
      })
      .join('\n');
    const plain = buildData(bare, lexicon);
    for (const { path, chapter: c } of plain.chapters) {
      for (const v of c.verses) {
        expect(v.h).toBeUndefined();
        expect(v.p).toBeUndefined();
        const full = verse(path, v.n);
        expect(full.e).toEqual(v.e);
        expect(full.g).toEqual(v.g);
      }
    }
  });
});

describe('the committed Romans 8', () => {
  const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

  it('has section headings and paragraph starts from the MSB', () => {
    const headed = rom8.verses.filter((v) => v.h);
    expect(headed.length).toBeGreaterThanOrEqual(1);
    expect(headed[0].n).toBe(1);
    expect(headed[0].h).toBe('Walking by the Spirit');
    expect(rom8.verses.filter((v) => v.p === 1).length).toBeGreaterThan(1);
    expect(rom8.verses[0].p).toBe(1);
  });

  it('keeps each verse\'s English reading as the MSB has it', () => {
    const v1 = rom8.verses[0];
    expect(v1.e.map((c) => c.t).join(' ')).toBe(
      'Therefore there is now no condemnation for those who are in Christ Jesus, who do not walk according to the flesh but according to the Spirit.',
    );
    expect(rom8.verses.every((v) => v.e.length > 0 && v.e.every((c) => c.t.length > 0))).toBe(true);
  });
});
