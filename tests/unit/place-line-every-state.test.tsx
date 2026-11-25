// tests/unit/place-line-every-state.test.tsx — the place line ('Isaiah 1 · 99%', src/PlaceLine.tsx) is at the foot of the Reader in every state of it (mw-5r3p30.1247, his words 2026-11-25:
// "I should see the chapter at the bottom regardless of whether it's immersive or not"): Scroll with the Immersive reader Off, On with the bars up, On with the bars away, each with the split open
// too, and Turn pages (which says the page). Each is shown in each text: English, Weave, Greek, Hebrew and the Septuagint. One table, one line each: exactly one place line, saying the chapter and
// where he is in it. jsdom has no layout, so the bars are put away the way the Immersive features do it (a scroll of a box whose size is stood in for by hand); where the line sits and that the bars
// do not cover it is tests/e2e/immersive-place.spec.ts at 390x844.
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { resetImmersive } from '../../src/immersive';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetScrolls } from '../../src/nav/scrollMemory';
import { stubChapterFetch } from '../support/chapter-fetch';

const PHONE_KEY = '00'.repeat(31) + '02';

interface Text {
  name: string;
  address: string;
  /** settings the text needs */
  settings: Record<string, string>;
  /** what the place line begins with */
  title: string;
}
const TEXTS: Text[] = [
  { name: 'English', address: '#/?b=mrk&c=12&view=english&weave=off', settings: {}, title: 'Mark 12' },
  { name: 'Weave', address: '#/?b=mrk&c=12&view=english&weave=solid', settings: {}, title: 'Mark 12' },
  { name: 'Greek', address: '#/?b=mrk&c=12&view=greek&weave=off', settings: {}, title: 'Mark 12' },
  { name: 'Hebrew', address: '#/?b=gen&c=1&view=greek&weave=off', settings: {}, title: 'Genesis 1' },
  { name: 'Septuagint', address: '#/?b=gen&c=1&view=greek&weave=off', settings: { septuagint: 'on', septuagintGaps: 'on' }, title: 'Genesis 1' },
];

type Bars = 'up' | 'away';
interface Mode {
  name: string;
  immersive: 'on' | 'off';
  bars: Bars;
  split: boolean;
  pages: boolean;
}
const MODES: Mode[] = [
  { name: 'Scroll, Immersive Off', immersive: 'off', bars: 'up', split: false, pages: false },
  { name: 'Scroll, Immersive Off, split open', immersive: 'off', bars: 'up', split: true, pages: false },
  { name: 'Scroll, Immersive On, bars up', immersive: 'on', bars: 'up', split: false, pages: false },
  { name: 'Scroll, Immersive On, bars up, split open', immersive: 'on', bars: 'up', split: true, pages: false },
  { name: 'Scroll, Immersive On, bars away', immersive: 'on', bars: 'away', split: false, pages: false },
  { name: 'Scroll, Immersive On, bars away, split open', immersive: 'on', bars: 'away', split: true, pages: false },
  { name: 'Turn pages, Immersive Off', immersive: 'off', bars: 'up', split: false, pages: true },
  { name: 'Turn pages, Immersive On', immersive: 'on', bars: 'up', split: false, pages: true },
];

const ROWS = MODES.flatMap((mode) => TEXTS.map((text) => ({ label: `${mode.name}, ${text.name}`, mode, text })));

afterAll(async () => {
  // the first open seeds the grammar levels: let it finish before the database closes
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
  cleanup();
  resetImmersive();
  vi.unstubAllGlobals();
  db.close();
});
beforeEach(() => {
  vi.unstubAllGlobals();
});

/** jsdom has no layout: the Reader's box is 700 px of a 5000 px text, scrolled `top` px down. A scroll of 300 px is far enough to put the bars away. */
function scrollTextTo(top: number): void {
  const box = document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: 700 });
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 5000 });
  Object.defineProperty(box, 'scrollTop', { configurable: true, writable: true, value: top });
  fireEvent.scroll(box);
}

it.each(ROWS)('the place line is at the foot: $label', async ({ mode, text }) => {
  cleanup();
  resetImmersive();
  clearBus();
  forgetTrail();
  forgetScrolls();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  window.location.hash = text.address;
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  const settings: Record<string, string> = { ...text.settings, immersiveReader: mode.immersive, immersiveHint: 'off', readingMode: mode.pages ? 'pages' : 'scroll' };
  if (mode.split) Object.assign(settings, { readerSplit: 'on', splitText: text.name === 'Greek' ? 'english' : 'greek' });
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });

  render(<App />);
  const box = await waitFor(() => {
    const found = document.querySelector<HTMLElement>('[data-reader]');
    expect(found).not.toBeNull();
    expect(found?.querySelectorAll('[data-verse]').length).toBeGreaterThan(0);
    expect(found).toHaveAttribute('data-immersive', mode.immersive);
    expect(found).toHaveAttribute('data-paging', mode.pages ? 'pages' : 'scroll');
    return found as HTMLElement;
  });
  expect(box).toBeInTheDocument();
  if (mode.bars === 'away') {
    await act(async () => {});
    scrollTextTo(0);
    scrollTextTo(300);
    await waitFor(() => expect(document.querySelector('[data-away]')).not.toBeNull());
  }

  const says = mode.pages ? new RegExp(`^${text.title} · Page \\d+ of \\d+$`) : new RegExp(`^${text.title} · \\d+%$`);
  // one place line, not two: the line of the shown bars slides out as the line of the away bars slides in, and settles to one
  await waitFor(() => {
    const lines = document.querySelectorAll('[data-place-line]');
    expect(lines).toHaveLength(1);
    expect(lines[0].textContent).toMatch(says);
  });
  if (mode.split) expect(document.querySelector('[data-dock-handle]'), 'the split is open').not.toBeNull();
}, 60_000);
