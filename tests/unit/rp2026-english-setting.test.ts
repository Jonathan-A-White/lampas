// Settings > Reading 'English from the 2026 Greek' (mw-9ji6ek0.33): where the RP 2026 Greek changes the English (data/rp2026-english.json, mw-9ji6ek0.32), the Reader shows Lampas's
// rendering over the MSB's words, marked, while the setting is On; Off leaves the chapter exactly as it is.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { fillChapter, type Chapter } from '../../src/data/chapter';
import { layRp2026English, rp2026Entry } from '../../src/data/rp2026English';
import { HELP_PAGES } from '../../src/help';
import { PREFACE_EDITION_LINE } from '../../src/preface';
import { rp2026EnglishSetting } from '../../src/settings/definitions';
import { settingOf } from '../../src/settings/registry';
import { getSetting, setSetting } from '../../src/settings/store';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const chapterFile = (book: string, n: number): Chapter => fillChapter(JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter);

describe('the setting', () => {
  it('is Off to start, offers Off and On, and has a help line', () => {
    expect(rp2026EnglishSetting.key).toBe('rp2026English');
    expect(rp2026EnglishSetting.label).toBe('English from the 2026 Greek');
    expect(rp2026EnglishSetting.default).toBe('off');
    expect(rp2026EnglishSetting.allowed).toEqual({ kind: 'choice', values: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }] });
    expect(rp2026EnglishSetting.help).toMatch(/2026/);
    expect(settingOf('rp2026English')?.label).toBe('English from the 2026 Greek');
  });

  it('is kept', async () => {
    expect(await getSetting(rp2026EnglishSetting)).toBe('off');
    await setSetting(rp2026EnglishSetting, 'on');
    expect(await getSetting(rp2026EnglishSetting)).toBe('on');
  });
});

describe('laying the 2026 English on a chapter', () => {
  const phm = chapterFile('phm', 1);

  it('Off: the chapter is the very same object', () => {
    expect(layRp2026English(phm, 'off')).toBe(phm);
  });

  it('On: Philemon 1:1 reads "of Jesus Christ," in one marked chunk that holds both Greek words, and no other verse changes', () => {
    const laid = layRp2026English(phm, 'on');
    expect(laid).not.toBe(phm);
    const before = phm.verses[0];
    const after = laid.verses[0];
    expect(before.e.map((c) => c.t).slice(0, 5)).toEqual(['Paul,', 'a prisoner', 'of Christ', 'Jesus,', 'and']);
    expect(after.e.map((c) => c.t).slice(0, 4)).toEqual(['Paul,', 'a prisoner', 'of Jesus Christ,', 'and']);
    const chunk = after.e[2];
    expect(chunk.rp).toBe(rp2026Entry('Philemon', 1, 1)?.key);
    expect(chunk.g).toEqual([2, 3]);
    expect(after.e.length).toBe(before.e.length - 1);
    expect(after.g).toEqual(before.g.map((w, i) => ({ ...w, e: after.g[i].e })));
    // every word still points at the chunk that holds it
    after.g.forEach((w, i) => { if (w.e !== undefined) expect(after.e[w.e].g).toContain(i); });
    expect(laid.verses.slice(1)).toEqual(phm.verses.slice(1));
  });

  it('On: a chapter whose changes leave the English alone (Matthew 26:29) is the very same object', () => {
    const mt = chapterFile('mat', 26);
    expect(layRp2026English(mt, 'on')).toBe(mt);
  });

  it('every entry that changes the English finds its MSB words in its verse', () => {
    for (const [book, code, n] of [['Philemon', 'phm', 1]] as const) {
      const entry = rp2026Entry(book, n, 1);
      expect(entry?.changesEnglish).toBe(true);
      const ch = chapterFile(code, n);
      expect(layRp2026English(ch, 'on').verses[0].e.some((c) => c.rp === entry?.key)).toBe(true);
    }
  });
});

describe('what the entry carries for the sheet', () => {
  it('has the MSB English, the Lampas English, the Greek and each one’s source and licence', () => {
    const e = rp2026Entry('Philemon', 1, 1)!;
    expect(e.msb).toBe('of Christ Jesus');
    expect(e.lampas).toBe('of Jesus Christ');
    expect(e.from).toContain('χριστοῦ');
    expect(e.to).toContain('ιησου');
    expect(e.provenance.greek.licence).toMatch(/freely distributed/);
    expect(e.provenance.rendering?.kind).toBe('Lampas rendering, AI-made at build time');
  });
  it('is none for a verse with no change, and none for one that leaves the English alone', () => {
    expect(rp2026Entry('Romans', 8, 1)).toBeUndefined();
    expect(rp2026Entry('Matthew', 26, 29)).toBeUndefined();
  });
});

describe('Help and the Preface', () => {
  it('Help says what the setting does, in a line of the Reader’s page', () => {
    const reader = HELP_PAGES.find((p) => p.id === 'reader')!;
    expect(reader.body.some((p) => p.includes('English from the 2026 Greek'))).toBe(true);
  });
  it('the Preface’s Greek paragraph says, of the text, that the English can follow the 2026 Greek', () => {
    expect(PREFACE_EDITION_LINE).toMatch(/Philemon 1:1[^.]*English|English[^.]*2026/);
    expect(PREFACE_EDITION_LINE).toContain('made for Lampas by an AI model');
  });
});
