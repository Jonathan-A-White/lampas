// features/steps/read-span.steps.tsx — runs features/read-span.feature: the Read aloud span setting (Verse, Passage, Chapter, Book)
// and how far the header's Read from the top / Read from here goes. speechSynthesis is the recording fake of tests/support/fake-speech.ts.
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

const fileOf = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const CHAPTERS: Record<string, Chapter> = { 'rom/8': fileOf('rom/8'), 'rom/9': fileOf('rom/9'), 'rev/22': fileOf('rev/22') };
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
const SPANS = ['Verse', 'Passage', 'Chapter', 'Book'];

async function openSettings(): Promise<void> {
  if (!screen.queryByRole('heading', { name: 'Settings', level: 1 })) await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}
const spanGroup = () => screen.findByRole('group', { name: 'Read aloud span' });

async function chooseSpan(label: string): Promise<void> {
  await openSettings();
  const group = await spanGroup();
  await user.click(within(group).getByRole('button', { name: label }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-read-span')).toBe(label.toLowerCase()));
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

  Scenario('The span is Chapter until he chooses another, and the choice survives a close', ({ Given, When, Then, And }) => {
    Given(phone, openWith);
    When('he opens Settings', openSettings);
    Then('Read aloud span shows Chapter chosen', async () => {
      expect(within(await spanGroup()).getByRole('button', { name: 'Chapter' })).toHaveAttribute('aria-pressed', 'true');
    });
    And('Read aloud span offers Verse, Passage, Chapter and Book', async () => {
      expect(within(await spanGroup()).getAllByRole('button').map((b) => b.textContent)).toEqual(SPANS);
    });
    When('he chooses Passage for Read aloud span', async () => {
      await user.click(within(await spanGroup()).getByRole('button', { name: 'Passage' }));
      await waitFor(async () => expect(within(await spanGroup()).getByRole('button', { name: 'Passage' })).toHaveAttribute('aria-pressed', 'true'));
    });
    And('he closes Lampas and opens it again', async () => {
      cleanup();
      stopReading();
      render(<App />);
    });
    And('he opens Settings', openSettings);
    Then('Read aloud span shows Passage chosen', async () => {
      await waitFor(async () => expect(within(await spanGroup()).getByRole('button', { name: 'Passage' })).toHaveAttribute('aria-pressed', 'true'));
    });
  });

  Scenario('Verse reads only the verse started from', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Verse', () => chooseSpan('Verse'));
    When('he selects verse 5 and taps Read from here', () => selectAndReadFromHere(5));
    Then('the phone speaks the English of verse 5', () => expect(lastSpoken().text).toBe(englishIn('rom/8', 5)));
    When('the phone finishes speaking verse 5', () => {
      synth.finish();
    });
    Then('nothing more is spoken', expectNothingMore);
    And('the reading bar is gone', () => expect(bar()).toBeNull());
  });

  Scenario('Passage reads from the verse to the next section heading', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Passage', () => chooseSpan('Passage'));
    When('he selects verse 9 and taps Read from here', () => selectAndReadFromHere(9));
    And('the phone finishes the reading', () => {
      synth.finishAll();
    });
    Then('verses 9, 10 and 11 were read', () => expect(read).toEqual([9, 10, 11]));
    And('nothing more is spoken', expectNothingMore);
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader still shows Romans 8', () => expect(reader('Romans 8')).toBeInTheDocument());
  });

  Scenario("Chapter reads to the chapter's end and stops there", ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Chapter', () => chooseSpan('Chapter'));
    When('he selects verse 37 and taps Read from here', () => selectAndReadFromHere(37));
    And('the phone finishes the reading', () => {
      synth.finishAll();
    });
    Then('verses 37, 38 and 39 were read', () => expect(read).toEqual([37, 38, 39]));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader still shows Romans 8', () => expect(reader('Romans 8')).toBeInTheDocument());
  });

  Scenario('Book reads on past the chapter\'s end into the next chapter and the Reader turns to it', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Book', () => chooseSpan('Book'));
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

  Scenario('Book keeps going through the next chapter', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Book', () => chooseSpan('Book'));
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

  Scenario('Book stops at the end of Revelation 22', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Book', () => chooseSpan('Book'));
    And('the Reader is open on Revelation 22', async () => {
      window.location.hash = '#/?b=rev&c=22';
      await screen.findByRole('heading', { name: 'Revelation 22', level: 1 });
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-read-span')).toBe('book'));
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    When('he selects verse 20 and taps Read from here', () => selectAndReadFromHere(20));
    And('the phone finishes the reading', () => {
      synth.finishAll();
    });
    Then('verses 20 and 21 were read', () => expect(read).toEqual([20, 21]));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('the Reader still shows Revelation 22', () => expect(reader('Revelation 22')).toBeInTheDocument());
  });

  ScenarioOutline('Stop stops at once in every span', ({ Given, And, When, Then }, row) => {
    Given(phone, openWith);
    And('Read aloud span is <span>', () => chooseSpan(row.span));
    When('he selects verse 5 and taps Read from here', () => selectAndReadFromHere(5));
    And('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('nothing more is spoken', expectNothingMore);
  });

  Scenario('Stop while the reading is crossing into the next chapter stops it there', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Book', () => chooseSpan('Book'));
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

  Scenario('The play button on a verse reads that verse only, whatever the span', ({ Given, And, When, Then }) => {
    Given(phone, openWith);
    And('Read aloud span is Book', () => chooseSpan('Book'));
    When('he taps the play button of verse 5', () => user.click(within(verseEl(5)).getByRole('button', { name: 'Hear the verse' })));
    And('the phone finishes speaking verse 5', () => {
      synth.finish();
    });
    Then('nothing more is spoken', expectNothingMore);
  });
});
