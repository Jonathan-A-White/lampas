// features/steps/sermons-play.steps.tsx — runs features/sermons-play.feature: asking the Bible talk for a sermon plays it in the app (mw-qtu3zvz.84). Postern is the fake (tests/support/fake-postern.ts) whose
// mill answers a grist with the reply a scenario sets: the tutor's tool call is the answer's `do` of play-sermon, which the app runs through its registry into openSermon(row, { auto: true }). The
// YouTube IFrame player is a fake (window.YT), as in tests/unit/sermon-player.test.tsx.
import '@testing-library/react/dont-cleanup-after-each';
import { createElement } from 'react';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { setSermonSources } from '../../src/sermons';
import { closeSermon } from '../../src/sermons/player';
import type { SermonRow } from '../../src/sermons/types';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type Reply } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { row, sourceOf } from '../../tests/support/sermon-sources';
import { sheetEntriesGone } from '../../tests/support/sheet-history';
import { openTutor } from './open-tutor';
import { closeDatabase } from './close-database';

afterAll(async () => {
  vi.restoreAllMocks();
  act(() => closeSermon());
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  delete (window as unknown as { YT?: unknown }).YT;
  setSermonSources(undefined);
  await closeDatabase();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
/** how many times the fake YouTube player was told to play */
let played = 0;

/** Two video rows (YouTube) and one text row of Romans 8, from a source of the tests' own. */
const video = (id: string, title: string, videoId: string): SermonRow => ({ ...row('testvideo', id, title, ['rom', 8, 1, 4], 'Phil Morgan'), open: { url: `https://www.youtube.com/watch?v=${videoId}` } });
const ROWS: SermonRow[] = [video('clay', 'Lightning in Clay Pots', 'clay_pots_1'), video('faith', 'Faith that Works', 'faith_works'), row('testvideo', 'notes', 'Notes on Grace', ['rom', 8, 1, 4], 'Phil Morgan')];

class FakePlayer {
  constructor(_target: unknown, opts: { events?: { onReady?: (e: { target: FakePlayer }) => void } }) {
    queueMicrotask(() => opts.events?.onReady?.({ target: this }));
  }
  playVideo(): void {
    played += 1;
  }
  destroy(): void {}
}

/** Opens the app on Romans 8 with the video sermons; `reply` is what the mill answers a grist with. */
async function open(reply: (input: Record<string, unknown>) => Reply | undefined): Promise<void> {
  // each step is a test of its own, so a scenario's mocks are let go of by the next scenario's start, not after the step that made them
  vi.restoreAllMocks();
  act(() => closeSermon());
  cleanup();
  await sheetEntriesGone();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/');
  tutorTimings.pollMs = 20;
  played = 0;
  (window as unknown as { YT: unknown }).YT = { Player: FakePlayer, PlayerState: { PLAYING: 1, BUFFERING: 3 } };
  setSermonSources([sourceOf('testvideo', 'Test Video Sermons', { rom: ROWS })]);
  fake = makeFakePostern();
  fake.autoReply = undefined;
  fake.replyFor = reply;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  render(createElement(App));
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const answered = (answer: string, extra: Record<string, unknown> = {}): Reply => ({ status: 'answered', answer: { answer, words: [], ...extra } });
const playing = (id: string): Record<string, unknown> => ({ do: [{ name: 'play-sermon', args: { sermon: id } }] });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const says = (text: string) => waitFor(() => expect(sheet()).toHaveTextContent(text));

async function send(question: string): Promise<void> {
  const box = within(sheet()).getByRole('textbox', { name: 'Your message' });
  await user.clear(box);
  await user.type(box, question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

const feature = await loadFeature('features/sermons-play.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('He asks for a sermon on the chapter and the best match plays with no tap', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing {string}', (async (_: unknown, id: string) => {
      await open(() => answered('Lightning in Clay Pots, preached by Phil Morgan on Romans 8:1-4.', playing(id)));
    }) as never);
    And('he opens Talk', async () => {
      await openTutor();
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sermon player opens on {string}', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    });
    And('the sermon starts with no tap', async () => {
      await waitFor(() => expect(played).toBeGreaterThan(0));
      expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    });
    And('the sheet says {string}', (_, line: string) => says(line));
    And('the request told the tutor that {string} plays in the app and {string} does not', (_, plays: string, doesNot: string) => {
      const rows = (fake.received[0].input.sermons as { rows: Array<{ source: string; id: string; plays?: boolean }> }).rows;
      const byId = (key: string) => rows.find((r) => `${r.source}:${r.id}` === key);
      expect(byId(plays)?.plays).toBe(true);
      expect(byId(doesNot)).toBeDefined();
      expect(byId(doesNot)?.plays).toBeUndefined();
    });
  });

  Scenario('Several sermons fit, the tutor names them and the first plays', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing {string}', (async (_: unknown, id: string) => {
      await open(() => answered('Faith that Works, preached by Phil Morgan. Also: Lightning in Clay Pots, Notes on Grace.', playing(id)));
    }) as never);
    And('he opens Talk', async () => {
      await openTutor();
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sermon player opens on {string}', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    });
    And('the sheet says {string}', (_, line: string) => says(line));
  });

  Scenario('No sermon fits, the tutor says so and nothing plays', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask with none listed', () =>
      open(() => answered('No sermon of the tabernacle is listed for Romans 8.')),
    );
    And('he opens Talk', async () => {
      await openTutor();
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('no sermon player is open', () => {
      expect(document.querySelector('[data-sermon-player]')).toBeNull();
      expect(played).toBe(0);
    });
  });

  Scenario('A text sermon, or one that was never listed, is refused and nothing plays', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing {string}', (async (_: unknown, id: string) => {
      await open(() => answered('Playing Notes on Grace.', playing(id)));
    }) as never);
    And('he opens Talk', async () => {
      await openTutor();
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('no sermon player is open', () => {
      expect(document.querySelector('[data-sermon-player]')).toBeNull();
      expect(played).toBe(0);
    });
  });
});
