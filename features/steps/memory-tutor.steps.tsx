// features/steps/memory-tutor.steps.tsx — runs features/memory-tutor.feature: the tutor reads the reader's memory (mw-yrmkdf.2). A talk request carries `memory`
// (the index and the notes named for the book); the answer's memory_update appends (a replace or remove only when directed) and its wished_notes are counted
// and shown on About.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getNote, putNote, setIndex } from '../../src/data/repositories/memory';
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
const linesOf = (text: string): string[] => (text === '' ? [] : text.split(SEPARATOR));
let fake: FakePostern;

/** Romans 8 on a phone that remembers `index` and `notes` (each note says 'About <name>.'), the tutor answering `answer` besides the usual. */
async function openReader(index: string, notes: string[], answer: Record<string, unknown> = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, ...answer } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear(), db.usage.clear(), db.results.clear(), db.drills.clear()]);
  await setReaderView('english');
  await setWeave('off');
  if (index !== '') await setIndex(index, 'me', Date.UTC(2026, 9, 12, 9));
  for (const [i, name] of notes.entries()) await putNote(name, `About ${name}.`, 'me', Date.UTC(2026, 9, 12, 9, i));
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const feature = await loadFeature('features/memory-tutor.feature');

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
  const keptNote = async (name: string, text: string, by: string) => {
    await waitFor(async () => {
      const note = await getNote(name);
      expect(note?.text).toBe(text.replace(/\\n/g, '\n'));
      expect(note?.by).toBe(by);
    });
  };

  Scenario('A talk carries the index and the notes named for the book', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the memory index {string} and the notes {string}', (_, index: string, notes: string) => openReader(index, linesOf(notes)));
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    And('grist number 1 carries the memory index {string} and the notes {string}', (_, index: string, notes: string) => {
      const memory = received(1).input.memory as { index: string; notes: { name: string; text: string }[] };
      expect(memory.index).toContain(index);
      expect(memory.notes).toEqual(linesOf(notes).map((name) => ({ name, text: `About ${name}.` })));
    });
  });

  Scenario('A talk with nothing remembered sends no memory', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the memory index {string} and the notes {string}', (_, index: string, notes: string) => openReader(index, linesOf(notes)));
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    And('grist number 1 carries no memory', () => {
      expect('memory' in received(1).input).toBe(false);
    });
  });

  Scenario('The tutor appends to a note', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the memory index {string} and the notes {string}, and the tutor will append {string} to {string}', (_, index: string, notes: string, line: string, name: string) =>
      openReader(index, linesOf(notes), { memory_update: [{ name, append: line }] }),
    );
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    And('the phone keeps the note {string} as {string} changed by {string}', (_, name: string, text: string, by: string) => keptNote(name, text, by));
  });

  Scenario('The tutor cannot replace a note he did not ask it to change', ({ Given, When, Then, And }) => {
    Given(
      'Lampas is opened on Romans 8 with the memory index {string} and the notes {string}, and the tutor will replace {string} with {string} without being directed',
      (_, index: string, notes: string, name: string, text: string) => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        return openReader(index, linesOf(notes), { memory_update: [{ name, replace: text }] });
      },
    );
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    // the talk's answer is kept after the memory is applied: wait for the turn so the refusal has happened
    And('the phone keeps the note {string} as {string} changed by {string}', async (_, name: string, text: string, by: string) => {
      await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0));
      await keptNote(name, text, by);
    });
  });

  Scenario('About shows the notes the tutor wished it had', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the memory index {string} and the notes {string}, and the tutor will wish for the notes {string}', (_, index: string, notes: string, wished: string) =>
      openReader(index, linesOf(notes), { wished_notes: linesOf(wished) }),
    );
    When('he talks about verse 11 and sends {string}', talk);
    Then('the mill received 1 grist', () => millGot(null, 1));
    When('he opens {string} from the Reader', async (_, name: string) => {
      const sheet = screen.queryByRole('dialog', { name: 'Talk about Romans 8:11' });
      if (sheet) {
        await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0));
        await user.click(within(sheet).getByRole('button', { name: 'Done' }));
      }
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await openSettingsGroup(user, 'account');
      await user.click(await screen.findByRole('button', { name, exact: true }));
      await screen.findByRole('heading', { name, level: 1 });
    });
    Then('About shows {string}', async (_, line: string) => {
      expect(await screen.findByTestId('wished-notes')).toHaveTextContent(line);
    });
    And('under it the names {string}', (_, names: string) => {
      const listed = Array.from(document.querySelectorAll('[data-wished-name]')).map((e) => e.textContent);
      expect(listed).toEqual(linesOf(names));
    });
  });
});
