// features/steps/copy-format.steps.tsx — runs features/copy-format.feature (mw-9txn0x1.1): the Verse view's Copy gives the verse, passage or chapter in
// the format of Settings > Reading > When you copy (src/copy/format.ts). The clipboard is a fake that keeps what was written.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { LicenceContext } from '../../src/gate/licenceContext';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setReaderView, setWeave, type ReaderView, type Weave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { passageUrl, referenceUrl } from '../../src/nav/links';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

interface RomansVerse {
  n: number;
  g: { t: string }[];
  e: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RomansVerse[] };
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let copied: string[] = [];

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const english = (n: number): string => ROMANS_8.verses.find((v) => v.n === n)!.e.map((c) => c.t.trim()).join(' ').replace(/\s+/g, ' ').trim();
const greek = (n: number): string => ROMANS_8.verses.find((v) => v.n === n)!.g.map((w) => w.t).join(' ');
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const lines = (text: string): string[] => text.split('\n');
const clip = (): string => {
  expect(copied).toHaveLength(1);
  return copied[0];
};

async function open(
  settings: Record<string, string>,
  hash = '',
  read: { view: ReaderView; weave: Weave } = { view: 'english', weave: 'off' },
  options: { refuses?: boolean; unlicensed?: boolean } = {},
): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${hash}`);
  stubChapterFetch();
  copied = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (options.refuses ? Promise.reject(new Error('refused')) : (copied.push(text), Promise.resolve())) },
  });
  // a page that refuses the modern API refuses the old way too
  Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  // the Weave and the Greek view are shown for the Greek he has asked for (the Greek dial) and the words he knows
  await setGreekInterest(5);
  await setReaderView(read.view);
  await seedHisWords();
  await setWeave(read.weave);
  render(
    options.unlicensed ? (
      <LicenceContext.Provider value={{ licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined }}>
        <App />
      </LicenceContext.Provider>
    ) : (
      <App />
    ),
  );
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const feature = await loadFeature('features/copy-format.feature');

describeFeature(feature, ({ Scenario }) => {
  const defaults = () => open({});
  const chosen = (_: unknown, text: string, reference: string, numbers: string, link: string) =>
    open({ copyText: text, copyReference: reference, copyNumbers: numbers, copyLink: link });
  const woven = async (_: unknown, text?: string) => {
    await open(text === undefined ? {} : { copyText: text }, '#/?ref=Col.3.1', { view: 'english', weave: 'solid' });
    await screen.findByRole('region', { name: 'Verse view' });
    // the Verse view copies by the defaults (As you read it) until its four settings have been read from the store: let the choice of Text reach it
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  };
  const tapNumber = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapHeading = async (_: unknown, text: string) => {
    const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
    if (!heading) throw new Error(`no heading ${text}`);
    await user.click(within(heading).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapCopy = async (_: unknown, name: string) => {
    await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
    await waitFor(() => expect(copied).toHaveLength(1));
  };
  const says = async (_: unknown, words: string) => {
    expect(await within(viewEl()).findByText(words)).toBeInTheDocument();
  };
  const starts = (_: unknown, words: string) => {
    expect(clip().startsWith(words)).toBe(true);
  };
  const holds = (_: unknown, words: string) => {
    expect(clip()).toContain(words);
  };
  const holdsLine = (_: unknown, line: string) => {
    expect(lines(clip())).toContain(line);
  };
  const endsWithLink = (url: string) => {
    expect(lines(clip()).at(-1)).toBe(url);
  };

  Scenario('Copy with the defaults gives the verse, its reference after it and its link', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with When you copy at its defaults', defaults);
    When('he taps the number of verse {int}', tapNumber);
    And('he taps {string}', tapCopy);
    Then("the phone's clipboard holds the English of verse 11, then the line {string}, then the link of Romans 8:11", (_, reference: string) => {
      expect(clip()).toBe(`${english(11)}\n${reference}\n${referenceUrl('rom', 8, 11)}`);
    });
    And('the Verse view says {string}', says);
  });

  Scenario('Copy with Text both and Reference before', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with When you copy set to Text {string}, Reference {string}, Verse numbers {string} and Link {string}', chosen);
    When('he taps the number of verse {int}', tapNumber);
    And('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with the line {string}", (_, line: string) => {
      expect(lines(clip())[0]).toBe(line);
    });
    And("the phone's clipboard holds the Greek of verse 11 in a paragraph of its own after the English", () => {
      expect(clip()).toContain(`\n${english(11)}\n\n${greek(11)}\n`);
    });
    And("the phone's clipboard ends with the link of Romans 8:11", () => endsWithLink(referenceUrl('rom', 8, 11)));
  });

  Scenario('Copy with Link off ends at the reference', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with When you copy set to Text {string}, Reference {string}, Verse numbers {string} and Link {string}', chosen);
    When('he taps the number of verse {int}', tapNumber);
    And('he taps {string}', tapCopy);
    Then("the phone's clipboard ends with the line {string}", (_, line: string) => {
      expect(lines(clip()).at(-1)).toBe(line);
    });
    And("the phone's clipboard has no link", () => {
      expect(clip()).not.toContain('https://');
    });
  });

  Scenario('Copy on a passage numbers its verses and names the range', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with When you copy at its defaults', defaults);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds {string}", holds);
    And("the phone's clipboard holds the line {string}", holdsLine);
    And("the phone's clipboard ends with the link of Romans 8:1-11", () => endsWithLink(passageUrl('rom', 8, 1, 11)));
  });

  Scenario('Copy on a passage with Verse numbers off leaves the numbers out', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with When you copy set to Text {string}, Reference {string}, Verse numbers {string} and Link {string}', chosen);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard has no reference", () => {
      expect(clip()).not.toContain('(MSB)');
    });
  });

  Scenario('In the Weave, Copy pastes the woven verse', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Colossians 3:1 in the Weave with When you copy at its defaults', woven);
    When('he taps {string}', tapCopy);
    Then("the phone's clipboard holds the woven verse as the Verse view shows it, then the line {string}", (_, line: string) => {
      const shown = squash(viewEl().querySelector('[data-sheet-verse]')?.textContent);
      expect(shown).toContain('χριστῷ');
      expect(lines(clip()).slice(0, 2)).toEqual([shown, line]);
    });
    And("the phone's clipboard holds {string}", holds);
    And("the phone's clipboard has no {string}", (_, words: string) => {
      expect(clip()).not.toContain(words);
    });
  });

  Scenario('In the Greek view, Copy pastes the Greek', ({ Given, When, Then }) => {
    Given('Lampas is opened on Colossians 3:1 in the Greek view with When you copy at its defaults', () => open({}, '#/?ref=Col.3.1', { view: 'greek', weave: 'off' }));
    When('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with {string}", starts);
  });

  Scenario('Text English copies the English even in the Weave', ({ Given, When, Then }) => {
    Given('Lampas is opened on Colossians 3:1 in the Weave with When you copy set to Text {string}', woven);
    When('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with {string}", starts);
  });

  Scenario('Copy on a whole chapter names the chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the whole of Romans 8 with When you copy at its defaults', () => open({}, `#/?b=rom&c=8&view=english&weave=off&p=1&pt=${ROMANS_8.verses.length}`));
    When('he taps {string}', async (_, name: string) => {
      await screen.findByRole('region', { name: 'Verse view' });
      await tapCopy(_, name);
    });
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds the line {string}", holdsLine);
    And("the phone's clipboard ends with the link of Romans 8:1-39", () => endsWithLink(passageUrl('rom', 8, 1, 39)));
  });
  // A hold: the finger goes down on the target and stays past LONG_PRESS_MS (src/ui/longPress.ts); then it lifts, and the click that ends it is not a tap.
  const holdOn = async (target: HTMLElement) => {
    await user.pointer({ keys: '[MouseLeft>]', target });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
    });
    await user.pointer({ keys: '[/MouseLeft]', target });
  };
  const numberOf = (n: number) => document.querySelector<HTMLElement>(`[data-reader] [data-verse="${n}"] [data-verse-number]`)!;
  const headingButton = (text: string) => {
    const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
    if (!heading) throw new Error(`no heading ${text}`);
    return within(heading).getByRole('button');
  };
  const placeLine = () => document.querySelector<HTMLElement>('[data-place-line]')!;
  const readerSays = async (_: unknown, words: string) => {
    expect(await screen.findByText(words, { selector: '[role="status"]' })).toBeInTheDocument();
  };
  const waitCopied = () => waitFor(() => expect(copied).toHaveLength(1));
  const noVerseView = () => {
    expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();
  };
  const pages = () => open({ readingMode: 'pages' });
  const unlicensed = () => open({}, '', undefined, { unlicensed: true });

  Scenario('Holding a verse number copies the verse at once where no tutor is offered', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 on a phone with no licence and When you copy at its defaults', unlicensed);
    When('he holds the number of verse {int}', async (_, n: number) => {
      await holdOn(numberOf(n));
      await waitCopied();
    });
    Then("the phone's clipboard holds the English of verse 11, then the line {string}, then the link of Romans 8:11", (_, reference: string) => {
      expect(clip()).toBe(`${english(11)}\n${reference}\n${referenceUrl('rom', 8, 11)}`);
    });
    And('the Reader says {string}', readerSays);
    And('the Verse view is not open', noVerseView);
  });

  Scenario('Holding a section heading copies its passage', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with When you copy at its defaults', defaults);
    When('he holds the heading {string}', async (_, text: string) => {
      await holdOn(headingButton(text));
      await waitCopied();
    });
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds the line {string}", holdsLine);
    And('the Reader says {string}', readerSays);
    And('the Verse view is not open', noVerseView);
  });

  Scenario('Holding the place line copies the whole chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults', pages);
    When('he holds the place line', async () => {
      await holdOn(placeLine());
      await waitCopied();
    });
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds the line {string}", holdsLine);
    And('the Reader says {string}', readerSays);
    And('the Verse view is not open', noVerseView);
  });

  Scenario('Holding a verse number in the Greek view copies the Greek', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Colossians 3 in the Greek view on a phone with no licence and When you copy at its defaults', () =>
      open({}, '#/?b=col&c=3', { view: 'greek', weave: 'off' }, { unlicensed: true }),
    );
    When('he holds the number of verse {int}', async (_, n: number) => {
      await holdOn(numberOf(n));
      await waitCopied();
    });
    Then("the phone's clipboard starts with {string}", starts);
    And('the Reader says {string}', readerSays);
  });

  const openedAndNothingCopied = async () => {
    await screen.findByRole('region', { name: 'Verse view' });
    expect(copied).toEqual([]);
  };

  Scenario('Where the tutor is offered a hold on a verse number copies the verse and does not talk', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with When you copy at its defaults', defaults);
    When('he holds the number of verse {int}', async (_, n: number) => {
      await holdOn(numberOf(n));
      await waitCopied();
    });
    Then("the phone's clipboard holds the English of verse 11, then the line {string}, then the link of Romans 8:11", (_, reference: string) => {
      expect(clip()).toBe(`${english(11)}\n${reference}\n${referenceUrl('rom', 8, 11)}`);
    });
    And('the Reader says {string}', readerSays);
    And('no Talk sheet is open and the phone is not listening', () => {
      expect(screen.queryByRole('dialog', { name: /^Talk about/ })).toBeNull();
      expect(screen.queryByText(/^Listening…/)).toBeNull();
    });
  });

  Scenario('A tap on a verse number still opens the Verse view', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults', pages);
    When('he taps the number of verse {int}', async (_, n: number) => {
      await user.click(numberOf(n));
    });
    Then('the Verse view is open and nothing was copied', openedAndNothingCopied);
  });

  Scenario('A tap on a section heading still opens the Verse view', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults', pages);
    When('he taps the heading {string}', async (_, text: string) => {
      await user.click(headingButton(text));
    });
    Then('the Verse view is open and nothing was copied', openedAndNothingCopied);
  });

  Scenario('A tap on the place line still opens the Verse view', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults', pages);
    When('he taps the place line', async () => {
      await user.click(placeLine());
    });
    Then('the Verse view is open and nothing was copied', openedAndNothingCopied);
  });

  Scenario('A phone that refuses the clipboard shows the text to copy by hand', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 on a phone with no licence and a clipboard that refuses and When you copy at its defaults', () =>
      open({}, '', undefined, { unlicensed: true, refuses: true }),
    );
    When('he holds the number of verse {int}', (_, n: number) => holdOn(numberOf(n)));
    Then('the Verse view is open on verse 11 with the text shown selected to copy by hand', async () => {
      const box = await within(await screen.findByRole('region', { name: 'Verse view' })).findByRole<HTMLTextAreaElement>('textbox', { name: 'Text to copy' });
      expect(box.value).toBe(`${english(11)}\n— Romans 8:11 (MSB)\n${referenceUrl('rom', 8, 11)}`);
      expect(document.activeElement).toBe(box);
      expect(box.selectionStart).toBe(0);
      expect(box.selectionEnd).toBe(box.value.length);
    });
  });

  // Copy follows every mode he is in (mw-5r3p30.866): Variants shown puts each unit's brace after its words
  const VARIANTS = { variants: 'english', variantWitnesses: 'ecm' };
  const peter = (settings: Record<string, string>) => () => open(settings, '#/?b=1pe&c=4&view=english&weave=off');
  const peterPages = () => open({ ...VARIANTS, readingMode: 'pages' }, '#/?b=1pe&c=4&view=english&weave=off');
  const holdVerse = async (_: unknown, n: number) => {
    await holdOn(numberOf(n));
    await waitCopied();
  };
  const holdHeading = async (_: unknown, text: string) => {
    await holdOn(headingButton(text));
    await waitCopied();
  };
  const hasNo = (_: unknown, words: string) => {
    expect(clip()).not.toContain(words);
  };

  Scenario('Holding a verse number with Variants shown copies the braces', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4 with Variants shown and When you copy at its defaults', peter(VARIANTS));
    When('he holds the number of verse {int}', holdVerse);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds {string}", holds);
  });

  Scenario('Holding a section heading with Variants shown copies the braces of its verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4 with Variants shown and When you copy at its defaults', peter(VARIANTS));
    When('he holds the heading {string}', holdHeading);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds {string}", holds);
  });

  Scenario('Holding the place line with Variants shown copies the braces', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4 with Variants shown and Turn pages and When you copy at its defaults', peterPages);
    When('he holds the place line', async () => {
      await holdOn(placeLine());
      await waitCopied();
    });
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds {string}", holds);
  });

  Scenario("The Verse view's Copy with Variants shown copies the braces", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4:1 with Variants shown and When you copy at its defaults', async () => {
      await open(VARIANTS, '#/?ref=1Pet.4.1');
      await screen.findByRole('region', { name: 'Verse view' });
      // the Verse view copies by the defaults until its settings have been read from the store
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    });
    When('he taps {string}', tapCopy);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard holds {string}", holds);
  });

  Scenario('With Variants off the verse is copied plain', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4 with Variants off and When you copy at its defaults', peter({ variants: 'off' }));
    When('he holds the number of verse {int}', holdVerse);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard has no {string}", hasNo);
  });

  Scenario('Text English copies the English with no braces even with Variants shown', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Peter 4 with Variants shown and When you copy set to Text {string}', (_, text: string) => open({ ...VARIANTS, copyText: text }, '#/?b=1pe&c=4&view=english&weave=off'));
    When('he holds the number of verse {int}', holdVerse);
    Then("the phone's clipboard starts with {string}", starts);
    And("the phone's clipboard has no {string}", hasNo);
  });
});
