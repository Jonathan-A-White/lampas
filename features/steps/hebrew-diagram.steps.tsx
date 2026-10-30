// features/steps/hebrew-diagram.steps.tsx — runs features/hebrew-diagram.feature: the Verse view of Genesis 1:1 in the Hebrew view (the copy of the built chapter in tests/fixtures/data/gen/1.json),
// a fake Postern whose mill answers the sentence-diagram grind with the hand-written Hebrew diagram (tests/fixtures/diagrams/gen-1-1-hebrew.json), the pieces the request carries and the picture drawn (mw-5r3p30.887).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { setVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { loadFixture } from '../../tests/support/diagram-fixtures';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const PICTURE = 'Sentence diagram of Genesis 1:1, Hebrew';
let fake: FakePostern;

const verseView = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
const pane = (): HTMLElement => within(verseView()).getByRole('region', { name: 'Diagram' });
const diagramGrists = () => fake.received.filter((r) => r.grist.kind === 'sentence-diagram');

/** Opens the app on Genesis 1:1's Verse view in the Hebrew view, the tutor answering the sentence-diagram grind with the hand-written Hebrew diagram at once. */
async function openVerse(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  const hebrew = loadFixture('hebrew').diagram;
  fake.replyFor = (_input, kind) => (kind === 'sentence-diagram' ? { status: 'answered', answer: hebrew } : undefined);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.diagrams.clear()]);
  await db.settings.put({ key: 'hebrewInterest', value: '3' });
  await setReaderView('greek');
  setVerseAction('listen');
  window.history.replaceState(null, '', '/#/?b=gen&c=1');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await user.click(await screen.findByRole('button', { name: 'Verse 1', exact: true }));
  await screen.findByRole('region', { name: 'Verse view' });
}

const tapsDiagram = async (): Promise<void> => {
  await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
};

const drawn = async (): Promise<void> => {
  expect(await within(pane()).findByRole('img', { name: PICTURE })).toBeInTheDocument();
};

const feature = await loadFeature('features/hebrew-diagram.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Diagram draws Genesis 1:1 in Hebrew', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once', openVerse);
    When('he taps Diagram', tapsDiagram);
    Then('the pane draws the Hebrew diagram of Genesis 1:1', drawn);
    And('the tutor was asked once, in Hebrew, for {number} pieces of the verse', (_, pieces: number) => {
      const asked = diagramGrists();
      expect(asked).toHaveLength(1);
      expect(asked[0].input.lang).toBe('hebrew');
      expect(asked[0].input.ref).toBe('Genesis 1:1');
      expect((asked[0].input.words as unknown[]).length).toBe(pieces);
      expect(pane().querySelectorAll('button[data-word]')).toHaveLength(pieces);
    });
    And('the Hebrew words are set right to left with a gloss under each', () => {
      const verb = pane().querySelector('button[data-word="2"]')!;
      expect(verb.querySelector('[lang="he"]')).toHaveAttribute('dir', 'rtl');
      expect(verb.querySelector('[data-gloss]')).toHaveTextContent('to create');
      for (const piece of pane().querySelectorAll('button[data-word]')) expect(piece.querySelector('[lang="he"]')).toHaveAttribute('dir', 'rtl');
    });
    And('the pane offers Redraw and {string}', (_, label: string) => {
      expect(within(pane()).getByRole('button', { name: 'Redraw', exact: true })).toBeInTheDocument();
      expect(within(pane()).getByRole('button', { name: label, exact: true })).toBeInTheDocument();
    });
  });

  Scenario('A tap on a piece of a Hebrew word opens that word\'s sheet', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once', openVerse);
    When('he taps Diagram', tapsDiagram);
    And('he taps the piece {string} of the diagram', async (_, text: string) => {
      await drawn();
      await user.click(within(pane()).getByText(text.normalize('NFC')).closest('button')!);
    });
    Then('the word sheet opens on the Hebrew word {string}', async (_, hebrew: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(sheet).getByTestId('sheet-word').textContent?.normalize('NFC')).toBe(hebrew.normalize('NFC'));
    });
  });

  Scenario('How to read this opens the lesson from a Hebrew diagram and Done comes back to it', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once', openVerse);
    When('he taps Diagram', tapsDiagram);
    And('he taps {string} in the pane', async (_, label: string) => {
      await drawn();
      await user.click(within(pane()).getByRole('button', { name: label, exact: true }));
    });
    Then('the lesson {string} is open', async (_, title: string) => {
      await screen.findByTestId('diagram-lesson');
      expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
    });
    When('he goes through the lesson to Done', async () => {
      for (let step = 1; step < 10; step++) await user.click(await screen.findByRole('button', { name: 'Next', exact: true }));
      await user.click(await screen.findByRole('button', { name: 'Done', exact: true }));
    });
    Then('he is back on the Hebrew diagram of Genesis 1:1', async () => {
      await screen.findByRole('region', { name: 'Verse view' });
      await drawn();
      expect(diagramGrists()).toHaveLength(1);
    });
  });
});
