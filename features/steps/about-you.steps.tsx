// features/steps/about-you.steps.tsx — runs features/about-you.feature: About you (mw-1vuvq6.1). The student's profile lives in the settings store
// under 'learnerProfile' (a JSON object); Settings > About you shows and edits it; a talk request carries it as `learner_profile`.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { openTutor } from './open-tutor';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const SEPARATOR = ' / ';
let fake: FakePostern;

const linesOf = (text: string): string[] => text.split(SEPARATOR);

interface Kept {
  age?: string;
  pace?: string;
  ways?: string[];
  background?: string;
  why?: string;
  notes?: { text: string; when: number }[];
  learned?: { field: string; value: string; when: number; guessed: boolean; mine?: boolean; talk: string }[];
}

/** The profile the phone keeps: the settings store's 'learnerProfile' row, a JSON object (absent or {} when nothing is kept). */
async function kept(): Promise<Kept> {
  const row = await db.settings.get('learnerProfile');
  return typeof row?.value === 'string' ? (JSON.parse(row.value) as Kept) : {};
}
const keep = (profile: Kept) => db.settings.put({ key: 'learnerProfile', value: JSON.stringify(profile) });
const nothingKept = async (): Promise<void> => {
  await waitFor(async () => {
    const profile = await kept();
    expect(profile.age ?? '').toBe('');
    expect(profile.pace).toBeUndefined();
    expect(profile.ways ?? []).toEqual([]);
    expect(profile.background ?? '').toBe('');
    expect(profile.why ?? '').toBe('');
    expect(profile.notes ?? []).toEqual([]);
  });
};

async function open(hash: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', hash);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear(), db.usage.clear(), db.results.clear(), db.drills.clear()]);
  await setReaderView('english');
  await setWeave('off');
}

async function openSettings(profile: Kept): Promise<void> {
  await open('/#/settings?group=account');
  await keep(profile);
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Account', level: 1 });
}
async function openReader(profile: Kept): Promise<void> {
  await open('/');
  await keep(profile);
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

/** The next answer of the mill carries this profile_update (what the tutor learned from his words). */
const tutorLearns = (update: Record<string, unknown>): void => {
  fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, profile_update: [update] } };
};
/** From the Reader with the talk sheet open: close it, go to Settings, About you. */
const openAboutYouFromReader = async (): Promise<void> => {
  const sheet = screen.queryByRole('dialog', { name: 'Talk about Romans 8:11' });
  if (sheet) await user.click(within(sheet).getByRole('button', { name: 'Done' }));
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await openSettingsGroup(user, 'account');
  await openAboutYou();
};
const learnedRow = (field: string): HTMLElement => {
  const row = document.querySelector<HTMLElement>(`[data-learned][data-field="${field}"]`);
  if (!row) throw new Error(`no learned row for ${field}`);
  return row;
};
const learnedLine = (field: string): string => {
  const row = learnedRow(field);
  const text = row.querySelector('[data-learned-text]')?.textContent ?? '';
  const source = row.querySelector('[data-learned-source]')?.textContent;
  return source ? `${text}, ${source}` : text;
};

const openAboutYou = async (): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: 'About you' }));
  await screen.findByRole('heading', { name: 'About you', level: 1 });
  // the fields draw only after the kept profile is read, later than the heading: wait for the first before any step takes one
  await screen.findByRole('textbox', { name: 'Age' });
};
const group = (name: string): HTMLElement => screen.getByRole('group', { name });
const pressed = (name: string): string[] =>
  within(group(name))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
const notes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-profile-note]'));
const noteRow = (text: string): HTMLElement => {
  const row = notes().find((r) => r.querySelector('[data-note-text]')?.textContent === text);
  if (!row) throw new Error(`no row for the note ${text}`);
  return row;
};
const keptNotes = async (): Promise<string[]> => ((await kept()).notes ?? []).map((n) => n.text);

const feature = await loadFeature('features/about-you.feature');

describeFeature(feature, ({ Scenario }) => {
  const received = (i: number) => {
    const got = fake.received[i - 1];
    if (!got) throw new Error(`the mill received no grist number ${i}`);
    return got;
  };
  const talk = async (_: unknown, said: string) => {
    await user.click(await screen.findByRole('button', { name: 'Verse 11' }));
    await screen.findByRole('region', { name: 'Verse view' });
    await openTutor();
    const sheet = await screen.findByRole('dialog', { name: 'Talk about Romans 8:11' });
    await user.type(within(sheet).getByRole('textbox', { name: 'Your message' }), said);
    await user.click(within(sheet).getByRole('button', { name: 'Send' }));
  };
  const millGot = (_: unknown, n: number) => waitFor(() => expect(fake.received).toHaveLength(n));

  Scenario("About you keeps the student's profile", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing kept about him', () => openSettings({}));
    When('he opens {string} in Settings', openAboutYou);
    And('he fills in his age {string}, chooses the pace {string} and the ways {string} and {string}', async (_, age: string, pace: string, a: string, b: string) => {
      await user.type(screen.getByRole('textbox', { name: 'Age' }), age);
      await user.click(within(group('Pace')).getByRole('button', { name: pace, exact: true }));
      await user.click(within(group('Ways of learning')).getByRole('button', { name: a, exact: true }));
      await user.click(within(group('Ways of learning')).getByRole('button', { name: b, exact: true }));
    });
    Then('the phone keeps the age {string}, the pace {string} and the ways {string}', (_, age: string, pace: string, ways: string) =>
      waitFor(async () => {
        const profile = await kept();
        expect(profile.age).toBe(age);
        expect(profile.pace).toBe(pace);
        expect(profile.ways).toEqual(linesOf(ways));
      }),
    );
    When('Lampas is closed and opened again on {string}', async () => {
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/#/settings?group=account');
      await seedHisWords();
      render(<App />);
      await openAboutYou();
    });
    Then('the page shows the age {string}, the pace {string} and the ways {string}', async (_, age: string, pace: string, ways: string) => {
      await waitFor(() => expect(screen.getByRole('textbox', { name: 'Age' })).toHaveValue(age));
      await waitFor(() => expect(pressed('Pace')).toEqual([pace]));
      expect(pressed('Ways of learning')).toEqual(linesOf(ways));
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name, exact: true }));
    });
    Then('the page shows no age, no pace and no ways', async () => {
      await waitFor(() => expect(screen.getByRole('textbox', { name: 'Age' })).toHaveValue(''));
      await waitFor(() => expect(pressed('Pace')).toEqual([]));
      expect(pressed('Ways of learning')).toEqual([]);
    });
    And('the phone keeps nothing about him', nothingKept);
  });

  Scenario('Background and why are kept in his own words', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing kept about him', () => openSettings({}));
    When('he opens {string} in Settings', openAboutYou);
    And('he writes the background {string} and the why {string}', async (_, background: string, why: string) => {
      await user.type(screen.getByRole('textbox', { name: 'Background' }), background);
      await user.type(screen.getByRole('textbox', { name: 'Why' }), why);
    });
    Then('the phone keeps the background {string} and the why {string}', (_, background: string, why: string) =>
      waitFor(async () => {
        const profile = await kept();
        expect(profile.background).toBe(background);
        expect(profile.why).toBe(why);
      }),
    );
  });

  Scenario('A note the tutor learned can be edited or removed', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the notes kept about him {string}', (_, text: string) =>
      openSettings({ notes: linesOf(text).map((t, i) => ({ text: t, when: Date.UTC(2026, 9, 12, 9, i) })) }),
    );
    When('he opens {string} in Settings', openAboutYou);
    Then('the page shows the notes {string}', (_, text: string) => waitFor(() => expect(notes().map((r) => r.querySelector('[data-note-text]')?.textContent)).toEqual(linesOf(text))));
    When('he edits the note {string} to {string}', async (_, note: string, to: string) => {
      await user.click(within(noteRow(note)).getByRole('button', { name: /^Edit/ }));
      const field = screen.getByRole('textbox', { name: 'Note' });
      await user.clear(field);
      await user.type(field, to);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('the phone keeps the notes {string}', (_, text: string) => waitFor(async () => expect(await keptNotes()).toEqual(linesOf(text))));
    When('he removes the note {string}', async (_, note: string) => {
      await user.click(within(noteRow(note)).getByRole('button', { name: /^Remove/ }));
    });
    Then('the page now shows the notes {string}', (_, text: string) => waitFor(() => expect(notes().map((r) => r.querySelector('[data-note-text]')?.textContent)).toEqual(linesOf(text))));
    And('the phone now keeps the notes {string}', (_, text: string) => waitFor(async () => expect(await keptNotes()).toEqual(linesOf(text))));
  });

  Scenario('A talk with the tutor carries the profile', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the age {string}, the pace {string} and the ways {string} kept about him', (_, age: string, pace: string, ways: string) =>
      openReader({ age, pace, ways: linesOf(ways) }),
    );
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    And('grist number 1 carries the learner profile with the age {string}, the pace {string} and the ways {string}', (_, age: string, pace: string, ways: string) => {
      expect(received(1).input.learner_profile).toEqual({ age, pace, ways: linesOf(ways) });
    });
  });

  Scenario('The tutor learns how he likes to learn', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with nothing kept about him, and the tutor will learn from his talk that his ways are {string}', async (_, value: string) => {
      await openReader({});
      tutorLearns({ field: 'ways', value });
    });
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    When('he opens {string} from the Reader', openAboutYouFromReader);
    Then('About you shows the learned ways {string}', async (_, line: string) => {
      await waitFor(() => expect(learnedLine('ways')).toBe(line));
    });
    When('Lampas is closed and opened again on Romans 8', async () => {
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/');
      await seedHisWords();
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('he talks about verse 11 again and sends {string}', talk);
    Then('the mill received 2 grists', () => millGot(null, 2));
    And('grist number 2 carries the learned field {string} with the value {string}', (_, field: string, value: string) => {
      expect(received(2).input.learner_profile).toEqual({ learned: [{ field, value }] });
    });
  });

  Scenario('The tutor guesses, he corrects', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with nothing kept about him, and the tutor will guess from his talk that his age is {string}', async (_, value: string) => {
      await openReader({});
      tutorLearns({ field: 'age', value, guessed: true });
    });
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    When('he opens {string} from the Reader', openAboutYouFromReader);
    Then('About you shows the guess {string}', async (_, line: string) => {
      await waitFor(() => expect(learnedRow('age').querySelector('[data-learned-text]')?.textContent).toBe(line));
    });
    When('he changes the guess to {string}', async (_, value: string) => {
      await user.click(within(learnedRow('age')).getByRole('button', { name: /^Change/ }));
      const field = screen.getByRole('textbox', { name: 'Learned value' });
      await user.clear(field);
      await user.type(field, value);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('About you shows the learned age {string}', async (_, line: string) => {
      await waitFor(() => expect(learnedLine('age')).toBe(line));
    });
    And('the phone keeps no guess for the age', async () => {
      await waitFor(async () => expect((await kept()).learned?.find((l) => l.field === 'age')?.guessed).toBe(false));
    });
  });

  Scenario('A guess never overrides what he set', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the age {string} kept about him, and the tutor will guess from his talk that his age is {string}', async (_, age: string, value: string) => {
      await openReader({ age });
      tutorLearns({ field: 'age', value, guessed: true });
    });
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    When('he opens {string} from the Reader', openAboutYouFromReader);
    Then('About you shows the suggestion {string}', async (_, line: string) => {
      await waitFor(() => expect(learnedRow('age').querySelector('[data-learned-text]')?.textContent).toBe(line));
    });
    And('the page shows the age {string}', async (_, age: string) => {
      await waitFor(() => expect(screen.getByRole('textbox', { name: 'Age' })).toHaveValue(age));
    });
    And('the phone keeps the age {string}', async (_, age: string) => {
      expect((await kept()).age).toBe(age);
    });
  });

  Scenario('A talk with nothing kept about him sends no profile', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with nothing kept about him', () => openReader({}));
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    And('grist number 1 carries no learner profile', () => {
      expect('learner_profile' in received(1).input).toBe(false);
    });
  });
});
