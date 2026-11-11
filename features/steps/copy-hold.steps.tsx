// features/steps/copy-hold.steps.tsx — runs features/copy-hold.feature (mw-5r3p30.1074): the row a hold on a verse number draws (src/copy/HoldRow.tsx), its ends (src/copy/holdEnds.ts),
// Share, and the question mark that asks about the range held. The clipboard is a fake that keeps what was written; Romans 8 is the chapter (verse 13: paragraph 12-14, pericope 12-17).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { FLOATING_TUTOR_LABEL } from '../../src/AskTutor';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { closeDatabase } from './close-database';

afterAll(async () => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  await closeDatabase();
});

interface RomansVerse {
  n: number;
  e: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RomansVerse[] };
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let copied: string[] = [];
let shared: { title?: string; text?: string; url?: string }[] = [];

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const english = (n: number): string => ROMANS_8.verses.find((v) => v.n === n)!.e.map((c) => c.t.trim()).join(' ').replace(/\s+/g, ' ').trim();
const lastCopied = (): string => {
  expect(copied.length).toBeGreaterThan(0);
  return copied[copied.length - 1];
};
const row = (): HTMLElement => document.querySelector<HTMLElement>('[data-copy-row]')!;
const sleep = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

async function open(layout: 'paragraph' | 'verse', options: { refuses?: boolean } = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  copied = [];
  shared = [];
  Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (options.refuses ? Promise.reject(new Error('refused')) : (copied.push(text), Promise.resolve())) },
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  await db.settings.put({ key: 'layout', value: layout });
  await setGreekInterest(5);
  await setReaderView('english');
  await seedHisWords();
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

// A hold: the finger goes down on the target and stays past LONG_PRESS_MS (src/ui/longPress.ts); then it lifts, and the click that ends it is not a tap.
const holdOn = async (target: HTMLElement) => {
  await user.pointer({ keys: '[MouseLeft>]', target });
  await sleep(LONG_PRESS_MS + 150);
  await user.pointer({ keys: '[/MouseLeft]', target });
};
const numberOf = (n: number) => document.querySelector<HTMLElement>(`[data-reader] [data-verse="${n}"] [data-verse-number]`)!;
const holdNumber = async (_: unknown, n: number) => {
  const before = copied.length;
  await holdOn(numberOf(n));
  await waitFor(() => expect(copied.length).toBeGreaterThan(before));
};
const inRow = async (name: string) => within(await waitFor(() => (expect(row()).toBeTruthy(), row()))).getByRole('button', { name, exact: true });
const tapOnRow = async (_: unknown, name: string) => {
  const before = copied.length;
  await user.click(await inRow(name));
  if (name !== 'Share') await waitFor(() => expect(copied.length).toBeGreaterThan(before));
};
const rowSays = async (_: unknown, words: string) => {
  await waitFor(() => expect(squash(row()?.querySelector('[role="status"]')?.textContent)).toBe(words));
};
const clipboardHoldsLine = (_: unknown, line: string) => {
  expect(lastCopied().split('\n')).toContain(line);
};
const rowGone = async () => {
  await waitFor(() => expect(document.querySelector('[data-copy-row]')).toBeNull());
};
const noVerseView = () => {
  expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();
};
const paragraphLayout = () => open('paragraph');
const canShare = () => {
  Object.defineProperty(window.navigator, 'share', {
    configurable: true,
    value: (data: { title?: string; text?: string; url?: string }) => (shared.push(data), Promise.resolve()),
  });
};
const offers = (_: unknown, a: string, b: string, c: string, d?: string) => {
  const names = Array.from(row().querySelectorAll('button')).map((button) => squash(button.textContent));
  expect(names).toEqual([a, b, c, d].filter((x): x is string => x !== undefined));
};
const marks = (_: unknown, name: string) => {
  const pressed = Array.from(row().querySelectorAll('button[aria-pressed="true"]')).map((button) => squash(button.textContent));
  expect(pressed).toEqual([name]);
};
// The row stays ROW_MS (3 s) from its last touch, and a loaded host is slow enough in user.click to outrun that, so the tap asks about the chapter instead of the range held: touch the row and click in one tick.
const tapQuestionMark = async () => {
  const button = await screen.findByRole('button', { name: FLOATING_TUTOR_LABEL });
  const held = document.querySelector<HTMLElement>('[data-copy-row]');
  if (held) fireEvent.pointerDown(held);
  fireEvent.click(button);
};
const talkOpenAs = async (_: unknown, name: string) => {
  expect(await screen.findByRole('dialog', { name })).toBeInTheDocument();
};

const feature = await loadFeature('features/copy-hold.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A hold on a verse number copies the verse and draws the row with the ends and Share', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    Then("the phone's clipboard holds the line {string}", clipboardHoldsLine);
    And('the row says {string}', rowSays);
    And('the row offers, in order, {string}, {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string, e: string) => {
      const names = Array.from(row().querySelectorAll('button')).map((button) => squash(button.textContent));
      expect(names).toEqual([a, b, c, d, e]);
    });
    And('the row marks {string} as the end', marks);
    And('the Verse view is not open', noVerseView);
  });

  Scenario('A tap on Paragraph copies to the end of the paragraph', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    Then("the phone's clipboard holds the line {string}", clipboardHoldsLine);
    And("the phone's clipboard holds the passage text numbered {string} and {string}", (_, a: string, b: string) => {
      expect(lastCopied()).toContain(`${a}${english(13)}`);
      expect(lastCopied()).toContain(`${b}${english(14)}`);
    });
    And('the row says {string}', rowSays);
    And('the row marks {string} as the end', marks);
  });

  Scenario('A tap on Pericope copies to the end of the pericope', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    Then("the phone's clipboard holds the line {string}", clipboardHoldsLine);
    And('the row says {string}', rowSays);
  });

  Scenario('A tap on Chapter copies to the end of the chapter', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    Then("the phone's clipboard holds the line {string}", clipboardHoldsLine);
    And('the row says {string}', rowSays);
  });

  Scenario('A tap on Verse takes a wider copy back', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    And('he goes back by touching {string} on the row', tapOnRow);
    Then("the phone's clipboard holds the line {string}", clipboardHoldsLine);
    And('the row says {string}', rowSays);
    And('the row marks {string} as the end', marks);
  });

  Scenario('In Verse by verse there is no Paragraph', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Verse by verse layout', () => open('verse'));
    When('he holds the number of verse {int}', holdNumber);
    Then('the row offers, in order, {string}, {string}, {string} and {string}', offers);
  });

  Scenario('An end that reaches no further than one before it is left out', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    Then('the row offers, in order, {string}, {string}, {string} and {string}', offers);
  });

  Scenario("At the chapter's last verse the row shows Share alone beside what it copied", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    Then('the row says {string}', rowSays);
    And('the row offers, in order, {string}', (_, only: string) => {
      expect(Array.from(row().querySelectorAll('button')).map((button) => squash(button.textContent))).toEqual([only]);
    });
  });

  Scenario('A hold on another verse moves the row to that verse', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he holds the number of verse {int}', holdNumber);
    Then('the row says {string}', rowSays);
    And("the phone's clipboard holds the line {string}", clipboardHoldsLine);
  });

  Scenario('The row goes by itself', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    Then('the row goes by itself', rowGone);
  });

  Scenario('A tap on the row starts its time again', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('after two seconds he touches {string} on the row', async (_, name: string) => {
      await sleep(2000);
      await tapOnRow(undefined, name);
    });
    And('two more seconds go by', () => sleep(2000));
    Then('the row says {string}', rowSays);
  });

  Scenario('Share sends the plain verse and the row goes when the sheet opens', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    And('the phone can share', canShare);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    Then('the phone\'s share was handed the verse text and the title {string}', (_, title: string) => {
      expect(shared).toHaveLength(1);
      expect(shared[0].title).toBe(title);
      expect(shared[0].text).toContain(english(13));
    });
    And('the row is gone', rowGone);
  });

  Scenario('Share sends the range that was chosen', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    And('the phone can share', canShare);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    And('he goes on to touch {string} on the row', tapOnRow);
    Then('the phone\'s share was handed the verse text and the title {string}', (_, title: string) => {
      expect(shared).toHaveLength(1);
      expect(shared[0].title).toBe(title);
      expect(shared[0].text).toContain(`13 ${english(13)}`);
      expect(shared[0].text).toContain(`17 ${english(17)}`);
    });
  });

  Scenario('A phone with no share keeps what was copied and says so', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    Then('the row says {string}', rowSays);
  });

  Scenario('The row has no control for the tutor', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    Then('the row has no button for the tutor', async () => {
      await waitFor(() => expect(row()).toBeTruthy());
      const names = Array.from(row().querySelectorAll('button')).map((button) => squash(button.textContent));
      expect(names.filter((name) => /tutor|ask|talk/i.test(name))).toEqual([]);
      expect(row().querySelector('[data-floating-tutor]')).toBeNull();
    });
  });

  Scenario('The question mark tapped while the row is up opens the Talk on the range held', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the number of verse {int}', holdNumber);
    And('he taps {string} on the row', tapOnRow);
    And('the row says {string}', rowSays);
    And('he taps the question mark', tapQuestionMark);
    Then('the Talk sheet is open as {string}', talkOpenAs);
    And('the row is gone', rowGone);
  });

  Scenario('The question mark tapped when no row is up opens the Talk as it always did', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he taps the question mark', tapQuestionMark);
    Then('the Talk sheet is open as {string}', talkOpenAs);
  });

  Scenario("A section heading's hold is a toast with no row, as before", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Paragraph layout', paragraphLayout);
    When('he holds the heading {string}', async (_, text: string) => {
      const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text)!;
      await holdOn(within(heading).getByRole('button'));
      await waitFor(() => expect(copied).toHaveLength(1));
    });
    Then('the Reader says {string}', async (_, words: string) => {
      expect(await screen.findByText(words, { selector: '[role="status"]' })).toBeInTheDocument();
    });
    And('the row is gone', rowGone);
  });

  Scenario('A phone that refuses the clipboard opens the Verse view on the range', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 on a phone that refuses the clipboard', () => open('paragraph', { refuses: true }));
    When('he holds the number of verse {int}', (_, n: number) => holdOn(numberOf(n)));
    Then('the Verse view is open on verse 13 with the text shown selected to copy by hand', async () => {
      const box = await within(await screen.findByRole('region', { name: 'Verse view' })).findByRole<HTMLTextAreaElement>('textbox', { name: 'Text to copy' });
      expect(box.value).toContain(english(13));
      expect(box.selectionEnd).toBe(box.value.length);
    });
  });
});
