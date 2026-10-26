// features/steps/sentence-diagram.steps.tsx — runs features/sentence-diagram.feature: the Reed-Kellogg renderer drawing the hand-written diagrams of Colossians 3:1
// (tests/fixtures/diagrams). jsdom has no layout, so the renderer is given a fixed-width measure; the lines are counted in the SVG by data-kind.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getDiagram, setGreekInterest, setReaderView, setWeave, type Weave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { setVerseAction } from '../../src/verse/action';
import { layoutDiagram } from '../../src/diagram/layout';
import { ReedKellogg } from '../../src/diagram/ReedKellogg';
import type { DiagramMode } from '../../src/diagram/types';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { loadFixture, type DiagramFixture } from '../../tests/support/diagram-fixtures';
import { seedHisWords } from '../../tests/support/his-words';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const measure = (text: string): number => text.length * 10;
const SLANTED = ['modifier', 'prep-slant', 'indirect-slant'];

let fixture: DiagramFixture;
let onWord = vi.fn<(index: number) => void>();

/** Draws the fixture of `mode` as the Verse view will: reference 'Colossians 3:1', a tap reported to onWord. */
function draw(mode: DiagramMode): void {
  cleanup();
  fixture = loadFixture(mode);
  onWord = vi.fn<(index: number) => void>();
  render(<ReedKellogg diagram={fixture.diagram} words={fixture.words} mode={mode} reference="Colossians 3:1" onWord={onWord} measure={measure} />);
}

const box = (): HTMLElement => document.querySelector<HTMLElement>('[data-diagram]')!;
const buttons = (): HTMLElement[] => within(box()).queryAllByRole('button');
const lines = (kinds: string[]): number => [...box().querySelectorAll('svg line')].filter((l) => kinds.includes(l.getAttribute('data-kind') ?? '')).length;

function everyWordOnce(): void {
  const names = buttons().map((b) => b.textContent);
  expect(names).toEqual(fixture.words.map((w) => w.text));
  fixture.words.forEach((w, i) => {
    const button = box().querySelector(`[data-word="${i}"]`)!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe(w.text);
    expect(screen.getAllByRole('button', { name: w.text }).filter((b) => b.getAttribute('data-word') === String(i))).toHaveLength(1);
  });
}

function understood(text: string): void {
  const implied = screen.getAllByText(`(${text})`);
  expect(implied.length).toBeGreaterThan(0);
  for (const word of implied) {
    expect(word.tagName).not.toBe('BUTTON');
    expect(word.closest('button')).toBeNull();
  }
  expect(screen.queryByRole('button', { name: `(${text})` })).toBeNull();
}

function named(mode: string): void {
  expect(box().className).toMatch(/overflow-x-auto/);
  const picture = within(box()).getByRole('img');
  expect(picture.getAttribute('aria-label')).toBe(`Sentence diagram of Colossians 3:1, ${mode}`);
}

// ---- the Verse view's Diagram action (mw-souyao.3): the whole app, a licensed phone, a fake mill that answers the sentence-diagram grind ----
const PHONE_KEY = '00'.repeat(31) + '02';
const WORKING = 'Working it out…';
let fake: FakePostern;
let release: () => void = () => undefined;

/** A tree that leaves almost every word out: THE RULE fails it, on the first ask and the second. */
const LEAVES_WORDS_OUT = { clauses: [{ clause: { subject: { words: [{ i: 0 }], modifiers: [] }, verb: { words: [{ i: 1 }], modifiers: [] } } }] };

const diagramGrists = (): number => fake.received.filter((r) => r.grist.kind === 'sentence-diagram').length;
const verseView = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
const pane = (): HTMLElement => within(verseView()).getByRole('region', { name: 'Diagram' });

/** Opens the app on Colossians 3:1's Verse view (the address names the verse), the tutor slow, at once, or unable. */
async function openVerse(how: 'slow' | 'at once' | 'unable', weave: Weave | null = null): Promise<void> {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  const english = loadFixture('english').diagram;
  const greek = loadFixture('greek').diagram;
  fake.replyFor = (input, kind) => {
    if (kind !== 'sentence-diagram') return undefined;
    if (how === 'unable') return { status: 'answered', answer: LEAVES_WORDS_OUT };
    return { status: 'answered', answer: input.lang === 'greek' ? greek : english };
  };
  if (how === 'slow') fake.holds['sentence-diagram'] = new Promise<void>((resolve) => (release = resolve));
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.diagrams.clear()]);
  await setGreekInterest(5);
  await setReaderView('english');
  // a weave is shown for the words he knows: with one, his progress (the 63 BMA words, Christ among the solid ones) is on the phone
  if (weave) await seedHisWords();
  await setWeave(weave ?? 'off');
  setVerseAction('listen');
  window.history.replaceState(null, '', '/#/?ref=Col.3.1');
  render(<App />);
  await screen.findByRole('region', { name: 'Verse view' });
}

async function drawnWithRedraw(_: unknown, line: string): Promise<void> {
  expect(await within(pane()).findByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
  expect(within(pane()).getByRole('button', { name: 'Redraw', exact: true })).toBeInTheDocument();
  expect(within(pane()).getByText(line)).toBeInTheDocument();
}

/** The Verse view closed by its ‹ Reader and opened again on the same verse. */
async function reopen(): Promise<void> {
  await user.click(within(verseView()).getByRole('button', { name: /Reader/ }));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
  await user.click(await screen.findByRole('button', { name: 'Verse 1', exact: true }));
  await screen.findByRole('region', { name: 'Verse view' });
}

// ---- the lesson advertised from the diagram (mw-q6t5tvn.2) ----
const INVITATION = 'New to diagrams? Learn to read one, about 3 minutes';

async function tapsDiagram(): Promise<void> {
  await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
}

async function tapsInPane(_: unknown, label: string): Promise<void> {
  await user.click(await within(pane()).findByRole('button', { name: label, exact: true }));
}

async function invites(_: unknown, line: string): Promise<void> {
  expect(line).toBe(INVITATION);
  expect(await within(pane()).findByText(line)).toBeInTheDocument();
  expect(within(pane()).getByRole('button', { name: 'Learn', exact: true })).toBeInTheDocument();
  expect(within(pane()).getByRole('button', { name: 'Not now', exact: true })).toBeInTheDocument();
}

async function noInvitation(_: unknown, label: string): Promise<void> {
  expect(await within(pane()).findByRole('button', { name: label, exact: true })).toBeInTheDocument();
  expect(within(pane()).queryByText(INVITATION)).toBeNull();
  expect(within(pane()).queryByRole('button', { name: 'Learn', exact: true })).toBeNull();
  expect(within(pane()).queryByRole('button', { name: 'Not now', exact: true })).toBeNull();
}

function neither(_: unknown, label: string): void {
  expect(within(pane()).queryByText(INVITATION)).toBeNull();
  expect(within(pane()).queryByRole('button', { name: 'Learn', exact: true })).toBeNull();
  expect(within(pane()).queryByRole('button', { name: label, exact: true })).toBeNull();
}

async function lessonIsOpen(_: unknown, title: string): Promise<void> {
  const lesson = await screen.findByTestId('diagram-lesson');
  expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  expect(lesson).toBeInTheDocument();
}

/** Next through the first eight steps and Done on the ninth. */
async function throughTheLesson(): Promise<void> {
  for (let step = 1; step < 9; step++) await user.click(await screen.findByRole('button', { name: 'Next', exact: true }));
  await user.click(await screen.findByRole('button', { name: 'Done', exact: true }));
}

async function backOnTheDiagram(_: unknown, label: string): Promise<void> {
  await screen.findByRole('region', { name: 'Verse view' });
  expect(await within(pane()).findByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
  expect(within(pane()).queryByText(WORKING)).toBeNull();
  expect(within(pane()).getByRole('button', { name: label, exact: true })).toBeInTheDocument();
}

const feature = await loadFeature('features/sentence-diagram.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Colossians 3:1 in English', ({ Given, Then, And, When }) => {
    Given('the English diagram of Colossians 3:1 is drawn', () => draw('english'));
    Then('every English word of the verse is on the screen once', everyWordOnce);
    And('the understood {string} is in parentheses and is not a button', (_, text: string) => understood(text));
    And('the English diagram has {number} base lines and {number} slanted lines', (_, base: number, slanted: number) => {
      expect(lines(['base'])).toBe(base);
      expect(lines(SLANTED)).toBe(slanted);
    });
    And('the English diagram scrolls sideways and is named by its reference and mode', () => named('English'));
    When('he taps the first {string}', async (_, text: string) => {
      await user.click(screen.getAllByRole('button', { name: text })[0]);
    });
    Then('the diagram reports word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
    When('he taps the second {string}', async (_, text: string) => {
      await user.click(screen.getAllByRole('button', { name: text })[1]);
    });
    Then('the diagram goes on to report word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
  });

  Scenario('Colossians 3:1 in Greek', ({ Given, Then, And, When }) => {
    Given('the Greek diagram of Colossians 3:1 is drawn', () => draw('greek'));
    Then('every Greek word of the verse is on the screen once', everyWordOnce);
    And('the understood {string} is in parentheses and is not a button', (_, text: string) => understood(text));
    And('the Greek diagram has {number} base lines and {number} slanted lines', (_, base: number, slanted: number) => {
      expect(lines(['base'])).toBe(base);
      expect(lines(SLANTED)).toBe(slanted);
    });
    And('the Greek diagram scrolls sideways and is named by its reference and mode', () => named('Greek'));
    When('he taps the Greek {string}', async (_, text: string) => {
      await user.click(screen.getByRole('button', { name: text }));
    });
    Then('the diagram reports word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
  });

  Scenario('The Greek words are tagged as Greek and the English words are not', ({ Given, Then, When }) => {
    Given('the Greek diagram of Colossians 3:1 is drawn', () => draw('greek'));
    Then('the Greek words carry the Greek language and the understood word too', () => {
      const words = [...box().querySelectorAll('[data-word], [data-implied]')];
      expect(words.length).toBeGreaterThan(fixture.words.length);
      for (const w of words) {
        expect(w.getAttribute('lang')).toBe('el');
        expect(w.getAttribute('data-lang')).toBe('grc');
      }
    });
    When('the English diagram of Colossians 3:1 is drawn again', () => draw('english'));
    Then('no English word carries the Greek language', () => {
      expect(box().querySelector('[data-lang="grc"]')).toBeNull();
      expect(box().querySelector('[data-word]')!.getAttribute('lang')).toBe('en');
    });
  });

  Scenario('The picture is as wide as its words make it', ({ Given, Then }) => {
    Given('the English diagram of Colossians 3:1 is drawn', () => draw('english'));
    Then('the picture is exactly as wide as the layout says and is not scaled', () => {
      const layout = layoutDiagram(fixture.diagram, fixture.words, measure);
      const svg = box().querySelector('svg')!;
      expect(svg.getAttribute('width')).toBe(String(layout.width));
      expect(svg.getAttribute('height')).toBe(String(layout.height));
      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${layout.width} ${layout.height}`);
    });
  });

  Scenario('Diagram draws the verse once the tutor has worked it out', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor is slow to answer', () => openVerse('slow'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('the pane says {string}', async (_, text: string) => {
      expect(await within(pane()).findByText(text)).toBeInTheDocument();
      expect(within(pane()).queryByRole('img')).toBeNull();
    });
    When('the tutor answers with the English diagram', () => release());
    Then('the pane draws the English diagram of Colossians 3:1 with Redraw and the line {string}', async (_, line: string) => {
      expect(await within(pane()).findByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
      expect(within(pane()).queryByText(WORKING)).toBeNull();
      expect(within(pane()).getAllByRole('button', { name: 'Christ' })).toHaveLength(2);
      expect(within(pane()).getByRole('button', { name: 'Redraw', exact: true })).toBeInTheDocument();
      expect(within(pane()).getByText(line)).toBeInTheDocument();
    });
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('A tap on a word of the diagram opens its word sheet and Back returns to the diagram', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    And('he taps the first {string} of the diagram', async (_, text: string) => {
      await user.click((await within(pane()).findAllByRole('button', { name: text }))[0]);
    });
    Then('the word sheet opens with the Greek {string}', async (_, greek: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(sheet).getByTestId('sheet-word').textContent?.normalize('NFC')).toBe(greek.normalize('NFC'));
    });
    When('he goes Back', () => {
      act(() => window.history.back());
    });
    Then('the word sheet is closed and the English diagram is still drawn', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      expect(within(pane()).getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
      expect(diagramGrists()).toBe(1);
    });
  });

  Scenario('A diagram the tutor could not make shows why and offers Try again', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers a tree that leaves words out', () => openVerse('unable'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('the pane says {string} and offers Try again', async (_, text: string) => {
      expect(await within(pane()).findByText(text)).toBeInTheDocument();
      expect(within(pane()).getByRole('button', { name: 'Try again', exact: true })).toBeInTheDocument();
    });
    And('no diagram is drawn', () => {
      expect(within(pane()).queryByRole('img')).toBeNull();
      expect(within(pane()).queryByRole('button', { name: 'Redraw' })).toBeNull();
    });
    And('nothing is kept for Colossians 3:1', async () => {
      expect(await getDiagram('Colossians 3:1', 'english')).toBeUndefined();
    });
  });

  Scenario('A kept diagram opens with no ask', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('the pane draws the English diagram of Colossians 3:1 with Redraw and the line {string}', drawnWithRedraw);
    When('he leaves the Verse view and opens it again on Diagram', async () => {
      await reopen();
    });
    Then('the pane shows the kept diagram with the line {string} and never says {string}', async (_, line: string, working: string) => {
      expect(within(pane()).getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
      expect(within(pane()).getByText(line)).toBeInTheDocument();
      expect(within(pane()).queryByText(working)).toBeNull();
    });
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('Redraw asks the tutor again and Greek is drawn for the Greek', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    And('he taps Redraw', async () => {
      await user.click(await within(pane()).findByRole('button', { name: 'Redraw', exact: true }));
    });
    Then('the tutor was asked {int} times', async (_, n: number) => {
      await waitFor(() => expect(diagramGrists()).toBe(n));
      await within(pane()).findByRole('button', { name: 'Redraw', exact: true });
    });
    When('he switches the Reader to Greek', async () => {
      await act(async () => {
        await setReaderView('greek');
      });
    });
    Then('the pane draws the Greek diagram of Colossians 3:1', async () => {
      // the switch of view is a new pane (keyed by the mode), so the pane is found again on each try rather than held
      await waitFor(() => expect(within(pane()).getByRole('img', { name: 'Sentence diagram of Colossians 3:1, Greek' })).toBeInTheDocument());
    });
  });

  Scenario('With the Weave on, a word it shows in Greek is drawn in Greek and opens its word sheet', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once', () => openVerse('at once', 'solid'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('the diagram draws the Greek {string} and {string} in Greek and not the English "Christ"', async (_, first: string, second: string) => {
      for (const greek of [first, second]) {
        const word = await within(pane()).findByRole('button', { name: greek });
        expect(word).toHaveAttribute('lang', 'el');
      }
      expect(within(pane()).queryByRole('button', { name: 'Christ' })).toBeNull();
    });
    And('the English {string} of the diagram is drawn in English', (_, english: string) => {
      const word = within(pane()).getByRole('button', { name: english });
      expect(word).toHaveAttribute('lang', 'en');
    });
    When('he taps the Greek {string} of the diagram', async (_, greek: string) => {
      await user.click(within(pane()).getByRole('button', { name: greek }));
    });
    Then('the word sheet opens with the Greek {string}', async (_, greek: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(sheet).getByTestId('sheet-word').textContent?.normalize('NFC')).toBe(greek.normalize('NFC'));
    });
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('With the Weave off the diagram is all English as before', ({ Given, When, Then }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave off and his words kept, and the tutor answers at once', async () => {
      await openVerse('at once', 'off');
    });
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('every word of the diagram is English', async () => {
      expect(await within(pane()).findAllByRole('button', { name: 'Christ' })).toHaveLength(2);
      for (const button of within(pane()).getAllByRole('button')) expect(button).not.toHaveAttribute('data-lang');
    });
  });

  Scenario('Switching the Weave redraws the diagram from the same tree', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once', () => openVerse('at once', 'solid'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    And('the diagram draws the Greek {string}', async (_, greek: string) => {
      expect(await within(pane()).findByRole('button', { name: greek })).toBeInTheDocument();
    });
    When('he switches the Weave off', async () => {
      await act(async () => {
        await setWeave('off');
      });
    });
    Then('the diagram draws the English "Christ" twice and no Greek', async () => {
      await waitFor(() => expect(within(pane()).getAllByRole('button', { name: 'Christ' })).toHaveLength(2));
      expect(within(pane()).queryByRole('button', { name: 'χριστῷ' })).toBeNull();
    });
    When('he switches the Weave on again', async () => {
      await act(async () => {
        await setWeave('solid');
      });
    });
    Then('the diagram draws the Greek {string} again', async (_, greek: string) => {
      expect(await within(pane()).findByRole('button', { name: greek })).toBeInTheDocument();
    });
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('In the Greek view the Greek tree is drawn whatever the Weave', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once', () => openVerse('at once', 'solid'));
    When('he taps Diagram', async () => {
      await user.click(within(verseView()).getByRole('button', { name: 'Diagram', exact: true }));
    });
    And('he switches the Reader to Greek', async () => {
      await act(async () => {
        await setReaderView('greek');
      });
    });
    Then('the pane draws the Greek diagram of Colossians 3:1', async () => {
      await waitFor(() => expect(within(pane()).getByRole('img', { name: 'Sentence diagram of Colossians 3:1, Greek' })).toBeInTheDocument());
    });
  });

  Scenario('How to read this opens the lesson and Done comes back to the same diagram', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', tapsDiagram);
    Then('the pane draws the English diagram of Colossians 3:1 with Redraw and the line {string}', drawnWithRedraw);
    And('the pane offers {string}', (_, label: string) => expect(within(pane()).getByRole('button', { name: label, exact: true })).toBeInTheDocument());
    When('he taps {string}', tapsInPane);
    Then('the lesson {string} is open', lessonIsOpen);
    When('he goes through the lesson to Done', throughTheLesson);
    Then('the Verse view of Colossians 3:1 is open again on its drawn English diagram with {string}', backOnTheDiagram);
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('A first diagram invites him to the lesson, and Not now hides the invitation for good', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', tapsDiagram);
    Then('the pane draws the English diagram of Colossians 3:1 with Redraw and the line {string}', drawnWithRedraw);
    And('the pane invites him with {string} and Learn and Not now', invites);
    When('he taps {string}', tapsInPane);
    Then('the pane no longer invites him and still offers {string}', noInvitation);
    When('he leaves the Verse view and opens it again on Diagram', reopen);
    Then('the pane still has no invitation and offers {string}', noInvitation);
    And('the tutor was asked once', () => expect(diagramGrists()).toBe(1));
  });

  Scenario('Learn opens the lesson and a finished lesson hides the invitation', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once', () => openVerse('at once'));
    When('he taps Diagram', tapsDiagram);
    Then('the pane invites him with {string} and Learn and Not now', invites);
    When('he taps {string}', tapsInPane);
    Then('the lesson {string} is open', lessonIsOpen);
    When('he goes through the lesson to Done', throughTheLesson);
    Then('the Verse view of Colossians 3:1 is open again on its drawn English diagram with {string}', backOnTheDiagram);
    And('the pane no longer invites him and still offers {string}', noInvitation);
  });

  Scenario('The invitation and the link wait for a drawn diagram', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor is slow to answer', () => openVerse('slow'));
    When('he taps Diagram', tapsDiagram);
    Then('the pane says {string}', async (_, text: string) => {
      expect(await within(pane()).findByText(text)).toBeInTheDocument();
    });
    And('the pane has neither the invitation nor {string}', neither);
    When('the tutor answers with the English diagram', () => release());
    Then('the pane invites him with {string} and Learn and Not now', invites);
  });

  Scenario('A diagram the tutor could not make has neither the invitation nor the link', ({ Given, When, Then, And }) => {
    Given('a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers a tree that leaves words out', () => openVerse('unable'));
    When('he taps Diagram', tapsDiagram);
    Then('the pane says {string} and offers Try again', async (_, text: string) => {
      expect(await within(pane()).findByText(text)).toBeInTheDocument();
      expect(within(pane()).getByRole('button', { name: 'Try again', exact: true })).toBeInTheDocument();
    });
    And('the pane has neither the invitation nor {string}', neither);
  });
});
