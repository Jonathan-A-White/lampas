// features/steps/weave.steps.tsx — runs features/weave.feature: the Weave switch in the English view, the Greek
// words woven in for his solid words, the count line, and the tap that opens a woven word's sheet. fetch is
// stubbed to answer with the committed public/data/rom/8.json; expected forms are read from that JSON by lemma.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter, type GreekWord, type Verse, wordLemma } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse1: Verse = chapter.verses[0];

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
let tappedLemma = '';

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openFresh(): Promise<void> {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await waitForReader();
  // the seed lands a moment after the first paint
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const chunkEl = (verse: number, index: number): HTMLElement => {
  const el = verseEl(verse).querySelector<HTMLElement>(`[data-chunk="${index}"]`);
  if (!el) throw new Error(`no chunk ${index} in verse ${verse}`);
  return el;
};
const wovenIn = (verse: number): HTMLElement[] => [...verseEl(verse).querySelectorAll<HTMLElement>('[data-woven]')];
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const nfc = (s: string): string => s.normalize('NFC');

/** The first Greek word of verse 1 with this lemma, and the position of the English chunk that renders it. */
function wordOfLemma(lemma: string): { word: GreekWord; chunk: number } {
  const word = verse1.g.find((w) => nfc(wordLemma(w)) === nfc(lemma));
  if (!word) throw new Error(`no word of lemma ${lemma} in verse 1`);
  const chunk = verse1.e.findIndex((c) => c.g.some((i) => verse1.g[i] === word));
  if (chunk < 0) throw new Error(`no English chunk for ${lemma}`);
  return { word, chunk };
}

/** The lemmas of every solid word in the store, as the weave is meant to read them. */
async function solidLemmas(): Promise<Set<string>> {
  const solid = await db.words.where('state').equals('solid').toArray();
  return new Set(solid.flatMap((w) => [w.lemma, ...w.lemmas]).map(nfc));
}

/** The Weave switch is in Settings: open it from the gear, switch, and come back to the reader. */
async function setWeave(label: 'Off' | 'Solid words'): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await user.click(within(await screen.findByRole('group', { name: 'Weave' })).getByRole('button', { name: label }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-weave')).toBe(label === 'Off' ? 'off' : 'solid'));
  if (label === 'Solid words') await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
}

const countLine = (): HTMLElement | null => screen.queryByTestId('weave-count');

const feature = await loadFeature('features/weave.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With the seed, verse 1 in English shows ἐν Χριστῷ Ἰησοῦ in Greek and the rest in English', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Weave to Solid words', async () => setWeave('Solid words'));
    Then('verse 1 shows the Greek of the lemmas {string}, {string} and {string} in place of {string}, {string} and {string}', (_, a: string, b: string, c: string, ea: string, eb: string, ec: string) => {
      for (const [lemma, english] of [[a, ea], [b, eb], [c, ec]]) {
        const { word, chunk } = wordOfLemma(lemma);
        expect(verse1.e[chunk].t).toBe(english);
        const el = chunkEl(1, chunk);
        expect(el).toHaveAttribute('data-woven');
        expect(el).toHaveAttribute('lang', 'grc');
        expect(squash(el.textContent)).toBe(word.t);
      }
      // ἐν χριστῷ Ἰησοῦ together, in this order, in the verse's text
      const text = squash(verseEl(1).querySelector('[data-text]')?.textContent);
      expect(text).toContain(`${wordOfLemma(a).word.t} ${wordOfLemma(b).word.t} ${wordOfLemma(c).word.t}`);
    });
    And('{string} in verse {int} is still English', (_, english: string, n: number) => {
      const el = within(verseEl(n)).getByRole('button', { name: english });
      expect(el).not.toHaveAttribute('data-woven');
      expect(el.closest('[lang]')).toHaveAttribute('lang', 'en');
    });
    And('every woven chunk of verse 1 is a chunk whose Greek words are all solid', async () => {
      const solid = await solidLemmas();
      verse1.e.forEach((c, i) => {
        const allSolid = !c.s && c.t !== '-' && c.g.length > 0 && c.g.every((g) => solid.has(nfc(wordLemma(verse1.g[g]))));
        expect(chunkEl(1, i).hasAttribute('data-woven'), `chunk ${i} "${c.t}"`).toBe(allSolid);
      });
    });
  });

  Scenario('A word set to dropped on the Words screen leaves the weave on return', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    When('he drops the word {string} on the Words screen', async (_, lemma: string) => {
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
      await screen.findByRole('heading', { name: 'Words', level: 1 });
      const row = await waitFor(() => {
        const el = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`);
        if (!el) throw new Error('no row');
        return el;
      });
      await user.click(row); // solid -> learning
      await waitFor(() => expect(row.getAttribute('data-state')).toBe('learning'));
      await user.click(row); // asks to confirm
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Drop' }));
      await waitFor(() => expect(row.getAttribute('data-state')).toBe('dropped'));
    });
    And('he returns to the reader', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await waitForReader();
      await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
    });
    Then('{string} in verse {int} is English again', (_, english: string, n: number) => {
      const el = within(verseEl(n)).getByRole('button', { name: english });
      expect(el).not.toHaveAttribute('data-woven');
    });
    And('the Greek {string} is still woven in verse {int}', (_, lemma: string, n: number) => {
      const { word, chunk } = wordOfLemma(lemma);
      expect(chunkEl(n, chunk)).toHaveAttribute('data-woven');
      expect(squash(chunkEl(n, chunk).textContent)).toBe(word.t);
    });
  });

  Scenario('Tapping a woven word shows its sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    When('he taps the woven word for the lemma {string} in verse {int}', async (_, lemma: string, n: number) => {
      tappedLemma = lemma;
      await user.click(chunkEl(n, wordOfLemma(lemma).chunk));
    });
    Then('the word sheet shows the Greek word of that lemma as it stands in verse {int}', () => {
      const { word } = wordOfLemma(tappedLemma);
      expect(within(screen.getByRole('dialog')).getAllByTestId('sheet-word').map((e) => e.textContent)).toEqual([word.t]);
    });
    And('the word sheet shows the lemma {string}', (_, lemma: string) => {
      expect(within(screen.getByRole('dialog')).getAllByTestId('sheet-lemma').map((e) => e.textContent)).toEqual([lemma]);
    });
    And('the word sheet shows the English {string}', (_, english: string) => {
      expect(screen.getByRole('dialog')).toHaveTextContent(`English: “${english}”`);
    });
  });

  Scenario('Weave Off restores plain English', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    When('he sets Weave to Off', async () => setWeave('Off'));
    Then("verse 1 reads as the data's English chunks read", () => {
      const expected = verse1.e.map((c) => c.t).join(' ');
      expect(squash(verseEl(1).querySelector('[data-text]')?.textContent)).toBe(expected);
    });
    And('no woven word is shown', () => expect(document.querySelectorAll('[data-woven]')).toHaveLength(0));
  });

  Scenario('The woven count line matches the number of woven chunks', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Weave to Solid words', async () => setWeave('Solid words'));
    Then('the count line under the header reads as many words as there are woven chunks', async () => {
      const woven = document.querySelectorAll('[data-woven]').length;
      expect(woven).toBeGreaterThan(0);
      await waitFor(() => expect(countLine()).toHaveTextContent(`${woven} word${woven === 1 ? '' : 's'} in Greek`));
    });
    When('he sets Weave to Off', async () => setWeave('Off'));
    Then('there is no count line', () => expect(countLine()).toBeNull());
  });

  Scenario('The Greek view is not changed by the weave', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    When('he switches to Greek', async () => {
      await user.click(screen.getByRole('button', { name: 'Greek', exact: true }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
    });
    Then('the Greek view shows the Greek words of verse 1 and no Weave switch', () => {
      const expected = verse1.g.map((w) => w.t).join(' ');
      expect(squash(verseEl(1).querySelector('[data-text]')?.textContent)).toBe(expected);
      expect(document.querySelectorAll('[data-woven]')).toHaveLength(0);
      expect(screen.queryByRole('group', { name: 'Weave' })).toBeNull();
      expect(countLine()).toBeNull();
    });
  });

  Scenario('The Weave switch is remembered after reload', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    When('he reopens Lampas', async () => {
      cleanup();
      render(<App />);
      await waitForReader();
    });
    Then('Weave is set to Solid words', async () => {
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-weave')).toBe('solid'));
      await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
    });
  });
});
