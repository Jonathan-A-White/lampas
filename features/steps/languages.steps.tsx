// features/steps/languages.steps.tsx — runs features/languages.feature: Which languages? and a dial for each language, on the real app opened on a new phone (mw-gdcyf98.2).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import Dexie from 'dexie';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { putAtLevels, type Level } from './levels';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { GREEK_LEVELS } from '../../src/settings/definitions/greekInterest';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type ReceivedGrist } from '../../tests/support/fake-postern';
import { placeInterest } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { applyChanges } from '../../tests/support/settings';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { waitForGrists, waitWhileChanging } from '../../tests/support/wait-progress';
import { openTutor } from './open-tutor';
import { openSettings } from '../../tests/unit/openSettings';
import { closeDatabase } from './close-database';

const user = userEvent.setup();

// The step that puts both dials back in the scenario 'English only hides both dials ...' takes 9-10 s on a calm host (Greek at Learning and Hebrew at Reading in Hebrew bring a run of writes, each
// re-read by every live query drawn) and the step before it 4-5 s: a full-suite run on a loaded host multiplies that toward the preset's 40 s (mw-ar5k42b.36).
vi.setConfig({ testTimeout: 90_000 });

// jsdom draws no layout and has no scrollIntoView
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(async () => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
});

async function openOnNewPhone(): Promise<void> {
  cleanup();
  vi.restoreAllMocks();
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
  const title = await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  // the Menu is looked for in the Reader's header: a role query over the whole chapter (a button for each word) is the 3 s this step took (mw-indx1x6.41)
  await openSettings(user, within(title.closest('header') as HTMLElement));
  await findGroup('Which languages?');
}

const stepOf = (name: string): Level => {
  const found = GREEK_LEVELS.find((l) => l.name === name);
  if (!found) throw new Error(`no step ${name}`);
  return found.level;
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
  await putAtLevels({ greek: stepOf(greek), hebrew: stepOf(hebrew) });
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const switchGroup = (): HTMLElement | null => screen.queryByRole('group', { name: 'Language' });
const talkGrists = (): ReceivedGrist[] => (fake?.received ?? []).filter((g) => g.grist.kind === 'bible-talk');
const OPENED = 'Lampas is opened on {string} with Greek at {string} and Hebrew at {string}';

/**
 * The group named `name` on the page, found by the attribute the Settings controls draw it with: a role query on `screen` computes the name of every element on the page, and the
 * steps below ask on every poll of a waitFor, 1 s of a 2 s step on a loaded host (mw-indx1x6.41).
 */
const groupNamed = (name: string): HTMLElement | null => document.querySelector<HTMLElement>(`[role="group"][aria-label="${name}"]`);
const findGroup = async (name: string): Promise<HTMLElement> => {
  // the Settings home is drawn again after a choice that is a run of writes, each re-read by the rows: a wait for each state it passes through (mw-u2w5klk.349.162)
  await waitWhileChanging(() => {
    if (!groupNamed(name)) throw new Error(`no group named ${name}`);
  }, progressOf(name));
  return groupNamed(name)!;
};
const languages = (): HTMLElement => {
  const found = groupNamed('Which languages?');
  if (!found) throw new Error('no group named Which languages?');
  return found;
};
const dial = (name: string): HTMLElement | null => groupNamed(name);
/** What a group draws pressed, for a failure's message: a dial that is not where a step expects it says where it is. */
const pressedIn = (group: HTMLElement | null): string =>
  group ? Array.from(group.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent).join(', ') || 'none pressed' : 'no such group';
/** Everything the store holds of his settings, as text: the dials, the levels kept for the way back and what each step brings move it write by write, while on a loaded host the screen
 * may still stand where it was for a whole wait (mw-fnvjof.17.177). */
const storedSettings = async (): Promise<string> =>
  (await db.settings.toArray())
    .map((row) => `${row.key}=${row.value}`)
    .sort()
    .join(', ');
/** What a step that moves the dials gives to waitWhileChanging: the screen and the store, so a wait in which only the store moved goes on. */
const progressOf = (name: string) => async (): Promise<string> => `${pressedIn(groupNamed(name))} | ${await storedSettings()}`;
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
  await findGroup('Which languages?');
}

/** How long the Settings home's re-read of what the dials brought is held (holdHomeReads). */
const HOME_READ_MS = 2500;

/**
 * The read of 'Set each language on its own' (a key only the Settings home's list of values reads while a page is not open; db.settings.get answers late) is made at once and answers
 * HOME_READ_MS later, as a loaded host holds it: the home still lists the groups of the choice before, while Which languages? (read key by key, and quicker) already shows the new one
 * (mw-ar5k42b.36). The hold is put on the spy this file's next openOnNewPhone replaces: it is undone by vi.restoreAllMocks in openOnNewPhone.
 */
async function holdHomeReads(): Promise<void> {
  const get = db.settings.get.bind(db.settings) as (key: unknown) => Promise<unknown>;
  vi.spyOn(db.settings, 'get').mockImplementation(((key: unknown) =>
    get(key).then((row) => (key === 'pronunciationSeparate' ? new Dexie.Promise((resolve) => setTimeout(() => resolve(row), HOME_READ_MS)) : row))) as unknown as typeof db.settings.get);
}

const feature = await loadFeature('features/languages.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'Lampas is opened on Settings on a new phone';
  const chooses = async (_: unknown, label: string): Promise<void> => {
    await user.click(await within(languages()).findByRole('button', { name: label }));
    // the tap does not await its writes (the dials move one after the other, each with the settings it brings or hides): the next step starts when Which languages? shows the choice,
    // which it does only once both dials stand where it puts them. A step that moves a dial straight after, with the first move's writes still going, interleaves two moves of the
    // shared settings (mw-qtu3zvz.175). The choice is up to two moves, one dial after the other, and a move is a run of writes that every drawn row re-reads (3-4 s for the first at
    // load 16): each state the row passes through gets its own wait, and the step fails when one goes by with the row where it was (mw-qtu3zvz.186).
    try {
      await waitWhileChanging(
        () => expect(pressed(languages(), label), `Which languages? ${label}, drawn: ${pressedIn(languages())}`).toBe(true),
        progressOf('Which languages?'),
      );
    } catch (failure) {
      // a later failure says whether the tap never wrote (the store stands as it was) or the redraw did not come (the store holds the choice)
      throw new Error(`${failure instanceof Error ? failure.message.split('\n')[0] : String(failure)}; the store holds: ${await storedSettings()}`);
    }
  };
  const choosesOnDial = async (_: unknown, step: string, name: string): Promise<void> => {
    const group = await findGroup(name);
    await user.click(within(group).getByRole('button', { name: step }));
    // the write is not awaited by the tap: the next step starts when the dial shows the step
    await waitWhileChanging(
      () => expect(pressed(dial(name), step), `${name} ${step}, drawn: ${pressedIn(dial(name))}`).toBe(true),
      progressOf(name),
    );
  };
  const languagesHas = async (_: unknown, label: string): Promise<void> => {
    await waitFor(() => expect(pressed(languages(), label)).toBe(true));
    expect(within(languages()).getAllByRole('button')).toHaveLength(4);
  };
  // a choice of languages is up to two dial moves with the levels kept for each put back, write by write (mw-u2w5klk.349.162): the dial checks after it wait through each state the dials pass
  // through, as the steps that move them do, and fail only when a whole wait goes by with the screen and the store where they were
  const dialHas = async (_: unknown, name: string, step: string): Promise<void> => {
    await waitWhileChanging(
      () => expect(pressed(dial(name), step), `${name} ${step}, drawn: ${pressedIn(dial(name))}`).toBe(true),
      progressOf(name),
    );
  };
  const noDialNamed = async (_: unknown, name: string): Promise<void> => {
    await waitWhileChanging(() => expect(dial(name), `${name} is still drawn`).toBeNull(), progressOf(name));
  };
  const noDial = async (): Promise<void> => {
    await waitWhileChanging(
      () => expect([dial('How much Greek?'), dial('How much Hebrew?')], 'a dial is still drawn').toEqual([null, null]),
      async () => `${await progressOf('How much Greek?')()} | ${await progressOf('How much Hebrew?')()}`,
    );
  };
  const noGroup = async (_: unknown, title: string): Promise<void> => {
    await toHome();
    await waitFor(() => expect(groupButtons().filter((t) => t.startsWith(title))).toEqual([]));
  };
  /** Opens the page `title` from the Settings home. The home lists its groups from values it reads after the dials move, later than Which languages? shows the choice (a loaded host
   * holds that read): the list may still be the one of the choice before, so the step waits for the group to be listed, not asks for its button the moment the list is drawn (mw-ar5k42b.36). */
  const openPage = async (title: string): Promise<void> => {
    await toHome();
    await waitFor(() => expect(groupButtons().filter((t) => t.startsWith(title)), `the Settings home lists ${title}: ${groupButtons().join(' | ')}`).not.toEqual([]));
    await openSettingsGroup(user, title === 'Learning' ? 'greek' : 'listening');
  };
  const pageHas = async (_: unknown, title: string, name: string): Promise<void> => {
    await openPage(title);
    await waitFor(() => expect(rowDrawn(name), name).toBe(true));
  };
  const pageHasNo = async (_: unknown, title: string, name: string): Promise<void> => {
    await openPage(title);
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
      const buttons = within(await findGroup(name)).getAllByRole('button');
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

  Scenario('A page opened straight after the choice waits for the Settings home to list it', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    And('the Settings home is slow to read what he chose', holdHomeReads);
    When('he chooses {string} under Which languages?', chooses);
    Then('the {string} page draws {string}', pageHas);
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
    await putAtLevels({ greek: stepOf(greek), hebrew: stepOf(hebrew) }, { readerView: 'greek' });
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
      await openTutor();
      const sheet = await screen.findByRole('dialog', { name: /^Talk about / });
      await user.type(await within(sheet).findByRole('textbox', { name: 'Your message' }), question);
      await user.click(within(sheet).getByRole('button', { name: 'Send' }));
      // the app writes the talk, signs and makes its calls one after the other before the grist is in: each wait that ends with the store or the fake having moved goes on (mw-u2w5klk.349.151)
      await waitForGrists(fake!, 'bible-talk', 1, { also: async () => JSON.stringify(await db.talks.toArray()) });
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
