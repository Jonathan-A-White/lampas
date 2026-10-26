// features/steps/hebrew-word-sheet.steps.tsx — runs features/hebrew-word-sheet.feature: the word sheet of a Hebrew word (mw-5vvlay.2) on Genesis 1 (the copy of the built chapter in
// tests/fixtures/data/gen/1.json): its facts, the English tap's sheet with the Hebrew words of the chunk, a link by H7225 / the lemma / the lemma with its points off, the Study row's
// Hebrew Logos links, Listen in he-IL (voice-kit's honest fake, tests/support/fake-speech.ts), and the Greek sheet as it was.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { setResourceOption } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const user = userEvent.setup();
let synth: FakeSynth | undefined;

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Phone {
  settings?: Record<string, string>;
  /** the ids of the Logos lexicons ticked */
  ticked?: string[];
  speaks?: boolean;
  /** the address to open instead of a chapter */
  hash?: string;
}

/** Opens the app on a chapter (the address names it) or on a link, with these settings saved. */
async function openOn(title: string | null, phone: Phone = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = phone.speaks ? stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]) : undefined;
  if (phone.hash === undefined) {
    const at = (title ?? '').lastIndexOf(' ');
    const book = BOOKS.find((b) => b.name === (title ?? '').slice(0, at));
    if (!book || title === null) throw new Error(`no book ${title}`);
    window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  } else {
    window.history.replaceState(null, '', `/${phone.hash}`);
  }
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  for (const [key, value] of Object.entries(phone.settings ?? {})) await db.settings.put({ key, value });
  if (phone.ticked) await setResourceOption('logos', JSON.stringify(phone.ticked));
  if (phone.hash !== undefined) restoreLastRoute();
  render(<App />);
  if (title !== null) {
    await screen.findByRole('heading', { name: title, level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  }
}

const STRONGS = { 'resource.strongs': 'on' };
const LOGOS = { 'resource.logos': 'on' };

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-word]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no word "${text}" in verse ${verse}`);
  return found;
};
const chunkEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-chunk]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no chunk "${text}" in verse ${verse}`);
  return found;
};
const sheet = async (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Word' });
const fact = async (testId: string): Promise<HTMLElement> => within(await sheet()).findByTestId(testId);

const feature = await loadFeature('features/hebrew-word-sheet.feature');

describeFeature(feature, ({ Scenario }) => {
  const tapsHebrew = async (_: unknown, word: string, n: number): Promise<void> => user.click(wordEl(n, word));
  const showsForm = async (_: unknown, form: string): Promise<void> => {
    const h = await fact('sheet-word');
    expect(h).toHaveTextContent(form);
    expect(h).toHaveAttribute('lang', 'he');
    expect(h).toHaveAttribute('dir', 'rtl');
    expect(h.classList.contains('text-4xl')).toBe(true);
    expect(h.classList.contains('script-he')).toBe(true);
  };
  const showsLemma = async (_: unknown, lemma: string): Promise<void> => {
    const l = await fact('sheet-lemma');
    expect(l).toHaveTextContent(lemma);
    expect(l).toHaveAttribute('lang', 'he');
    expect(l).toHaveAttribute('dir', 'rtl');
  };
  const showsMeaning = async (_: unknown, meaning: string): Promise<void> => {
    expect(await fact('sheet-gloss')).toHaveTextContent(meaning);
  };
  const showsStrongs = async (_: unknown, number: string): Promise<void> => {
    await sheet();
    // with Strong's on its number is the Study row's link; with it off it is a fact of its own
    expect(within(await sheet()).getAllByText(number).length).toBeGreaterThan(0);
  };
  const showsParsing = async (_: unknown, parse: string): Promise<void> => {
    expect(squash((await fact('sheet-parse')).textContent)).toBe(parse);
  };
  const noParsingRow = async (): Promise<void> => {
    await sheet();
    expect(within(await sheet()).queryByTestId('sheet-parse')).toBeNull();
  };
  const hasLink = async (_: unknown, label: string, href: string): Promise<void> => {
    const link = await within(await sheet()).findByRole('link', { name: label });
    expect(link.getAttribute('href')).toBe(href);
  };

  Scenario('A tap on בְּרֵאשִׁ֖ית opens its sheet: the form, the transliteration, the lemma, the meaning, the parsing, H7225 and Listen', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} and Strong\'s on', (_, view: string) => openOn('Genesis 1', { settings: { readerView: view, ...STRONGS } }));
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('the Hebrew word sheet shows the form {string} large, in Hebrew, right to left', showsForm);
    And('it shows the transliteration {string}', async (_, tr: string) => {
      expect(await fact('sheet-transliteration')).toHaveTextContent(tr);
    });
    And('it shows the lemma {string} in Hebrew, right to left', showsLemma);
    And('it shows the meaning {string}', showsMeaning);
    And('it shows the definition {string}', async (_, text: string) => {
      expect(await fact('sheet-definition')).toHaveTextContent(text);
    });
    And('it shows the parsing {string}', showsParsing);
    And('it shows the Strong\'s number {string}', showsStrongs);
    And('it has a Listen button', async () => {
      expect(within(await sheet()).getByRole('button', { name: 'Listen' })).toBeInTheDocument();
    });
    And('it has no Paradigm row and no Help with this word row', async () => {
      expect(within(await sheet()).queryByTestId('sheet-paradigm')).toBeNull();
      expect(within(await sheet()).queryByRole('group', { name: 'Help with this word' })).toBeNull();
    });
  });

  Scenario('The parsing of a verb is the long form, in plain words with no Greek term to tap', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { settings: { readerView: view } }));
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('it shows the parsing {string}', showsParsing);
    And('no word of the parsing is a link', async () => {
      expect(within(await fact('sheet-parse')).queryAllByRole('button')).toHaveLength(0);
    });
  });

  Scenario('Listen says the word in the phone\'s Hebrew voice', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} on a phone with an English, a Greek and a Hebrew voice', (_, view: string) =>
      openOn('Genesis 1', { settings: { readerView: view }, speaks: true }),
    );
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    And('he taps Listen on the Hebrew word sheet', async () => {
      await user.click(within(await sheet()).getByRole('button', { name: 'Listen' }));
    });
    Then('the phone says {string} in {string}', async (_, text: string, lang: string) => {
      await waitFor(() => expect((synth?.spoken ?? []).at(-1)).toMatchObject({ text, lang }));
    });
  });

  Scenario('An English tap opens the sheet with the Hebrew words of the chunk, and the English sheet under them', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with nothing saved and Logos on', () => openOn('Genesis 1', { settings: LOGOS }));
    When('he taps the chunk {string} of verse {int}', async (_, text: string, n: number) => user.click(chunkEl(n, text)));
    Then('the Hebrew word sheet is headed {string}', async (_, english: string) => {
      expect(await within(await sheet()).findByTestId('sheet-heading')).toHaveTextContent(english);
    });
    And('it shows the lemma {string} in Hebrew, right to left', showsLemma);
    And('under the Hebrew words it lists the English words {string} and {string}, each with its Listen', async (_, a: string, b: string) => {
      const items = within(await sheet()).getAllByRole('listitem');
      expect(items.map((li) => squash(li.querySelector('[lang="en"]')?.textContent))).toEqual([a, b]);
      for (const [i, word] of [a, b].entries()) expect(within(items[i]).getByRole('button', { name: `Listen: ${word}` })).toBeInTheDocument();
    });
    And('the English word {string} has a {string} link', async (_, word: string, name: string) => {
      const item = within(await sheet()).getAllByRole('listitem').find((li) => squash(li.querySelector('[lang="en"]')?.textContent) === word);
      expect(item && within(item).getByRole('link', { name })).toBeTruthy();
    });
  });

  Scenario('A Hebrew word the English has no chunk for opens its sheet all the same', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { settings: { readerView: view } }));
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('the Hebrew word sheet shows the form {string} large, in Hebrew, right to left', showsForm);
    And('it shows the meaning {string}', showsMeaning);
  });

  const linkOpens = (_: unknown, hash: string): Promise<void> => openOn(null, { hash, settings: STRONGS });

  Scenario('#/?word=H7225 opens the sheet of the word', ({ Given, Then, And }) => {
    Given('a link {string} is opened on a phone with Strong\'s on', linkOpens);
    Then('the Hebrew word sheet shows the lemma {string} in Hebrew, right to left', showsLemma);
    And('it shows the meaning {string}', showsMeaning);
    And('it shows the Strong\'s number {string}', showsStrongs);
    And('it has no Parsing row', noParsingRow);
  });

  Scenario('The pointed lemma finds the word', ({ Given, Then, And }) => {
    Given('a link {string} is opened on a phone with Strong\'s on', linkOpens);
    Then('the Hebrew word sheet shows the lemma {string} in Hebrew, right to left', showsLemma);
    And('it shows the Strong\'s number {string}', showsStrongs);
  });

  Scenario('A typed word with its points off finds the word', ({ Given, Then, And }) => {
    Given('a link {string} is opened on a phone with Strong\'s on', linkOpens);
    Then('the Hebrew word sheet shows the lemma {string} in Hebrew, right to left', showsLemma);
    And('it shows the Strong\'s number {string}', showsStrongs);
  });

  Scenario('A Hebrew word Lampas does not hold says so and opens no sheet', ({ Given, Then, And }) => {
    Given('a link {string} is opened on a phone with Strong\'s on', linkOpens);
    Then('the reader shows a notice that says {string}', async (_, text: string) => {
      await waitFor(() => expect(document.querySelector('[data-link-notice]')).toHaveTextContent(text));
    });
    And('no word sheet is open', () => {
      expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
    });
  });

  Scenario('With Logos on the Study row has Strong\'s Hebrew, Bible Word Study and a Hebrew lexicon of his', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} and Logos on with New Strong\'s and BDB ticked', (_, view: string) =>
      openOn('Genesis 1', { settings: { readerView: view, ...LOGOS }, ticked: ['newstrongs', 'bdb'] }),
    );
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('the Study row has the link {string} to {string}', hasLink);
    And('the Study row has the link {string} to {string}', hasLink);
    And('the Study row has Bible Word Study for {string} in Hebrew, the lemma {string}', async (_, _word: string, lemma: string) => {
      const link = await within(await sheet()).findByRole('link', { name: 'Bible Word Study in Logos' });
      expect(link.getAttribute('href')).toBe(`logos4:Guide;t=Bible%20Word%20Study;lemma=${encodeURIComponent(lemma)}`);
    });
  });

  Scenario('A Greek lexicon of his is not drawn for a Hebrew word', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} and Logos on with BDAG and BDB ticked', (_, view: string) =>
      openOn('Genesis 1', { settings: { readerView: view, ...LOGOS }, ticked: ['bdag', 'bdb'] }),
    );
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('the Study row has the link {string} to {string}', hasLink);
    And('the Study row has no link {string}', async (_, name: string) => {
      await sheet();
      expect(within(await sheet()).queryByRole('link', { name })).toBeNull();
    });
  });

  Scenario('With Logos off the sheet offers to turn it on', ({ Given, When, Then }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { settings: { readerView: view } }));
    When('he taps the Hebrew word {string} of verse {int}', tapsHebrew);
    Then('the Hebrew word sheet offers {string}', async (_, name: string) => {
      expect(await within(await sheet()).findByRole('button', { name })).toBeInTheDocument();
    });
  });

  Scenario('At Just English an English tap opens the small English sheet and no Hebrew word does', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Greek dial at Just English', () => openOn('Genesis 1', { settings: { greekInterest: '0' } }));
    When('he taps the chunk {string} of verse {int}', async (_, text: string, n: number) => user.click(chunkEl(n, text)));
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'English word' });
      expect(within(dialog).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('the Hebrew word sheet is not opened', () => {
      expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
    });
  });

  Scenario('The Greek sheet on a Greek word is unchanged', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the saved view {string}', (_, view: string) => openOn('Romans 8', { settings: { readerView: view } }));
    When('he taps the Greek word {string} of verse {int}', async (_, word: string, n: number) => user.click(wordEl(n, word)));
    Then('the Greek word sheet shows the form {string}, its respelling and no transliteration', async (_, form: string) => {
      expect(await fact('sheet-word')).toHaveTextContent(form);
      expect((await fact('sheet-word')).getAttribute('lang')).toBe('el');
      expect(await fact('sheet-respelling')).not.toBeEmptyDOMElement();
      expect(within(await sheet()).queryByTestId('sheet-transliteration')).toBeNull();
    });
    And('its parsing is made of tappable grammar terms', async () => {
      expect(within(await fact('sheet-parse')).getAllByRole('button').length).toBeGreaterThan(0);
    });
  });
});
