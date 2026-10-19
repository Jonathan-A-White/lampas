// With Turn pages (src/reader/usePages.ts) the page he is on is kept per chapter (src/nav/scrollMemory.ts keepPage, mw-5r3p30.608): every screen the Reader
// gives way to unmounts it, and Back from each must bring him to the page he left, not page 1. AWAY lists every route but the Reader's own (a new route
// fails the typecheck until it is listed); the test opens each in turn from Mark 12 at page 3 and fails on the first that comes back to another page.
// jsdom has no layout, so the pages are faked: the reading text is 300 px a page and each verse begins on page ⌊(n-1)/versesAPage⌋.
// tests/e2e/turn-pages.spec.ts proves the same at 390x844 with the real layout.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { ESSAY_PATH, type Route } from '../../src/nav/route';
import { forgetScrolls, restoreScrolls } from '../../src/nav/scrollMemory';
import { stubChapterFetch } from '../support/chapter-fetch';

/** Every route but the Reader's ('home'), with its address. */
const AWAY: Record<Exclude<Route, 'home'>, string> = {
  words: '#/words',
  import: '#/import',
  test: '#/test',
  drill: '#/drill',
  review: '#/review',
  today: '#/today',
  paradigms: '#/paradigms',
  placement: '#/placement',
  goal: '#/goal',
  path: '#/path',
  ipa: '#/ipa',
  sounds: '#/sounds',
  studyway: '#/studyway',
  aboutyou: '#/aboutyou',
  memory: '#/memory',
  requests: '#/requests',
  askmore: '#/askmore',
  about: '#/about',
  preface: '#/preface',
  essay: ESSAY_PATH,
  settings: '#/settings',
  share: '#/share',
  unlock: '#/unlock',
};

const PAGE_PX = 300;
/** how many verses begin on a page: fewer is what a larger text size does */
let versesAPage = 4;
const pageOfVerse = (n: number) => Math.floor((n - 1) / versesAPage);

/** The fake layout: the paged text is one page wide, and an element in it stands on the page of its verse (the text after the last verse, on the last). */
function fakePages(): () => void {
  const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const rects = Object.getOwnPropertyDescriptor(Element.prototype, 'getClientRects');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-pages') ? PAGE_PX : 0;
    },
  });
  Object.defineProperty(Element.prototype, 'getClientRects', {
    configurable: true,
    value(this: Element) {
      const text = this.closest('[data-pages]');
      if (!text) return [];
      const verses = Array.from(text.querySelectorAll<HTMLElement>('[data-verse]'));
      const own = this.closest<HTMLElement>('[data-verse]') ?? Array.from(this.querySelectorAll<HTMLElement>('[data-verse]')).at(-1) ?? verses.at(-1);
      const n = Number(own?.dataset.verse ?? 1);
      return [{ left: pageOfVerse(n) * PAGE_PX, right: pageOfVerse(n) * PAGE_PX + 10, width: 10, top: 0, bottom: 10, height: 10, x: 0, y: 0 }];
    },
  });
  return () => {
    if (width) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width);
    else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    if (rects) Object.defineProperty(Element.prototype, 'getClientRects', rects);
  };
}

let unfake: () => void = () => {};
beforeAll(() => {
  unfake = fakePages();
});
afterAll(() => {
  cleanup();
  unfake();
  vi.unstubAllGlobals();
  db.close();
});

const placeLine = () => document.querySelector<HTMLElement>('[data-place-line]');

it('every screen the Reader gives way to brings him back to the page he was on in Turn pages', async () => {
  clearBus();
  forgetTrail();
  forgetScrolls();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '02');
  window.history.replaceState(null, '', '/#/?b=mrk&c=12');
  stubChapterFetch();
  await db.open();
  await db.settings.put({ key: 'readingMode', value: 'pages' });
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 1 of \d+$/));
  await waitFor(() => expect(Number(placeLine()?.textContent?.match(/of (\d+)$/)?.[1])).toBeGreaterThanOrEqual(4));
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 3 of \d+$/));

  for (const [route, hash] of Object.entries(AWAY)) {
    window.location.hash = hash;
    await waitFor(() => expect(document.querySelector('[data-reader]'), `${route} unmounts the Reader`).toBeNull());
    window.history.back();
    await waitFor(() => expect(document.querySelector('[data-reader]'), `Back from ${route} opens the Reader`).not.toBeNull());
    await waitFor(() => expect(placeLine(), `back from ${route}`).toHaveTextContent(/^Mark 12 · Page 3 of \d+$/));
  }

  // pages cut otherwise when he comes back (a larger text size chosen in Settings): the page that verse 9, which began page 3, begins on now
  window.location.hash = AWAY.settings;
  await waitFor(() => expect(document.querySelector('[data-reader]')).toBeNull());
  versesAPage = 2;
  window.history.back();
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 5 of \d+$/));
  // the first open seeds the grammar levels: let it finish before the database closes
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
  // each of the 23 screens is drawn in full: about 20 s on a quiet host, more on a loaded one
}, 120_000);

/** Opens the app afresh on Mark 12 in Turn pages, as a reload does: the memory is emptied and what the phone holds is read back (src/main.tsx). */
async function reopen() {
  cleanup();
  clearBus();
  forgetTrail();
  forgetScrolls();
  restoreScrolls();
  window.history.replaceState(null, '', '/#/?b=mrk&c=12');
  render(<App />);
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page \d+ of \d+$/));
}

// mw-5r3p30.638: the page is on the phone too, so a reload or a reopened app shows it
it('a reload opens the chapter on the page he was reading', async () => {
  versesAPage = 4;
  localStorage.removeItem('lampas.pages');
  await reopen();
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 1 of \d+$/));
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next page' }));
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 3 of \d+$/));
  expect(JSON.parse(localStorage.getItem('lampas.pages') ?? '{}')['mrk/12']).toMatchObject({ page: 2 });

  await reopen();
  await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 3 of \d+$/));
});

it('a stored page past the chapter\'s last page opens the last page, never a blank one', async () => {
  versesAPage = 4;
  localStorage.setItem('lampas.pages', JSON.stringify({ 'mrk/12': { page: 40, count: 60, verse: null } }));
  await reopen();
  await waitFor(() => {
    const [, at, of] = placeLine()?.textContent?.match(/Page (\d+) of (\d+)$/) ?? [];
    expect(Number(of)).toBeGreaterThanOrEqual(4);
    expect(at).toBe(of);
  });
});

it('a phone that holds no page, or a damaged one, opens page 1 with no error', async () => {
  versesAPage = 4;
  for (const held of [null, '{nope', JSON.stringify({ 'mrk/12': { page: 'x' } }), JSON.stringify([1])]) {
    if (held === null) localStorage.removeItem('lampas.pages');
    else localStorage.setItem('lampas.pages', held);
    await reopen();
    await waitFor(() => expect(placeLine()).toHaveTextContent(/^Mark 12 · Page 1 of \d+$/));
  }
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}, 60_000);
