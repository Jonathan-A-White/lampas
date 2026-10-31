// features/steps/tutor-works.steps.tsx — runs features/tutor-works.feature: the digest of his shelf the Bible talk is told (mw-rfjjzd.10) and the `work` link of
// an answer, drawn only for a book on the shelf. Postern is the fake (tests/support/fake-postern.ts) whose mill answers every grist with the answer a scenario sets.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setResourceOn, setState, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { openTutor } from './open-tutor';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

async function open(work: string, reference: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Paul keeps coming back to this.', words: [], links: [{ kind: 'work', work, reference }] } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear(), db.library.clear()]);
  await setReaderView('english');
  await setWeave('off');
  // the shelf's links and digest need the Logos switch (mw-rfjjzd.23)
  await setResourceOn('logos', true);
  await seedHisWords();
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turn = () => sheet().querySelector<HTMLElement>('[data-turn]') as HTMLElement;

async function askAboutVerse28(text: string): Promise<void> {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  await user.click(await screen.findByRole('button', { name: 'Verse 28' }));
  await screen.findByRole('region', { name: 'Verse view' });
  await openTutor();
  await screen.findByRole('dialog', { name: /^Talk about / });
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), text);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(sheet().querySelector('[data-turn]')).not.toBeNull());
}

const feature = await loadFeature('features/tutor-works.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, work: string, reference: string) => open(work, reference);
  const holds = async (_: unknown, resource: string, pinned?: string) => {
    expect(await setState(resource, pinned ? 'pinned' : 'on')).toEqual({ ok: true });
  };
  const ask = (_: unknown, text: string) => askAboutVerse28(text);
  const shows = async (_: unknown, name: string, href: string) => {
    expect(await within(turn()).findByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  };
  const fallback = (_: unknown, url: string) => {
    expect(within(turn()).queryAllByRole('link').find((l) => l.getAttribute('data-fallback') === url)).toBeDefined();
  };
  const quietly = async () => {
    await waitFor(() => expect(turn()).toHaveTextContent('Paul keeps coming back'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(turn().querySelector('[data-tutor-links]')).toBeNull();
  };

  Scenario('A link to a book that is not on his shelf draws nothing', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the work {string} at {string}', opened);
    And('the shelf holds {string}', holds);
    When('he asks the tutor {string} about verse 28', ask);
    Then('the answer shows no study links', quietly);
  });

  Scenario('A commentary chip opens in Logos at the verse', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the work {string} at {string}', opened);
    And('the shelf holds {string}', holds);
    When('he asks the tutor {string} about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
    And('that link has the fallback {string}', fallback);
  });

  Scenario('A Greek text on his shelf opens in Logos at the verse', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the work {string} at {string}', opened);
    And('the shelf holds {string}', holds);
    When('he asks the tutor {string} about verse 28', ask);
    Then('the answer shows the study link {string} to {string}', shows);
  });

  Scenario('With Logos Off the tutor is told no books and a link to a book draws nothing', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the work {string} at {string}', opened);
    And('the shelf holds {string}', holds);
    And('Logos is switched Off', () => setResourceOn('logos', false));
    When('he asks the tutor {string} about verse 28', ask);
    Then('the answer shows no study links', quietly);
    And('the request named no books', () => {
      const input = fake.received.at(-1)?.input as { works?: unknown[] };
      expect(input.works ?? []).toEqual([]);
    });
  });

  Scenario('The request carries the pinned book first and the books that fit the place, and no lexicon', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a link to the work {string} at {string}', opened);
    And('the shelf holds all of {string}, {string}, {string} and {string}', async (_, a: string, b: string, c: string, d: string) => {
      for (const resource of [a, b, c, d]) await holds(_, resource);
    });
    And('the shelf holds {string} pinned', (_, resource: string) => holds(_, resource, 'pinned'));
    When('he asks the tutor {string} about verse 28', ask);
    Then('the request named the books {string}', (_, ids: string) => {
      const input = fake.received.at(-1)?.input as { works?: { id?: string }[] };
      expect((input.works ?? []).flatMap((w) => (w.id ? [w.id] : [])).join(',')).toBe(ids);
    });
  });
});
