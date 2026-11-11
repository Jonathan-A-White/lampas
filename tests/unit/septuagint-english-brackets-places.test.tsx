// tests/unit/septuagint-english-brackets-places.test.tsx — every place that draws a Septuagint verse's English follows Show manuscript gaps for Brenton's square brackets, as the chapter does (mw-u2w5klk.348;
// the chapter's own test is septuagint-english-brackets.test.ts, mw-u2w5klk.331). The Verse view, the passage card (PassageText), the split dock (TextDock) and the reference card are each drawn for Genesis 35:16 and
// Psalms 146:8 with the setting Off (no bracket, every word kept in order) and On (as printed). The two chapters are small stand-ins served in place of public/data-lxx, shaped as `lxx:ship` writes them.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { db } from '../../src/data/db';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { rangeOf } from '../../src/data/passage';
import { clearBus } from '../../src/events/bus';
import { PassageText } from '../../src/reader/ChapterText';
import { TextDock } from '../../src/reader/split/TextDock';
import { septuagintGapsSetting, septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../support/chapter-fetch';

const word = (t: string, l: string) => ({ t, tr: '', s: '', l, p: 'N-NSM', y: '1', c: 0.9 });
const GEN_PRINTED = '[And Jacob removed from Baethel, and pitched his tent beyond the tower of Gader,] and it came to pass when Israel dwelt in that land, that Reuben went.';
const GEN_BARE = GEN_PRINTED.replace(/[[\]]/g, '');
/** Psalm 146:8 as the file holds it: the opening bracket is a chunk of its own, paired to no word */
const PSA_CHUNKS = [
  { t: 'He lifts up the lowly;', g: [0] },
  { t: '[', g: [] },
  { t: 'the Lord loves the righteous;', g: [1] },
  { t: 'and the poor of men;]', g: [1] },
];
const PSA_PRINTED = 'He lifts up the lowly; [ the Lord loves the righteous; and the poor of men;]';
const PSA_BARE = 'He lifts up the lowly; the Lord loves the righteous; and the poor of men;';

const file = (code: string, chapter: number, lampas: number, verse: number, e: unknown[]) => ({
  book: code,
  code,
  chapter,
  lang: 'grc',
  translation: 'lxx2012',
  edition: 'swete',
  lex: {},
  parse: {},
  verses: [{ n: verse, ref: { book: code, chapter: lampas, verse }, g: [word('καὶ', 'καί'), word('ἐξῆρεν', 'ἐξαίρω')], e }],
});
const FILES: Record<string, unknown> = {
  '/data-lxx/gen/35.json': file('gen', 35, 35, 16, [{ t: GEN_PRINTED, g: [0, 1] }]),
  '/data-lxx/psa/145.json': file('psa', 145, 146, 8, PSA_CHUNKS),
};
const book = (code: string, name: string, chapters: number, greek: number, lampas: number) => ({
  code,
  name,
  chapters,
  verses: [],
  fingerprints: [],
  lang: 'grc',
  lampas: code,
  lampasChapters: Array.from({ length: chapters }, (_, i) => (i + 1 === greek ? [lampas] : [])),
});
const INDEX = { sources: {}, books: [book('gen', 'Genesis', 35, 35, 35), book('psa', 'Psalms', 145, 145, 146)] };

/** the stubbed fetch, with the two stand-in Greek chapters and their index answered in place of the shipped ones */
function serve(): void {
  const inner = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/\?v=.*$/, '');
    if (url === '/data-lxx/index.json') return new Response(JSON.stringify(INDEX), { status: 200 });
    if (url in FILES) return new Response(JSON.stringify(FILES[url]), { status: 200 });
    return inner(input, init);
  });
}

beforeEach(async () => {
  clearBus();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  serve();
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await setSetting(septuagintSetting, 'on');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PLACES = [
  { name: 'Genesis 35:16', code: 'gen', chapter: 35, verse: 16, printed: GEN_PRINTED, bare: GEN_BARE },
  { name: 'Psalms 146:8', code: 'psa', chapter: 146, verse: 8, printed: PSA_PRINTED, bare: PSA_BARE },
] as const;
const flat = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const states = [
  ['Off', 'off', false],
  ['On', 'on', true],
] as const;

describe.each(PLACES)('$name', (place) => {
  describe.each(states)('Show manuscript gaps %s', (_label, value, on) => {
    const expected = (): string => (on ? place.printed : place.bare);
    const check = (text: string): void => {
      expect(text).toBe(expected());
      if (!on) expect(text).not.toMatch(/[[\]]/);
    };
    beforeEach(() => setSetting(septuagintGapsSetting, value));

    it('the Verse view', async () => {
      window.history.replaceState(null, '', `/#/?b=${place.code}&c=${place.chapter}&view=english&weave=off&v=${place.verse}`);
      render(<App />);
      const region = await screen.findByRole('region', { name: 'Verse view' });
      await waitFor(() => expect(region.querySelector('[data-text]')).not.toBeNull());
      check(flat(region.querySelector('[data-text]')));
    });

    it('the passage card of the Verse view', async () => {
      const chapter = await loadChapter(place.code, place.chapter);
      const passage = rangeOf(chapter.verses, chapter.verses[0].n, chapter.verses[0].n, 'Heading')!;
      render(<PassageText passage={passage} view="english" source="grc" layout="verse" wovenOf={() => null} reading={null} onLook={() => undefined} septuagint={chapter.chapter} gaps={on} />);
      check(flat(document.querySelector('[data-passage-text] [data-text]')));
    });

    it('the split dock', async () => {
      const chapter = await loadChapter(place.code, place.chapter);
      render(<TextDock text="lxx-english" book={place.code} lampasChapter={place.chapter} chapter={chapter as Chapter} passage={[place.verse]} onLook={() => undefined} onNumber={() => undefined} />);
      // the setting is read from the store a moment after the first draw
      await waitFor(() => check(flat(document.querySelector('[data-dock-text] [data-text]'))));
    });

    it('the reference card', async () => {
      // the card names a Psalm 'Psalm 146:8', not 'Psalms'
      const written = place.name.replace(/^Psalms /, 'Psalm ');
      render(<ReferenceLink written={written}>{written}</ReferenceLink>);
      await userEvent.click(screen.getByRole('link', { name: written }));
      const card = await screen.findByRole('dialog', { name: written });
      await waitFor(() => expect(card.querySelector('[data-reference-text] [data-text]')).not.toBeNull());
      await waitFor(() => check(flat(card.querySelector('[data-reference-text] [data-text]'))));
    });
  });
});
