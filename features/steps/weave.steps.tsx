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
import { LADDER } from '../../src/data/grammar/ladder';
import { getWeave, getWeaveGrammar, recordAnswer, setLevel } from '../../src/data/repositories';
import { SETTINGS } from '../../src/settings/registry';
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
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
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
type WeaveLabel = 'Off' | 'Solid words' | 'Solid and learning words';
const WEAVE_VALUE: Record<WeaveLabel, string> = { Off: 'off', 'Solid words': 'solid', 'Solid and learning words': 'solid+learning' };
const WEAVE_CHIP: Record<WeaveLabel, string> = { Off: 'Off', 'Solid words': 'Solid', 'Solid and learning words': '+ Learning' };
async function openSettings(): Promise<void> {
  if (screen.queryByRole('heading', { name: 'Settings', level: 1 })) return;
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}
async function setWeave(label: WeaveLabel): Promise<void> {
  await openSettings();
  await user.click(within(await screen.findByRole('group', { name: 'Weave' })).getByRole('button', { name: WEAVE_CHIP[label] }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-weave')).toBe(WEAVE_VALUE[label]));
  if (label !== 'Off') await waitFor(() => expect(wovenIn(1).length).toBeGreaterThan(0));
}

/** The Weave grammar dial is in Settings too: set it there and come back to the reader. */
async function setGrammar(chip: string): Promise<void> {
  await openSettings();
  await user.click(within(await screen.findByRole('group', { name: 'Grammar' })).getByRole('button', { name: chip }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
}

/** Every idea of the ladder gets `level`, except the dative case, which gets `dative`. */
async function setLevels(dative: 'notYet' | 'frontier'): Promise<void> {
  for (const idea of LADDER) await setLevel(idea.id, idea.id === 'case-dative' ? dative : 'solid', 'placement');
}

const verse18: Verse = chapter.verses[17];
/** The chunk of verse 18 that stands for the first Greek word of this lemma. */
function chunkOfLemma18(lemma: string): number {
  const at = verse18.g.findIndex((w) => nfc(wordLemma(w)) === nfc(lemma));
  const chunk = verse18.e.findIndex((c) => c.g.includes(at));
  if (at < 0 || chunk < 0) throw new Error(`no chunk for ${lemma} in verse 18`);
  return chunk;
}
const hintOf = (el: HTMLElement): HTMLElement | null => el.querySelector<HTMLElement>('[data-hint]');

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

  Scenario('A learning word stands in Greek with its English beneath', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Weave to Solid and learning words', async () => setWeave('Solid and learning words'));
    Then('verse 18 shows the Greek of {string} in place of {string} with the English {string} beneath it as a hint', async (_, lemma: string, english: string, hint: string) => {
      const chunk = chunkOfLemma18(lemma);
      expect(verse18.e[chunk].t).toBe(english);
      await waitFor(() => expect(chunkEl(18, chunk)).toHaveAttribute('data-woven'));
      const el = chunkEl(18, chunk);
      expect(el).toHaveAttribute('data-woven');
      expect(el).toHaveAttribute('data-learning');
      expect(squash(el.querySelector('[data-greek]')?.textContent)).toBe(verse18.g[verse18.g.findIndex((w) => nfc(wordLemma(w)) === nfc(lemma))].t);
      expect(squash(hintOf(el)?.textContent)).toBe(hint);
      expect(hintOf(el)).toHaveAttribute('lang', 'en');
    });
    And('the solid woven words of verse 1 have no hint', () => {
      expect(wovenIn(1).length).toBeGreaterThan(0);
      for (const el of wovenIn(1)) {
        expect(hintOf(el)).toBeNull();
        expect(el).not.toHaveAttribute('data-learning');
      }
    });
    And('the count line counts the learning word too', async () => {
      const woven = document.querySelectorAll('[data-woven]').length;
      await waitFor(() => expect(countLine()).toHaveTextContent(`${woven} words in Greek`));
    });
  });

  Scenario('Solid words alone leave a learning word in English', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Weave to Solid words', async () => setWeave('Solid words'));
    Then('{string} in verse {int} is English', (_, english: string, n: number) => {
      const el = within(verseEl(n)).getByRole('button', { name: english });
      expect(el).not.toHaveAttribute('data-woven');
    });
  });

  Scenario('When it turns solid the English hint goes', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he sets Weave to Solid and learning words', async () => setWeave('Solid and learning words'));
    When('he answers the word {string} right twice in the Quick test', async (_, lemma: string) => {
      const chunk = chunkOfLemma18(lemma);
      await waitFor(() => expect(hintOf(chunkEl(18, chunk))).not.toBeNull());
      expect(await recordAnswer(lemma, true)).toBe('learning');
      expect(await recordAnswer(lemma, true)).toBe('solid');
    });
    Then('verse 18 shows the Greek of {string} in place of {string} with no hint beneath it', async (_, lemma: string, english: string) => {
      const chunk = chunkOfLemma18(lemma);
      expect(verse18.e[chunk].t).toBe(english);
      await waitFor(() => expect(hintOf(chunkEl(18, chunk))).toBeNull());
      expect(chunkEl(18, chunk)).toHaveAttribute('data-woven');
      expect(chunkEl(18, chunk)).not.toHaveAttribute('data-learning');
    });
  });

  Scenario('The Weave setting offers Off, Solid, Solid and learning', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he opens Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('the Weave setting offers {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      const group = await screen.findByRole('group', { name: 'Weave' });
      expect(within(group).getAllByRole('button').map((e) => e.textContent)).toEqual([a, b, c]);
    });
    And('the Weave setting allows the values {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      const allowed = SETTINGS.find((s) => s.key === 'weave')?.allowed;
      expect(allowed?.kind === 'choice' ? allowed.values.map((v) => v.value) : []).toEqual([a, b, c]);
    });
  });
  Scenario('Settings > Weave has a Words row and a Grammar row', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he opens Settings', openSettings);
    Then('the Words row is labelled {string} and offers {string}, {string} and {string}', async (_, label: string, a: string, b: string, c: string) => {
      const group = await screen.findByRole('group', { name: 'Weave' });
      expect(group.parentElement).toHaveTextContent(label);
      expect(within(group).getAllByRole('button').map((e) => e.textContent)).toEqual([a, b, c]);
    });
    And('the Grammar row is labelled {string} and offers {string}, {string} and {string}', async (_, label: string, a: string, b: string, c: string) => {
      const group = await screen.findByRole('group', { name: 'Grammar' });
      expect(group.parentElement).toHaveTextContent(label);
      expect(within(group).getAllByRole('button').map((e) => e.textContent)).toEqual([a, b, c]);
    });
    And('the Grammar setting allows the values {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      const allowed = SETTINGS.find((s) => s.key === 'weaveGrammar')?.allowed;
      expect(allowed?.kind === 'choice' ? allowed.values.map((v) => v.value) : []).toEqual([a, b, c]);
    });
    And('the Grammar row is set to {string}', (_, chip: string) => {
      const group = screen.getByRole('group', { name: 'Grammar' });
      expect(within(group).getByRole('button', { name: chip })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  Scenario('Solid words with Solid grammar leaves only the chunks whose forms are solid in Greek', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('every grammar idea is solid except the dative case, which is not yet', () => setLevels('notYet'));
    When('he sets Weave to Solid words', async () => setWeave('Solid words'));
    And('he sets the Weave grammar to Solid', async () => setGrammar('Solid'));
    Then('the Greek {string} is woven in verse {int}', async (_, lemma: string, n: number) => {
      const { word, chunk } = wordOfLemma(lemma);
      await waitFor(() => expect(chunkEl(n, chunk)).toHaveAttribute('data-woven'));
      expect(squash(chunkEl(n, chunk).textContent)).toBe(word.t);
    });
    And('{string} in verse {int} is English', async (_, english: string, n: number) => {
      await waitFor(() => expect(within(verseEl(n)).getByRole('button', { name: english })).not.toHaveAttribute('data-woven'));
    });
    And('{string} in verse {int} is also English', async (_, english: string, n: number) => {
      await waitFor(() => expect(within(verseEl(n)).getByRole('button', { name: english })).not.toHaveAttribute('data-woven'));
    });
  });

  Scenario('Frontier grammar brings back the chunks whose grammar is at the frontier', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('every grammar idea is solid except the dative case, which is at the frontier', () => setLevels('frontier'));
    And('he sets Weave to Solid words', async () => setWeave('Solid words'));
    And('he sets the Weave grammar to Solid', async () => setGrammar('Solid'));
    And('{string} in verse {int} is English', async (_, english: string, n: number) => {
      await waitFor(() => expect(within(verseEl(n)).getByRole('button', { name: english })).not.toHaveAttribute('data-woven'));
    });
    When('he sets the Weave grammar to + Frontier', async () => setGrammar('+ Frontier'));
    Then('the Greek {string} is woven in verse {int}', async (_, lemma: string, n: number) => {
      const { word, chunk } = wordOfLemma(lemma);
      await waitFor(() => expect(chunkEl(n, chunk)).toHaveAttribute('data-woven'));
      expect(squash(chunkEl(n, chunk).textContent)).toBe(word.t);
    });
    And('the Greek {string} is also woven in verse {int}', async (_, lemma: string, n: number) => {
      const { word, chunk } = wordOfLemma(lemma);
      await waitFor(() => expect(chunkEl(n, chunk)).toHaveAttribute('data-woven'));
      expect(squash(chunkEl(n, chunk).textContent)).toBe(word.t);
    });
  });

  Scenario('Grammar Any weaves as before', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('no grammar idea has a level', async () => expect(await db.grammarLevels.count()).toBe(0));
    When('he sets Weave to Solid words', async () => setWeave('Solid words'));
    Then('the Weave grammar is Any', async () => expect(await getWeaveGrammar()).toBe('any'));
    And('the Greek {string} is woven in verse {int}', async (_, lemma: string, n: number) => {
      const { word, chunk } = wordOfLemma(lemma);
      await waitFor(() => expect(chunkEl(n, chunk)).toHaveAttribute('data-woven'));
      expect(squash(chunkEl(n, chunk).textContent)).toBe(word.t);
    });
    And('every woven chunk of verse 1 is a chunk whose Greek words are all solid', async () => {
      const solid = await solidLemmas();
      verse1.e.forEach((c, i) => {
        const allSolid = !c.s && c.t !== '-' && c.g.length > 0 && c.g.every((g) => solid.has(nfc(wordLemma(verse1.g[g]))));
        expect(chunkEl(1, i).hasAttribute('data-woven'), `chunk ${i} "${c.t}"`).toBe(allSolid);
      });
    });
  });

  Scenario('The four combinations are each one tap', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he opens Settings', openSettings);
    Then('each of Solid words, + Learning words, with Solid grammar, + Frontier grammar is set by one tap on each row', async () => {
      const words = within(await screen.findByRole('group', { name: 'Weave' }));
      const grammar = within(await screen.findByRole('group', { name: 'Grammar' }));
      const combos: [string, string, string, string][] = [
        ['Solid', 'solid', 'Solid', 'solid'],
        ['Solid', 'solid', '+ Frontier', 'solid+frontier'],
        ['+ Learning', 'solid+learning', 'Solid', 'solid'],
        ['+ Learning', 'solid+learning', '+ Frontier', 'solid+frontier'],
      ];
      for (const [wChip, wValue, gChip, gValue] of combos) {
        // one tap on each row, and nothing else, leaves both rows (and the saved settings) at the combination
        await user.click(words.getByRole('button', { name: wChip }));
        await user.click(grammar.getByRole('button', { name: gChip }));
        await waitFor(async () => {
          expect(await getWeave()).toBe(wValue);
          expect(await getWeaveGrammar()).toBe(gValue);
        });
        expect(words.getByRole('button', { name: wChip })).toHaveAttribute('aria-pressed', 'true');
        expect(grammar.getByRole('button', { name: gChip })).toHaveAttribute('aria-pressed', 'true');
      }
    });
  });
});
