// features/steps/reader-weave-switch.steps.tsx — runs features/reader-weave-switch.feature: the Reader's English | Weave | Greek switch and the long
// press on Weave that flips the woven text between the English and the Greek word order. fetch is stubbed with the committed public/data/rom/8.json.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter, Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup, leaveSettings } from '../../tests/support/settings-pages';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse1: Verse = chapter.verses[0];

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openFresh(): Promise<void> {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  window.location.hash = '';
  await seedHisWords();
  render(<App />);
  await waitForReader();
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const verseText = (n: number): string => squash(verseEl(n).querySelector('[data-text]')?.textContent);
const wovenIn = (verse: number): HTMLElement[] => [...verseEl(verse).querySelectorAll<HTMLElement>('[data-woven]')];
const switchEl = (): HTMLElement => screen.getByRole('group', { name: 'Language' });
const choice = (name: string): HTMLElement => within(switchEl()).getByRole('button', { name, exact: true });

async function setWeaveSolid(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'reading');
  await user.click(within(await screen.findByRole('group', { name: 'Weave' })).getByRole('button', { name: 'Solid' }));
  await leaveSettings(user);
  await waitForReader();
  await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
}

async function longPress(name: string): Promise<void> {
  const target = choice(name);
  await user.pointer({ keys: '[MouseLeft>]', target });
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
  await user.pointer({ keys: '[/MouseLeft]', target });
}

// jsdom has no layout, so the keeping of the top verse is judged against a layout model with a line count that follows the text on screen: a verse is as many 20 px lines as its
// text has 40-character rows, so the same verse is a different height in English, Greek and Hebrew, and the box is 700 px of a text that is taller than that.
const LINE = 20;
const ROW = 40;
const BOX_TOP = 100;
const GAP = 8;
const scrolled = new WeakMap<Element, number>();
const rect = (top: number, height = 0): DOMRect => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) });
const heightOf = (verse: Element): number => Math.max(1, Math.ceil((verse.textContent ?? '').length / ROW)) * LINE;
const realRect = Element.prototype.getBoundingClientRect;
const realScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');

function installLayout(): void {
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return scrolled.get(this) ?? 0;
    },
    set(this: Element, value: number) {
      scrolled.set(this, Math.max(0, value));
    },
  });
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    if (this.hasAttribute('data-reader')) return rect(BOX_TOP, 700);
    const box = this.closest('[data-reader]');
    const n = this.getAttribute('data-verse');
    if (!box || n === null) return realRect.call(this);
    let above = 0;
    for (const verse of box.querySelectorAll('[data-verse]')) {
      if (verse === this) break;
      above += heightOf(verse);
    }
    return rect(BOX_TOP + above - (scrolled.get(box) ?? 0), heightOf(this));
  };
}

function removeLayout(): void {
  Element.prototype.getBoundingClientRect = realRect;
  if (realScrollTop) Object.defineProperty(Element.prototype, 'scrollTop', realScrollTop);
}

afterAll(removeLayout);

const readerBox = (): HTMLElement => document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
/** How far below the top of the text `verse` begins. */
const belowTop = (verse: number): number => verseEl(verse).getBoundingClientRect().top - readerBox().getBoundingClientRect().top;

async function openOn(title: string): Promise<void> {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  const [book, n] = title === 'Acts 18' ? ['act', 18] : ['gen', 1];
  window.location.hash = `#/?b=${book}&c=${n}`;
  await db.settings.bulkPut([
    { key: 'weave', value: 'solid' },
    { key: 'greekInterest', value: '4' },
    { key: 'hebrewInterest', value: '4' },
  ]);
  await seedHisWords();
  installLayout();
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(20));
  await waitFor(() => expect(within(switchEl()).getAllByRole('button')).toHaveLength(3));
}

/** He scrolls so that verse `n` is the first verse at the top of the text, as showVerse leaves a verse. */
async function scrollVerseToTop(n: number): Promise<void> {
  const box = readerBox();
  box.scrollTop += belowTop(n) - GAP;
  fireEvent.scroll(box);
  expect(Math.abs(belowTop(n) - GAP)).toBeLessThanOrEqual(1);
}

/** The first verse whose top is at or below the top of the text is the verse. Allowed as far from the gap as the app's own (GAP). */
async function expectOnTop(n: number): Promise<void> {
  await waitFor(() => expect(Math.abs(belowTop(n) - GAP)).toBeLessThanOrEqual(GAP));
}

/** Taps a choice of the switch and waits for the reader to show it. */
async function switchTo(name: string): Promise<void> {
  await user.click(choice(name));
  await waitFor(() => expect(choice(name)).toHaveAttribute('aria-pressed', 'true'));
  await waitFor(() => expect(readerBox()).toHaveAttribute('data-view', name === 'Greek' || name === 'Hebrew' ? 'greek' : 'english'));
}

const feature = await loadFeature('features/reader-weave-switch.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = ({ Given, And }: { Given: (t: string, f: () => Promise<void>) => void; And: (t: string, f: () => Promise<void>) => void }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', setWeaveSolid);
  };

  Scenario('With the Weave on the switch offers English, Weave and Greek, and Weave is the one chosen', (s) => {
    given(s);
    s.Then('the language switch offers {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]);
    });
    s.And('{string} is the chosen language', (_, name: string) => {
      expect(choice(name)).toHaveAttribute('aria-pressed', 'true');
      expect(within(switchEl()).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    });
    s.And('verse 1 shows Greek words woven into the English', async () => {
      await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
    });
  });

  Scenario('English shows plain English with no Greek words', (s) => {
    given(s);
    s.When('he chooses {string} in the language switch', async (_, name: string) => {
      await user.click(choice(name));
    });
    s.Then('{string} is the chosen language', async (_, name: string) => {
      await waitFor(() => expect(choice(name)).toHaveAttribute('aria-pressed', 'true'));
    });
    s.And('no woven word is shown', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-woven]')).toHaveLength(0));
    });
    s.And("verse 1 reads as the data's English chunks", () => {
      expect(verseText(1)).toBe(squash(verse1.e.map((c) => c.t).join(' ')));
    });
  });

  Scenario('Greek is unchanged and Weave brings the woven text back', (s) => {
    given(s);
    s.When('he chooses {string} in the language switch', async (_, name: string) => {
      await user.click(choice(name));
    });
    s.Then('the Greek view shows the Greek words of verse 1', async () => {
      await waitFor(() => expect(verseText(1)).toBe(verse1.g.map((w) => w.t).join(' ')));
      expect(document.querySelectorAll('[data-woven]')).toHaveLength(0);
    });
    s.And('he chooses {string} in the language switch', async (_, name: string) => {
      await user.click(choice(name));
    });
    s.And('verse 1 shows Greek words woven into the English', async () => {
      await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
    });
  });

  Scenario('With the Weave Off the switch is English | Greek', ({ Given, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    Then('the language switch offers {string} and {string}', (_, a: string, b: string) => {
      expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]);
    });
  });

  Scenario('Plain English is remembered after a reload', (s) => {
    given(s);
    s.And('he chooses {string} in the language switch', async (_, name: string) => {
      await user.click(choice(name));
      await waitFor(() => expect(document.querySelectorAll('[data-woven]')).toHaveLength(0));
    });
    s.When('he reopens Lampas', async () => {
      cleanup();
      await seedHisWords();
      render(<App />);
      await waitForReader();
    });
    s.Then('{string} is the chosen language', async (_, name: string) => {
      await waitFor(() => expect(choice(name)).toHaveAttribute('aria-pressed', 'true'));
    });
    s.And('no woven word is shown', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-woven]')).toHaveLength(0));
    });
  });

  Scenario('A long press on Weave flips to the Greek word order and says so', (s) => {
    given(s);
    s.And('verse 1 begins {string}', async (_, start: string) => {
      await waitFor(() => expect(verseText(1).startsWith(start)).toBe(true));
    });
    s.When('he long presses {string} in the language switch', async (_, name: string) => longPress(name));
    s.Then('a toast says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.getAllByRole('status').some((e) => e.textContent === words)).toBe(true));
    });
    s.And('verse 1 now begins {string}', async (_, start: string) => {
      await waitFor(() => expect(verseText(1).startsWith(start)).toBe(true));
    });
    s.And('{string} is the chosen language', async (_, name: string) => {
      await waitFor(() => expect(choice(name)).toHaveAttribute('aria-pressed', 'true'));
    });
  });

  Scenario('A second long press flips back to the English word order', (s) => {
    given(s);
    s.And('he has long pressed {string} in the language switch', async (_, name: string) => {
      await longPress(name);
      await waitFor(() => expect(verseText(1).startsWith('no Therefore')).toBe(true));
    });
    s.When('he long presses {string} in the language switch', async (_, name: string) => longPress(name));
    s.Then('a toast says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.getAllByRole('status').some((e) => e.textContent === words)).toBe(true));
    });
    s.And('verse 1 now begins {string}', async (_, start: string) => {
      await waitFor(() => expect(verseText(1).startsWith(start)).toBe(true));
    });
  });

  Scenario('The word order chosen by a long press is remembered after a reload', (s) => {
    given(s);
    s.And('he has long pressed {string} in the language switch', async (_, name: string) => {
      await longPress(name);
      await waitFor(() => expect(verseText(1).startsWith('no Therefore')).toBe(true));
    });
    s.When('he reopens Lampas', async () => {
      cleanup();
      await seedHisWords();
      render(<App />);
      await waitForReader();
    });
    s.Then('verse 1 now begins {string}', async (_, start: string) => {
      await waitFor(() => expect(verseText(1).startsWith(start)).toBe(true));
    });
  });

  Scenario('A tap on Weave does not flip the order', (s) => {
    given(s);
    s.When('he chooses {string} in the language switch', async (_, name: string) => {
      await user.click(choice(name));
    });
    s.Then('verse 1 begins {string}', async (_, start: string) => {
      await waitFor(() => expect(verseText(1).startsWith(start)).toBe(true));
    });
  });

  for (const [title, label, verse] of [['Acts 18', 'Greek', 14], ['Genesis 1', 'Hebrew', 20]] as const) {
    Scenario(
      title === 'Acts 18'
        ? 'Switching the mode keeps the verse that was on top of an Acts chapter on top'
        : 'Switching to Hebrew and back keeps the verse that was on top of an Old Testament chapter on top',
      (s) => {
        s.Given('Lampas is opened on {string} with the Weave on, in a text whose verses are taller in one mode than in another', async () => openOn(title));
        s.And('verse {int} is the first verse at the top of the text', async (_, n: number) => {
          expect(n).toBe(verse);
          await scrollVerseToTop(n);
        });
        s.When('he chooses {string} in the language switch', async (_, name: string) => {
          expect(name).toBe(label);
          await switchTo(name);
        });
        s.And('verse {int} is at the top of the text after Greek or Hebrew', async (_, n: number) => expectOnTop(n));
        s.And('he then chooses {string} in the language switch', async (_, name: string) => {
          await switchTo(name);
        });
        s.And('verse {int} is at the top of the text after Weave', async (_, n: number) => expectOnTop(n));
        s.And('he finally chooses {string} in the language switch', async (_, name: string) => {
          await switchTo(name);
        });
        s.Then('verse {int} is at the top of the text after English', async (_, n: number) => expectOnTop(n));
      },
    );
  }
});
