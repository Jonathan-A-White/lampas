// features/steps/tutor-links.steps.tsx — runs features/tutor-links.feature: the links of a Bible talk answer (mw-5r3p30.75), a word or a verse, shown as
// chips that open in the study resources he switched on. Postern is the fake (tests/support/fake-postern.ts) whose mill answers every grist with the
// answer a scenario sets; fetch serves the chapter files and the lexicon from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setLogosBible, setReaderView, setResourceOn, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readerOf } from '../../src/nav/route';
import { RESOURCES } from '../../src/resources';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

type Link = { kind: 'word'; lemma: string } | { kind: 'verse'; reference: string };

async function open(links: Link[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Love is the word Paul keeps coming back to.', words: [], links } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turn = () => sheet().querySelector<HTMLElement>('[data-turn]') as HTMLElement;
const links = () => within(turn()).queryAllByRole('link');

async function askAboutVerse28(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Verse 28' }));
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
  await user.click(await within(view).findByRole('button', { name: 'Talk about verse 28' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), 'Tell me about love');
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(sheet().querySelector('[data-turn]')).not.toBeNull());
}

const feature = await loadFeature('features/tutor-links.feature');

describeFeature(feature, ({ Scenario }) => {
  const word = (_: unknown, lemma: string) => open([{ kind: 'word', lemma }]);
  const verse = (_: unknown, reference: string) => open([{ kind: 'verse', reference }]);
  const switchOn = async (_: unknown, name: string) => {
    const resource = RESOURCES.find((r) => r.name === name);
    if (!resource) throw new Error(`no study resource ${name}`);
    await setResourceOn(resource.id, true);
  };
  const shows = async (_: unknown, name: string, href: string) => {
    const link = await within(turn()).findByRole('link', { name, exact: true });
    expect(link).toHaveAttribute('href', href);
  };
  const fallback = (_: unknown, fallbackUrl: string) => {
    expect(links().find((l) => l.getAttribute('data-fallback') === fallbackUrl)).toBeDefined();
  };
  const ask = askAboutVerse28;

  Scenario('A word link opens his ticked Logos lexicon at that lemma', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the word {string}', word);
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('that link has the fallback {string}', fallback);
  });

  Scenario('A word link shows the first link of each resource he switched on', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the word {string}', word);
    And('the study resource {string} is switched on', switchOn);
    And('the study resource {string} is also switched on', switchOn);
    And('the study resource {string} is switched on as well', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('the answer also shows the study link {string} to {string}', shows);
    And('the answer has one more study link {string} to {string}', shows);
  });

  Scenario('A verse link opens the verse in the Reader', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the verse {string}', verse);
    When('he asks the tutor about verse 28', ask);
    And('he taps the study link {string}', async (_, name: string) => {
      await user.click(await within(turn()).findByRole('button', { name, exact: true }));
    });
    Then('the Talk sheet is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
    });
    And('the Reader is open on verse {int} of Romans 8', async (_, n: number) => {
      await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book: 'rom', chapter: 8, verse: n }));
    });
  });

  Scenario('A verse link also opens the verse in his Bible in Logos when Logos is on', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the verse {string}', verse);
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('the answer also shows a button {string}', async (_, name: string) => {
      expect(await within(turn()).findByRole('button', { name, exact: true })).toBeInTheDocument();
    });
  });

  Scenario('A link to a resource he has not switched on is not shown', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the word {string}', word);
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('the answer shows no Logos link and no Accordance link', () => {
      expect(links().map((l) => l.getAttribute('aria-label'))).toEqual(['G26 for ἀγάπη']);
    });
  });

  Scenario('With no study resource on, a word link shows nothing and the answer is still there', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the word {string}', word);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows no study links', async () => {
      await waitFor(() => expect(turn()).toHaveTextContent('Love is the word'));
      // the links are looked up first, so give a late chip the time it would take
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(turn().querySelector('[data-tutor-links]')).toBeNull();
    });
    And('the answer text is shown', () => {
      expect(turn()).toHaveTextContent('Love is the word Paul keeps coming back to.');
    });
  });

  Scenario('An answer with an empty list of links shows no link row, even with a resource on', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with an empty list of links', () => open([]));
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows no study links', async () => {
      await waitFor(() => expect(turn()).toHaveTextContent('Love is the word'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(turn().querySelector('[data-tutor-links]')).toBeNull();
    });
    And('the answer text is shown', () => {
      expect(turn()).toHaveTextContent('Love is the word Paul keeps coming back to.');
    });
  });

  Scenario('An answer carries at most three links', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with links to the words {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) =>
      open([a, b, c, d].map((lemma) => ({ kind: 'word' as const, lemma }))),
    );
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows {int} study links', async (_, count: number) => {
      await waitFor(() => expect(links()).toHaveLength(count));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(links()).toHaveLength(count);
    });
  });

  Scenario('An Old Testament verse link opens in his Bible in Logos and has no Reader button', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the verse {string}', verse);
    And('the study resource {string} is switched on', switchOn);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('the answer has no Reader button', () => {
      expect(within(turn()).queryAllByRole('button', { name: /in Lampas/ })).toEqual([]);
    });
  });

  Scenario('An Old Testament verse link follows the Bible he picked in Settings', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the verse {string}', verse);
    And('the study resource {string} is switched on', switchOn);
    And('his Bible in Logos is {string}', async (_, id: string) => {
      await setLogosBible(id);
    });
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
  });

  Scenario('An Old Testament verse link with no study resource on shows nothing', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the verse {string}', verse);
    When('he asks the tutor about verse 28', ask);
    Then('the answer shows no study links', async () => {
      await waitFor(() => expect(turn()).toHaveTextContent('Love is the word'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(turn().querySelector('[data-tutor-links]')).toBeNull();
    });
  });
});
