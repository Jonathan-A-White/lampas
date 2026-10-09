// features/steps/render-errors.steps.tsx — runs features/render-errors.feature (mw-5r3p30.112): an old-shape chapter reads, and a
// render error shows the error screen. fetch answers Romans 8 changed on the way, with the committed file as the base.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

/** The page opened on Romans 8, whose JSON is changed by `change` before the Reader gets it. */
async function openWith(change: (chapter: Chapter) => void): Promise<void> {
  cleanup();
  stubChapterFetch();
  const plain = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    if (String(input) !== '/data/rom/8.json') return plain(input);
    const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
    change(chapter);
    return new Response(JSON.stringify(chapter), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
}

const feature = await loadFeature('features/render-errors.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The Reader in English draws a chapter whose chunks carry the old s: 1', ({ Given, When, Then, And }) => {
    let supplied = 0;
    Given('Lampas is opened on a chapter whose supplied chunks say s: 1', async () => {
      await openWith((chapter) => {
        for (const verse of chapter.verses)
          for (const chunk of verse.e) if (chunk.s?.length) (chunk as { s: unknown }).s = 1;
        supplied = chapter.verses.flatMap((v) => v.e).filter((c) => (c.s as unknown) === 1).length;
      });
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    When('he switches to English', async () => {
      expect(supplied).toBeGreaterThan(0);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await user.click(screen.getByRole('button', { name: 'Greek' }));
      await user.click(screen.getByRole('button', { name: 'English' }));
    });
    Then('the verses are shown', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-verse]')).toHaveLength(39));
      expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('english');
      expect(document.querySelectorAll('[data-supplied]').length).toBeGreaterThan(0);
    });
    And('no error screen is shown', () => {
      expect(screen.queryByText('Something went wrong')).toBeNull();
    });
  });

  Scenario('A component that throws inside the Reader shows the error screen', ({ Given, Then, And }) => {
    let reported: ReturnType<typeof vi.spyOn>;
    Given('Lampas is opened on a chapter that makes the Reader throw', async () => {
      // React logs a render error as well; only the screen's own report is looked for below.
      reported = vi.spyOn(console, 'error').mockImplementation(() => {});
      await openWith((chapter) => {
        (chapter.verses[0] as { e: unknown }).e = null;
      });
      await screen.findByText('Something went wrong');
    });
    Then('the error screen says {string}', (_, text: string) => {
      expect(screen.getByText(text)).toBeVisible();
    });
    And('it has a Reload button', () => {
      expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
    });
    And('the error was reported to the console', () => {
      expect(reported.mock.calls.some((call) => String(call[0]).includes('Lampas error screen'))).toBe(true);
      reported.mockRestore();
    });
  });
});
