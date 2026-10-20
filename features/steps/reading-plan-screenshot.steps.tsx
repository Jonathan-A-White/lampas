// features/steps/reading-plan-screenshot.steps.tsx — runs features/reading-plan-screenshot.feature: the return sheet's 'Send a screenshot' (src/plan/WhereDidYouGetTo.tsx)
// and the sheet 'Your screenshot' (src/plan/ScreenshotRead.tsx), which sends the picture to the audible-position grind (src/plan/audiblePosition.ts). The mill is the fake
// Postern of tests/support/fake-postern.ts, the canvas the image seam of src/images/shrink.ts. Only Date is faked, as in reading-plan-return.steps.tsx; a phone with no
// licence is the whole App under the LicenceProvider with a chain that holds no licence for its key, as in ai-needs-licence.steps.tsx.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi, type MockInstance } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { OT_BOOKS } from '../../src/data/otBooks';
import { planOf, type PlanChapter } from '../../src/data/plans';
import { beginSession, nextChapter, openSession, progress, startPlan } from '../../src/data/repositories/readingPlan';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { imageSeam } from '../../src/images/shrink';
import { forgetTrail } from '../../src/nav/lastRoute';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { tutorTimings } from '../../src/services/tutor';
import { chapterLength } from '../../src/plan/estimate';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { sheetEntriesGone } from '../../tests/support/sheet-history';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { HOLDER, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';

const realSeam = { ...imageSeam };

afterAll(() => {
  setVisibility('visible');
  vi.useRealTimers();
  cleanup();
  clearBus();
  Object.assign(imageSeam, realSeam);
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const RETURN = 'Where did you get to?';
const READ = 'Your screenshot';
const NOW = Date.parse('2026-10-16T12:00:00Z');
const KIND = 'audible-position';

let fake: FakePostern;
let onLine: MockInstance<() => boolean> | undefined;

/** 'Leviticus 1' -> its book code and chapter number */
function chapterNamed(name: string): PlanChapter {
  const at = name.lastIndexOf(' ');
  const book = [...OT_BOOKS, ...BOOKS].find((b) => b.name === name.slice(0, at));
  if (!book) throw new Error(`no book named in ${name}`);
  return { code: book.code, chapter: Number(name.slice(at + 1)) };
}

function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** A phone with the plan started at `name` and a session opened there, the Reader open, back from two chapters of listening: the return sheet is open. */
async function backFromAudible(name: string, licensed: boolean, failing: boolean | 'offline' = false): Promise<void> {
  cleanup();
  onLine?.mockRestore();
  onLine = undefined;
  // Unmounting the last scenario's open sheets steps history back (useSheetBack); jsdom lands that popstate a moment later, and it must land before this one.
  await sheetEntriesGone();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  Object.assign(imageSeam, realSeam);
  window.localStorage.clear();
  // not about the welcome of a new licensed reader (src/Welcome.tsx): it is already done
  window.localStorage.setItem('lampas.welcome', 'done');
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  setVisibility('visible');
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  if (failing === 'offline') {
    fake.down = true;
    onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
  } else if (failing) fake.kindReplies[KIND] = { status: 'failed', reason: 'could not read it' };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  imageSeam.decode = async () => ({ width: 1080, height: 2340, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(50_000).fill(7)], { type: 'image/jpeg' });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', '/');
  const from = chapterNamed(name);
  await startPlan('whole-bible', from);
  if (licensed) {
    render(<App />);
  } else {
    const chain = newChain();
    render(
      <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, reader: chain })}>
        <App />
        <LicenceProbe />
      </LicenceProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe('not-licensed'));
  }
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await beginSession({ ...from, startedAt: NOW });
  const whole = planOf('whole-bible')!.chapters();
  const at = whole.findIndex((c) => c.code === from.code && c.chapter === from.chapter);
  const time = whole.slice(at, at + 2).reduce((sum, c) => sum + chapterLength(c), 0);
  await act(async () => setVisibility('hidden'));
  vi.setSystemTime(NOW + time + 1000);
  await act(async () => setVisibility('visible'));
  await screen.findByRole('dialog', { name: RETURN });
}

const returnSheet = (): HTMLElement => screen.getByRole('dialog', { name: RETURN });
const readSheet = (): Promise<HTMLElement> => screen.findByRole('dialog', { name: READ });
const picker = (): HTMLInputElement | null => returnSheet().querySelector<HTMLInputElement>('input[type="file"]');

/** What the mill answers the audible-position grist with. */
const answered = (book: string | null, chapter: number | null, position: string | null, confidence: string) => ({
  status: 'answered' as const,
  answer: { book, chapter, position, confidence },
});

const licensedBack = (_: unknown, name: string): Promise<void> => backFromAudible(name, true);
const sendsAScreenshot = async (): Promise<void> => {
  const input = picker();
  if (!input) throw new Error('no picker of pictures on the return sheet');
  await user.upload(input, new File([new Uint8Array([1, 2, 3])], 'Screenshot_20261016.png', { type: 'image/png' }));
};
const millAnswersWithLeft = async (_: unknown, book: string, chapter: number, position: string, left: string, confidence: string): Promise<void> => {
  await waitFor(() => expect(fake.received).toHaveLength(1));
  await fake.answer({ status: 'answered' as const, answer: { book, chapter, position: position || null, left: left || null, confidence } });
};
const millAnswers = async (_: unknown, book: string, chapter: number, position: string, confidence: string): Promise<void> => {
  await waitFor(() => expect(fake.received).toHaveLength(1));
  await fake.answer(answered(book, chapter, position || null, confidence));
};
/** The proposal: the chapter read, and the time played when the answer gave one. */
const proposes = async (_: unknown, name: string, position?: string): Promise<void> => {
  const sheet = await readSheet();
  const proposal = await within(sheet).findByTestId('screenshot-proposal');
  expect(proposal).toHaveTextContent(name);
  if (position !== undefined) expect(proposal).toHaveTextContent(`${position} in`);
  expect(within(sheet).getByRole('button', { name: 'Yes, that is where I am' })).toBeInTheDocument();
};
const itSays = async (_: unknown, text: string): Promise<void> => {
  expect(await within(await readSheet()).findByText(text)).toBeInTheDocument();
};
const tapsInRead = async (_: unknown, name: string): Promise<void> => {
  await user.click(within(await readSheet()).getByRole('button', { name }));
};

const feature = await loadFeature('features/reading-plan-screenshot.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With a licence the return sheet offers Send a screenshot, a photo picker', ({ Given, Then }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    Then('the return sheet offers {string} as a picker of pictures', async (_, label: string) => {
      const input = picker();
      expect(input).not.toBeNull();
      expect(input).toHaveAttribute('aria-label', 'Screenshot file');
      expect(input!.accept).toBe('image/jpeg,image/png,image/webp');
      expect(input!.multiple).toBe(false);
      // the row is a button that opens the phone's picker
      const opened = vi.fn();
      input!.addEventListener('click', opened);
      await user.click(within(returnSheet()).getByRole('button', { name: new RegExp(`^${label}`) }));
      expect(opened).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('A screenshot read as Leviticus 3 with time left is proposed, and Yes keeps Leviticus 3 next', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    Then('the sheet {string} says {string}', async (_, name: string, text: string) => {
      expect(await within(await screen.findByRole('dialog', { name })).findByText(text)).toBeInTheDocument();
    });
    When('the mill answers the book {string}, the chapter {int}, the position {string}, the time left {string} and the confidence {string}', millAnswersWithLeft);
    Then('the sheet {string} proposes {string} at {string}', (_, __: string, name: string, position: string) => proposes(_, name, position));
    And('it says {string}', itSays);
    And('the proposal also says {string}', itSays);
    When('she taps {string}', tapsInRead);
    Then('both sheets are closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: READ })).toBeNull());
      await waitFor(() => expect(screen.queryByRole('dialog', { name: RETURN })).toBeNull());
    });
    And('the next chapter is {string} with {int} of 1189 done', async (_, name: string, done: number) => {
      await waitFor(async () => {
        expect(await nextChapter()).toEqual(chapterNamed(name));
        expect((await progress()).done).toBe(done);
      });
    });
    And('no listening session is open', () => waitFor(async () => expect(await openSession()).toBeUndefined()));
    And('the picture went to the audible-position grind alone, with the chapter she set off from', () => {
      expect(fake.received).toHaveLength(1);
      expect(fake.received[0]!.grist.kind).toBe(KIND);
      expect(fake.received[0]!.input).toEqual({ language: 'en', set_off_from: 'Leviticus 1' });
      expect(fake.received[0]!.attachments).toHaveLength(1);
      expect(fake.received[0]!.attachments[0]!.mime).toBe('image/jpeg');
    });
  });

  Scenario('A screenshot at the end of Leviticus 3 is proposed as finished, and Yes moves the plan on', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    And('the mill answers the book {string}, the chapter {int}, the position {string}, the time left {string} and the confidence {string}', millAnswersWithLeft);
    Then('the sheet {string} proposes {string} at {string}', (_, __: string, name: string, position: string) => proposes(_, name, position));
    And('the proposal also says {string}', itSays);
    When('she taps {string}', tapsInRead);
    Then('both sheets are closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: READ })).toBeNull());
      await waitFor(() => expect(screen.queryByRole('dialog', { name: RETURN })).toBeNull());
    });
    And('the next chapter is {string} with {int} of 1189 done', async (_, name: string, done: number) => {
      await waitFor(async () => {
        expect(await nextChapter()).toEqual(chapterNamed(name));
        expect((await progress()).done).toBe(done);
      });
    });
    And('no listening session is open', () => waitFor(async () => expect(await openSession()).toBeUndefined()));
  });

Scenario('A guess says so in words', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    And('the mill answers the book {string}, the chapter {int}, the position {string} and the confidence {string}', millAnswers);
    Then('the sheet {string} proposes {string}', (_, __: string, name: string) => proposes(_, name));
    And('it says {string}', itSays);
  });

  Scenario('Back to the choices leaves the return sheet and the session as they were', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    And('the mill answers the book {string}, the chapter {int}, the position {string} and the confidence {string}', millAnswers);
    And('it says {string}', itSays);
    And('she taps {string}', tapsInRead);
    Then('the sheet {string} is closed', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name })).toBeNull());
    });
    And('the return sheet is still open', () => {
      expect(returnSheet()).toBeInTheDocument();
    });
    And('a listening session is still open', () => waitFor(async () => expect(await openSession()).toBeDefined()));
  });

  Scenario('A screenshot with no chapter on it says so', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    And('the mill answers that the picture shows no chapter', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      await fake.answer(answered(null, null, null, 'low'));
    });
    Then('the sheet {string} says {string}', async (_, name: string, text: string) => {
      expect(await within(await screen.findByRole('dialog', { name })).findByText(text)).toBeInTheDocument();
    });
    And('it offers no Yes', async () => {
      const sheet = await readSheet();
      expect(within(sheet).queryByRole('button', { name: 'Yes, that is where I am' })).toBeNull();
      expect(within(sheet).getByRole('button', { name: 'Back to the choices' })).toBeInTheDocument();
    });
  });

  Scenario('A chapter that is no chapter of the Bible is not proposed', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}', licensedBack);
    When('she sends a screenshot', sendsAScreenshot);
    And('the mill answers the book {string}, the chapter {int}, the position {string} and the confidence {string}', millAnswers);
    Then('the sheet {string} says {string}', async (_, name: string, text: string) => {
      expect(await within(await screen.findByRole('dialog', { name })).findByText(text)).toBeInTheDocument();
      expect(screen.queryByTestId('screenshot-proposal')).toBeNull();
    });
  });

  Scenario('A grist that fails says so, and Try again reads the screenshot again', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}, and the mill fails the grist', (_, name: string) => backFromAudible(name, true, true));
    When('she sends a screenshot', sendsAScreenshot);
    Then('the sheet {string} says {string}', async (_, name: string, text: string) => {
      expect(await within(await screen.findByRole('dialog', { name })).findByRole('alert')).toHaveTextContent(text);
    });
    When('the mill will answer the book {string}, the chapter {int}, the position {string} and the confidence {string}', (_, book: string, chapter: number, position: string, confidence: string) => {
      fake.kindReplies[KIND] = answered(book, chapter, position, confidence);
    });
    And('she taps {string}', tapsInRead);
    Then('the sheet {string} proposes {string} at {string}', (_, __: string, name: string, position: string) => proposes(_, name, position));
  });

  Scenario('Offline, the screenshot read says the phone is offline and offers Try again', ({ Given, When, Then, And }) => {
    Given('a licensed phone back from Audible after listening from {string}, and the phone is offline', (_, name: string) => backFromAudible(name, true, 'offline'));
    When('she sends a screenshot', sendsAScreenshot);
    Then('the sheet {string} says {string}', async (_, name: string, text: string) => {
      expect(await within(await screen.findByRole('dialog', { name })).findByRole('alert')).toHaveTextContent(text);
    });
    And('the sheet {string} offers {string}', async (_, name: string, label: string) => {
      expect(within(await screen.findByRole('dialog', { name })).getByRole('button', { name: label })).toBeInTheDocument();
    });
    When('the phone is online again and the mill will answer the book {string}, the chapter {int}, the position {string} and the confidence {string}', (_, book: string, chapter: number, position: string, confidence: string) => {
      onLine?.mockRestore();
      onLine = undefined;
      fake.down = false;
      fake.kindReplies[KIND] = answered(book, chapter, position, confidence);
    });
    And('she taps {string}', tapsInRead);
    Then('the sheet {string} proposes {string} at {string}', (_, __: string, name: string, position: string) => proposes(_, name, position));
  });

  Scenario('With no licence Send a screenshot says Needs a licence and sends nothing', ({ Given, Then, And, When }) => {
    Given('a phone with no licence back from Audible after listening from {string}', (_, name: string) => backFromAudible(name, false));
    Then('the return sheet has no picker of pictures', () => {
      expect(picker()).toBeNull();
    });
    And('its row {string} says {string}', (_, label: string, words: string) => {
      const row = within(returnSheet()).getByRole('button', { name: new RegExp(`^${label}`) });
      expect(row).toHaveTextContent(label);
      expect(row).toHaveTextContent(words);
    });
    When('she taps {string}', async (_, label: string) => {
      await user.click(within(returnSheet()).getByRole('button', { name: new RegExp(`^${label}`) }));
    });
    Then('the Licence page is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Licence', level: 1 })).toBeInTheDocument();
      expect(window.location.hash).toContain('#/unlock');
      expect(screen.queryByRole('dialog', { name: RETURN })).toBeNull();
    });
    And('no grist was sent', () => {
      expect(fake.received).toHaveLength(0);
      expect(fake.calls).toEqual([]);
    });
  });
});
