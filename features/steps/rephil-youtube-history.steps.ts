// features/steps/rephil-youtube-history.steps.ts — runs features/rephil-youtube-history.feature: Settings > Daily > Import YouTube history (mw-r9xo1pj.3), which marks the Morning RePhil
// episodes in a Google Takeout watch-history.json as Seen, on this device only.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { MORNING_REPHIL_ID } from '../../src/data/daily/devotionals';
import { getHeard } from '../../src/data/daily/dailyStore';
import { EPISODES, type Episode } from '../../src/data/daily/morningRephil';
import { importWatchHistory } from '../../src/data/daily/youtubeHistory';
import { SettingsScreen } from '../../src/SettingsScreen';
import { closeDatabase } from './close-database';
import { groupHash } from '../../tests/support/settings-pages';

const user = userEvent.setup();
let fetched: string[] = [];

afterAll(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const [first, second] = EPISODES;
const watched = (title: string, id: string) => ({ header: 'YouTube', title: `Watched ${title}`, titleUrl: `https://www.youtube.com/watch?v=${id}`, time: '2026-11-10T07:00:00.000Z' });
const THREE_ENTRIES = [watched(first.title, 'aaaaaaaaaaa'), watched(second.title, 'bbbbbbbbbbb'), watched('How to bake bread', 'ccccccccccc')];
const historyFile = (entries: unknown): File => new File([JSON.stringify(entries)], 'watch-history.json', { type: 'application/json' });

async function openDaily(): Promise<void> {
  cleanup();
  fetched = [];
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    fetched.push(String(input));
    return Promise.resolve(new Response('{}', { status: 404 }));
  });
  await db.open();
  await db.settings.clear();
  await db.settings.bulkPut([
    { key: 'resource.logos', value: 'on' },
    { key: 'devotional', value: MORNING_REPHIL_ID },
  ]);
  window.location.hash = groupHash('daily');
  render(createElement(SettingsScreen));
  await screen.findByRole('button', { name: 'Import YouTube history' });
}

async function choose(file: File): Promise<void> {
  const input = await screen.findByLabelText('YouTube watch history file');
  await user.upload(input as HTMLInputElement, file);
}

const says = (text: string) => waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

let importFile: File;
const feature = await loadFeature('features/rephil-youtube-history.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWithThree = ({ Given, And }: { Given: (s: string, f: () => Promise<void> | void) => void; And: (s: string, f: () => void) => void }) => {
    Given('Settings > Daily is open with Morning RePhil chosen and no episode seen', openDaily);
    And('his watch-history.json lists "Morning RePhil #257", "Morning RePhil #258" and a video that is not Morning RePhil', () => {
      importFile = historyFile(THREE_ENTRIES);
    });
  };
  const importTwice = (n: number) => async () => {
    for (let i = 0; i < n; i++) {
      await user.click(screen.getByRole('button', { name: 'Import YouTube history' }));
      await choose(importFile);
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/marked seen/));
    }
  };

  Scenario('A history of three videos, two of them Morning RePhil, marks exactly those two', (s) => {
    openWithThree(s);
    s.When('he taps "Import YouTube history" and chooses the file', importTwice(1));
    s.Then('it says "2 marked seen, 0 already seen"', () => says('2 marked seen, 0 already seen'));
    s.And('exactly the first two episodes are seen', async () => {
      expect([...(await getHeard())].sort()).toEqual([first.id, second.id].sort());
    });
  });

  Scenario('Importing the same file again marks nothing new', (s) => {
    openWithThree(s);
    s.When('he taps "Import YouTube history" and chooses the file', importTwice(1));
    s.And('he taps "Import YouTube history" and chooses the file', async () => {
      await importTwice(1)();
    });
    s.Then('it says "0 marked seen, 2 already seen"', () => says('0 marked seen, 2 already seen'));
  });

  Scenario('An episode is matched by its YouTube video id, else by its exact title', (s) => {
    const list: Episode[] = [
      { id: 'one', number: 1, title: 'Morning RePhil #1', date: '2026-01-01', share: 'https://example.test/one', youtube: 'VIDEOID0001' },
      { id: 'two', number: 2, title: 'Morning RePhil #2', date: '2026-01-02', share: 'https://example.test/two' },
    ];
    let marks = { marked: 0, already: 0 };
    s.Given('episodes where one has a YouTube id and one has none', async () => {
      await db.open();
      await db.settings.clear();
    });
    s.When('a history is imported whose entries are the id\'s video under another title, and the other episode by its exact title with "Watched " before it', async () => {
      const entries = [watched('A different title on YouTube', 'VIDEOID0001'), watched('Morning RePhil #2', 'zzzzzzzzzzz'), watched('Morning RePhil #2 (clip)', 'VIDEOID0002')];
      marks = await importWatchHistory(JSON.stringify(entries), list);
    });
    s.Then('both episodes are marked seen', async () => {
      expect(marks).toEqual({ marked: 2, already: 0 });
      expect([...(await getHeard())].sort()).toEqual(['one', 'two']);
    });
    s.And('a video with the same id but a different title does not mark the episode without an id', async () => {
      await db.settings.clear();
      const result = await importWatchHistory(JSON.stringify([watched('Other', 'VIDEOID0002')]), list);
      expect(result).toEqual({ marked: 0, already: 0 });
      expect((await getHeard()).size).toBe(0);
    });
  });

  Scenario('Nothing of the file is kept or sent', (s) => {
    openWithThree(s);
    s.When('he taps "Import YouTube history" and chooses the file', importTwice(1));
    s.Then('no request left the phone', () => {
      expect(fetched).toEqual([]);
    });
    s.And('nothing the file said is kept on the phone except the two episodes\' ids', async () => {
      const kept = JSON.stringify(await db.settings.toArray());
      for (const word of ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'How to bake bread', 'Watched', 'watch-history', 'youtube.com']) expect(kept).not.toContain(word);
      expect(JSON.parse((await db.settings.get('morningRephilHeard'))?.value ?? '[]').sort()).toEqual([first.id, second.id].sort());
    });
  });

  Scenario('Another profile sees no Seen marks', (s) => {
    openWithThree(s);
    s.When('he taps "Import YouTube history" and chooses the file', importTwice(1));
    s.And('a second user opens Lampas on their own phone', async () => {
      cleanup();
      await new Promise((done) => setTimeout(done, 100)); // a real-time wait: the closed Settings screen's last reads must end before its database is deleted
      // Seen lives in this browser's own IndexedDB: another phone or profile has a database of its own, which starts empty
      await db.delete();
      await db.open();
    });
    s.Then('no episode is seen', async () => {
      expect((await getHeard()).size).toBe(0);
    });
  });

  Scenario('A file that is not a watch history says so', (s) => {
    s.Given('Settings > Daily is open with Morning RePhil chosen and no episode seen', openDaily);
    s.When('he chooses a file that is not a watch history', async () => {
      await user.click(screen.getByRole('button', { name: 'Import YouTube history' }));
      await choose(historyFile({ not: 'a list' }));
    });
    s.Then('it says "This is not a YouTube watch-history.json. Choose the file from Google Takeout."', () => says('This is not a YouTube watch-history.json. Choose the file from Google Takeout.'));
    s.And('no episode is seen', async () => {
      expect((await getHeard()).size).toBe(0);
    });
  });
});
