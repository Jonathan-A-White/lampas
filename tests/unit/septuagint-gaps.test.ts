// tests/unit/septuagint-gaps.test.ts — Swete's lacuna brackets in the Septuagint's Greek view (mw-u2w5klk.280; the Governor's question 2026-11-06, "What do the brackets mean?", on Genesis 2).
// Swete prints Codex Alexandrinus for Genesis and brackets the letters lost from its damaged leaves ('[Καὶ συνετε]λέσθησαν'). The brackets are inside a word's `t` in public/data-lxx;
// loadSeptuagintChapter keeps the word's `t` bare (so lookup, speech, copy and search never see a bracket) and the printed form in `d`; the Greek view draws `d` only while
// Settings > Show manuscript gaps is On. Display only: the data files are not changed.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { forgetLxxIndex, loadSeptuagintChapter } from '../../src/data/lxxChapter';
import { septuagintGapsSetting } from '../../src/settings/definitions';
import { settingOf } from '../../src/settings/registry';
import { ROWS, visibleRows, readValues } from '../../src/settings/rows';
import { getSetting, setSetting } from '../../src/settings/store';
import { VerseText } from '../../src/reader/VerseText';
import { withoutGaps } from '../../src/reader/septuagint';
import type { Lookup } from '../../src/WordSheet';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetLxxIndex();
});
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const word = (t: string, l: string): GreekWord => ({ t, tr: '', s: '', l, p: 'N-NSM', y: '1', c: 0.9 });
/** Genesis 2:1 as public/data-lxx holds it (Swete's printing, brackets inside the words): '[Καὶ συνετε]λέσθησαν [ὁ οὐρανὸς κ]αὶ ...' */
const GEN2 = {
  book: 'Genesis', code: 'gen', chapter: 2, lang: 'grc', translation: 'Swete', edition: 'swete', lex: {}, parse: {},
  verses: [
    {
      n: 1,
      ref: { book: 'gen', chapter: 2, verse: 1 },
      g: [word('[Καὶ', 'καί'), word('συνετε]λέσθησαν', 'συντελέω'), word('[ὁ', 'ὁ'), word('οὐρανὸς', 'οὐρανός'), word('κ]αὶ', 'καί')],
      e: [{ t: 'And the heaven and the earth were finished.', g: [0, 1, 2, 3, 4] }],
    },
  ],
} as unknown as Chapter;

/** loadSeptuagintChapter('gen', 2) over a stubbed /data-lxx whose chapter 2 is GEN2 as the file holds it */
async function loaded(): Promise<Chapter> {
  forgetLxxIndex();
  const index = { sources: {}, books: [{ code: 'gen', name: 'Genesis', chapters: 2, verses: [31, 25], fingerprints: ['', ''], lang: 'grc', lampasChapters: [[1], [2]], lampas: 'gen' }] };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.startsWith('/data-lxx/index.json') ? index : url.startsWith('/data-lxx/gen/2.json') ? GEN2 : url.startsWith('/data-lxx/lexicon-grc-lxx.json') ? {} : null;
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response('not found', { status: 404 });
  });
  const chapter = await loadSeptuagintChapter('gen', 2);
  if (!chapter) throw new Error('Genesis 2 not loaded');
  return chapter;
}

const text = (container: HTMLElement): string => (container.querySelector('[data-text]')?.textContent ?? '').replace(/\s+/g, ' ').trim();
const draw = (verse: Verse, gaps: boolean, looks: Lookup[] = []) =>
  render(createElement(VerseText, { verse, view: 'greek', woven: null, onLook: (l: Lookup) => looks.push(l), gaps }));

describe('the setting', () => {
  it("is 'Show manuscript gaps', Off to start, kept, and sits with the Septuagint's setting under How much Greek?", async () => {
    expect(septuagintGapsSetting.key).toBe('septuagintGaps');
    expect(septuagintGapsSetting.default).toBe('off');
    expect(septuagintGapsSetting.label).toBe('Show manuscript gaps');
    expect(settingOf('septuagintGaps')?.label).toBe('Show manuscript gaps');
    expect(ROWS.find((r) => r.key === 'septuagintGaps')?.section).toBe('dial');
    expect(await getSetting(septuagintGapsSetting)).toBe('off');
    await setSetting(septuagintGapsSetting, 'on');
    expect(await getSetting(septuagintGapsSetting)).toBe('on');
  });

  it('is drawn once the Septuagint is on and found by the search for its name', async () => {
    const shown = async (query = ''): Promise<boolean> => visibleRows(await readValues(), query).some((r) => r.key === 'septuagintGaps');
    expect(await shown()).toBe(false);
    await db.settings.put({ key: 'septuagint', value: 'on' });
    expect(await shown()).toBe(true);
    expect(await shown('manuscript gaps')).toBe(true);
    await db.settings.put({ key: 'septuagint', value: 'off' });
    expect(await shown()).toBe(false);
  });
});

describe('withoutGaps', () => {
  it('takes out the brackets and nothing else', () => {
    expect(withoutGaps('συνετε]λέσθησαν')).toBe('συνετελέσθησαν');
    expect(withoutGaps('[Καὶ')).toBe('Καὶ');
    expect(withoutGaps('πετόμεν[α]')).toBe('πετόμενα');
    expect(withoutGaps('γῆν.')).toBe('γῆν.');
  });
});

describe('the Greek view of Genesis 2:1 (acceptance 1 and 2)', () => {
  it('draws it with no bracket at default settings', async () => {
    const chapter = await loaded();
    const { container } = draw(chapter.verses[0], false);
    expect(text(container)).toBe('Καὶ συνετελέσθησαν ὁ οὐρανὸς καὶ');
    expect(container.textContent).not.toMatch(/[[\]]/);
  });

  it('draws the brackets as Swete printed them with Show manuscript gaps on', async () => {
    const chapter = await loaded();
    const { container } = draw(chapter.verses[0], true);
    expect(text(container)).toBe('[Καὶ συνετε]λέσθησαν [ὁ οὐρανὸς κ]αὶ');
  });
});

describe('the words under the brackets (acceptance 3)', () => {
  it('are bare when loaded, so lookup, speech, copy and search never see a bracket', async () => {
    const chapter = await loaded();
    expect(chapter.verses[0].g.map((w) => w.t)).toEqual(['Καὶ', 'συνετελέσθησαν', 'ὁ', 'οὐρανὸς', 'καὶ']);
    expect(chapter.verses[0].g.map((w) => w.t).join(' ')).not.toMatch(/[[\]]/);
  });

  it('open the same word card as a word with none, with the setting off or on', async () => {
    const chapter = await loaded();
    for (const gaps of [false, true]) {
      const looks: Lookup[] = [];
      draw(chapter.verses[0], gaps, looks);
      fireEvent.click(document.querySelector('[data-word="1"]') as HTMLElement);
      fireEvent.click(document.querySelector('[data-word="3"]') as HTMLElement);
      expect(looks).toHaveLength(2);
      expect(looks[0].words[0].t).toBe('συνετελέσθησαν');
      expect(looks[0].words[0]).toBe(chapter.verses[0].g[1]);
      expect(looks[0].words[0].l).toBe('συντελέω');
      cleanup();
    }
  });

  it('leave a word with no bracket as the file has it', async () => {
    const chapter = await loaded();
    expect(chapter.verses[0].g[3]).toEqual(word('οὐρανὸς', 'οὐρανός'));
  });
});

describe('the fixture chapter, Genesis 1:22 (brackets across several words)', () => {
  it('is bare by default and printed with the gaps on', async () => {
    const gen1 = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
    expect(gen1.verses[21].g.some((w) => /[[\]]/.test(w.t))).toBe(true);
    forgetLxxIndex();
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const file = url.startsWith('/data-lxx/gen/1.json') ? 'tests/fixtures/data-lxx/gen/1.json' : url.startsWith('/data-lxx/index.json') ? 'tests/fixtures/data-lxx/index.json' : url.startsWith('/data-lxx/lexicon') ? 'tests/fixtures/data-lxx/lexicon-grc-lxx.json' : null;
      return file ? new Response(readFileSync(file, 'utf8'), { status: 200 }) : new Response('nope', { status: 404 });
    });
    const chapter = await loadSeptuagintChapter('gen', 1);
    const verse = chapter?.verses[21] as Verse;
    expect(verse.g.map((w) => w.t).join(' ')).not.toMatch(/[[\]]/);
    expect(text(draw(verse, false).container)).not.toMatch(/[[\]]/);
    cleanup();
    expect(text(draw(verse, true).container)).toBe(gen1.verses[21].g.map((w) => w.t).join(' '));
  });
});
