// tests/unit/rp2026-english.test.ts: the English of the RP 2026 wording changes (mw-9ji6ek0.32, data/rp2026-english.json, scripts/data/rp2026English.ts).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OVERLAY_FILE, type OverlayEntry } from '../../scripts/data/rp2026';
import {
  RP2026_ENGLISH_FILE,
  checkRp2026English,
  entryKey,
  readRp2026English,
  rp2026EnglishReport,
  type Rp2026EnglishFile,
} from '../../scripts/data/rp2026English';

const overlay = JSON.parse(readFileSync(OVERLAY_FILE, 'utf8')) as OverlayEntry[];
const file = readRp2026English(RP2026_ENGLISH_FILE);
const of = (book: string, chapter: number, verse: number) => {
  const entry = overlay.find((e) => e.book === book && e.chapter === chapter && e.verse === verse)!;
  return file[entryKey(entry)];
};

describe('data/rp2026-english.json', () => {
  it('holds one entry for each change of the overlay, and nothing else', () => {
    expect(Object.keys(file).sort()).toEqual(overlay.map(entryKey).sort());
    expect(() => checkRp2026English(overlay, file)).not.toThrow();
  });

  it('Philemon 1:1 swaps χριστοῦ and Ἰησοῦ: the English changes, from the MSB’s "Christ Jesus" to Lampas’s "Jesus Christ"', () => {
    const e = of('Philemon', 1, 1);
    expect(e.changesEnglish).toBe(true);
    expect(e.msb).toBe('of Christ Jesus');
    expect(e.lampas).toBe('of Jesus Christ');
  });

  it('Revelation 13:14 drops τὴν: decided, and the MSB’s "had been wounded" is kept because it never rendered the article', () => {
    const e = of('Revelation', 13, 14);
    expect(e.from).toEqual(['εἶχεν', 'τὴν', 'πληγὴν']);
    expect(e.to).toEqual(['ειχεν', 'πληγην']);
    expect(e.changesEnglish).toBe(false);
    expect(e.lampas).toBeNull();
    expect(e.note).toMatch(/article/);
  });

  it('Matthew 26:29 γεννήματος → γενήματος is one fruit in English: the English does not change', () => {
    const e = of('Matthew', 26, 29);
    expect(e.changesEnglish).toBe(false);
    expect(e.msb).toMatch(/fruit/);
    expect(e.lampas).toBeNull();
  });

  it('says where each Greek and English comes from, and what each licence is', () => {
    for (const e of Object.values(file)) {
      expect(e.provenance.greek.source).toMatch(/Robinson-Pierpont 2026/);
      expect(e.provenance.greek.licence).toMatch(/freely distributed/);
      expect(e.provenance.msb).toMatch(/Majority Standard Bible.*public domain/);
      expect(e.provenance.decision.model).toBe('claude-sonnet-5-5');
      expect(e.provenance.decision.date).toBe('2026-10-28');
      if (e.changesEnglish) expect(e.provenance.rendering).toEqual({ kind: 'Lampas rendering, AI-made at build time', model: 'claude-sonnet-5-5', date: '2026-10-28' });
      else expect(e.provenance.rendering).toBeUndefined();
    }
  });
});

describe('the check', () => {
  const entry: OverlayEntry = { book: 'Philemon', chapter: 1, verse: 1, from: ['a'], to: ['b'] };
  const good = (): Rp2026EnglishFile => ({ [entryKey(entry)]: { ...of('Philemon', 1, 1), ref: 'Philemon 1:1', from: ['a'], to: ['b'] } });

  it('names an overlay change with no entry', () => {
    expect(() => checkRp2026English([entry], {})).toThrow(/Philemon 1:1.*no entry/);
  });
  it('names an entry of a change that is no longer in the overlay', () => {
    expect(() => checkRp2026English([], good())).toThrow(/Philemon 1:1.*not in the overlay/);
  });
  it('wants Lampas’s English exactly where the English changes', () => {
    const noEnglish = good();
    noEnglish[entryKey(entry)].lampas = null;
    expect(() => checkRp2026English([entry], noEnglish)).toThrow(/Philemon 1:1.*changes the English.*lampas/);
    const extra = good();
    extra[entryKey(entry)].changesEnglish = false;
    expect(() => checkRp2026English([entry], extra)).toThrow(/Philemon 1:1.*does not change the English/);
  });
  it('wants the rendering’s provenance where there is a rendering', () => {
    const bare = good();
    delete bare[entryKey(entry)].provenance.rendering;
    expect(() => checkRp2026English([entry], bare)).toThrow(/Philemon 1:1.*provenance/);
  });
  it('reads a file that is not there as empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-rp2026-english-'));
    try {
      expect(readRp2026English(join(dir, 'none.json'))).toEqual({});
      writeFileSync(join(dir, 'e.json'), JSON.stringify(good()));
      expect(Object.keys(readRp2026English(join(dir, 'e.json')))).toEqual([entryKey(entry)]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the report', () => {
  it('counts the changes and how many alter the English, and names them', () => {
    expect(rp2026EnglishReport(overlay, file)).toEqual([
      'RP 2026 English: 5 changes, 1 alters the English, 4 do not',
      '  alters: Philemon 1:1 ("of Christ Jesus" → "of Jesus Christ")',
    ]);
  });
});
