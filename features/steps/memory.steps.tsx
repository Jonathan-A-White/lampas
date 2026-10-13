// features/steps/memory.steps.tsx — runs features/memory.feature: Memory (mw-yrmkdf.1). The index and the notes live in the settings store
// ('memoryIndex', 'memoryNotes'); Settings > Memory shows and edits them, and Export / Import move the lot as one file.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { downloadSeam } from '../../src/audio/clip';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getIndex, listNotes, putNote, setIndex } from '../../src/data/repositories/memory';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  downloadSeam.save = realSave;
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const SEPARATOR = ' / ';
const linesOf = (text: string): string[] => (text === '' ? [] : text.split(SEPARATOR));

/** The files the page handed to the phone, newest last (downloadSeam.save is replaced from the first step of a scenario on, and put back at the end). */
let offered: { name: string; text: string }[] = [];
const realSave = downloadSeam.save;
const blobText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

async function openSettings(index: string, notes: string[]): Promise<void> {
  offered = [];
  downloadSeam.save = (name, blob) => {
    void blobText(blob).then((text) => offered.push({ name, text }));
  };
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/settings');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  if (index !== '') await setIndex(index, 'me', Date.UTC(2026, 9, 12, 9));
  for (const [i, name] of notes.entries()) await putNote(name, `About ${name}.`, name.startsWith('word:') ? 'tutor' : 'me', Date.UTC(2026, 9, 12, 9, i));
  render(<App />);
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}

const openMemory = async (): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: 'Memory' }));
  await screen.findByRole('heading', { name: 'Memory', level: 1 });
  // the index draws only after the kept memory is read, later than the heading: wait for it before any step takes it
  await screen.findByRole('textbox', { name: 'Index' });
};
const noteRows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-memory-note]'));
const nameOf = (row: HTMLElement): string => row.querySelector('[data-note-name]')?.textContent ?? '';
const noteRow = (name: string): HTMLElement => {
  const row = noteRows().find((r) => nameOf(r) === name);
  if (!row) throw new Error(`no row for the note ${name}`);
  return row;
};
const shownNames = (): string[] => noteRows().map(nameOf);
const keptNames = async (): Promise<string[]> => (await listNotes()).map((n) => n.name);
const changedBy = (_: unknown, name: string, who: string) => {
  expect(noteRow(name).querySelector('[data-note-changed]')?.textContent).toMatch(new RegExp(` by ${who}$`));
};

const feature = await loadFeature('features/memory.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, index: string, notes: string) => openSettings(index, linesOf(notes));
  const deleteNote = async (_: unknown, name: string) => {
    await user.click(within(noteRow(name)).getByRole('button', { name: `Delete: ${name}` }));
    await user.click(within(noteRow(name)).getByRole('button', { name: `Yes, delete: ${name}` }));
  };
  const showsIndex = (_: unknown, text: string) => waitFor(() => expect(screen.getByRole('textbox', { name: 'Index' })).toHaveValue(text));
  const keepsIndex = (_: unknown, text: string, by: string) =>
    waitFor(async () => {
      const index = await getIndex();
      expect(index.body).toBe(text);
      expect(index.by).toBe(by);
    });
  const listsNotes = (_: unknown, names: string) => waitFor(() => expect(shownNames()).toEqual(linesOf(names)));
  const keepsNotes = (_: unknown, names: string) => waitFor(async () => expect(await keptNames()).toEqual(linesOf(names)));
  const tap = async (_: unknown, name: string) => {
    await user.click(screen.getByRole('button', { name, exact: true }));
  };

  Scenario('Settings > Memory shows the index and the notes', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    Then('the page shows the index {string}', showsIndex);
    And('the page lists the notes {string}', listsNotes);
    And('the note {string} says it was changed by {string}', changedBy);
    And('the note {string} was last changed by {string}', changedBy);
  });

  Scenario('An edit of the index is kept', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he adds {string} to the index', async (_, more: string) => {
      await user.type(screen.getByRole('textbox', { name: 'Index' }), more);
    });
    Then('the phone keeps the index {string} changed by {string}', keepsIndex);
    And('the page shows the notes section {string}', (_, lines: string) => {
      expect(document.querySelector('[data-memory-notes-section]')?.textContent?.split('\n')).toEqual(linesOf(lines));
    });
  });

  Scenario('A note can be edited', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he edits the note {string} to {string}', async (_, name: string, to: string) => {
      await user.click(within(noteRow(name)).getByRole('button', { name: `Edit: ${name}` }));
      const field = screen.getByRole('textbox', { name: `Note: ${name}` });
      await user.clear(field);
      await user.type(field, to);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('the phone keeps the note {string} as {string} changed by {string}', (_, name: string, text: string, by: string) =>
      waitFor(async () => {
        const note = (await listNotes()).find((n) => n.name === name);
        expect(note?.text).toBe(text);
        expect(note?.by).toBe(by);
      }),
    );
  });

  Scenario('A note deleted is gone', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he deletes the note {string}', deleteNote);
    Then('the page now lists the notes {string}', listsNotes);
    And('the phone now keeps the notes {string}', keepsNotes);
  });

  Scenario('A note he does not confirm deleting stays', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he asks to delete the note {string} and then cancels', async (_, name: string) => {
      await user.click(within(noteRow(name)).getByRole('button', { name: `Delete: ${name}` }));
      await user.click(within(noteRow(name)).getByRole('button', { name: 'Keep it' }));
    });
    Then('the page lists the notes {string}', listsNotes);
    And('the phone keeps the notes {string}', keepsNotes);
  });

  Scenario('Export offers a file and Import reads it back and shows what was read', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he taps {string}', tap);
    Then('the phone is offered a memory file', async () => {
      await waitFor(() => expect(offered).toHaveLength(1));
      expect(offered[0].name).toMatch(/^lampas-memory-\d{4}-\d{2}-\d{2}\.json$/);
      expect(JSON.parse(offered[0].text)).toMatchObject({ format: 'lampas-memory', version: 1 });
    });
    When('he deletes the note {string}', deleteNote);
    And('he deletes the note {string}', deleteNote);
    Then('the page now lists no notes', () => waitFor(() => expect(shownNames()).toEqual([])));
    When('he imports the file he was offered', async () => {
      const { name, text } = offered[0];
      await user.upload(screen.getByLabelText('Memory file'), new File([text], name, { type: 'application/json' }));
    });
    Then('the page shows what was read: {string}', async (_, what: string) => {
      await waitFor(() => expect(document.querySelector('[data-memory-read]')?.textContent).toBe(`The file holds ${what}.`));
    });
    When('he taps {string}', tap);
    Then('the page lists the notes {string}', listsNotes);
    And('the phone keeps the index {string} changed by {string}', keepsIndex);
  });

  Scenario('A file that is not a memory is refused', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the memory index {string} and the notes {string}', opened);
    When('he opens {string} in Settings', openMemory);
    And('he imports a file holding {string}', async (_, text: string) => {
      await user.upload(screen.getByLabelText('Memory file'), new File([text], 'x.json', { type: 'application/json' }));
    });
    Then('the page says {string}', (_, said: string) => screen.findByText(said));
    And('the phone keeps the index {string} changed by {string}', keepsIndex);
  });
});
