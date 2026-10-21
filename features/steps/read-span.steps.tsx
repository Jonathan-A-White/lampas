// features/steps/read-span.steps.tsx — runs features/read-span.feature: the Play to setting (End of the book, End of the Bible)
// and how far the header's Play goes. speech synthesis is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { getOpenChapter } from '../../src/data/readerChapter';
import { clearBus, subscribe } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';
import { leaveSettings, onSettingsPage, openSettingsGroup } from '../../tests/support/settings-pages';

const fileOf = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const CHAPTERS: Record<string, Chapter> = { 'rom/8': fileOf('rom/8'), 'rom/9': fileOf('rom/9'), 'rev/22': fileOf('rev/22'), '2jn/1': fileOf('2jn/1'), '3jn/1': fileOf('3jn/1') };
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const englishIn = (key: string, n: number): string => {
  const v = CHAPTERS[key].verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n} in ${key}`);
  return squash(v.e.map((c) => c.t).join(' '));
};

let synth: FakeSynth;
let read: number[] = [];

async function openWith(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  read = [];
  localStorage.clear();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  // after the app's own subscriptions, so only readings are counted
  subscribe('verse-reading', (e) => read.push(e.verse));
}

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  localStorage.clear();
  db.close();
});

const user = userEvent.setup();
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const bar = () => document.querySelector<HTMLElement>('[data-reading-bar]');
const lastSpoken = () => synth.spoken[synth.spoken.length - 1];
const SPANS = ['End of the book', 'End of the Bible'];
const VALUE_OF: Record<string, string> = { 'End of the book': 'book', 'End of the Bible': 'bible' };

async function openSettings(): Promise<void> {
  if (onSettingsPage()) return;
  if (!screen.queryByRole('heading', { name: 'Settings', level: 1 })) await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'listening');
}
const spanGroup = () => screen.findByRole('group', { name: 'Play to' });

async function chooseSpan(label: string): Promise<void> {
  await openSettings();
  const group = await spanGroup();
  await user.click(within(group).getByRole('button', { name: label, exact: true }));
  await leaveSettings(user);
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-read-span')).toBe(VALUE_OF[label]));
}

const selectAndReadFromHere = async (n: number) => {
  await user.click(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` }));
  await user.click(screen.getByRole('button', { name: 'Read from here' }));
};
const expectNothingMore = () => {
  const count = synth.spoken.length;
  expect(() => synth.finish()).toThrow();
  expect(synth.spoken).toHaveLength(count);
};
const reader = (title: string) => screen.getByRole('heading', { name: title, level: 1 });

const feature = await loadFeature('features/read-span.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const phone = 'Lampas is opened on a phone with an English and a Greek voice';
  const chosen = async (label: string) => {
    await waitFor(async () => expect(within(await spanGroup()).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true'));
  };
  const openOn = (hash: string, title: string) => async () => {
    window.location.hash = hash;
    await screen.findByRole('heading', { name: title, level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  };

  Scenario('Play to is End of the book until he chooses End of the Bible, and the choice survives a close', ({ Given, When, Then, And }) => {
    Given(phone, openWith);
    When('he opens Settings', openSettings);
    Then('Play to shows End of the book chosen', () => chosen('End of the book'));
    And('Play to offers End of the book and End of the Bible', async () => {
      expect(within(await spanGroup()).getAllByRole('button').map((b) => b.textContent)).toEqual(SPANS);
    });
    When('he chooses End of the Bible for Play to', async () => {
      await user.click(within(await spanGroup()).getByRole('button', { name: 'End of the Bible' }));
      await chosen('End of the Bible');
    });
    And('he closes Lampas and opens it again', async () => {
      cleanup();
      stopReading();
      render(<App />);
    });
    And('he opens Settings', openSettings);
    Then('Play to shows End of the Bible chosen', () => chosen('End of the Bible'));
  });

  Scenario('A span saved before reads as End of the book', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Chapter was saved as the span by an earlier Lampas', async () => {
      await db.settings.put({ key: 'readSpan', value: 'chapter' });
    });
    When('he opens Settings', openSettings);
    Then('Play to shows End of the book chosen', () => chosen('End of the book'));
  });

  Scenario("End of the book reads on past the chapter's end into the next chapter and the Reader turns to it", ({ Given, When, Then, And }) => {
    Given(phone, openWith);
    When('he selects verse 39 and taps Read from here', () => selectAndReadFromHere(39));
    Then('the phone speaks the English of verse 39', () => expect(lastSpoken().text).toBe(englishIn('rom/8', 39)));
    And('the Reader still shows Romans 8', () => expect(reader('Romans 8')).toBeInTheDocument());
    When('the phone finishes speaking verse 39', () => {
      synth.finish();
    });
    Then('the Reader shows Romans 9', async () => {
      await screen.findByRole('heading', { name: 'Romans 9', level: 1 });
    });
    And('the phone speaks the English of Romans 9 verse 1', async () => {
      await waitFor(() => expect(lastSpoken().text).toBe(englishIn('rom/9', 1)));
    });
    And('the reading bar says {string}', (_, text: string) => expect(bar()).toHaveTextContent(text));
    And('verse 1 is highlighted as being read', () => expect(verseEl(1).hasAttribute('data-reading')).toBe(true));
    And('the open chapter is Romans 9', async () => {
      await waitFor(() => expect(getOpenChapter()).toMatchObject({ book: 'rom', chapter: 9 }));
    });
  });

  Scenario('End of the book keeps going through the next chapter', ({ Given, When, Then, And }) => {
    Given(phone, openWith);
    When('he selects verse 39 and taps Read from here', () => selectAndReadFromHere(39));
    And('the phone finishes speaking verse 39', async () => {
      synth.finish();
      await screen.findByRole('heading', { name: 'Romans 9', level: 1 });
      await waitFor(() => expect(lastSpoken().text).toBe(englishIn('rom/9', 1)));
    });
    And('the phone finishes speaking verse 1', () => {
      synth.finish();
    });
    Then('the phone speaks the English of Romans 9 verse 2', () => expect(lastSpoken().text).toBe(englishIn('rom/9', 2)));
    And('verse 2 is highlighted as being read', () => expect(verseEl(2).hasAttribute('data-reading')).toBe(true));
  });

  Scenario('End of the book stops at the end of Revelation 22', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('the Reader is open on Revelation 22', openOn('#/?b=rev&c=22', 'Revelation 22'));
    When('he selects verse 20 and taps Read from here', () => selectAndReadFromHere(20));
    And('the phone finishes the reading', () => {
      synth.finishAll();
    });
    Then('verses 20 and 21 were read', () => expect(read).toEqual([20, 21]));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader still shows Revelation 22', () => expect(reader('Revelation 22')).toBeInTheDocument());
  });

  Scenario('End of the book stops at the end of 2 John and does not go into 3 John', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('the Reader is open on 2 John 1', openOn('#/?b=2jn&c=1', '2 John 1'));
    When('he selects verse 12 and taps Read from here', () => selectAndReadFromHere(12));
    And('the phone finishes the reading', () => {
      synth.finishAll();
    });
    Then('verses 12 and 13 were read', () => expect(read).toEqual([12, 13]));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader still shows 2 John 1', () => expect(reader('2 John 1')).toBeInTheDocument());
  });

  Scenario('End of the Bible goes on from the end of 2 John into 3 John and the Reader turns to it', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Play to is End of the Bible', () => chooseSpan('End of the Bible'));
    And('the Reader is open on 2 John 1', openOn('#/?b=2jn&c=1', '2 John 1'));
    When('he selects verse 13 and taps Read from here', () => selectAndReadFromHere(13));
    And('the phone finishes speaking verse 13', () => {
      synth.finishAll();
    });
    Then('the Reader shows 3 John 1', async () => {
      await screen.findByRole('heading', { name: '3 John 1', level: 1 });
    });
    And('the phone speaks the English of 3 John 1 verse 1', async () => {
      await waitFor(() => expect(lastSpoken().text).toBe(englishIn('3jn/1', 1)));
    });
    And('the open chapter is 3 John 1', async () => {
      await waitFor(() => expect(getOpenChapter()).toMatchObject({ book: '3jn', chapter: 1 }));
    });
  });

  ScenarioOutline('Stop stops at once whatever Play to is', ({ Given, And, When, Then }, row) => {
    Given(phone, openWith);
    And('Play to is <span>', () => chooseSpan(row.span));
    When('he selects verse 5 and taps Read from here', () => selectAndReadFromHere(5));
    And('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('nothing more is spoken', expectNothingMore);
  });

  Scenario('Stop while the reading is crossing into the next chapter stops it there', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    When('he selects verse 39 and taps Read from here', () => selectAndReadFromHere(39));
    And('the phone finishes speaking verse 39', () => {
      synth.finish();
    });
    And('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('nothing more is spoken', expectNothingMore);
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader does not start Romans 9', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expectNothingMore();
      expect(read).toEqual([39]);
    });
  });

  ScenarioOutline('The play button on a verse reads that verse only, whatever Play to is', ({ Given, And, When, Then }, row) => {
    Given(phone, openWith);
    And('Play to is <span>', () => chooseSpan(row.span));
    When('he taps the play button of verse 5', () => user.click(within(verseEl(5)).getByRole('button', { name: 'Hear the verse' })));
    And('the phone finishes speaking verse 5', () => {
      synth.finish();
    });
    Then('nothing more is spoken', expectNothingMore);
  });
});
