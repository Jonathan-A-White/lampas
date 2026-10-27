// features/steps/languages.steps.tsx — runs features/languages.feature: Which languages? and a dial for each language, on the real app opened on a new phone (mw-gdcyf98.2).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { GREEK_LEVELS } from '../../src/settings/definitions/greekInterest';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type ReceivedGrist } from '../../tests/support/fake-postern';
import { placeInterest } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { applyChanges } from '../../src/settings/registry';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';

const user = userEvent.setup();

// jsdom draws no layout and has no scrollIntoView
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openOnNewPhone(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  // as the app places a new phone before its first render (src/main.tsx): both dials at 0, nothing else written
  await placeInterest();
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await screen.findByRole('group', { name: 'Which languages?' });
}

const stepOf = (name: string): string => {
  const found = GREEK_LEVELS.find((l) => l.name === name);
  if (!found) throw new Error(`no step ${name}`);
  return String(found.level);
};
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern | undefined;

/** The app opened on a chapter with the two dials saved at these steps and nothing else of a reader (the address names the chapter). A fake Postern answers the tutor when `postern` is true. */
async function openChapter(title: string, greek: string, hebrew: string, postern = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  fake = undefined;
  if (postern) {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
    tutorTimings.pollMs = 20;
    fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer: { answer: 'It means in the beginning.', words: [] } };
    const chapterFetch = globalThis.fetch;
    const mill = fake;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? mill.fetch(input, init) : chapterFetch(input, init)));
  }
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await db.settings.bulkPut([
    { key: 'greekInterest', value: stepOf(greek) },
    { key: 'hebrewInterest', value: stepOf(hebrew) },
  ]);
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const switchGroup = (): HTMLElement | null => screen.queryByRole('group', { name: 'Language' });
const talkGrists = (): ReceivedGrist[] => (fake?.received ?? []).filter((g) => g.grist.kind === 'bible-talk');
const OPENED = 'Lampas is opened on {string} with Greek at {string} and Hebrew at {string}';

const languages = (): HTMLElement => screen.getByRole('group', { name: 'Which languages?' });
const dial = (name: string): HTMLElement | null => screen.queryByRole('group', { name });
const pressed = (group: HTMLElement | null, label: string): boolean => {
  if (!group) return false;
  return within(group).queryByRole('button', { name: label })?.getAttribute('aria-pressed') === 'true';
};
/** The row a page draws under the name the feature gives it (the setting's `data-setting`). */
const ROW_OF: Readonly<Record<string, string>> = { 'Greek voice': 'greekVoice', 'Hebrew in the tutor': 'hebrewDepth' };
const rowDrawn = (name: string): boolean => document.querySelector(`[data-setting="${ROW_OF[name]}"]`) !== null;
const groupButtons = (): string[] => within(screen.getByRole('list', { name: 'Settings groups' })).getAllByRole('button').map((b) => b.textContent ?? '');

/** The Settings home again, from wherever a group's page left it. */
async function toHome(): Promise<void> {
  const back = screen.queryByRole('button', { name: '‹ Settings' });
  if (back) await user.click(back);
  await screen.findByRole('group', { name: 'Which languages?' });
}

const feature = await loadFeature('features/languages.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'Lampas is opened on Settings on a new phone';
  const chooses = async (_: unknown, label: string): Promise<void> => {
    await user.click(await within(languages()).findByRole('button', { name: label }));
  };
  const choosesOnDial = async (_: unknown, step: string, name: string): Promise<void> => {
    const group = await screen.findByRole('group', { name });
    await user.click(within(group).getByRole('button', { name: step }));
    // the write is not awaited by the tap: the next step starts when the dial shows the step
    await waitFor(() => expect(pressed(dial(name), step), `${name} ${step}`).toBe(true));
  };
  const languagesHas = async (_: unknown, label: string): Promise<void> => {
    await waitFor(() => expect(pressed(languages(), label)).toBe(true));
    expect(within(languages()).getAllByRole('button')).toHaveLength(4);
  };
  const dialHas = async (_: unknown, name: string, step: string): Promise<void> => {
    await waitFor(() => expect(pressed(dial(name), step), `${name} ${step}`).toBe(true));
  };
  const noDialNamed = async (_: unknown, name: string): Promise<void> => {
    await waitFor(() => expect(dial(name)).toBeNull());
  };
  const noDial = async (): Promise<void> => {
    await waitFor(() => expect([dial('How much Greek?'), dial('How much Hebrew?')]).toEqual([null, null]));
  };
  const noGroup = async (_: unknown, title: string): Promise<void> => {
    await toHome();
    await waitFor(() => expect(groupButtons().filter((t) => t.startsWith(title))).toEqual([]));
  };
  const pageHas = async (_: unknown, title: string, name: string): Promise<void> => {
    await toHome();
    await openSettingsGroup(user, title === 'Learning' ? 'greek' : 'listening');
    await waitFor(() => expect(rowDrawn(name), name).toBe(true));
  };
  const pageHasNo = async (_: unknown, title: string, name: string): Promise<void> => {
    await toHome();
    await openSettingsGroup(user, title === 'Learning' ? 'greek' : 'listening');
    await waitFor(() => expect(rowDrawn(name), name).toBe(false));
  };

  Scenario('A new phone is English only', ({ Given, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    Then('Which languages? has {string} chosen', languagesHas);
    And('Settings draws no dial', noDial);
    And('Settings lists no group {string}', noGroup);
    And('the Settings home draws no Greek or Hebrew setting', async () => {
      await toHome();
      const home = screen.getByRole('main').textContent ?? '';
      expect(home).not.toMatch(/Weave|Greek voice|Hebrew in the tutor|Paradigms|Strong/);
    });
  });

  Scenario('Choosing Greek shows the Greek dial at Curious and the Greek rows', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('Settings draws no dial {string}', noDialNamed);
    And('the dial {string} has five steps and no {string}', async (_: unknown, name: string, step: string) => {
      const buttons = within(await screen.findByRole('group', { name })).getAllByRole('button');
      expect(buttons).toHaveLength(5);
      expect(buttons.map((b) => b.textContent)).not.toContain(step);
      for (const b of buttons) expect(b.className).toMatch(/min-h-12/);
    });
    And('the {string} page draws {string}', pageHas);
  });

  Scenario('Choosing Hebrew shows the Hebrew dial and Hebrew in the tutor', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('Settings draws no dial {string}', noDialNamed);
    And('the {string} page draws {string}', pageHas);
    And('the {string} page draws no {string}', pageHasNo);
  });

  Scenario('Choosing Greek and Hebrew shows both dials', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('the dial {string} also has {string} chosen', dialHas);
  });

  Scenario('English only hides both dials and every Greek and Hebrew row, and choosing both again restores the levels', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    And('he chooses {string} on the dial {string}', choosesOnDial);
    And('he also chooses {string} on the dial {string}', choosesOnDial);
    And('he chooses {string} under Which languages?', chooses);
    Then('Settings draws no dial', noDial);
    And('Settings lists no group {string}', noGroup);
    And('the {string} page draws no {string}', pageHasNo);
    When('he chooses {string} under Which languages? again', async (_, label: string) => {
      await toHome();
      await chooses(_, label);
    });
    Then('the dial {string} has {string} chosen', dialHas);
    And('the dial {string} also has {string} chosen', dialHas);
  });

  Scenario('The tutor changes the Hebrew dial to 0 and the row reads Greek', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    And('the tutor changes {string} to {string}', async (_: unknown, key: string, value: string) => {
      // the tap does not await its writes: the tutor's change comes after both dials have been raised
      await waitFor(() => expect([dial('How much Greek?'), dial('How much Hebrew?')]).not.toContain(null));
      const { applied } = await applyChanges([{ key, value }]);
      expect(applied).toHaveLength(1);
    });
    Then('Which languages? has {string} chosen', languagesHas);
    And('Settings draws no dial {string}', noDialNamed);
  });

  const switchOffers = async (_: unknown, a: string, b: string): Promise<void> => {
    await waitFor(() => expect(switchGroup()).not.toBeNull());
    expect(within(switchGroup()!).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]);
  };
  const noSwitch = async (): Promise<void> => {
    // the verses are drawn before the check, and with them the header
    expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0);
    await waitFor(() => expect(switchGroup()).toBeNull());
  };
  const opened = (_: unknown, title: string, greek: string, hebrew: string): Promise<void> => openChapter(title, greek, hebrew);
  const verseInEnglish = (_: unknown, n: number): void => {
    const verse = document.querySelector<HTMLElement>(`[data-verse="${n}"]`)!;
    expect(verse.querySelector('[data-chunk]')).not.toBeNull();
    expect(verse.querySelector('[data-word]')).toBeNull();
  };

  Scenario('Genesis 1 at Hebrew Curious shows its switch and Matthew 1 at Greek Just English none', ({ Given, When, Then }) => {
    Given(OPENED, opened);
    Then('the language switch offers {string} and {string}', switchOffers);
    When(OPENED, opened);
    Then('the Reader draws no language switch', noSwitch);
  });

  Scenario('Matthew 1 at Greek Curious shows its switch and Genesis 1 at Hebrew Just English none', ({ Given, When, Then }) => {
    Given(OPENED, opened);
    Then('the language switch offers {string} and {string}', switchOffers);
    When(OPENED, opened);
    Then('the Reader draws no language switch', noSwitch);
  });

  const cardPhone = async (_: unknown, greek: string, hebrew: string): Promise<void> => {
    cleanup();
    clearBus();
    forgetTrail();
    localStorage.clear();
    vi.unstubAllGlobals();
    stubChapterFetch();
    window.history.replaceState(null, '', '/');
    await db.open();
    await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
    await db.settings.bulkPut([
      { key: 'greekInterest', value: stepOf(greek) },
      { key: 'hebrewInterest', value: stepOf(hebrew) },
      { key: 'readerView', value: 'greek' },
    ]);
  };
  const openCard = async (_: unknown, written: string): Promise<void> => {
    // the card a verse list or a Review question opens: the passage held (an Old Testament one too), as the reader's chapter file has it
    render(<ReferenceLink written={written} found={{ heading: written, held: { book: 'jon', chapter: 1, first: 1, last: 1 } }}>{written}</ReferenceLink>);
    await user.click(screen.getByRole('link', { name: written }));
    const card = await screen.findByRole('dialog', { name: written });
    await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
  };
  const cardText = (): HTMLElement => document.querySelector<HTMLElement>('[data-reference-text]')!;

  Scenario('A Review card of Jonah 1:1 is in the Hebrew view at Hebrew Curious, whatever Greek stands at', ({ Given, When, Then }) => {
    Given('a phone with Greek at {string} and Hebrew at {string} whose Reader is set to the original', cardPhone);
    When('a Review card of {string} is opened', openCard);
    Then('the card shows the verse in Hebrew, right to left', () => {
      expect(cardText()).toHaveAttribute('data-view', 'greek');
      expect(cardText()).toHaveAttribute('lang', 'he');
      expect(cardText()).toHaveAttribute('dir', 'rtl');
      expect(cardText().textContent).toMatch(/[\u0590-\u05FF]/);
      expect(cardText().textContent).not.toContain('word of the LORD');
    });
  });

  Scenario('A Review card of Jonah 1:1 is in English at Hebrew Just English, whatever Greek stands at', ({ Given, When, Then }) => {
    Given('a phone with Greek at {string} and Hebrew at {string} whose Reader is set to the original', cardPhone);
    When('a Review card of {string} is opened', openCard);
    Then('the card shows the verse in English', () => {
      expect(cardText()).toHaveAttribute('data-view', 'english');
      expect(cardText().textContent).toContain('word of the LORD');
    });
  });

  const taps = async (_: unknown, word: string, n: number): Promise<void> => {
    const chunk = [...document.querySelectorAll<HTMLElement>(`[data-verse="${n}"] [data-chunk]`)].find((c) => (c.textContent ?? '').includes(word));
    expect(chunk, `no chunk with ${word}`).toBeDefined();
    await user.click(chunk!);
  };
  const onlyEnglishSheet = async (): Promise<void> => {
    await screen.findByRole('dialog', { name: 'English word' });
    expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
  };
  for (const title of ['At English only Genesis 1 is plain and only the English word sheet opens', 'At English only Matthew 1 is plain and only the English word sheet opens']) {
    Scenario(title, ({ Given, When, Then, And }) => {
      Given(OPENED, opened);
      Then('the Reader draws no language switch', noSwitch);
      And('verse {int} is drawn in English', verseInEnglish);
      When('he taps the English word {string} in verse {int}', taps);
      Then('only the English word sheet opens', onlyEnglishSheet);
    });
  }

  Scenario('A talk on Genesis 1 carries hebrew_interest beside greek_interest', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} behind a fake Postern with Greek at {string} and Hebrew at {string}', (_: unknown, title: string, greek: string, hebrew: string) => openChapter(title, greek, hebrew, true));
    When('he opens the talk and asks {string}', async (_: unknown, question: string) => {
      const bar = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-talk-bar]');
        if (!found) throw new Error('the Talk bar is not drawn yet');
        return found;
      });
      await user.click(await within(bar).findByRole('button', { name: 'Talk' }));
      const sheet = await screen.findByRole('dialog', { name: /^Talk about / });
      await user.type(await within(sheet).findByRole('textbox', { name: 'Your message' }), question);
      await user.click(within(sheet).getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(talkGrists()).toHaveLength(1));
    });
    Then('the request carries greek_interest {string} with {string} next', (_: unknown, name: string, next: string) => {
      const field = (talkGrists()[0].input as { greek_interest?: { name: string; next?: { name: string } } }).greek_interest;
      expect([field?.name, field?.next?.name]).toEqual([name, next]);
    });
    And('the request carries hebrew_interest {string} with {string} next', (_: unknown, name: string, next: string) => {
      const field = (talkGrists()[0].input as { hebrew_interest?: { name: string; next?: { name: string } } }).hebrew_interest;
      expect([field?.name, field?.next?.name]).toEqual([name, next]);
    });
  });
});
